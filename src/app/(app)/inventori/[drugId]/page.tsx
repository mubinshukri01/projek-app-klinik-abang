import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { EmptyRow, Table, TableWrap, Td, Th } from "@/components/ui/table";
import { requireArea } from "@/lib/auth";
import { formatDateOnly, formatDateTime } from "@/lib/dates";
import { isExpired } from "@/lib/fefo";
import { formatRM } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { AdjustStockForm, ReceiveStockForm, WriteOffForm } from "./stock-forms";

export const metadata: Metadata = { title: "Stok Ubat" };
export const dynamic = "force-dynamic";

const MOVEMENT_LABEL: Record<string, string> = {
  RECEIVE: "Terima",
  DISPENSE: "Dispense",
  ADJUST: "Laras",
  RETURN: "Pulang",
  EXPIRE: "Hapus kira",
};

export default async function DrugStockPage({ params }: PageProps<"/inventori/[drugId]">) {
  await requireArea("inventori");
  const { drugId } = await params;

  const drug = await prisma.drug.findUnique({
    where: { id: drugId },
    select: {
      id: true,
      name: true,
      genericName: true,
      form: true,
      unit: true,
      isControlled: true,
      sellPrice: true,
      reorderLevel: true,
      batches: { orderBy: { expiryDate: "asc" } },
      stockMovements: {
        orderBy: { at: "desc" },
        take: 30,
        select: {
          id: true,
          type: true,
          quantity: true,
          reason: true,
          at: true,
          batch: { select: { batchNo: true } },
          performedBy: { select: { name: true } },
        },
      },
    },
  });

  if (!drug) notFound();

  const onHand = drug.batches.reduce((sum, b) => sum + b.quantityOnHand, 0);
  const usable = drug.batches
    .filter((b) => !isExpired(b.expiryDate))
    .reduce((sum, b) => sum + b.quantityOnHand, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={drug.name}
        description={[drug.genericName, drug.form, formatRM(drug.sellPrice)]
          .filter(Boolean)
          .join(" · ")}
        action={
          <ButtonLink href="/inventori" variant="secondary">
            Kembali
          </ButtonLink>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-xs font-medium text-ink-soft uppercase">Stok boleh guna</p>
            <p
              className={
                usable <= drug.reorderLevel
                  ? "tabular text-2xl font-semibold text-danger"
                  : "tabular text-2xl font-semibold text-ink"
              }
            >
              {usable} {drug.unit}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium text-ink-soft uppercase">Termasuk luput</p>
            <p className="tabular text-2xl font-semibold text-ink">
              {onHand} {drug.unit}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-medium text-ink-soft uppercase">Paras pesanan semula</p>
            <p className="tabular text-2xl font-semibold text-ink">{drug.reorderLevel}</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Terima stok"
          description="Batch dikenal pasti melalui nombor batch dan tarikh luput."
        />
        <CardBody>
          <ReceiveStockForm drugId={drug.id} unit={drug.unit} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Batch"
          description="Susunan mengikut tarikh luput — inilah susunan FEFO mengeluarkan stok."
        />
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Batch</Th>
                <Th>Luput</Th>
                <Th className="text-right">Baki</Th>
                <Th>Pembekal</Th>
                <Th className="text-right">Kos</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {drug.batches.length === 0 ? (
                <EmptyRow colSpan={6}>Tiada batch direkod.</EmptyRow>
              ) : (
                drug.batches.map((batch) => {
                  const expired = isExpired(batch.expiryDate);
                  return (
                    <tr key={batch.id}>
                      <Td className="tabular font-medium">{batch.batchNo}</Td>
                      <Td className="tabular">
                        {formatDateOnly(batch.expiryDate)}
                        {expired ? (
                          <Badge tone="danger" className="ml-2">
                            Luput
                          </Badge>
                        ) : null}
                      </Td>
                      <Td className="tabular text-right font-medium">
                        {batch.quantityOnHand} {drug.unit}
                      </Td>
                      <Td className="text-ink-soft">{batch.supplier ?? "-"}</Td>
                      <Td className="tabular text-right text-ink-soft">
                        {batch.costPrice ? formatRM(batch.costPrice) : "-"}
                      </Td>
                      <Td className="text-right">
                        {expired && batch.quantityOnHand > 0 ? (
                          <WriteOffForm batchId={batch.id} />
                        ) : (
                          <AdjustStockForm
                            batchId={batch.id}
                            currentQuantity={batch.quantityOnHand}
                          />
                        )}
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </TableWrap>
      </Card>

      <Card>
        <CardHeader
          title="Lejar pergerakan stok"
          description="30 pergerakan terkini. Baki batch di atas sentiasa boleh diterangkan oleh lejar ini."
        />
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Masa</Th>
                <Th>Jenis</Th>
                <Th>Batch</Th>
                <Th className="text-right">Kuantiti</Th>
                <Th>Sebab</Th>
                <Th>Oleh</Th>
              </tr>
            </thead>
            <tbody>
              {drug.stockMovements.length === 0 ? (
                <EmptyRow colSpan={6}>Tiada pergerakan direkod.</EmptyRow>
              ) : (
                drug.stockMovements.map((m) => (
                  <tr key={m.id}>
                    <Td className="tabular text-ink-soft">{formatDateTime(m.at)}</Td>
                    <Td>{MOVEMENT_LABEL[m.type] ?? m.type}</Td>
                    <Td className="tabular text-ink-soft">{m.batch?.batchNo ?? "-"}</Td>
                    <Td
                      className={
                        m.quantity < 0
                          ? "tabular text-right font-medium text-danger"
                          : "tabular text-right font-medium text-ok"
                      }
                    >
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </Td>
                    <Td className="text-ink-soft">{m.reason ?? "-"}</Td>
                    <Td className="text-ink-soft">{m.performedBy?.name ?? "-"}</Td>
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
