import type { Metadata } from "next";
import { AutoRefresh } from "@/components/auto-refresh";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { canAccess, requireUser } from "@/lib/auth";
import { formatDateOnly, formatTime, toDateOnly } from "@/lib/dates";
import { formatAge } from "@/lib/mykad";
import { prisma } from "@/lib/prisma";
import { PAYER_LABEL } from "@/lib/visit-status";
import type { VisitStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Papan Giliran" };
export const dynamic = "force-dynamic";

/** Stesen yang dilalui pesakit, mengikut susunan aliran klinik. */
const STATIONS: Array<{ status: VisitStatus; title: string; tone: "warn" | "brand" | "info" }> = [
  { status: "WAITING", title: "Menunggu doktor", tone: "warn" },
  { status: "IN_CONSULT", title: "Dalam rawatan", tone: "brand" },
  { status: "DISPENSING", title: "Dispensari", tone: "info" },
  { status: "PAYMENT", title: "Menunggu bayaran", tone: "info" },
];

export default async function QueuePage({ searchParams }: PageProps<"/queue">) {
  const user = await requireUser();
  const params = await searchParams;
  const justRegistered = typeof params.baru === "string" ? params.baru : null;

  const today = toDateOnly();
  const visits = await prisma.visit.findMany({
    where: {
      queueDate: today,
      status: { in: STATIONS.map((s) => s.status) },
    },
    orderBy: { queueNumber: "asc" },
    select: {
      id: true,
      queueNumber: true,
      status: true,
      arrivedAt: true,
      payerType: true,
      doctor: { select: { name: true } },
      patient: { select: { id: true, name: true, mrn: true, dob: true } },
    },
  });

  const completedCount = await prisma.visit.count({
    where: { queueDate: today, status: "COMPLETED" },
  });

  return (
    <div className="space-y-6">
      <AutoRefresh seconds={5} />

      <PageHeader
        title="Papan giliran"
        description={`${formatDateOnly(today)} · ${visits.length} pesakit dalam aliran, ${completedCount} selesai.`}
        action={
          <div className="flex gap-2">
            <ButtonLink href="/paparan" variant="secondary" target="_blank">
              Skrin TV
            </ButtonLink>
            {canAccess(user.role, "pendaftaran") ? (
              <ButtonLink href="/pendaftaran">Daftar pesakit</ButtonLink>
            ) : null}
          </div>
        }
      />

      {justRegistered ? (
        <div className="rounded-md border-l-4 border-ok bg-ok-soft px-4 py-3">
          <p className="text-sm text-ok">
            Pesakit didaftarkan. Nombor giliran:{" "}
            <strong className="tabular text-2xl">{justRegistered}</strong>
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {STATIONS.map((station) => {
          const rows = visits.filter((v) => v.status === station.status);
          return (
            <Card key={station.status}>
              <CardHeader
                title={station.title}
                action={<Badge tone={rows.length > 0 ? station.tone : "neutral"}>{rows.length}</Badge>}
              />
              <CardBody className="space-y-2">
                {rows.length === 0 ? (
                  <p className="py-4 text-center text-sm text-ink-faint">Tiada pesakit.</p>
                ) : (
                  rows.map((v) => (
                    <div
                      key={v.id}
                      className="rounded-md border border-line-soft bg-canvas px-3 py-2"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="tabular text-xl font-semibold text-ink">
                          {v.queueNumber}
                        </span>
                        <span className="tabular text-xs text-ink-faint">
                          {formatTime(v.arrivedAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-sm font-medium text-ink">
                        {v.patient.name}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {formatAge(v.patient.dob)} · {PAYER_LABEL[v.payerType]}
                        {v.doctor ? ` · ${v.doctor.name}` : ""}
                      </p>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
