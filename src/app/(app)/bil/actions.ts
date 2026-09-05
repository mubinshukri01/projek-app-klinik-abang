"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAudit } from "@/lib/audit";
import { requireArea } from "@/lib/auth";
import { balanceDue, canCompleteVisit, lineAmount } from "@/lib/billing";
import { createDraftInvoice, issueInvoiceNumber, recalculateInvoice } from "@/lib/invoice";
import { prisma } from "@/lib/prisma";

export interface FormState {
  error: string | null;
  ok?: boolean;
  message?: string;
}

const OK: FormState = { error: null, ok: true };

/** Menyediakan bil untuk lawatan yang belum mempunyai invois. */
export async function prepareInvoice(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireArea("bil");
  const visitId = String(formData.get("visitId") ?? "");
  if (!visitId) return { error: "Lawatan tidak dinyatakan." };

  const invoiceId = await prisma.$transaction((tx) => createDraftInvoice(tx, visitId));
  if (!invoiceId) return { error: "Lawatan tidak dijumpai." };

  await logAudit({
    actorId: user.id,
    action: "CREATE",
    entity: "Invoice",
    entityId: invoiceId,
    after: { visitId },
  });

  revalidatePath(`/bil/${visitId}`);
  return OK;
}

/** Menambah caj servis atau prosedur pada bil. */
export async function addServiceLine(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireArea("bil");

  const visitId = String(formData.get("visitId") ?? "");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const serviceId = String(formData.get("serviceId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 1);

  if (!invoiceId || !serviceId) return { error: "Pilih servis untuk ditambah." };
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { error: "Kuantiti mesti nombor bulat lebih daripada sifar." };
  }

  const [invoice, service] = await Promise.all([
    prisma.invoice.findUnique({ where: { id: invoiceId }, select: { id: true, status: true } }),
    prisma.serviceItem.findUnique({
      where: { id: serviceId },
      select: { id: true, name: true, price: true, active: true },
    }),
  ]);

  if (!invoice) return { error: "Invois tidak dijumpai." };
  if (invoice.status !== "DRAFT") return { error: "Invois yang telah dikeluarkan tidak boleh diubah." };
  if (!service || !service.active) return { error: "Servis tidak dijumpai." };

  await prisma.$transaction(async (tx) => {
    await tx.invoiceLine.create({
      data: {
        invoiceId,
        itemType: "SERVICE",
        refId: service.id,
        description: service.name,
        quantity,
        unitPrice: service.price,
        amount: lineAmount(quantity, service.price),
      },
    });
    await recalculateInvoice(tx, invoiceId);
  });

  await logAudit({
    actorId: user.id,
    action: "UPDATE",
    entity: "Invoice",
    entityId: invoiceId,
    after: { added: service.name, quantity },
  });

  revalidatePath(`/bil/${visitId}`);
  return OK;
}

export async function removeLine(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireArea("bil");

  const visitId = String(formData.get("visitId") ?? "");
  const lineId = String(formData.get("lineId") ?? "");
  if (!lineId) return { error: "Baris tidak dinyatakan." };

  const line = await prisma.invoiceLine.findUnique({
    where: { id: lineId },
    select: {
      id: true,
      description: true,
      itemType: true,
      invoice: { select: { id: true, status: true } },
    },
  });
  if (!line) return { error: "Baris tidak dijumpai." };
  if (line.invoice.status !== "DRAFT") {
    return { error: "Invois yang telah dikeluarkan tidak boleh diubah." };
  }
  // Ubat yang sudah keluar dari stok mesti kekal pada bil. Membuangnya akan
  // menyebabkan kutipan tidak sepadan dengan stok yang dikeluarkan.
  if (line.itemType === "DRUG") {
    return { error: "Baris ubat tidak boleh dibuang — ubat sudah didispense." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.invoiceLine.delete({ where: { id: lineId } });
    await recalculateInvoice(tx, line.invoice.id);
  });

  await logAudit({
    actorId: user.id,
    action: "UPDATE",
    entity: "Invoice",
    entityId: line.invoice.id,
    before: { removed: line.description },
  });

  revalidatePath(`/bil/${visitId}`);
  return OK;
}

export async function setDiscount(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireArea("bil");

  const visitId = String(formData.get("visitId") ?? "");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const discount = Number(formData.get("discount") ?? 0);

  if (!invoiceId) return { error: "Invois tidak dinyatakan." };
  if (!Number.isFinite(discount) || discount < 0) return { error: "Diskaun tidak sah." };

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, status: true, discount: true },
  });
  if (!invoice) return { error: "Invois tidak dijumpai." };
  if (invoice.status !== "DRAFT") return { error: "Invois yang telah dikeluarkan tidak boleh diubah." };

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({ where: { id: invoiceId }, data: { discount } });
    // Pengiraan semula mengehadkan diskaun kepada subjumlah, jadi invois
    // tidak boleh menjadi negatif.
    await recalculateInvoice(tx, invoiceId);
  });

  await logAudit({
    actorId: user.id,
    action: "UPDATE",
    entity: "Invoice",
    entityId: invoiceId,
    before: { discount: invoice.discount.toString() },
    after: { discount },
  });

  revalidatePath(`/bil/${visitId}`);
  return OK;
}

