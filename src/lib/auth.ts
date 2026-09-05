import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";
// Peraturan akses tinggal dalam modul tulen supaya navigasi klien boleh
// menapis pautan dengan peraturan yang sama.
import { type Area, canAccess } from "@/lib/access";

export type { Area } from "@/lib/access";
export { AREA_ROLES, canAccess, ROLE_LABEL } from "@/lib/access";

export const SESSION_COOKIE = "klinik_sesi";

/**
 * Sesi tamat secara mutlak selepas satu syif. Tiada pelanjutan bergolek —
 * kakitangan log masuk sekali pada permulaan syif, dan sesi yang tertinggal
 * pada komputer kaunter tidak kekal hidup selama-lamanya.
 */
const SESSION_TTL_HOURS = 12;

const BCRYPT_ROUNDS = 12;

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  mmcNumber: string | null;
}

// ─────────────────────────── kata laluan ───────────────────────────

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  return compare(plain, passwordHash);
}

// ─────────────────────────── token sesi ───────────────────────────

/**
 * Hanya hash token yang disimpan. Pangkalan data yang bocor tidak boleh
 * digunakan untuk menyamar sebagai pengguna yang sedang log masuk.
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Perbandingan masa tetap untuk rahsia pendek seperti token kiosk. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// ─────────────────────────── kitaran sesi ───────────────────────────

/** Cipta sesi dan tetapkan kuki. Hanya boleh dipanggil dari Server Action atau Route Handler. */
export async function createSession(
  userId: string,
  meta: { ip?: string | null; userAgent?: string | null } = {},
): Promise<void> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
    },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** Padam sesi semasa dan kosongkan kuki. */
export async function destroySession(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  store.delete(SESSION_COOKIE);
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { userId: true },
  });
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  return session?.userId ?? null;
}

/**
 * Pengguna yang sedang log masuk, atau null.
 *
 * Dibungkus dengan cache() React supaya berbilang komponen pelayan dalam satu
 * render berkongsi satu carian pangkalan data.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      expiresAt: true,
      user: {
        select: { id: true, username: true, name: true, role: true, mmcNumber: true, active: true },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  // Akaun yang dinyahaktifkan kehilangan akses serta-merta, tanpa menunggu sesi tamat.
  if (!session.user.active) return null;

  const { id, username, name, role, mmcNumber } = session.user;
  return { id, username, name, role, mmcNumber };
});

// ─────────────────────────── kawalan akses ───────────────────────────

/** Menuntut sesi yang sah. Ubah hala ke log masuk bila tiada. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Menuntut sesi yang sah DAN akses ke sesuatu kawasan.
 *
 * Menggunakan ubah hala biasa dan bukan forbidden() daripada Next, kerana
 * forbidden() masih experimental dan memerlukan bendera authInterrupts.
 * Sistem klinik tidak sepatutnya bergantung pada API experimental.
 */
export async function requireArea(area: Area): Promise<SessionUser> {
  const user = await requireUser();
  if (!canAccess(user.role, area)) {
    redirect(`/akses-ditolak?kawasan=${encodeURIComponent(area)}`);
  }
  return user;
}

/** Buang sesi yang telah tamat tempoh. Dipanggil semasa log masuk. */
export async function purgeExpiredSessions(): Promise<void> {
  await prisma.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
}
