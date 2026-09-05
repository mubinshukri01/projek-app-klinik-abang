/**
 * Pembantu tarikh.
 *
 * Klinik beroperasi mengikut waktu tempatan Malaysia (UTC+8). Proses pelayan
 * hendaklah dijalankan dengan TZ=Asia/Kuala_Lumpur — lihat docker-compose.yml.
 * Semua "hari ini" di sini bermaksud hari tempatan, bukan hari UTC, supaya
 * penutupan kaunter pada pukul 11 malam tidak jatuh ke tarikh esok.
 */

/** Tengah malam waktu tempatan pada permulaan hari yang diberi. */
export function startOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Tepat sebelum tengah malam waktu tempatan pada penghujung hari yang diberi. */
export function endOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Menukar hari tempatan kepada nilai untuk lajur @db.Date.
 *
 * Postgres menyimpan DATE tanpa zon waktu, dan Prisma menghantarnya sebagai
 * cap masa UTC. Mengambil komponen tarikh TEMPATAN dan meletakkannya pada
 * tengah malam UTC menghalang tarikh daripada beralih sehari ke belakang
 * apabila pelayan berada di UTC+8.
 */
export function toDateOnly(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

/** Memformat nilai @db.Date untuk paparan tanpa peralihan zon waktu. */
export function formatDateOnly(date: Date | null | undefined): string {
  if (!date) return "-";
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${date.getUTCFullYear()}`;
}

/** Memformat cap masa penuh untuk paparan, cth. "05/09/2026 14:32". */
export function formatDateTime(date: Date | null | undefined): string {
  if (!date) return "-";
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${d}/${m}/${date.getFullYear()} ${hh}:${mm}`;
}

/** Memformat masa sahaja, cth. "14:32". */
export function formatTime(date: Date | null | undefined): string {
  if (!date) return "-";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Nilai untuk <input type="date">. */
export function toDateInput(date: Date | null | undefined): string {
  if (!date) return "";
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Menghurai nilai <input type="date"> kepada nilai lajur @db.Date. */
export function fromDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return Number.isNaN(date.getTime()) ? null : date;
}
