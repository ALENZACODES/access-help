/** Non-breaking space (before ":" in French). */
export const NBSP = "\u00A0";
/** Narrow no-break space (before ; ! ? and inside « » in French). */
export const NNBSP = "\u202F";

/** French typography problems in a string (empty when clean). */
export function frenchTypographyIssues(text: string): string[] {
  const issues: string[] = [];
  if (text.includes("'")) issues.push("straight apostrophe (use ’)");
  if (/(?<!\u00A0)(?<!\d):/.test(text) || /[ \u202F]:/.test(text)) {
    issues.push("':' must be preceded by U+00A0");
  }
  if (/(?<!\u202F)[;!?]/.test(text) || /[ \u00A0][;!?]/.test(text)) {
    issues.push("';', '!' and '?' must be preceded by U+202F");
  }
  if (/«(?!\u202F)/.test(text) || /(?<!\u202F)»/.test(text)) {
    issues.push("« » need U+202F inside");
  }
  return issues;
}

/** Wording that must not appear in user copy. */
export const FORBIDDEN_TERMS: readonly RegExp[] = [
  new RegExp(["spinal cord injury ", "ontario"].join(""), "i"),
  new RegExp(String.raw`\b` + "sci" + "o" + String.raw`\b`, "i"),
  new RegExp("scion" + "tario", "i"),
  /\bAI\b/,
  /\bIA\b/,
  /artificial intelligence/i,
  /intelligence artificielle/i,
  /verified/i,
  /v[ée]rifi[ée]/i,
  /\bAAA\b/,
  /conformant/i,
  /conforme/i,
];
