"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { startVisit, type FormState } from "../../actions";

const INITIAL: FormState = { error: null };

export interface PanelOption {
  id: string;
  name: string;
}

export function StartVisitForm({
  patientId,
  panels,
}: {
  patientId: string;
  panels: PanelOption[];
}) {
  const [state, formAction, pending] = useActionState(startVisit, INITIAL);
  const [payerType, setPayerType] = useState("SELF");

  const isPanel = payerType === "PANEL";
  const isGovtScheme = payerType === "MADANI" || payerType === "PEKA_B40";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="patientId" value={patientId} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Penanggung kos" htmlFor="payerType" required>
          <Select
            id="payerType"
            name="payerType"
            value={payerType}
            onChange={(e) => setPayerType(e.target.value)}
          >
            <option value="SELF">Bayar sendiri</option>
            <option value="PANEL">Panel / insurans</option>
            <option value="MADANI">Skim Perubatan MADANI</option>
            <option value="PEKA_B40">PeKa B40</option>
          </Select>
        </Field>

        {isPanel ? (
          <>
            <Field label="Panel" htmlFor="panelId" required error={state.fieldErrors?.panelId}>
              <Select id="panelId" name="panelId" required>
                <option value="">Pilih panel…</option>
                {panels.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="No. pekerja / ahli"
              htmlFor="employeeId"
              hint="Seperti tertera pada kad panel pesakit."
            >
              <Input id="employeeId" name="employeeId" className="tabular" />
            </Field>
            <Field label="No. GL (jika ada)" htmlFor="glNumber">
              <Input id="glNumber" name="glNumber" className="tabular" />
            </Field>
          </>
        ) : null}
      </div>

      {isGovtScheme ? (
        <Alert tone="info">
          Lawatan ini akan direkodkan di bawah skim kerajaan. Tuntutan dihantar
          melalui portal <strong>PRIMIS</strong> (ProtectHealth), bukan dari sistem ini —
          sistem hanya menyimpan rekod lawatan untuk rujukan dan laporan.
        </Alert>
      ) : null}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Mendaftar…" : "Daftar lawatan & beri nombor giliran"}
      </Button>
    </form>
  );
}
