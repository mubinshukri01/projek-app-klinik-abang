import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark disabled:bg-ink-faint",
  secondary: "bg-surface text-ink border border-line hover:bg-canvas",
  ghost: "bg-transparent text-ink-soft hover:bg-canvas hover:text-ink",
  danger: "bg-danger text-white hover:brightness-110",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  // Sasaran lalai dibesarkan sedikit — kaunter klinik menggunakan tetikus
  // dengan pantas dan kadangkala skrin sentuh.
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    />
  );
}

/**
 * Butang yang menavigasi. Berasingan daripada Button kerana <a> di dalam
 * <button> bukan HTML yang sah.
 */
export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props} />;
}
