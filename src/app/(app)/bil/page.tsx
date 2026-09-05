import type { Metadata } from "next";
import { AutoRefresh } from "@/components/auto-refresh";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { EmptyRow, Table, TableWrap, Td, Th } from "@/components/ui/table";
import { requireArea } from "@/lib/auth";
import { balanceDue } from "@/lib/billing";
import { endOfDay, formatDateOnly, formatTime, startOfDay, toDateOnly } from "@/lib/dates";
import { formatRM, sumMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { PAYER_LABEL } from "@/lib/visit-status";

export const metadata: Metadata = { title: "Bil & Bayaran" };
export const dynamic = "force-dynamic";

export default async function BillingQueuePage() {
  await requireArea("bil");
  const now = new Date();

  const [waiting, payments] = await Promise.all([
    prisma.visit.findMany({
      where: { queueDate: toDateOnly(now), status: "PAYMENT" },
      orderBy: { queueNumber: "asc" },
      select: {
        id: true,
        queueNumber: true,
        arrivedAt: true,
        payerType: true,
        patient: { select: { name: true, mrn: true } },
        invoice: { select: { status: true, total: true, amountPaid: true } },
      },
    }),
    prisma.payment.findMany({
      where: { receivedAt: { gte: startOfDay(now), lte: endOfDay(now) } },
      select: { amount: true, method: true },
    }),
  ]);

  const kutipan = sumMoney(payments.map((p) => p.amount));
  const tunai = sumMoney(payments.filter((p) => p.method === "CASH").map((p) => p.amount));

  return (
    <div className="space-y-6">
      <AutoRefresh seconds={8} />

      <PageHeader
        title="Bil & bayaran"
        description={`${formatDateOnly(toDateOnly(now))} · ${waiting.length} pesakit menunggu di kaunter.`}
        action={
          <ButtonLink href="/bil/tutup-kaunter" variant="secondary">
            Tutup kaunter
          </ButtonLink>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <div className="p-4">
            <p className="text-xs font-medium text-ink-soft uppercase">Kutipan hari ini</p>
            <p className="tabular text-2xl font-semibold text-ink">{formatRM(kutipan)}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-xs font-medium text-ink-soft uppercase">Tunai dalam laci</p>
            <p className="tabular text-2xl font-semibold text-ink">{formatRM(tunai)}</p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Menunggu bayaran" description="Susunan mengikut nombor giliran." />
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th className="w-20">Giliran</Th>
                <Th>Pesakit</Th>
                <Th>Masa</Th>
                <Th>Penanggung</Th>
                <Th className="text-right">Jumlah</Th>
                <Th className="text-right">Baki</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {waiting.length === 0 ? (
                <EmptyRow colSpan={7}>Tiada pesakit menunggu bayaran.</EmptyRow>
              ) : (
                waiting.map((v) => {
                  const due = v.invoice ? balanceDue(v.invoice.total, v.invoice.amountPaid) : 0;
                  return (
                    <tr key={v.id}>
                      <Td className="tabular text-lg font-semibold">{v.queueNumber}</Td>
                      <Td>
                        <span className="font-medium">{v.patient.name}</span>
                        <span className="tabular ml-2 text-xs text-ink-faint">{v.patient.mrn}</span>
                      </Td>
                      <Td className="tabular text-ink-soft">{formatTime(v.arrivedAt)}</Td>
                      <Td>
                        <Badge tone={v.payerType === "SELF" ? "neutral" : "info"}>
                          {PAYER_LABEL[v.payerType]}
                        </Badge>
                      </Td>
                      <Td className="tabular text-right">
                        {v.invoice ? formatRM(v.invoice.total) : "-"}
                      </Td>
                      <Td className="tabular text-right font-medium">
                        {v.invoice ? formatRM(due) : "-"}
                      </Td>
                      <Td className="text-right">
                        <ButtonLink href={`/bil/${v.id}`} size="sm">
                          Buka bil
                        </ButtonLink>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </TableWrap>
      </Card>
    </div>
  );
}
