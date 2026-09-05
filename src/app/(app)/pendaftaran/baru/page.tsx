import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page";
import { requireArea } from "@/lib/auth";
import { PatientForm } from "./patient-form";

export const metadata: Metadata = { title: "Pesakit Baharu" };

export default async function NewPatientPage({ searchParams }: PageProps<"/pendaftaran/baru">) {
  await requireArea("pendaftaran");

  const params = await searchParams;
  // Kakitangan sering mencari dengan IC dahulu, gagal jumpa, kemudian mendaftar.
  // Bawa apa yang mereka sudah taip supaya tidak perlu ditaip semula.
  const initialIc = typeof params.ic === "string" ? params.ic : "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daftar pesakit baharu"
        description="Nombor MyKad akan mengisi tarikh lahir dan jantina secara automatik."
      />
      <PatientForm initialIc={initialIc} />
    </div>
  );
}
