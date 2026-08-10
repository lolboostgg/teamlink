import "server-only";
import { cookies } from "next/headers";
import { LANGUAGES, type LanguageCode } from "@/lib/i18n";

export async function getServerLanguage(): Promise<LanguageCode> {
  const value = (await cookies()).get("qup:language")?.value;
  return LANGUAGES.some(language => language.code === value) ? value as LanguageCode : "en";
}
