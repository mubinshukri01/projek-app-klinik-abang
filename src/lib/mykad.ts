/**
 * Penghurai nombor kad pengenalan Malaysia (MyKad).
 *
 * Format: YYMMDD-PB-###G
 *   YYMMDD  tarikh lahir
 *   PB      kod tempat lahir (negeri, atau negara bagi kelahiran luar)
 *   ###G    nombor siri; digit terakhir ganjil = lelaki, genap = perempuan
 *
 * Digunakan di kaunter pendaftaran untuk mengisi borang secara automatik.
 * Nilai yang dihasilkan sentiasa boleh disunting oleh kakitangan — penghuraian
 * ini adalah bantuan menaip, bukan sumber kebenaran.
 */

export type MyKadGender = "LELAKI" | "PEREMPUAN";

export interface MyKadInfo {
  valid: boolean;
  /** 12 digit tanpa sempang */
  digits: string;
  /** Dipaparkan sebagai YYMMDD-PB-###G */
  formatted: string;
  dob: Date | null;
  gender: MyKadGender | null;
  birthState: string | null;
  isForeignBorn: boolean;
  error: string | null;
}

/**
 * Kod tempat lahir. Kod negeri Malaysia adalah muktamad; kod luar negara
 * dipetakan untuk yang biasa ditemui sahaja, selebihnya jatuh ke "Luar Negara".
 */
const BIRTH_PLACE: Record<string, string> = {
  "01": "Johor", "21": "Johor", "22": "Johor", "23": "Johor", "24": "Johor",
  "02": "Kedah", "25": "Kedah", "26": "Kedah", "27": "Kedah",
  "03": "Kelantan", "28": "Kelantan", "29": "Kelantan",
  "04": "Melaka", "30": "Melaka",
  "05": "Negeri Sembilan", "31": "Negeri Sembilan", "59": "Negeri Sembilan",
  "06": "Pahang", "32": "Pahang", "33": "Pahang",
  "07": "Pulau Pinang", "34": "Pulau Pinang", "35": "Pulau Pinang",
  "08": "Perak", "36": "Perak", "37": "Perak", "38": "Perak", "39": "Perak",
  "09": "Perlis", "40": "Perlis",
  "10": "Selangor", "41": "Selangor", "42": "Selangor", "43": "Selangor", "44": "Selangor",
  "11": "Terengganu", "45": "Terengganu", "46": "Terengganu",
  "12": "Sabah", "47": "Sabah", "48": "Sabah", "49": "Sabah",
  "13": "Sarawak", "50": "Sarawak", "51": "Sarawak", "52": "Sarawak", "53": "Sarawak",
  "14": "W.P. Kuala Lumpur", "54": "W.P. Kuala Lumpur", "55": "W.P. Kuala Lumpur",
  "56": "W.P. Kuala Lumpur", "57": "W.P. Kuala Lumpur",
  "15": "W.P. Labuan", "58": "W.P. Labuan",
  "16": "W.P. Putrajaya",
  // Kelahiran luar negara yang biasa ditemui
  "60": "Brunei", "61": "Indonesia", "62": "Kemboja", "63": "Laos",
  "64": "Myanmar", "65": "Filipina", "66": "Singapura", "67": "Thailand",
  "68": "Vietnam", "74": "China", "75": "India", "76": "Pakistan",
  "77": "Arab Saudi", "78": "Sri Lanka", "79": "Bangladesh",
  "82": "Tidak Diketahui",
};

/** Kod 60 ke atas menandakan kelahiran di luar Malaysia. */
function isForeignCode(code: string): boolean {
  return Number(code) >= 60;
}

/** Buang sempang, ruang, dan aksara bukan digit. */
export function normalizeIc(raw: string): string {
  return (raw ?? "").replace(/\D/g, "");
}

/** Papar 12 digit sebagai YYMMDD-PB-###G. */
export function formatIc(raw: string): string {
  const d = normalizeIc(raw);
  if (d.length !== 12) return raw ?? "";
  return `${d.slice(0, 6)}-${d.slice(6, 8)}-${d.slice(8, 12)}`;
}

function invalid(digits: string, error: string): MyKadInfo {
  return {
    valid: false,
    digits,
    formatted: formatIc(digits),
    dob: null,
    gender: null,
    birthState: null,
    isForeignBorn: false,
    error,
  };
}

/**
 * Tentukan abad kelahiran.
 *
 * Andaian: 20YY melainkan tarikh itu belum tiba, barulah 19YY.
 *
 * Had yang diketahui: seseorang berumur lebih 100 tahun yang lahir lebih awal
 * dalam tahun kalendar akan dibaca sebagai bayi. Kakitangan kaunter melihat
 * tarikh yang dihuraikan sebelum menyimpan, jadi kes jarang ini dapat dikesan
 * dan dibetulkan secara manual.
 */
function resolveYear(yy: number, month: number, day: number, today: Date): number {
  const currentCentury = Math.floor(today.getFullYear() / 100) * 100;
  const candidate = currentCentury + yy;
  const asDate = new Date(Date.UTC(candidate, month - 1, day));
  return asDate.getTime() > today.getTime() ? candidate - 100 : candidate;
}

export function parseMyKad(raw: string, today: Date = new Date()): MyKadInfo {
  const digits = normalizeIc(raw);

  if (digits.length === 0) return invalid(digits, "Nombor kad pengenalan kosong.");
  if (digits.length !== 12) {
    return invalid(digits, "Nombor kad pengenalan mesti 12 digit.");
  }

  const yy = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const day = Number(digits.slice(4, 6));
  const placeCode = digits.slice(6, 8);
  const lastDigit = Number(digits.slice(11, 12));

  if (month < 1 || month > 12) {
    return invalid(digits, "Bulan lahir tidak sah dalam nombor kad pengenalan.");
  }
  if (day < 1 || day > 31) {
    return invalid(digits, "Hari lahir tidak sah dalam nombor kad pengenalan.");
  }

  const year = resolveYear(yy, month, day, today);
  const dob = new Date(Date.UTC(year, month - 1, day));

  // Menangkap tarikh melimpah seperti 31 Februari, yang JavaScript diam-diam gulung.
  if (dob.getUTCMonth() !== month - 1 || dob.getUTCDate() !== day) {
    return invalid(digits, "Tarikh lahir tidak wujud dalam kalendar.");
  }

  const birthState = BIRTH_PLACE[placeCode] ?? (isForeignCode(placeCode) ? "Luar Negara" : null);

  return {
    valid: true,
    digits,
    formatted: formatIc(digits),
    dob,
    gender: lastDigit % 2 === 1 ? "LELAKI" : "PEREMPUAN",
    birthState,
    isForeignBorn: isForeignCode(placeCode),
    error: null,
  };
}

/** Umur penuh dalam tahun pada tarikh rujukan. */
export function ageFrom(dob: Date, on: Date = new Date()): number {
  let age = on.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = on.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && on.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age;
}

/** Papar umur ringkas untuk kepala rekod, cth. "34 thn" atau "7 bln". */
export function formatAge(dob: Date | null, on: Date = new Date()): string {
  if (!dob) return "-";
  const years = ageFrom(dob, on);
  if (years >= 1) return `${years} thn`;
  const months =
    (on.getUTCFullYear() - dob.getUTCFullYear()) * 12 + (on.getUTCMonth() - dob.getUTCMonth());
  return `${Math.max(months, 0)} bln`;
}
