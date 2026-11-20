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

describe('ask-place modules stay pure and offline', () => {
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
  it('has no tag writer: what a place said never becomes a tag', () => {
    for (const name of sources) expect(read(name), name).not.toMatch(/measureTags|wheelchair:description|toilets:wheelchair|tagsFor\(/);
  });
  it('asks only about facts the measures module knows', async () => {
    const { QUESTION_KEYS } = await import('./questions.js');
    const { FACT_KEYS } = await import('../place-measures/index.js');
    expect([...QUESTION_KEYS]).toEqual([...FACT_KEYS]);
  });
});
