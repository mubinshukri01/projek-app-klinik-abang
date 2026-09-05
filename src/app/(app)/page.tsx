import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { EmptyRow, Table, TableWrap, Td, Th } from "@/components/ui/table";
import { canAccess, requireUser } from "@/lib/auth";
import { endOfDay, formatDateOnly, startOfDay, toDateOnly } from "@/lib/dates";
import { expiringBatches, lowStockDrugs } from "@/lib/inventory";
import { formatRM, sumMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Utama" };

// Papan pemuka sentiasa menunjukkan keadaan hari ini, jadi ia tidak boleh
// dihidangkan daripada cache yang dibina lebih awal.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const today = toDateOnly(now);

  const [statusCounts, payments, lowStock, expiring] = await Promise.all([
    prisma.visit.groupBy({
      by: ["status"],
      where: { queueDate: today },
      _count: { _all: true },
    }),
    prisma.payment.findMany({
      where: { receivedAt: { gte: startOfDay(now), lte: endOfDay(now) } },
      select: { amount: true },
    }),
    canAccess(user.role, "inventori") ? lowStockDrugs(8) : Promise.resolve([]),
    canAccess(user.role, "inventori") ? expiringBatches(90, 8) : Promise.resolve([]),
  ]);

  const countOf = (...statuses: string[]) =>
    statusCounts
      .filter((row) => statuses.includes(row.status))
      .reduce((sum, row) => sum + row._count._all, 0);

  const jumlahHariIni = statusCounts.reduce((sum, row) => sum + row._count._all, 0);
  const menunggu = countOf("REGISTERED", "WAITING");
  const dalamRawatan = countOf("IN_CONSULT");
  const menungguBayar = countOf("DISPENSING", "PAYMENT");
  const selesai = countOf("COMPLETED");
  const kutipan = sumMoney(payments.map((p) => p.amount));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Selamat datang, ${user.name}`}
        description={`Ringkasan operasi klinik untuk ${formatDateOnly(today)}.`}
        action={
          canAccess(user.role, "pendaftaran") ? (
            <ButtonLink href="/pendaftaran">Daftar pesakit</ButtonLink>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Pesakit hari ini" value={jumlahHariIni} />
        <Stat label="Menunggu" value={menunggu} tone={menunggu > 0 ? "warn" : "neutral"} />
        <Stat label="Dalam rawatan" value={dalamRawatan} />
        <Stat label="Menunggu bayaran" value={menungguBayar} />
        <Stat label="Selesai" value={selesai} tone="ok" />
      </div>

      <Card>
        <CardHeader
          title="Kutipan hari ini"
          description="Jumlah semua bayaran yang diterima hari ini."
        />
        <CardBody>
          <p className="tabular text-2xl font-semibold text-ink">{formatRM(kutipan)}</p>
          <p className="mt-1 text-xs text-ink-faint">
            Untuk penyata penuh, buka Laporan → Tutup kaunter.
          </p>
        </CardBody>
      </Card>

      {canAccess(user.role, "inventori") ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Stok perlu dipesan"
              description="Ubat yang stoknya sudah mencecah paras pesanan semula."
            />
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>Ubat</Th>
                    <Th className="text-right">Ada</Th>
                    <Th className="text-right">Paras</Th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.length === 0 ? (
                    <EmptyRow colSpan={3}>Semua stok mencukupi.</EmptyRow>
                  ) : (
                    lowStock.map((row) => (
                      <tr key={row.drugId}>
                        <Td>{row.name}</Td>
                        <Td className="tabular text-right font-medium text-danger">
                          {row.onHand} {row.unit}
                        </Td>
                        <Td className="tabular text-right text-ink-soft">{row.reorderLevel}</Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </TableWrap>
          </Card>

          <Card>
            <CardHeader
              title="Batch hampir luput"
              description="Batch yang masih ada stok dan luput dalam 90 hari."
            />
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>Ubat</Th>
                    <Th>Batch</Th>
                    <Th className="text-right">Luput</Th>
                  </tr>
                </thead>
                <tbody>
                  {expiring.length === 0 ? (
                    <EmptyRow colSpan={3}>Tiada batch hampir luput.</EmptyRow>
                  ) : (
                    expiring.map((batch) => (
                      <tr key={batch.id}>
                        <Td>{batch.drug.name}</Td>
                        <Td className="text-ink-soft">{batch.batchNo}</Td>
                        <Td className="tabular text-right">{formatDateOnly(batch.expiryDate)}</Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </TableWrap>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "ok" | "warn";
}) {
  return (
    <Card>
      <CardBody className="space-y-1">
        <p className="text-xs font-medium text-ink-soft uppercase">{label}</p>
        <div className="flex items-center gap-2">
          <span className="tabular text-2xl font-semibold text-ink">{value}</span>
          {tone !== "neutral" && value > 0 ? (
            <Badge tone={tone}>{tone === "warn" ? "perlu perhatian" : "selesai"}</Badge>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}
