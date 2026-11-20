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

describe('field-walk modules stay pure and offline', () => {
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
      expect(text.includes('\u00a0'), name).toBe(false);
      expect(text.includes('\u202f'), name).toBe(false);
    }
  });
  it('reuses the shared text helpers and the measures module', () => {
    const all = sources.map(read).join('\n');
    expect(all).toContain("from '../presubmit/text.js'");
    expect(all).toContain("from '../place-measures/index.js'");
  });
  it('saves through the same checks as the measuring form', () => {
    expect(read('finish.ts')).toContain('return readForm(walkForm(walk)');
  });
  it('starts every walk with nothing answered when nothing is saved', async () => {
    const { beginWalk } = await import('./walk.js');
    const walk = beginWalk('x', '2026-11-19', null);
    expect(Object.values(walk.answers).every((value) => value === '')).toBe(true);
    expect(walk.skipped).toEqual([]);
  });
  it('never turns a skipped question into an answer', async () => {
    const { beginWalk, skipStep } = await import('./walk.js');
    const { finishWalk } = await import('./finish.js');
    let walk = beginWalk('x', '2026-11-19', null);
    for (const step of ['steps', 'stepHeight', 'ramp', 'doorWidth', 'doorOpening', 'toilet', 'toiletDoor'] as const) walk = skipStep(walk, step);
    expect(finishWalk(walk, { id: 'x', observedOn: '2026-11-10' }, '2026-11-19')).toMatchObject({ ok: false });
  });
});
