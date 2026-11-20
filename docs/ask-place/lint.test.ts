import { describe, expect, it } from 'vitest';
import { allStrings, bannedIn, frenchIssues } from './lintkit.js';

describe('wording rules over every string the modules produce', () => {
  for (const lang of ['en', 'fr'] as const) {
    const strings = allStrings(lang);
    it(`has strings to check (${lang})`, () => expect(strings.length).toBeGreaterThan(40));
    it(`uses no banned word (${lang})`, () => {
      for (const text of strings) expect(bannedIn(text), text).toEqual([]);
    });
    it(`leaves no placeholder unfilled (${lang})`, () => {
      for (const text of strings) expect(text, text).not.toMatch(/\{\w+\}/);
    });
    it(`never says a note was received, accepted or correct (${lang})`, () => {
      for (const text of strings) expect(text, text).not.toMatch(/\b(?:was received|were received|was accepted|were accepted|has been accepted|is live|a été reçu|a été accepté|ont été acceptées?)\b/i);
    });
    it(`gives no medical or eligibility advice (${lang})`, () => {
      for (const text of strings) expect(text, text).not.toMatch(/\b(?:eligible|eligibility|diagnos\w*|medication|treatment|éligib\w*|diagnostic)\b/i);
    });
  }
  it('says nothing about the person’s health, body or equipment in any draft', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const text of allStrings(lang)) {
        expect(text, text).not.toMatch(/\b(?:disab\w*|handicap\w*|paraly\w*|injur\w*|diagnos\w*|my (?:chair|wheelchair|condition)|mon (?:fauteuil|état)|ma (?:condition|blessure)|I use a wheelchair|j’utilise un fauteuil)\b/i);
      }
    }
  });
  it('never says who can or cannot use a place, and calls neither side wrong', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const text of allStrings(lang)) {
        expect(text, text).not.toMatch(/\b(?:too narrow|wide enough|too high|unsafe|up to code|barrier-free|is wrong|is incorrect|lied|trop étroit|assez large|aux normes|a tort|est fausse|a menti)\b/i);
      }
    }
  });
  it('never says the App sent, emailed or called anyone', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const text of allStrings(lang)) expect(text, text).not.toMatch(/\b(?:the App (?:sent|emailed|called|contacted)|we (?:sent|contacted)|message sent|l’application a (?:envoyé|appelé|contacté)|message envoyé)\b/i);
    }
  });
  it('makes no demand and cites no law in a draft', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const text of allStrings(lang)) expect(text, text).not.toMatch(/\b(?:you must|you are required|by law|legal(?:ly)?|AODA|human rights|vous devez|la loi|légal\w*|droits de la personne)\b/i);
    }
  });
  it('uses contrôle, not vérification, in French', () => {
    for (const text of allStrings('fr')) expect(text, text).not.toMatch(/v[ée]rifi/i);
  });
  it('follows French typography in every French string', () => {
    for (const text of allStrings('fr')) expect(frenchIssues(text), text).toEqual([]);
  });
  it('the French checker catches what it should', () => {
    expect(frenchIssues("l'eau")).toContain('straight apostrophe');
    expect(frenchIssues('Note: ok')).toContain('colon without no-break space');
    expect(frenchIssues('Note : ok')).toEqual([]);
    expect(frenchIssues('Quoi?')).toContain('; ! or ? without narrow no-break space');
    expect(frenchIssues('Quoi ?')).toEqual([]);
    expect(frenchIssues('50%')).toContain('percent without no-break space');
    expect(frenchIssues('dit "oui"')).toContain('straight double quote');
  });
  it('the banned-word checker catches each word', () => {
    for (const word of [['ver', 'ified'], ['ver', 'ify'], ['vér', 'ifié'], ['real', '-time'], ['partner', 'ship'], ['guaran', 'tee']]) {
      expect(bannedIn(`a ${word.join('')} b`)).not.toEqual([]);
    }
    expect(bannedIn('a plain sentence')).toEqual([]);
  });
});
