import { describe, expect, it } from 'vitest';
import {
  PLAIN_TERMS,
  claimFreshness,
  daysBetween,
  describeResult,
  freshnessText,
  matchPlace,
  rankPlaces,
  summarisePlace,
  verdictText,
  type FeatureClaim,
  type Place,
  type Provenance,
} from './index';

const prov: Provenance = { source: 'Site survey notes', licence: 'CC-BY-4.0', date: '2026-10-01' };
const today = '2026-11-15';

const present = (termId: string, p: Provenance = prov): FeatureClaim => ({ termId, status: 'present', provenance: p });
const absent = (termId: string, p: Provenance = prov): FeatureClaim => ({ termId, status: 'absent', provenance: p });
const place = (name: string, claims: FeatureClaim[], id = name.toLowerCase()): Place => ({ id, name, claims });

describe('daysBetween', () => {
  it('counts whole days, including leap years and negatives', () => {
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30);
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
    expect(daysBetween('2026-11-15', '2026-11-15')).toBe(0);
    expect(daysBetween('2026-11-15', '2026-11-10')).toBe(-5);
  });

  it('is null for anything that is not a real date', () => {
    expect(daysBetween('2026-02-30', '2026-03-01')).toBeNull();
    expect(daysBetween('yesterday', '2026-03-01')).toBeNull();
    expect(daysBetween('2026-03-01', '')).toBeNull();
  });
});

describe('claimFreshness', () => {
  it('grades by age of the source date', () => {
    expect(claimFreshness(present('ramp'), today)).toBe('current');
    expect(claimFreshness(present('ramp', { ...prov, date: '2025-06-01' }), today)).toBe('aging');
    expect(claimFreshness(present('ramp', { ...prov, date: '2023-01-01' }), today)).toBe('old');
  });

  it('honours custom limits', () => {
    expect(claimFreshness(present('ramp'), today, { currentDays: 10, agingDays: 20 })).toBe('old');
  });

  it('is undated for unknown, unsourced, invalid or future-dated claims', () => {
    expect(claimFreshness({ termId: 'ramp', status: 'unknown' }, today)).toBe('undated');
    expect(claimFreshness({ termId: 'ramp', status: 'present' }, today)).toBe('undated');
    expect(claimFreshness(present('ramp', { ...prov, date: '2026-13-40' }), today)).toBe('undated');
    expect(claimFreshness(present('ramp', { ...prov, date: '2027-01-01' }), today)).toBe('undated');
  });
});

describe('freshnessText', () => {
  it('only speaks when information is getting old or old', () => {
    expect(freshnessText('current', 'en')).toBeNull();
    expect(freshnessText('undated', 'fr')).toBeNull();
    expect(freshnessText('aging', 'en')).toBe('Information is getting old.');
    expect(freshnessText('old', 'en')).toBe('Information is old.');
    expect(freshnessText('aging', 'fr')).toBe('L’information commence à dater.');
    expect(freshnessText('old', 'fr')).toBe('L’information est ancienne.');
  });
});

describe('summarisePlace', () => {
  it('counts every glossary term and treats unmentioned ones as unknown', () => {
    const n = PLAIN_TERMS.length;
    expect(summarisePlace(place('A', []), 'en')).toBe(
      `0 reported as available, 0 reported as not available, ${n} unknown`,
    );
    expect(summarisePlace(place('A', [present('ramp'), absent('elevator')]), 'en')).toBe(
      `1 reported as available, 1 reported as not available, ${n - 2} unknown`,
    );
  });

  it('uses French agreement', () => {
    const n = PLAIN_TERMS.length;
    expect(summarisePlace(place('A', [present('ramp'), present('elevator'), absent('grab-bar')]), 'fr')).toBe(
      `2 signalés comme disponibles, 1 signalé comme non disponible, ${n - 3} inconnus`,
    );
    expect(summarisePlace(place('A', []), 'fr')).toBe(
      `0 signalé comme disponible, 0 signalé comme non disponible, ${n} inconnus`,
    );
  });
});

