import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireArea } from "@/lib/auth";
import { balanceDue, patientPaysAtCounter } from "@/lib/billing";
import { formatDateTime } from "@/lib/dates";
import { formatAmount, formatRM } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { PAYER_LABEL } from "@/lib/visit-status";

export const metadata: Metadata = { title: "Resit" };
export const dynamic = "force-dynamic";

const METHOD_LABEL: Record<string, string> = {
  CASH: "Tunai",
  CARD: "Kad",
  DUITNOW_QR: "DuitNow QR",
  EWALLET: "E-wallet",
  PANEL: "Panel",
};

export default async function ReceiptPage({ params }: PageProps<"/print/resit/[invoiceId]">) {
  await requireArea("bil");
  const { invoiceId } = await params;

  const [clinic, invoice] = await Promise.all([
    prisma.clinic.findFirst(),
    prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        lines: { orderBy: { id: "asc" } },
        payments: { orderBy: { receivedAt: "asc" } },
        panel: { select: { name: true } },
        visit: {
          select: {
            queueNumber: true,
            payerType: true,
            patient: { select: { name: true, mrn: true } },
            doctor: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  if (!invoice) notFound();

  const due = balanceDue(invoice.total, invoice.amountPaid);
  const selfPay = patientPaysAtCounter(invoice.visit.payerType);

  return (
    <div className="receipt">
      <header className="receipt-head">
        <strong>{clinic?.name ?? "Klinik"}</strong>
        {clinic ? (
          <>
            <span>{clinic.addressLine1}</span>
            {clinic.addressLine2 ? <span>{clinic.addressLine2}</span> : null}
            <span>
              {clinic.postcode} {clinic.city}, {clinic.state}
            </span>
            <span>Tel: {clinic.phone}</span>
            {clinic.registrationNo ? <span>No. Pendaftaran: {clinic.registrationNo}</span> : null}
          </>
        ) : null}
      </header>

      <div className="receipt-meta">
        <Row label="Resit" value={invoice.invoiceNo} />
        <Row label="Tarikh" value={formatDateTime(invoice.issuedAt ?? invoice.createdAt)} />
        <Row label="Pesakit" value={invoice.visit.patient.name} />
        <Row label="No. rekod" value={invoice.visit.patient.mrn} />
        <Row label="Giliran" value={String(invoice.visit.queueNumber)} />
        {invoice.visit.doctor ? <Row label="Doktor" value={invoice.visit.doctor.name} /> : null}
      </div>

      <table className="receipt-lines">
        <tbody>
          {invoice.lines.map((line) => (
            <tr key={line.id}>
              <td className="receipt-desc">
                {line.description}
                {line.quantity > 1 ? (
                  <span className="receipt-sub">
                    {line.quantity} x {formatAmount(line.unitPrice)}
                  </span>
                ) : null}
              </td>
              <td className="receipt-amount tabular">{formatAmount(line.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="receipt-totals">
        <Row label="Subjumlah" value={formatAmount(invoice.subtotal)} />
        {Number(invoice.discount) > 0 ? (
          <Row label="Diskaun" value={`-${formatAmount(invoice.discount)}`} />
        ) : null}
        <Row label="JUMLAH" value={formatRM(invoice.total)} strong />
      </div>

      {invoice.payments.length > 0 ? (
        <div className="receipt-totals">
          {invoice.payments.map((p) => (
            <Row
              key={p.id}
              label={METHOD_LABEL[p.method] ?? p.method}
              value={formatAmount(p.amount)}
            />
          ))}
          {due > 0 ? <Row label="Baki" value={formatAmount(due)} strong /> : null}
        </div>
      ) : null}

      {!selfPay ? (
        <p className="receipt-note">
          Caj kepada {PAYER_LABEL[invoice.visit.payerType]}
          {invoice.panel ? ` — ${invoice.panel.name}` : ""}. Pesakit tidak membayar.
        </p>
      ) : null}

      <footer className="receipt-foot">
        <span>Terima kasih. Semoga cepat sembuh.</span>
        <span className="receipt-sub">Simpan resit ini untuk tuntutan insurans.</span>
      </footer>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "receipt-row receipt-row-strong" : "receipt-row"}>
      <span>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}
