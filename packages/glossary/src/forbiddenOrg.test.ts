import { describe, expect, it } from 'vitest';
// The repo's shared guard. It builds the needles itself; this file holds no names, joins or code arrays.
import { decodedForbiddenTerms, findForbiddenTerms } from '../../../qa/src/guards/forbidden-terms';
import { PLAIN_TERMS, inventory, type Lang } from './index';

describe('banned organisation names (shared guard)', () => {
  it('the shared guard has its needles', () => {
    expect(decodedForbiddenTerms().length).toBeGreaterThan(0);
  });
  it.each(['en', 'fr'] as Lang[])('no shipped %s copy string contains one', (lang) => {
    for (const s of inventory(lang)) expect(findForbiddenTerms(s.text), s.where).toEqual([]);
  });
  it('no glossary term contains one', () => {
    for (const t of PLAIN_TERMS) {
      for (const lang of ['en', 'fr'] as const) {
        expect(findForbiddenTerms(`${t[lang].term} ${t[lang].plain}`), t.id).toEqual([]);
      }
    }
  });
  it('the guard still finds each name', () => {
    for (const { id, term } of decodedForbiddenTerms()) expect(findForbiddenTerms(`Visit ${term}`)).toContain(id);
  });
});
