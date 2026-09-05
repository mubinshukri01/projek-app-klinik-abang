"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/tetapan", label: "Profil klinik" },
  { href: "/tetapan/pengguna", label: "Pengguna" },
  { href: "/tetapan/formulari", label: "Formulari ubat" },
  { href: "/tetapan/servis", label: "Harga servis" },
  { href: "/tetapan/panel", label: "Panel" },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Bahagian tetapan" className="flex flex-wrap gap-1 border-b border-line pb-2">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition",
              active
                ? "bg-brand text-white"
                : "text-ink-soft hover:bg-brand-soft hover:text-brand-dark",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
