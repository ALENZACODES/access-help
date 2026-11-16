import type { Locale } from "../../switch-first/src/index";

/**
 * Plain-language checks for help copy. They are simple on purpose: they catch
 * long sentences and long runs of words with no full stop, which are the usual
 * reasons a help step is hard to follow with a screen reader or when tired.
 * They do not measure meaning.
 */
export const MAX_WORDS_PER_SENTENCE: Readonly<Record<Locale, number>> = { en: 25, fr: 30 };

export function words(text: string): string[] {
  return text.split(/[\s\u00A0\u202F]+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
}

/** Splits on . ! ? and line ends. A full stop inside a number such as 2.5 does not split. */
export function sentences(text: string): string[] {
  return text
    .split(/(?<![0-9])[.!?…]+(?:[\s\u00A0\u202F]+|$)|\n+/u)
    .map((s) => s.trim())
    .filter((s) => words(s).length > 0);
}

export function longestSentence(text: string): number {
  return sentences(text).reduce((m, s) => Math.max(m, words(s).length), 0);
}

export interface PlainIssue {
  readonly rule: "long-sentence" | "all-caps" | "no-text";
  readonly detail: string;
}

export function plainIssues(text: string, locale: Locale): PlainIssue[] {
  const out: PlainIssue[] = [];
  if (words(text).length === 0) return [{ rule: "no-text", detail: "no words" }];
  const max = MAX_WORDS_PER_SENTENCE[locale];
  for (const s of sentences(text)) {
    const n = words(s).length;
    if (n > max) out.push({ rule: "long-sentence", detail: `${n} words (limit ${max}): ${s.slice(0, 50)}` });
    const letters = s.replace(/[^\p{L}]/gu, "");
    if (letters.length >= 8 && letters === letters.toUpperCase()) out.push({ rule: "all-caps", detail: s.slice(0, 50) });
  }
  return out;
}
