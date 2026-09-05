import { AppNav } from "@/components/app-nav";
import { LogoutButton } from "@/components/logout-button";
import { ROLE_LABEL, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Setiap halaman di bawah kumpulan laluan ini memerlukan sesi. Halaman
  // individu masih memanggil requireArea() untuk semakan peranan.
  const user = await requireUser();
  const clinic = await prisma.clinic.findFirst({ select: { name: true } });

  return (
    <div className="flex min-h-full flex-col">
      <header className="no-print border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          <span className="text-sm font-semibold text-ink">
            {clinic?.name ?? "Sistem Klinik"}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-right text-xs leading-tight text-ink-soft">
              <span className="block font-medium text-ink">{user.name}</span>
              {ROLE_LABEL[user.role]}
            </span>
            <LogoutButton />
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-2">
          <AppNav role={user.role} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
