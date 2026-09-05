import { redirect } from "next/navigation";
import { logAudit } from "@/lib/audit";
import { destroySession } from "@/lib/auth";

/**
 * Log keluar melalui POST supaya pengambilan awal pelayar atau imej yang
 * dibenamkan tidak boleh menamatkan sesi kakitangan secara tidak sengaja.
 */
export async function POST() {
  const userId = await destroySession();
  if (userId) {
    await logAudit({ actorId: userId, action: "LOGOUT", entity: "User", entityId: userId });
  }
  redirect("/login");
}
