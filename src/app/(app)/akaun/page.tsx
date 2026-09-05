import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { ROLE_LABEL, requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Akaun Saya" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser();

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { username: true, name: true, lastLoginAt: true, createdAt: true, mmcNumber: true },
  });

  const sessions = await prisma.session.count({ where: { userId: user.id } });

  return (
    <div className="space-y-6">
      <PageHeader title="Akaun saya" description={`${user.name} · ${ROLE_LABEL[user.role]}`} />

      <Card>
        <CardHeader title="Butiran akaun" />
        <CardBody className="space-y-2 text-sm">
          <Row label="Nama pengguna" value={record?.username ?? "-"} />
          <Row label="Nama penuh" value={record?.name ?? "-"} />
          <Row label="Peranan" value={ROLE_LABEL[user.role]} />
          {record?.mmcNumber ? <Row label="No. MMC" value={record.mmcNumber} /> : null}
          <Row label="Log masuk terakhir" value={formatDateTime(record?.lastLoginAt)} />
          <Row label="Sesi aktif" value={String(sessions)} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Tukar kata laluan"
          description="Jangan kongsi akaun. Setiap tindakan direkod atas nama pengguna yang log masuk."
        />
        <CardBody className="space-y-4">
          <Alert tone="warn">
            Jika anda masih menggunakan kata laluan lalai daripada pemasangan,
            tukar sekarang. Sistem ini mengandungi rekod perubatan pesakit.
          </Alert>
          <PasswordForm />
        </CardBody>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-40 shrink-0 text-ink-soft">{label}</dt>
      <dd className="tabular text-ink">{value}</dd>
    </div>
  );
}
