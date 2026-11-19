import { describe, expect, it } from 'vitest';
import { allLicenceFacts, GUIDE_LICENCES, isGuideLicence, licenceFacts, notAdviceText } from './facts.js';

describe('isGuideLicence', () => {
  it('knows the two open licences and nothing else', () => {
    expect(isGuideLicence('CC0-1.0')).toBe(true);
    expect(isGuideLicence('ODbL-1.0')).toBe(true);
    for (const v of ['cc0-1.0', 'CC-BY-4.0', '', 'MIT']) expect(isGuideLicence(v)).toBe(false);
  });
  it('lists exactly two licences', () => expect(GUIDE_LICENCES).toEqual(['CC0-1.0', 'ODbL-1.0']));
});

describe('licenceFacts', () => {
  for (const lang of ['en', 'fr'] as const) {
    it(`gives each licence a name, a summary and what a person may do (${lang})`, () => {
      for (const facts of allLicenceFacts(lang)) {
        expect(facts.fullName.length).toBeGreaterThan(10);
        expect(facts.inShort.length).toBeGreaterThan(20);
        expect(facts.youMay.length).toBeGreaterThanOrEqual(3);
        expect(facts.goodToKnow.length).toBeGreaterThanOrEqual(2);
      }
    });
  }
  it('asks nothing under CC0-1.0', () => {
    expect(licenceFacts('CC0-1.0', 'en')).toMatchObject({ youMust: [], creditRequired: false, shareAlike: false });
  });
  it('asks for credit, the same licence and an open copy under ODbL-1.0', () => {
    const facts = licenceFacts('ODbL-1.0', 'en');
    expect(facts).toMatchObject({ creditRequired: true, shareAlike: true });
    expect(facts.youMust).toHaveLength(3);
    expect(facts.youMust[0]).toMatch(/Credit the source/);
    expect(facts.youMust[1]).toMatch(/same licence/);
  });
  it('says the App records the source even where credit is not required', () => {
    expect(licenceFacts('CC0-1.0', 'en').goodToKnow[0]).toMatch(/Credit is not required\. The App still records the source/);
  });
  it('says the data comes with no promise, for both licences', () => {
    for (const facts of allLicenceFacts('en')) expect(facts.goodToKnow.join(' ')).toMatch(/no promise that it is right or complete/);
  });
  it('differs between languages and keeps the same number of points', () => {
    for (const id of GUIDE_LICENCES) {
      const en = licenceFacts(id, 'en');
      const fr = licenceFacts(id, 'fr');
      expect(fr.inShort).not.toBe(en.inShort);
      expect([fr.youMay.length, fr.youMust.length, fr.goodToKnow.length]).toEqual([en.youMay.length, en.youMust.length, en.goodToKnow.length]);
    }
  });
});

describe('notAdviceText', () => {
  it('says it is a summary and points to the licence text', () => {
    expect(notAdviceText('en')).toBe('This is a short summary, not legal advice. Read the licence text before you share data.');
    expect(notAdviceText('fr')).toMatch(/pas un avis juridique/);
  });
});
