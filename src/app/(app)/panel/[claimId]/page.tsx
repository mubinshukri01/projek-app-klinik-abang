import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { EmptyRow, Table, TableWrap, Td, Th } from "@/components/ui/table";
import { requireArea } from "@/lib/auth";
import { formatDateOnly, formatDateTime } from "@/lib/dates";
import { formatRM } from "@/lib/money";
import { formatIc } from "@/lib/mykad";
import { prisma } from "@/lib/prisma";
import { ClaimPaymentForm, SubmitClaimForm } from "../claim-forms";

export const metadata: Metadata = { title: "Tuntutan Panel" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draf",
  SUBMITTED: "Dihantar",
  PARTIAL: "Bayaran sebahagian",
  PAID: "Dibayar",
  REJECTED: "Ditolak",
};

const STATUS_TONE: Record<string, "neutral" | "info" | "warn" | "ok" | "danger"> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  PARTIAL: "warn",
  PAID: "ok",
  REJECTED: "danger",
};

export default async function ClaimPage({ params }: PageProps<"/panel/[claimId]">) {
  await requireArea("panel");
  const { claimId } = await params;

  const claim = await prisma.panelClaim.findUnique({
    where: { id: claimId },
    select: {
      id: true,
      claimNo: true,
      periodStart: true,
      periodEnd: true,
      status: true,
      totalAmount: true,
      amountPaid: true,
      submittedAt: true,
      paidAt: true,
      remarks: true,
      createdAt: true,
      panel: { select: { name: true, clinicCode: true, notes: true } },
      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          amount: true,
          invoice: {
            select: {
              invoiceNo: true,
              issuedAt: true,
              visit: {
                select: {
                  employeeId: true,
                  glNumber: true,
                  patient: { select: { name: true, idType: true, idNumber: true } },
                  consultation: {
                    select: { diagnoses: { select: { icd10Code: true, description: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!claim) notFound();

  const due = Math.max(0, Number(claim.totalAmount) - Number(claim.amountPaid));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Tuntutan ${claim.claimNo}`}
        description={`${claim.panel.name} · ${formatDateOnly(claim.periodStart)} – ${formatDateOnly(
          claim.periodEnd,
        )} · ${claim.items.length} invois`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={STATUS_TONE[claim.status] ?? "neutral"}>
              {STATUS_LABEL[claim.status] ?? claim.status}
            </Badge>
            <ButtonLink href="/panel" variant="secondary">
              Senarai
            </ButtonLink>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-xs font-medium text-ink-soft uppercase">Jumlah tuntutan</p>
            <p className="tabular text-2xl font-semibold text-ink">{formatRM(claim.totalAmount)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium text-ink-soft uppercase">Telah dibayar</p>
            <p className="tabular text-2xl font-semibold text-ink">{formatRM(claim.amountPaid)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium text-ink-soft uppercase">Baki</p>
            <p className="tabular text-2xl font-semibold text-ink">{formatRM(due)}</p>
          </CardBody>
        </Card>
      </div>

      {claim.panel.notes ? <Alert tone="info">{claim.panel.notes}</Alert> : null}

      <Card>
        <CardHeader
          title="Invois dalam tuntutan"
          description="Muat turun CSV dan masukkan ke portal panel."
          action={
            <ButtonLink href={`/panel/${claim.id}/csv`} variant="secondary" size="sm">
              Muat turun CSV
            </ButtonLink>
          }
        />
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>No. invois</Th>
                <Th>Tarikh</Th>
                <Th>Pesakit</Th>
                <Th>No. pengenalan</Th>
                <Th>No. ahli</Th>
                <Th>Diagnosis</Th>
                <Th className="text-right">Amaun</Th>
              </tr>
            </thead>
            <tbody>
              {claim.items.length === 0 ? (
                <EmptyRow colSpan={7}>Tiada invois dalam tuntutan ini.</EmptyRow>
              ) : (
                claim.items.map((item) => {
                  const visit = item.invoice.visit;
                  const patient = visit.patient;
                  const diagnoses = visit.consultation?.diagnoses ?? [];
                  const idLabel =
                    patient.idType === "MYKAD" || patient.idType === "MYKID"
                      ? formatIc(patient.idNumber)
                      : patient.idNumber;
                  return (
                    <tr key={item.id}>
                      <Td className="tabular font-medium">{item.invoice.invoiceNo}</Td>
                      <Td className="tabular text-ink-soft">
                        {formatDateOnly(item.invoice.issuedAt)}
                      </Td>
                      <Td>{patient.name}</Td>
                      <Td className="tabular text-ink-soft">{idLabel}</Td>
                      <Td className="tabular text-ink-soft">{visit.employeeId ?? "-"}</Td>
                      <Td className="text-ink-soft">
                        {diagnoses.map((d) => d.description).join(", ") || "-"}
                      </Td>
                      <Td className="tabular text-right font-medium">{formatRM(item.amount)}</Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </TableWrap>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {claim.status === "DRAFT" ? (
          <Card>
            <CardHeader title="Hantar tuntutan" />
            <CardBody>
              <SubmitClaimForm claimId={claim.id} />
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardHeader title="Status penghantaran" />
            <CardBody className="space-y-1 text-sm">
              <p className="text-ink-soft">
                Dihantar: <span className="text-ink">{formatDateTime(claim.submittedAt)}</span>
              </p>
              {claim.paidAt ? (
                <p className="text-ink-soft">
                  Dibayar penuh: <span className="text-ink">{formatDateTime(claim.paidAt)}</span>
                </p>
              ) : null}
              {claim.remarks ? (
                <p className="text-ink-soft">
                  Catatan: <span className="text-ink">{claim.remarks}</span>
                </p>
              ) : null}
            </CardBody>
          </Card>
        )}

        {claim.status !== "DRAFT" && due > 0 ? (
          <Card>
            <CardHeader
              title="Rekod bayaran panel"
              description="Bayaran penuh akan menjelaskan semua invois dalam tuntutan ini."
            />
            <CardBody>
              <ClaimPaymentForm claimId={claim.id} due={due} />
            </CardBody>
          </Card>
        ) : null}

        {claim.status === "PAID" ? (
          <Card>
            <CardBody>
              <Alert tone="ok">
                Tuntutan ini telah dibayar sepenuhnya. Semua invois di dalamnya
                ditandakan sebagai dijelaskan, dengan kaedah bayaran PANEL supaya
                penyata tutup kaunter harian tidak mengiranya sebagai tunai.
              </Alert>
            </CardBody>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
