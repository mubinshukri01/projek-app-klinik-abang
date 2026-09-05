"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, purgeExpiredSessions, verifyPassword } from "@/lib/auth";
import { logAudit, requestIp } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { checkThrottle, clearFailures, recordFailure } from "@/lib/rate-limit";

export interface LoginState {
  error: string | null;
}

const schema = z.object({
  username: z.string().trim().min(1, "Masukkan nama pengguna."),
  password: z.string().min(1, "Masukkan kata laluan."),
});

/** Mesej sama untuk pengguna tidak wujud dan kata laluan salah, supaya
 *  borang log masuk tidak mendedahkan nama pengguna yang sah. */
const BAD_CREDENTIALS = "Nama pengguna atau kata laluan salah.";

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Maklumat tidak lengkap." };
  }

  const username = parsed.data.username.toLowerCase();
  const throttle = checkThrottle(username);
  if (throttle.blocked) {
    const minutes = Math.ceil(throttle.retryAfterSeconds / 60);
    return { error: `Terlalu banyak cubaan. Cuba lagi dalam ${minutes} minit.` };
  }

  const ip = await requestIp();
  const userAgent = (await headers()).get("user-agent");

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, passwordHash: true, active: true },
  });

  // Sentiasa sahkan terhadap satu hash walaupun pengguna tidak wujud, supaya
  // masa tindak balas tidak mendedahkan nama pengguna yang sah.
  const passwordOk = user
    ? await verifyPassword(parsed.data.password, user.passwordHash)
    : await verifyPassword(parsed.data.password, DUMMY_HASH);

  if (!user || !passwordOk || !user.active) {
    recordFailure(username);
    await logAudit({
      action: "LOGIN_FAILED",
      entity: "User",
      entityId: user?.id ?? null,
      after: { username, reason: !user ? "tiada" : !passwordOk ? "kata laluan" : "tidak aktif" },
      ip,
    });
    return { error: BAD_CREDENTIALS };
  }

  clearFailures(username);
  await purgeExpiredSessions();
  await createSession(user.id, { ip, userAgent });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await logAudit({ actorId: user.id, action: "LOGIN", entity: "User", entityId: user.id, ip });

  // redirect() melempar untuk memindahkan kawalan — mesti berada di luar
  // sebarang try/catch supaya ia tidak tertangkap sebagai ralat.
  redirect("/");
}

/** Hash bcrypt sah bagi rentetan yang tiada siapa akan taip; digunakan untuk
 *  menyamakan masa tindak balas bagi nama pengguna yang tidak wujud. */
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO3Zx4Q0lQ0mR8HxK2vGZbW0K9pEHTQAe";
