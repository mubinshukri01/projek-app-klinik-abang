import { describe, expect, it } from "vitest";
import { buildCsv, csvField, csvRow } from "@/lib/csv";

describe("csvField", () => {
  it("membiarkan teks biasa tanpa petikan", () => {
    expect(csvField("Ahmad")).toBe("Ahmad");
    expect(csvField(25.5)).toBe("25.5");
  });

  // Nama Melayu kerap mengandungi koma, cth. "Ahmad bin Ali, Dr".
  it("memetik medan yang mengandungi koma", () => {
    expect(csvField("Ahmad, Dr")).toBe('"Ahmad, Dr"');
  });

  it("melipatgandakan petikan di dalam medan", () => {
    expect(csvField('Klinik "Sihat"')).toBe('"Klinik ""Sihat"""');
  });

  it("memetik medan yang mengandungi baris baharu", () => {
    expect(csvField("baris1\nbaris2")).toBe('"baris1\nbaris2"');
  });

  it("mengembalikan rentetan kosong untuk null dan undefined", () => {
    expect(csvField(null)).toBe("");
    expect(csvField(undefined)).toBe("");
  });
});

describe("csvRow", () => {
  it("menggabungkan medan dengan koma", () => {
    expect(csvRow(["INV-001", "Ahmad", 25])).toBe("INV-001,Ahmad,25");
  });
});

describe("buildCsv", () => {
  it("menghasilkan tajuk dan baris dengan CRLF", () => {
    const csv = buildCsv(["a", "b"], [[1, 2]]);
    expect(csv).toContain("a,b\r\n1,2\r\n");
  });

  // Tanpa BOM, Excel di Windows merosakkan aksara beraksen.
  it("memulakan dengan BOM UTF-8 untuk Excel", () => {
    expect(buildCsv(["a"], [])).toMatch(/^﻿/);
  });
});
