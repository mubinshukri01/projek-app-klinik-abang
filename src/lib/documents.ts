/**
 * Peraturan untuk dokumen yang dikeluarkan klinik.
 */

/** Had waras untuk satu MC yang dikeluarkan klinik GP. */
export const MAX_MC_DAYS = 14;

/**
 * Bilangan hari cuti sakit, mengira KEDUA-DUA hari pertama dan terakhir.
 *
 * MC dari 5 hingga 6 September ialah DUA hari cuti, bukan satu. Majikan
 * mengira hari sebegini, dan mengira sebaliknya akan menyebabkan pekerja
 * kehilangan sehari cuti sakit yang sepatutnya.
 */
export function mcDays(from: Date, to: Date): number {
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  const diff = Math.floor((end - start) / 86_400_000);
  return diff + 1;
}

export interface McValidation {
  ok: boolean;
  days: number;
  error?: string;
}

/**
 * Mengesahkan julat tarikh MC.
 *
 * MC yang panjang secara luar biasa hampir selalu kesilapan taip tahun atau
 * bulan. Menyekatnya di sini lebih baik daripada mengeluarkan sijil bertahun
 * yang perlu dibatalkan kemudian.
 */
export function validateMcRange(from: Date | null, to: Date | null): McValidation {
  if (!from || !to) {
    return { ok: false, days: 0, error: "Masukkan tarikh mula dan tarikh tamat." };
  }

  const days = mcDays(from, to);
  if (days < 1) {
    return { ok: false, days, error: "Tarikh tamat tidak boleh sebelum tarikh mula." };
  }
  if (days > MAX_MC_DAYS) {
    return {
      ok: false,
      days,
      error: `MC ${days} hari melebihi had ${MAX_MC_DAYS} hari. Semak tarikh yang dimasukkan.`,
    };
  }
  return { ok: true, days };
}

/** Membersihkan senarai ujian lab yang ditaip pengguna kepada nilai unik. */
export function parseLabTests(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[\n,]/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
    ),
  ];
}
