import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { EmptyRow, Table, TableWrap, Td, Th } from "@/components/ui/table";
import { requireArea } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsNav } from "../settings-nav";
import { PanelForm } from "./panel-form";

export const metadata: Metadata = { title: "Panel" };
export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  CORPORATE: "Korporat",
  TPA: "TPA",
  GOVT: "Kerajaan",
};

export default async function PanelSettingsPage() {
  await requireArea("tetapan");
  const panels = await prisma.panel.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });

  return (
    <div className="space-y-6">
      <PageHeader title="Panel" description="Syarikat dan TPA yang klinik ini melayan." />
      <SettingsNav />

      <Alert tone="info">
        Skim <strong>MADANI</strong> dan <strong>PeKa B40</strong> tidak perlu didaftarkan
        di sini. Kedua-duanya dipilih sebagai jenis penanggung semasa pendaftaran, dan
        tuntutannya dihantar melalui portal PRIMIS ProtectHealth.
      </Alert>

      <Card>
        <CardHeader title="Panel berdaftar" />
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Nama</Th>
                <Th>Jenis</Th>
                <Th>Kod klinik</Th>
                <Th>Kitaran</Th>
                <Th>Hubungan</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {panels.length === 0 ? (
                <EmptyRow colSpan={7}>Tiada panel berdaftar.</EmptyRow>
              ) : (
                panels.map((p) => (
                  <tr key={p.id}>
                    <Td className="font-medium">{p.name}</Td>
                    <Td className="text-ink-soft">{TYPE_LABEL[p.type] ?? p.type}</Td>
                    <Td className="tabular text-ink-soft">{p.clinicCode ?? "-"}</Td>
                    <Td className="text-ink-soft">{p.billingCycle ?? "-"}</Td>
                    <Td className="text-ink-soft">{p.contactPerson ?? "-"}</Td>
                    <Td>
                      <Badge tone={p.active ? "ok" : "neutral"}>
                        {p.active ? "Aktif" : "Tidak aktif"}
                      </Badge>
                    </Td>
                    <Td>
                      <PanelForm
                        panel={{
                          id: p.id,
                          name: p.name,
                          type: p.type,
                          clinicCode: p.clinicCode ?? "",
                          contactPerson: p.contactPerson ?? "",
                          phone: p.phone ?? "",
                          email: p.email ?? "",
                          billingCycle: p.billingCycle ?? "",
                          notes: p.notes ?? "",
                          active: p.active,
                        }}
                      />
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </TableWrap>
      </Card>

      <Card>
        <CardHeader title="Tambah panel baharu" />
        <CardBody>
          <PanelForm />
        </CardBody>
      </Card>
    </div>
  );
}