/** Mengeluarkan invois: memberi nombor siri dan mengunci barisnya. */
export async function issueInvoice(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireArea("bil");

  const visitId = String(formData.get("visitId") ?? "");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  if (!invoiceId) return { error: "Invois tidak dinyatakan." };

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, status: true, total: true, lines: { select: { id: true } } },
  });
  if (!invoice) return { error: "Invois tidak dijumpai." };
  if (invoice.status !== "DRAFT") return { error: "Invois ini sudah dikeluarkan." };
  if (invoice.lines.length === 0) return { error: "Bil kosong — tambah sekurang-kurangnya satu caj." };

  const issued = await prisma.$transaction((tx) => issueInvoiceNumber(tx, invoiceId, user.id));

  await logAudit({
    actorId: user.id,
    action: "UPDATE",
    entity: "Invoice",
    entityId: invoiceId,
    after: { invoiceNo: issued.invoiceNo, total: invoice.total.toString() },
  });

  revalidatePath(`/bil/${visitId}`);
  return { error: null, ok: true, message: `Invois ${issued.invoiceNo} dikeluarkan.` };
}

/** Merekod bayaran daripada pesakit. */
export async function recordPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireArea("bil");

  const visitId = String(formData.get("visitId") ?? "");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const method = String(formData.get("method") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const reference = String(formData.get("reference") ?? "").trim() || null;

  if (!invoiceId) return { error: "Invois tidak dinyatakan." };
  if (!["CASH", "CARD", "DUITNOW_QR", "EWALLET", "PANEL"].includes(method)) {
    return { error: "Kaedah bayaran tidak sah." };
  }
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Amaun mesti lebih daripada sifar." };

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, status: true, total: true, amountPaid: true },
  });
  if (!invoice) return { error: "Invois tidak dijumpai." };
  if (invoice.status === "DRAFT") return { error: "Keluarkan invois sebelum menerima bayaran." };
  if (invoice.status === "VOID") return { error: "Invois ini telah dibatalkan." };

  const due = balanceDue(invoice.total, invoice.amountPaid);
  if (amount > due + 0.001) {
    return { error: `Amaun melebihi baki RM ${due.toFixed(2)}.` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        invoiceId,
        method: method as "CASH" | "CARD" | "DUITNOW_QR" | "EWALLET" | "PANEL",
        amount,
        reference,
        receivedById: user.id,
      },
    });

    const paid = Math.round((Number(invoice.amountPaid) + amount) * 100) / 100;
    const settled = paid >= Number(invoice.total) - 0.001;
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { amountPaid: paid, status: settled ? "PAID" : "PARTIAL" },
    });
  });

  await logAudit({
    actorId: user.id,
    action: "PAYMENT",
    entity: "Invoice",
    entityId: invoiceId,
    after: { method, amount, reference },
  });

  revalidatePath(`/bil/${visitId}`);
  revalidatePath("/bil");
  return OK;
}

/** Menutup lawatan selepas bil diselesaikan. */
export async function completeVisit(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireArea("bil");

  const visitId = String(formData.get("visitId") ?? "");
  if (!visitId) return { error: "Lawatan tidak dinyatakan." };

  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    select: {
      id: true,
      status: true,
      payerType: true,
      invoice: { select: { status: true, total: true, amountPaid: true } },
    },
  });
  if (!visit) return { error: "Lawatan tidak dijumpai." };
  if (!visit.invoice) return { error: "Sediakan bil terlebih dahulu." };
  if (visit.invoice.status === "DRAFT") return { error: "Keluarkan invois sebelum menutup lawatan." };

  const check = canCompleteVisit(visit.payerType, visit.invoice.total, visit.invoice.amountPaid);
  if (!check.ok) return { error: check.reason ?? "Bil belum dijelaskan." };

  await prisma.visit.update({
    where: { id: visitId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  await logAudit({
    actorId: user.id,
    action: "UPDATE",
    entity: "Visit",
    entityId: visitId,
    before: { status: visit.status },
    after: { status: "COMPLETED" },
  });

  revalidatePath("/queue");
  revalidatePath("/bil");
  redirect("/bil");
}
