import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Letterhead, SignatureBlock } from "@/components/letterhead";
import { requireArea } from "@/lib/auth";
import { formatDateOnly } from "@/lib/dates";
import { formatIc } from "@/lib/mykad";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Sijil Cuti Sakit" };
export const dynamic = "force-dynamic";

export default async function McPrintPage({ params }: PageProps<"/print/mc/[id]">) {
  await requireArea("konsultasi");
  const { id } = await params;

  const [clinic, mc] = await Promise.all([
    prisma.clinic.findFirst(),
    prisma.medicalCertificate.findUnique({
      where: { id },
      select: {
        serialNo: true,
        fromDate: true,
        toDate: true,
        days: true,
        reason: true,
        status: true,
        voidReason: true,
        issuedAt: true,
        doctor: { select: { name: true, mmcNumber: true } },
        visit: {
          select: {
            arrivedAt: true,
            patient: { select: { name: true, idType: true, idNumber: true, mrn: true } },
          },
        },
      },
    }),
  ]);

  if (!mc) notFound();

  const patient = mc.visit.patient;
  const idLabel =
    patient.idType === "MYKAD" || patient.idType === "MYKID"
      ? formatIc(patient.idNumber)
      : patient.idNumber;

  return (
    <article className="doc">
      <Letterhead clinic={clinic} />

      {/* Sijil yang dibatalkan masih boleh dicetak untuk rekod, tetapi mesti
          jelas tidak sah pada pandangan pertama. */}
      {mc.status === "VOID" ? (
        <p className="doc-void">
          SIJIL INI TELAH DIBATALKAN
          {mc.voidReason ? ` — ${mc.voidReason}` : ""}
        </p>
      ) : null}

      <h2 className="doc-title">Sijil Cuti Sakit</h2>
      <p className="doc-serial">
        No. Siri: <strong>{mc.serialNo}</strong>
      </p>

      <div className="doc-body">
        <p>
          Adalah dengan ini disahkan bahawa <strong>{patient.name}</strong>, No. Kad Pengenalan{" "}
          <strong>{idLabel}</strong> (No. Rekod {patient.mrn}), telah diperiksa oleh saya pada{" "}
          <strong>{formatDateOnly(mc.visit.arrivedAt)}</strong>.
        </p>

        <p>
          Beliau didapati <strong>tidak sihat untuk menjalankan tugas</strong> selama{" "}
          <strong>{mc.days} hari</strong>, iaitu dari{" "}
          <strong>{formatDateOnly(mc.fromDate)}</strong> hingga{" "}
          <strong>{formatDateOnly(mc.toDate)}</strong> (kedua-dua tarikh termasuk).
        </p>

        {mc.reason ? <p>Sebab: {mc.reason}</p> : null}
      </div>

      <SignatureBlock
        doctorName={mc.doctor.name}
        mmcNumber={mc.doctor.mmcNumber}
        issuedAt={mc.issuedAt}
      />
    </article>
  );
}
