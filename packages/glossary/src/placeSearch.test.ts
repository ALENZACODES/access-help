import { describe, expect, it } from 'vitest';
import { EMPTY_STATE, findPlaces, matchesQuery, normaliseState, type FeatureClaim, type Place } from './index';

const prov = { source: 'Survey', licence: 'CC0-1.0', date: '2026-10-01' };
const yes = (termId: string): FeatureClaim => ({ termId, status: 'present', provenance: prov });
const no = (termId: string): FeatureClaim => ({ termId, status: 'absent', provenance: prov });
const place = (id: string, name: string, claims: FeatureClaim[] = []): Place => ({ id, name, claims });

describe('matchesQuery', () => {
  it('matches word starts, ignoring case and accents', () => {
    expect(matchesQuery('Café du Parc', 'cafe')).toBe(true);
    expect(matchesQuery('Café du Parc', 'PAR')).toBe(true);
    expect(matchesQuery('Café du Parc', 'ark')).toBe(false);
  });

  it('needs every typed word to match some word', () => {
    expect(matchesQuery('Main Street Library', 'main lib')).toBe(true);
    expect(matchesQuery('Main Street Library', 'main zoo')).toBe(false);
  });

  it('matches everything for an empty or symbol-only query', () => {
    expect(matchesQuery('Anything', '')).toBe(true);
    expect(matchesQuery('Anything', '   ')).toBe(true);
    expect(matchesQuery('Anything', '!!!')).toBe(true);
  });
});

describe('findPlaces', () => {
  const places = [
    place('lib', 'Library', [yes('ramp'), yes('elevator')]),
    place('cafe', 'Café Nord', [yes('ramp'), no('elevator')]),
    place('pool', 'Pool', [yes('ramp')]),
    place('gym', 'Gym', []),
  ];
  const feats = (...features: string[]) => normaliseState({ features });

  it('returns every place, ranked, when nothing is chosen', () => {
    expect(findPlaces(places, EMPTY_STATE, 'en').map((m) => m.place.id)).toEqual(['cafe', 'gym', 'lib', 'pool']);
  });

  it('ranks by the chosen features', () => {
    expect(findPlaces(places, feats('ramp', 'elevator'), 'en').map((m) => m.place.id)).toEqual(['lib', 'pool', 'gym', 'cafe']);
  });

  it('filters by name first', () => {
    const s = normaliseState({ features: ['ramp'], query: 'caf' });
    expect(findPlaces(places, s, 'en').map((m) => m.place.id)).toEqual(['cafe']);
    expect(findPlaces(places, normaliseState({ query: 'zzz' }), 'en')).toEqual([]);
  });

  it('can hide places with a chosen feature reported as not available, but keeps unknown ones', () => {
    const s = normaliseState({ features: ['ramp', 'elevator'], hideNotAvailable: true });
    expect(findPlaces(places, s, 'en').map((m) => m.place.id)).toEqual(['lib', 'pool', 'gym']);
  });

  it('does not hide anything when no features are chosen', () => {
    expect(findPlaces(places, normaliseState({ hideNotAvailable: true }), 'en')).toHaveLength(4);
  });

  it('handles no places', () => {
    expect(findPlaces([], EMPTY_STATE, 'fr')).toEqual([]);
  });
});
