import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as day from './index-day';
import { bannedIn } from './day-lint.test';

const dir = dirname(fileURLToPath(import.meta.url));
const SOURCES = readdirSync(dir).filter((f) => /^day-.*\.ts$/.test(f) && !f.endsWith('.test.ts'));
const code = (file: string) => readFileSync(join(dir, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('mapping-day planning modules', () => {
  it('has source files to check', () => {
    expect(SOURCES.sort()).toEqual(['day-checklist.ts', 'day-coverage.ts', 'day-debrief.ts', 'day-files.ts', 'day-grid.ts', 'day-route.ts', 'day-session.ts', 'day-text.ts']);
  });
  it('makes no request and keeps nothing on the device', () => {
    for (const file of SOURCES) expect(code(file), file).not.toMatch(/\b(fetch|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB|node:fs|node:http|node:net)\b/);
  });
  it('never reads the clock or a random number', () => {
    for (const file of SOURCES) expect(code(file), file).not.toMatch(/new Date\(\)|Date\.now\(|performance\.now|Math\.random/);
  });
  it('contains no banned word in its source', () => {
    for (const file of SOURCES) expect(bannedIn(readFileSync(join(dir, file), 'utf8')), file).toEqual([]);
  });
  it('exports nothing that submits, uploads or sends', () => {
    for (const name of Object.keys(day)) expect(name).not.toMatch(/^(submit|upload|send|post|publish|push|sync)/i);
  });
  it('has no state or word for "mapped" or "complete" in its names', () => {
    for (const name of Object.keys(day)) expect(name).not.toMatch(/complete|fullyMapped|mappedArea|certif|score|rating/i);
  });
});
