import { describe, expect, it } from "vitest";
import {
  balanceDue,
  canCompleteVisit,
  invoiceTotals,
  isClaimable,
  lineAmount,
  patientPaysAtCounter,
} from "@/lib/billing";

describe("lineAmount", () => {
  it("mendarab kuantiti dengan harga seunit", () => {
    expect(lineAmount(24, 0.15)).toBe(3.6);
    expect(lineAmount(1, 25)).toBe(25);
  });

  // 0.1 x 3 ialah 0.30000000000000004 dalam aritmetik titik terapung.
  it("membundarkan ke sen dan bukan meninggalkan hampas titik terapung", () => {
    expect(lineAmount(3, 0.1)).toBe(0.3);
  });

  it("menerima harga sebagai rentetan daripada Decimal Prisma", () => {
    expect(lineAmount(10, "2.50")).toBe(25);
  });
});

describe("invoiceTotals", () => {
  it("menjumlahkan baris", () => {
    const totals = invoiceTotals([
      { quantity: 1, unitPrice: 25 },
      { quantity: 24, unitPrice: 0.15 },
    ]);
    expect(totals.subtotal).toBe(28.6);
    expect(totals.total).toBe(28.6);
  });

  // Ralat pembundaran terkumpul bila banyak baris kecil dijumlahkan.
  it("kekal tepat merentas banyak baris kecil", () => {
    const lines = Array.from({ length: 100 }, () => ({ quantity: 3, unitPrice: 0.1 }));
    expect(invoiceTotals(lines).subtotal).toBe(30);
  });

  it("menggunakan diskaun", () => {
    const totals = invoiceTotals([{ quantity: 1, unitPrice: 50 }], 10);
    expect(totals.discount).toBe(10);
    expect(totals.total).toBe(40);
  });

  // Kakitangan yang tersalah taip diskaun tidak boleh menghasilkan invois negatif.
  it("mengehadkan diskaun kepada subjumlah", () => {
    const totals = invoiceTotals([{ quantity: 1, unitPrice: 30 }], 100);
    expect(totals.discount).toBe(30);
    expect(totals.total).toBe(0);
  });

  it("mengabaikan diskaun negatif", () => {
    const totals = invoiceTotals([{ quantity: 1, unitPrice: 30 }], -10);
    expect(totals.discount).toBe(0);
    expect(totals.total).toBe(30);
  });

  it("menambah cukai selepas diskaun", () => {
    const totals = invoiceTotals([{ quantity: 1, unitPrice: 100 }], 20, 4.8);
    expect(totals.total).toBe(84.8);
  });

  it("mengendalikan invois kosong", () => {
    expect(invoiceTotals([]).total).toBe(0);
  });
});

describe("balanceDue", () => {
  it("mengira baki", () => {
    expect(balanceDue(50, 20)).toBe(30);
  });

  it("tidak pernah negatif bila lebih bayar", () => {
    expect(balanceDue(50, 60)).toBe(0);
  });

  it("sifar bila dijelaskan sepenuhnya", () => {
    expect(balanceDue(28.6, 28.6)).toBe(0);
  });
});

describe("jenis penanggung", () => {
  it("hanya pesakit sendiri membayar di kaunter", () => {
    expect(patientPaysAtCounter("SELF")).toBe(true);
    expect(patientPaysAtCounter("PANEL")).toBe(false);
    expect(patientPaysAtCounter("MADANI")).toBe(false);
    expect(patientPaysAtCounter("PEKA_B40")).toBe(false);
  });

  // Skim kerajaan dituntut melalui PRIMIS, bukan pembina tuntutan sistem ini.
  it("hanya lawatan panel boleh dituntut dari sistem ini", () => {
    expect(isClaimable("PANEL")).toBe(true);
    expect(isClaimable("MADANI")).toBe(false);
    expect(isClaimable("PEKA_B40")).toBe(false);
    expect(isClaimable("SELF")).toBe(false);
  });
});

describe("canCompleteVisit", () => {
  it("menghalang penutupan bila pesakit sendiri masih berhutang", () => {
    const result = canCompleteVisit("SELF", 50, 20);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("30.00");
  });

  it("membenarkan penutupan bila dijelaskan sepenuhnya", () => {
    expect(canCompleteVisit("SELF", 50, 50).ok).toBe(true);
  });

  // Pesakit panel pulang tanpa membayar; panel membayar kemudian.
  it("membenarkan penutupan lawatan panel tanpa bayaran", () => {
    expect(canCompleteVisit("PANEL", 50, 0).ok).toBe(true);
    expect(canCompleteVisit("MADANI", 50, 0).ok).toBe(true);
  });
});
