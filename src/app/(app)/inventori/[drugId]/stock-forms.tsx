"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { adjustStock, receiveStock, writeOffExpired, type FormState } from "../actions";

const INITIAL: FormState = { error: null };

export function ReceiveStockForm({ drugId, unit }: { drugId: string; unit: string }) {
  const [state, formAction, pending] = useActionState(receiveStock, INITIAL);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="drugId" value={drugId} />

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="ok">{state.message}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombor batch" htmlFor="batchNo" required>
          <Input id="batchNo" name="batchNo" required className="tabular" />
        </Field>
        <Field
          label="Tarikh luput"
          htmlFor="expiryDate"
          required
          hint="Seperti tertera pada kotak."
        >
          <Input id="expiryDate" name="expiryDate" type="date" required />
        </Field>
        <Field label={`Kuantiti (${unit})`} htmlFor="quantity" required>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            required
            className="tabular"
          />
        </Field>
        <Field label="Harga kos seunit (RM)" htmlFor="costPrice">
          <Input
            id="costPrice"
            name="costPrice"
            type="number"
            step="0.01"
            min={0}
            className="tabular"
          />
        </Field>
        <Field label="Pembekal" htmlFor="supplier" className="sm:col-span-2">
          <Input id="supplier" name="supplier" />
        </Field>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Merekod…" : "Terima stok"}
      </Button>
    </form>
  );
}

export function AdjustStockForm({
  batchId,
  currentQuantity,
}: {
  batchId: string;
  currentQuantity: number;
}) {
  const [state, formAction, pending] = useActionState(adjustStock, INITIAL);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Laras
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-2 text-left">
      <input type="hidden" name="batchId" value={batchId} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="ok">{state.message}</Alert> : null}

      <Field label="Kiraan sebenar" htmlFor={`counted-${batchId}`} required>
        <Input
          id={`counted-${batchId}`}
          name="counted"
          type="number"
          min={0}
          defaultValue={currentQuantity}
          required
          className="tabular"
        />
      </Field>
      <Field label="Sebab" htmlFor={`reason-${batchId}`} required>
        <Input
          id={`reason-${batchId}`}
          name="reason"
          required
          placeholder="cth. Kiraan stok bulanan"
        />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Melaras…" : "Simpan"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Batal
        </Button>
      </div>
    </form>
  );
}

export function WriteOffForm({ batchId }: { batchId: string }) {
  const [state, formAction, pending] = useActionState(writeOffExpired, INITIAL);

  return (
    <form action={formAction} className="text-right">
      <input type="hidden" name="batchId" value={batchId} />
      {state.error ? (
        <p className="mb-1 text-xs text-danger">{state.error}</p>
      ) : null}
      <Button type="submit" variant="danger" size="sm" disabled={pending}>
        {pending ? "Menghapus…" : "Hapus kira"}
      </Button>
    </form>
  );
}
