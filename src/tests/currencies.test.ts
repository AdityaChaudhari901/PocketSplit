import { describe, expect, it } from "vitest";

import { getCurrencyMinorUnit, isSupportedCurrencyCode, SUPPORTED_CURRENCIES } from "@/lib/currencies";

describe("currency catalog", () => {
  it("includes a broad ISO currency catalog for settings", () => {
    expect(SUPPORTED_CURRENCIES.length).toBeGreaterThan(140);
    expect(isSupportedCurrencyCode("INR")).toBe(true);
    expect(isSupportedCurrencyCode("USD")).toBe(true);
    expect(isSupportedCurrencyCode("JPY")).toBe(true);
    expect(isSupportedCurrencyCode("BHD")).toBe(true);
  });

  it("tracks currencies with non-standard minor units", () => {
    expect(getCurrencyMinorUnit("JPY")).toBe(0);
    expect(getCurrencyMinorUnit("BHD")).toBe(3);
    expect(getCurrencyMinorUnit("INR")).toBe(2);
  });
});
