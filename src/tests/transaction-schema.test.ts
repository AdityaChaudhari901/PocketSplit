import { describe, expect, it } from "vitest";

import { majorToMinor, minorToMajorInput } from "@/schemas/transaction.schema";

describe("transaction schema helpers", () => {
  it("returns zero for invalid amount input instead of leaking NaN", () => {
    expect(majorToMinor("")).toBe(0);
    expect(majorToMinor("abc")).toBe(0);
    expect(majorToMinor("12.999")).toBe(0);
  });

  it("formats stored minor units for editing", () => {
    expect(minorToMajorInput(2500000)).toBe("25000");
    expect(minorToMajorInput(42050)).toBe("420.50");
  });

  it("respects currency minor units", () => {
    expect(majorToMinor("2500", "JPY")).toBe(2500);
    expect(majorToMinor("1.234", "BHD")).toBe(1234);
    expect(minorToMajorInput(1234, "BHD")).toBe("1.234");
  });
});
