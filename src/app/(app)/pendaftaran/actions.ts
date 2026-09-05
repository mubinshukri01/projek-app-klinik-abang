"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { requireArea } from "@/lib/auth";
import { fromDateInput, toDateOnly } from "@/lib/dates";
import { normalizeIc, parseMyKad } from "@/lib/mykad";
import { prisma } from "@/lib/prisma";
import { nextQueueNumber, patientMrn } from "@/lib/sequence";

export interface FormState {
  error: string | null;
  fieldErrors?: Record<string, string>;
}

const CONSENT_VERSION = "1.0";

/**
 * Medan teks pilihan.
 *
 * Mesti menerima undefined, bukan hanya rentetan kosong: medan yang
 * dipaparkan secara bersyarat (seperti butiran panel) langsung tidak wujud
 * dalam FormData apabila ia tidak dipaparkan.
 */
const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const patientSchema = z.object({
  idType: z.enum(["MYKAD", "MYKID", "PASSPORT", "POLIS_TENTERA", "LAIN"]),
  idNumber: z.string().trim().min(3, "Masukkan nombor pengenalan."),
  name: z.string().trim().min(2, "Masukkan nama penuh."),
  gender: z.enum(["LELAKI", "PEREMPUAN"]),
  dob: z.string().trim(),
  nationality: z.string().trim().min(1).default("Malaysia"),
  race: optionalText,
  phone: optionalText,
  email: optionalText,
  addressLine1: optionalText,
  addressLine2: optionalText,
  postcode: optionalText,
  city: optionalText,
  state: optionalText,
  occupation: optionalText,
  emergencyName: optionalText,
  emergencyPhone: optionalText,
  emergencyRelation: optionalText,
  consent: z.literal("on", {
    message: "Persetujuan pesakit diperlukan sebelum rekod boleh disimpan.",
  }),
});

function readForm(formData: FormData) {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    raw[key] = typeof value === "string" ? value : undefined;
  }
  return raw;
}

