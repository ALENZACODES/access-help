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
    it(`gives no medical or eligibility advice (${lang})`, () => {
      for (const text of strings) expect(text, text).not.toMatch(/\b(?:eligible|eligibility|diagnos\w*|medication|treatment|éligib\w*|diagnostic)\b/i);
    });
    it(`never says the App checked or approved anything (${lang})`, () => {
      for (const text of strings) expect(text, text).not.toMatch(/\b(?:app (?:has )?checked|approved by|l’application a (?:vérifié|approuvé))\b/i);
    });
  }
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
