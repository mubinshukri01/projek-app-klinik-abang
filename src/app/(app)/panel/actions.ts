"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAudit } from "@/lib/audit";
import { requireArea } from "@/lib/auth";
import { endOfDay, fromDateInput, startOfDay } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { nextClaimNo } from "@/lib/sequence";
import { sumMoney } from "@/lib/money";

export interface FormState {
  error: string | null;
  ok?: boolean;
  message?: string;
}

/**
 * Membina tuntutan untuk satu panel bagi satu tempoh.
 *
 * Hanya invois PANEL yang telah dikeluarkan dan BELUM PERNAH dituntut
 * dimasukkan. Kekangan unik pada PanelClaimItem.invoiceId menjadikan tuntutan
 * berganda mustahil pada peringkat pangkalan data, bukan hanya pada peringkat
 * aplikasi.
 *
 * Nota: tuntutan ini untuk dimasukkan ke portal TPA (Mediline, HealthMetrics
 * dan seumpamanya). Sistem ini TIDAK menghantar tuntutan — tiada API awam.
 * Skim MADANI dan PeKa B40 tidak muncul di sini langsung; ia dituntut melalui
 * portal PRIMIS ProtectHealth.
 */
export async function buildClaim(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireArea("panel");

  const panelId = String(formData.get("panelId") ?? "");
  const start = fromDateInput(String(formData.get("periodStart") ?? ""));
  const end = fromDateInput(String(formData.get("periodEnd") ?? ""));

  if (!panelId) return { error: "Pilih panel." };
  if (!start || !end) return { error: "Masukkan tempoh tuntutan." };
  if (end.getTime() < start.getTime()) {
    return { error: "Tarikh tamat tidak boleh sebelum tarikh mula." };
  }

  const panel = await prisma.panel.findUnique({
    where: { id: panelId },
    select: { id: true, name: true },
  });
  if (!panel) return { error: "Panel tidak dijumpai." };

  const invoices = await prisma.invoice.findMany({
    where: {
      panelId,
      payerType: "PANEL",
      status: { in: ["ISSUED", "PARTIAL"] },
      issuedAt: { gte: startOfDay(start), lte: endOfDay(end) },
      // Kekangan unik menghalang tuntutan berganda; penapis ini menjadikan
      // pembina menunjukkan sebab invois tersebut tidak disenaraikan.
      claimItems: { none: {} },
    },
    select: { id: true, total: true, invoiceNo: true },
  });

  if (invoices.length === 0) {
    return {
      error:
        "Tiada invois panel yang belum dituntut dalam tempoh ini. Semak tarikh, atau invois mungkin sudah dimasukkan ke dalam tuntutan lain.",
    };
  }

  const totalAmount = sumMoney(invoices.map((i) => i.total));

  const claim = await prisma.$transaction(async (tx) => {
    const claimNo = await nextClaimNo(new Date(), tx);
    return tx.panelClaim.create({
      data: {
        claimNo,
        panelId,
        periodStart: start,
        periodEnd: end,
        totalAmount,
        items: {
          create: invoices.map((i) => ({ invoiceId: i.id, amount: i.total })),
        },
      },
      select: { id: true, claimNo: true },
    });
  });

  await logAudit({
    actorId: user.id,
    action: "CREATE",
    entity: "PanelClaim",
    entityId: claim.id,
    after: { claimNo: claim.claimNo, panel: panel.name, invoices: invoices.length, totalAmount },
  });

  revalidatePath("/panel");
  redirect(`/panel/${claim.id}`);
}

/** Menandakan tuntutan telah dimasukkan ke portal TPA. */
export async function markSubmitted(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireArea("panel");

  const claimId = String(formData.get("claimId") ?? "");
  if (!claimId) return { error: "Tuntutan tidak dinyatakan." };

  const claim = await prisma.panelClaim.findUnique({
    where: { id: claimId },
    select: { id: true, claimNo: true, status: true },
  });
  if (!claim) return { error: "Tuntutan tidak dijumpai." };
  if (claim.status !== "DRAFT") return { error: "Tuntutan ini sudah dihantar." };

  await prisma.panelClaim.update({
    where: { id: claimId },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  });

  await logAudit({
    actorId: user.id,
    action: "UPDATE",
    entity: "PanelClaim",
    entityId: claimId,
    before: { status: "DRAFT" },
    after: { status: "SUBMITTED" },
  });

  revalidatePath(`/panel/${claimId}`);
  return { error: null, ok: true };
}

/** Merekod bayaran yang diterima daripada panel. */
export async function recordClaimPayment(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireArea("panel");

  const claimId = String(formData.get("claimId") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const remarks = String(formData.get("remarks") ?? "").trim() || null;

  if (!claimId) return { error: "Tuntutan tidak dinyatakan." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Amaun mesti lebih daripada sifar." };

  const claim = await prisma.panelClaim.findUnique({
    where: { id: claimId },
    select: {
      id: true,
      claimNo: true,
      status: true,
      totalAmount: true,
      amountPaid: true,
      items: { select: { invoiceId: true, amount: true } },
    },
  });
  if (!claim) return { error: "Tuntutan tidak dijumpai." };
  if (claim.status === "DRAFT") return { error: "Hantar tuntutan sebelum merekod bayaran." };

  const paid = Math.round((Number(claim.amountPaid) + amount) * 100) / 100;
  if (paid > Number(claim.totalAmount) + 0.001) {
    const due = Number(claim.totalAmount) - Number(claim.amountPaid);
    return { error: `Amaun melebihi baki tuntutan RM ${due.toFixed(2)}.` };
  }

  const settled = paid >= Number(claim.totalAmount) - 0.001;

  await prisma.$transaction(async (tx) => {
    await tx.panelClaim.update({
      where: { id: claimId },
      data: {
        amountPaid: paid,
        status: settled ? "PAID" : "PARTIAL",
        paidAt: settled ? new Date() : null,
        remarks,
      },
    });

    // Apabila panel membayar sepenuhnya, invois yang dituntut dijelaskan juga.
    // Bayaran direkod sebagai kaedah PANEL supaya penyata kaunter harian tidak
    // mengira wang ini sebagai tunai yang diterima di kaunter.
    if (settled) {
      for (const item of claim.items) {
        await tx.payment.create({
          data: {
            invoiceId: item.invoiceId,
            method: "PANEL",
            amount: item.amount,
            reference: claim.claimNo,
            receivedById: user.id,
          },
        });
        await tx.invoice.update({
          where: { id: item.invoiceId },
          data: { amountPaid: item.amount, status: "PAID" },
        });
      }
    }
  });

  await logAudit({
    actorId: user.id,
    action: "PAYMENT",
    entity: "PanelClaim",
    entityId: claimId,
    after: { claimNo: claim.claimNo, amount, settled },
  });

  revalidatePath(`/panel/${claimId}`);
  revalidatePath("/panel");
  return { error: null, ok: true };
}
