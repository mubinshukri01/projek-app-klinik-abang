"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { dispenseItem, type FormState } from "../actions";

const INITIAL: FormState = { error: null };

export interface BatchChoice {
  id: string;
  batchNo: string;
  expiryLabel: string;
  onHand: number;
  expired: boolean;
}

export interface SuggestionPart {
  batchNo: string;
  expiryLabel: string;
  quantity: number;
}

export interface ItemView {
  id: string;
  drugName: string;
  unit: string;
  dose: string;
  frequency: string;
  durationDays: number;
  quantity: number;
  instructions: string;
  isControlled: boolean;
  dispensed: boolean;
  dispensedBatchNo: string | null;
  overrideReason: string | null;
  suggestion: SuggestionPart[];
  shortfall: number;
  batches: BatchChoice[];
}

export function DispenseItem({ visitId, item }: { visitId: string; item: ItemView }) {
  const [state, formAction, pending] = useActionState(dispenseItem, INITIAL);
  const [overriding, setOverriding] = useState(false);

  if (item.dispensed) {
    return (
      <div className="rounded-md border border-line bg-canvas p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-medium text-ink">
              {item.drugName}
              <Badge tone="ok" className="ml-2">
                Disediakan
              </Badge>
            </p>
            <p className="mt-0.5 text-xs text-ink-soft">
              {item.quantity} {item.unit}
              {item.dispensedBatchNo ? ` · batch ${item.dispensedBatchNo}` : ""}
            </p>
            {item.overrideReason ? (
              <p className="mt-0.5 text-xs text-warn">Batch ditindih: {item.overrideReason}</p>
            ) : null}
          </div>
          <ButtonLink
            href={`/print/label/${item.id}`}
            target="_blank"
            variant="secondary"
            size="sm"
          >
            Cetak label
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-line bg-surface p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-ink">
            {item.drugName}
            {item.isControlled ? (
              <Badge tone="warn" className="ml-2">
                Ubat berjadual
              </Badge>
            ) : null}
          </p>
          <p className="mt-0.5 text-sm text-ink-soft">
            {item.dose} · {item.frequency} · {item.durationDays} hari
          </p>
          <p className="mt-1 text-sm text-ink">{item.instructions}</p>
        </div>
        <p className="tabular shrink-0 text-lg font-semibold text-ink">
          {item.quantity} {item.unit}
        </p>
      </div>

      {state.error ? (
        <div className="mt-3">
          <Alert tone="danger">{state.error}</Alert>
        </div>
      ) : null}

      {item.shortfall > 0 ? (
        <div className="mt-3">
          <Alert tone="danger" title="Stok tidak mencukupi">
            Kurang {item.shortfall} {item.unit}. Stok yang telah luput tidak dikira.
            Hubungi doktor untuk menukar ubat, atau pesan stok baharu.
          </Alert>
        </div>
      ) : (
        <div className="mt-3 rounded-md border border-line-soft bg-canvas px-3 py-2">
          <p className="text-xs font-medium text-ink-soft uppercase">Cadangan FEFO</p>
          <ul className="mt-1 space-y-0.5">
            {item.suggestion.map((part) => (
              <li key={part.batchNo} className="tabular text-sm text-ink">
                {part.quantity} {item.unit} · batch {part.batchNo} · luput {part.expiryLabel}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form action={formAction} className="mt-3 space-y-3">
        <input type="hidden" name="visitId" value={visitId} />
        <input type="hidden" name="itemId" value={item.id} />

        {overriding ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Batch pilihan" htmlFor={`batch-${item.id}`} required>
              <Select id={`batch-${item.id}`} name="batchId" required>
                <option value="">Pilih batch…</option>
                {item.batches
                  .filter((b) => !b.expired && b.onHand > 0)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchNo} · luput {b.expiryLabel} · ada {b.onHand}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field
              label="Sebab tidak ikut cadangan"
              htmlFor={`reason-${item.id}`}
              required
              hint="Direkod dalam jejak audit."
            >
              <Input
                id={`reason-${item.id}`}
                name="overrideReason"
                required
                placeholder="cth. Kotak batch cadangan belum dibuka"
              />
            </Field>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending || item.shortfall > 0}>
            {pending ? "Menyediakan…" : "Sahkan & tolak stok"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => setOverriding((v) => !v)}
          >
            {overriding ? "Guna cadangan FEFO" : "Pilih batch lain"}
          </Button>
        </div>
      </form>
    </div>
  );
}
