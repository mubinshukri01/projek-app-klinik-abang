import { beforeEach, describe, expect, it } from "vitest";
import { checkThrottle, clearFailures, recordFailure, resetThrottle } from "@/lib/rate-limit";

describe("pendikit log masuk", () => {
  beforeEach(() => resetThrottle());

  it("membenarkan cubaan bila tiada kegagalan direkod", () => {
    expect(checkThrottle("kaunter").blocked).toBe(false);
  });

  it("membenarkan cubaan sehingga had", () => {
    for (let i = 0; i < 4; i += 1) recordFailure("kaunter");
    expect(checkThrottle("kaunter").blocked).toBe(false);
  });

  it("menyekat selepas lima kegagalan", () => {
    for (let i = 0; i < 5; i += 1) recordFailure("kaunter");
    const result = checkThrottle("kaunter");
    expect(result.blocked).toBe(true);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("menyekat setiap nama pengguna secara berasingan", () => {
    for (let i = 0; i < 5; i += 1) recordFailure("kaunter");
    expect(checkThrottle("doktor").blocked).toBe(false);
  });

  it("log masuk berjaya mengosongkan kiraan", () => {
    for (let i = 0; i < 5; i += 1) recordFailure("kaunter");
    clearFailures("kaunter");
    expect(checkThrottle("kaunter").blocked).toBe(false);
  });

  it("melepaskan sekatan selepas tempoh tamat", () => {
    const start = Date.now();
    for (let i = 0; i < 5; i += 1) recordFailure("kaunter", start);
    expect(checkThrottle("kaunter", start + 60_000).blocked).toBe(true);
    // Sekatan 15 minit; 16 minit kemudian mesti dibenarkan semula.
    expect(checkThrottle("kaunter", start + 16 * 60_000).blocked).toBe(false);
  });

  it("menetapkan semula kiraan bila kegagalan tersebar melebihi tetingkap", () => {
    const start = Date.now();
    for (let i = 0; i < 4; i += 1) recordFailure("kaunter", start);
    // Kegagalan ini berada di luar tetingkap 15 minit, jadi kiraan bermula semula.
    recordFailure("kaunter", start + 16 * 60_000);
    expect(checkThrottle("kaunter", start + 16 * 60_000).blocked).toBe(false);
  });
});
