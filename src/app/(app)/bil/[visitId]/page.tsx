import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { EmptyRow, Table, TableWrap, Td, Th } from "@/components/ui/table";
import { requireArea } from "@/lib/auth";
import { balanceDue, patientPaysAtCounter } from "@/lib/billing";
import { formatDateTime } from "@/lib/dates";
import { invoiceForVisit } from "@/lib/invoice";
import { formatRM } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { PAYER_LABEL, VISIT_STATUS_LABEL, VISIT_STATUS_TONE } from "@/lib/visit-status";
import {
  AddServiceForm,
  CompleteVisitForm,
  DiscountForm,
  IssueInvoiceForm,
  PaymentForm,
  PrepareInvoiceForm,
  RemoveLineForm,
} from "./bill-forms";

export const metadata: Metadata = { title: "Bil" };
export const dynamic = "force-dynamic";

const METHOD_LABEL: Record<string, string> = {
  CASH: "Tunai",
  CARD: "Kad",
  DUITNOW_QR: "DuitNow QR",
  EWALLET: "E-wallet",
  PANEL: "Panel",
};

export default async function BillPage({ params }: PageProps<"/bil/[visitId]">) {
  await requireArea("bil");
  const { visitId } = await params;

  const [visit, invoice, services] = await Promise.all([
    prisma.visit.findUnique({
      where: { id: visitId },
      select: {
        id: true,
        queueNumber: true,
        status: true,
        payerType: true,
        employeeId: true,
        glNumber: true,
        patient: { select: { name: true, mrn: true } },
        panel: { select: { name: true } },
      },
    }),
    invoiceForVisit(visitId),
    prisma.serviceItem.findMany({
      where: { active: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: { id: true, code: true, name: true, price: true },
    }),
  ]);

  if (!visit) notFound();

  const isDraft = invoice?.status === "DRAFT";
  const due = invoice ? balanceDue(invoice.total, invoice.amountPaid) : 0;
  const selfPay = patientPaysAtCounter(visit.payerType);
  const closed = visit.status === "COMPLETED" || visit.status === "CANCELLED";

  return (
    <div className="space-y-6">
      <PageHeader
        title={visit.patient.name}
        description={`Giliran ${visit.queueNumber} · ${visit.patient.mrn} · ${PAYER_LABEL[visit.payerType]}${
          visit.panel ? ` (${visit.panel.name})` : ""
        }`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={VISIT_STATUS_TONE[visit.status]}>{VISIT_STATUS_LABEL[visit.status]}</Badge>
            <ButtonLink href="/bil" variant="secondary">
              Senarai
            </ButtonLink>
          </div>
        }
      />

      {!selfPay ? (
        <Alert tone="info" title={`Lawatan ${PAYER_LABEL[visit.payerType]}`}>
          {visit.payerType === "PANEL" ? (
            <p>
              Pesakit tidak membayar di kaunter. Invois akan dimasukkan ke dalam tuntutan
              panel {visit.panel?.name ?? ""}
              {visit.employeeId ? ` (no. ahli ${visit.employeeId})` : ""}
              {visit.glNumber ? `, GL ${visit.glNumber}` : ""}.
            </p>
          ) : (
            <p>
              Pesakit tidak membayar di kaunter. Tuntutan skim ini dihantar melalui portal{" "}
              <strong>PRIMIS</strong> (ProtectHealth), bukan dari sistem ini — invois di sini
              adalah rekod klinik.
            </p>
          )}
        </Alert>
      ) : null}

      {!invoice ? (
        <Card>
          <CardHeader title="Bil belum disediakan" />
          <CardBody>
            <PrepareInvoiceForm visitId={visit.id} />
          </CardBody>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader
              title={isDraft ? "Bil (draf)" : `Invois ${invoice.invoiceNo}`}
              description={
                isDraft
                  ? "Semak caj sebelum mengeluarkan invois."
                  : `Dikeluarkan ${formatDateTime(invoice.issuedAt)}`
              }
              action={
                !isDraft ? (
                  <ButtonLink
                    href={`/print/resit/${invoice.id}`}
                    target="_blank"
                    variant="secondary"
                    size="sm"
                  >
                    Cetak resit
                  </ButtonLink>
                ) : null
              }
            />
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>Perkara</Th>
                    <Th className="text-right">Kuantiti</Th>
                    <Th className="text-right">Harga</Th>
                    <Th className="text-right">Jumlah</Th>
                    {isDraft ? <Th /> : null}
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines.length === 0 ? (
                    <EmptyRow colSpan={isDraft ? 5 : 4}>Tiada caj.</EmptyRow>
                  ) : (
                    invoice.lines.map((line) => (
                      <tr key={line.id}>
                        <Td>
                          {line.description}
                          {line.itemType === "DRUG" ? (
                            <Badge tone="neutral" className="ml-2">
                              Ubat
                            </Badge>
                          ) : null}
                        </Td>
                        <Td className="tabular text-right">{line.quantity}</Td>
                        <Td className="tabular text-right text-ink-soft">
                          {formatRM(line.unitPrice)}
                        </Td>
                        <Td className="tabular text-right font-medium">{formatRM(line.amount)}</Td>
                        {isDraft ? (
                          <Td className="text-right">
                            {line.itemType === "SERVICE" ? (
                              <RemoveLineForm visitId={visit.id} lineId={line.id} />
                            ) : null}
                          </Td>
                        ) : null}
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </TableWrap>

            <CardBody className="space-y-1 border-t border-line-soft">
              <Total label="Subjumlah" value={formatRM(invoice.subtotal)} />
              {Number(invoice.discount) > 0 ? (
                <Total label="Diskaun" value={`- ${formatRM(invoice.discount)}`} />
              ) : null}
              <Total label="Jumlah" value={formatRM(invoice.total)} strong />
              {Number(invoice.amountPaid) > 0 ? (
                <Total label="Telah dibayar" value={formatRM(invoice.amountPaid)} />
              ) : null}
              {due > 0 ? <Total label="Baki" value={formatRM(due)} strong /> : null}
            </CardBody>
          </Card>

          {isDraft && !closed ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader title="Tambah caj" description="Prosedur, suntikan, ujian." />
                <CardBody>
                  <AddServiceForm
                    visitId={visit.id}
                    invoiceId={invoice.id}
                    services={services.map((s) => ({
                      id: s.id,
                      code: s.code,
                      name: s.name,
                      price: s.price.toString(),
                    }))}
                  />
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Diskaun" />
                <CardBody className="space-y-4">
                  <DiscountForm
                    visitId={visit.id}
                    invoiceId={invoice.id}
                    current={invoice.discount.toString()}
                  />
                  <div className="border-t border-line-soft pt-4">
                    <IssueInvoiceForm visitId={visit.id} invoiceId={invoice.id} />
                  </div>
                </CardBody>
              </Card>
            </div>
          ) : null}

          {!isDraft && invoice.payments.length > 0 ? (
            <Card>
              <CardHeader title="Bayaran diterima" />
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <Th>Masa</Th>
                      <Th>Kaedah</Th>
                      <Th>Rujukan</Th>
                      <Th className="text-right">Amaun</Th>
                      <Th>Diterima oleh</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.payments.map((p) => (
                      <tr key={p.id}>
                        <Td className="tabular text-ink-soft">{formatDateTime(p.receivedAt)}</Td>
                        <Td>{METHOD_LABEL[p.method] ?? p.method}</Td>
                        <Td className="tabular text-ink-soft">{p.reference ?? "-"}</Td>
                        <Td className="tabular text-right font-medium">{formatRM(p.amount)}</Td>
                        <Td className="text-ink-soft">{p.receivedBy?.name ?? "-"}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            </Card>
          ) : null}

          {!isDraft && !closed ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {selfPay && due > 0 ? (
                <Card>
                  <CardHeader title="Terima bayaran" description={`Baki ${formatRM(due)}.`} />
                  <CardBody>
                    <PaymentForm visitId={visit.id} invoiceId={invoice.id} due={due} />
                  </CardBody>
                </Card>
              ) : null}

              <Card>
                <CardHeader title="Tutup lawatan" />
                <CardBody>
                  <CompleteVisitForm
                    visitId={visit.id}
                    payerNote={
                      selfPay
                        ? null
                        : "Lawatan ini ditutup tanpa bayaran pesakit. Invois kekal tertunggak sehingga penanggung membayar."
                    }
                  />
                </CardBody>
              </Card>
            </div>
          ) : null}

          {closed ? (
            <Alert tone="ok">
              Lawatan selesai. Resit boleh dicetak semula dari butang di atas.
            </Alert>
          ) : null}
        </>
      )}
    </div>
  );
}

function Total({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className={strong ? "font-semibold text-ink" : "text-ink-soft"}>{label}</span>
      <span className={strong ? "tabular font-semibold text-ink" : "tabular text-ink"}>{value}</span>
    </div>
  );
}
