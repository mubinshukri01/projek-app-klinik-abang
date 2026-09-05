import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { EmptyRow, Table, TableWrap, Td, Th } from "@/components/ui/table";
import { requireArea } from "@/lib/auth";
import { formatDateOnly } from "@/lib/dates";
import { formatAge, formatIc } from "@/lib/mykad";
import { activeVisitFor, getPatient } from "@/lib/patients";
import { prisma } from "@/lib/prisma";
import { PAYER_LABEL, VISIT_STATUS_LABEL, VISIT_STATUS_TONE } from "@/lib/visit-status";
import { StartVisitForm } from "./start-visit-form";

export const metadata: Metadata = { title: "Rekod Pesakit" };
export const dynamic = "force-dynamic";

export default async function PatientPage({ params }: PageProps<"/pendaftaran/pesakit/[id]">) {
  await requireArea("pendaftaran");

  const { id } = await params;
  const [patient, panels] = await Promise.all([
    getPatient(id),
    prisma.panel.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!patient) notFound();

  const openVisit = await activeVisitFor(patient.id);
  const usesIc = patient.idType === "MYKAD" || patient.idType === "MYKID";

  return (
    <div className="space-y-6">
      <PageHeader
        title={patient.name}
        description={`No. rekod ${patient.mrn}`}
        action={
          <ButtonLink href="/pendaftaran" variant="secondary">
            Kembali ke carian
          </ButtonLink>
        }
      />

      {patient.allergies.length > 0 ? (
        <Alert tone="danger" title="Alahan diketahui">
          <ul className="mt-1 list-inside list-disc">
            {patient.allergies.map((a) => (
              <li key={a.id}>
                <strong>{a.allergen}</strong>
                {a.reaction ? ` — ${a.reaction}` : ""} ({a.severity.toLowerCase()})
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Butiran pesakit" />
          <CardBody>
            <dl className="space-y-2 text-sm">
              <Row label="No. pengenalan" value={usesIc ? formatIc(patient.idNumber) : patient.idNumber} mono />
              <Row label="Jantina" value={patient.gender === "LELAKI" ? "Lelaki" : "Perempuan"} />
              <Row label="Tarikh lahir" value={formatDateOnly(patient.dob)} mono />
              <Row label="Umur" value={formatAge(patient.dob)} />
              <Row label="Telefon" value={patient.phone ?? "-"} mono />
              <Row label="Warganegara" value={patient.nationality} />
              <Row
                label="Alamat"
                value={
                  [patient.addressLine1, patient.addressLine2, patient.postcode, patient.city, patient.state]
                    .filter(Boolean)
                    .join(", ") || "-"
                }
              />
              <Row
                label="Kecemasan"
                value={
                  patient.emergencyName
                    ? `${patient.emergencyName} (${patient.emergencyRelation ?? "-"}) ${patient.emergencyPhone ?? ""}`
                    : "-"
                }
              />
              <Row
                label="Persetujuan PDPA"
                value={
                  patient.consentGivenAt
                    ? `Diberi ${formatDateOnly(patient.consentGivenAt)} (v${patient.consentVersion})`
                    : "Belum direkod"
                }
              />
            </dl>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Lawatan hari ini"
            description="Daftarkan lawatan untuk memberi pesakit nombor giliran."
          />
          <CardBody>
            {openVisit ? (
              <Alert tone="info" title={`Lawatan terbuka — giliran ${openVisit.queueNumber}`}>
                <p>
                  Status semasa: <strong>{VISIT_STATUS_LABEL[openVisit.status]}</strong>. Selesaikan
                  atau batalkan lawatan ini sebelum mendaftar lawatan baharu.
                </p>
                <div className="mt-3">
                  <ButtonLink href="/queue" size="sm" variant="secondary">
                    Buka papan giliran
                  </ButtonLink>
                </div>
              </Alert>
            ) : (
              <StartVisitForm patientId={patient.id} panels={panels} />
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Sejarah lawatan" description="10 lawatan terkini." />
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Tarikh</Th>
                <Th className="w-20">Giliran</Th>
                <Th>Doktor</Th>
                <Th>Diagnosis</Th>
                <Th>Penanggung</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {patient.visits.length === 0 ? (
                <EmptyRow colSpan={6}>Belum ada lawatan direkodkan.</EmptyRow>
              ) : (
                patient.visits.map((v) => {
                  const diagnoses = v.consultation?.diagnoses ?? [];
                  const primary = diagnoses.find((d) => d.isPrimary) ?? diagnoses[0];
                  return (
                    <tr key={v.id}>
                      <Td className="tabular">{formatDateOnly(v.queueDate)}</Td>
                      <Td className="tabular">{v.queueNumber}</Td>
                      <Td className="text-ink-soft">{v.doctor?.name ?? "-"}</Td>
                      <Td>
                        {primary ? primary.description : <span className="text-ink-faint">-</span>}
                        {diagnoses.length > 1 ? (
                          <span className="ml-1 text-xs text-ink-faint">
                            +{diagnoses.length - 1}
                          </span>
                        ) : null}
                      </Td>
                      <Td className="text-ink-soft">{PAYER_LABEL[v.payerType]}</Td>
                      <Td>
                        <Badge tone={VISIT_STATUS_TONE[v.status]}>
                          {VISIT_STATUS_LABEL[v.status]}
                        </Badge>
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

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <dt className="w-32 shrink-0 text-ink-soft">{label}</dt>
      <dd className={mono ? "tabular text-ink" : "text-ink"}>{value}</dd>
    </div>
  );
}
