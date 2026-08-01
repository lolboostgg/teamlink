export type LanguageCode = "en" | "de" | "fr" | "es" | "pl" | "tr";

export interface LanguageMeta {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  flagIso: string;
}

// UI + persistence only — selecting a language here does not translate page
// content yet (that's a separate, much larger project). This exists so the
// switcher behaves exactly like the currency switcher: instant, persisted,
// no reload. flagIso maps to a real SVG in public/flags/ (see FlagIcon) —
// emoji flags don't render on Windows, they just show as text.
export const LANGUAGES: LanguageMeta[] = [
  { code: "en", label: "English", nativeLabel: "English", flagIso: "gb" },
  { code: "de", label: "German", nativeLabel: "Deutsch", flagIso: "de" },
  { code: "fr", label: "French", nativeLabel: "Français", flagIso: "fr" },
  { code: "es", label: "Spanish", nativeLabel: "Español", flagIso: "es" },
  { code: "pl", label: "Polish", nativeLabel: "Polski", flagIso: "pl" },
  { code: "tr", label: "Turkish", nativeLabel: "Türkçe", flagIso: "tr" },
];

const LANGUAGE_BY_CODE = new Map(LANGUAGES.map((l) => [l.code, l]));

export function getLanguageMeta(code: LanguageCode): LanguageMeta {
  return LANGUAGE_BY_CODE.get(code) ?? LANGUAGES[0];
}
