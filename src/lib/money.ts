import type { Decimal } from "@/generated/prisma/internal/prismaNamespace";

export type Money = Decimal | number | string;

/** Format sebagai ringgit untuk paparan, cth. "RM 25.00". */
export function formatRM(value: Money): string {
  return `RM ${toNumber(value).toFixed(2)}`;
}

/** Format tanpa awalan mata wang, untuk lajur jadual dan eksport CSV. */
export function formatAmount(value: Money): string {
  return toNumber(value).toFixed(2);
}

export function toNumber(value: Money): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return Number(value.toString());
}

/**
 * Jumlahkan nilai wang melalui sen (integer) supaya ralat pembundaran titik
 * terapung tidak terkumpul merentas baris invois.
 */
export function sumMoney(values: Money[]): number {
  const cents = values.reduce<number>((acc, v) => acc + Math.round(toNumber(v) * 100), 0);
  return cents / 100;
}

/** Bundarkan ke 2 titik perpuluhan melalui sen. */
export function roundMoney(value: Money): number {
  return Math.round(toNumber(value) * 100) / 100;
}
