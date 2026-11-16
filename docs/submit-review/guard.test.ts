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

describe('submit-review modules stay pure and offline', () => {
  it('has source files to check', () => expect(sources.length).toBeGreaterThanOrEqual(9));
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
  it('keeps the two accepted licences in step with the export module', async () => {
    const exported = await import('../mapping-day/export.js');
    expect([...api.ACCEPTED_LICENCES]).toEqual([...exported.OPEN_LICENCES]);
  });
  it('builds the same tags as the OSM change draft for the same record', async () => {
    const exported = await import('../mapping-day/export.js');
    const { records } = exported.buildExport([
      { id: 'x', lat: 43.8, lon: -79.4, name: 'Café', wheelchair: 'limited', source: 'own site visit', licence: 'ODbL-1.0', observedOn: '2026-11-01' },
    ]);
    const record = records[0];
    expect(record).toBeDefined();
    if (!record) return;
    const xml = exported.toOsmChange(records);
    const inXml = [...xml.matchAll(/<tag k="([^"]+)" v="([^"]*)"\/>/g)].map((m) => `${m[1]}=${m[2]}`);
    expect(api.tagLines(api.tagsFor(record))).toEqual(inXml);
  });
});
