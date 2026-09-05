import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page";
import { EmptyRow, Table, TableWrap, Td, Th } from "@/components/ui/table";
import { requireArea } from "@/lib/auth";
import { formatDateOnly } from "@/lib/dates";
import { isExpired } from "@/lib/fefo";
import { drugsWithStock, expiringBatches, lowStockDrugs } from "@/lib/inventory";
import { formatRM } from "@/lib/money";

export const metadata: Metadata = { title: "Inventori" };
export const dynamic = "force-dynamic";

export default async function InventoryPage({ searchParams }: PageProps<"/inventori">) {
  await requireArea("inventori");

  const params = await searchParams;
  const query = (typeof params.cari === "string" ? params.cari : "").trim().toLowerCase();

  const [drugs, lowStock, expiring] = await Promise.all([
    drugsWithStock(),
    lowStockDrugs(20),
    expiringBatches(90, 20),
  ]);

  const filtered = query.length > 0 ? drugs.filter((d) => d.name.toLowerCase().includes(query)) : drugs;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventori ubat"
        description={`${drugs.length} ubat aktif dalam formulari.`}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Perlu dipesan"
            description="Stok gabungan sudah mencecah paras pesanan semula."
          />
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Ubat</Th>
                  <Th className="text-right">Ada</Th>
                  <Th className="text-right">Paras</Th>
                </tr>
              </thead>
              <tbody>
                {lowStock.length === 0 ? (
                  <EmptyRow colSpan={3}>Semua stok mencukupi.</EmptyRow>
                ) : (
                  lowStock.map((row) => (
                    <tr key={row.drugId}>
                      <Td>
                        <Link
                          href={`/inventori/${row.drugId}`}
                          className="font-medium text-brand hover:underline"
                        >
                          {row.name}
                        </Link>
                      </Td>
                      <Td className="tabular text-right font-medium text-danger">
                        {row.onHand} {row.unit}
                      </Td>
                      <Td className="tabular text-right text-ink-soft">{row.reorderLevel}</Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </TableWrap>
        </Card>

        <Card>
          <CardHeader
            title="Hampir luput"
            description="Batch yang masih ada stok dan luput dalam 90 hari."
          />
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Ubat</Th>
                  <Th>Batch</Th>
                  <Th className="text-right">Baki</Th>
                  <Th className="text-right">Luput</Th>
                </tr>
              </thead>
              <tbody>
                {expiring.length === 0 ? (
                  <EmptyRow colSpan={4}>Tiada batch hampir luput.</EmptyRow>
                ) : (
                  expiring.map((batch) => (
                    <tr key={batch.id}>
                      <Td>{batch.drug.name}</Td>
                      <Td className="text-ink-soft">{batch.batchNo}</Td>
                      <Td className="tabular text-right">
                        {batch.quantityOnHand} {batch.drug.unit}
                      </Td>
                      <Td className="tabular text-right">
                        {formatDateOnly(batch.expiryDate)}
                        {isExpired(batch.expiryDate) ? (
                          <Badge tone="danger" className="ml-2">
                            Luput
                          </Badge>
                        ) : null}
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </TableWrap>
        </Card>
      </div>

      <Card>
        <CardHeader title="Formulari" description="Semua ubat aktif dan stok semasa." />
        <CardBody>
          <form method="get" className="flex flex-wrap gap-2">
            <Input
              name="cari"
              defaultValue={typeof params.cari === "string" ? params.cari : ""}
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
                <Th className="text-right">Stok</Th>
                <Th className="text-right">Paras pesanan</Th>
                <Th className="text-right">Harga jual</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <EmptyRow colSpan={6}>Tiada ubat sepadan.</EmptyRow>
              ) : (
                filtered.map((drug) => (
                  <tr key={drug.id}>
                    <Td>
                      <Link
                        href={`/inventori/${drug.id}`}
                        className="font-medium text-brand hover:underline"
                      >
                        {drug.name}
                      </Link>
                      {drug.isControlled ? (
                        <Badge tone="warn" className="ml-2">
                          Berjadual
                        </Badge>
                      ) : null}
                    </Td>
                    <Td className="text-ink-soft">{drug.form}</Td>
                    <Td
                      className={
                        drug.onHand === 0
                          ? "tabular text-right font-medium text-danger"
                          : "tabular text-right"
                      }
                    >
                      {drug.onHand} {drug.unit}
                    </Td>
                    <Td className="tabular text-right text-ink-soft">{drug.reorderLevel}</Td>
                    <Td className="tabular text-right text-ink-soft">
                      {formatRM(drug.sellPrice)}
                    </Td>
                    <Td className="text-right">
                      <ButtonLink href={`/inventori/${drug.id}`} variant="secondary" size="sm">
                        Terima stok
                      </ButtonLink>
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
