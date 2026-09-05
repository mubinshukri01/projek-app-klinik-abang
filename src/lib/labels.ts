import "server-only";
import { prisma } from "@/lib/prisma";
import type { DrugLabelData } from "@/components/drug-label";

/**
 * Mengumpul data label untuk item preskripsi yang telah didispense.
 *
 * Mengembalikan null bila item tidak wujud atau belum didispense — label
 * hanya bermakna selepas batch sebenar dipilih.
 */
export async function labelForItem(itemId: string): Promise<DrugLabelData | null> {
  const [clinic, item] = await Promise.all([
    prisma.clinic.findFirst(),
    prisma.prescriptionItem.findUnique({
      where: { id: itemId },
      select: {
        quantity: true,
        instructions: true,
        dispensedAt: true,
        drug: { select: { name: true, unit: true } },
        dispensedBatch: { select: { batchNo: true, expiryDate: true } },
        prescription: {
          select: {
            visit: {
              select: {
                patient: { select: { name: true, mrn: true } },
                doctor: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  if (!item || !item.dispensedAt) return null;

  const visit = item.prescription.visit;
  return {
    clinicName: clinic?.name ?? "Klinik",
    clinicAddress: clinic ? `${clinic.addressLine1}, ${clinic.postcode} ${clinic.city}` : "",
    clinicPhone: clinic?.phone ?? "",
    patientName: visit.patient.name,
    patientMrn: visit.patient.mrn,
    drugName: item.drug.name,
    quantity: item.quantity,
    unit: item.drug.unit,
    instructions: item.instructions,
    batchNo: item.dispensedBatch?.batchNo ?? null,
    expiryDate: item.dispensedBatch?.expiryDate ?? null,
    doctorName: visit.doctor?.name ?? null,
    dispensedAt: item.dispensedAt,
  };
}

/** Label untuk semua item yang telah didispense dalam satu lawatan. */
export async function labelsForVisit(visitId: string): Promise<DrugLabelData[]> {
  const prescription = await prisma.prescription.findUnique({
    where: { visitId },
    select: {
      items: {
        where: { dispensedAt: { not: null } },
        orderBy: { id: "asc" },
        select: { id: true },
      },
    },
  });
  if (!prescription) return [];

  const labels = await Promise.all(prescription.items.map((i) => labelForItem(i.id)));
  return labels.filter((l): l is DrugLabelData => l !== null);
}
