"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { updateService, type FormState } from "../actions";

const INITIAL: FormState = { error: null };

export function ServiceForm({
  service,
}: {
  service: { id: string; name: string; price: string; active: boolean };
}) {
  const [state, formAction, pending] = useActionState(updateService, INITIAL);
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
      <input type="hidden" name="serviceId" value={service.id} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="ok">{state.message}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nama" htmlFor={`sname-${service.id}`} required>
          <Input id={`sname-${service.id}`} name="name" defaultValue={service.name} required />
        </Field>
        <Field label="Harga (RM)" htmlFor={`sprice-${service.id}`} required>
          <Input
            id={`sprice-${service.id}`}
            name="price"
            type="number"
            step="0.01"
            min={0}
            defaultValue={service.price}
            required
            className="tabular"
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="active" defaultChecked={service.active} className="h-4 w-4" />
        Aktif
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
