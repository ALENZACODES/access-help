/**
 * French typography: ’ apostrophe, U+00A0 before ':', U+202F before ; ! ? and
 * inside « ». Each rule can fix a string and, by comparing, report a problem.
 */

export type FrenchRule =
  | 'straight-apostrophe'
  | 'guillemet-spacing'
  | 'colon-spacing'
  | 'high-punctuation-spacing';

const NBSP = ' ';
const NNBSP = ' ';

interface Rule {
  readonly id: FrenchRule;
  readonly fix: (s: string) => string;
}

const RULES: readonly Rule[] = [
  {
    id: 'straight-apostrophe',
    fix: (s) => s.replace(/(?<=\p{L})'(?=\p{L})/gu, '’'),
  },
  {
    id: 'guillemet-spacing',
    fix: (s) => s.replace(/«[\s  ]*([^»]*?)[\s  ]*»/g, `«${NNBSP}$1${NNBSP}»`),
  },
  {
    // "Date: x" and "Date : x" both become "Date<NBSP>: x". "10:30" and URLs are untouched.
    id: 'colon-spacing',
    fix: (s) => s.replace(/(\S)[   ]*:(?=\s|$)/g, `$1${NBSP}:`),
  },
  {
    id: 'high-punctuation-spacing',
    fix: (s) => s.replace(/([^\s(\[«])[   ]*([;!?]+)(?=[\s»)\]]|$)/g, `$1${NNBSP}$2`),
  },
];

export const FRENCH_RULES: readonly FrenchRule[] = RULES.map((r) => r.id);

/** Applies every rule. Idempotent. */
export function fixFrench(text: string): string {
  return RULES.reduce((s, r) => r.fix(s), text);
}

/** Rules a string breaks. Empty means the text already follows them. */
export function frenchIssues(text: string): readonly FrenchRule[] {
  return RULES.filter((r) => r.fix(text) !== text).map((r) => r.id);
}
