import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DrugLabel } from "@/components/drug-label";
import { requireArea } from "@/lib/auth";
import { labelForItem } from "@/lib/labels";

export const metadata: Metadata = { title: "Label Ubat" };
export const dynamic = "force-dynamic";

export default async function DrugLabelPage({ params }: PageProps<"/print/label/[itemId]">) {
  await requireArea("dispensari");
  const { itemId } = await params;

  const data = await labelForItem(itemId);
  if (!data) notFound();

  return (
    <div className="label-sheet">
      <DrugLabel data={data} />
    </div>
  );
}
