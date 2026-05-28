export const APP_LANGUAGE_OPTIONS = [
  {
    code: "system",
    name: "Device language",
    nativeName: "Device language",
    region: "Follows iPhone or Android settings"
  },
  {
    code: "en",
    name: "English",
    nativeName: "English",
    region: "Default app language"
  },
  {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    region: "Global"
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    region: "Global"
  },
  {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    region: "Global"
  },
  {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    region: "Japan"
  }
] as const;

export type AppLanguageCode = (typeof APP_LANGUAGE_OPTIONS)[number]["code"];

export const DEFAULT_APP_LANGUAGE: AppLanguageCode = "system";

export const isSupportedAppLanguageCode = (value: unknown): value is AppLanguageCode =>
  typeof value === "string" && APP_LANGUAGE_OPTIONS.some((language) => language.code === value);

export const getAppLanguageOption = (code: AppLanguageCode) =>
  APP_LANGUAGE_OPTIONS.find((language) => language.code === code) ?? APP_LANGUAGE_OPTIONS[0];

export const getAppLanguageDisplayName = (code: AppLanguageCode): string => {
  const language = getAppLanguageOption(code);
  return language.nativeName === language.name ? language.name : `${language.name} (${language.nativeName})`;
};
