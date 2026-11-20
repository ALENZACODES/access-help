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

describe('place-card modules stay pure and offline', () => {
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
  it('reuses the shared text and distance helpers, the measures module and the side-by-side rows', () => {
    const all = sources.map(read).join('\n');
    expect(all).toContain("from '../presubmit/text.js'");
    expect(all).toContain("from '../presubmit/geo.js'");
    expect(all).toContain("from '../place-measures/index.js'");
    expect(all).toContain("from '../ask-place/index.js'");
  });
  it('has no tag writer: a card never becomes a tag for the map', () => {
    for (const name of sources) expect(read(name), name).not.toMatch(/measureTags|wheelchair:description|toilets:wheelchair|tagsFor\(/);
  });
  it('puts nothing about the sender in a card except the label they typed', async () => {
    const { card } = await import('./fixtures.js');
    expect(Object.keys(card()).sort()).toEqual(['app', 'from', 'madeOn', 'measures', 'place', 'told', 'v']);
    expect(Object.keys(card().place).sort()).toEqual(['lat', 'licence', 'lon', 'name', 'observedOn', 'source', 'wheelchair']);
  });
  it('never carries the id of an observation on the sender’s device', async () => {
    const { card } = await import('./fixtures.js');
    const { serializeCard } = await import('./card.js');
    expect(serializeCard(card())).not.toContain('"a1"');
  });
});
