import { describe, expect, it } from 'vitest';
import { card } from './fixtures.js';
import { NEAR_METRES, closestOwn, nearOwn } from './near.js';

const OWN = [
  { id: 'x', lat: 43.8502, lon: -79.43, name: 'sample  library' },
  { id: 'y', lat: 43.86, lon: -79.43, name: 'Far Place' },
  { id: 'z', lat: 43.85, lon: -79.4305, name: null },
];

describe('which of your observations a card is close to', () => {
  it('lists the observations within reach, closest first', () => {
    expect(nearOwn(card(), OWN)).toEqual([
      { id: 'x', name: 'sample  library', metres: 22, sameName: true },
      { id: 'z', name: null, metres: 40, sameName: false },
    ]);
  });
  it('says the names are the same whatever their case and spacing', () => {
    expect(nearOwn(card({}, { name: 'SAMPLE LIBRARY' }), OWN)[0]?.sameName).toBe(true);
    expect(nearOwn(card({}, { name: 'Sample Arena' }), OWN)[0]?.sameName).toBe(false);
  });
  it('never calls two missing names the same', () => {
    expect(nearOwn(card({}, { name: null }), OWN).every((entry) => !entry.sameName)).toBe(true);
  });
  it('offers nothing beyond the distance it keeps to', () => {
    expect(nearOwn(card(), OWN).every((entry) => entry.metres <= NEAR_METRES)).toBe(true);
    expect(nearOwn(card(), [OWN[1]!])).toEqual([]);
  });
  it('matches a card with no map point to nothing', () => {
    expect(nearOwn(card({ withPoint: false }), OWN)).toEqual([]);
    expect(closestOwn(card({ withPoint: false }), OWN)).toBeNull();
  });
  it('gives the closest one, or nothing when there is none', () => {
    expect(closestOwn(card(), OWN)?.id).toBe('x');
    expect(closestOwn(card(), [])).toBeNull();
  });
  it('does not change the list it was given', () => {
    const copy = JSON.stringify(OWN);
    nearOwn(card(), OWN);
    expect(JSON.stringify(OWN)).toBe(copy);
  });
});
