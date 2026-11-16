import { describe, expect, it } from 'vitest';
import {
  NBSP,
  NNBSP,
  RULE_MESSAGES,
  checkFrTypography,
  checkHelpEntries,
  fixFrTypography,
} from './checker.js';

describe('apostrophe', () => {
  it('replaces straight apostrophes between letters', () => {
    expect(fixFrTypography("l'App d'aide")).toBe('l’App d’aide');
    expect(checkFrTypography("l'App")[0]?.rule).toBe('apostrophe');
  });
  it('leaves typographic apostrophes alone', () => {
    expect(checkFrTypography('l’App')).toEqual([]);
  });
});

describe('colon', () => {
  it('uses a no-break space before the colon', () => {
    expect(fixFrTypography('Note: texte')).toBe(`Note${NBSP}: texte`);
    expect(fixFrTypography('Note : texte')).toBe(`Note${NBSP}: texte`);
    expect(fixFrTypography(`Note${NNBSP}: texte`)).toBe(`Note${NBSP}: texte`);
  });
  it('ignores times and URLs', () => {
    const s = 'Ouvert à 10:30 sur https://exemple.org/aide';
    expect(checkFrTypography(s)).toEqual([]);
  });
});

describe('; ! ?', () => {
  it('uses a narrow no-break space', () => {
    expect(fixFrTypography('Vraiment ?')).toBe(`Vraiment${NNBSP}?`);
    expect(fixFrTypography('Bonjour!')).toBe(`Bonjour${NNBSP}!`);
    expect(fixFrTypography('un ; deux')).toBe(`un${NNBSP}; deux`);
    expect(fixFrTypography('Quoi ?!')).toBe(`Quoi${NNBSP}?!`);
  });
  it('ignores query strings and entities', () => {
    expect(checkFrTypography('https://exemple.org/a?b=1')).toEqual([]);
    expect(checkFrTypography('R&amp; D')).toEqual([]);
  });
});

describe('guillemets', () => {
  it('uses narrow no-break spaces inside « »', () => {
    expect(fixFrTypography('«bonjour»')).toBe(`«${NNBSP}bonjour${NNBSP}»`);
    expect(fixFrTypography('« bonjour »')).toBe(`«${NNBSP}bonjour${NNBSP}»`);
  });
  it('converts straight pairs and flags a stray quote', () => {
    expect(fixFrTypography('dit "oui" ici')).toBe(`dit «${NNBSP}oui${NNBSP}» ici`);
    const stray = checkFrTypography('un " seul');
    expect(stray).toHaveLength(1);
    expect(stray[0]?.rule).toBe('unbalanced-quote');
    expect(stray[0]?.expected).toBeNull();
  });
});

describe('combined', () => {
  const samples = [
    `Il a dit "Où est l'entrée ?" hier: rien!`,
    "« Quoi ? » demande l'agent; pas de réponse !",
    '«Attention!» Note: 10:30 — voir https://exemple.org/a?b=1',
  ];
  it.each(samples)('fix is idempotent and clears every issue: %s', (s) => {
    const fixed = fixFrTypography(s);
    expect(fixFrTypography(fixed)).toBe(fixed);
    expect(checkFrTypography(fixed)).toEqual([]);
  });
  it('reports each entry with issues only', () => {
    const reports = checkHelpEntries([
      { id: 'a', fr: 'Bonjour!' },
      { id: 'b', fr: `Bonjour${NNBSP}!` },
    ]);
    expect(reports.map((r) => r.id)).toEqual(['a']);
  });
});

describe('rule messages', () => {
  it('have EN and FR text, and the FR text follows its own rules', () => {
    for (const msg of Object.values(RULE_MESSAGES)) {
      expect(msg.en.length).toBeGreaterThan(0);
      expect(msg.fr.length).toBeGreaterThan(0);
      expect(checkFrTypography(msg.fr)).toEqual([]);
    }
  });
});
