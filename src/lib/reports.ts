import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Pertanyaan laporan pengurusan.
 *
 * Yang menggabungkan merentas jadual ditulis sebagai SQL mentah: groupBy
 * Prisma tidak boleh menyertai jadual lain, jadi alternatifnya ialah mengambil
 * baris ke dalam Node dan mengumpul di sana — lambat dan tidak perlu apabila
 * Postgres sudah pandai melakukannya.
 */

export interface DoctorProductivityRow {
  doctorId: string;
  doctorName: string;
  visits: number;
  patients: number;
}

/** Bilangan lawatan selesai dan pesakit unik bagi setiap doktor. */
export function doctorProductivity(from: Date, to: Date) {
  return prisma.$queryRaw<DoctorProductivityRow[]>`
    SELECT u."id"                            AS "doctorId",
           u."name"                          AS "doctorName",
           COUNT(v."id")::int                AS "visits",
           COUNT(DISTINCT v."patientId")::int AS "patients"
    FROM "Visit" v
    JOIN "User" u ON u."id" = v."doctorId"
    WHERE v."status" = 'COMPLETED'
      AND v."arrivedAt" >= ${from}
      AND v."arrivedAt" <= ${to}
    GROUP BY u."id", u."name"
    ORDER BY COUNT(v."id") DESC
  `;
}

export interface DiagnosisRow {
  icd10Code: string;
  description: string;
  total: number;
}

/** Diagnosis yang paling kerap direkod dalam tempoh. */
export function topDiagnoses(from: Date, to: Date, limit = 15) {
  return prisma.$queryRaw<DiagnosisRow[]>`
    SELECT d."icd10Code",
           d."description",
           COUNT(*)::int AS "total"
    FROM "Diagnosis" d
    JOIN "Consultation" c ON c."id" = d."consultationId"
    JOIN "Visit" v ON v."id" = c."visitId"
    WHERE v."arrivedAt" >= ${from} AND v."arrivedAt" <= ${to}
    GROUP BY d."icd10Code", d."description"
    ORDER BY COUNT(*) DESC, d."description" ASC
    LIMIT ${limit}
  `;
}

export interface DrugUsageRow {
  drugId: string;
  name: string;
  unit: string;
  dispensed: number;
}

/**
 * Kuantiti setiap ubat yang didispense dalam tempoh.
 *
 * Diambil daripada lejar stok dan bukan daripada preskripsi, kerana lejar
 * merekod apa yang BENAR-BENAR keluar dari rak. Kuantiti disimpan negatif
 * untuk pengeluaran, jadi ia dinegatifkan semula di sini.
 */
export function drugUsage(from: Date, to: Date, limit = 20) {
  return prisma.$queryRaw<DrugUsageRow[]>`
    SELECT dr."id"   AS "drugId",
           dr."name" AS "name",
           dr."unit" AS "unit",
           (-SUM(m."quantity"))::int AS "dispensed"
    FROM "StockMovement" m
    JOIN "Drug" dr ON dr."id" = m."drugId"
    WHERE m."type" = 'DISPENSE'
      AND m."at" >= ${from} AND m."at" <= ${to}
    GROUP BY dr."id", dr."name", dr."unit"
    ORDER BY SUM(m."quantity") ASC
    LIMIT ${limit}
  `;
}

/** Bayaran dalam tempoh, dikumpul mengikut kaedah. */
export async function collectionByMethod(from: Date, to: Date) {
  const rows = await prisma.payment.groupBy({
    by: ["method"],
    where: { receivedAt: { gte: from, lte: to } },
    _sum: { amount: true },
    _count: { _all: true },
  });
  return rows.map((r) => ({
    method: r.method,
    total: Number(r._sum.amount ?? 0),
    count: r._count._all,
  }));
}

/** Lawatan dikumpul mengikut jenis penanggung. */
export async function visitsByPayer(from: Date, to: Date) {
  const rows = await prisma.visit.groupBy({
    by: ["payerType"],
    where: { arrivedAt: { gte: from, lte: to }, status: "COMPLETED" },
    _count: { _all: true },
  });
  return rows.map((r) => ({ payerType: r.payerType, count: r._count._all }));
}

/** Tuntutan panel yang dihantar tetapi belum dibayar sepenuhnya. */
export function outstandingClaims() {
  return prisma.panelClaim.findMany({
    where: { status: { in: ["SUBMITTED", "PARTIAL"] } },
    orderBy: { submittedAt: "asc" },
    select: {
      id: true,
      claimNo: true,
      submittedAt: true,
      totalAmount: true,
      amountPaid: true,
      panel: { select: { name: true } },
    },
  });
}
