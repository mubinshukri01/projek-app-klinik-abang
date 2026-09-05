import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { EmptyRow, Table, TableWrap, Td, Th } from "@/components/ui/table";
import { requireArea } from "@/lib/auth";
import { formatDateOnly, toDateInput } from "@/lib/dates";
import { formatRM, sumMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { BuildClaimForm } from "./claim-forms";

export const metadata: Metadata = { title: "Panel & Tuntutan" };
export const dynamic = "force-dynamic";

const CLAIM_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draf",
  SUBMITTED: "Dihantar",
  PARTIAL: "Bayaran sebahagian",
  PAID: "Dibayar",
  REJECTED: "Ditolak",
};

const CLAIM_STATUS_TONE: Record<string, "neutral" | "info" | "warn" | "ok" | "danger"> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  PARTIAL: "warn",
  PAID: "ok",
  REJECTED: "danger",
};

export default async function PanelPage() {
  await requireArea("panel");

  const [panels, claims, unclaimed] = await Promise.all([
    prisma.panel.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.panelClaim.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        claimNo: true,
        periodStart: true,
        periodEnd: true,
        status: true,
        totalAmount: true,
        amountPaid: true,
        panel: { select: { name: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.invoice.findMany({
      where: {
        payerType: "PANEL",
        status: { in: ["ISSUED", "PARTIAL"] },
        claimItems: { none: {} },
      },
      select: { total: true, panelId: true },
    }),
  ]);

  const unclaimedTotal = sumMoney(unclaimed.map((i) => i.total));
  const outstanding = sumMoney(
    claims
      .filter((c) => c.status !== "PAID")
      .map((c) => Number(c.totalAmount) - Number(c.amountPaid)),
  );

  // Lalai kepada bulan lepas: kitaran bil panel biasanya bulanan.
  const now = new Date();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Panel & tuntutan"
        description="Bina senarai tuntutan untuk dimasukkan ke portal panel."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardBody>
            <p className="text-xs font-medium text-ink-soft uppercase">Belum dituntut</p>
            <p className="tabular text-2xl font-semibold text-ink">{formatRM(unclaimedTotal)}</p>
            <p className="mt-1 text-xs text-ink-faint">
              {unclaimed.length} invois panel belum dimasukkan ke dalam sebarang tuntutan.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium text-ink-soft uppercase">Tuntutan tertunggak</p>
            <p className="tabular text-2xl font-semibold text-ink">{formatRM(outstanding)}</p>
            <p className="mt-1 text-xs text-ink-faint">Dihantar tetapi belum dibayar sepenuhnya.</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Bina tuntutan baharu"
          description="Mengumpul invois panel yang telah dikeluarkan dan belum pernah dituntut."
        />
        <CardBody>
          <BuildClaimForm
            panels={panels.map((p) => ({ id: p.id, name: p.name }))}
            defaultStart={toDateInput(
              new Date(Date.UTC(lastMonthStart.getFullYear(), lastMonthStart.getMonth(), 1)),
            )}
            defaultEnd={toDateInput(
              new Date(
                Date.UTC(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), lastMonthEnd.getDate()),
              ),
            )}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Tuntutan" description="25 tuntutan terkini." />
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>No. tuntutan</Th>
                <Th>Panel</Th>
                <Th>Tempoh</Th>
                <Th className="text-right">Invois</Th>
                <Th className="text-right">Jumlah</Th>
                <Th className="text-right">Dibayar</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {claims.length === 0 ? (
                <EmptyRow colSpan={8}>Belum ada tuntutan dibina.</EmptyRow>
              ) : (
                claims.map((c) => (
                  <tr key={c.id}>
                    <Td className="tabular font-medium">{c.claimNo}</Td>
                    <Td>{c.panel.name}</Td>
                    <Td className="tabular text-ink-soft">
                      {formatDateOnly(c.periodStart)} – {formatDateOnly(c.periodEnd)}
                    </Td>
                    <Td className="tabular text-right">{c._count.items}</Td>
                    <Td className="tabular text-right font-medium">{formatRM(c.totalAmount)}</Td>
                    <Td className="tabular text-right text-ink-soft">{formatRM(c.amountPaid)}</Td>
                    <Td>
                      <Badge tone={CLAIM_STATUS_TONE[c.status] ?? "neutral"}>
                        {CLAIM_STATUS_LABEL[c.status] ?? c.status}
                      </Badge>
                    </Td>
                    <Td className="text-right">
                      <ButtonLink href={`/panel/${c.id}`} variant="secondary" size="sm">
                        Buka
                      </ButtonLink>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </TableWrap>
      </Card>

      <Card>
        <CardHeader title="Panel berdaftar" />
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Nama</Th>
                <Th>Jenis</Th>
                <Th>Kod klinik</Th>
                <Th>Kitaran bil</Th>
                <Th>Nota</Th>
              </tr>
            </thead>
            <tbody>
              {panels.length === 0 ? (
                <EmptyRow colSpan={5}>Tiada panel berdaftar.</EmptyRow>
              ) : (
                panels.map((p) => (
                  <tr key={p.id}>
                    <Td className="font-medium">{p.name}</Td>
                    <Td className="text-ink-soft">{p.type}</Td>
                    <Td className="tabular text-ink-soft">{p.clinicCode ?? "-"}</Td>
                    <Td className="text-ink-soft">{p.billingCycle ?? "-"}</Td>
                    <Td className="text-xs text-ink-soft">{p.notes ?? "-"}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </TableWrap>
      </Card>

      <p className="text-xs text-ink-faint">
        Nota: skim MADANI dan PeKa B40 tidak muncul di sini. Tuntutan skim kerajaan
        dihantar melalui portal <Link href="https://protecthealth.com.my" className="underline">PRIMIS
        ProtectHealth</Link>, bukan dari sistem ini.
      </p>
    </div>
  );
}
