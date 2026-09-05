import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { AREA_LABEL, type Area } from "@/lib/access";
import { ROLE_LABEL, requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Akses Ditolak" };

export default async function AccessDeniedPage({ searchParams }: PageProps<"/akses-ditolak">) {
  const user = await requireUser();
  const params = await searchParams;
  const raw = typeof params.kawasan === "string" ? params.kawasan : null;
  const area = raw && raw in AREA_LABEL ? AREA_LABEL[raw as Area] : null;

  return (
    <main className="mx-auto w-full max-w-md px-4 py-16">
      <Alert tone="warn" title="Akses ditolak">
        {area ? (
          <p>
            Peranan anda ({ROLE_LABEL[user.role]}) tidak dibenarkan membuka bahagian{" "}
            <strong>{area}</strong>.
          </p>
        ) : (
          <p>Peranan anda ({ROLE_LABEL[user.role]}) tidak dibenarkan membuka bahagian ini.</p>
        )}
        <p className="mt-2">
          Jika anda perlukan akses, minta pentadbir klinik menyemak peranan akaun anda.
        </p>
      </Alert>

      <div className="mt-6">
        <ButtonLink href="/" className="w-full">
          Kembali ke halaman utama
        </ButtonLink>
      </div>
    </main>
  );
}
