import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { requireArea } from "@/lib/auth";
import { formatDateOnly } from "@/lib/dates";
import { allocateFefo, isExpired, type BatchLot } from "@/lib/fefo";
import { formatAge } from "@/lib/mykad";
import { prisma } from "@/lib/prisma";
import { VISIT_STATUS_LABEL, VISIT_STATUS_TONE } from "@/lib/visit-status";
import { CompleteDispensingForm } from "./complete-form";
import { DispenseItem, type ItemView } from "./dispense-item";

export const metadata: Metadata = { title: "Sediakan Ubat" };
export const dynamic = "force-dynamic";

export default async function DispenseVisitPage({ params }: PageProps<"/dispensari/[visitId]">) {
  await requireArea("dispensari");
  const { visitId } = await params;

  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    select: {
      id: true,
      queueNumber: true,
      status: true,
      patient: {
        select: {
          name: true,
          mrn: true,
          dob: true,
          allergies: { select: { id: true, allergen: true, reaction: true, severity: true } },
        },
      },
      doctor: { select: { name: true } },
      prescription: {
        select: {
          items: {
            orderBy: { id: "asc" },
            select: {
              id: true,
              dose: true,
              frequency: true,
              durationDays: true,
              quantity: true,
              instructions: true,
              dispensedAt: true,
              overrideReason: true,
              dispensedBatch: { select: { batchNo: true } },
              drug: { select: { id: true, name: true, unit: true, isControlled: true } },
            },
          },
        },
      },
    },
  });

  if (!visit) notFound();

  const items = visit.prescription?.items ?? [];
  const drugIds = [...new Set(items.map((i) => i.drug.id))];

  const batches = await prisma.drugBatch.findMany({
    where: { drugId: { in: drugIds } },
    select: { id: true, drugId: true, batchNo: true, expiryDate: true, quantityOnHand: true },
    orderBy: { expiryDate: "asc" },
  });

  const byDrug = new Map<string, typeof batches>();
  for (const batch of batches) {
    const list = byDrug.get(batch.drugId) ?? [];
    list.push(batch);
    byDrug.set(batch.drugId, list);
  }

  const views: ItemView[] = items.map((item) => {
    const drugBatches = byDrug.get(item.drug.id) ?? [];
    const lots: BatchLot[] = drugBatches.map((b) => ({
      id: b.id,
      batchNo: b.batchNo,
      expiryDate: b.expiryDate,
      quantityOnHand: b.quantityOnHand,
    }));
    // Cadangan dikira di pelayan supaya kedua-dua skrin dan tindakan
    // mendispense menggunakan peraturan FEFO yang sama.
    const plan = allocateFefo(lots, item.quantity);

    return {
      id: item.id,
      drugName: item.drug.name,
      unit: item.drug.unit,
      dose: item.dose,
      frequency: item.frequency,
      durationDays: item.durationDays,
      quantity: item.quantity,
      instructions: item.instructions,
      isControlled: item.drug.isControlled,
      dispensed: item.dispensedAt !== null,
      dispensedBatchNo: item.dispensedBatch?.batchNo ?? null,
      overrideReason: item.overrideReason,
      suggestion: plan.allocations.map((a) => ({
        batchNo: a.batchNo,
        expiryLabel: formatDateOnly(a.expiryDate),
        quantity: a.quantity,
      })),
      shortfall: plan.shortfall,
      batches: drugBatches.map((b) => ({
        id: b.id,
        batchNo: b.batchNo,
        expiryLabel: formatDateOnly(b.expiryDate),
        onHand: b.quantityOnHand,
        expired: isExpired(b.expiryDate),
      })),
    };
  });

  const pending = views.filter((v) => !v.dispensed).length;
  const closed = visit.status !== "DISPENSING";

  return (
    <div className="space-y-6">
      <PageHeader
        title={visit.patient.name}
        description={`Giliran ${visit.queueNumber} · ${visit.patient.mrn} · ${formatAge(visit.patient.dob)}${
          visit.doctor ? ` · ${visit.doctor.name}` : ""
        }`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={VISIT_STATUS_TONE[visit.status]}>{VISIT_STATUS_LABEL[visit.status]}</Badge>
            <ButtonLink href="/dispensari" variant="secondary">
              Senarai
            </ButtonLink>
          </div>
        }
      />

      {/* Farmasi mesti nampak alahan sebelum menyerahkan sebarang ubat —
          ini pemeriksaan terakhir sebelum ubat sampai ke tangan pesakit. */}
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
      ) : null}

      {closed ? (
        <Alert tone="info">
          Lawatan ini tiada dalam baris dispensari. Rekod dipaparkan untuk rujukan sahaja.
        </Alert>
      ) : null}

      <Card>
        <CardHeader
          title="Ubat"
          description="Batch dicadangkan mengikut FEFO — yang luput paling awal dikeluarkan dahulu."
          action={
            <ButtonLink href={`/print/label/lawatan/${visit.id}`} target="_blank" variant="secondary" size="sm">
              Cetak semua label
            </ButtonLink>
          }
        />
        <CardBody className="space-y-3">
          {views.length === 0 ? (
            <p className="text-sm text-ink-faint">Tiada ubat dalam preskripsi ini.</p>
          ) : (
            views.map((item) => <DispenseItem key={item.id} visitId={visit.id} item={item} />)
          )}
        </CardBody>
      </Card>

      {!closed && views.length > 0 ? (
        <Card>
          <CardHeader
            title="Selesai"
            description={
              pending > 0
                ? `${pending} ubat masih belum disediakan.`
                : "Semua ubat sudah disediakan."
            }
          />
          <CardBody>
            <CompleteDispensingForm visitId={visit.id} />
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
