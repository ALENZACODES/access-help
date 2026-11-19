import { describe, expect, it } from 'vitest';
import { adviseGroup, reportGroups } from './advise.js';
import { near, own } from './fixtures.js';
import { groupNotes } from './groups.js';
import { cautionTexts, kindAdvice, kindLabel, linkText, ownNoteLine, reportSummaryText } from './messages.js';

const KINDS = ['same', 'status-differs', 'only-unknown-differs', 'details-differ'] as const;

describe('kind words', () => {
  for (const lang of ['en', 'fr'] as const) {
    it(`has a different label and advice for each kind (${lang})`, () => {
      expect(new Set(KINDS.map((k) => kindLabel(k, lang))).size).toBe(4);
      expect(new Set(KINDS.map((k) => kindAdvice(k, lang))).size).toBe(4);
    });
  }
  it('does not choose when the statuses differ', () => {
    expect(kindAdvice('status-differs', 'en')).toMatch(/does not choose between them/);
    expect(kindAdvice('status-differs', 'en')).toMatch(/keep both if they are different places/);
  });
  it('says UNKNOWN never replaces a recorded status', () => expect(kindAdvice('only-unknown-differs', 'en')).toMatch(/UNKNOWN never replaces a recorded status/));
});

describe('link and note words', () => {
  it('says why two notes are linked and how far apart they are', () => {
    expect(linkText({ a: 'a', b: 'b', metres: 11.2, reason: 'same-name-close' }, 'en')).toBe('Similar names, 11 m apart.');
    expect(linkText({ a: 'a', b: 'b', metres: 11.2, reason: 'no-name-close' }, 'fr')).toBe('Un nom manque, à 11 m l’un de l’autre.');
  });
  it('gives status, source, licence, date and tier', () => {
    expect(ownNoteLine(own(), 'en')).toBe('Status: yes. Source: own visit. Licence: CC0-1.0. Seen on 2026-11-10. Tier: UNKNOWN.');
    expect(ownNoteLine(own({ wheelchair: 'UNKNOWN' }), 'fr')).toContain('Niveau : UNKNOWN.');
  });
});

describe('cautionTexts', () => {
  const advice = (b: Parameters<typeof near>[0]) => adviseGroup(groupNotes([own(), near(b)])[0]!);
  it('has none for a plain pair', () => expect(cautionTexts(advice({}), 'en')).toEqual([]));
  it('names different licences and says the kept note keeps its own', () => {
    expect(cautionTexts(advice({ licence: 'ODbL-1.0' }), 'en')).toEqual(['The notes have different licences (CC0-1.0 and ODbL-1.0). The note you keep keeps its own.']);
  });
  it('warns when the suggested note has no name', () => {
    expect(cautionTexts(advice({ name: null }), 'en')[0]).toMatch(/has no name, and another one does/);
  });
});

describe('reportSummaryText', () => {
  it('says there is nothing saved', () => expect(reportSummaryText(reportGroups([], 0, 25), 'en')).toBe('You have no saved observations.'));
  it('says none look like the same place', () => {
    expect(reportSummaryText(reportGroups([], 3, 25), 'en')).toBe(
      'Saved observations: 3. None of them look like the same place saved twice. Distance used: 25 m. A group is a suggestion. Two notes close together can be two different places.',
    );
  });
  it('counts the groups and the notes in them', () => {
    const notes = [own(), near()];
    const text = reportSummaryText(reportGroups(groupNotes(notes), 2, 25), 'en');
    expect(text).toContain('Groups that may be one place: 1.');
    expect(text).toContain('Observations in those groups: 2.');
  });
  it('writes French spacing', () => {
    expect(reportSummaryText(reportGroups([], 3, 50), 'fr')).toContain('Distance utilisée : 50 m.');
  });
});
