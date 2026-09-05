import type { DrugForm } from "@/generated/prisma/enums";

/**
 * Bentuk ubat yang didispense sebagai unit boleh dikira, di mana kuantiti
 * bermakna "berapa biji hendak dikira ke dalam bekas".
 *
 * Segala yang lain — sirap, krim, titis, penyedut — dihantar sebagai bekas
 * penuh. Mengira 5ml × 3 kali × 5 hari = 75 dan mencetak "75 botol" pada label
 * adalah kesilapan yang berbahaya, jadi bentuk tersebut menggunakan lalai 1
 * bekas dan doktor melaraskan bila perlu.
 */
const COUNTABLE_FORMS: DrugForm[] = ["TABLET", "KAPSUL"];

export interface QuantityInput {
  form: DrugForm;
  dose: string;
  frequency: string;
  durationDays: number;
}

/**
 * Mengira berapa unit hendak didispense.
 *
 * Mengembalikan null apabila kuantiti tidak boleh dikira dengan yakin — dos
 * "bila perlu", kekerapan yang tidak dikenali, atau dos tanpa nombor. Dalam kes
 * tersebut doktor mesti memasukkan kuantiti sendiri; meneka pada preskripsi
 * bukan pilihan yang selamat.
 */
export function calculateQuantity(input: QuantityInput): number | null {
  if (!COUNTABLE_FORMS.includes(input.form)) return 1;

  const perTake = parseDose(input.dose);
  const perDay = parseFrequencyPerDay(input.frequency);
  const days = Math.floor(input.durationDays);

  if (perTake === null || perDay === null) return null;
  if (!Number.isFinite(days) || days <= 0) return null;

  return Math.ceil(perTake * perDay * days);
}

/**
 * Mengeluarkan bilangan unit setiap kali ambil daripada rentetan dos.
 *
 * Julat seperti "1-2" mengembalikan had ATAS. Pesakit yang diberitahu boleh
 * ambil sehingga dua biji mesti pulang dengan bekalan yang mencukupi untuk itu.
 */
export function parseDose(dose: string): number | null {
  const text = dose.trim().toLowerCase();
  if (text.length === 0) return null;

  const range = /(\d+(?:[.,]\d+)?)\s*(?:-|hingga|ke)\s*(\d+(?:[.,]\d+)?)/.exec(text);
  if (range) return toNumber(range[2]!);

  const single = /(\d+(?:[.,]\d+)?)/.exec(text);
  if (single) return toNumber(single[1]!);

  // Arahan seperti "sapu nipis" tiada kiraan yang boleh diambil.
  return null;
}

/**
 * Menukar kekerapan kepada bilangan kali sehari.
 *
 * Menerima kedua-dua istilah Melayu dan singkatan Latin yang masih biasa
 * digunakan pada preskripsi Malaysia.
 */
export function parseFrequencyPerDay(frequency: string): number | null {
  const text = frequency.trim().toLowerCase();
  if (text.length === 0) return null;

  // "bila perlu" / PRN tiada bilangan tetap sehari.
  if (text.includes("bila perlu") || text.includes("prn")) return null;

  const kali = /(\d+)\s*kali\s*sehari/.exec(text);
  if (kali) return Number(kali[1]);

  const LATIN: Record<string, number> = {
    od: 1, // sekali sehari
    on: 1, // waktu malam
    bd: 2,
    tds: 3,
    tid: 3,
    qid: 4,
    qds: 4,
  };
  const latin = /^([a-z]+)$/.exec(text);
  if (latin && latin[1]! in LATIN) return LATIN[latin[1]!]!;

  if (text.includes("sekali sehari") || text.includes("sehari sekali")) return 1;

  return null;
}

function toNumber(raw: string): number | null {
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Mengira BMI daripada berat dan tinggi, dibundarkan ke 1 titik perpuluhan. */
export function calculateBmi(weightKg: number | null, heightCm: number | null): number | null {
  if (!weightKg || !heightCm) return null;
  if (weightKg <= 0 || heightCm <= 0) return null;
  const metres = heightCm / 100;
  return Math.round((weightKg / (metres * metres)) * 10) / 10;
}

/** Pengelasan BMI untuk dewasa, digunakan sebagai panduan paparan sahaja. */
export function bmiCategory(bmi: number | null): string | null {
  if (bmi === null) return null;
  if (bmi < 18.5) return "Kurang berat";
  if (bmi < 23) return "Normal";
  if (bmi < 27.5) return "Berlebihan berat";
  return "Obes";
}
