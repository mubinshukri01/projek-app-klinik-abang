"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { issueMc, issueReferral, orderLab, voidMc, type FormState } from "../actions";

const INITIAL: FormState = { error: null };

export interface McRow {
  id: string;
  serialNo: string;
  fromLabel: string;
  toLabel: string;
  days: number;
  reason: string | null;
  voided: boolean;
  voidReason: string | null;
}

export interface ReferralRow {
  id: string;
  toFacility: string;
  specialty: string | null;
  reason: string;
}

export interface LabRow {
  id: string;
  provider: string;
  tests: string[];
  status: string;
}

const PROVIDER_LABEL: Record<string, string> = {
  PATHLAB: "Pathlab",
  BP_HEALTHCARE: "BP Healthcare",
  GRIBBLES: "Gribbles",
  LAIN: "Lain-lain",
};

export function DocumentsSection({
  visitId,
  today,
  mcs,
  referrals,
  labOrders,
  readOnly,
}: {
  visitId: string;
  today: string;
  mcs: McRow[];
  referrals: ReferralRow[];
  labOrders: LabRow[];
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState<"mc" | "rujuk" | "lab" | null>(null);

  return (
    <div className="space-y-4">
      <DocumentList
        title="Sijil cuti sakit"
        empty="Belum ada MC dikeluarkan."
        rows={mcs.map((mc) => ({
          id: mc.id,
          printHref: `/print/mc/${mc.id}`,
          heading: `${mc.serialNo} · ${mc.days} hari`,
          detail: `${mc.fromLabel} hingga ${mc.toLabel}${mc.reason ? ` · ${mc.reason}` : ""}`,
          voided: mc.voided,
          voidReason: mc.voidReason,
          extra: readOnly || mc.voided ? null : <VoidMcForm visitId={visitId} mcId={mc.id} />,
        }))}
      />

      <DocumentList
        title="Surat rujukan"
        empty="Belum ada surat rujukan."
        rows={referrals.map((r) => ({
          id: r.id,
          printHref: `/print/rujukan/${r.id}`,
          heading: r.toFacility,
          detail: [r.specialty, r.reason].filter(Boolean).join(" · "),
          voided: false,
          voidReason: null,
          extra: null,
        }))}
      />

      <DocumentList
        title="Permintaan ujian makmal"
        empty="Belum ada permintaan makmal."
        rows={labOrders.map((l) => ({
          id: l.id,
          printHref: `/print/lab/${l.id}`,
          heading: PROVIDER_LABEL[l.provider] ?? l.provider,
          detail: l.tests.join(", "),
          voided: false,
          voidReason: null,
          extra: null,
        }))}
      />

      {readOnly ? null : (
        <div className="border-t border-line-soft pt-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={open === "mc" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setOpen(open === "mc" ? null : "mc")}
            >
              Keluarkan MC
            </Button>
            <Button
              type="button"
              variant={open === "rujuk" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setOpen(open === "rujuk" ? null : "rujuk")}
            >
              Surat rujukan
            </Button>
            <Button
              type="button"
              variant={open === "lab" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setOpen(open === "lab" ? null : "lab")}
            >
              Permintaan makmal
            </Button>
          </div>

          {open === "mc" ? <McForm visitId={visitId} today={today} /> : null}
          {open === "rujuk" ? <ReferralForm visitId={visitId} /> : null}
          {open === "lab" ? <LabForm visitId={visitId} /> : null}
        </div>
      )}
    </div>
  );
}

function DocumentList({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: Array<{
    id: string;
    printHref: string;
    heading: string;
    detail: string;
    voided: boolean;
    voidReason: string | null;
    extra: React.ReactNode;
  }>;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-ink-soft uppercase">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-1 text-sm text-ink-faint">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line-soft bg-canvas px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">
                  {row.heading}
                  {row.voided ? (
                    <Badge tone="danger" className="ml-2">
                      Dibatalkan
                    </Badge>
                  ) : null}
                </p>
                <p className="text-xs text-ink-soft">{row.detail}</p>
                {row.voidReason ? (
                  <p className="text-xs text-danger">Sebab batal: {row.voidReason}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {row.extra}
                {row.voided ? null : (
                  <ButtonLink href={row.printHref} target="_blank" variant="secondary" size="sm">
                    Cetak
                  </ButtonLink>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function McForm({ visitId, today }: { visitId: string; today: string }) {
  const [state, formAction, pending] = useActionState(issueMc, INITIAL);

  return (
    <form action={formAction} className="mt-3 space-y-3 rounded-md border border-line bg-canvas p-3">
      <input type="hidden" name="visitId" value={visitId} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Dari tarikh" htmlFor="fromDate" required>
          <Input id="fromDate" name="fromDate" type="date" defaultValue={today} required />
        </Field>
        <Field
          label="Hingga tarikh"
          htmlFor="toDate"
          required
          hint="Kedua-dua hari dikira."
        >
          <Input id="toDate" name="toDate" type="date" defaultValue={today} required />
        </Field>
        <Field label="Sebab" htmlFor="mcReason">
          <Input id="mcReason" name="reason" placeholder="cth. Demam" />
        </Field>
      </div>

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Mengeluarkan…" : "Keluarkan MC"}
      </Button>
    </form>
  );
}

function VoidMcForm({ visitId, mcId }: { visitId: string; mcId: string }) {
  const [state, formAction, pending] = useActionState(voidMc, INITIAL);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Batalkan
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="visitId" value={visitId} />
      <input type="hidden" name="mcId" value={mcId} />
      {state.error ? <p className="w-full text-xs text-danger">{state.error}</p> : null}
      <Input
        name="voidReason"
        required
        placeholder="Sebab pembatalan"
        aria-label="Sebab pembatalan"
        className="w-56"
      />
      <Button type="submit" variant="danger" size="sm" disabled={pending}>
        Sahkan batal
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Batal
      </Button>
    </form>
  );
}

function ReferralForm({ visitId }: { visitId: string }) {
  const [state, formAction, pending] = useActionState(issueReferral, INITIAL);

  return (
    <form action={formAction} className="mt-3 space-y-3 rounded-md border border-line bg-canvas p-3">
      <input type="hidden" name="visitId" value={visitId} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Hospital / klinik" htmlFor="toFacility" required>
          <Input
            id="toFacility"
            name="toFacility"
            required
            placeholder="cth. Hospital Kajang"
          />
        </Field>
        <Field label="Doktor (jika ada)" htmlFor="toDoctor">
          <Input id="toDoctor" name="toDoctor" />
        </Field>
        <Field label="Kepakaran" htmlFor="specialty">
          <Input id="specialty" name="specialty" placeholder="cth. Ortopedik" />
        </Field>
      </div>

      <Field label="Sebab rujukan" htmlFor="referralReason" required>
        <Input id="referralReason" name="reason" required />
      </Field>

      <Field label="Ringkasan klinikal" htmlFor="clinicalSummary">
        <Textarea id="clinicalSummary" name="clinicalSummary" className="min-h-20" />
      </Field>

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Mengeluarkan…" : "Keluarkan surat rujukan"}
      </Button>
    </form>
  );
}

function LabForm({ visitId }: { visitId: string }) {
  const [state, formAction, pending] = useActionState(orderLab, INITIAL);

  return (
    <form action={formAction} className="mt-3 space-y-3 rounded-md border border-line bg-canvas p-3">
      <input type="hidden" name="visitId" value={visitId} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Field label="Pembekal makmal" htmlFor="provider">
        <Select id="provider" name="provider" defaultValue="PATHLAB">
          <option value="PATHLAB">Pathlab</option>
          <option value="BP_HEALTHCARE">BP Healthcare</option>
          <option value="GRIBBLES">Gribbles</option>
          <option value="LAIN">Lain-lain</option>
        </Select>
      </Field>

      <Field
        label="Ujian"
        htmlFor="tests"
        required
        hint="Satu ujian setiap baris, atau dipisahkan koma."
      >
        <Textarea id="tests" name="tests" required className="min-h-20" placeholder={"FBC\nRP\nLFT"} />
      </Field>

      <Field label="Nota klinikal" htmlFor="clinicalNote">
        <Input id="clinicalNote" name="clinicalNote" />
      </Field>

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Menghantar…" : "Buat permintaan"}
      </Button>
    </form>
  );
}
