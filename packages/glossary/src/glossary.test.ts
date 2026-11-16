import { describe, expect, it } from 'vitest';
import { listTerms, lookupTerm, searchTerms, termCountLabel } from './glossary.js';
import { GLOSSARY_META, TERMS, UNKNOWN_TERM } from './plainTerms.js';
import { lintCopy } from './copyRules.js';

const langs = ['en', 'fr'] as const;

describe('terms data', () => {
  it('has unique ids and both languages filled in', () => {
    expect(new Set(TERMS.map((t) => t.id)).size).toBe(TERMS.length);
    for (const t of [...TERMS, UNKNOWN_TERM]) {
      for (const l of langs) {
        expect(t[l].term.length).toBeGreaterThan(0);
        expect(t[l].plain.length).toBeGreaterThan(0);
      }
    }
  });

  it('records source, licence and date', () => {
    expect(GLOSSARY_META.source).not.toBe('');
    expect(GLOSSARY_META.licence).not.toBe('');
    expect(GLOSSARY_META.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('follows the copy rules', () => {
    const banned = new RegExp(
      ["verified", "AAA", String.raw`\bAI\b`].join("|"),
      "i",
    );
    for (const t of [...TERMS, UNKNOWN_TERM]) {
      for (const l of langs) {
        expect(`${t[l].term} ${t[l].plain}`).not.toMatch(banned);
        // The organisation-name rule lives in copyRules, built from character codes.
        expect(lintCopy(`${t[l].term} ${t[l].plain}`)).toEqual([]);
      }
      const fr = `${t.fr.term} ${t.fr.plain}`;
      expect(fr).not.toContain("'");
      expect(fr).not.toMatch(/ [:;!?]/);
      expect(fr).not.toContain('«');
    }
  });
});

describe('lookupTerm', () => {
  it('returns the entry in the requested language', () => {
    expect(lookupTerm('ramp', 'fr')).toMatchObject({ term: 'Rampe', known: true });
    expect(lookupTerm('ramp', 'en')).toMatchObject({ term: 'Ramp', known: true });
  });

  it('keeps unknown as unknown', () => {
    for (const id of ['nope', '', null, undefined]) {
      const r = lookupTerm(id, 'en');
      expect(r.known).toBe(false);
      expect(r.id).toBe('unknown');
    }
    expect(lookupTerm(null, 'fr').term).toBe('Inconnu');
  });
});

describe('listTerms and searchTerms', () => {
  it('lists every term sorted by name', () => {
    const en = listTerms('en');
    expect(en).toHaveLength(TERMS.length);
    expect(en.map((t) => t.term)).toEqual([...en.map((t) => t.term)].sort((a, b) => a.localeCompare(b, 'en')));
  });

  it('searches without caring about accents or apostrophes', () => {
    expect(searchTerms('entree', 'fr').map((t) => t.id)).toContain('step-free-entrance');
    expect(searchTerms('barre dappui', 'fr').map((t) => t.id)).toContain('grab-bar');
    expect(searchTerms('   ', 'en')).toEqual([]);
    expect(searchTerms('zzzz', 'en')).toEqual([]);
  });
});

describe('termCountLabel', () => {
  it('pluralizes in English and French', () => {
    expect(termCountLabel(1, 'en')).toBe('1 term');
    expect(termCountLabel(0, 'en')).toBe('0 terms');
    expect(termCountLabel(2, 'en')).toBe('2 terms');
    expect(termCountLabel(1, 'fr')).toBe('1 terme');
    expect(termCountLabel(0, 'fr')).toBe('0 termes');
    expect(termCountLabel(8, 'fr')).toBe('8 termes');
  });
});

describe('accessible parking wording', () => {
  it('describes what the place marks and stays away from permit eligibility', () => {
    const parking = TERMS.find((t) => t.id === 'accessible-parking');
    expect(parking).toBeDefined();
    const en = parking!.en.plain;
    const fr = parking!.fr.plain;
    expect(en).toMatch(/marks as accessible/i);
    expect(fr).toMatch(/indique comme accessible/);
    expect(`${en} ${fr}`).not.toMatch(/permit|permis|eligib|admissib/i);
  });
});
