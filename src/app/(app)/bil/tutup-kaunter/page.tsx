import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page";
import { EmptyRow, Table, TableWrap, Td, Th } from "@/components/ui/table";
import { requireArea } from "@/lib/auth";
import { balanceDue } from "@/lib/billing";
import {
  endOfDay,
  formatDateOnly,
  formatTime,
  fromDateInput,
  startOfDay,
  toDateInput,
} from "@/lib/dates";
import { formatRM, sumMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { PAYER_LABEL } from "@/lib/visit-status";

export const metadata: Metadata = { title: "Tutup Kaunter" };
export const dynamic = "force-dynamic";

const METHOD_LABEL: Record<string, string> = {
  CASH: "Tunai",
  CARD: "Kad",
  DUITNOW_QR: "DuitNow QR",
  EWALLET: "E-wallet",
  PANEL: "Panel",
};

export default async function CounterClosePage({ searchParams }: PageProps<"/bil/tutup-kaunter">) {
  await requireArea("bil");

  const params = await searchParams;
  const requested = typeof params.tarikh === "string" ? fromDateInput(params.tarikh) : null;
  // Laporan sentiasa untuk satu hari tempatan. Lalai kepada hari ini.
  const day = requested ?? new Date();
  const from = startOfDay(day);
  const to = endOfDay(day);

  const [payments, invoices] = await Promise.all([
    prisma.payment.findMany({
      where: { receivedAt: { gte: from, lte: to } },
      orderBy: { receivedAt: "asc" },
      select: {
        id: true,
        method: true,
        amount: true,
        reference: true,
        receivedAt: true,
        receivedBy: { select: { name: true } },
        invoice: {
          select: {
            invoiceNo: true,
            visit: { select: { queueNumber: true, patient: { select: { name: true } } } },
          },
        },
      },
    }),
    prisma.invoice.findMany({
      where: { issuedAt: { gte: from, lte: to } },
      select: {
        id: true,
        invoiceNo: true,
        payerType: true,
        total: true,
        amountPaid: true,
        status: true,
        panel: { select: { name: true } },
      },
    }),
  ]);

  const byMethod = new Map<string, number>();
  for (const p of payments) {
    byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + Number(p.amount));
  }

  const collected = sumMoney(payments.map((p) => p.amount));
  const billed = sumMoney(invoices.map((i) => i.total));
  const outstanding = sumMoney(
    invoices.map((i) => balanceDue(i.total, i.amountPaid)),
  );

  const byPayer = new Map<string, { count: number; total: number }>();
  for (const inv of invoices) {
    const current = byPayer.get(inv.payerType) ?? { count: 0, total: 0 };
    byPayer.set(inv.payerType, {
      count: current.count + 1,
      total: current.total + Number(inv.total),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tutup kaunter"
        description={`Penyata kutipan untuk ${formatDateOnly(
          new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate())),
        )}.`}
        action={
          <ButtonLink href="/bil" variant="secondary">
            Kembali
          </ButtonLink>
        }
      />

      <Card className="no-print">
        <CardBody>
          <form method="get" className="flex flex-wrap items-end gap-2">
            <div className="flex-1">
              <label htmlFor="tarikh" className="block text-sm font-medium text-ink-soft">
                Tarikh
              </label>
              <Input
                id="tarikh"
                name="tarikh"
                type="date"
                defaultValue={toDateInput(
                  new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate())),
                )}
                className="mt-1.5 max-w-48"
              />
            </div>
            <Button type="submit">Papar</Button>
          </form>
        </CardBody>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-xs font-medium text-ink-soft uppercase">Kutipan diterima</p>
            <p className="tabular text-2xl font-semibold text-ink">{formatRM(collected)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium text-ink-soft uppercase">Jumlah dibilkan</p>
            <p className="tabular text-2xl font-semibold text-ink">{formatRM(billed)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium text-ink-soft uppercase">Tertunggak (panel/skim)</p>
            <p className="tabular text-2xl font-semibold text-ink">{formatRM(outstanding)}</p>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Kutipan mengikut kaedah"
            description="Jumlah tunai di sini mesti sepadan dengan wang dalam laci."
          />
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Kaedah</Th>
                  <Th className="text-right">Amaun</Th>
                </tr>
              </thead>
              <tbody>
                {byMethod.size === 0 ? (
                  <EmptyRow colSpan={2}>Tiada bayaran diterima.</EmptyRow>
                ) : (
                  [...byMethod.entries()].map(([method, amount]) => (
                    <tr key={method}>
                      <Td>{METHOD_LABEL[method] ?? method}</Td>
                      <Td className="tabular text-right font-medium">{formatRM(amount)}</Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </TableWrap>
        </Card>

        <Card>
          <CardHeader title="Invois mengikut penanggung" />
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Penanggung</Th>
                  <Th className="text-right">Bilangan</Th>
                  <Th className="text-right">Jumlah</Th>
                </tr>
              </thead>
              <tbody>
                {byPayer.size === 0 ? (
                  <EmptyRow colSpan={3}>Tiada invois dikeluarkan.</EmptyRow>
                ) : (
                  [...byPayer.entries()].map(([payer, row]) => (
                    <tr key={payer}>
                      <Td>{PAYER_LABEL[payer as keyof typeof PAYER_LABEL] ?? payer}</Td>
                      <Td className="tabular text-right">{row.count}</Td>
                      <Td className="tabular text-right font-medium">{formatRM(row.total)}</Td>
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
          title="Bayaran diterima"
          description="Setiap bayaran yang direkod pada tarikh ini."
        />
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Masa</Th>
                <Th>Resit</Th>
                <Th>Pesakit</Th>
                <Th>Kaedah</Th>
                <Th>Rujukan</Th>
                <Th className="text-right">Amaun</Th>
                <Th>Oleh</Th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <EmptyRow colSpan={7}>Tiada bayaran diterima pada tarikh ini.</EmptyRow>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <Td className="tabular text-ink-soft">{formatTime(p.receivedAt)}</Td>
                    <Td className="tabular">{p.invoice.invoiceNo}</Td>
                    <Td>{p.invoice.visit.patient.name}</Td>
                    <Td>
                      <Badge tone={p.method === "CASH" ? "ok" : "info"}>
                        {METHOD_LABEL[p.method] ?? p.method}
                      </Badge>
                    </Td>
                    <Td className="tabular text-ink-soft">{p.reference ?? "-"}</Td>
                    <Td className="tabular text-right font-medium">{formatRM(p.amount)}</Td>
                    <Td className="text-ink-soft">{p.receivedBy?.name ?? "-"}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </TableWrap>
      </Card>
    </div>
  );
}
