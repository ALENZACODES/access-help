import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as api from './index.js';
import { bannedIn } from './lintkit.js';

const here = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(here).filter((name) => name.endsWith('.ts'));
const sources = files.filter((name) => !name.endsWith('.test.ts'));
const read = (name: string) => readFileSync(join(here, name), 'utf8');

describe('fact-match modules stay pure and offline', () => {
  it('has source files to check', () => expect(sources.length).toBeGreaterThanOrEqual(6));
  for (const name of sources) {
    it(`${name} makes no network call and reads no storage`, () => {
      const text = read(name);
      expect(text).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|navigator\./);
      expect(text).not.toMatch(/localStorage|sessionStorage|indexedDB|document\./);
      expect(text).not.toMatch(/\bnode:(?:fs|http|https|net|child_process)\b/);
    });
    it(`${name} does not read the clock or random numbers`, () => {
      const text = read(name);
      expect(text).not.toMatch(/Date\.now|new Date\(\)|Math\.random|performance\.now/);
    });
    it(`${name} has no web address`, () => {
      expect(read(name).replace(/\/\/ .*$/gm, '')).not.toMatch(/https?:\/\//);
    });
    it(`${name} uses no banned word`, () => {
      if (name === 'lintkit.ts') return;
      expect(bannedIn(read(name)), name).toEqual([]);
    });
  }
  it('exports nothing that submits, uploads or sends', () => {
    for (const name of Object.keys(api)) expect(name).not.toMatch(/^(?:submit|upload|send|post|push|sync)/i);
  });
  it('writes the French spacing characters as escapes, not literal characters', () => {
    for (const name of sources) {
      const text = read(name);
      expect(text.includes(' '), name).toBe(false);
      expect(text.includes(' '), name).toBe(false);
    }
  });
  it('reuses the shared text helpers and the measures module', () => {
    const all = sources.map(read).join('\n');
    expect(all).toContain("from '../presubmit/text.js'");
    expect(all).toContain("from '../place-measures/index.js'");
  });
  it('holds no default number: empty criteria set nothing', async () => {
    const { emptyCriteria, emptyCriteriaForm, readCriteriaForm, setCriteria } = await import('./criteria.js');
    expect(setCriteria(emptyCriteria())).toEqual([]);
    const read = readCriteriaForm(emptyCriteriaForm());
    expect(read.ok && setCriteria(read.criteria)).toEqual([]);
  });
  it('writes no number of its own into a source file as a suggested limit', () => {
    for (const name of sources.filter((n) => n !== 'fixtures.ts' && n !== 'lintkit.ts')) {
      expect(read(name), name).not.toMatch(/(?:minDoorWidthCm|maxStepHeightCm|minToiletDoorCm|maxSteps): \d/);
    }
  });
  it('never counts UNKNOWN as fitting', async () => {
    const { matchPlace } = await import('./match.js');
    const { strict } = await import('./fixtures.js');
    const result = matchPlace('x', strict(), null, null);
    expect(result.overall).toBe('cannot-say');
    expect(result.checks.every((check) => check.outcome === 'unknown')).toBe(true);
  });
});
