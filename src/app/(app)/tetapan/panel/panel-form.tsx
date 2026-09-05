"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { savePanel, type FormState } from "../actions";

const INITIAL: FormState = { error: null };

export interface PanelValues {
  id: string | null;
  name: string;
  type: string;
  clinicCode: string;
  contactPerson: string;
  phone: string;
  email: string;
  billingCycle: string;
  notes: string;
  active: boolean;
}

const EMPTY: PanelValues = {
  id: null,
  name: "",
  type: "CORPORATE",
  clinicCode: "",
  contactPerson: "",
  phone: "",
  email: "",
  billingCycle: "Bulanan",
  notes: "",
  active: true,
};

export function PanelForm({
  panel = EMPTY,
  label = "Sunting",
}: {
  panel?: PanelValues;
  label?: string;
}) {
  const [state, formAction, pending] = useActionState(savePanel, INITIAL);
  const [open, setOpen] = useState(panel.id === null);

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  }

  const key = panel.id ?? "baharu";

  return (
    <form action={formAction} className="space-y-3 text-left">
      {panel.id ? <input type="hidden" name="panelId" value={panel.id} /> : null}
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="ok">{state.message}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nama panel" htmlFor={`pname-${key}`} required>
          <Input id={`pname-${key}`} name="name" defaultValue={panel.name} required />
        </Field>
        <Field label="Jenis" htmlFor={`ptype-${key}`}>
          <Select id={`ptype-${key}`} name="type" defaultValue={panel.type}>
            <option value="CORPORATE">Korporat</option>
            <option value="TPA">TPA / pengurus manfaat</option>
            <option value="GOVT">Kerajaan</option>
          </Select>
        </Field>
        <Field
          label="Kod klinik"
          htmlFor={`pcode-${key}`}
          hint="Diberi oleh panel. Dicetak ke dalam eksport CSV tuntutan."
        >
          <Input
            id={`pcode-${key}`}
            name="clinicCode"
            defaultValue={panel.clinicCode}
            className="tabular"
          />
        </Field>
        <Field label="Kitaran bil" htmlFor={`pcycle-${key}`}>
          <Input id={`pcycle-${key}`} name="billingCycle" defaultValue={panel.billingCycle} />
        </Field>
        <Field label="Orang hubungan" htmlFor={`pcontact-${key}`}>
          <Input id={`pcontact-${key}`} name="contactPerson" defaultValue={panel.contactPerson} />
        </Field>
        <Field label="Telefon" htmlFor={`pphone-${key}`}>
          <Input
            id={`pphone-${key}`}
            name="phone"
            defaultValue={panel.phone}
            className="tabular"
          />
        </Field>
        <Field label="E-mel" htmlFor={`pemail-${key}`} className="sm:col-span-2">
          <Input id={`pemail-${key}`} name="email" type="email" defaultValue={panel.email} />
        </Field>
      </div>

      <Field
        label="Nota"
        htmlFor={`pnotes-${key}`}
        hint="Dipaparkan pada skrin tuntutan — guna untuk arahan portal."
      >
        <Textarea
          id={`pnotes-${key}`}
          name="notes"
          defaultValue={panel.notes}
          className="min-h-16"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="active" defaultChecked={panel.active} className="h-4 w-4" />
        Aktif
      </label>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan panel"}
        </Button>
        {panel.id ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Tutup
          </Button>
        ) : null}
      </div>
    </form>
  );
}
