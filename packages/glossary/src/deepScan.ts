import { lintCopy, type CopyViolation } from './copyRules';
import { lintClaims, type ClaimViolation } from './claimRules';

/**
 * Wording checks that cannot be dodged by hiding a word. Text is looked at three ways: as
 * written, with invisible characters and HTML entities removed, and with its letters spaced
 * out collapsed. Invisible characters have no place in copy, so they are reported too.
 */

const INVISIBLE = /[\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180e\u200b-\u200f\u202a-\u202e\u2060-\u206f\u3164\ufeff\uffa0]/gu;

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  shy: '',
  zwj: '',
  zwnj: '',
  rsquo: '’',
  lsquo: '‘',
  laquo: '«',
  raquo: '»',
  eacute: 'é',
  egrave: 'è',
  agrave: 'à',
  ecirc: 'ê',
  ccedil: 'ç',
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body.startsWith('#')) {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });
}

export function hasInvisibleCharacters(text: string): boolean {
  return new RegExp(INVISIBLE.source, 'u').test(text);
}

/** NFKC (full-width and other look-alike forms become plain letters), entities decoded, invisible characters removed. */
export function normaliseForScan(text: string): string {
  return decodeEntities(text).normalize('NFKC').replace(INVISIBLE, '');
}

/**
 * Collapses "v e r i f i e d", "v-e-r-i-f-i-e-d" and "v.e.r.i.f.i.e.d" into one word. Only runs of four or
 * more single letters are joined, so ordinary text such as "a b c" is left alone.
 */
export function collapseSpelledOut(text: string): string {
  return text.replace(/(?<![\p{L}\p{N}])(?:\p{L}[\s.\-_*·•]+){3,}\p{L}(?![\p{L}\p{N}])/gu, (run) => run.replace(/[\s.\-_*·•]+/gu, ''));
}

export type ScanRule = 'hidden-characters' | CopyViolation['rule'] | ClaimViolation['rule'];

export interface ScanFinding {
  readonly rule: ScanRule;
  readonly match: string;
  /** How the text was read when this was found. */
  readonly view: 'as-written' | 'cleaned' | 'spelled-out';
}

/** Every banned term and unsafe claim in `text`, in every view, without repeats. */
export function scanText(text: string): readonly ScanFinding[] {
  const found: ScanFinding[] = [];
  const seen = new Set<string>();
  const add = (rule: ScanRule, match: string, view: ScanFinding['view']): void => {
    const key = `${rule}|${match.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ rule, match, view });
  };
  if (hasInvisibleCharacters(text)) add('hidden-characters', 'invisible character', 'as-written');
  const cleaned = normaliseForScan(text);
  const views: readonly (readonly [ScanFinding['view'], string])[] = [
    ['as-written', text],
    ['cleaned', cleaned],
    ['spelled-out', collapseSpelledOut(cleaned)],
  ];
  for (const [view, t] of views) {
    for (const v of lintCopy(t)) add(v.rule, v.match, view);
    for (const v of lintClaims(t)) add(v.rule, v.match, view);
  }
  return found;
}

export function passesScan(text: string): boolean {
  return scanText(text).length === 0;
}

/* ---------- markup ---------- */

const TEXT_ATTRIBUTES = ['aria-label', 'aria-description', 'aria-roledescription', 'aria-placeholder', 'aria-valuetext', 'title', 'alt', 'placeholder', 'label'] as const;

/** Text that people hear or see but that is not between tags: aria-label, title, alt, placeholder and similar. */
export function attributeText(html: string): readonly string[] {
  const out: string[] = [];
  const names = TEXT_ATTRIBUTES.join('|');
  for (const m of html.matchAll(new RegExp(`\\s(?:${names})\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'gi'))) {
    const v = decodeEntities(m[1] ?? m[2] ?? '').trim();
    if (v !== '') out.push(v);
  }
  return out;
}

/** Text between tags, with a space where each tag was so words do not run together. */
export function elementText(html: string): string {
  return decodeEntities(html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/** Text between tags with the tags simply removed, so a word split by an inline tag (Real<span>-time</span>) joins up again. */
export function joinedText(html: string): string {
  return decodeEntities(html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

export interface MarkupFinding extends ScanFinding {
  readonly where: 'text' | 'attribute';
}

/** Scans what a page says: its text and its text attributes. Also finds hidden text in comments and data attributes. */
export function scanMarkup(html: string): readonly MarkupFinding[] {
  const out: MarkupFinding[] = [];
  const seen = new Set<string>();
  for (const text of [elementText(html), joinedText(html)]) {
    for (const f of scanText(text)) {
      const key = `${f.rule}|${f.match.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ ...f, where: 'text' });
      }
    }
  }
  for (const a of attributeText(html)) for (const f of scanText(a)) out.push({ ...f, where: 'attribute' });
  for (const m of html.matchAll(/<!--([\s\S]*?)-->/g)) {
    for (const f of scanText(m[1] ?? '')) out.push({ ...f, where: 'text', match: `comment: ${f.match}` });
  }
  return out;
}
