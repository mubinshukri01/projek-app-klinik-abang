import { prisma } from "@/lib/prisma";
import { normalizeIc } from "@/lib/mykad";

export const PATIENT_CARD_SELECT = {
  id: true,
  mrn: true,
  name: true,
  idType: true,
  idNumber: true,
  dob: true,
  gender: true,
  phone: true,
} as const;

/**
 * Carian kaunter depan.
 *
 * Kakitangan menaip apa sahaja yang ada di depan mata — nombor IC dengan atau
 * tanpa sempang, nama separa, nombor telefon, atau nombor rekod. Satu medan
 * carian dengan padanan merentas semua ini jauh lebih pantas semasa waktu sibuk
 * berbanding memaksa mereka memilih jenis carian dahulu.
 */
export async function searchPatients(query: string, limit = 25) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const digits = normalizeIc(trimmed);

  return prisma.patient.findMany({
    where: {
      OR: [
        { name: { contains: trimmed, mode: "insensitive" } },
        { mrn: { contains: trimmed, mode: "insensitive" } },
        { phone: { contains: trimmed } },
        // Padanan IC hanya bila input mengandungi digit, supaya carian nama
        // tidak sepadan dengan nombor IC secara rawak.
        ...(digits.length >= 4 ? [{ idNumber: { contains: digits } }] : []),
      ],
    },
    select: PATIENT_CARD_SELECT,
    orderBy: { name: "asc" },
    take: limit,
  });
}

/** Rekod pesakit penuh untuk skrin pendaftaran dan konsultasi. */
export function getPatient(id: string) {
  return prisma.patient.findUnique({
    where: { id },
    include: {
      allergies: { orderBy: { notedAt: "desc" } },
      visits: {
        orderBy: { arrivedAt: "desc" },
        take: 10,
        select: {
          id: true,
          queueNumber: true,
          queueDate: true,
          status: true,
          payerType: true,
          arrivedAt: true,
          doctor: { select: { name: true } },
          consultation: {
            select: { diagnoses: { select: { description: true, isPrimary: true } } },
          },
        },
      },
    },
  });
}

/** Lawatan yang masih terbuka bagi pesakit, jika ada. */
export function activeVisitFor(patientId: string) {
  return prisma.visit.findFirst({
    where: {
      patientId,
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    },
    select: { id: true, queueNumber: true, status: true },
  });
}
