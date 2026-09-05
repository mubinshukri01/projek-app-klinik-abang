import "server-only";
import { lineAmount } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { nextInvoiceNo } from "@/lib/sequence";
import type { PrismaClient } from "@/generated/prisma/client";

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/** Kod servis yang digunakan sebagai caj konsultasi lalai. */
const DEFAULT_CONSULTATION_CODE = "KON-AM";

/**
 * Mencipta invois draf untuk lawatan, diisi daripada apa yang benar-benar
 * berlaku semasa lawatan.
 *
 * Dipanggil apabila pesakit diserahkan kepada kaunter, supaya juruwang tidak
 * perlu membina bil dari awal. Idempoten — lawatan yang sudah mempunyai invois
 * dibiarkan tidak berubah.
 *
 * Hanya ubat yang BENAR-BENAR DIDISPENSE dimasukkan. Pesakit tidak sepatutnya
 * dicaj untuk ubat yang kehabisan stok dan tidak diterima.
 */
export async function createDraftInvoice(tx: Tx, visitId: string): Promise<string | null> {
  const existing = await tx.invoice.findUnique({ where: { visitId }, select: { id: true } });
  if (existing) return existing.id;

  const visit = await tx.visit.findUnique({
    where: { id: visitId },
    select: {
      id: true,
      payerType: true,
      panelId: true,
      prescription: {
        select: {
          items: {
            where: { dispensedAt: { not: null } },
            orderBy: { id: "asc" },
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              drug: { select: { name: true, unit: true } },
            },
          },
        },
      },
    },
  });
  if (!visit) return null;

  const consultationFee = await tx.serviceItem.findUnique({
    where: { code: DEFAULT_CONSULTATION_CODE },
    select: { id: true, name: true, price: true },
  });

  const lines: Array<{
    itemType: string;
    refId: string | null;
    description: string;
    quantity: number;
    unitPrice: string;
    amount: number;
  }> = [];

  if (consultationFee) {
    lines.push({
      itemType: "SERVICE",
      refId: consultationFee.id,
      description: consultationFee.name,
      quantity: 1,
      unitPrice: consultationFee.price.toString(),
      amount: lineAmount(1, consultationFee.price),
    });
  }

  for (const item of visit.prescription?.items ?? []) {
    lines.push({
      itemType: "DRUG",
      refId: item.id,
      description: `${item.drug.name} — ${item.quantity} ${item.drug.unit}`,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toString(),
      amount: lineAmount(item.quantity, item.unitPrice),
    });
  }

  const subtotal = lines.reduce((sum, l) => sum + Math.round(l.amount * 100), 0) / 100;

  const invoice = await tx.invoice.create({
    data: {
      // Nombor invois sebenar diberi hanya semasa dikeluarkan, supaya bil
      // yang dibatalkan sebelum dikeluarkan tidak membakar nombor siri.
      invoiceNo: `DRAF-${visitId.slice(-8)}`,
      visitId: visit.id,
      payerType: visit.payerType,
      panelId: visit.panelId,
      status: "DRAFT",
      subtotal,
      total: subtotal,
      lines: { create: lines },
    },
    select: { id: true },
  });

  return invoice.id;
}

/** Mengira semula subjumlah dan jumlah invois daripada barisnya. */
export async function recalculateInvoice(tx: Tx, invoiceId: string): Promise<void> {
  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      discount: true,
      tax: true,
      lines: { select: { amount: true } },
    },
  });
  if (!invoice) return;

  const subtotal =
    invoice.lines.reduce((sum, l) => sum + Math.round(Number(l.amount) * 100), 0) / 100;
  const discount = Math.min(Number(invoice.discount), subtotal);
  const total = Math.round((subtotal - discount + Number(invoice.tax)) * 100) / 100;

  await tx.invoice.update({
    where: { id: invoiceId },
    data: { subtotal, discount, total },
  });
}

/** Memberi nombor invois sebenar dan menandakannya dikeluarkan. */
export async function issueInvoiceNumber(tx: Tx, invoiceId: string, userId: string) {
  const invoiceNo = await nextInvoiceNo(new Date(), tx);
  return tx.invoice.update({
    where: { id: invoiceId },
    data: { invoiceNo, status: "ISSUED", issuedAt: new Date(), issuedById: userId },
    select: { invoiceNo: true },
  });
}

/** Invois lawatan dengan semua yang diperlukan untuk skrin bil dan resit. */
export function invoiceForVisit(visitId: string) {
  return prisma.invoice.findUnique({
    where: { visitId },
    include: {
      lines: { orderBy: { id: "asc" } },
      payments: { orderBy: { receivedAt: "asc" }, include: { receivedBy: { select: { name: true } } } },
      panel: { select: { name: true } },
    },
  });
}
