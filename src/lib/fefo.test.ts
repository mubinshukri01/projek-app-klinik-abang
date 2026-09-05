import { describe, expect, it } from "vitest";
import { allocateFefo, allocateFromBatch, earliestExpiry, isExpired } from "@/lib/fefo";

const TODAY = new Date("2026-09-05T00:00:00Z");

function lot(id: string, batchNo: string, expiry: string, qty: number) {
  return { id, batchNo, expiryDate: new Date(`${expiry}T00:00:00Z`), quantityOnHand: qty };
}

describe("isExpired", () => {
  it("menganggap tarikh lepas sebagai luput", () => {
    expect(isExpired(new Date("2026-08-01T00:00:00Z"), TODAY)).toBe(true);
  });

  // "Guna sebelum" bermaksud hari itu sendiri sudah tidak selamat.
  it("menganggap hari luput itu sendiri sebagai luput", () => {
    expect(isExpired(new Date("2026-09-05T00:00:00Z"), TODAY)).toBe(true);
  });

  it("membenarkan tarikh masa depan", () => {
    expect(isExpired(new Date("2026-09-06T00:00:00Z"), TODAY)).toBe(false);
  });
});

describe("allocateFefo", () => {
  it("memilih batch yang luput paling awal dahulu", () => {
    const batches = [
      lot("b1", "LAMBAT", "2027-06-01", 100),
      lot("b2", "AWAL", "2026-12-01", 100),
    ];
    const result = allocateFefo(batches, 30, TODAY);
    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0]!.batchNo).toBe("AWAL");
    expect(result.allocations[0]!.quantity).toBe(30);
    expect(result.shortfall).toBe(0);
  });

  // Tarikh terima tidak berkaitan — hanya tarikh luput yang menentukan.
  it("mengabaikan susunan input", () => {
    const batches = [
      lot("b1", "AWAL", "2026-10-01", 50),
      lot("b2", "TENGAH", "2026-11-01", 50),
      lot("b3", "LEWAT", "2026-12-01", 50),
    ];
    const result = allocateFefo(batches.reverse(), 10, TODAY);
    expect(result.allocations[0]!.batchNo).toBe("AWAL");
  });

  it("merentasi beberapa batch bila satu tidak mencukupi", () => {
    const batches = [
      lot("b1", "AWAL", "2026-10-01", 10),
      lot("b2", "TENGAH", "2026-11-01", 10),
      lot("b3", "LEWAT", "2026-12-01", 30),
    ];
    const result = allocateFefo(batches, 24, TODAY);
    expect(result.allocations.map((a) => [a.batchNo, a.quantity])).toEqual([
      ["AWAL", 10],
      ["TENGAH", 10],
      ["LEWAT", 4],
    ]);
    expect(result.shortfall).toBe(0);
  });

  // Ini peraturan keselamatan yang paling penting dalam fail ini.
  it("tidak pernah memperuntukkan stok yang telah luput", () => {
    const batches = [
      lot("b1", "LUPUT", "2026-08-01", 500),
      lot("b2", "OK", "2027-01-01", 10),
    ];
    const result = allocateFefo(batches, 20, TODAY);
    expect(result.allocations.map((a) => a.batchNo)).toEqual(["OK"]);
    expect(result.allocations[0]!.quantity).toBe(10);
    // Baki dilaporkan sebagai kekurangan, bukan diambil daripada stok luput.
    expect(result.shortfall).toBe(10);
  });

  it("melangkau batch kosong", () => {
    const batches = [lot("b1", "KOSONG", "2026-10-01", 0), lot("b2", "ADA", "2026-11-01", 20)];
    const result = allocateFefo(batches, 5, TODAY);
    expect(result.allocations.map((a) => a.batchNo)).toEqual(["ADA"]);
  });

  it("melaporkan kekurangan penuh bila tiada stok", () => {
    const result = allocateFefo([], 15, TODAY);
    expect(result.allocations).toEqual([]);
    expect(result.shortfall).toBe(15);
  });

  it("mengembalikan kosong untuk kuantiti sifar", () => {
    const batches = [lot("b1", "ADA", "2026-11-01", 20)];
    expect(allocateFefo(batches, 0, TODAY).allocations).toEqual([]);
  });

  it("memilih secara stabil bila tarikh luput sama", () => {
    const batches = [lot("b2", "B", "2026-10-01", 10), lot("b1", "A", "2026-10-01", 10)];
    expect(allocateFefo(batches, 5, TODAY).allocations[0]!.batchId).toBe("b1");
  });
});

describe("allocateFromBatch", () => {
  it("menghormati batch pilihan farmasi", () => {
    const batches = [
      lot("b1", "AWAL", "2026-10-01", 50),
      lot("b2", "LEWAT", "2026-12-01", 50),
    ];
    const result = allocateFromBatch(batches, 20, "b2", TODAY);
    expect(result.allocations.map((a) => a.batchNo)).toEqual(["LEWAT"]);
  });

  it("kembali kepada FEFO untuk baki", () => {
    const batches = [
      lot("b1", "AWAL", "2026-10-01", 50),
      lot("b2", "LEWAT", "2026-12-01", 5),
    ];
    const result = allocateFromBatch(batches, 20, "b2", TODAY);
    expect(result.allocations.map((a) => [a.batchNo, a.quantity])).toEqual([
      ["LEWAT", 5],
      ["AWAL", 15],
    ]);
  });

  // Menindih tidak boleh menjadi jalan belakang untuk mendispense stok luput.
  it("mengabaikan pilihan yang telah luput", () => {
    const batches = [
      lot("b1", "OK", "2027-01-01", 50),
      lot("b2", "LUPUT", "2026-08-01", 50),
    ];
    const result = allocateFromBatch(batches, 20, "b2", TODAY);
    expect(result.allocations.map((a) => a.batchNo)).toEqual(["OK"]);
  });

  it("mengabaikan pilihan yang tidak wujud", () => {
    const batches = [lot("b1", "OK", "2027-01-01", 50)];
    const result = allocateFromBatch(batches, 20, "tiada", TODAY);
    expect(result.allocations.map((a) => a.batchNo)).toEqual(["OK"]);
  });
});

describe("earliestExpiry", () => {
  // Label mesti menunjukkan tarikh luput TERAWAL antara yang diberi, supaya
  // pesakit tidak menggunakan bekalan melepasi tarikh selamatnya.
  it("mengembalikan peruntukan yang luput paling awal", () => {
    const result = allocateFefo(
      [lot("b1", "AWAL", "2026-10-01", 10), lot("b2", "LEWAT", "2026-12-01", 30)],
      24,
      TODAY,
    );
    expect(earliestExpiry(result.allocations)?.batchNo).toBe("AWAL");
  });

  it("mengembalikan null bila tiada peruntukan", () => {
    expect(earliestExpiry([])).toBeNull();
  });
});
