import { describe, expect, it } from 'vitest';
import { listTerms, lookupTerm, searchTerms } from './glossary.js';
import { GLOSSARY_META, TERMS, UNKNOWN_TERM } from './plainTerms.js';

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
      ["verified", "AAA", String.raw`\bAI\b`, "SCI" + "O", "scion" + "tario", "Spinal Cord Injury " + "Ontario"].join("|"),
      "i",
    );
    for (const t of [...TERMS, UNKNOWN_TERM]) {
      for (const l of langs) {
        expect(`${t[l].term} ${t[l].plain}`).not.toMatch(banned);
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
