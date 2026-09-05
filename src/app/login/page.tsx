import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log Masuk" };

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/");

  const clinic = await prisma.clinic.findFirst({ select: { name: true, city: true } });

  return (
    <main className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-ink">{clinic?.name ?? "Sistem Klinik"}</h1>
          {clinic?.city ? <p className="mt-1 text-sm text-ink-soft">{clinic.city}</p> : null}
        </div>

        <div className="rounded-lg border border-line bg-surface p-6 shadow-sm">
          <LoginForm />
        </div>

        <p className="mt-4 text-center text-xs text-ink-faint">
          Sistem ini mengandungi rekod perubatan. Jangan kongsi akaun anda.
        </p>
      </div>
    </main>
  );
}
