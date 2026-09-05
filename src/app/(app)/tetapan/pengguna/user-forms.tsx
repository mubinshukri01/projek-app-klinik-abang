"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { ROLE_LABEL } from "@/lib/access";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import type { Role } from "@/generated/prisma/enums";
import { createUser, resetPassword, updateUser, type FormState } from "../actions";

const INITIAL: FormState = { error: null };
const ROLES: Role[] = ["ADMIN", "DOCTOR", "NURSE", "FRONTDESK", "PHARMACY"];

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createUser, INITIAL);
  const [role, setRole] = useState<string>("FRONTDESK");

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="ok">{state.message}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nama pengguna" htmlFor="username" required hint="Huruf kecil, tanpa ruang.">
          <Input id="username" name="username" required autoCapitalize="none" spellCheck={false} />
        </Field>
        <Field label="Nama penuh" htmlFor="name" required>
          <Input id="name" name="name" required />
        </Field>
        <Field label="Peranan" htmlFor="role" required>
          <Select id="role" name="role" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </Field>
        {role === "DOCTOR" ? (
          <Field
            label="No. pendaftaran MMC"
            htmlFor="mmcNumber"
            required
            hint="Wajib — dicetak pada MC dan surat rujukan."
          >
            <Input id="mmcNumber" name="mmcNumber" required className="tabular" />
          </Field>
        ) : (
          <Field label="Telefon" htmlFor="phone">
            <Input id="phone" name="phone" className="tabular" />
          </Field>
        )}
        <Field
          label="Kata laluan permulaan"
          htmlFor="password"
          required
          hint={`Sekurang-kurangnya ${MIN_PASSWORD_LENGTH} aksara. Pengguna patut menukarnya selepas log masuk pertama.`}
          className="sm:col-span-2"
        >
          <Input
            id="password"
            name="password"
            type="password"
            minLength={MIN_PASSWORD_LENGTH}
            required
            autoComplete="new-password"
          />
        </Field>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Mencipta…" : "Cipta pengguna"}
      </Button>
    </form>
  );
}

export interface UserRow {
  id: string;
  username: string;
  name: string;
  role: Role;
  mmcNumber: string | null;
  phone: string | null;
  active: boolean;
}

export function EditUserForm({ user, isSelf }: { user: UserRow; isSelf: boolean }) {
  const [state, formAction, pending] = useActionState(updateUser, INITIAL);
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<string>(user.role);

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Sunting
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 text-left">
      <input type="hidden" name="userId" value={user.id} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="ok">{state.message}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nama penuh" htmlFor={`name-${user.id}`} required>
          <Input id={`name-${user.id}`} name="name" defaultValue={user.name} required />
        </Field>
        <Field label="Peranan" htmlFor={`role-${user.id}`}>
          <Select
            id={`role-${user.id}`}
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="No. MMC" htmlFor={`mmc-${user.id}`} required={role === "DOCTOR"}>
          <Input
            id={`mmc-${user.id}`}
            name="mmcNumber"
            defaultValue={user.mmcNumber ?? ""}
            className="tabular"
          />
        </Field>
        <Field label="Telefon" htmlFor={`phone-${user.id}`}>
          <Input
            id={`phone-${user.id}`}
            name="phone"
            defaultValue={user.phone ?? ""}
            className="tabular"
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="active" defaultChecked={user.active} className="h-4 w-4" />
        Akaun aktif
        {isSelf ? (
          <span className="text-xs text-ink-faint">(anda tidak boleh nyahaktifkan diri sendiri)</span>
        ) : null}
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

export function ResetPasswordForm({ userId, username }: { userId: string; username: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, INITIAL);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Tetap semula kata laluan
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-2 text-left">
      <input type="hidden" name="userId" value={userId} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="ok">{state.message}</Alert> : null}

      <Field
        label={`Kata laluan baharu untuk ${username}`}
        htmlFor={`pw-${userId}`}
        required
        hint="Semua sesi pengguna ini akan ditamatkan."
      >
        <Input
          id={`pw-${userId}`}
          name="password"
          type="password"
          minLength={MIN_PASSWORD_LENGTH}
          required
          autoComplete="new-password"
        />
      </Field>

      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="danger" disabled={pending}>
          {pending ? "Menetapkan…" : "Tetap semula"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Batal
        </Button>
      </div>
    </form>
  );
}
