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
  it('never says who can or cannot use a place, and judges no answer', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const text of allStrings(lang)) {
        expect(text, text).not.toMatch(/\b(?:accessible|inaccessible|too narrow|wide enough|too high|unsafe|up to code|barrier-free|good answer|bad answer|trop étroit|assez large|trop haut|aux normes|sans obstacle)\b/i);
      }
    }
  });
  it('keeps score of nothing: no praise, streak or percentage', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const text of allStrings(lang)) expect(text, text).not.toMatch(/\b(?:well done|great job|nice work|streak|score|complete!|bravo|félicitations|pointage)\b|%/i);
    }
  });
  it('says a skipped question stays UNKNOWN, in both languages', () => {
    expect(allStrings('en').some((text) => text.includes('Skipped, so UNKNOWN'))).toBe(true);
    expect(allStrings('fr').some((text) => text.includes('Passées, donc UNKNOWN'))).toBe(true);
    for (const lang of ['en', 'fr'] as const) {
      for (const text of allStrings(lang)) expect(text, text).not.toMatch(/\b(?:inconnue?s?|n\/a|not available|non disponible)\b/i);
    }
  });
  it('asks the person to answer only what they saw themselves', () => {
    expect(allStrings('en').some((text) => text.startsWith('Answer what you can see and measure yourself.'))).toBe(true);
    expect(allStrings('en').some((text) => text.includes('Answer yes only if you saw it yourself.'))).toBe(true);
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
    expect(frenchIssues('Note\u00a0: ok')).toEqual([]);
    expect(frenchIssues('Quoi?')).toContain('; ! or ? without narrow no-break space');
    expect(frenchIssues('Quoi\u202f?')).toEqual([]);
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
