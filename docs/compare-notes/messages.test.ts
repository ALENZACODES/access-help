import { describe, expect, it } from 'vitest';
import { compareAll, compareOne, OUTCOME_ORDER } from './compare.js';
import { mine, pack } from './fixtures.js';
import { compareSummaryText, distanceText, flagTexts, matchKindText, newerText, outcomeAdvice, outcomeLabel, recordLine } from './messages.js';

describe('outcome words', () => {
  for (const lang of ['en', 'fr'] as const) {
    it(`has a different label and advice for each outcome (${lang})`, () => {
      expect(new Set(OUTCOME_ORDER.map((o) => outcomeLabel(o, lang))).size).toBe(7);
      expect(new Set(OUTCOME_ORDER.map((o) => outcomeAdvice(o, lang))).size).toBe(7);
    });
  }
  it('does not say which record is right when they differ', () => {
    expect(outcomeAdvice('differs', 'en')).toMatch(/does not say which is right/);
    expect(outcomeAdvice('differs', 'fr')).toMatch(/ne dit pas lequel est juste/);
  });
  it('says UNKNOWN never replaces a recorded status', () => expect(outcomeAdvice('mine-unknown', 'en')).toMatch(/UNKNOWN never replaces a recorded status/));
  it('sends the person to the map for a new place', () => expect(outcomeAdvice('new', 'en')).toMatch(/may still be on the map/));
});

describe('match and flag words', () => {
  it('has a sentence for each kind of match', () => {
    const kinds = ['none', 'same-id', 'name-and-place', 'place-only', 'unsure'] as const;
    for (const lang of ['en', 'fr'] as const) expect(new Set(kinds.map((k) => matchKindText(k, lang))).size).toBe(5);
  });
  it('says which is newer with the right plural', () => {
    expect(newerText('mine', 1, 'en')).toBe('Your note is 1 day newer than the pack record.');
    expect(newerText('mine', 40, 'en')).toBe('Your note is 40 days newer than the pack record.');
    expect(newerText('theirs', 1, 'fr')).toBe('La fiche du paquet est plus récente de 1 jour que votre note.');
    expect(newerText('theirs', 3, 'fr')).toContain('3 jours');
    expect(newerText('same-day', 0, 'en')).toBe('Both were seen on the same day.');
    expect(newerText('unknown', null, 'en')).toBe('');
  });
  it('writes the distance', () => {
    expect(distanceText(11.2, 'en')).toBe('11 m apart.');
    expect(distanceText(11.2, 'fr')).toBe('À 11 m l’un de l’autre.');
  });
  it('lists distance, age and licence flags for a matched pair', () => {
    const flags = flagTexts(compareOne(mine(), [pack()]), 'en');
    expect(flags).toHaveLength(3);
    expect(flags[2]).toBe('The two records have different licences. Each keeps its own.');
  });
  it('has no flags without a match', () => expect(flagTexts(compareOne(mine(), []), 'en')).toEqual([]));
});

describe('recordLine', () => {
  it('gives status, source, licence, date and tier', () => {
    expect(recordLine(mine(), 'en')).toBe('Status: yes. Source: own visit. Licence: CC0-1.0. Seen on 2026-11-10. Tier: UNKNOWN.');
    expect(recordLine(pack({ wheelchair: 'UNKNOWN' }), 'fr')).toBe('État : UNKNOWN. Source : sample pack. Licence : ODbL-1.0. Vu le 2026-10-01. Niveau : UNKNOWN.');
  });
});

describe('compareSummaryText', () => {
  it('says there is nothing to compare without observations or packs', () => {
    expect(compareSummaryText(compareAll([], [pack()]), 'en')).toBe('You have no saved observations to compare.');
    expect(compareSummaryText(compareAll([mine()], []), 'en')).toMatch(/^No pack is loaded on this device/);
  });
  it('gives the counts, the distance and what a match is', () => {
    const text = compareSummaryText(compareAll([mine(), mine({ id: 'm2', lat: 44.5 })], [pack()]), 'en');
    expect(text).toContain('Observations compared: 2.');
    expect(text).toContain('Agree: 1.');
    expect(text).toContain('No pack place nearby: 1.');
    expect(text).toContain('Distance used: 30 m.');
    expect(text).toMatch(/A match is a suggestion\./);
  });
  it('writes French spacing', () => {
    const text = compareSummaryText(compareAll([mine()], [pack()], 60), 'fr');
    expect(text).toContain('Observations comparées : 1.');
    expect(text).toContain('Distance utilisée : 60 m.');
  });
});
