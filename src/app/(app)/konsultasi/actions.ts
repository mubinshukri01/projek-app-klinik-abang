"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { requireArea, type SessionUser } from "@/lib/auth";
import { fromDateInput } from "@/lib/dates";
import { parseLabTests, validateMcRange } from "@/lib/documents";
import { createDraftInvoice } from "@/lib/invoice";
import { calculateBmi, calculateQuantity } from "@/lib/prescription";
import { prisma } from "@/lib/prisma";
import { nextMcSerial } from "@/lib/sequence";

export interface FormState {
  error: string | null;
  ok?: boolean;
}

const OK: FormState = { error: null, ok: true };

/**
 * Rekod klinikal mesti ditandatangani oleh doktor berdaftar.
 *
 * Jururawat boleh membuka skrin konsultasi dan merekod tanda vital, tetapi
 * nota, diagnosis dan preskripsi memerlukan peranan DOCTOR. Ini dikuatkuasakan
 * pada tindakan, bukan hanya pada laluan.
 */
async function requireDoctor(): Promise<SessionUser> {
  const user = await requireArea("konsultasi");
  if (user.role !== "DOCTOR") {
    throw new Error("Hanya doktor boleh menandatangani rekod klinikal.");
  }
  return user;
}

function numberOrNull(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Membuka lawatan untuk konsultasi dan menetapkan doktor yang bertanggungjawab. */
export async function startConsultation(formData: FormData): Promise<void> {
  const user = await requireDoctor();

  const visitId = String(formData.get("visitId") ?? "");
  if (!visitId) throw new Error("Lawatan tidak dinyatakan.");

  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    select: { id: true, status: true, doctorId: true },
  });
  if (!visit) throw new Error("Lawatan tidak dijumpai.");
  if (visit.status === "COMPLETED" || visit.status === "CANCELLED") {
    throw new Error("Lawatan ini sudah ditutup.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.visit.update({
      where: { id: visitId },
      data: { status: "IN_CONSULT", doctorId: visit.doctorId ?? user.id },
    });
    // Rekod konsultasi dicipta di sini supaya nota, diagnosis dan preskripsi
    // mempunyai induk untuk dilampirkan.
    await tx.consultation.upsert({
      where: { visitId },
      create: { visitId, doctorId: user.id },
      update: {},
    });
    await tx.prescription.upsert({
      where: { visitId },
      create: { visitId },
      update: {},
    });
  });

  await logAudit({
    actorId: user.id,
    action: "UPDATE",
    entity: "Visit",
    entityId: visitId,
    before: { status: visit.status },
    after: { status: "IN_CONSULT" },
  });

  revalidatePath("/queue");
  redirect(`/konsultasi/${visitId}`);
}

const vitalsSchema = z.object({ visitId: z.string().min(1) });

export async function saveVitals(_prev: FormState, formData: FormData): Promise<FormState> {
  // Jururawat dibenarkan di sini — merekod tanda vital bukan menandatangani
  // rekod klinikal.
  const user = await requireArea("konsultasi");

  const parsed = vitalsSchema.safeParse({ visitId: formData.get("visitId") });
  if (!parsed.success) return { error: "Lawatan tidak dinyatakan." };
  const { visitId } = parsed.data;

  const weightKg = numberOrNull(formData.get("weightKg"));
  const heightCm = numberOrNull(formData.get("heightCm"));

  const data = {
    temperature: numberOrNull(formData.get("temperature")),
    systolic: numberOrNull(formData.get("systolic")),
    diastolic: numberOrNull(formData.get("diastolic")),
    pulse: numberOrNull(formData.get("pulse")),
    respiratoryRate: numberOrNull(formData.get("respiratoryRate")),
    spo2: numberOrNull(formData.get("spo2")),
    weightKg,
    heightCm,
    // Dikira semasa simpan supaya laporan tidak perlu mengiranya semula,
    // dan supaya nilai yang direkod tidak berubah bila formula berubah.
    bmi: calculateBmi(weightKg, heightCm),
    bloodGlucose: numberOrNull(formData.get("bloodGlucose")),
    recordedById: user.id,
    recordedAt: new Date(),
  };

  await prisma.vitals.upsert({ where: { visitId }, create: { visitId, ...data }, update: data });
  await logAudit({
    actorId: user.id,
    action: "UPDATE",
    entity: "Vitals",
    entityId: visitId,
    after: data,
  });

  revalidatePath(`/konsultasi/${visitId}`);
  return OK;
}

