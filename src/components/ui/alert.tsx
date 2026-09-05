import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "info" | "ok" | "warn" | "danger";

const TONES: Record<Tone, string> = {
  info: "border-info bg-info-soft text-info",
  ok: "border-ok bg-ok-soft text-ok",
  warn: "border-warn bg-warn-soft text-warn",
  danger: "border-danger bg-danger-soft text-danger",
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      // role="alert" supaya pembaca skrin mengumumkan amaran seperti alahan
      // sebaik sahaja ia muncul pada skrin konsultasi.
      role="alert"
      className={cn("rounded-md border-l-4 px-3 py-2 text-sm", TONES[tone], className)}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={cn(title && "mt-0.5")}>{children}</div> : null}
    </div>
  );
}
