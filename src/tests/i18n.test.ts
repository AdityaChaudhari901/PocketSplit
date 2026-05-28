import { describe, expect, it } from "vitest";

import { resolveAppLocale, translate } from "@/lib/i18n";

describe("i18n", () => {
  it("resolves explicit app languages before the system locale", () => {
    expect(resolveAppLocale("fr", "es-ES")).toBe("fr");
  });

  it("maps supported device languages when the app follows system language", () => {
    expect(resolveAppLocale("system", "de-DE")).toBe("de");
    expect(resolveAppLocale("system", "ja-JP")).toBe("ja");
  });

  it("falls back to English for unsupported device languages", () => {
    expect(resolveAppLocale("system", "pt-BR")).toBe("en");
    expect(resolveAppLocale("system", null)).toBe("en");
  });

  it("translates keys with interpolation", () => {
    expect(translate("es", "settings.title")).toBe("Ajustes");
    expect(translate("de", "home.greeting", { name: "Aditya" })).toBe("Hallo, Aditya");
    expect(translate("ja", "home.viewMoreTransactions", { count: 5 })).toBe("さらに5件表示");
  });
});
