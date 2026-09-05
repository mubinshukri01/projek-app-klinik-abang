import { prisma } from "@/lib/prisma";

export interface LowStockRow {
  drugId: string;
  name: string;
  unit: string;
  onHand: number;
  reorderLevel: number;
}

/**
 * Ubat yang stok gabungan semua batchnya telah jatuh ke paras pesanan semula.
 *
 * Ditulis sebagai SQL mentah kerana ia membandingkan agregat merentas batch
 * dengan lajur pada baris induk — sesuatu yang tidak dapat dinyatakan oleh
 * groupBy Prisma dalam satu perjalanan.
 */
export function lowStockDrugs(limit = 50) {
  return prisma.$queryRaw<LowStockRow[]>`
    SELECT d."id"           AS "drugId",
           d."name"         AS "name",
           d."unit"         AS "unit",
           COALESCE(SUM(b."quantityOnHand"), 0)::int AS "onHand",
           d."reorderLevel" AS "reorderLevel"
    FROM "Drug" d
    LEFT JOIN "DrugBatch" b ON b."drugId" = d."id"
    WHERE d."active" = true AND d."reorderLevel" > 0
    GROUP BY d."id", d."name", d."unit", d."reorderLevel"
    HAVING COALESCE(SUM(b."quantityOnHand"), 0) <= d."reorderLevel"
    ORDER BY (COALESCE(SUM(b."quantityOnHand"), 0)::float / NULLIF(d."reorderLevel", 0)) ASC,
             d."name" ASC
    LIMIT ${limit}
  `;
}

/** Batch yang masih ada stok dan akan luput dalam tempoh yang diberi. */
export function expiringBatches(withinDays = 90, limit = 50) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);

  return prisma.drugBatch.findMany({
    where: {
      quantityOnHand: { gt: 0 },
      expiryDate: { lte: cutoff },
    },
    select: {
      id: true,
      batchNo: true,
      expiryDate: true,
      quantityOnHand: true,
      drug: { select: { name: true, unit: true } },
    },
    orderBy: { expiryDate: "asc" },
    take: limit,
  });
}

/** Jumlah stok di tangan bagi satu ubat, merentas semua batch. */
export async function onHandForDrug(drugId: string): Promise<number> {
  const result = await prisma.drugBatch.aggregate({
    where: { drugId },
    _sum: { quantityOnHand: true },
  });
  return result._sum.quantityOnHand ?? 0;
}
