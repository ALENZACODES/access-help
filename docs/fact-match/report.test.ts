import { describe, expect, it } from 'vitest';
import { emptyCriteria } from './criteria.js';
import { sample, simple, strict, TODAY } from './fixtures.js';
import { MATCH_COLUMNS, matchCsv, matchFilename, matchText, rowsWith, runMatch } from './report.js';

describe('running the numbers over every place', () => {
  it('puts places within the numbers first, then the ones nothing can be said about, then the rest', () => {
    const run = runMatch(sample(), simple());
    expect(run.rows.map((row) => [row.place.id, row.result.overall])).toEqual([
      ['a1', 'fits'],
      ['a4', 'cannot-say'],
      ['a3', 'cannot-say'],
      ['a2', 'does-not-fit'],
    ]);
    expect(run.counts).toEqual({ total: 4, fits: 1, doesNotFit: 1, cannotSay: 2 });
  });
  it('says which places have measures of the person’s own', () => {
    expect(runMatch(sample(), simple()).rows.map((row) => [row.place.id, row.hasMeasures])).toEqual([
      ['a1', true],
      ['a4', false],
      ['a3', true],
      ['a2', true],
    ]);
  });
  it('tallies what is UNKNOWN', () => {
    expect(runMatch(sample(), simple()).tally).toEqual([
      { key: 'steps', places: 2 },
      { key: 'doorWidth', places: 1 },
    ]);
  });
  it('uses what places said only when asked to', () => {
    const run = runMatch(sample(), simple({ countTold: true }));
    expect(run.counts).toEqual({ total: 4, fits: 3, doesNotFit: 1, cannotSay: 0 });
    expect(run.rows.filter((row) => row.result.usedTold).map((row) => row.place.id)).toEqual(['a4', 'a3']);
  });
  it('puts every place under "no number is set" when nothing is set', () => {
    const run = runMatch(sample(), emptyCriteria());
    expect(run.rows.every((row) => row.result.overall === 'no-criteria')).toBe(true);
    expect(run.counts).toEqual({ total: 4, fits: 0, doesNotFit: 0, cannotSay: 0 });
  });
  it('gives the rows of one group', () => {
    const run = runMatch(sample(), simple());
    expect(rowsWith(run, 'cannot-say').map((row) => row.place.id)).toEqual(['a4', 'a3']);
    expect(rowsWith(run, 'no-criteria')).toEqual([]);
  });
  it('is calm with no places', () => {
    expect(runMatch({ places: [], measured: [], told: [] }, simple())).toEqual({ rows: [], counts: { total: 0, fits: 0, doesNotFit: 0, cannotSay: 0 }, tally: [] });
  });
  it('does not change what it was given', () => {
    const input = sample();
    const copy = JSON.stringify(input);
    runMatch(input, strict());
    expect(JSON.stringify(input)).toBe(copy);
  });
});

describe('the result as text', () => {
  it('opens with the day, the line that the numbers are the person’s own, and the numbers', () => {
    const lines = matchText(runMatch(sample(), simple()), simple(), TODAY, 'en').split('\n');
    expect(lines[0]).toBe('My places against my numbers, 2026-11-19');
    expect(lines[1]).toMatch(/^The numbers are yours\./);
    expect(lines.slice(3, 6)).toEqual(['The numbers you set', '- No step at the entrance', '- Entrance door at least 80 cm wide']);
  });
  it('gives the counts, the tally and each group with its places', () => {
    const text = matchText(runMatch(sample(), simple()), simple(), TODAY, 'en');
    expect(text).toContain('Places looked through: 4. Within every number: 1. Outside a number: 1. Cannot be said: 2.\nUNKNOWN at 2 places: number of steps.\nUNKNOWN at 1 place: width of the entrance door.');
    expect(text).toContain('Within every number you set: 1\n* Sample Library. Status: limited. Source: own visit. Licence: CC0-1.0. Seen: 2026-11-10. Tier: UNKNOWN.\n  - No step at the entrance: no step.');
    expect(text).toContain('Cannot be said: a fact is UNKNOWN: 2\n* Place without a name. Status: UNKNOWN.');
    expect(text).toContain('  UNKNOWN: number of steps.');
    expect(text).toContain('Outside a number you set: 1\n* Sample Arena.');
    expect(text).toContain('  - Entrance door at least 80 cm wide: 76 cm, 4 cm less than the number you set.');
  });
  it('leaves out a group with no place in it', () => {
    const criteria = simple({ countTold: true });
    const text = matchText(runMatch(sample(), criteria), criteria, TODAY, 'en');
    expect(text).not.toContain('Cannot be said: a fact is UNKNOWN:');
    expect(text).toContain('Where you have no measure of your own, what the place told you is used and marked.');
    expect(text).toContain('This comes from what the place said, not from your own measure.');
  });
  it('says to set a number when none is set, and lists no place', () => {
    const text = matchText(runMatch(sample(), emptyCriteria()), emptyCriteria(), TODAY, 'en');
    expect(text).toContain('Set at least one number to look through your places.');
    expect(text).not.toContain('Sample Library');
  });
  it('writes French with French spacing', () => {
    const text = matchText(runMatch(sample(), simple()), simple(), TODAY, 'fr');
    expect(text.split('\n')[0]).toBe('Mes lieux face à mes chiffres, 2026-11-19');
    expect(text).toContain('Lieux examinés : 4. Dans tous les chiffres : 1. Hors d’un chiffre : 1. Impossible à dire : 2.');
    expect(text).toContain('Impossible à dire : un fait est UNKNOWN : 2');
    expect(text).toContain('  - Porte d’entrée large d’au moins 80 cm : 76 cm, 4 cm de moins que le chiffre que vous avez fixé.');
  });
});

describe('the result as CSV', () => {
  it('has a header and one line per place, with CRLF', () => {
    const lines = matchCsv(runMatch(sample(), simple())).split('\r\n');
    expect(lines[0]).toBe(MATCH_COLUMNS.join(','));
    expect(lines[1]).toBe('a1,Sample Library,fits,fits,not-set,fits,not-set,not-set,not-set,no,limited,own visit,CC0-1.0,2026-11-10,UNKNOWN');
    expect(lines[2]).toBe('a4,,cannot-say,UNKNOWN,not-set,UNKNOWN,not-set,not-set,not-set,no,UNKNOWN,own visit,CC0-1.0,2026-11-10,UNKNOWN');
    expect(lines[4]).toBe('a2,Sample Arena,does-not-fit,does-not-fit,not-set,does-not-fit,not-set,not-set,not-set,no,limited,own visit,CC0-1.0,2026-11-10,UNKNOWN');
    expect(lines[5]).toBe('');
  });
  it('says when what a place said was used', () => {
    const lines = matchCsv(runMatch(sample(), simple({ countTold: true }))).split('\r\n');
    expect(lines[1]).toBe('a4,,fits,fits,not-set,fits,not-set,not-set,not-set,yes,UNKNOWN,own visit,CC0-1.0,2026-11-10,UNKNOWN');
  });
  it('quotes a name with a comma and defuses a formula', () => {
    const input = sample();
    const places = input.places.map((p) => (p.id === 'a1' ? { ...p, name: '=1+1, x' } : p));
    expect(matchCsv(runMatch({ ...input, places }, simple()))).toContain(`a1,"'=1+1, x",fits`);
  });
  it('names the files by the day they were made', () => {
    expect(matchFilename(TODAY, 'txt')).toBe('places-against-my-numbers-2026-11-19.txt');
    expect(matchFilename(TODAY, 'csv')).toBe('places-against-my-numbers-2026-11-19.csv');
  });
});
