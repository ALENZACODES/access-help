/**
 * Test helpers for the mapping-day planning modules, with tests of their own.
 * Banned words are built from fragments so this file never contains one literally.
 */
import { describe, expect, it } from 'vitest';
import { NBSP, NNBSP } from './day-text';

const A = 'ver';
const B = 'ifi';
const BANNED_PARTS: readonly (readonly string[])[] = [
  [A, B, 'ed'],
  [A, B, 'es'],
  [A, B, 'cation'],
  [A, 'ify'],
  [A, B, 'é'],
  ['real', '-time'],
  ['real', ' time'],
  ['temps ', 'réel'],
  ['part', 'nership'],
  ['partenar', 'iat'],
  ['guar', 'antee'],
  ['garan', 'tie'],
  ['garan', 'ti'],
  ['certi', 'fied'],
  ['certi', 'fié'],
  ['approved', ' by'],
  ['of', 'ficial'],
];
const BANNED = BANNED_PARTS.map((parts) => parts.join(''));

/** Banned or overclaiming words found in some text, lower-cased. */
export function bannedIn(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED.filter((word) => lower.includes(word));
}

export interface FrenchProblem {
  rule: 'apostrophe' | 'colon' | 'percent' | 'high-punctuation';
  at: number;
  context: string;
}

/** Finds French typography mistakes. Skips code spans, web addresses and XML-like tags. */
export function lintFrench(text: string): FrenchProblem[] {
  const clean = text.replace(/`[^`]*`/g, (m) => ' '.repeat(m.length)).replace(/https?:\/\/\S+/g, (m) => ' '.repeat(m.length)).replace(/<[^>]*>/g, (m) => ' '.repeat(m.length));
  const problems: FrenchProblem[] = [];
  const push = (rule: FrenchProblem['rule'], at: number) => problems.push({ rule, at, context: text.slice(Math.max(0, at - 12), at + 12) });
  for (const m of clean.matchAll(/'/g)) push('apostrophe', m.index ?? 0);
  for (const m of clean.matchAll(/(?<![\u00a0\d:/])(?<!\u202f):(?!\/\/)(?=\s|$)/g)) {
    const at = m.index ?? 0;
    if (clean[at - 1] !== NBSP) push('colon', at);
  }
  for (const m of clean.matchAll(/(?<!\u00a0)%/g)) push('percent', m.index ?? 0);
  for (const m of clean.matchAll(/(?<!\u202f)[;!?]/g)) push('high-punctuation', m.index ?? 0);
  return problems;
}

/** Every string in a nested value, for scanning whole tables of copy. */
export function allStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(allStrings);
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(allStrings);
  return [];
}

describe('banned words', () => {
  it('finds a banned word in any case', () => {
    expect(bannedIn(`It is ${'VER'}${'IFIED'}.`)).toEqual([`${A}${B}ed`]);
    expect(bannedIn('real-time data')).toEqual(['real-time']);
  });
  it('is quiet on ordinary copy', () => {
    expect(bannedIn('You recorded 3 places. UNKNOWN stays UNKNOWN.')).toEqual([]);
  });
  it('catches the French forms', () => {
    expect(bannedIn(`aucune ${'garan'}${'tie'}`).length).toBeGreaterThan(0);
    expect(bannedIn(`${A}${B}é par`).length).toBeGreaterThan(0);
  });
});

describe('French typography lint', () => {
  it('accepts correct spacing', () => {
    expect(lintFrench(`Prévu${NBSP}: l’entrée${NNBSP}; 50${NBSP}% fait${NNBSP}!`)).toEqual([]);
  });
  it('flags a straight apostrophe, a bare colon, a bare percent and bare high punctuation', () => {
    expect(lintFrench("l'entrée").map((p) => p.rule)).toEqual(['apostrophe']);
    expect(lintFrench('Prévu : oui').map((p) => p.rule)).toEqual(['colon']);
    expect(lintFrench('50 %').map((p) => p.rule)).toEqual(['percent']);
    expect(lintFrench('Vraiment?').map((p) => p.rule)).toEqual(['high-punctuation']);
  });
  it('skips code, addresses and tags', () => {
    expect(lintFrench('Voir `a:b` et https://example.org/x?y=1 et <a href="x">')).toEqual([]);
  });
  it('does not flag a time or a ratio', () => {
    expect(lintFrench('Rendez-vous à 10:30 ou 1:2')).toEqual([]);
  });
});

describe('allStrings', () => {
  it('collects strings from nested tables', () => {
    expect(allStrings({ a: 'x', b: [{ c: 'y' }, 3], d: { e: 'z' } })).toEqual(['x', 'y', 'z']);
  });
});
