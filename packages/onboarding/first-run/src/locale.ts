import type { Locale } from "../../switch-first/src/index";

export const LOCALES: readonly Locale[] = ["en", "fr"];

export function isLocale(v: unknown): v is Locale {
  return v === "en" || v === "fr";
}

/**
 * Chooses the interface language. A stored choice wins. Otherwise the first
 * requested language whose primary subtag is English or French is used
 * ("fr-CA" gives "fr"). Anything else falls back to English.
 */
export function negotiateLocale(
  requested: readonly string[],
  stored?: string | undefined,
  fallback: Locale = "en",
): Locale {
  if (isLocale(stored)) return stored;
  for (const tag of requested) {
    const primary = tag.trim().toLowerCase().split(/[-_]/)[0];
    if (isLocale(primary)) return primary;
  }
  return fallback;
}

export function otherLocale(l: Locale): Locale {
  return l === "en" ? "fr" : "en";
}

/** Name of a language written in that language. */
export function nativeName(l: Locale): string {
  return l === "en" ? "English" : "Français";
}

/** Sets the page language so assistive technology picks the right voice (WCAG 3.1.1). */
export function applyLocale(doc: Document, l: Locale): void {
  doc.documentElement.lang = l;
}
