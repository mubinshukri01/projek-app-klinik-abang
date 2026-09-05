/**
 * Pendikit cubaan log masuk dalam ingatan.
 *
 * Sistem ini berjalan sebagai satu proses pada satu mini PC dalam klinik, jadi
 * kiraan dalam ingatan sudah memadai dan tidak memerlukan Redis. Kiraan hilang
 * bila proses dimulakan semula — boleh diterima, kerana ia hanya melambatkan
 * tekaan kata laluan, bukan kawalan keselamatan utama.
 */

interface Attempt {
  count: number;
  firstAt: number;
  blockedUntil: number | null;
}

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const BLOCK_MS = 15 * 60 * 1000;

const attempts = new Map<string, Attempt>();

export interface ThrottleResult {
  blocked: boolean;
  /** Baki saat sebelum boleh cuba lagi. */
  retryAfterSeconds: number;
}

export function checkThrottle(key: string, now = Date.now()): ThrottleResult {
  const entry = attempts.get(key);
  if (!entry) return { blocked: false, retryAfterSeconds: 0 };

  if (entry.blockedUntil && entry.blockedUntil > now) {
    return {
      blocked: true,
      retryAfterSeconds: Math.ceil((entry.blockedUntil - now) / 1000),
    };
  }

  // Tetingkap atau sekatan telah tamat — mulakan kiraan semula.
  if (now - entry.firstAt > WINDOW_MS) {
    attempts.delete(key);
  }
  return { blocked: false, retryAfterSeconds: 0 };
}

export function recordFailure(key: string, now = Date.now()): void {
  const entry = attempts.get(key);

  if (!entry || now - entry.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now, blockedUntil: null });
    return;
  }

  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_MS;
  }
}

export function clearFailures(key: string): void {
  attempts.delete(key);
}

/** Untuk ujian — kosongkan semua keadaan yang direkod. */
export function resetThrottle(): void {
  attempts.clear();
}
