import type { Metadata } from "next";
import { DrugLabel } from "@/components/drug-label";
import { requireArea } from "@/lib/auth";
import { labelsForVisit } from "@/lib/labels";

export const metadata: Metadata = { title: "Label Ubat" };
export const dynamic = "force-dynamic";

export default async function VisitLabelsPage({
  params,
}: PageProps<"/print/label/lawatan/[visitId]">) {
  await requireArea("dispensari");
  const { visitId } = await params;

  const labels = await labelsForVisit(visitId);

  if (labels.length === 0) {
    return (
      <p className="p-6 text-sm text-ink-soft">
        Tiada ubat yang telah didispense untuk lawatan ini. Label hanya boleh dicetak
        selepas batch dipilih dan stok ditolak.
      </p>
    );
  }

  return (
    <div className="label-sheet">
      {labels.map((data, index) => (
        <DrugLabel key={`${data.drugName}-${index}`} data={data} />
      ))}
    </div>
  );
}
