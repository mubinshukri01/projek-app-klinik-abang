import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@/generated/prisma/client";

type AuditClient = Pick<PrismaClient, "auditLog">;

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "LOGIN_FAILED"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "VIEW"
  | "VOID"
  | "DISPENSE"
  | "PAYMENT"
  | "STOCK";

export interface AuditEntry {
  actorId?: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
}

/** Alamat IP pemanggil di belakang proksi terbalik klinik. */
export async function requestIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip");
}

/**
 * Menulis satu entri jejak audit (keperluan PDPA 2010).
 *
 * Kegagalan audit tidak boleh menggagalkan tindakan klinikal yang dilakukan
 * kakitangan — ralat dicatat ke log pelayan dan bukan dilempar semula.
 */
export async function logAudit(entry: AuditEntry, client: AuditClient = prisma): Promise<void> {
  try {
    await client.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        before: toJson(entry.before),
        after: toJson(entry.after),
        ip: entry.ip ?? (await requestIp()),
      },
    });
  } catch (error) {
    console.error("[audit] gagal menulis entri audit", entry.action, entry.entity, error);
  }
}

/**
 * Prisma menolak nilai seperti Decimal dan Date dalam medan Json, jadi kitar
 * melalui JSON dahulu. Mengembalikan undefined supaya medan nullable kekal NULL.
 */
function toJson(value: unknown) {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value, (_key, v) =>
    typeof v === "bigint" ? v.toString() : v,
  ));
}
