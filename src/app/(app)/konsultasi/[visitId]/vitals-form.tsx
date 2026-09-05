"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { bmiCategory, calculateBmi } from "@/lib/prescription";
import { saveVitals, type FormState } from "../actions";

const INITIAL: FormState = { error: null };

export interface VitalsValues {
  temperature: string;
  systolic: string;
  diastolic: string;
  pulse: string;
  respiratoryRate: string;
  spo2: string;
  weightKg: string;
  heightCm: string;
  bloodGlucose: string;
}

export function VitalsForm({
  visitId,
  initial,
  readOnly,
}: {
  visitId: string;
  initial: VitalsValues;
  readOnly?: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveVitals, INITIAL);
  const [weight, setWeight] = useState(initial.weightKg);
  const [height, setHeight] = useState(initial.heightCm);

  // BMI dipaparkan semasa menaip supaya kakitangan nampak segera bila satu
  // ukuran tersalah taip (cth. tinggi dalam meter dan bukan sentimeter).
  const bmi = calculateBmi(Number(weight) || null, Number(height) || null);
  const category = bmiCategory(bmi);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="visitId" value={visitId} />

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="ok">Tanda vital disimpan.</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Suhu (°C)" htmlFor="temperature">
          <Input
            id="temperature"
            name="temperature"
            type="number"
            step="0.1"
            inputMode="decimal"
            defaultValue={initial.temperature}
            disabled={readOnly}
            className="tabular"
          />
        </Field>

        <Field label="Tekanan darah (sistolik)" htmlFor="systolic">
          <Input
            id="systolic"
            name="systolic"
            type="number"
            inputMode="numeric"
            defaultValue={initial.systolic}
            disabled={readOnly}
            className="tabular"
          />
        </Field>

        <Field label="Tekanan darah (diastolik)" htmlFor="diastolic">
          <Input
            id="diastolic"
            name="diastolic"
            type="number"
            inputMode="numeric"
            defaultValue={initial.diastolic}
            disabled={readOnly}
            className="tabular"
          />
        </Field>

        <Field label="Nadi (/min)" htmlFor="pulse">
          <Input
            id="pulse"
            name="pulse"
            type="number"
            inputMode="numeric"
            defaultValue={initial.pulse}
            disabled={readOnly}
            className="tabular"
          />
        </Field>

        <Field label="Pernafasan (/min)" htmlFor="respiratoryRate">
          <Input
            id="respiratoryRate"
            name="respiratoryRate"
            type="number"
            inputMode="numeric"
            defaultValue={initial.respiratoryRate}
            disabled={readOnly}
            className="tabular"
          />
        </Field>

        <Field label="SpO₂ (%)" htmlFor="spo2">
          <Input
            id="spo2"
            name="spo2"
            type="number"
            inputMode="numeric"
            defaultValue={initial.spo2}
            disabled={readOnly}
            className="tabular"
          />
        </Field>

        <Field label="Berat (kg)" htmlFor="weightKg">
          <Input
            id="weightKg"
            name="weightKg"
            type="number"
            step="0.1"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            disabled={readOnly}
            className="tabular"
          />
        </Field>

        <Field label="Tinggi (cm)" htmlFor="heightCm">
          <Input
            id="heightCm"
            name="heightCm"
            type="number"
            step="0.1"
            inputMode="decimal"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            disabled={readOnly}
            className="tabular"
          />
        </Field>

        <Field label="Gula darah (mmol/L)" htmlFor="bloodGlucose">
          <Input
            id="bloodGlucose"
            name="bloodGlucose"
            type="number"
            step="0.1"
            inputMode="decimal"
            defaultValue={initial.bloodGlucose}
            disabled={readOnly}
            className="tabular"
          />
        </Field>
      </div>

      <div className="rounded-md border border-line-soft bg-canvas px-3 py-2 text-sm">
        <span className="text-ink-soft">BMI: </span>
        {bmi === null ? (
          <span className="text-ink-faint">isi berat dan tinggi</span>
        ) : (
          <span className="tabular font-semibold text-ink" data-testid="bmi">
            {bmi.toFixed(1)}
            <span className="ml-2 font-normal text-ink-soft">{category}</span>
          </span>
        )}
      </div>

      {readOnly ? null : (
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan tanda vital"}
        </Button>
      )}
    </form>
  );
}
