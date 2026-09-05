import type { Metadata } from "next";
import { AutoRefresh } from "@/components/auto-refresh";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { EmptyRow, Table, TableWrap, Td, Th } from "@/components/ui/table";
import { requireArea } from "@/lib/auth";
import { formatDateOnly, formatTime, toDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Dispensari" };
export const dynamic = "force-dynamic";

export default async function DispensaryQueuePage() {
  await requireArea("dispensari");

  const visits = await prisma.visit.findMany({
    where: { queueDate: toDateOnly(), status: "DISPENSING" },
    orderBy: { queueNumber: "asc" },
    select: {
      id: true,
      queueNumber: true,
      arrivedAt: true,
      patient: { select: { name: true, mrn: true } },
      doctor: { select: { name: true } },
      prescription: {
        select: { items: { select: { id: true, dispensedAt: true } } },
      },
    },
  });

  return (
    <div className="space-y-6">
      <AutoRefresh seconds={8} />

      <PageHeader
        title="Dispensari"
        description={`${formatDateOnly(toDateOnly())} · ${visits.length} preskripsi menunggu.`}
      />

      <Card>
        <CardHeader title="Preskripsi menunggu" description="Susunan mengikut nombor giliran." />
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th className="w-20">Giliran</Th>
                <Th>Pesakit</Th>
                <Th>Doktor</Th>
                <Th>Masa daftar</Th>
                <Th>Ubat</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {visits.length === 0 ? (
                <EmptyRow colSpan={6}>Tiada preskripsi menunggu.</EmptyRow>
              ) : (
                visits.map((v) => {
                  const items = v.prescription?.items ?? [];
                  const done = items.filter((i) => i.dispensedAt).length;
                  return (
                    <tr key={v.id}>
                      <Td className="tabular text-lg font-semibold">{v.queueNumber}</Td>
                      <Td>
                        <span className="font-medium">{v.patient.name}</span>
                        <span className="tabular ml-2 text-xs text-ink-faint">{v.patient.mrn}</span>
                      </Td>
                      <Td className="text-ink-soft">{v.doctor?.name ?? "-"}</Td>
                      <Td className="tabular text-ink-soft">{formatTime(v.arrivedAt)}</Td>
                      <Td>
                        <Badge tone={done === items.length ? "ok" : "warn"}>
                          {done} / {items.length} disediakan
                        </Badge>
                      </Td>
                      <Td className="text-right">
                        <ButtonLink href={`/dispensari/${v.id}`} size="sm">
                          Sediakan ubat
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
