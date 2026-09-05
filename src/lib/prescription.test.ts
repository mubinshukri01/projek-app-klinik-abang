import { describe, expect, it } from "vitest";
import {
  bmiCategory,
  calculateBmi,
  calculateQuantity,
  parseDose,
  parseFrequencyPerDay,
} from "@/lib/prescription";

describe("parseDose", () => {
  it("membaca dos tunggal", () => {
    expect(parseDose("1")).toBe(1);
    expect(parseDose("2")).toBe(2);
  });

  // Pesakit yang dibenarkan ambil sehingga dua biji mesti pulang dengan
  // bekalan untuk dua, bukan satu.
  it("mengambil had atas bagi julat", () => {
    expect(parseDose("1-2")).toBe(2);
    expect(parseDose("1 hingga 2")).toBe(2);
  });

  it("mengabaikan teks di sekeliling nombor", () => {
    expect(parseDose("5ml")).toBe(5);
    expect(parseDose("2 biji")).toBe(2);
  });

  it("mengembalikan null bagi arahan tanpa nombor", () => {
    expect(parseDose("sapu nipis")).toBeNull();
    expect(parseDose("")).toBeNull();
  });
});

describe("parseFrequencyPerDay", () => {
  it("membaca kekerapan Melayu", () => {
    expect(parseFrequencyPerDay("3 kali sehari")).toBe(3);
    expect(parseFrequencyPerDay("1 kali sehari")).toBe(1);
    expect(parseFrequencyPerDay("4 kali sehari")).toBe(4);
  });

  it("membaca singkatan Latin", () => {
    expect(parseFrequencyPerDay("bd")).toBe(2);
    expect(parseFrequencyPerDay("TDS")).toBe(3);
    expect(parseFrequencyPerDay("qid")).toBe(4);
    expect(parseFrequencyPerDay("od")).toBe(1);
  });

  // Dos "bila perlu" tiada bilangan tetap sehari, jadi kuantiti tidak boleh
  // diteka — doktor mesti memutuskannya.
  it("mengembalikan null untuk bila perlu", () => {
    expect(parseFrequencyPerDay("bila perlu")).toBeNull();
    expect(parseFrequencyPerDay("PRN")).toBeNull();
  });

  it("mengembalikan null untuk kekerapan tidak dikenali", () => {
    expect(parseFrequencyPerDay("ikut arahan doktor")).toBeNull();
  });
});

describe("calculateQuantity", () => {
  it("mengira tablet daripada dos, kekerapan dan tempoh", () => {
    expect(
      calculateQuantity({ form: "TABLET", dose: "1", frequency: "3 kali sehari", durationDays: 5 }),
    ).toBe(15);
  });

  it("mengira kapsul", () => {
    expect(
      calculateQuantity({ form: "KAPSUL", dose: "2", frequency: "2 kali sehari", durationDays: 7 }),
    ).toBe(28);
  });

  it("membekalkan cukup untuk had atas julat dos", () => {
    expect(
      calculateQuantity({ form: "TABLET", dose: "1-2", frequency: "4 kali sehari", durationDays: 3 }),
    ).toBe(24);
  });

  // Mengira 5ml x 3 x 5 = 75 dan mencetak "75 botol" adalah kesilapan berbahaya.
  it("mendispense satu bekas untuk sirap", () => {
    expect(
      calculateQuantity({ form: "SIRAP", dose: "5ml", frequency: "3 kali sehari", durationDays: 5 }),
    ).toBe(1);
  });

  it("mendispense satu bekas untuk krim dan titis", () => {
    expect(
      calculateQuantity({ form: "KRIM", dose: "sapu nipis", frequency: "2 kali sehari", durationDays: 7 }),
    ).toBe(1);
    expect(
      calculateQuantity({ form: "TITIS", dose: "1 titis", frequency: "4 kali sehari", durationDays: 5 }),
    ).toBe(1);
  });

  it("mengembalikan null bila kekerapan bila perlu", () => {
    expect(
      calculateQuantity({ form: "TABLET", dose: "1", frequency: "bila perlu", durationDays: 3 }),
    ).toBeNull();
  });

  it("mengembalikan null bila dos tiada nombor", () => {
    expect(
      calculateQuantity({ form: "TABLET", dose: "ikut arahan", frequency: "3 kali sehari", durationDays: 3 }),
    ).toBeNull();
  });

  it("mengembalikan null bila tempoh tidak sah", () => {
    expect(
      calculateQuantity({ form: "TABLET", dose: "1", frequency: "3 kali sehari", durationDays: 0 }),
    ).toBeNull();
  });

  it("membundarkan ke atas supaya pesakit tidak kekurangan", () => {
    expect(
      calculateQuantity({ form: "TABLET", dose: "0.5", frequency: "3 kali sehari", durationDays: 5 }),
    ).toBe(8);
  });
});

describe("BMI", () => {
  it("mengira BMI kepada satu titik perpuluhan", () => {
    expect(calculateBmi(70, 170)).toBe(24.2);
    expect(calculateBmi(50, 160)).toBe(19.5);
  });

  it("mengembalikan null bila ukuran tiada", () => {
    expect(calculateBmi(null, 170)).toBeNull();
    expect(calculateBmi(70, null)).toBeNull();
    expect(calculateBmi(0, 170)).toBeNull();
  });

  // Ambang Asia digunakan: normal berakhir pada 23, bukan 25.
  it("mengelaskan mengikut ambang Asia", () => {
    expect(bmiCategory(17)).toBe("Kurang berat");
    expect(bmiCategory(21)).toBe("Normal");
    expect(bmiCategory(25)).toBe("Berlebihan berat");
    expect(bmiCategory(30)).toBe("Obes");
  });
});
