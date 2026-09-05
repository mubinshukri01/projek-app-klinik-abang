"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { completeDispensing, type FormState } from "../actions";

const INITIAL: FormState = { error: null };

export function CompleteDispensingForm({ visitId }: { visitId: string }) {
  const [state, formAction, pending] = useActionState(completeDispensing, INITIAL);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="visitId" value={visitId} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Menghantar…" : "Selesai & hantar ke kaunter bayaran"}
      </Button>
    </form>
  );
}