function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function createPatient(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireArea("pendaftaran");

  const parsed = patientSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return {
      error: "Sila betulkan medan yang bertanda.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }
  const input = parsed.data;

  // Nombor MyKad disimpan sebagai 12 digit tanpa sempang supaya carian tidak
  // bergantung pada cara kakitangan menaipnya.
  const isMyKad = input.idType === "MYKAD" || input.idType === "MYKID";
  const idNumber = isMyKad ? normalizeIc(input.idNumber) : input.idNumber.toUpperCase();

  let birthState: string | null = null;
  if (isMyKad) {
    const ic = parseMyKad(idNumber);
    if (!ic.valid) {
      return { error: ic.error, fieldErrors: { idNumber: ic.error ?? "Nombor tidak sah." } };
    }
    birthState = ic.birthState;
  }

  const existing = await prisma.patient.findUnique({
    where: { idNumber },
    select: { id: true, name: true },
  });
  if (existing) {
    return {
      error: `Pesakit dengan nombor pengenalan ini sudah berdaftar: ${existing.name}.`,
      fieldErrors: { idNumber: "Sudah wujud dalam sistem." },
    };
  }

  const dob = input.dob ? fromDateInput(input.dob) : null;

  const patient = await prisma.$transaction(async (tx) => {
    const mrn = await patientMrn(tx);
    return tx.patient.create({
      data: {
        mrn,
        idType: input.idType,
        idNumber,
        name: input.name,
        gender: input.gender,
        dob,
        birthState,
        nationality: input.nationality,
        race: input.race,
        phone: input.phone,
        email: input.email,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2,
        postcode: input.postcode,
        city: input.city,
        state: input.state,
        occupation: input.occupation,
        emergencyName: input.emergencyName,
        emergencyPhone: input.emergencyPhone,
        emergencyRelation: input.emergencyRelation,
        // PDPA 2010: data kesihatan adalah data sensitif dan memerlukan
        // persetujuan yang direkodkan.
        consentGivenAt: new Date(),
        consentVersion: CONSENT_VERSION,
      },
      select: { id: true, mrn: true, name: true },
    });
  });

  await logAudit({
    actorId: user.id,
    action: "CREATE",
    entity: "Patient",
    entityId: patient.id,
    after: { mrn: patient.mrn, name: patient.name, idNumber },
  });

  revalidatePath("/pendaftaran");
  redirect(`/pendaftaran/pesakit/${patient.id}`);
}

const visitSchema = z.object({
  patientId: z.string().min(1),
  payerType: z.enum(["SELF", "PANEL", "MADANI", "PEKA_B40"]),
  panelId: optionalText,
  employeeId: optionalText,
  glNumber: optionalText,
});

export async function startVisit(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireArea("pendaftaran");

  const parsed = visitSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return { error: "Maklumat lawatan tidak lengkap.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const input = parsed.data;

  if (input.payerType === "PANEL" && !input.panelId) {
    return {
      error: "Pilih panel untuk lawatan panel.",
      fieldErrors: { panelId: "Wajib dipilih." },
    };
  }
  // Panel hanya bermakna bila penanggung ialah panel; jangan simpan rujukan
  // menggantung bila kakitangan menukar jenis penanggung selepas memilih panel.
  const panelId = input.payerType === "PANEL" ? input.panelId : null;

  const patient = await prisma.patient.findUnique({
    where: { id: input.patientId },
    select: { id: true, name: true, mrn: true },
  });
  if (!patient) return { error: "Pesakit tidak dijumpai." };

  // Satu lawatan terbuka pada satu masa — dua nombor giliran untuk orang yang
  // sama akan memecahkan aliran dispensari dan bil.
  const open = await prisma.visit.findFirst({
    where: { patientId: patient.id, status: { notIn: ["COMPLETED", "CANCELLED"] } },
    select: { queueNumber: true },
  });
  if (open) {
    return { error: `Pesakit ini sudah ada lawatan terbuka (giliran ${open.queueNumber}).` };
  }

  const now = new Date();
  const visit = await prisma.$transaction(async (tx) => {
    const queueNumber = await nextQueueNumber(now, tx);
    return tx.visit.create({
      data: {
        patientId: patient.id,
        type: "WALKIN",
        // Pesakit yang mendaftar di kaunter sudah pun menunggu doktor.
        // REGISTERED disimpan untuk sokongan temu janji pada masa hadapan.
        status: "WAITING",
        queueNumber,
        queueDate: toDateOnly(now),
        payerType: input.payerType,
        panelId,
        employeeId: input.employeeId,
        glNumber: input.glNumber,
      },
      select: { id: true, queueNumber: true },
    });
  });

  await logAudit({
    actorId: user.id,
    action: "CREATE",
    entity: "Visit",
    entityId: visit.id,
    after: { patient: patient.mrn, queueNumber: visit.queueNumber, payerType: input.payerType },
  });

  revalidatePath("/queue");
  revalidatePath("/pendaftaran");
  redirect(`/queue?baru=${visit.queueNumber}`);
}

export async function cancelVisit(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireArea("pendaftaran");

  const visitId = String(formData.get("visitId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!visitId) return { error: "Lawatan tidak dinyatakan." };
  if (reason.length < 3) return { error: "Nyatakan sebab pembatalan." };

  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    select: { id: true, status: true, queueNumber: true },
  });
  if (!visit) return { error: "Lawatan tidak dijumpai." };
  if (visit.status === "COMPLETED") return { error: "Lawatan yang selesai tidak boleh dibatalkan." };
  if (visit.status === "CANCELLED") return { error: "Lawatan ini sudah dibatalkan." };

  await prisma.visit.update({
    where: { id: visitId },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason },
  });

  await logAudit({
    actorId: user.id,
    action: "UPDATE",
    entity: "Visit",
    entityId: visitId,
    before: { status: visit.status },
    after: { status: "CANCELLED", reason },
  });

  revalidatePath("/queue");
  return { error: null };
}
