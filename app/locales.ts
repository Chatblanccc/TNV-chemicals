export const activeLocales = ["en", "zh"] as const;
export const contentLocales = ["en", "zh", "es", "ar", "ru"] as const;

export type Locale = typeof activeLocales[number];
export type ContentLocale = typeof contentLocales[number];

export const localeRegistry: Record<ContentLocale, { label: string; nativeLabel: string; direction: "ltr" | "rtl"; active: boolean }> = {
  en: { label: "English", nativeLabel: "English", direction: "ltr", active: true },
  zh: { label: "Chinese", nativeLabel: "中文", direction: "ltr", active: true },
  es: { label: "Spanish", nativeLabel: "Español", direction: "ltr", active: false },
  ar: { label: "Arabic", nativeLabel: "العربية", direction: "rtl", active: false },
  ru: { label: "Russian", nativeLabel: "Русский", direction: "ltr", active: false },
};

export function isContentLocale(value: string): value is ContentLocale {
  return (contentLocales as readonly string[]).includes(value);
}
