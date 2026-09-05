"use client";

import { useActionState, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { toDateInput } from "@/lib/dates";
import { formatIc, normalizeIc, parseMyKad } from "@/lib/mykad";
import { createPatient, type FormState } from "../actions";

const INITIAL: FormState = { error: null };

const STATES = [
  "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang",
  "Perak", "Perlis", "Pulau Pinang", "Sabah", "Sarawak", "Selangor",
  "Terengganu", "W.P. Kuala Lumpur", "W.P. Labuan", "W.P. Putrajaya",
];

export function PatientForm({ initialIc = "" }: { initialIc?: string }) {
  const [state, formAction, pending] = useActionState(createPatient, INITIAL);

  const [idType, setIdType] = useState("MYKAD");
  const [idNumber, setIdNumber] = useState(() => normalizeIc(initialIc));

  const usesIc = idType === "MYKAD" || idType === "MYKID";

  /*
   * Nombor MyKad mengandungi tarikh lahir, tempat lahir dan jantina. Menghurai
   * semasa menaip menjimatkan tiga medan pada setiap pendaftaran, dan
   * kakitangan masih boleh menindih apa-apa yang salah sebelum menyimpan.
   */
  const parsed = useMemo(
    () => (usesIc ? parseMyKad(idNumber) : null),
    [usesIc, idNumber],
  );

  const derived = parsed?.valid ? parsed : null;
  const icHint = usesIc
    ? derived
      ? `${formatIc(derived.digits)} · ${derived.gender === "LELAKI" ? "Lelaki" : "Perempuan"}${
          derived.birthState ? ` · lahir di ${derived.birthState}` : ""
        }`
      : idNumber.length > 0
        ? (parsed?.error ?? undefined)
        : "12 digit, dengan atau tanpa sempang."
    : undefined;

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Card>
        <CardHeader title="Pengenalan diri" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Jenis pengenalan" htmlFor="idType" required>
            <Select
              id="idType"
              name="idType"
              value={idType}
              onChange={(e) => setIdType(e.target.value)}
            >
              <option value="MYKAD">MyKad</option>
              <option value="MYKID">MyKid</option>
              <option value="PASSPORT">Pasport</option>
              <option value="POLIS_TENTERA">Polis / Tentera</option>
              <option value="LAIN">Lain-lain</option>
            </Select>
          </Field>

          <Field
            label="Nombor pengenalan"
            htmlFor="idNumber"
            required
            hint={icHint}
            error={state.fieldErrors?.idNumber}
          >
            <Input
              id="idNumber"
              name="idNumber"
              value={idNumber}
              onChange={(e) => setIdNumber(usesIc ? normalizeIc(e.target.value) : e.target.value)}
              inputMode={usesIc ? "numeric" : "text"}
              maxLength={usesIc ? 12 : undefined}
              className="tabular"
              required
              autoFocus
            />
          </Field>

          <Field
            label="Nama penuh (seperti dalam kad pengenalan)"
            htmlFor="name"
            required
            error={state.fieldErrors?.name}
            className="sm:col-span-2"
          >
            <Input id="name" name="name" required autoComplete="off" />
          </Field>

          <Field label="Jantina" htmlFor="gender" required error={state.fieldErrors?.gender}>
            {/* key memaksa React memasang semula pemilih apabila IC menghasilkan
                nilai baharu, supaya defaultValue benar-benar dikemas kini. */}
            <Select
              id="gender"
              name="gender"
              key={`gender-${derived?.gender ?? "none"}`}
              defaultValue={derived?.gender ?? ""}
              required
            >
              <option value="" disabled>
                Pilih…
              </option>
              <option value="LELAKI">Lelaki</option>
              <option value="PEREMPUAN">Perempuan</option>
            </Select>
          </Field>

          <Field label="Tarikh lahir" htmlFor="dob" error={state.fieldErrors?.dob}>
            <Input
              id="dob"
              name="dob"
              type="date"
              key={`dob-${derived?.dob?.toISOString() ?? "none"}`}
              defaultValue={derived?.dob ? toDateInput(derived.dob) : ""}
            />
          </Field>

          <Field label="Warganegara" htmlFor="nationality">
            <Input
              id="nationality"
              name="nationality"
              key={`nat-${derived?.isForeignBorn ?? "none"}`}
              defaultValue="Malaysia"
            />
          </Field>

          <Field label="Bangsa" htmlFor="race">
            <Input id="race" name="race" />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Perhubungan" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombor telefon" htmlFor="phone">
            <Input id="phone" name="phone" type="tel" inputMode="tel" className="tabular" />
          </Field>
          <Field label="E-mel" htmlFor="email">
            <Input id="email" name="email" type="email" />
          </Field>
          <Field label="Alamat baris 1" htmlFor="addressLine1" className="sm:col-span-2">
            <Input id="addressLine1" name="addressLine1" />
          </Field>
          <Field label="Alamat baris 2" htmlFor="addressLine2" className="sm:col-span-2">
            <Input id="addressLine2" name="addressLine2" />
          </Field>
          <Field label="Poskod" htmlFor="postcode">
            <Input id="postcode" name="postcode" inputMode="numeric" maxLength={5} className="tabular" />
          </Field>
          <Field label="Bandar" htmlFor="city">
            <Input id="city" name="city" defaultValue="Semenyih" />
          </Field>
          <Field label="Negeri" htmlFor="state">
            <Select id="state" name="state" defaultValue="Selangor">
              <option value="">Pilih…</option>
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Pekerjaan" htmlFor="occupation">
            <Input id="occupation" name="occupation" />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Hubungan kecemasan"
          description="Boleh dikosongkan, tetapi sangat berguna untuk pesakit warga emas dan kanak-kanak."
        />
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <Field label="Nama" htmlFor="emergencyName">
            <Input id="emergencyName" name="emergencyName" />
          </Field>
          <Field label="Telefon" htmlFor="emergencyPhone">
            <Input id="emergencyPhone" name="emergencyPhone" type="tel" className="tabular" />
          </Field>
          <Field label="Hubungan" htmlFor="emergencyRelation">
            <Input id="emergencyRelation" name="emergencyRelation" placeholder="cth. Anak" />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Persetujuan pesakit" />
        <CardBody className="space-y-3">
          <label className="flex items-start gap-3 text-sm text-ink">
            <input
              type="checkbox"
              name="consent"
              className="mt-0.5 h-4 w-4 shrink-0"
              required
            />
            <span>
              Pesakit bersetuju klinik mengumpul dan memproses data kesihatan mereka
              untuk tujuan rawatan, bil dan tuntutan panel, selaras dengan Akta
              Perlindungan Data Peribadi 2010.
            </span>
          </label>
          {state.fieldErrors?.consent ? (
            <p className="text-xs font-medium text-danger">{state.fieldErrors.consent}</p>
          ) : null}
        </CardBody>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan pesakit"}
        </Button>
        <ButtonLink href="/pendaftaran" variant="secondary" size="lg">
          Batal
        </ButtonLink>
      </div>
    </form>
  );
}
