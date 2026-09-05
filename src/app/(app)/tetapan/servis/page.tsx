import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { EmptyRow, Table, TableWrap, Td, Th } from "@/components/ui/table";
import { requireArea } from "@/lib/auth";
import { formatRM } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { SettingsNav } from "../settings-nav";
import { ServiceForm } from "./service-form";

export const metadata: Metadata = { title: "Harga Servis" };
export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  KONSULTASI: "Konsultasi",
  PROSEDUR: "Prosedur",
  SUNTIKAN: "Suntikan",
  UJIAN: "Ujian",
  LAIN: "Lain-lain",
};

export default async function ServicePricesPage() {
  await requireArea("tetapan");

  const services = await prisma.serviceItem.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Harga servis"
        description="Caj konsultasi, prosedur, suntikan dan ujian."
      />
      <SettingsNav />

      <Alert tone="info">
        Kod <strong>KON-AM</strong> digunakan sebagai caj konsultasi lalai pada setiap bil
        yang dibina automatik. Jangan nyahaktifkannya melainkan anda menggantinya.
      </Alert>

      <Card>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Kod</Th>
                <Th>Nama</Th>
                <Th>Kategori</Th>
                <Th className="text-right">Harga</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {services.length === 0 ? (
                <EmptyRow colSpan={6}>Tiada servis.</EmptyRow>
              ) : (
                services.map((s) => (
                  <tr key={s.id}>
                    <Td className="tabular font-medium">{s.code}</Td>
                    <Td>{s.name}</Td>
                    <Td className="text-ink-soft">{CATEGORY_LABEL[s.category] ?? s.category}</Td>
                    <Td className="tabular text-right">{formatRM(s.price)}</Td>
                    <Td>
                      <Badge tone={s.active ? "ok" : "neutral"}>
                        {s.active ? "Aktif" : "Tidak aktif"}
                      </Badge>
                    </Td>
                    <Td>
                      <ServiceForm
                        service={{
                          id: s.id,
                          name: s.name,
                          price: s.price.toString(),
                          active: s.active,
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
    </div>
  );
}
