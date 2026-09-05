import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { requireArea } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClinicForm } from "./clinic-form";
import { SettingsNav } from "./settings-nav";

export const metadata: Metadata = { title: "Tetapan" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireArea("tetapan");
  const clinic = await prisma.clinic.findFirst();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tetapan"
        description="Maklumat klinik, pengguna, formulari dan harga."
      />
      <SettingsNav />

      <Alert tone="warn" title="Sebelum klinik beroperasi">
        <ul className="mt-1 list-inside list-disc">
          <li>Tukar semua kata laluan lalai melalui Pengguna.</li>
          <li>
            Doktor mesti menyemak dan mengesahkan setiap dos, arahan label dan
            harga dalam Formulari ubat — data benih adalah contoh sahaja.
          </li>
          <li>Isi nama, alamat dan no. pendaftaran klinik di bawah supaya cetakan betul.</li>
        </ul>
      </Alert>

      <Card>
        <CardHeader
          title="Profil klinik"
          description="Muncul pada kepala surat, resit dan label ubat."
        />
        <CardBody>
          <ClinicForm
            initial={{
              name: clinic?.name ?? "",
              registrationNo: clinic?.registrationNo ?? "",
              addressLine1: clinic?.addressLine1 ?? "",
              addressLine2: clinic?.addressLine2 ?? "",
              postcode: clinic?.postcode ?? "",
              city: clinic?.city ?? "",
              state: clinic?.state ?? "Selangor",
              phone: clinic?.phone ?? "",
              email: clinic?.email ?? "",
              tin: clinic?.tin ?? "",
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
