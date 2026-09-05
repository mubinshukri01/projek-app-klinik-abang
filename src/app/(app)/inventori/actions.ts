"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { requireArea } from "@/lib/auth";
import { fromDateInput } from "@/lib/dates";
import { isExpired } from "@/lib/fefo";
import { prisma } from "@/lib/prisma";

export interface FormState {
  error: string | null;
  ok?: boolean;
  message?: string;
}

const receiveSchema = z.object({
  drugId: z.string().min(1, "Ubat tidak dinyatakan."),
  batchNo: z.string().trim().min(1, "Masukkan nombor batch."),
  expiryDate: z.string().trim().min(1, "Masukkan tarikh luput."),
  quantity: z.coerce.number().int().positive("Kuantiti mesti lebih daripada sifar."),
  costPrice: z.string().trim().optional(),
  supplier: z.string().trim().optional(),
});

/**
 * Merekod stok masuk daripada pembekal.
 *
 * Batch dikenal pasti melalui nombor batch DAN tarikh luput. Menerima lebih
 * banyak stok bagi batch yang sama menambah bakinya dan bukan mencipta baris
 * pendua, supaya FEFO tidak melihat dua lot yang sepatutnya satu.
 */
export async function receiveStock(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireArea("inventori");

  const parsed = receiveSchema.safeParse({
    drugId: formData.get("drugId"),
    batchNo: formData.get("batchNo"),
    expiryDate: formData.get("expiryDate"),
    quantity: formData.get("quantity"),
    costPrice: formData.get("costPrice") ?? undefined,
    supplier: formData.get("supplier") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Maklumat tidak lengkap." };
  }
  const input = parsed.data;

  const expiryDate = fromDateInput(input.expiryDate);
  if (!expiryDate) return { error: "Tarikh luput tidak sah." };
  // Menerima stok yang sudah luput hampir pasti kesilapan taip, dan ia tidak
  // akan boleh didispense.
  if (isExpired(expiryDate)) {
    return { error: "Tarikh luput sudah berlalu. Semak tarikh pada kotak." };
  }

  const drug = await prisma.drug.findUnique({
    where: { id: input.drugId },
    select: { id: true, name: true, unit: true },
  });
  if (!drug) return { error: "Ubat tidak dijumpai." };

  const costPrice =
    input.costPrice && input.costPrice.length > 0 ? Number(input.costPrice) : null;
  if (costPrice !== null && (!Number.isFinite(costPrice) || costPrice < 0)) {
    return { error: "Harga kos tidak sah." };
  }

  await prisma.$transaction(async (tx) => {
    const batch = await tx.drugBatch.upsert({
      where: {
        drugId_batchNo_expiryDate: {
          drugId: drug.id,
          batchNo: input.batchNo,
          expiryDate,
        },
      },
      create: {
        drugId: drug.id,
        batchNo: input.batchNo,
        expiryDate,
        quantityOnHand: input.quantity,
        costPrice,
        supplier: input.supplier || null,
      },
      update: {
        quantityOnHand: { increment: input.quantity },
        ...(costPrice !== null ? { costPrice } : {}),
        ...(input.supplier ? { supplier: input.supplier } : {}),
      },
      select: { id: true },
    });

    await tx.stockMovement.create({
      data: {
        drugId: drug.id,
        batchId: batch.id,
        type: "RECEIVE",
        quantity: input.quantity,
        reason: input.supplier ? `Terima daripada ${input.supplier}` : "Terima stok",
        performedById: user.id,
      },
    });
  });

  await logAudit({
    actorId: user.id,
    action: "STOCK",
    entity: "DrugBatch",
    entityId: drug.id,
    after: { drug: drug.name, batchNo: input.batchNo, quantity: input.quantity },
  });

  revalidatePath("/inventori");
  revalidatePath(`/inventori/${drug.id}`);
  return {
    error: null,
    ok: true,
    message: `${input.quantity} ${drug.unit} ${drug.name} diterima ke batch ${input.batchNo}.`,
  };
}

/**
 * Melaras baki batch selepas kiraan stok fizikal.
 *
 * Baki tidak pernah ditulis terus — perbezaannya direkod sebagai pergerakan
 * supaya lejar sentiasa menerangkan baki semasa.
 */
export async function adjustStock(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireArea("inventori");

  const batchId = String(formData.get("batchId") ?? "");
  const countedRaw = String(formData.get("counted") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!batchId) return { error: "Batch tidak dinyatakan." };
  if (reason.length < 3) return { error: "Nyatakan sebab pelarasan." };

  const counted = Number(countedRaw);
  if (!Number.isInteger(counted) || counted < 0) {
    return { error: "Kiraan mesti nombor bulat sifar atau lebih." };
  }

  const batch = await prisma.drugBatch.findUnique({
    where: { id: batchId },
    select: {
      id: true,
      batchNo: true,
      quantityOnHand: true,
      drugId: true,
      drug: { select: { name: true } },
    },
  });
  if (!batch) return { error: "Batch tidak dijumpai." };

  const delta = counted - batch.quantityOnHand;
  if (delta === 0) return { error: "Kiraan sama dengan baki semasa — tiada pelarasan diperlukan." };

  await prisma.$transaction(async (tx) => {
    await tx.drugBatch.update({
      where: { id: batch.id },
      data: { quantityOnHand: counted },
    });
    await tx.stockMovement.create({
      data: {
        drugId: batch.drugId,
        batchId: batch.id,
        type: "ADJUST",
        quantity: delta,
        reason: `Kiraan stok: ${reason}`,
        performedById: user.id,
      },
    });
  });

  await logAudit({
    actorId: user.id,
    action: "STOCK",
    entity: "DrugBatch",
    entityId: batch.id,
    before: { quantityOnHand: batch.quantityOnHand },
    after: { quantityOnHand: counted, reason },
  });

  revalidatePath(`/inventori/${batch.drugId}`);
  return {
    error: null,
    ok: true,
    message: `Baki ${batch.drug.name} batch ${batch.batchNo} dilaras kepada ${counted}.`,
  };
}

/** Hapus kira batch yang telah luput supaya ia tidak lagi dikira sebagai stok. */
export async function writeOffExpired(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireArea("inventori");

  const batchId = String(formData.get("batchId") ?? "");
  if (!batchId) return { error: "Batch tidak dinyatakan." };

  const batch = await prisma.drugBatch.findUnique({
    where: { id: batchId },
    select: {
      id: true,
      batchNo: true,
      expiryDate: true,
      quantityOnHand: true,
      drugId: true,
      drug: { select: { name: true } },
    },
  });
  if (!batch) return { error: "Batch tidak dijumpai." };
  if (!isExpired(batch.expiryDate)) return { error: "Batch ini belum luput." };
  if (batch.quantityOnHand <= 0) return { error: "Batch ini sudah kosong." };

  const removed = batch.quantityOnHand;

  await prisma.$transaction(async (tx) => {
    await tx.drugBatch.update({ where: { id: batch.id }, data: { quantityOnHand: 0 } });
    await tx.stockMovement.create({
      data: {
        drugId: batch.drugId,
        batchId: batch.id,
        type: "EXPIRE",
        quantity: -removed,
        reason: "Hapus kira stok luput",
        performedById: user.id,
      },
    });
  });

  await logAudit({
    actorId: user.id,
    action: "STOCK",
    entity: "DrugBatch",
    entityId: batch.id,
    before: { quantityOnHand: removed },
    after: { quantityOnHand: 0, reason: "luput" },
  });

  revalidatePath("/inventori");
  revalidatePath(`/inventori/${batch.drugId}`);
  return {
    error: null,
    ok: true,
    message: `${removed} unit ${batch.drug.name} batch ${batch.batchNo} dihapus kira.`,
  };
}
