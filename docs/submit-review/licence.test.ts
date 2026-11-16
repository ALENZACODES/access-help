import { describe, expect, it } from 'vitest';
import { ACCEPTED_LICENCES, allLicenceNotes, isAcceptedLicence, licenceNote, licenceProblem, sourceAdvice, sourceKind } from './licence.js';

describe('licences', () => {
  it('accepts exactly CC0-1.0 and ODbL-1.0', () => {
    expect([...ACCEPTED_LICENCES]).toEqual(['CC0-1.0', 'ODbL-1.0']);
    expect(isAcceptedLicence('CC0-1.0')).toBe(true);
    expect(isAcceptedLicence('cc0-1.0')).toBe(false);
    expect(isAcceptedLicence('CC-BY-4.0')).toBe(false);
    expect(isAcceptedLicence('')).toBe(false);
  });
  it('has a note in both languages for each licence', () => {
    for (const lang of ['en', 'fr'] as const) {
      const notes = allLicenceNotes(lang);
      expect(notes.map((n) => n.id)).toEqual(['CC0-1.0', 'ODbL-1.0']);
      for (const note of notes) {
        for (const text of [note.name, note.summary, note.whatItMeans, note.whatYouDo]) expect(text.length).toBeGreaterThan(20);
      }
    }
    expect(licenceNote('CC0-1.0', 'en').name).toContain('CC0');
    expect(licenceNote('ODbL-1.0', 'fr').name).toContain('ODbL');
  });
  it('never presents a note as legal advice or a promise', () => {
    for (const note of allLicenceNotes('en')) expect(note.summary + note.whatItMeans + note.whatYouDo).not.toMatch(/legal advice|always|never fails/i);
  });
  it('explains why another licence is not accepted', () => {
    expect(licenceProblem('CC0-1.0', 'en')).toBeNull();
    expect(licenceProblem('MIT', 'en')).toContain('MIT');
    expect(licenceProblem('MIT', 'en')).toContain('CC0-1.0 or ODbL-1.0');
    expect(licenceProblem('', 'fr')).toContain('—');
    expect(licenceProblem('MIT', 'fr')).toContain('CC0-1.0 ou ODbL-1.0');
  });
});

describe('sourceKind', () => {
  const cases: [string, ReturnType<typeof sourceKind>][] = [
    ['', 'empty'],
    ['   ', 'empty'],
    ['own site visit', 'own-visit'],
    ['I visited on Saturday', 'own-visit'],
    ['site visit with a tape measure', 'own-visit'],
    ['ma visite sur place', 'own-visit'],
    ['https://example.org/page', 'link'],
    ['from www.example.org', 'link'],
    ['own visit, see https://example.org', 'link'],
    ['a friend told me', 'other'],
  ];
  for (const [text, kind] of cases) {
    it(`reads "${text}" as ${kind}`, () => expect(sourceKind(text)).toBe(kind));
  }
});

describe('sourceAdvice', () => {
  it('gives advice for every kind but an own visit', () => {
    for (const lang of ['en', 'fr'] as const) {
      expect(sourceAdvice('own-visit', lang)).toBeNull();
      for (const kind of ['empty', 'link', 'other'] as const) expect(sourceAdvice(kind, lang)?.length).toBeGreaterThan(20);
    }
  });
  it('tells a person not to copy from other maps', () => {
    expect(sourceAdvice('link', 'en')).toMatch(/do not copy/i);
    expect(sourceAdvice('link', 'fr')).toMatch(/ne copiez pas/i);
  });
});
