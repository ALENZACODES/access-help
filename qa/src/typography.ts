/**
 * French punctuation: U+00A0 before ":" only; U+202F before ";", "!", and "?".
 * URLs and clock times are left unchanged.
 */

export const NBSP = "\u00a0";
export const NNBSP = "\u202f";

const MASK = /https?:\/\/\S+|\b\d{1,2}:\d{2}(?::\d{2})?\b/g;

function maskProtected(value: string): { text: string; held: string[] } {
  const held: string[] = [];
  const text = value.replace(MASK, (match) => {
    held.push(match);
    return `\u0000${held.length - 1}\u0000`;
  });
  return { text, held };
}

function unmask(value: string, held: string[]): string {
  return value.replace(/\u0000(\d+)\u0000/g, (_, index: string) => held[Number(index)]!);
}

export function frenchPunctuationIssues(value: string): string[] {
  const issues: string[] = [];
  const { text } = maskProtected(value);
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    const previous = index === 0 ? "" : text[index - 1]!;
    if (character === ":") {
      if (previous !== NBSP) issues.push('":" must be preceded by U+00A0, not U+202F or a regular space');
    } else if (character === ";" || character === "!" || character === "?") {
      if (previous !== NNBSP) {
        issues.push(`"${character}" must be preceded by U+202F, not U+00A0 or a regular space`);
      }
    }
  }
  return [...new Set(issues)];
}

/** Insert or replace the space before French : ; ! ? . Does not touch URLs or times. */
export function fixFrenchPunctuation(value: string): string {
  const { text, held } = maskProtected(value);
  const out: string[] = [];
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    if (character === ":" || character === ";" || character === "!" || character === "?") {
      const required = character === ":" ? NBSP : NNBSP;
      if (out.length > 0) {
        const last = out[out.length - 1]!;
        if (last === " " || last === NBSP || last === NNBSP) out.pop();
      }
      out.push(required, character);
    } else {
      out.push(character);
    }
  }
  return unmask(out.join(""), held);
}
