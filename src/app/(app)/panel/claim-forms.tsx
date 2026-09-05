"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { buildClaim, markSubmitted, recordClaimPayment, type FormState } from "./actions";

const INITIAL: FormState = { error: null };

export interface PanelOption {
  id: string;
  name: string;
}

export function BuildClaimForm({
  panels,
  defaultStart,
  defaultEnd,
}: {
  panels: PanelOption[];
  defaultStart: string;
  defaultEnd: string;
}) {
  const [state, formAction, pending] = useActionState(buildClaim, INITIAL);

  return (
    <form action={formAction} className="space-y-3">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Panel" htmlFor="panelId" required>
          <Select id="panelId" name="panelId" required defaultValue="">
            <option value="" disabled>
              Pilih panel…
            </option>
            {panels.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Dari tarikh" htmlFor="periodStart" required>
          <Input id="periodStart" name="periodStart" type="date" defaultValue={defaultStart} required />
        </Field>
        <Field label="Hingga tarikh" htmlFor="periodEnd" required>
          <Input id="periodEnd" name="periodEnd" type="date" defaultValue={defaultEnd} required />
        </Field>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Membina…" : "Bina tuntutan"}
      </Button>
    </form>
  );
}

export function SubmitClaimForm({ claimId }: { claimId: string }) {
  const [state, formAction, pending] = useActionState(markSubmitted, INITIAL);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="claimId" value={claimId} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <p className="text-sm text-ink-soft">
        Muat turun CSV, masukkan ke portal panel, kemudian tandakan tuntutan ini
        sebagai telah dihantar.
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? "Menanda…" : "Tandakan telah dihantar"}
      </Button>
    </form>
  );
}

export function ClaimPaymentForm({ claimId, due }: { claimId: string; due: number }) {
  const [state, formAction, pending] = useActionState(recordClaimPayment, INITIAL);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="claimId" value={claimId} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Amaun diterima (RM)" htmlFor="amount" required>
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
        <Field label="Catatan" htmlFor="remarks">
          <Input id="remarks" name="remarks" placeholder="cth. No. baucar bayaran" />
        </Field>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Merekod…" : "Rekod bayaran panel"}
      </Button>
    </form>
  );
}
