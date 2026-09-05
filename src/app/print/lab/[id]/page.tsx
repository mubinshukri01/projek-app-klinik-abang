import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Letterhead, SignatureBlock } from "@/components/letterhead";
import { requireArea } from "@/lib/auth";
import { formatDateOnly } from "@/lib/dates";
import { formatAge, formatIc } from "@/lib/mykad";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Permintaan Ujian Makmal" };
export const dynamic = "force-dynamic";

const PROVIDER_LABEL: Record<string, string> = {
  PATHLAB: "Pathlab",
  BP_HEALTHCARE: "BP Healthcare",
  GRIBBLES: "Gribbles",
  LAIN: "Makmal",
};

export default async function LabPrintPage({ params }: PageProps<"/print/lab/[id]">) {
  await requireArea("konsultasi");
  const { id } = await params;

  const [clinic, order] = await Promise.all([
    prisma.clinic.findFirst(),
    prisma.labOrder.findUnique({
      where: { id },
      select: {
        provider: true,
        tests: true,
        clinicalNote: true,
        orderedAt: true,
        orderedBy: { select: { name: true, mmcNumber: true } },
        visit: {
          select: {
            patient: {
              select: { name: true, idType: true, idNumber: true, dob: true, gender: true, mrn: true },
            },
            consultation: {
              select: { diagnoses: { select: { icd10Code: true, description: true } } },
            },
          },
        },
      },
    }),
  ]);

  if (!order) notFound();

  const patient = order.visit.patient;
  const diagnoses = order.visit.consultation?.diagnoses ?? [];
  const idLabel =
    patient.idType === "MYKAD" || patient.idType === "MYKID"
      ? formatIc(patient.idNumber)
      : patient.idNumber;

  return (
    <article className="doc">
      <Letterhead clinic={clinic} />

      <h2 className="doc-title">Permintaan Ujian Makmal</h2>

      <div className="doc-fields">
        <div className="doc-field">
          <dt>Kepada</dt>
          <dd>{PROVIDER_LABEL[order.provider] ?? order.provider}</dd>
        </div>
        <div className="doc-field">
          <dt>Tarikh</dt>
          <dd>{formatDateOnly(order.orderedAt)}</dd>
        </div>
        <div className="doc-field">
          <dt>Nama pesakit</dt>
          <dd>{patient.name}</dd>
        </div>
        <div className="doc-field">
          <dt>No. K/P</dt>
          <dd>{idLabel}</dd>
        </div>
        <div className="doc-field">
          <dt>No. rekod</dt>
          <dd>{patient.mrn}</dd>
        </div>
        <div className="doc-field">
          <dt>Umur / jantina</dt>
          <dd>
            {formatAge(patient.dob)} · {patient.gender === "LELAKI" ? "Lelaki" : "Perempuan"}
          </dd>
        </div>
      </div>

      <div className="doc-body">
        <p>
          <strong>Ujian yang diminta:</strong>
        </p>
        <ul className="doc-list">
          {order.tests.map((test) => (
            <li key={test}>{test}</li>
          ))}
        </ul>

        {diagnoses.length > 0 ? (
          <p>
            <strong>Diagnosis klinikal:</strong>{" "}
            {diagnoses.map((d) => `${d.description} (${d.icd10Code})`).join(", ")}
          </p>
        ) : null}

        {order.clinicalNote ? (
          <p>
            <strong>Nota klinikal:</strong> {order.clinicalNote}
          </p>
        ) : null}
      </div>

      <SignatureBlock
        doctorName={order.orderedBy.name}
        mmcNumber={order.orderedBy.mmcNumber}
        issuedAt={order.orderedAt}
      />
    </article>
  );
}
