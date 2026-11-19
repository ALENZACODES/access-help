import { describe, expect, it } from 'vitest';
import { lic, mixed, TODAY } from './fixtures.js';
import { buildLicenceGuide, guideFilename, guideText } from './guide.js';

describe('buildLicenceGuide', () => {
  const guide = buildLicenceGuide(mixed(), 'en');
  it('puts the mix, its words and its duties together', () => {
    expect(guide.mix.kind).toBe('cc0-and-odbl');
    expect(guide.label).toBe('CC0-1.0 and ODbL-1.0 together');
    expect(guide.duties).toHaveLength(3);
    expect(guide.summary).toContain('Licence for a combined file: ODbL-1.0.');
  });
  it('carries the facts, the questions and the not-advice line', () => {
    expect(guide.facts.map((f) => f.id)).toEqual(['CC0-1.0', 'ODbL-1.0']);
    expect(guide.questions).toHaveLength(6);
    expect(guide.notAdvice).toMatch(/not legal advice/);
  });
  it('counts records that cannot be credited', () => {
    expect(guide.missingSource).toBe(0);
    expect(buildLicenceGuide([lic({ source: '' }), lic({ id: 'r2' })], 'en').missingSource).toBe(1);
  });
  it('has no duties and no credits for nothing', () => {
    const empty = buildLicenceGuide([], 'en');
    expect(empty).toMatchObject({ duties: [], credits: '', missingSource: 0 });
    expect(empty.label).toBe('No records to look at');
  });
  it('is in French when asked', () => expect(buildLicenceGuide(mixed(), 'fr').label).toBe('CC0-1.0 et ODbL-1.0 ensemble'));
});

describe('guideText', () => {
  const text = guideText(buildLicenceGuide(mixed(), 'en'), TODAY, 'en');
  const lines = text.split('\n');
  it('starts with the day and the not-advice line', () => {
    expect(lines[0]).toBe('Licences for these records, 2026-11-19');
    expect(lines[1]).toMatch(/not legal advice/);
  });
  it('lists the duties, then the credits, then the map note', () => {
    expect(text).toContain('- Credit the ODbL-1.0 sources where people will see it.');
    expect(text.indexOf('Sources that ask for credit')).toBeGreaterThan(text.indexOf('- If you share a locked copy'));
    expect(text.trimEnd().endsWith('Add to the map what you saw yourself.')).toBe(true);
  });
  it('leaves the credits out when there are none', () => {
    expect(guideText(buildLicenceGuide([], 'en'), TODAY, 'en')).not.toContain('Sources');
  });
  it('ends with one line break', () => expect(text.endsWith('\n') && !text.endsWith('\n\n')).toBe(true));
  it('is in French when asked', () => expect(guideText(buildLicenceGuide(mixed(), 'fr'), TODAY, 'fr').split('\n')[0]).toBe('Licences de ces fiches, 2026-11-19'));
});

describe('guideFilename', () => {
  it('names the file by day', () => expect(guideFilename(TODAY)).toBe('licences-2026-11-19.txt'));
});
