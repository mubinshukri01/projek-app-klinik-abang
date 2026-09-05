import type { PayerType } from "@/generated/prisma/enums";
import { roundMoney, sumMoney, toNumber, type Money } from "@/lib/money";

/**
 * Pengiraan invois.
 *
 * Semua aritmetik melalui pembantu wang yang bekerja dalam sen. Menjumlahkan
 * nilai RM sebagai nombor titik terapung akan mengumpul ralat pembundaran
 * merentas baris, dan invois klinik mesti sentiasa tepat ke sen.
 */

export interface DraftLine {
  itemType: "SERVICE" | "DRUG";
  refId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceTotals {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

/** Jumlah satu baris: kuantiti x harga seunit, dibundarkan ke sen. */
export function lineAmount(quantity: number, unitPrice: Money): number {
  return roundMoney(quantity * toNumber(unitPrice));
}

/**
 * Menjumlahkan baris dan menggunakan diskaun.
 *
 * Diskaun dihadkan kepada subjumlah — invois klinik tidak boleh menjadi
 * negatif, walaupun kakitangan tersalah taip diskaun yang terlalu besar.
 */
export function invoiceTotals(
  lines: Array<{ quantity: number; unitPrice: Money }>,
  discount: Money = 0,
  tax: Money = 0,
): InvoiceTotals {
  const subtotal = sumMoney(lines.map((l) => lineAmount(l.quantity, l.unitPrice)));
  const requested = Math.max(0, roundMoney(discount));
  const applied = Math.min(requested, subtotal);
  const taxAmount = Math.max(0, roundMoney(tax));

  return {
    subtotal,
    discount: applied,
    tax: taxAmount,
    total: roundMoney(subtotal - applied + taxAmount),
  };
}

/** Baki yang masih perlu dikutip. Tidak pernah negatif. */
export function balanceDue(total: Money, amountPaid: Money): number {
  return Math.max(0, roundMoney(toNumber(total) - toNumber(amountPaid)));
}

/**
 * Adakah pesakit sendiri yang membayar di kaunter?
 *
 * Lawatan panel dan skim kerajaan direkodkan sebagai invois, tetapi bayaran
 * datang daripada penanggung kemudian — pesakit pulang tanpa membayar.
 */
export function patientPaysAtCounter(payerType: PayerType): boolean {
  return payerType === "SELF";
}

/**
 * Adakah invois ini boleh dimasukkan ke dalam tuntutan panel?
 *
 * Hanya lawatan PANEL. Skim MADANI dan PeKa B40 dituntut melalui portal
 * PRIMIS ProtectHealth, bukan melalui pembina tuntutan sistem ini.
 */
export function isClaimable(payerType: PayerType): boolean {
  return payerType === "PANEL";
}

/** Adakah invois boleh ditutup sebagai selesai? */
export function canCompleteVisit(
  payerType: PayerType,
  total: Money,
  amountPaid: Money,
): { ok: boolean; reason?: string } {
  if (!patientPaysAtCounter(payerType)) return { ok: true };

  const due = balanceDue(total, amountPaid);
  if (due > 0) {
    return { ok: false, reason: `Baki RM ${due.toFixed(2)} belum dijelaskan.` };
  }
  return { ok: true };
}
