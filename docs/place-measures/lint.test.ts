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
  it('never says who can or cannot use a place, and gives no health or fitness-to-use advice', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const text of allStrings(lang)) {
        expect(text, text).not.toMatch(/\b(?:you can get in|you cannot get in|too narrow|wide enough|too high|safe for|unsafe|meets the (?:code|standard)|up to code|barrier-free|trop étroit|assez large|trop haut|sécuritaire|aux normes|sans obstacle)\b/i);
      }
    }
  });
  it('never turns measures into a wheelchair status', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const text of allStrings(lang)) expect(text, text).not.toMatch(/^wheelchair=|\bso (?:it|this place) is (?:yes|limited|no)\b/i);
    }
  });
  it('writes a fact nobody measured as UNKNOWN in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const text of allStrings(lang)) expect(text, text).not.toMatch(/\b(?:inconnue?s?|n\/a|not available|non disponible)\b/i);
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
