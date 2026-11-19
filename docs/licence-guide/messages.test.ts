import { describe, expect, it } from 'vitest';
import { lic, mixed } from './fixtures.js';
import { countText, dutyText, mixExplanation, mixLabel, mixSummaryText, osmNoteText } from './messages.js';
import { mixOf } from './mix.js';

const KINDS = ['empty', 'cc0-only', 'odbl-only', 'cc0-and-odbl', 'has-other'] as const;
const DUTIES = ['credit-sources', 'same-licence', 'keep-open', 'do-not-share-yet'] as const;

describe('mix words', () => {
  for (const lang of ['en', 'fr'] as const) {
    it(`has a different label and explanation for each mix (${lang})`, () => {
      expect(new Set(KINDS.map((k) => mixLabel(k, lang))).size).toBe(5);
      expect(new Set(KINDS.map((k) => mixExplanation(k, lang))).size).toBe(5);
    });
    it(`has a different sentence for each duty (${lang})`, () => expect(new Set(DUTIES.map((d) => dutyText(d, lang))).size).toBe(4));
  }
  it('says a file with both is treated like the ODbL-1.0 part, and CC0-1.0 alone still asks nothing', () => {
    const text = mixExplanation('cc0-and-odbl', 'en');
    expect(text).toMatch(/treated like the ODbL-1\.0 part/);
    expect(text).toMatch(/CC0-1\.0 records on their own still ask for nothing/);
  });
  it('does not guess for another licence', () => expect(mixExplanation('has-other', 'en')).toMatch(/cannot say what sharing the whole set asks/));
});

describe('countText and mixSummaryText', () => {
  it('marks a licence the App does not accept', () => {
    expect(countText({ licence: 'CC0-1.0', count: 2, accepted: true }, 'en')).toBe('CC0-1.0: 2');
    expect(countText({ licence: 'CC-BY-4.0', count: 1, accepted: false }, 'en')).toBe('CC-BY-4.0: 1 (the App does not take this licence)');
    expect(countText({ licence: 'CC0-1.0', count: 2, accepted: true }, 'fr')).toBe('CC0-1.0 : 2');
  });
  it('gives the total, the counts and the combined licence', () => {
    expect(mixSummaryText(mixOf(mixed()), 'en')).toBe('Records: 4. CC0-1.0: 2. ODbL-1.0: 2. Licence for a combined file: ODbL-1.0.');
  });
  it('says the combined licence cannot be said when another licence is present', () => {
    expect(mixSummaryText(mixOf([lic({ licence: 'nope' })]), 'en')).toContain('Licence for a combined file: cannot be said.');
  });
  it('is the plain label for nothing', () => expect(mixSummaryText(mixOf([]), 'en')).toBe('No records to look at'));
  it('writes French spacing', () => expect(mixSummaryText(mixOf([lic()]), 'fr')).toBe('Fiches : 1. CC0-1.0 : 1. Licence d’un fichier combiné : CC0-1.0.'));
});

describe('osmNoteText', () => {
  it('says an open licence alone does not mean the map takes a copy', () => {
    expect(osmNoteText('en')).toMatch(/does not by itself mean OpenStreetMap takes a copy/);
    expect(osmNoteText('en')).toMatch(/what you saw yourself/);
  });
});
