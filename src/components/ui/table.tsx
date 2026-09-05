import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Jadual lebar mesti menatal dalam bekasnya sendiri, bukan menolak halaman. */
export function TableWrap({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("w-full overflow-x-auto", className)} {...props} />;
}

export function Table({ className, ...props }: ComponentProps<"table">) {
  return <table className={cn("w-full border-collapse text-sm", className)} {...props} />;
}

export function Th({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "border-b border-line bg-canvas px-3 py-2 text-left text-xs font-semibold",
        "whitespace-nowrap text-ink-soft uppercase",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("border-b border-line-soft px-3 py-2 align-top", className)} {...props} />;
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-8 text-center text-sm text-ink-faint">
        {children}
      </td>
    </tr>
  );
}
