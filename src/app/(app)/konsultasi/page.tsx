import type { Metadata } from "next";
import { AutoRefresh } from "@/components/auto-refresh";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { EmptyRow, Table, TableWrap, Td, Th } from "@/components/ui/table";
import { requireArea } from "@/lib/auth";
import { formatDateOnly, formatTime, toDateOnly } from "@/lib/dates";
import { formatAge } from "@/lib/mykad";
import { prisma } from "@/lib/prisma";
import { PAYER_LABEL, VISIT_STATUS_LABEL, VISIT_STATUS_TONE } from "@/lib/visit-status";
import { startConsultation } from "./actions";

export const metadata: Metadata = { title: "Konsultasi" };
export const dynamic = "force-dynamic";

export default async function ConsultationListPage() {
  const user = await requireArea("konsultasi");
  const isDoctor = user.role === "DOCTOR";

  const visits = await prisma.visit.findMany({
    where: { queueDate: toDateOnly(), status: { in: ["WAITING", "IN_CONSULT"] } },
    orderBy: [{ status: "desc" }, { queueNumber: "asc" }],
    select: {
      id: true,
      queueNumber: true,
      status: true,
      arrivedAt: true,
      payerType: true,
      doctor: { select: { id: true, name: true } },
      vitals: { select: { id: true } },
      patient: {
        select: {
          id: true,
          name: true,
          mrn: true,
          dob: true,
          gender: true,
          allergies: { select: { id: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <AutoRefresh seconds={8} />

      <PageHeader
        title="Senarai konsultasi"
        description={`${formatDateOnly(toDateOnly())} · ${visits.length} pesakit menunggu atau dalam rawatan.`}
      />

      {!isDoctor ? (
        <Alert tone="info">
          Anda log masuk sebagai jururawat. Anda boleh membuka rekod dan merekod tanda
          vital, tetapi nota klinikal, diagnosis dan preskripsi hanya boleh ditandatangani
          oleh doktor berdaftar.
        </Alert>
      ) : null}

      <Card>
        <CardHeader title="Pesakit" description="Susunan mengikut nombor giliran." />
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th className="w-20">Giliran</Th>
                <Th>Pesakit</Th>
                <Th>Umur / jantina</Th>
                <Th>Masa daftar</Th>
                <Th>Vital</Th>
                <Th>Penanggung</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {visits.length === 0 ? (
                <EmptyRow colSpan={8}>Tiada pesakit menunggu.</EmptyRow>
              ) : (
                visits.map((v) => (
                  <tr key={v.id}>
                    <Td className="tabular text-lg font-semibold">{v.queueNumber}</Td>
                    <Td>
                      <span className="font-medium">{v.patient.name}</span>
                      <span className="tabular ml-2 text-xs text-ink-faint">{v.patient.mrn}</span>
                      {v.patient.allergies.length > 0 ? (
                        <Badge tone="danger" className="ml-2">
                          Alahan
                        </Badge>
                      ) : null}
                    </Td>
                    <Td className="text-ink-soft">
                      {formatAge(v.patient.dob)} · {v.patient.gender === "LELAKI" ? "L" : "P"}
                    </Td>
                    <Td className="tabular text-ink-soft">{formatTime(v.arrivedAt)}</Td>
                    <Td>
                      {v.vitals ? (
                        <Badge tone="ok">Direkod</Badge>
                      ) : (
                        <Badge tone="neutral">Belum</Badge>
                      )}
                    </Td>
                    <Td className="text-ink-soft">{PAYER_LABEL[v.payerType]}</Td>
                    <Td>
                      <Badge tone={VISIT_STATUS_TONE[v.status]}>
                        {VISIT_STATUS_LABEL[v.status]}
                      </Badge>
                      {v.doctor ? (
                        <span className="mt-0.5 block text-xs text-ink-faint">{v.doctor.name}</span>
                      ) : null}
                    </Td>
                    <Td className="text-right">
                      {v.status === "IN_CONSULT" || !isDoctor ? (
                        <ButtonLink href={`/konsultasi/${v.id}`} variant="secondary" size="sm">
                          Buka
                        </ButtonLink>
                      ) : (
                        // Borang biasa dan bukan pautan: membuka konsultasi
                        // menukar status lawatan, jadi ia mesti POST.
                        <form action={startConsultation}>
                          <input type="hidden" name="visitId" value={v.id} />
                          <Button type="submit" size="sm">
                            Mula rawatan
                          </Button>
                        </form>
                      )}
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
