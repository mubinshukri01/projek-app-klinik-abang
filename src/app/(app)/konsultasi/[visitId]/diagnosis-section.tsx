"use client";

import { useActionState, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { addDiagnosis, removeDiagnosis, type FormState } from "../actions";

const INITIAL: FormState = { error: null };

export interface Icd10Option {
  code: string;
  description: string;
  category: string | null;
}

export interface DiagnosisRow {
  id: string;
  icd10Code: string;
  description: string;
  isPrimary: boolean;
}

export function DiagnosisSection({
  visitId,
  codes,
  diagnoses,
  readOnly,
}: {
  visitId: string;
  codes: Icd10Option[];
  diagnoses: DiagnosisRow[];
  readOnly?: boolean;
}) {
  const [addState, addAction, adding] = useActionState(addDiagnosis, INITIAL);
  const [removeState, removeAction] = useActionState(removeDiagnosis, INITIAL);
  const [query, setQuery] = useState("");

  /*
   * Formulari ICD-10 klinik ini kecil (puluhan kod), jadi keseluruhannya
   * dihantar ke pelayar dan ditapis di sini. Ini memberi hasil serta-merta
   * tanpa perjalanan ke pelayan pada setiap ketukan kekunci. Jika senarai
   * berkembang menjadi ribuan kod, tukar kepada carian di pihak pelayan.
   */
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const chosen = new Set(diagnoses.map((d) => d.icd10Code));
    return codes
      .filter(
        (c) =>
          !chosen.has(c.code) &&
          (c.description.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [query, codes, diagnoses]);

  return (
    <div className="space-y-3">
      {addState.error ? <Alert tone="danger">{addState.error}</Alert> : null}
      {removeState.error ? <Alert tone="danger">{removeState.error}</Alert> : null}

      {diagnoses.length === 0 ? (
        <p className="text-sm text-ink-faint">Belum ada diagnosis direkod.</p>
      ) : (
        <ul className="space-y-2">
          {diagnoses.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3 rounded-md border border-line-soft bg-canvas px-3 py-2"
            >
              <span className="min-w-0">
                <span className="tabular mr-2 text-xs font-semibold text-ink-soft">
                  {d.icd10Code}
                </span>
                <span className="text-sm text-ink">{d.description}</span>
                {d.isPrimary ? (
                  <Badge tone="brand" className="ml-2">
                    Utama
                  </Badge>
                ) : null}
              </span>
              {readOnly ? null : (
                <form action={removeAction}>
                  <input type="hidden" name="visitId" value={visitId} />
                  <input type="hidden" name="diagnosisId" value={d.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    Buang
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {readOnly ? null : (
        <div className="space-y-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari diagnosis atau kod ICD-10…"
            aria-label="Cari diagnosis"
          />

          {query.trim().length >= 2 && matches.length === 0 ? (
            <p className="text-xs text-ink-faint">Tiada kod sepadan.</p>
          ) : null}

          {matches.length > 0 ? (
            <ul className="divide-y divide-line-soft rounded-md border border-line">
              {matches.map((c) => (
                <li key={c.code}>
                  <form action={addAction}>
                    <input type="hidden" name="visitId" value={visitId} />
                    <input type="hidden" name="icd10Code" value={c.code} />
                    <button
                      type="submit"
                      disabled={adding}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-brand-soft disabled:opacity-60"
                    >
                      <span>
                        <span className="tabular mr-2 text-xs font-semibold text-ink-soft">
                          {c.code}
                        </span>
                        {c.description}
                      </span>
                      {c.category ? (
                        <span className="shrink-0 text-xs text-ink-faint">{c.category}</span>
                      ) : null}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}
