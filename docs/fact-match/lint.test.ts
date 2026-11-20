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
  it('never says who can or cannot use a place, and never calls a place accessible or not', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const text of allStrings(lang)) {
        expect(text, text).not.toMatch(/\b(?:you can (?:get in|use|enter)|you cannot|suitable|unsuitable|accessible|inaccessible|too narrow|wide enough|too high|safe|unsafe|pass(?:es)?|fail(?:s|ed)?|good for you|vous pouvez (?:entrer|utiliser)|convient|adapté|trop étroit|assez large|trop haut|sécuritaire|réussi|échoué)\b/i);
      }
    }
  });
  it('suggests no number and names no standard or code', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const text of allStrings(lang)) {
        expect(text, text).not.toMatch(/\b(?:recommended|we suggest|should be at least|minimum required|building code|up to code|AODA|ADA|CSA|recommandé|nous suggérons|code du bâtiment|aux normes)\b/i);
      }
    }
  });
  it('never counts UNKNOWN as within or outside a number', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const text of allStrings(lang)) {
        if (/: UNKNOWN\.$|\u00a0: UNKNOWN\.$/.test(text)) expect(text, text).not.toMatch(/more than|less than|de plus|de moins/);
      }
    }
  });
  it('keeps score of nothing: no rating, grade or percentage', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const text of allStrings(lang)) expect(text, text).not.toMatch(/\b(?:score|rating|grade|stars?|out of 10|note sur|pointage|étoiles?)\b|%/i);
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
