"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH, isSeedPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export interface FormState {
  error: string | null;
  ok?: boolean;
  message?: string;
}

/**
 * Pengguna menukar kata laluan sendiri.
 *
 * Tersedia kepada SEMUA kakitangan, bukan hanya pentadbir. Jika menukar kata
 * laluan memerlukan pentadbir, kakitangan akan berkongsi akaun sebaliknya —
 * yang memusnahkan jejak audit yang diperlukan PDPA.
 */
export async function changeOwnPassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (next.length < MIN_PASSWORD_LENGTH) {
    return { error: `Kata laluan baharu sekurang-kurangnya ${MIN_PASSWORD_LENGTH} aksara.` };
  }
  if (next !== confirm) return { error: "Kata laluan baharu dan pengesahan tidak sama." };
  if (isSeedPassword(next)) {
    return { error: "Kata laluan itu ialah kata laluan lalai sistem. Pilih yang lain." };
  }
  if (next === current) return { error: "Kata laluan baharu mesti berbeza daripada yang lama." };

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!record) return { error: "Akaun tidak dijumpai." };

  // Kata laluan semasa disahkan supaya terminal kaunter yang ditinggalkan
  // terbuka tidak boleh digunakan untuk merampas akaun.
  if (!(await verifyPassword(current, record.passwordHash))) {
    return { error: "Kata laluan semasa salah." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next) },
  });

  await logAudit({
    actorId: user.id,
    action: "UPDATE",
    entity: "User",
    entityId: user.id,
    after: { passwordChanged: true },
  });

  revalidatePath("/akaun");
  return { error: null, ok: true, message: "Kata laluan ditukar." };
}