export async function saveConsultation(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireDoctor();

  const visitId = String(formData.get("visitId") ?? "");
  if (!visitId) return { error: "Lawatan tidak dinyatakan." };

  const text = (key: string) => {
    const value = formData.get(key);
    const trimmed = typeof value === "string" ? value.trim() : "";
    return trimmed.length > 0 ? trimmed : null;
  };

  const followUpRaw = String(formData.get("followUpDate") ?? "");
  const data = {
    presentingComplaint: text("presentingComplaint"),
    history: text("history"),
    examination: text("examination"),
    notes: text("notes"),
    disposition: text("disposition"),
    followUpDate: followUpRaw ? fromDateInput(followUpRaw) : null,
  };

  await prisma.consultation.upsert({
    where: { visitId },
    create: { visitId, doctorId: user.id, ...data },
    update: data,
  });

  await logAudit({
    actorId: user.id,
    action: "UPDATE",
    entity: "Consultation",
    entityId: visitId,
    after: data,
  });

  revalidatePath(`/konsultasi/${visitId}`);
  return OK;
}

export async function addDiagnosis(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireDoctor();

  const visitId = String(formData.get("visitId") ?? "");
  const code = String(formData.get("icd10Code") ?? "").trim();
  if (!visitId || !code) return { error: "Pilih diagnosis daripada senarai." };

  const [consultation, icd] = await Promise.all([
    prisma.consultation.findUnique({
      where: { visitId },
      select: { id: true, diagnoses: { select: { id: true, icd10Code: true } } },
    }),
    prisma.icd10Code.findUnique({ where: { code } }),
  ]);

  if (!consultation) return { error: "Konsultasi belum dimulakan." };
  if (!icd) return { error: "Kod ICD-10 tidak dikenali." };
  if (consultation.diagnoses.some((d) => d.icd10Code === code)) {
    return { error: "Diagnosis ini sudah ditambah." };
  }

  await prisma.diagnosis.create({
    data: {
      consultationId: consultation.id,
      icd10Code: icd.code,
      description: icd.description,
      // Diagnosis pertama menjadi diagnosis utama; doktor boleh menukarnya.
      isPrimary: consultation.diagnoses.length === 0,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "CREATE",
    entity: "Diagnosis",
    entityId: consultation.id,
    after: { code: icd.code, description: icd.description },
  });

  revalidatePath(`/konsultasi/${visitId}`);
  return OK;
}

export async function removeDiagnosis(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireDoctor();

  const visitId = String(formData.get("visitId") ?? "");
  const diagnosisId = String(formData.get("diagnosisId") ?? "");
  if (!diagnosisId) return { error: "Diagnosis tidak dinyatakan." };

  const diagnosis = await prisma.diagnosis.findUnique({
    where: { id: diagnosisId },
    select: { id: true, consultationId: true, icd10Code: true, isPrimary: true },
  });
  if (!diagnosis) return { error: "Diagnosis tidak dijumpai." };

  await prisma.$transaction(async (tx) => {
    await tx.diagnosis.delete({ where: { id: diagnosisId } });
    // Setiap konsultasi mesti sentiasa mempunyai satu diagnosis utama.
    if (diagnosis.isPrimary) {
      const next = await tx.diagnosis.findFirst({
        where: { consultationId: diagnosis.consultationId },
        orderBy: { id: "asc" },
        select: { id: true },
      });
      if (next) await tx.diagnosis.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
  });

  await logAudit({
    actorId: user.id,
    action: "DELETE",
    entity: "Diagnosis",
    entityId: diagnosisId,
    before: { code: diagnosis.icd10Code },
  });

  revalidatePath(`/konsultasi/${visitId}`);
  return OK;
}

// ─────────────────────────── preskripsi ───────────────────────────

export async function addPrescriptionItem(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireDoctor();

  const visitId = String(formData.get("visitId") ?? "");
  const drugId = String(formData.get("drugId") ?? "");
  if (!visitId || !drugId) return { error: "Pilih ubat daripada senarai." };

  const drug = await prisma.drug.findUnique({
    where: { id: drugId },
    select: {
      id: true,
      name: true,
      form: true,
      unit: true,
      active: true,
      sellPrice: true,
      defaultDose: true,
      defaultFrequency: true,
      defaultDuration: true,
      instructionsMs: true,
    },
  });
  if (!drug) return { error: "Ubat tidak dijumpai." };
  if (!drug.active) return { error: `${drug.name} tidak lagi aktif dalam formulari.` };

  const prescription = await prisma.prescription.upsert({
    where: { visitId },
    create: { visitId },
    update: {},
    select: { id: true },
  });

  const dose = str(formData.get("dose")) ?? drug.defaultDose ?? "1";
  const frequency = str(formData.get("frequency")) ?? drug.defaultFrequency ?? "3 kali sehari";
  const durationDays = numberOrNull(formData.get("durationDays")) ?? drug.defaultDuration ?? 3;

  // Kuantiti yang dimasukkan doktor sentiasa mengatasi kiraan automatik.
  const entered = numberOrNull(formData.get("quantity"));
  const quantity = entered ?? calculateQuantity({ form: drug.form, dose, frequency, durationDays });

  if (quantity === null) {
    return {
      error: `Kuantiti untuk ${drug.name} tidak boleh dikira automatik daripada dos ini. Sila masukkan kuantiti.`,
    };
  }
  if (quantity <= 0) return { error: "Kuantiti mesti lebih daripada sifar." };

  await prisma.prescriptionItem.create({
    data: {
      prescriptionId: prescription.id,
      drugId: drug.id,
      dose,
      frequency,
      durationDays,
      quantity,
      instructions: str(formData.get("instructions")) ?? drug.instructionsMs ?? "",
      // Harga dikunci pada masa preskripsi supaya perubahan harga formulari
      // kemudian tidak mengubah invois yang lalu.
      unitPrice: drug.sellPrice,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "CREATE",
    entity: "PrescriptionItem",
    entityId: prescription.id,
    after: { drug: drug.name, dose, frequency, durationDays, quantity },
  });

  revalidatePath(`/konsultasi/${visitId}`);
  return OK;
}

export async function removePrescriptionItem(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireDoctor();

  const visitId = String(formData.get("visitId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) return { error: "Item tidak dinyatakan." };

  const item = await prisma.prescriptionItem.findUnique({
    where: { id: itemId },
    select: { id: true, dispensedAt: true, drug: { select: { name: true } } },
  });
  if (!item) return { error: "Item tidak dijumpai." };
  // Membuang item selepas didispense akan menyebabkan lejar stok tidak lagi
  // menerangkan baki sebenar.
  if (item.dispensedAt) {
    return { error: `${item.drug.name} sudah didispense dan tidak boleh dibuang.` };
  }

  await prisma.prescriptionItem.delete({ where: { id: itemId } });
  await logAudit({
    actorId: user.id,
    action: "DELETE",
    entity: "PrescriptionItem",
    entityId: itemId,
    before: { drug: item.drug.name },
  });

  revalidatePath(`/konsultasi/${visitId}`);
  return OK;
}

// ─────────────────────────── alahan ───────────────────────────

export async function addAllergy(_prev: FormState, formData: FormData): Promise<FormState> {
  // Jururawat boleh merekod alahan yang dilaporkan pesakit — menyekat ini
  // kepada doktor sahaja berisiko alahan tidak direkod langsung.
  const user = await requireArea("konsultasi");

  const visitId = String(formData.get("visitId") ?? "");
  const patientId = String(formData.get("patientId") ?? "");
  const allergen = str(formData.get("allergen"));
  if (!patientId || !allergen) return { error: "Nyatakan bahan yang menyebabkan alahan." };

  const severity = String(formData.get("severity") ?? "SEDERHANA");
  if (!["RINGAN", "SEDERHANA", "TERUK"].includes(severity)) {
    return { error: "Tahap keterukan tidak sah." };
  }

  const existing = await prisma.patientAllergy.findFirst({
    where: { patientId, allergen: { equals: allergen, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return { error: `Alahan terhadap ${allergen} sudah direkod.` };

  const created = await prisma.patientAllergy.create({
    data: {
      patientId,
      allergen,
      reaction: str(formData.get("reaction")),
      severity: severity as "RINGAN" | "SEDERHANA" | "TERUK",
    },
    select: { id: true },
  });

  await logAudit({
    actorId: user.id,
    action: "CREATE",
    entity: "PatientAllergy",
    entityId: created.id,
    after: { patientId, allergen, severity },
  });

  revalidatePath(`/konsultasi/${visitId}`);
  return OK;
}

// ─────────────────────────── tutup konsultasi ───────────────────────────

export async function completeConsultation(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireDoctor();

  const visitId = String(formData.get("visitId") ?? "");
  if (!visitId) return { error: "Lawatan tidak dinyatakan." };

  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    select: {
      id: true,
      status: true,
      consultation: { select: { id: true, diagnoses: { select: { id: true } } } },
      prescription: { select: { items: { select: { id: true } } } },
    },
  });
  if (!visit) return { error: "Lawatan tidak dijumpai." };
  if (visit.status === "COMPLETED" || visit.status === "CANCELLED") {
    return { error: "Lawatan ini sudah ditutup." };
  }

  // Diagnosis diperlukan supaya laporan, tuntutan panel dan sejarah pesakit
  // bermakna. Gunakan Z00.0 (pemeriksaan kesihatan am) untuk lawatan tanpa
  // penyakit tertentu.
  if (!visit.consultation || visit.consultation.diagnoses.length === 0) {
    return { error: "Rekod sekurang-kurangnya satu diagnosis sebelum menutup konsultasi." };
  }

  const hasDrugs = (visit.prescription?.items.length ?? 0) > 0;
  // Pesakit dengan ubat pergi ke dispensari dahulu; yang lain terus ke kaunter.
  const nextStatus = hasDrugs ? "DISPENSING" : "PAYMENT";

  await prisma.$transaction(async (tx) => {
    await tx.consultation.update({
      where: { id: visit.consultation!.id },
      data: { endedAt: new Date() },
    });
    await tx.visit.update({ where: { id: visitId }, data: { status: nextStatus } });
    // Pesakit tanpa ubat terus ke kaunter, jadi bil mereka disediakan di sini.
    if (nextStatus === "PAYMENT") {
      await createDraftInvoice(tx, visitId);
    }
  });

  await logAudit({
    actorId: user.id,
    action: "UPDATE",
    entity: "Visit",
    entityId: visitId,
    before: { status: visit.status },
    after: { status: nextStatus },
  });

  revalidatePath("/queue");
  revalidatePath("/dispensari");
  redirect("/konsultasi");
}

function str(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// ─────────────────────────── dokumen ───────────────────────────

/**
 * Mengeluarkan sijil cuti sakit.
 *
 * Nombor siri diambil daripada penjujukan atomik dan tidak pernah diguna
 * semula. MC ialah dokumen yang diserahkan kepada majikan, jadi nombor yang
 * bertindih akan menjejaskan kepercayaan terhadap kesemuanya.
 */
export async function issueMc(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireDoctor();

  const visitId = String(formData.get("visitId") ?? "");
  if (!visitId) return { error: "Lawatan tidak dinyatakan." };

  const from = fromDateInput(String(formData.get("fromDate") ?? ""));
  const to = fromDateInput(String(formData.get("toDate") ?? ""));
  const check = validateMcRange(from, to);
  if (!check.ok) return { error: check.error ?? "Julat tarikh tidak sah." };

  // Doktor yang menandatangani MC mesti mempunyai nombor pendaftaran MMC —
  // majikan dan syarikat insurans menyemaknya.
  if (!user.mmcNumber) {
    return {
      error:
        "Nombor pendaftaran MMC anda belum ditetapkan. Minta pentadbir mengemas kini profil anda sebelum mengeluarkan MC.",
    };
  }

  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    select: { id: true, patient: { select: { mrn: true } } },
  });
  if (!visit) return { error: "Lawatan tidak dijumpai." };

  const mc = await prisma.$transaction(async (tx) => {
    const serialNo = await nextMcSerial(new Date(), tx);
    return tx.medicalCertificate.create({
      data: {
        serialNo,
        visitId,
        doctorId: user.id,
        fromDate: from!,
        toDate: to!,
        days: check.days,
        reason: str(formData.get("reason")),
      },
      select: { id: true, serialNo: true },
    });
  });

  await logAudit({
    actorId: user.id,
    action: "CREATE",
    entity: "MedicalCertificate",
    entityId: mc.id,
    after: { serialNo: mc.serialNo, patient: visit.patient.mrn, days: check.days },
  });

  revalidatePath(`/konsultasi/${visitId}`);
  return { error: null, ok: true };
}

/**
 * Membatalkan MC.
 *
 * Sijil tidak pernah dipadam — nombor sirinya sudah pun berada di tangan
 * pesakit dan mungkin majikan. Membatalkan menyimpan rekod bahawa ia tidak
 * lagi sah, berserta sebabnya.
 */
export async function voidMc(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireDoctor();

  const visitId = String(formData.get("visitId") ?? "");
  const mcId = String(formData.get("mcId") ?? "");
  const reason = String(formData.get("voidReason") ?? "").trim();
  if (!mcId) return { error: "Sijil tidak dinyatakan." };
  if (reason.length < 3) return { error: "Nyatakan sebab pembatalan." };

  const mc = await prisma.medicalCertificate.findUnique({
    where: { id: mcId },
    select: { id: true, serialNo: true, status: true },
  });
  if (!mc) return { error: "Sijil tidak dijumpai." };
  if (mc.status === "VOID") return { error: "Sijil ini sudah dibatalkan." };

  await prisma.medicalCertificate.update({
    where: { id: mcId },
    data: {
      status: "VOID",
      voidReason: reason,
      voidedById: user.id,
      voidedAt: new Date(),
    },
  });

  await logAudit({
    actorId: user.id,
    action: "VOID",
    entity: "MedicalCertificate",
    entityId: mcId,
    before: { serialNo: mc.serialNo, status: "ACTIVE" },
    after: { status: "VOID", reason },
  });

  revalidatePath(`/konsultasi/${visitId}`);
  return { error: null, ok: true };
}

export async function issueReferral(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireDoctor();

  const visitId = String(formData.get("visitId") ?? "");
  const toFacility = str(formData.get("toFacility"));
  const reason = str(formData.get("reason"));
  if (!visitId) return { error: "Lawatan tidak dinyatakan." };
  if (!toFacility) return { error: "Nyatakan hospital atau klinik yang dirujuk." };
  if (!reason) return { error: "Nyatakan sebab rujukan." };

  const referral = await prisma.referralLetter.create({
    data: {
      visitId,
      toFacility,
      toDoctor: str(formData.get("toDoctor")),
      specialty: str(formData.get("specialty")),
      reason,
      clinicalSummary: str(formData.get("clinicalSummary")),
      issuedById: user.id,
    },
    select: { id: true },
  });

  await logAudit({
    actorId: user.id,
    action: "CREATE",
    entity: "ReferralLetter",
    entityId: referral.id,
    after: { toFacility, reason },
  });

  revalidatePath(`/konsultasi/${visitId}`);
  return { error: null, ok: true };
}

export async function orderLab(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireDoctor();

  const visitId = String(formData.get("visitId") ?? "");
  const provider = String(formData.get("provider") ?? "PATHLAB");
  const tests = parseLabTests(String(formData.get("tests") ?? ""));

  if (!visitId) return { error: "Lawatan tidak dinyatakan." };
  if (!["PATHLAB", "BP_HEALTHCARE", "GRIBBLES", "LAIN"].includes(provider)) {
    return { error: "Pembekal makmal tidak sah." };
  }
  if (tests.length === 0) return { error: "Senaraikan sekurang-kurangnya satu ujian." };

  const order = await prisma.labOrder.create({
    data: {
      visitId,
      provider: provider as "PATHLAB" | "BP_HEALTHCARE" | "GRIBBLES" | "LAIN",
      tests,
      clinicalNote: str(formData.get("clinicalNote")),
      orderedById: user.id,
    },
    select: { id: true },
  });

  await logAudit({
    actorId: user.id,
    action: "CREATE",
    entity: "LabOrder",
    entityId: order.id,
    after: { provider, tests },
  });

  revalidatePath(`/konsultasi/${visitId}`);
  return { error: null, ok: true };
}
