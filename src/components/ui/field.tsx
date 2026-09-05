import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const CONTROL =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink " +
  "placeholder:text-ink-faint disabled:bg-canvas disabled:text-ink-soft";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("block text-sm font-medium text-ink-soft", className)} {...props} />;
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(CONTROL, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(CONTROL, "min-h-24 resize-y", className)} {...props} />;
}

/**
 * <select> asli digunakan dengan sengaja: ia lebih pantas untuk kemasukan data
 * dengan papan kekunci, berfungsi tanpa JavaScript, dan tidak memerlukan
 * pustaka tambahan untuk kebolehcapaian.
 */
export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(CONTROL, "h-10 pr-8", className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-0.5 text-danger">*</span> : null}
      </Label>
      {children}
      {hint && !error ? <p className="text-xs text-ink-faint">{hint}</p> : null}
      {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
    </div>
  );
}
