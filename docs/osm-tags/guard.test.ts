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

describe('osm-tags modules stay pure and offline', () => {
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
  it('reuses the shared text helpers', () => {
    expect(sources.map(read).join('\n')).toContain("from '../presubmit/text.js'");
  });
  it('writes no wheelchair tag for a status that is not yes, limited or no', async () => {
    const { tagsFor } = await import('./tags.js');
    const { obs } = await import('./fixtures.js');
    for (const wheelchair of ['UNKNOWN', '', 'maybe', 'YES', 'designated']) {
      expect(tagsFor(obs({ wheelchair })).map((tag) => tag.key)).not.toContain('wheelchair');
    }
  });
  it('writes the same tags as the App’s own OpenStreetMap file', async () => {
    const { toOsmChange } = await import('../mapping-day/export.js');
    const { tagsFor } = await import('./tags.js');
    const { obs, unknownObs } = await import('./fixtures.js');
    for (const record of [obs(), unknownObs(), obs({ wheelchair: 'limited', name: null })]) {
      const xml = toOsmChange([record as Parameters<typeof toOsmChange>[0][number]]);
      const inFile = [...xml.matchAll(/<tag k="([^"]+)" v="([^"]*)"/g)].map((m) => `${m[1]}=${m[2]}`);
      expect(tagsFor(record).map((tag) => `${tag.key}=${tag.value}`)).toEqual(inFile);
    }
  });
});
