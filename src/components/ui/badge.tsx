import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "ok" | "warn" | "danger" | "info";

const TONES: Record<Tone, string> = {
  neutral: "bg-canvas text-ink-soft border-line",
  brand: "bg-brand-soft text-brand-dark border-brand-soft",
  ok: "bg-ok-soft text-ok border-ok-soft",
  warn: "bg-warn-soft text-warn border-warn-soft",
  danger: "bg-danger-soft text-danger border-danger-soft",
  info: "bg-info-soft text-info border-info-soft",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
