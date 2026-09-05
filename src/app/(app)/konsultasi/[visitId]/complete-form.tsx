"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { completeConsultation, type FormState } from "../actions";

const INITIAL: FormState = { error: null };

export function CompleteForm({
  visitId,
  hasPrescription,
}: {
  visitId: string;
  hasPrescription: boolean;
}) {
  const [state, formAction, pending] = useActionState(completeConsultation, INITIAL);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="visitId" value={visitId} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <p className="text-sm text-ink-soft">
        {hasPrescription
          ? "Pesakit akan dihantar ke kaunter dispensari untuk mengambil ubat."
          : "Tiada ubat dipreskripsikan — pesakit akan terus ke kaunter bayaran."}
      </p>

      <Button type="submit" size="lg" disabled={pending}>
        {pending
          ? "Menutup…"
          : hasPrescription
            ? "Tutup konsultasi & hantar ke dispensari"
            : "Tutup konsultasi & hantar ke kaunter"}
      </Button>
    </form>
  );
}
