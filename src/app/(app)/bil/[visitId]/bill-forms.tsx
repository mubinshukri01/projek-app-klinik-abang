"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import {
  addServiceLine,
  completeVisit,
  issueInvoice,
  prepareInvoice,
  recordPayment,
  removeLine,
  setDiscount,
  type FormState,
} from "../actions";

const INITIAL: FormState = { error: null };

export interface ServiceOption {
  id: string;
  code: string;
  name: string;
  price: string;
}

export function PrepareInvoiceForm({ visitId }: { visitId: string }) {
  const [state, formAction, pending] = useActionState(prepareInvoice, INITIAL);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="visitId" value={visitId} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Menyediakan…" : "Sediakan bil"}
      </Button>
    </form>
  );
}

export function AddServiceForm({
  visitId,
  invoiceId,
  services,
}: {
  visitId: string;
  invoiceId: string;
  services: ServiceOption[];
}) {
  const [state, formAction, pending] = useActionState(addServiceLine, INITIAL);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="visitId" value={visitId} />
      <input type="hidden" name="invoiceId" value={invoiceId} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <Field label="Servis atau prosedur" htmlFor="serviceId">
          <Select id="serviceId" name="serviceId" required defaultValue="">
            <option value="" disabled>
              Pilih…
            </option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — RM {s.price}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Kuantiti" htmlFor="quantity">
          <Input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            defaultValue={1}
            className="tabular w-24"
          />
        </Field>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Menambah…" : "Tambah"}
        </Button>
      </div>
    </form>
  );
}

export function RemoveLineForm({ visitId, lineId }: { visitId: string; lineId: string }) {
  const [state, formAction, pending] = useActionState(removeLine, INITIAL);
  return (
    <form action={formAction}>
      <input type="hidden" name="visitId" value={visitId} />
      <input type="hidden" name="lineId" value={lineId} />
      {state.error ? <p className="mb-1 text-xs text-danger">{state.error}</p> : null}
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        Buang
      </Button>
    </form>
  );
}

export function DiscountForm({
  visitId,
  invoiceId,
  current,
}: {
  visitId: string;
  invoiceId: string;
  current: string;
}) {
  const [state, formAction, pending] = useActionState(setDiscount, INITIAL);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="visitId" value={visitId} />
      <input type="hidden" name="invoiceId" value={invoiceId} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <div className="flex items-end gap-2">
        <Field label="Diskaun (RM)" htmlFor="discount" className="flex-1">
          <Input
            id="discount"
            name="discount"
            type="number"
            step="0.01"
            min={0}
            defaultValue={current}
            className="tabular"
          />
        </Field>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "…" : "Guna"}
        </Button>
      </div>
    </form>
  );
}

export function IssueInvoiceForm({
  visitId,
  invoiceId,
}: {
  visitId: string;
  invoiceId: string;
}) {
  const [state, formAction, pending] = useActionState(issueInvoice, INITIAL);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="visitId" value={visitId} />
      <input type="hidden" name="invoiceId" value={invoiceId} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="ok">{state.message}</Alert> : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Mengeluarkan…" : "Keluarkan invois"}
      </Button>
    </form>
  );
}

export function PaymentForm({
  visitId,
  invoiceId,
  due,
}: {
  visitId: string;
  invoiceId: string;
  due: number;
}) {
  const [state, formAction, pending] = useActionState(recordPayment, INITIAL);
  const [method, setMethod] = useState("CASH");

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="visitId" value={visitId} />
      <input type="hidden" name="invoiceId" value={invoiceId} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Kaedah" htmlFor="method">
          <Select id="method" name="method" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="CASH">Tunai</option>
            <option value="CARD">Kad</option>
            <option value="DUITNOW_QR">DuitNow QR</option>
            <option value="EWALLET">E-wallet</option>
          </Select>
        </Field>
        <Field label="Amaun (RM)" htmlFor="amount" required>
          {/* Lalai kepada baki penuh: kes paling biasa di kaunter. */}
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min={0.01}
            defaultValue={due.toFixed(2)}
            required
            className="tabular"
          />
        </Field>
        <Field
          label="Rujukan"
          htmlFor="reference"
          hint={method === "CASH" ? undefined : "No. resit terminal atau transaksi."}
        >
          <Input id="reference" name="reference" className="tabular" />
        </Field>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Merekod…" : "Terima bayaran"}
      </Button>
    </form>
  );
}

export function CompleteVisitForm({
  visitId,
  payerNote,
}: {
  visitId: string;
  payerNote: string | null;
}) {
  const [state, formAction, pending] = useActionState(completeVisit, INITIAL);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="visitId" value={visitId} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {payerNote ? <Alert tone="info">{payerNote}</Alert> : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Menutup…" : "Tutup lawatan"}
      </Button>
    </form>
  );
}
