import { describe, expect, it } from 'vitest';
import { mine, pack } from './fixtures.js';
import { candidatesFor, matchFor, nameSimilarity, nameTokens } from './match.js';

describe('nameTokens', () => {
  it('lowers case, removes accents and drops joining words', () => {
    expect(nameTokens('Café de la Gare')).toEqual(['cafe', 'gare']);
    expect(nameTokens('The Sample Library')).toEqual(['sample', 'library']);
  });
  it('removes repeats and punctuation', () => expect(nameTokens('Hall, hall & HALL')).toEqual(['hall']));
  it('is empty for a missing or blank name', () => {
    expect(nameTokens(null)).toEqual([]);
    expect(nameTokens('  ')).toEqual([]);
  });
});

describe('nameSimilarity', () => {
  it('is 1 for the same words in any order or case', () => expect(nameSimilarity('Sample Library', 'library SAMPLE')).toBe(1));
  it('is 0 for no shared word', () => expect(nameSimilarity('Sample Library', 'City Arena')).toBe(0));
  it('is the shared share otherwise', () => expect(nameSimilarity('Sample Library', 'Sample Library Annex')).toBeCloseTo(2 / 3, 6));
  it('is null when a name is missing', () => {
    expect(nameSimilarity(null, 'Hall')).toBeNull();
    expect(nameSimilarity('Hall', null)).toBeNull();
  });
});

describe('candidatesFor', () => {
  it('keeps pack places within the radius and drops the rest', () => {
    const out = candidatesFor(mine(), [pack(), pack({ id: 'far', lat: 43.86 })], 30);
    expect(out.map((c) => c.record.id)).toEqual(['p1']);
    expect(out[0]?.metres).toBeGreaterThan(10);
    expect(out[0]?.metres).toBeLessThan(12);
  });
  it('puts a name match before a closer place with another name', () => {
    const out = candidatesFor(mine(), [pack({ id: 'near', lat: 43.85002, name: 'City Arena' }), pack()], 30);
    expect(out.map((c) => c.record.id)).toEqual(['p1', 'near']);
  });
  it('always keeps a pack place with the same id, however far', () => {
    const out = candidatesFor(mine(), [pack({ id: 'm1', lat: 45 })], 30);
    expect(out[0]).toMatchObject({ sameId: true });
  });
  it('skips a pack place with a coordinate that is not a number', () => {
    expect(candidatesFor(mine(), [pack({ lon: Number.NaN })], 30)).toEqual([]);
  });
  it('is empty with no pack places', () => expect(candidatesFor(mine(), [], 30)).toEqual([]));
  it('widens with the radius', () => {
    const p = pack({ lat: 43.8504 });
    expect(candidatesFor(mine(), [p], 30)).toEqual([]);
    expect(candidatesFor(mine(), [p], 60)).toHaveLength(1);
  });
});

describe('matchFor', () => {
  it('finds none when nothing is near', () => expect(matchFor(mine(), [pack({ lat: 44 })], 30)).toMatchObject({ kind: 'none', best: null }));
  it('matches on the same id first', () => {
    const out = matchFor(mine(), [pack(), pack({ id: 'm1', lat: 43.8502, name: 'Other' })], 30);
    expect(out.kind).toBe('same-id');
    expect(out.best?.record.id).toBe('m1');
  });
  it('matches a similar name close by', () => expect(matchFor(mine(), [pack()], 30).kind).toBe('name-and-place'));
  it('is unsure between two similar names at about the same distance', () => {
    const out = matchFor(mine(), [pack(), pack({ id: 'p2', lat: 43.84991 })], 30);
    expect(out).toMatchObject({ kind: 'unsure', best: null });
    expect(out.candidates).toHaveLength(2);
  });
  it('prefers the clearly closer of two similar names', () => {
    const out = matchFor(mine(), [pack({ lat: 43.85002 }), pack({ id: 'p2', lat: 43.8502 })], 30);
    expect(out.kind).toBe('name-and-place');
    expect(out.best?.record.id).toBe('p1');
  });
  it('is unsure when the only place nearby has a different name', () => {
    expect(matchFor(mine(), [pack({ name: 'City Arena' })], 30).kind).toBe('unsure');
  });
  it('matches on position alone when a name is missing', () => {
    expect(matchFor(mine({ name: null }), [pack()], 30).kind).toBe('place-only');
    expect(matchFor(mine(), [pack({ name: null })], 30).kind).toBe('place-only');
  });
  it('is unsure on position alone when two places are about as close', () => {
    expect(matchFor(mine({ name: null }), [pack(), pack({ id: 'p2', lat: 43.84991 })], 30).kind).toBe('unsure');
  });
  it('does not change its inputs', () => {
    const list = [pack(), pack({ id: 'p2', lat: 43.8502 })];
    const copy = JSON.parse(JSON.stringify(list));
    matchFor(mine(), list, 30);
    expect(list).toEqual(copy);
  });
});
