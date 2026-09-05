"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { saveConsultation, type FormState } from "../actions";

const INITIAL: FormState = { error: null };

export interface NotesValues {
  presentingComplaint: string;
  history: string;
  examination: string;
  notes: string;
  disposition: string;
  followUpDate: string;
}

export function NotesForm({
  visitId,
  initial,
  readOnly,
}: {
  visitId: string;
  initial: NotesValues;
  readOnly?: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveConsultation, INITIAL);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="visitId" value={visitId} />

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="ok">Nota konsultasi disimpan.</Alert> : null}

      <Field label="Aduan utama" htmlFor="presentingComplaint">
        <Textarea
          id="presentingComplaint"
          name="presentingComplaint"
          defaultValue={initial.presentingComplaint}
          disabled={readOnly}
          placeholder="Apa yang dirasai pesakit dan sejak bila."
        />
      </Field>

      <Field label="Sejarah" htmlFor="history">
        <Textarea
          id="history"
          name="history"
          defaultValue={initial.history}
          disabled={readOnly}
          placeholder="Sejarah penyakit, ubat semasa, sejarah keluarga."
        />
      </Field>

      <Field label="Pemeriksaan" htmlFor="examination">
        <Textarea
          id="examination"
          name="examination"
          defaultValue={initial.examination}
          disabled={readOnly}
          placeholder="Penemuan pemeriksaan fizikal."
        />
      </Field>

      <Field label="Nota / pelan" htmlFor="notes">
        <Textarea
          id="notes"
          name="notes"
          defaultValue={initial.notes}
          disabled={readOnly}
          placeholder="Pelan rawatan, nasihat yang diberi."
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Disposisi" htmlFor="disposition">
          <Input
            id="disposition"
            name="disposition"
            defaultValue={initial.disposition}
            disabled={readOnly}
            placeholder="cth. Balik rumah, rujuk hospital"
          />
        </Field>
        <Field label="Tarikh susulan" htmlFor="followUpDate">
          <Input
            id="followUpDate"
            name="followUpDate"
            type="date"
            defaultValue={initial.followUpDate}
            disabled={readOnly}
          />
        </Field>
      </div>

      {readOnly ? null : (
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan nota"}
        </Button>
      )}
    </form>
  );
}
