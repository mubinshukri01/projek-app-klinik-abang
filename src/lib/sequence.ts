import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@/generated/prisma/client";

/** Menerima sama ada klien Prisma atau klien transaksi. */
type SequenceClient = Pick<PrismaClient, "$queryRaw">;

export interface SequenceOptions {
  prefix?: string;
  padding?: number;
}

/**
 * Menaikkan penjujukan bernama secara atomik dan mengembalikan nombor
 * berformat, cth. "INV-2026-00042".
 *
 * INSERT ... ON CONFLICT DO UPDATE dijalankan sebagai satu pernyataan, jadi dua
 * kaunter yang menyimpan pada saat yang sama tidak boleh mendapat nombor sama.
 * Jangan ganti dengan corak baca-kemudian-tulis.
 */
export async function nextNumber(
  key: string,
  options: SequenceOptions = {},
  client: SequenceClient = prisma,
): Promise<string> {
  const prefix = options.prefix ?? "";
  const padding = options.padding ?? 5;

  const rows = await client.$queryRaw<{ current: number }[]>`
    INSERT INTO "NumberSequence" ("key", "prefix", "current", "padding")
    VALUES (${key}, ${prefix}, 1, ${padding})
    ON CONFLICT ("key") DO UPDATE SET "current" = "NumberSequence"."current" + 1
    RETURNING "current"
  `;

  const current = Number(rows[0]?.current ?? 0);
  return `${prefix}${String(current).padStart(padding, "0")}`;
}

/** Tarikh sebagai YYYY-MM-DD waktu tempatan, untuk kunci penjujukan harian. */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Nombor rekod perubatan, cth. "P-00001". Tidak pernah diguna semula. */
export function patientMrn(client?: SequenceClient) {
  return nextNumber("MRN", { prefix: "P-", padding: 5 }, client);
}

/** Nombor giliran harian. Set semula setiap hari kerana kuncinya berubah. */
export async function nextQueueNumber(date = new Date(), client?: SequenceClient): Promise<number> {
  const value = await nextNumber(`QUEUE:${localDateKey(date)}`, { padding: 1 }, client);
  return Number(value);
}

/** No. invois berperiod tahun, cth. "INV-2026-00042". */
export function nextInvoiceNo(date = new Date(), client?: SequenceClient) {
  const year = date.getFullYear();
  return nextNumber(`INVOICE:${year}`, { prefix: `INV-${year}-`, padding: 5 }, client);
}

/** No. siri MC. Berperiod tahun dan tidak boleh diguna semula. */
export function nextMcSerial(date = new Date(), client?: SequenceClient) {
  const year = date.getFullYear();
  return nextNumber(`MC:${year}`, { prefix: `MC-${year}-`, padding: 5 }, client);
}

/** No. tuntutan panel, cth. "TP-2026-00007". */
export function nextClaimNo(date = new Date(), client?: SequenceClient) {
  const year = date.getFullYear();
  return nextNumber(`CLAIM:${year}`, { prefix: `TP-${year}-`, padding: 5 }, client);
}
