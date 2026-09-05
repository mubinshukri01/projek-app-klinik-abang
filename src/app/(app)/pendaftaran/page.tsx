import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page";
import { EmptyRow, Table, TableWrap, Td, Th } from "@/components/ui/table";
import { requireArea } from "@/lib/auth";
import { formatDateOnly, formatTime, toDateOnly } from "@/lib/dates";
import { formatAge, formatIc } from "@/lib/mykad";
import { searchPatients } from "@/lib/patients";
import { prisma } from "@/lib/prisma";
import { PAYER_LABEL, VISIT_STATUS_LABEL, VISIT_STATUS_TONE } from "@/lib/visit-status";

export const metadata: Metadata = { title: "Pendaftaran" };
export const dynamic = "force-dynamic";

export default async function RegistrationPage({ searchParams }: PageProps<"/pendaftaran">) {
  await requireArea("pendaftaran");

  const params = await searchParams;
  const query = typeof params.cari === "string" ? params.cari : "";

  const [results, todayVisits] = await Promise.all([
    query ? searchPatients(query) : Promise.resolve([]),
    prisma.visit.findMany({
      where: { queueDate: toDateOnly() },
      orderBy: { queueNumber: "desc" },
      take: 15,
      select: {
        id: true,
        queueNumber: true,
        status: true,
        arrivedAt: true,
        payerType: true,
        patient: { select: { id: true, name: true, mrn: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pendaftaran"
        description="Cari pesakit sedia ada, atau daftar pesakit baharu."
        action={<ButtonLink href="/pendaftaran/baru">Pesakit baharu</ButtonLink>}
      />

      <Card>
        <CardBody>
          {/* Borang GET biasa: hasil carian boleh di-bookmark dan butang
              kembali pelayar berfungsi seperti yang dijangka kakitangan. */}
          <form method="get" className="flex flex-wrap gap-2">
            <Input
              name="cari"
              defaultValue={query}
              placeholder="Nombor IC, nama, telefon atau no. rekod"
              aria-label="Cari pesakit"
              className="min-w-64 flex-1"
              autoFocus
            />
            <Button type="submit">Cari</Button>
          </form>

          {query ? (
            <div className="mt-4">
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <Th>No. rekod</Th>
                      <Th>Nama</Th>
                      <Th>No. pengenalan</Th>
                      <Th>Umur</Th>
                      <Th>Telefon</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody>
                    {results.length === 0 ? (
                      <EmptyRow colSpan={6}>
                        Tiada pesakit sepadan dengan &ldquo;{query}&rdquo;.{" "}
                        <Link
                          href={`/pendaftaran/baru?ic=${encodeURIComponent(query)}`}
                          className="font-medium text-brand underline"
                        >
                          Daftar sebagai pesakit baharu
                        </Link>
                      </EmptyRow>
                    ) : (
                      results.map((p) => (
                        <tr key={p.id}>
                          <Td className="tabular text-ink-soft">{p.mrn}</Td>
                          <Td className="font-medium">{p.name}</Td>
                          <Td className="tabular">
                            {p.idType === "MYKAD" || p.idType === "MYKID"
                              ? formatIc(p.idNumber)
                              : p.idNumber}
                          </Td>
                          <Td className="text-ink-soft">{formatAge(p.dob)}</Td>
                          <Td className="tabular text-ink-soft">{p.phone ?? "-"}</Td>
                          <Td className="text-right">
                            <ButtonLink
                              href={`/pendaftaran/pesakit/${p.id}`}
                              variant="secondary"
                              size="sm"
                            >
                              Buka
                            </ButtonLink>
                          </Td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </TableWrap>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Pendaftaran hari ini"
          description={`Lawatan yang didaftarkan pada ${formatDateOnly(toDateOnly())}.`}
          action={
            <ButtonLink href="/queue" variant="secondary" size="sm">
              Papan giliran
            </ButtonLink>
          }
        />
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th className="w-20">Giliran</Th>
                <Th>Pesakit</Th>
                <Th>Masa</Th>
                <Th>Penanggung</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {todayVisits.length === 0 ? (
                <EmptyRow colSpan={5}>Belum ada pendaftaran hari ini.</EmptyRow>
              ) : (
                todayVisits.map((v) => (
                  <tr key={v.id}>
                    <Td className="tabular text-lg font-semibold">{v.queueNumber}</Td>
                    <Td>
                      <Link
                        href={`/pendaftaran/pesakit/${v.patient.id}`}
                        className="font-medium text-brand hover:underline"
                      >
                        {v.patient.name}
                      </Link>
                      <span className="tabular ml-2 text-xs text-ink-faint">{v.patient.mrn}</span>
                    </Td>
                    <Td className="tabular text-ink-soft">{formatTime(v.arrivedAt)}</Td>
                    <Td className="text-ink-soft">{PAYER_LABEL[v.payerType]}</Td>
                    <Td>
                      <Badge tone={VISIT_STATUS_TONE[v.status]}>
                        {VISIT_STATUS_LABEL[v.status]}
                      </Badge>
                    </Td>
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
