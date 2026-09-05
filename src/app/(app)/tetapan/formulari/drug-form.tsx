"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { updateDrug, type FormState } from "../actions";

const INITIAL: FormState = { error: null };

export interface DrugValues {
  id: string;
  name: string;
  sellPrice: string;
  reorderLevel: number;
  defaultDose: string;
  defaultFrequency: string;
  defaultDuration: number;
  instructionsMs: string;
  instructionsEn: string;
  active: boolean;
}

export function DrugForm({ drug }: { drug: DrugValues }) {
  const [state, formAction, pending] = useActionState(updateDrug, INITIAL);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Sunting
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 text-left">
      <input type="hidden" name="drugId" value={drug.id} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="ok">{state.message}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Harga jual (RM)" htmlFor={`price-${drug.id}`} required>
          <Input
            id={`price-${drug.id}`}
            name="sellPrice"
            type="number"
            step="0.01"
            min={0}
            defaultValue={drug.sellPrice}
            required
            className="tabular"
          />
        </Field>
        <Field label="Paras pesanan" htmlFor={`reorder-${drug.id}`}>
          <Input
            id={`reorder-${drug.id}`}
            name="reorderLevel"
            type="number"
            min={0}
            defaultValue={drug.reorderLevel}
            className="tabular"
          />
        </Field>
        <Field label="Dos lalai" htmlFor={`dose-${drug.id}`}>
          <Input id={`dose-${drug.id}`} name="defaultDose" defaultValue={drug.defaultDose} />
        </Field>
        <Field label="Kekerapan lalai" htmlFor={`freq-${drug.id}`}>
          <Input
            id={`freq-${drug.id}`}
            name="defaultFrequency"
            defaultValue={drug.defaultFrequency}
          />
        </Field>
        <Field label="Tempoh lalai (hari)" htmlFor={`dur-${drug.id}`}>
          <Input
            id={`dur-${drug.id}`}
            name="defaultDuration"
            type="number"
            min={0}
            defaultValue={drug.defaultDuration}
            className="tabular"
          />
        </Field>
      </div>

      <Field
        label="Arahan label (Bahasa Melayu)"
        htmlFor={`ms-${drug.id}`}
        hint="Baris ini dicetak besar pada label ubat pesakit."
      >
        <Textarea
          id={`ms-${drug.id}`}
          name="instructionsMs"
          defaultValue={drug.instructionsMs}
          className="min-h-16"
        />
      </Field>

      <Field label="Arahan label (English)" htmlFor={`en-${drug.id}`}>
        <Textarea
          id={`en-${drug.id}`}
          name="instructionsEn"
          defaultValue={drug.instructionsEn}
          className="min-h-16"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="active" defaultChecked={drug.active} className="h-4 w-4" />
        Aktif dalam formulari
      </label>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Tutup
        </Button>
      </div>
    </form>
  );
}
