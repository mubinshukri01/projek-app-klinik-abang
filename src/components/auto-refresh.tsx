"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Menyegarkan semula komponen pelayan pada selang masa tetap.
 *
 * Tinjauan digunakan dan bukan SSE atau WebSocket dengan sengaja: sistem ini
 * berjalan pada LAN klinik dengan kurang daripada 100 pesakit sehari, jadi
 * satu permintaan setiap beberapa saat tidak bermakna apa-apa, dan tinjauan
 * pulih sendiri selepas WiFi kaunter terputus seketika — tiada sambungan untuk
 * disambung semula.
 */
export function AutoRefresh({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);

  return null;
}
