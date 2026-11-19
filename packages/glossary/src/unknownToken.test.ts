import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TERMS as CATALOG } from './terms';
import { UNKNOWN_TOKEN, inventory, plainLanguageIssues } from './index';

const SRC = __dirname;

describe('the UNKNOWN token', () => {
  it('is one fixed word', () => {
    expect(UNKNOWN_TOKEN).toBe('UNKNOWN');
  });
  it('is allowed in copy even though it is in capitals, and other shouted words are not', () => {
    expect(plainLanguageIssues('Chaque caractéristique est UNKNOWN.')).toEqual([]);
    expect(plainLanguageIssues('Chaque caractéristique est INCONNUE.').map((i) => i.rule)).toEqual(['all-caps-word']);
  });
  it('is used in French copy wherever the status would otherwise be given a gender or a plural', () => {
    const agreed = /inconnues?(?![\p{L}])/iu;
    for (const s of inventory('fr')) expect(agreed.test(s.text), `${s.where}: ${s.text}`).toBe(false);
    for (const term of CATALOG) expect(agreed.test(term.noteFr), term.id).toBe(false);
  });
  it('is not spelled with a gender or a plural in any source file of this package', () => {
    const files = readdirSync(SRC).filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.test.ts'));
    expect(files.length).toBeGreaterThan(50);
    for (const f of files) expect(/inconnues?(?![\p{L}])/iu.test(readFileSync(join(SRC, f), 'utf8')), f).toBe(false);
  });
});
