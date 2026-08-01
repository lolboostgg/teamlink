export type LanguageCode = "en" | "de" | "fr" | "es" | "pl" | "tr";

export interface LanguageMeta {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  flag: string;
}

// UI + persistence only — selecting a language here does not translate page
// content yet (that's a separate, much larger project). This exists so the
// switcher behaves exactly like the currency switcher: instant, persisted,
// no reload.
export const LANGUAGES: LanguageMeta[] = [
  { code: "en", label: "English", nativeLabel: "English", flag: "🇬🇧" },
  { code: "de", label: "German", nativeLabel: "Deutsch", flag: "🇩🇪" },
  { code: "fr", label: "French", nativeLabel: "Français", flag: "🇫🇷" },
  { code: "es", label: "Spanish", nativeLabel: "Español", flag: "🇪🇸" },
  { code: "pl", label: "Polish", nativeLabel: "Polski", flag: "🇵🇱" },
  { code: "tr", label: "Turkish", nativeLabel: "Türkçe", flag: "🇹🇷" },
];

const LANGUAGE_BY_CODE = new Map(LANGUAGES.map((l) => [l.code, l]));

export function getLanguageMeta(code: LanguageCode): LanguageMeta {
  return LANGUAGE_BY_CODE.get(code) ?? LANGUAGES[0];
}
