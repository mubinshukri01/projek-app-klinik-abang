import { describe, expect, it } from "vitest";
import { ageFrom, formatAge, formatIc, normalizeIc, parseMyKad } from "@/lib/mykad";

// Tarikh tetap supaya ujian abad tidak berubah mengikut masa sebenar.
const TODAY = new Date("2026-09-05T00:00:00Z");

describe("normalizeIc / formatIc", () => {
  it("membuang sempang dan ruang", () => {
    expect(normalizeIc("900101-10-5533")).toBe("900101105533");
    expect(normalizeIc(" 900101 10 5533 ")).toBe("900101105533");
  });

  it("memformat 12 digit dengan sempang", () => {
    expect(formatIc("900101105533")).toBe("900101-10-5533");
  });

  it("mengembalikan input asal bila bukan 12 digit", () => {
    expect(formatIc("12345")).toBe("12345");
  });
});

describe("parseMyKad", () => {
  it("menghurai IC lelaki kelahiran Selangor", () => {
    const r = parseMyKad("900101-10-5533", TODAY);
    expect(r.valid).toBe(true);
    expect(r.dob?.toISOString().slice(0, 10)).toBe("1990-01-01");
    expect(r.gender).toBe("LELAKI");
    expect(r.birthState).toBe("Selangor");
    expect(r.isForeignBorn).toBe(false);
  });

  it("menghurai IC perempuan kelahiran Kuala Lumpur", () => {
    const r = parseMyKad("950215-14-6002", TODAY);
    expect(r.valid).toBe(true);
    expect(r.dob?.toISOString().slice(0, 10)).toBe("1995-02-15");
    expect(r.gender).toBe("PEREMPUAN");
    expect(r.birthState).toBe("W.P. Kuala Lumpur");
  });

  it("menerima input tanpa sempang", () => {
    expect(parseMyKad("900101105533", TODAY).valid).toBe(true);
  });

  // Bayi lahir tahun ini mesti dibaca sebagai 20xx, bukan 19xx.
  it("menghurai bayi yang lahir tahun semasa", () => {
    const r = parseMyKad("250601-10-1234", TODAY);
    expect(r.valid).toBe(true);
    expect(r.dob?.toISOString().slice(0, 10)).toBe("2025-06-01");
    expect(r.gender).toBe("PEREMPUAN");
  });

  // Tarikh yang belum tiba tidak mungkin milik orang hidup, jadi undur satu abad.
  it("mengundurkan abad bila tarikh 20xx masih di masa depan", () => {
    const r = parseMyKad("261231-10-1231", TODAY);
    expect(r.dob?.toISOString().slice(0, 10)).toBe("1926-12-31");
  });

  it("menandakan kelahiran luar negara yang dipetakan", () => {
    const r = parseMyKad("880505-61-1235", TODAY);
    expect(r.valid).toBe(true);
    expect(r.birthState).toBe("Indonesia");
    expect(r.isForeignBorn).toBe(true);
    expect(r.gender).toBe("LELAKI");
  });

  it("jatuh ke 'Luar Negara' untuk kod luar yang tidak dipetakan", () => {
    const r = parseMyKad("880505-71-1234", TODAY);
    expect(r.birthState).toBe("Luar Negara");
    expect(r.isForeignBorn).toBe(true);
  });

  it("menolak panjang yang salah", () => {
    const r = parseMyKad("12345", TODAY);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/12 digit/);
  });

  it("menolak input kosong", () => {
    expect(parseMyKad("", TODAY).valid).toBe(false);
  });

  it("menolak bulan tidak sah", () => {
    const r = parseMyKad("901301-10-5533", TODAY);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/Bulan/);
  });

  it("menolak hari yang tidak wujud dalam kalendar", () => {
    const r = parseMyKad("900231-10-5533", TODAY);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/kalendar/);
  });

  it("menolak hari sifar", () => {
    expect(parseMyKad("900100-10-5533", TODAY).valid).toBe(false);
  });
});

describe("umur", () => {
  it("mengira umur penuh", () => {
    expect(ageFrom(new Date("1990-01-01T00:00:00Z"), TODAY)).toBe(36);
  });

  it("tidak membulatkan ke atas sebelum hari lahir", () => {
    expect(ageFrom(new Date("1990-12-31T00:00:00Z"), TODAY)).toBe(35);
  });

  it("memaparkan bayi dalam bulan", () => {
    expect(formatAge(new Date("2026-02-05T00:00:00Z"), TODAY)).toBe("7 bln");
  });

  it("memaparkan dewasa dalam tahun", () => {
    expect(formatAge(new Date("1990-01-01T00:00:00Z"), TODAY)).toBe("36 thn");
  });

  it("memaparkan sempang bila tarikh lahir tiada", () => {
    expect(formatAge(null, TODAY)).toBe("-");
  });
});
