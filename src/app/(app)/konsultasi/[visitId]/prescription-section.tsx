"use client";

import { useActionState, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { EmptyRow, Table, TableWrap, Td, Th } from "@/components/ui/table";
import { formatRM } from "@/lib/money";
import { calculateQuantity } from "@/lib/prescription";
import type { DrugForm } from "@/generated/prisma/enums";
import { addPrescriptionItem, removePrescriptionItem, type FormState } from "../actions";

const INITIAL: FormState = { error: null };

export interface DrugOption {
  id: string;
  name: string;
  form: DrugForm;
  unit: string;
  sellPrice: string;
  isControlled: boolean;
  onHand: number;
  defaultDose: string | null;
  defaultFrequency: string | null;
  defaultDuration: number | null;
  instructionsMs: string | null;
}

export interface PrescriptionRow {
  id: string;
  drugName: string;
  unit: string;
  dose: string;
  frequency: string;
  durationDays: number;
  quantity: number;
  instructions: string;
  unitPrice: string;
  dispensed: boolean;
}

export function PrescriptionSection({
  visitId,
  drugs,
  items,
  readOnly,
}: {
  visitId: string;
  drugs: DrugOption[];
  items: PrescriptionRow[];
  readOnly?: boolean;
}) {
  const [addState, addAction, adding] = useActionState(addPrescriptionItem, INITIAL);
  const [removeState, removeAction] = useActionState(removePrescriptionItem, INITIAL);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DrugOption | null>(null);
  const [dose, setDose] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("");
  const [quantity, setQuantity] = useState("");
  const [instructions, setInstructions] = useState("");

  // Formulari klinik ini lebih kurang 100 ubat, cukup kecil untuk ditapis dalam
  // pelayar. Ini memberi carian serta-merta pada setiap ketukan kekunci.
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return drugs.filter((d) => d.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query, drugs]);

  function choose(drug: DrugOption) {
    setSelected(drug);
    setQuery("");
    // Isi lalai formulari supaya doktor hanya perlu menukar yang berbeza.
    setDose(drug.defaultDose ?? "1");
    setFrequency(drug.defaultFrequency ?? "3 kali sehari");
    setDuration(String(drug.defaultDuration ?? 3));
    setInstructions(drug.instructionsMs ?? "");
    setQuantity("");
  }

  // Kuantiti dikira secara langsung supaya doktor nampak apa yang akan
  // didispense sebelum menambah. Null bermakna ia mesti dimasukkan sendiri.
  const computed = selected
    ? calculateQuantity({
        form: selected.form,
        dose,
        frequency,
        durationDays: Number(duration) || 0,
      })
    : null;

  const effectiveQuantity = quantity.trim().length > 0 ? Number(quantity) : computed;
  const shortStock =
    selected && effectiveQuantity !== null && effectiveQuantity > selected.onHand;

  return (
    <div className="space-y-4">
      {addState.error ? <Alert tone="danger">{addState.error}</Alert> : null}
      {removeState.error ? <Alert tone="danger">{removeState.error}</Alert> : null}

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>Ubat</Th>
              <Th>Dos</Th>
              <Th>Kekerapan</Th>
              <Th className="text-right">Hari</Th>
              <Th className="text-right">Kuantiti</Th>
              <Th className="text-right">Harga</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <EmptyRow colSpan={7}>Belum ada ubat dipreskripsikan.</EmptyRow>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <Td>
                    <span className="font-medium">{item.drugName}</span>
                    {item.dispensed ? (
                      <Badge tone="ok" className="ml-2">
                        Didispense
                      </Badge>
                    ) : null}
                    <span className="mt-0.5 block text-xs text-ink-faint">{item.instructions}</span>
                  </Td>
                  <Td className="text-ink-soft">{item.dose}</Td>
                  <Td className="text-ink-soft">{item.frequency}</Td>
                  <Td className="tabular text-right text-ink-soft">{item.durationDays}</Td>
                  <Td className="tabular text-right font-medium">
                    {item.quantity} {item.unit}
                  </Td>
                  <Td className="tabular text-right text-ink-soft">
                    {formatRM(Number(item.unitPrice) * item.quantity)}
                  </Td>
                  <Td className="text-right">
                    {readOnly || item.dispensed ? null : (
                      <form action={removeAction}>
                        <input type="hidden" name="visitId" value={visitId} />
                        <input type="hidden" name="itemId" value={item.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          Buang
                        </Button>
                      </form>
                    )}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </TableWrap>

      {readOnly ? null : (
        <div className="rounded-md border border-line bg-canvas p-3">
          {!selected ? (
            <div className="space-y-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari ubat untuk ditambah…"
                aria-label="Cari ubat"
              />
              {query.trim().length >= 2 && matches.length === 0 ? (
                <p className="text-xs text-ink-faint">Tiada ubat sepadan.</p>
              ) : null}
              {matches.length > 0 ? (
                <ul className="divide-y divide-line-soft rounded-md border border-line bg-surface">
                  {matches.map((d) => (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => choose(d)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-brand-soft"
                      >
                        <span>
                          {d.name}
                          {d.isControlled ? (
                            <Badge tone="warn" className="ml-2">
                              Berjadual
                            </Badge>
                          ) : null}
                        </span>
                        <span
                          className={
                            d.onHand > 0
                              ? "tabular shrink-0 text-xs text-ink-faint"
                              : "tabular shrink-0 text-xs font-medium text-danger"
                          }
                        >
                          stok {d.onHand} {d.unit}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <form action={addAction} className="space-y-3">
              <input type="hidden" name="visitId" value={visitId} />
              <input type="hidden" name="drugId" value={selected.id} />

              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-ink">{selected.name}</p>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(null)}>
                  Tukar ubat
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Dos" htmlFor="dose">
                  <Input id="dose" name="dose" value={dose} onChange={(e) => setDose(e.target.value)} />
                </Field>
                <Field label="Kekerapan" htmlFor="frequency">
                  <Input
                    id="frequency"
                    name="frequency"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                  />
                </Field>
                <Field label="Tempoh (hari)" htmlFor="durationDays">
                  <Input
                    id="durationDays"
                    name="durationDays"
                    type="number"
                    min={1}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="tabular"
                  />
                </Field>
                <Field
                  label={`Kuantiti (${selected.unit})`}
                  htmlFor="quantity"
                  hint={
                    computed !== null
                      ? `Dikira: ${computed}`
                      : "Tidak boleh dikira automatik — masukkan sendiri."
                  }
                >
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder={computed !== null ? String(computed) : ""}
                    className="tabular"
                    data-testid="kuantiti"
                  />
                </Field>
              </div>

              <Field label="Arahan pada label ubat" htmlFor="instructions">
                <Textarea
                  id="instructions"
                  name="instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="min-h-16"
                />
              </Field>

              {shortStock ? (
                <Alert tone="warn">
                  Stok tinggal {selected.onHand} {selected.unit}, kurang daripada kuantiti
                  yang dipreskripsikan. Preskripsi tetap boleh disimpan — dispensari akan
                  menguruskannya.
                </Alert>
              ) : null}

              <Button type="submit" disabled={adding}>
                {adding ? "Menambah…" : "Tambah ke preskripsi"}
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
