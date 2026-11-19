import { describe, expect, it } from 'vitest';
import { TERMS as CATALOG } from './terms';
import { frenchIssues } from './index';

/**
 * The editorial notes of the term catalogue. A note must not use the wording kept out of user
 * copy, in either language. The catalogue's own labels are app-wide terms and are not judged here.
 */
const KEPT_OUT = /v[eé]rif/i;

describe('term catalogue notes', () => {
  it('has a note in both languages for every term', () => {
    expect(CATALOG.length).toBeGreaterThan(20);
    for (const term of CATALOG) {
      expect(term.note.trim(), term.id).not.toBe('');
      expect(term.noteFr.trim(), term.id).not.toBe('');
    }
  });
  it('keeps the wording that is kept out of user copy out of every note', () => {
    for (const term of CATALOG) {
      expect(KEPT_OUT.test(term.note), `${term.id}: ${term.note}`).toBe(false);
      expect(KEPT_OUT.test(term.noteFr), `${term.id}: ${term.noteFr}`).toBe(false);
    }
  });
  it('says an entrance stays UNKNOWN until it is checked, in both languages', () => {
    const entrance = CATALOG.find((t) => t.id === 'entrance');
    expect(entrance?.note).toBe('Distinguish each entrance; unknown until checked.');
    expect(entrance?.noteFr).toMatch(/^Distinguez chaque entrée\s; UNKNOWN jusqu’au contrôle\.$/);
  });
  it('writes French notes with French spacing', () => {
    for (const term of CATALOG) expect(frenchIssues(term.noteFr), term.id).toEqual([]);
  });
});
