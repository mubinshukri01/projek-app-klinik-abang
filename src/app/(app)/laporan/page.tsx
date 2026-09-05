import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page";
import { EmptyRow, Table, TableWrap, Td, Th } from "@/components/ui/table";
import { canAccess, requireArea } from "@/lib/auth";
import { endOfDay, formatDateOnly, fromDateInput, startOfDay, toDateInput } from "@/lib/dates";
import { formatRM, sumMoney } from "@/lib/money";
import {
  collectionByMethod,
  doctorProductivity,
  drugUsage,
  outstandingClaims,
  topDiagnoses,
  visitsByPayer,
} from "@/lib/reports";
import { PAYER_LABEL } from "@/lib/visit-status";

export const metadata: Metadata = { title: "Laporan" };
export const dynamic = "force-dynamic";

const METHOD_LABEL: Record<string, string> = {
  CASH: "Tunai",
  CARD: "Kad",
  DUITNOW_QR: "DuitNow QR",
  EWALLET: "E-wallet",
  PANEL: "Panel",
};

export default async function ReportsPage({ searchParams }: PageProps<"/laporan">) {
  const user = await requireArea("laporan");
  const params = await searchParams;

  // Lalai kepada bulan semasa hingga hari ini.
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const from = startOfDay(
    (typeof params.dari === "string" ? fromDateInput(params.dari) : null) ?? defaultFrom,
  );
  const to = endOfDay((typeof params.hingga === "string" ? fromDateInput(params.hingga) : null) ?? now);

  const [collection, payers, doctors, diagnoses, drugs, claims] = await Promise.all([
    collectionByMethod(from, to),
    visitsByPayer(from, to),
    doctorProductivity(from, to),
    topDiagnoses(from, to),
    drugUsage(from, to),
    canAccess(user.role, "panel") ? outstandingClaims() : Promise.resolve([]),
  ]);

  const totalCollected = sumMoney(collection.map((c) => c.total));
  const totalVisits = payers.reduce((sum, p) => sum + p.count, 0);
  const outstandingTotal = sumMoney(
    claims.map((c) => Number(c.totalAmount) - Number(c.amountPaid)),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan"
        description={`${formatDateOnly(
          new Date(Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())),
        )} hingga ${formatDateOnly(
          new Date(Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())),
        )}`}
        action={
          <ButtonLink href="/bil/tutup-kaunter" variant="secondary">
            Tutup kaunter harian
          </ButtonLink>
        }
      />

      <Card className="no-print">
        <CardBody>
          <form method="get" className="flex flex-wrap items-end gap-2">
            <div>
              <label htmlFor="dari" className="block text-sm font-medium text-ink-soft">
                Dari
              </label>
              <Input
                id="dari"
                name="dari"
                type="date"
                defaultValue={toDateInput(
                  new Date(Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())),
                )}
                className="mt-1.5 max-w-44"
              />
            </div>
            <div>
              <label htmlFor="hingga" className="block text-sm font-medium text-ink-soft">
                Hingga
              </label>
              <Input
                id="hingga"
                name="hingga"
                type="date"
                defaultValue={toDateInput(
                  new Date(Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())),
                )}
                className="mt-1.5 max-w-44"
              />
            </div>
            <Button type="submit">Papar</Button>
          </form>
        </CardBody>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-xs font-medium text-ink-soft uppercase">Kutipan</p>
            <p className="tabular text-2xl font-semibold text-ink">{formatRM(totalCollected)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium text-ink-soft uppercase">Lawatan selesai</p>
            <p className="tabular text-2xl font-semibold text-ink">{totalVisits}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium text-ink-soft uppercase">Tuntutan tertunggak</p>
            <p className="tabular text-2xl font-semibold text-ink">{formatRM(outstandingTotal)}</p>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Kutipan mengikut kaedah" />
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Kaedah</Th>
                  <Th className="text-right">Bilangan</Th>
                  <Th className="text-right">Jumlah</Th>
                </tr>
              </thead>
              <tbody>
                {collection.length === 0 ? (
                  <EmptyRow colSpan={3}>Tiada bayaran dalam tempoh ini.</EmptyRow>
                ) : (
                  collection.map((row) => (
                    <tr key={row.method}>
                      <Td>{METHOD_LABEL[row.method] ?? row.method}</Td>
                      <Td className="tabular text-right text-ink-soft">{row.count}</Td>
                      <Td className="tabular text-right font-medium">{formatRM(row.total)}</Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </TableWrap>
        </Card>

        <Card>
          <CardHeader title="Lawatan mengikut penanggung" />
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Penanggung</Th>
                  <Th className="text-right">Lawatan</Th>
                </tr>
              </thead>
              <tbody>
                {payers.length === 0 ? (
                  <EmptyRow colSpan={2}>Tiada lawatan selesai dalam tempoh ini.</EmptyRow>
                ) : (
                  payers.map((row) => (
                    <tr key={row.payerType}>
                      <Td>{PAYER_LABEL[row.payerType]}</Td>
                      <Td className="tabular text-right font-medium">{row.count}</Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </TableWrap>
        </Card>

        <Card>
          <CardHeader title="Produktiviti doktor" description="Lawatan selesai dalam tempoh." />
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Doktor</Th>
                  <Th className="text-right">Lawatan</Th>
                  <Th className="text-right">Pesakit unik</Th>
                </tr>
              </thead>
              <tbody>
                {doctors.length === 0 ? (
                  <EmptyRow colSpan={3}>Tiada lawatan selesai.</EmptyRow>
                ) : (
                  doctors.map((row) => (
                    <tr key={row.doctorId}>
                      <Td className="font-medium">{row.doctorName}</Td>
                      <Td className="tabular text-right">{row.visits}</Td>
                      <Td className="tabular text-right text-ink-soft">{row.patients}</Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </TableWrap>
        </Card>

        <Card>
          <CardHeader title="Diagnosis teratas" description="15 diagnosis paling kerap." />
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Kod</Th>
                  <Th>Diagnosis</Th>
                  <Th className="text-right">Kes</Th>
                </tr>
              </thead>
              <tbody>
                {diagnoses.length === 0 ? (
                  <EmptyRow colSpan={3}>Tiada diagnosis direkod.</EmptyRow>
                ) : (
                  diagnoses.map((row) => (
                    <tr key={row.icd10Code}>
                      <Td className="tabular text-ink-soft">{row.icd10Code}</Td>
                      <Td>{row.description}</Td>
                      <Td className="tabular text-right font-medium">{row.total}</Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </TableWrap>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Penggunaan ubat"
          description="Diambil daripada lejar stok — apa yang benar-benar keluar dari rak."
        />
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Ubat</Th>
                <Th className="text-right">Didispense</Th>
              </tr>
            </thead>
            <tbody>
              {drugs.length === 0 ? (
                <EmptyRow colSpan={2}>Tiada ubat didispense dalam tempoh ini.</EmptyRow>
              ) : (
                drugs.map((row) => (
                  <tr key={row.drugId}>
                    <Td>
                      <Link
                        href={`/inventori/${row.drugId}`}
                        className="font-medium text-brand hover:underline"
                      >
                        {row.name}
                      </Link>
                    </Td>
                    <Td className="tabular text-right font-medium">
                      {row.dispensed} {row.unit}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </TableWrap>
      </Card>

      {canAccess(user.role, "panel") ? (
        <Card>
          <CardHeader
            title="Tuntutan panel tertunggak"
            description="Dihantar tetapi belum dibayar sepenuhnya. Tidak terhad kepada tempoh di atas."
          />
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>No. tuntutan</Th>
                  <Th>Panel</Th>
                  <Th>Dihantar</Th>
                  <Th className="text-right">Jumlah</Th>
                  <Th className="text-right">Baki</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {claims.length === 0 ? (
                  <EmptyRow colSpan={6}>Tiada tuntutan tertunggak.</EmptyRow>
                ) : (
                  claims.map((c) => (
                    <tr key={c.id}>
                      <Td className="tabular font-medium">{c.claimNo}</Td>
                      <Td>{c.panel.name}</Td>
                      <Td className="tabular text-ink-soft">{formatDateOnly(c.submittedAt)}</Td>
                      <Td className="tabular text-right">{formatRM(c.totalAmount)}</Td>
                      <Td className="tabular text-right font-medium">
                        {formatRM(Number(c.totalAmount) - Number(c.amountPaid))}
                      </Td>
                      <Td className="text-right">
                        <ButtonLink href={`/panel/${c.id}`} variant="secondary" size="sm">
                          Buka
                        </ButtonLink>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </TableWrap>
        </Card>
      ) : (
        <Badge tone="neutral">Tuntutan panel hanya boleh dilihat oleh pentadbir.</Badge>
      )}
    </div>
  );
}
