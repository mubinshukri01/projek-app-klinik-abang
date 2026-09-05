import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { requireArea } from "@/lib/auth";
import { formatDateOnly, toDateInput, toDateOnly } from "@/lib/dates";
import { drugsWithStock } from "@/lib/inventory";
import { formatAge, formatIc } from "@/lib/mykad";
import { prisma } from "@/lib/prisma";
import { PAYER_LABEL, VISIT_STATUS_LABEL, VISIT_STATUS_TONE } from "@/lib/visit-status";
import type { DrugForm } from "@/generated/prisma/enums";
import { AllergyForm } from "./allergy-form";
import { CompleteForm } from "./complete-form";
import { DocumentsSection } from "./documents-section";
import { DiagnosisSection } from "./diagnosis-section";
import { NotesForm } from "./notes-form";
import { PrescriptionSection } from "./prescription-section";
import { VitalsForm } from "./vitals-form";

export const metadata: Metadata = { title: "Konsultasi" };
export const dynamic = "force-dynamic";

const dec = (v: { toString(): string } | null) => (v === null ? "" : v.toString());

export default async function ConsultationPage({ params }: PageProps<"/konsultasi/[visitId]">) {
  const user = await requireArea("konsultasi");
  const { visitId } = await params;

  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: {
      patient: { include: { allergies: { orderBy: { notedAt: "desc" } } } },
      vitals: true,
      doctor: { select: { name: true } },
      consultation: { include: { diagnoses: { orderBy: { isPrimary: "desc" } } } },
      prescription: {
        include: {
          items: {
            orderBy: { id: "asc" },
            include: { drug: { select: { name: true, unit: true } } },
          },
        },
      },
      certificates: { orderBy: { issuedAt: "desc" } },
      referrals: { orderBy: { issuedAt: "desc" } },
      labOrders: { orderBy: { orderedAt: "desc" } },
    },
  });

  if (!visit) notFound();

  const [pastVisits, icd10, drugs] = await Promise.all([
    prisma.visit.findMany({
      where: { patientId: visit.patientId, id: { not: visit.id }, status: "COMPLETED" },
      orderBy: { arrivedAt: "desc" },
      take: 5,
      select: {
        id: true,
        queueDate: true,
        doctor: { select: { name: true } },
        consultation: {
          select: {
            notes: true,
            diagnoses: { select: { description: true, isPrimary: true } },
          },
        },
      },
    }),
    prisma.icd10Code.findMany({ orderBy: { description: "asc" } }),
    drugsWithStock(),
  ]);

  // Jururawat boleh merekod tanda vital dan alahan, tetapi tidak boleh
  // menandatangani nota, diagnosis atau preskripsi.
  const isDoctor = user.role === "DOCTOR";
  const closed = visit.status === "COMPLETED" || visit.status === "CANCELLED";
  const clinicalReadOnly = !isDoctor || closed;

  const items = (visit.prescription?.items ?? []).map((item) => ({
    id: item.id,
    drugName: item.drug.name,
    unit: item.drug.unit,
    dose: item.dose,
    frequency: item.frequency,
    durationDays: item.durationDays,
    quantity: item.quantity,
    instructions: item.instructions,
    unitPrice: item.unitPrice.toString(),
    dispensed: item.dispensedAt !== null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={visit.patient.name}
        description={`Giliran ${visit.queueNumber} · ${visit.patient.mrn} · ${formatAge(visit.patient.dob)} · ${
          visit.patient.gender === "LELAKI" ? "Lelaki" : "Perempuan"
        }`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={VISIT_STATUS_TONE[visit.status]}>{VISIT_STATUS_LABEL[visit.status]}</Badge>
            <ButtonLink href="/konsultasi" variant="secondary">
              Senarai
            </ButtonLink>
          </div>
        }
      />

      {/* Alahan mesti dilihat sebelum sebarang preskripsi ditulis, jadi ia
          berada di atas skrin dan bukan tersembunyi dalam tab. */}
      {visit.patient.allergies.length > 0 ? (
        <Alert tone="danger" title="⚠ ALAHAN">
          <ul className="mt-1 space-y-0.5">
            {visit.patient.allergies.map((a) => (
              <li key={a.id}>
                <strong>{a.allergen}</strong>
                {a.reaction ? ` — ${a.reaction}` : ""}{" "}
                <span className="text-xs">({a.severity.toLowerCase()})</span>
              </li>
            ))}
          </ul>
        </Alert>
      ) : (
        <Alert tone="info">Tiada alahan direkod untuk pesakit ini.</Alert>
      )}

      {closed ? (
        <Alert tone="info">
          Lawatan ini sudah ditutup. Rekod dipaparkan untuk rujukan sahaja.
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title="Tanda vital"
              description="Boleh direkod oleh jururawat atau doktor."
            />
            <CardBody>
              <VitalsForm
                visitId={visit.id}
                readOnly={closed}
                initial={{
                  temperature: dec(visit.vitals?.temperature ?? null),
                  systolic: visit.vitals?.systolic?.toString() ?? "",
                  diastolic: visit.vitals?.diastolic?.toString() ?? "",
                  pulse: visit.vitals?.pulse?.toString() ?? "",
                  respiratoryRate: visit.vitals?.respiratoryRate?.toString() ?? "",
                  spo2: visit.vitals?.spo2?.toString() ?? "",
                  weightKg: dec(visit.vitals?.weightKg ?? null),
                  heightCm: dec(visit.vitals?.heightCm ?? null),
                  bloodGlucose: dec(visit.vitals?.bloodGlucose ?? null),
                }}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Nota konsultasi" />
            <CardBody>
              <NotesForm
                visitId={visit.id}
                readOnly={clinicalReadOnly}
                initial={{
                  presentingComplaint: visit.consultation?.presentingComplaint ?? "",
                  history: visit.consultation?.history ?? "",
                  examination: visit.consultation?.examination ?? "",
                  notes: visit.consultation?.notes ?? "",
                  disposition: visit.consultation?.disposition ?? "",
                  followUpDate: toDateInput(visit.consultation?.followUpDate ?? null),
                }}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Diagnosis" description="Sekurang-kurangnya satu diperlukan sebelum menutup." />
            <CardBody>
              <DiagnosisSection
                visitId={visit.id}
                readOnly={clinicalReadOnly}
                codes={icd10}
                diagnoses={visit.consultation?.diagnoses ?? []}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Preskripsi"
              description="Kuantiti dikira automatik daripada dos, kekerapan dan tempoh."
            />
            <CardBody>
              <PrescriptionSection
                visitId={visit.id}
                readOnly={clinicalReadOnly}
                drugs={drugs.map((d) => ({ ...d, form: d.form as DrugForm }))}
                items={items}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Dokumen"
              description="MC, surat rujukan dan permintaan makmal untuk lawatan ini."
            />
            <CardBody>
              <DocumentsSection
                visitId={visit.id}
                readOnly={clinicalReadOnly}
                today={toDateInput(toDateOnly())}
                mcs={visit.certificates.map((mc) => ({
                  id: mc.id,
                  serialNo: mc.serialNo,
                  fromLabel: formatDateOnly(mc.fromDate),
                  toLabel: formatDateOnly(mc.toDate),
                  days: mc.days,
                  reason: mc.reason,
                  voided: mc.status === "VOID",
                  voidReason: mc.voidReason,
                }))}
                referrals={visit.referrals.map((r) => ({
                  id: r.id,
                  toFacility: r.toFacility,
                  specialty: r.specialty,
                  reason: r.reason,
                }))}
                labOrders={visit.labOrders.map((l) => ({
                  id: l.id,
                  provider: l.provider,
                  tests: l.tests,
                  status: l.status,
                }))}
              />
            </CardBody>
          </Card>

          {!closed && isDoctor ? (
            <Card>
              <CardHeader title="Tutup konsultasi" />
              <CardBody>
                <CompleteForm visitId={visit.id} hasPrescription={items.length > 0} />
              </CardBody>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Pesakit" />
            <CardBody className="space-y-2 text-sm">
              <Row label="No. pengenalan" value={
                visit.patient.idType === "MYKAD" || visit.patient.idType === "MYKID"
                  ? formatIc(visit.patient.idNumber)
                  : visit.patient.idNumber
              } />
              <Row label="Tarikh lahir" value={formatDateOnly(visit.patient.dob)} />
              <Row label="Telefon" value={visit.patient.phone ?? "-"} />
              <Row label="Penanggung" value={PAYER_LABEL[visit.payerType]} />
              <Row label="Doktor" value={visit.doctor?.name ?? "-"} />
              <div className="pt-2">
                {closed ? null : (
                  <AllergyForm visitId={visit.id} patientId={visit.patient.id} />
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Lawatan lalu" description="5 lawatan selesai terkini." />
            <CardBody className="space-y-3">
              {pastVisits.length === 0 ? (
                <p className="text-sm text-ink-faint">Tiada lawatan lalu.</p>
              ) : (
                pastVisits.map((pv) => {
                  const diagnoses = pv.consultation?.diagnoses ?? [];
                  const primary = diagnoses.find((d) => d.isPrimary) ?? diagnoses[0];
                  return (
                    <div key={pv.id} className="border-b border-line-soft pb-2 last:border-0 last:pb-0">
                      <p className="tabular text-xs text-ink-faint">
                        {formatDateOnly(pv.queueDate)}
                        {pv.doctor ? ` · ${pv.doctor.name}` : ""}
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-ink">
                        {primary?.description ?? "Tiada diagnosis"}
                      </p>
                      {pv.consultation?.notes ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">
                          {pv.consultation.notes}
                        </p>
                      ) : null}
                    </div>
                  );
                })
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-ink-soft">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
