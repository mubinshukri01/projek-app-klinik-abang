"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { login, type LoginState } from "./actions";

const INITIAL: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, INITIAL);

  /*
   * Nama pengguna dikawal oleh React dengan sengaja.
   *
   * React 19 menetapkan semula borang tidak terkawal selepas satu tindakan
   * borang selesai, jadi kata laluan yang salah akan mengosongkan KEDUA-DUA
   * medan dan memaksa kakitangan menaip semula nama pengguna mereka. Kata
   * laluan sengaja dibiarkan tidak terkawal — mengosongkannya adalah betul.
   */
  const [username, setUsername] = useState("");

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Field label="Nama pengguna" htmlFor="username" required>
        <Input
          id="username"
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          autoFocus
        />
      </Field>

      <Field label="Kata laluan" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Sedang masuk…" : "Log Masuk"}
      </Button>
    </form>
  );
}
