import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Letterhead, SignatureBlock } from "@/components/letterhead";
import { requireArea } from "@/lib/auth";
import { formatDateOnly } from "@/lib/dates";
import { formatAge, formatIc } from "@/lib/mykad";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Surat Rujukan" };
export const dynamic = "force-dynamic";

export default async function ReferralPrintPage({ params }: PageProps<"/print/rujukan/[id]">) {
  await requireArea("konsultasi");
  const { id } = await params;

  const [clinic, referral] = await Promise.all([
    prisma.clinic.findFirst(),
    prisma.referralLetter.findUnique({
      where: { id },
      select: {
        toFacility: true,
        toDoctor: true,
        specialty: true,
        reason: true,
        clinicalSummary: true,
        issuedAt: true,
        issuedBy: { select: { name: true, mmcNumber: true } },
        visit: {
          select: {
            patient: {
              select: {
                name: true,
                idType: true,
                idNumber: true,
                dob: true,
                gender: true,
                phone: true,
                allergies: { select: { allergen: true, reaction: true } },
              },
            },
            vitals: true,
            consultation: {
              select: { diagnoses: { select: { icd10Code: true, description: true } } },
            },
            prescription: {
              select: {
                items: {
                  select: {
                    dose: true,
                    frequency: true,
                    drug: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  if (!referral) notFound();

  const patient = referral.visit.patient;
  const vitals = referral.visit.vitals;
  const diagnoses = referral.visit.consultation?.diagnoses ?? [];
  const medications = referral.visit.prescription?.items ?? [];
  const idLabel =
    patient.idType === "MYKAD" || patient.idType === "MYKID"
      ? formatIc(patient.idNumber)
      : patient.idNumber;

  return (
    <article className="doc">
      <Letterhead clinic={clinic} />

      <h2 className="doc-title">Surat Rujukan</h2>

      <div className="doc-fields">
        <div className="doc-field">
          <dt>Kepada</dt>
          <dd>
            {referral.toDoctor ? `${referral.toDoctor}, ` : ""}
            {referral.toFacility}
            {referral.specialty ? ` (${referral.specialty})` : ""}
          </dd>
        </div>
        <div className="doc-field">
          <dt>Tarikh</dt>
          <dd>{formatDateOnly(referral.issuedAt)}</dd>
        </div>
      </div>

      <div className="doc-fields">
        <div className="doc-field">
          <dt>Nama pesakit</dt>
          <dd>{patient.name}</dd>
        </div>
        <div className="doc-field">
          <dt>No. K/P</dt>
          <dd>{idLabel}</dd>
        </div>
        <div className="doc-field">
          <dt>Umur / jantina</dt>
          <dd>
            {formatAge(patient.dob)} · {patient.gender === "LELAKI" ? "Lelaki" : "Perempuan"}
          </dd>
        </div>
        {patient.phone ? (
          <div className="doc-field">
            <dt>Telefon</dt>
            <dd>{patient.phone}</dd>
          </div>
        ) : null}
      </div>

      <div className="doc-body">
        <p>
          <strong>Sebab rujukan:</strong> {referral.reason}
        </p>

        {diagnoses.length > 0 ? (
          <>
            <p>
              <strong>Diagnosis:</strong>
            </p>
            <ul className="doc-list">
              {diagnoses.map((d) => (
                <li key={d.icd10Code}>
                  {d.description} ({d.icd10Code})
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {/* Alahan mesti dinyatakan pada setiap rujukan — fasiliti penerima
            bergantung pada surat ini sebelum memberi sebarang rawatan. */}
        <p>
          <strong>Alahan:</strong>{" "}
          {patient.allergies.length === 0
            ? "Tiada direkod"
            : patient.allergies
                .map((a) => `${a.allergen}${a.reaction ? ` (${a.reaction})` : ""}`)
                .join(", ")}
        </p>

        {vitals ? (
          <p>
            <strong>Tanda vital:</strong>{" "}
            {[
              vitals.temperature ? `Suhu ${vitals.temperature}°C` : null,
              vitals.systolic && vitals.diastolic
                ? `TD ${vitals.systolic}/${vitals.diastolic}`
                : null,
              vitals.pulse ? `Nadi ${vitals.pulse}` : null,
              vitals.spo2 ? `SpO₂ ${vitals.spo2}%` : null,
              vitals.bmi ? `BMI ${vitals.bmi}` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Tiada direkod"}
          </p>
        ) : null}

        {medications.length > 0 ? (
          <>
            <p>
              <strong>Ubat yang diberi:</strong>
            </p>
            <ul className="doc-list">
              {medications.map((m, i) => (
                <li key={`${m.drug.name}-${i}`}>
                  {m.drug.name} — {m.dose}, {m.frequency}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {referral.clinicalSummary ? (
          <p>
            <strong>Ringkasan klinikal:</strong> {referral.clinicalSummary}
          </p>
        ) : null}

        <p>Terima kasih atas pengurusan lanjut pesakit ini.</p>
      </div>

      <SignatureBlock
        doctorName={referral.issuedBy.name}
        mmcNumber={referral.issuedBy.mmcNumber}
        issuedAt={referral.issuedAt}
      />
    </article>
  );
}
