import type { Metadata } from "next";
import { AutoRefresh } from "@/components/auto-refresh";
import { getSessionUser, safeEqual } from "@/lib/auth";
import { toDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Paparan Giliran" };
export const dynamic = "force-dynamic";

/**
 * Skrin ruang menunggu.
 *
 * Dua cara capaian dibenarkan: kakitangan yang sudah log masuk (mereka membuka
 * skrin ini daripada papan giliran), atau PC kiosk yang menggunakan URL
 * bertoken supaya TV boleh dihidupkan tanpa sesiapa perlu log masuk padanya.
 */
export default async function DisplayPage({ searchParams }: PageProps<"/paparan">) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const expected = process.env.KIOSK_TOKEN ?? "";

  const staff = await getSessionUser();
  const tokenOk = expected.length > 0 && safeEqual(token, expected);

  if (!staff && !tokenOk) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#08131a] px-6 text-center">
        <div className="max-w-md text-[#9fb4bf]">
          <h1 className="text-2xl font-semibold text-white">Paparan giliran</h1>
          <p className="mt-3 text-sm">
            Skrin ini memerlukan token kiosk. Buka dengan
            <code className="mx-1 rounded bg-white/10 px-1.5 py-0.5">?token=…</code>
            menggunakan nilai KIOSK_TOKEN, atau log masuk sebagai kakitangan.
          </p>
        </div>
      </main>
    );
  }

  const visits = await prisma.visit.findMany({
    where: { queueDate: toDateOnly(), status: { in: ["IN_CONSULT", "WAITING"] } },
    orderBy: { queueNumber: "asc" },
    select: { id: true, queueNumber: true, status: true },
  });

  const serving = visits.filter((v) => v.status === "IN_CONSULT");
  const waiting = visits.filter((v) => v.status === "WAITING");

  return (
    // Skrin TV dipasang jauh dari pesakit, jadi ia menggunakan tema gelap
    // kontras tinggi tersendiri dan bukan tema aplikasi.
    <main className="min-h-screen bg-[#08131a] px-8 py-10 text-white">
      <AutoRefresh seconds={5} />

      <h1 className="text-center text-3xl font-semibold tracking-wide text-[#7fd4c8] uppercase">
        Nombor Giliran
      </h1>

      <section className="mt-10">
        <h2 className="text-center text-lg font-medium tracking-widest text-[#9fb4bf] uppercase">
          Sedang dipanggil
        </h2>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
          {serving.length === 0 ? (
            <p className="text-2xl text-[#5d7683]">—</p>
          ) : (
            serving.map((v) => (
              <div
                key={v.id}
                className="rounded-2xl bg-[#0d7a6f] px-14 py-8 shadow-lg"
                // aria-live supaya pembaca skrin mengumumkan nombor baharu.
                aria-live="polite"
              >
                <span className="tabular text-8xl leading-none font-bold">{v.queueNumber}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-center text-lg font-medium tracking-widest text-[#9fb4bf] uppercase">
          Menunggu ({waiting.length})
        </h2>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          {waiting.length === 0 ? (
            <p className="text-xl text-[#5d7683]">Tiada pesakit menunggu</p>
          ) : (
            waiting.slice(0, 24).map((v) => (
              <span
                key={v.id}
                className="tabular rounded-xl border border-white/15 px-7 py-4 text-4xl font-semibold text-[#cfe3ea]"
              >
                {v.queueNumber}
              </span>
            ))
          )}
        </div>
      </section>

      <p className="mt-16 text-center text-sm text-[#5d7683]">
        Sila tunggu nombor anda dipanggil. Terima kasih atas kesabaran anda.
      </p>
    </main>
  );
}
