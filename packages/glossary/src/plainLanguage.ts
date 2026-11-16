/** Plain-language checks that work for EN and FR without a dictionary. */

export type PlainLanguageRule = 'long-sentence' | 'all-caps-word';

export interface PlainLanguageIssue {
  readonly rule: PlainLanguageRule;
  readonly text: string;
  /** Word count for long-sentence, otherwise 0. */
  readonly words: number;
}

export interface PlainLanguageOptions {
  readonly maxWords?: number;
  /** Upper-case words that are fine (for example a product acronym). */
  readonly allow?: readonly string[];
}

export function splitSentences(text: string): readonly string[] {
  return text
    .split(/(?<=[.!?…])\s+/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function countWords(text: string): number {
  return text.split(/[\s  ]+/u).filter((w) => w.length > 0).length;
}

export function plainLanguageIssues(
  text: string,
  options: PlainLanguageOptions = {},
): readonly PlainLanguageIssue[] {
  const maxWords = options.maxWords ?? 20;
  const allow = new Set((options.allow ?? []).map((a) => a.toUpperCase()));
  const issues: PlainLanguageIssue[] = [];
  for (const sentence of splitSentences(text)) {
    const words = countWords(sentence);
    if (words > maxWords) issues.push({ rule: 'long-sentence', text: sentence, words });
  }
  for (const m of text.matchAll(/(?<![\p{L}])\p{Lu}{4,}(?![\p{L}])/gu)) {
    if (!allow.has(m[0])) issues.push({ rule: 'all-caps-word', text: m[0], words: 0 });
  }
  return issues;
}
