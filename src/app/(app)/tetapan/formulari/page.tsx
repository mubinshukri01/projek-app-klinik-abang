import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page";
import { EmptyRow, Table, TableWrap, Td, Th } from "@/components/ui/table";
import { requireArea } from "@/lib/auth";
import { formatRM } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { SettingsNav } from "../settings-nav";
import { DrugForm } from "./drug-form";

export const metadata: Metadata = { title: "Formulari Ubat" };
export const dynamic = "force-dynamic";

export default async function FormularyPage({ searchParams }: PageProps<"/tetapan/formulari">) {
  await requireArea("tetapan");

  const params = await searchParams;
  const query = (typeof params.cari === "string" ? params.cari : "").trim();

  const drugs = await prisma.drug.findMany({
    where: query ? { name: { contains: query, mode: "insensitive" } } : undefined,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      form: true,
      unit: true,
      sellPrice: true,
      reorderLevel: true,
      defaultDose: true,
      defaultFrequency: true,
      defaultDuration: true,
      instructionsMs: true,
      instructionsEn: true,
      active: true,
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Formulari ubat"
        description="Harga, dos lalai dan arahan label untuk setiap ubat."
      />
      <SettingsNav />

      <Alert tone="danger" title="Semakan doktor diperlukan">
        Dos, arahan dan harga yang dihantar bersama pemasangan adalah <strong>contoh</strong>.
        Doktor yang bertanggungjawab mesti menyemak setiap baris di sini sebelum sistem
        digunakan pada pesakit sebenar.
        <p className="mt-2">
          Menukar harga di sini hanya mempengaruhi preskripsi <strong>baharu</strong>. Invois
          yang lalu menyimpan harganya sendiri dan tidak akan berubah.
        </p>
      </Alert>

      <Card>
        <CardBody>
          <form method="get" className="flex flex-wrap gap-2">
            <Input
              name="cari"
              defaultValue={query}
              placeholder="Cari nama ubat"
              aria-label="Cari ubat"
              className="min-w-64 flex-1"
            />
            <Button type="submit">Cari</Button>
          </form>
        </CardBody>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Ubat</Th>
                <Th>Bentuk</Th>
                <Th className="text-right">Harga</Th>
                <Th>Dos lalai</Th>
                <Th>Arahan label</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {drugs.length === 0 ? (
                <EmptyRow colSpan={7}>Tiada ubat sepadan.</EmptyRow>
              ) : (
                drugs.map((d) => (
                  <tr key={d.id}>
                    <Td className="font-medium">{d.name}</Td>
                    <Td className="text-ink-soft">{d.form}</Td>
                    <Td className="tabular text-right">{formatRM(d.sellPrice)}</Td>
                    <Td className="text-ink-soft">
                      {[d.defaultDose, d.defaultFrequency, d.defaultDuration ? `${d.defaultDuration} hari` : null]
                        .filter(Boolean)
                        .join(" · ") || "-"}
                    </Td>
                    <Td className="max-w-64 truncate text-xs text-ink-soft">
                      {d.instructionsMs ?? "-"}
                    </Td>
                    <Td>
                      <Badge tone={d.active ? "ok" : "neutral"}>
                        {d.active ? "Aktif" : "Tidak aktif"}
                      </Badge>
                    </Td>
                    <Td>
                      <DrugForm
                        drug={{
                          id: d.id,
                          name: d.name,
                          sellPrice: d.sellPrice.toString(),
                          reorderLevel: d.reorderLevel,
                          defaultDose: d.defaultDose ?? "",
                          defaultFrequency: d.defaultFrequency ?? "",
                          defaultDuration: d.defaultDuration ?? 0,
                          instructionsMs: d.instructionsMs ?? "",
                          instructionsEn: d.instructionsEn ?? "",
                          active: d.active,
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
