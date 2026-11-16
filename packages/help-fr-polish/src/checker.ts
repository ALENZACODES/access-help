/**
 * French typography checker for plain-text help content.
 *
 * Rules (FR):
 *  - apostrophe: straight ' between letters becomes ’
 *  - colon: U+00A0 (no-break space) before ':'
 *  - high punctuation: U+202F (narrow no-break space) before ; ! ?
 *  - guillemets: U+202F inside « and »; straight "…" pairs become « … »
 *
 * Input is plain text (not HTML). Only ';', '!', '?' and ':' that end a word
 * and are followed by whitespace, a closing mark or end of text are touched,
 * so times (10:30), URLs and query strings are left alone.
 */

export const NBSP = '\u00A0';
export const NNBSP = '\u202F';

export type RuleId =
  | 'apostrophe'
  | 'colon-spacing'
  | 'high-punctuation-spacing'
  | 'guillemet-spacing'
  | 'straight-quotes'
  | 'unbalanced-quote';

export interface LocalizedMessage {
  readonly en: string;
  readonly fr: string;
}

export interface TypographyIssue {
  readonly rule: RuleId;
  /** Offset in the text that was checked. Each rule is evaluated on that text. */
  readonly index: number;
  readonly found: string;
  /** Suggested replacement, or null when no safe automatic fix exists. */
  readonly expected: string | null;
  readonly message: LocalizedMessage;
}

export interface HelpEntry {
  readonly id: string;
  readonly fr: string;
}

export interface EntryReport {
  readonly id: string;
  readonly issues: readonly TypographyIssue[];
}

export const RULE_MESSAGES: Readonly<Record<RuleId, LocalizedMessage>> = {
  apostrophe: {
    en: 'Use the typographic apostrophe (’) in French text.',
    fr: 'Utilisez l’apostrophe typographique (’) dans le texte français.',
  },
  'colon-spacing': {
    en: 'Put a no-break space (U+00A0) before the colon.',
    fr: `Placez une espace insécable (U+00A0) avant les deux-points.`,
  },
  'high-punctuation-spacing': {
    en: 'Put a narrow no-break space (U+202F) before ; ! and ?.',
    fr: `Placez une espace fine insécable (U+202F) avant le point-virgule${NNBSP}, le point d’exclamation et le point d’interrogation.`,
  },
  'guillemet-spacing': {
    en: 'Put a narrow no-break space (U+202F) inside « and ».',
    fr: `Placez une espace fine insécable (U+202F) à l’intérieur des guillemets français.`,
  },
  'straight-quotes': {
    en: 'Replace straight double quotes with « ».',
    fr: 'Remplacez les guillemets droits par des guillemets français.',
  },
  'unbalanced-quote': {
    en: 'Unpaired straight double quote. Fix it by hand.',
    fr: 'Guillemet droit sans pendant. Corrigez-le à la main.',
  },
};

interface Rule {
  readonly id: Exclude<RuleId, 'unbalanced-quote'>;
  /** Must have the g flag and never match the empty string. */
  readonly pattern: RegExp;
  readonly replace: (m: RegExpMatchArray) => string;
}

const STRAIGHT_PAIR = /"([^"\n]+)"/g;

const RULES: readonly Rule[] = [
  {
    id: 'straight-quotes',
    pattern: STRAIGHT_PAIR,
    replace: (m) => `«${NNBSP}${(m[1] ?? '').trim()}${NNBSP}»`,
  },
  {
    id: 'apostrophe',
    pattern: /(\p{L})'(?=\p{L})/gu,
    replace: (m) => `${m[1] ?? ''}’`,
  },
  {
    id: 'colon-spacing',
    pattern: /([\p{L}\p{N}»)])[ \u00A0\u202F]?:(?=\s|$)/gu,
    replace: (m) => `${m[1] ?? ''}${NBSP}:`,
  },
  {
    id: 'high-punctuation-spacing',
    // (?<!&#?\w*) keeps HTML-style entities such as "&amp;" intact.
    pattern: /([\p{L}\p{N})»%’…])(?<!&#?\w*)[ \u00A0\u202F]?([;!?])(?=[\s)»"”]|[;!?]|$)/gu,
    replace: (m) => `${m[1] ?? ''}${NNBSP}${m[2] ?? ''}`,
  },
  {
    id: 'guillemet-spacing',
    pattern: /«[ \u00A0\u202F]*(?=\S)/gu,
    replace: () => `«${NNBSP}`,
  },
  {
    id: 'guillemet-spacing',
    pattern: /(?<=\S)[ \u00A0\u202F]*»/gu,
    replace: () => `${NNBSP}»`,
  },
];

function applyRule(
  rule: Rule,
  text: string,
): { readonly output: string; readonly issues: TypographyIssue[] } {
  const issues: TypographyIssue[] = [];
  let output = '';
  let last = 0;
  for (const m of text.matchAll(rule.pattern)) {
    const index = m.index ?? 0;
    const found = m[0];
    const expected = rule.replace(m);
    output += text.slice(last, index) + expected;
    last = index + found.length;
    if (expected !== found) {
      issues.push({ rule: rule.id, index, found, expected, message: RULE_MESSAGES[rule.id] });
    }
  }
  output += text.slice(last);
  return { output, issues };
}

/** Lists typography problems in French plain text. Empty array means clean. */
export function checkFrTypography(text: string): TypographyIssue[] {
  const issues: TypographyIssue[] = [];
  for (const rule of RULES) {
    issues.push(...applyRule(rule, text).issues);
  }
  const masked = text.replace(STRAIGHT_PAIR, (s) => ' '.repeat(s.length));
  for (let i = masked.indexOf('"'); i !== -1; i = masked.indexOf('"', i + 1)) {
    issues.push({
      rule: 'unbalanced-quote',
      index: i,
      found: '"',
      expected: null,
      message: RULE_MESSAGES['unbalanced-quote'],
    });
  }
  return issues.sort((a, b) => a.index - b.index);
}

/** Applies every automatic fix. Idempotent. Unpaired straight quotes are kept. */
export function fixFrTypography(text: string): string {
  let current = text;
  for (const rule of RULES) {
    current = applyRule(rule, current).output;
  }
  return current;
}

/** Checks a batch of French help entries and returns only those with issues. */
export function checkHelpEntries(entries: readonly HelpEntry[]): EntryReport[] {
  const reports: EntryReport[] = [];
  for (const entry of entries) {
    const issues = checkFrTypography(entry.fr);
    if (issues.length > 0) reports.push({ id: entry.id, issues });
  }
  return reports;
}
