"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAudit } from "@/lib/audit";
import { requireArea } from "@/lib/auth";
import { allocateFefo, allocateFromBatch, earliestExpiry, type BatchLot } from "@/lib/fefo";
import { createDraftInvoice } from "@/lib/invoice";
import { prisma } from "@/lib/prisma";

export interface FormState {
  error: string | null;
  ok?: boolean;
}

const OK: FormState = { error: null, ok: true };

function str(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Mendispense satu item preskripsi.
 *
 * Peruntukan, penolakan baki dan lejar stok berlaku dalam SATU transaksi.
 * Jika mana-mana bahagian gagal, tiada apa yang berubah — baki batch mesti
 * sentiasa boleh diterangkan oleh pergerakan stoknya.
 */
export async function dispenseItem(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireArea("dispensari");

  const visitId = String(formData.get("visitId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const chosenBatchId = str(formData.get("batchId"));
  const overrideReason = str(formData.get("overrideReason"));
  if (!itemId) return { error: "Item tidak dinyatakan." };

  const item = await prisma.prescriptionItem.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      quantity: true,
      dispensedAt: true,
      drugId: true,
      drug: { select: { name: true, unit: true } },
    },
  });
  if (!item) return { error: "Item tidak dijumpai." };
  if (item.dispensedAt) return { error: `${item.drug.name} sudah didispense.` };

  // Menindih cadangan mesti disertai sebab — inilah rekod mengapa batch
  // yang bukan FEFO dikeluarkan.
  if (chosenBatchId && !overrideReason) {
    return { error: "Nyatakan sebab memilih batch selain cadangan." };
  }

  try {
    const dispensed = await prisma.$transaction(async (tx) => {
      // Dibaca semula di dalam transaksi: baki mungkin telah berubah sejak
      // skrin dipaparkan.
      const batches: BatchLot[] = await tx.drugBatch.findMany({
        where: { drugId: item.drugId, quantityOnHand: { gt: 0 } },
        select: { id: true, batchNo: true, expiryDate: true, quantityOnHand: true },
      });

      const result = chosenBatchId
        ? allocateFromBatch(batches, item.quantity, chosenBatchId)
        : allocateFefo(batches, item.quantity);

      if (result.shortfall > 0) {
        throw new StockError(
          `Stok ${item.drug.name} tidak mencukupi — kurang ${result.shortfall} ${item.drug.unit}. ` +
            `Stok yang telah luput tidak dikira.`,
        );
      }

      for (const allocation of result.allocations) {
        // Kemas kini bersyarat sebagai pengawal serentak: jika juruteknik lain
        // mengambil stok yang sama sejak kita membaca, kiraan yang dikemas kini
        // ialah 0 dan seluruh transaksi digulung semula.
        const updated = await tx.drugBatch.updateMany({
          where: { id: allocation.batchId, quantityOnHand: { gte: allocation.quantity } },
          data: { quantityOnHand: { decrement: allocation.quantity } },
        });
        if (updated.count !== 1) {
          throw new StockError(
            `Stok ${item.drug.name} berubah semasa mendispense. Cuba sekali lagi.`,
          );
        }

        await tx.stockMovement.create({
          data: {
            drugId: item.drugId,
            batchId: allocation.batchId,
            type: "DISPENSE",
            // Negatif kerana stok keluar dari klinik.
            quantity: -allocation.quantity,
            referenceType: "PrescriptionItem",
            referenceId: item.id,
            performedById: user.id,
          },
        });
      }

      // Label menunjukkan tarikh luput TERAWAL antara batch yang diberi,
      // supaya pesakit tidak menggunakan bekalan melepasi tarikh selamatnya.
      const labelBatch = earliestExpiry(result.allocations);

      await tx.prescriptionItem.update({
        where: { id: item.id },
        data: {
          dispensedBatchId: labelBatch?.batchId ?? null,
          dispensedById: user.id,
          dispensedAt: new Date(),
          overrideReason,
        },
      });

      return result.allocations;
    });

    await logAudit({
      actorId: user.id,
      action: "DISPENSE",
      entity: "PrescriptionItem",
      entityId: item.id,
      after: {
        drug: item.drug.name,
        quantity: item.quantity,
        batches: dispensed.map((a) => ({ batchNo: a.batchNo, quantity: a.quantity })),
        overrideReason,
      },
    });
  } catch (error) {
    if (error instanceof StockError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/dispensari/${visitId}`);
  revalidatePath("/dispensari");
  return OK;
}

/** Menutup dispensari dan menghantar pesakit ke kaunter bayaran. */
export async function completeDispensing(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireArea("dispensari");

  const visitId = String(formData.get("visitId") ?? "");
  if (!visitId) return { error: "Lawatan tidak dinyatakan." };

  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    select: {
      id: true,
      status: true,
      prescription: { select: { items: { select: { id: true, dispensedAt: true } } } },
    },
  });
  if (!visit) return { error: "Lawatan tidak dijumpai." };

  const pending = (visit.prescription?.items ?? []).filter((i) => !i.dispensedAt);
  if (pending.length > 0) {
    return { error: `Masih ada ${pending.length} ubat belum didispense.` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.visit.update({ where: { id: visitId }, data: { status: "PAYMENT" } });
    // Bil disediakan di sini supaya juruwang membuka skrin yang sudah lengkap.
    await createDraftInvoice(tx, visitId);
  });

  await logAudit({
    actorId: user.id,
    action: "UPDATE",
    entity: "Visit",
    entityId: visitId,
    before: { status: visit.status },
    after: { status: "PAYMENT" },
  });

  revalidatePath("/queue");
  revalidatePath("/bil");
  redirect("/dispensari");
}

/** Ralat yang dijangka dan boleh ditunjukkan kepada kakitangan. */
class StockError extends Error {}
