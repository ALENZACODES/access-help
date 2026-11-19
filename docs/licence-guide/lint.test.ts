import { describe, expect, it } from 'vitest';
import { allStrings, bannedIn, frenchIssues } from './lintkit.js';

describe('wording rules over every string the modules produce', () => {
  for (const lang of ['en', 'fr'] as const) {
    const strings = allStrings(lang);
    it(`has strings to check (${lang})`, () => expect(strings.length).toBeGreaterThan(50));
    it(`uses no banned word (${lang})`, () => {
      for (const text of strings) expect(bannedIn(text), text).toEqual([]);
    });
    it(`leaves no placeholder unfilled (${lang})`, () => {
      for (const text of strings) expect(text, text).not.toMatch(/\{\w+\}/);
    });
    it(`never says a record was received, accepted or correct (${lang})`, () => {
      for (const text of strings) expect(text, text).not.toMatch(/\b(?:was received|were received|was accepted|were accepted|has been accepted|is live|a été reçu|a été accepté|ont été acceptées?)\b/i);
    });
    it(`gives no medical or eligibility advice (${lang})`, () => {
      for (const text of strings) expect(text, text).not.toMatch(/\b(?:eligible|eligibility|diagnos\w*|medication|treatment|éligib\w*|diagnostic)\b/i);
    });
  }
  it('never tells a person they are allowed or safe to share, only what the licence asks', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const text of allStrings(lang)) expect(text, text).not.toMatch(/\b(?:you are allowed to|it is legal|legally safe|vous avez le droit de|c’est légal)\b/i);
    }
  });
  it('names no licence other than the two the App accepts, except to say it is not accepted', () => {
    for (const text of allStrings('en')) {
      if (/CC-BY/.test(text)) expect(text).toMatch(/the App does not take this licence/);
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
