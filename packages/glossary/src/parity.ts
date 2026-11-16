import { SAMPLE_ARGS, callSamples } from './inventory';
import { HELP_TOPICS } from './helpCopy';
import { sourceLinks } from './links';
import { QUESTIONS } from './questions';
import { TERMS, UNKNOWN_TERM, type Lang } from './plainTerms';

/** EN/FR checks: every entry exists in both languages, says the same things, and is really translated. */
export type ParityRule =
  | 'missing-key'
  | 'type-mismatch'
  | 'empty'
  | 'untranslated'
  | 'english-in-french'
  | 'french-in-english'
  | 'placeholder-mismatch'
  | 'link-mismatch'
  | 'paragraph-count';

export interface ParityIssue {
  readonly rule: ParityRule;
  readonly where: string;
  readonly detail: string;
}

/** English function words that do not occur in French. One of them in a French string means it was not translated. */
const ENGLISH_WORDS = new Set(['the', 'and', 'your', 'you', 'with', 'this', 'that', 'are', 'not', 'for', 'from', 'of', 'is', 'to']);
/** Letters that English copy does not use. */
const FRENCH_LETTERS = /[àâçéèêëîïôûùüœ]/iu;

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z]+/g) ?? [];
}

/** Strings that may be the same in both languages (names, units, symbols). */
export interface ParityOptions {
  readonly sameOk?: readonly string[];
}

/** Removes the sample names a function was called with, so a label made only of a name is not called untranslated. */
function withoutSamples(text: string): string {
  let out = text;
  for (const arg of SAMPLE_ARGS.flat()) if (typeof arg === 'string') out = out.split(arg).join('');
  return out.replace(/[\s()]+/g, ' ').trim() === '' ? '·' : out;
}

/** Checks one string pair. */
export function stringPair(where: string, en: string, fr: string, options: ParityOptions = {}): readonly ParityIssue[] {
  const out: ParityIssue[] = [];
  const issue = (rule: ParityRule, detail: string): void => void out.push({ rule, where, detail });
  if (en.trim() === '' || fr.trim() === '') {
    issue('empty', en.trim() === '' ? 'English is empty.' : 'French is empty.');
    return out;
  }
  const letters = (s: string): boolean => /\p{L}{2,}/u.test(s);
  if (letters(en) && en.trim().toLowerCase() === fr.trim().toLowerCase() && !(options.sameOk ?? []).includes(en)) {
    issue('untranslated', `French is the same as English: "${en}".`);
  }
  const english = words(fr).filter((w) => ENGLISH_WORDS.has(w));
  if (english.length > 0) issue('english-in-french', `French contains English words: ${[...new Set(english)].join(', ')}.`);
  if (FRENCH_LETTERS.test(en)) issue('french-in-english', 'English contains French letters.');
  const nums = (s: string): string => (s.match(/\d+/g) ?? []).join(',');
  if (nums(en) !== nums(fr)) issue('placeholder-mismatch', `Numbers differ: "${nums(en)}" and "${nums(fr)}".`);
  return out;
}

type Table = Readonly<Record<Lang, Readonly<Record<string, unknown>>>>;

function pairs(where: string, en: unknown, fr: unknown, options: ParityOptions, out: ParityIssue[]): void {
  if (typeof en !== typeof fr) {
    out.push({ rule: 'type-mismatch', where, detail: `English is ${typeof en}, French is ${typeof fr}.` });
    return;
  }
  if (typeof en === 'string') out.push(...stringPair(where, en, fr as string, options));
  else if (typeof en === 'function') {
    const a = callSamples(en as (...a: never[]) => unknown);
    const b = callSamples(fr as (...a: never[]) => unknown);
    if (a.length !== b.length) out.push({ rule: 'placeholder-mismatch', where, detail: 'The two functions accept different inputs.' });
    a.forEach((text, i) => {
      const other = b[i];
      if (other !== undefined) out.push(...stringPair(`${where}#${i}`, withoutSamples(text), withoutSamples(other), options));
    });
  } else if (typeof en === 'object' && en !== null && fr !== null) {
    out.push(...objectParity(where, en as Record<string, unknown>, fr as Record<string, unknown>, options));
  }
}

function objectParity(where: string, en: Record<string, unknown>, fr: Record<string, unknown>, options: ParityOptions): ParityIssue[] {
  const out: ParityIssue[] = [];
  for (const key of new Set([...Object.keys(en), ...Object.keys(fr)])) {
    if (!(key in en) || !(key in fr)) {
      out.push({ rule: 'missing-key', where: `${where}.${key}`, detail: `Only ${key in en ? 'English' : 'French'} has "${key}".` });
      continue;
    }
    pairs(`${where}.${key}`, en[key], fr[key], options, out);
  }
  return out;
}

/** A { en, fr } table of strings and string-building functions. */
export function tableParity(name: string, table: Table, options: ParityOptions = {}): readonly ParityIssue[] {
  return objectParity(name, table.en as Record<string, unknown>, table.fr as Record<string, unknown>, options);
}

/** A table of { en, fr } pairs by id, such as the questions. */
export function recordParity(name: string, record: Readonly<Record<string, Readonly<Record<Lang, string>>>>, options: ParityOptions = {}): readonly ParityIssue[] {
  return Object.entries(record).flatMap(([id, v]) => stringPair(`${name}.${id}`, v.en, v.fr, options));
}

/** Help topics: same number of paragraphs, same glossary links in the same places, both languages really different. */
export function topicParity(topics: typeof HELP_TOPICS = HELP_TOPICS): readonly ParityIssue[] {
  const out: ParityIssue[] = [];
  for (const t of topics) {
    out.push(...stringPair(`help.${t.id}.title`, t.title.en, t.title.fr));
    if (t.body.en.length !== t.body.fr.length) {
      out.push({ rule: 'paragraph-count', where: `help.${t.id}`, detail: `${t.body.en.length} English and ${t.body.fr.length} French paragraphs.` });
      continue;
    }
    t.body.en.forEach((p, i) => {
      const fr = t.body.fr[i] ?? '';
      out.push(...stringPair(`help.${t.id}.${i}`, p, fr));
      const ids = (s: string): string => sourceLinks(s).map((l) => `${l.kind}:${l.href}`).join(',');
      if (ids(p) !== ids(fr)) out.push({ rule: 'link-mismatch', where: `help.${t.id}.${i}`, detail: `English links [${ids(p)}] and French links [${ids(fr)}] differ.` });
    });
  }
  return out;
}

/** Glossary terms: both languages have a name and a description that differ from each other. */
export function glossaryParity(): readonly ParityIssue[] {
  return [...TERMS, UNKNOWN_TERM].flatMap((t) => [
    ...stringPair(`term.${t.id}.term`, t.en.term, t.fr.term),
    ...stringPair(`term.${t.id}.plain`, t.en.plain, t.fr.plain),
  ]);
}

/** Every EN/FR check in the package. */
export function allParity(tables: Readonly<Record<string, Table>>): readonly ParityIssue[] {
  return [
    ...Object.entries(tables).flatMap(([name, t]) => tableParity(`ui.${name}`, t)),
    ...recordParity('question', QUESTIONS),
    ...topicParity(),
    ...glossaryParity(),
  ];
}
