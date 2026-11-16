import { describe, expect, it } from 'vitest';
import { FRENCH_RULES, fixFrench, frenchIssues } from './index';

const NBSP = ' ';
const NNBSP = ' ';

describe('fixFrench', () => {
  it('curls apostrophes between letters only', () => {
    expect(fixFrench("l'espace d'accès")).toBe('l’espace d’accès');
    expect(fixFrench("'quoted'")).toBe("'quoted'");
  });

  it('puts a no-break space before a colon', () => {
    expect(fixFrench('Date: lundi')).toBe(`Date${NBSP}: lundi`);
    expect(fixFrench('Date : lundi')).toBe(`Date${NBSP}: lundi`);
    expect(fixFrench('Légende:')).toBe(`Légende${NBSP}:`);
  });

  it('leaves times and URLs alone', () => {
    expect(fixFrench('à 10:30')).toBe('à 10:30');
    expect(fixFrench('https://example.org/a')).toBe('https://example.org/a');
  });

  it('puts a narrow no-break space before ; ! ?', () => {
    expect(fixFrench('Oui; non')).toBe(`Oui${NNBSP}; non`);
    expect(fixFrench('Vraiment ?')).toBe(`Vraiment${NNBSP}?`);
    expect(fixFrench('Quoi?!')).toBe(`Quoi${NNBSP}?!`);
    expect(fixFrench('Super !')).toBe(`Super${NNBSP}!`);
  });

  it('does not touch question marks inside URLs', () => {
    expect(fixFrench('https://example.org/?a=1')).toBe('https://example.org/?a=1');
  });

  it('spaces the inside of guillemets with narrow no-break spaces', () => {
    expect(fixFrench('« oui »')).toBe(`«${NNBSP}oui${NNBSP}»`);
    expect(fixFrench('«oui»')).toBe(`«${NNBSP}oui${NNBSP}»`);
    expect(fixFrench('«  oui  »')).toBe(`«${NNBSP}oui${NNBSP}»`);
  });

  it('handles a question mark after a guillemet', () => {
    expect(fixFrench('« oui » ?')).toBe(`«${NNBSP}oui${NNBSP}»${NNBSP}?`);
  });

  it('is idempotent', () => {
    const samples = [
      "Il dit: « l'entrée est libre »; et vous?",
      'Rien à corriger.',
      `Déjà bon${NBSP}: oui${NNBSP}!`,
      '',
    ];
    for (const s of samples) {
      const once = fixFrench(s);
      expect(fixFrench(once)).toBe(once);
    }
  });
});

describe('frenchIssues', () => {
  it('lists the rules a string breaks', () => {
    expect(frenchIssues("l'entrée")).toEqual(['straight-apostrophe']);
    expect(frenchIssues('Date: x')).toEqual(['colon-spacing']);
    expect(frenchIssues('Ok !')).toEqual(['high-punctuation-spacing']);
    expect(frenchIssues('« x »')).toEqual(['guillemet-spacing']);
  });

  it('is empty for clean text and for fixed text', () => {
    expect(frenchIssues('Une rampe d’accès')).toEqual([]);
    expect(frenchIssues(fixFrench("Date: l'entrée; « ok » ?"))).toEqual([]);
  });

  it('exposes every rule id', () => {
    expect(FRENCH_RULES).toHaveLength(4);
  });
});
