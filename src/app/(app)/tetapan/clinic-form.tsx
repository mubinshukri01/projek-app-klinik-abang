"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { saveClinic, type FormState } from "./actions";

const INITIAL: FormState = { error: null };

export interface ClinicValues {
  name: string;
  registrationNo: string;
  addressLine1: string;
  addressLine2: string;
  postcode: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  tin: string;
}

export function ClinicForm({ initial }: { initial: ClinicValues }) {
  const [state, formAction, pending] = useActionState(saveClinic, INITIAL);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="ok">{state.message}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama klinik" htmlFor="name" required className="sm:col-span-2">
          <Input id="name" name="name" defaultValue={initial.name} required />
        </Field>

        <Field
          label="No. pendaftaran (Akta 586)"
          htmlFor="registrationNo"
          hint="Dicetak pada resit dan dokumen klinik."
        >
          <Input
            id="registrationNo"
            name="registrationNo"
            defaultValue={initial.registrationNo}
            className="tabular"
          />
        </Field>

        <Field
          label="Nombor Pengenalan Cukai (TIN)"
          htmlFor="tin"
          hint="Hanya diperlukan bila klinik melepasi ambang e-Invoice RM1 juta."
        >
          <Input id="tin" name="tin" defaultValue={initial.tin} className="tabular" />
        </Field>

        <Field label="Alamat baris 1" htmlFor="addressLine1" required className="sm:col-span-2">
          <Input
            id="addressLine1"
            name="addressLine1"
            defaultValue={initial.addressLine1}
            required
          />
        </Field>

        <Field label="Alamat baris 2" htmlFor="addressLine2" className="sm:col-span-2">
          <Input id="addressLine2" name="addressLine2" defaultValue={initial.addressLine2} />
        </Field>

        <Field label="Poskod" htmlFor="postcode" required>
          <Input
            id="postcode"
            name="postcode"
            defaultValue={initial.postcode}
            required
            className="tabular"
          />
        </Field>

        <Field label="Bandar" htmlFor="city" required>
          <Input id="city" name="city" defaultValue={initial.city} required />
        </Field>

        <Field label="Negeri" htmlFor="state" required>
          <Input id="state" name="state" defaultValue={initial.state} required />
        </Field>

        <Field label="Telefon" htmlFor="phone" required>
          <Input
            id="phone"
            name="phone"
            defaultValue={initial.phone}
            required
            className="tabular"
          />
        </Field>

        <Field label="E-mel" htmlFor="email">
          <Input id="email" name="email" type="email" defaultValue={initial.email} />
        </Field>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : "Simpan profil klinik"}
      </Button>
    </form>
  );
}
