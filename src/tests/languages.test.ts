import { describe, expect, it } from "vitest";

import { APP_LANGUAGE_OPTIONS, getAppLanguageDisplayName, isSupportedAppLanguageCode } from "@/lib/languages";

describe("app language catalog", () => {
  it("includes device default and common app language options", () => {
    expect(APP_LANGUAGE_OPTIONS.map((language) => language.code)).toEqual(["system", "en", "es", "fr", "de", "ja"]);
  });

  it("validates persisted app language codes", () => {
    expect(isSupportedAppLanguageCode("system")).toBe(true);
    expect(isSupportedAppLanguageCode("es")).toBe(true);
    expect(isSupportedAppLanguageCode("hi")).toBe(false);
    expect(isSupportedAppLanguageCode("mr")).toBe(false);
    expect(isSupportedAppLanguageCode("unknown")).toBe(false);
    expect(isSupportedAppLanguageCode(null)).toBe(false);
  });

  it("shows native language names when they differ from English names", () => {
    expect(getAppLanguageDisplayName("en")).toBe("English");
    expect(getAppLanguageDisplayName("es")).toBe("Spanish (Español)");
  });
});
