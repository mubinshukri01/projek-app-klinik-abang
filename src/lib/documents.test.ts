import { describe, expect, it } from "vitest";
import { MAX_MC_DAYS, mcDays, parseLabTests, validateMcRange } from "@/lib/documents";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("mcDays", () => {
  // Majikan mengira hari secara inklusif. MC sehari bermula dan tamat
  // pada tarikh yang sama.
  it("mengira satu hari untuk tarikh yang sama", () => {
    expect(mcDays(d("2026-09-05"), d("2026-09-05"))).toBe(1);
  });

  it("mengira kedua-dua hari pertama dan terakhir", () => {
    expect(mcDays(d("2026-09-05"), d("2026-09-06"))).toBe(2);
    expect(mcDays(d("2026-09-05"), d("2026-09-07"))).toBe(3);
  });

  it("merentasi sempadan bulan", () => {
    expect(mcDays(d("2026-08-30"), d("2026-09-02"))).toBe(4);
  });

  it("mengendalikan tahun lompat", () => {
    expect(mcDays(d("2028-02-28"), d("2028-03-01"))).toBe(3);
  });
});

describe("validateMcRange", () => {
  it("menerima julat yang munasabah", () => {
    const result = validateMcRange(d("2026-09-05"), d("2026-09-07"));
    expect(result.ok).toBe(true);
    expect(result.days).toBe(3);
  });

  it("menolak tarikh tamat sebelum tarikh mula", () => {
    const result = validateMcRange(d("2026-09-07"), d("2026-09-05"));
    expect(result.ok).toBe(false);
    expect(result.error).toContain("sebelum");
  });

  it("menolak tarikh yang tiada", () => {
    expect(validateMcRange(null, d("2026-09-05")).ok).toBe(false);
    expect(validateMcRange(d("2026-09-05"), null).ok).toBe(false);
  });

  // Tersalah taip tahun menghasilkan MC bertahun — tangkap sebelum ia
  // dikeluarkan dan bukan selepas.
  it("menolak julat yang panjang secara luar biasa", () => {
    const result = validateMcRange(d("2026-09-05"), d("2027-09-05"));
    expect(result.ok).toBe(false);
    expect(result.error).toContain(String(MAX_MC_DAYS));
  });

  it("menerima had maksimum tepat", () => {
    const result = validateMcRange(d("2026-09-01"), d("2026-09-14"));
    expect(result.days).toBe(MAX_MC_DAYS);
    expect(result.ok).toBe(true);
  });
});

describe("parseLabTests", () => {
  it("memisahkan mengikut baris baharu dan koma", () => {
    expect(parseLabTests("FBC, RP\nLFT")).toEqual(["FBC", "RP", "LFT"]);
  });

  it("membuang ruang dan entri kosong", () => {
    expect(parseLabTests("  FBC ,, \n  RP  ")).toEqual(["FBC", "RP"]);
  });

  it("membuang pendua", () => {
    expect(parseLabTests("FBC, FBC, RP")).toEqual(["FBC", "RP"]);
  });

  it("mengembalikan tatasusunan kosong untuk input kosong", () => {
    expect(parseLabTests("   ")).toEqual([]);
  });
});
