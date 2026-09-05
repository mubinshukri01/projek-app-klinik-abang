"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navFor } from "@/lib/access";
import type { Role } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

export function AppNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = navFor(role);

  return (
    <nav aria-label="Navigasi utama" className="flex flex-wrap gap-1">
      {items.map((item) => {
        // "/" hanya sepadan tepat; yang lain sepadan sebagai awalan supaya
        // laluan anak seperti /konsultasi/<id> mengekalkan penanda aktif.
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition",
              active
                ? "bg-brand text-white"
                : "text-ink-soft hover:bg-brand-soft hover:text-brand-dark",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
