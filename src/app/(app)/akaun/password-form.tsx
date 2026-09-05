"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import { changeOwnPassword, type FormState } from "./actions";

const INITIAL: FormState = { error: null };

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changeOwnPassword, INITIAL);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="ok">{state.message}</Alert> : null}

      <Field label="Kata laluan semasa" htmlFor="currentPassword" required>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <Field
        label="Kata laluan baharu"
        htmlFor="newPassword"
        required
        hint={`Sekurang-kurangnya ${MIN_PASSWORD_LENGTH} aksara. Frasa panjang lebih mudah diingat dan lebih selamat.`}
      >
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
      </Field>

      <Field label="Sahkan kata laluan baharu" htmlFor="confirmPassword" required>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? "Menukar…" : "Tukar kata laluan"}
      </Button>
    </form>
  );
}
