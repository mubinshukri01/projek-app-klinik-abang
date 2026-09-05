"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { addAllergy, type FormState } from "../actions";

const INITIAL: FormState = { error: null };

export function AllergyForm({ visitId, patientId }: { visitId: string; patientId: string }) {
  const [state, formAction, pending] = useActionState(addAllergy, INITIAL);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Rekod alahan
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-md border border-line bg-canvas p-3">
      <input type="hidden" name="visitId" value={visitId} />
      <input type="hidden" name="patientId" value={patientId} />

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="ok">Alahan direkod.</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Bahan / ubat" htmlFor="allergen" required>
          <Input id="allergen" name="allergen" required placeholder="cth. Penicillin" />
        </Field>
        <Field label="Reaksi" htmlFor="reaction">
          <Input id="reaction" name="reaction" placeholder="cth. Ruam, bengkak" />
        </Field>
        <Field label="Keterukan" htmlFor="severity">
          <Select id="severity" name="severity" defaultValue="SEDERHANA">
            <option value="RINGAN">Ringan</option>
            <option value="SEDERHANA">Sederhana</option>
            <option value="TERUK">Teruk</option>
          </Select>
        </Field>
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan alahan"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Batal
        </Button>
      </div>
    </form>
  );
}