describe('matchPlace', () => {
  it('is all-reported only when every chosen feature has a sourced "present"', () => {
    const m = matchPlace(place('A', [present('ramp'), present('elevator')]), ['ramp', 'elevator']);
    expect(m.verdict).toBe('all-reported');
    expect(m.counts).toEqual({ met: 2, notMet: 0, unknown: 0 });
  });

  it('puts "not available" above unknown', () => {
    const m = matchPlace(place('A', [absent('ramp')]), ['ramp', 'elevator']);
    expect(m.verdict).toBe('some-not-available');
    expect(m.counts).toEqual({ met: 0, notMet: 1, unknown: 1 });
  });

  it('never treats unknown as met', () => {
    const m = matchPlace(place('A', [present('ramp')]), ['ramp', 'elevator']);
    expect(m.verdict).toBe('incomplete');
    expect(m.results.map((r) => r.outcome)).toEqual(['met', 'unknown']);
  });

  it('treats a claim without a source as unknown', () => {
    const m = matchPlace(place('A', [{ termId: 'ramp', status: 'present' }]), ['ramp']);
    expect(m.verdict).toBe('incomplete');
  });

  it('turns disagreeing sources into unknown', () => {
    const other: Provenance = { source: 'Other survey', licence: 'CC0-1.0', date: '2026-09-01' };
    const m = matchPlace(place('A', [present('ramp'), absent('ramp', other)]), ['ramp']);
    expect(m.results[0]?.outcome).toBe('unknown');
    expect(m.results[0]?.claim.conflict).toBe(true);
  });

  it('handles no requirements and duplicate requirements', () => {
    expect(matchPlace(place('A', [present('ramp')]), []).verdict).toBe('no-requirements');
    expect(matchPlace(place('A', [present('ramp')]), ['ramp', 'ramp']).results).toHaveLength(1);
  });

  it('keeps unrecognised term ids unknown', () => {
    expect(matchPlace(place('A', []), ['nope']).verdict).toBe('incomplete');
  });
});

describe('verdictText', () => {
  const two = ['ramp', 'elevator'];
  const all = matchPlace(place('A', [present('ramp'), present('elevator')]), two);
  const one = matchPlace(place('A', [present('ramp')]), ['ramp']);
  const some = matchPlace(place('A', [absent('ramp'), present('elevator')]), two);
  const lots = matchPlace(place('A', [absent('ramp'), absent('elevator')]), two);
  const inc = matchPlace(place('A', []), ['ramp', 'elevator', 'grab-bar']);
  const none = matchPlace(place('A', []), []);

  it('reads well in English', () => {
    expect(verdictText(all, 'en')).toBe('All 2 features you chose are reported as available.');
    expect(verdictText(one, 'en')).toBe('The feature you chose is reported as available.');
    expect(verdictText(some, 'en')).toBe('1 of 2 features you chose is reported as not available.');
    expect(verdictText(lots, 'en')).toBe('2 of 2 features you chose are reported as not available.');
    expect(verdictText(inc, 'en')).toBe('Not enough information: 3 of 3 features you chose are unknown.');
    expect(verdictText(none, 'en')).toBe('No features chosen.');
  });

  it('reads well in French, with agreement and spacing', () => {
    expect(verdictText(all, 'fr')).toBe('Les 2 caractéristiques choisies sont signalées comme disponibles.');
    expect(verdictText(one, 'fr')).toBe('La caractéristique choisie est signalée comme disponible.');
    expect(verdictText(some, 'fr')).toBe('1 caractéristique sur 2 est signalée comme non disponible.');
    expect(verdictText(lots, 'fr')).toBe('2 caractéristiques sur 2 sont signalées comme non disponibles.');
    expect(verdictText(inc, 'fr')).toBe('Information insuffisante : 3 caractéristiques sur 3 sont inconnues.');
    expect(verdictText(none, 'fr')).toBe('Aucune caractéristique choisie.');
  });

  it('never calls a place accessible overall', () => {
    for (const m of [all, one, some, lots, inc, none]) {
      expect(verdictText(m, 'en')).not.toMatch(/\baccessible\b/i);
    }
  });
});

describe('rankPlaces', () => {
  const reqs = ['ramp', 'elevator'];
  const places = [
    place('Gamma', [absent('ramp'), present('elevator')]),
    place('Beta', [present('ramp')]),
    place('Alpha', [present('ramp'), present('elevator')]),
    place('Aardvark', [present('ramp'), present('elevator')]),
    place('Delta', []),
    place('Epsilon', [absent('ramp'), absent('elevator')]),
  ];

  it('orders all-reported, then incomplete, then not-available', () => {
    expect(rankPlaces(places, reqs).map((m) => m.place.name)).toEqual([
      'Aardvark',
      'Alpha',
      'Beta',
      'Delta',
      'Gamma',
      'Epsilon',
    ]);
  });

  it('does not change the input array', () => {
    const copy = [...places];
    rankPlaces(places, reqs);
    expect(places).toEqual(copy);
  });

  it('is stable for equal places: name, then id', () => {
    const twins = [place('Same', [], 'b'), place('Same', [], 'a')];
    expect(rankPlaces(twins, reqs).map((m) => m.place.id)).toEqual(['a', 'b']);
  });

  it('returns nothing for no places', () => {
    expect(rankPlaces([], reqs)).toEqual([]);
  });
});

describe('describeResult', () => {
  it('reuses the feature wording', () => {
    const m = matchPlace(place('A', [present('ramp')]), ['ramp', 'elevator']);
    expect(describeResult(m.results[0]!, 'en')).toBe('Ramp: reported as available.');
    expect(describeResult(m.results[1]!, 'fr')).toBe('Ascenseur : inconnu.');
  });
});
