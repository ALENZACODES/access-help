import { describe, expect, it } from 'vitest';
import { buildDebrief, renderDebrief } from './day-debrief';
import { computeCoverage, type CoverageRecord } from './day-coverage';
import { makeGrid } from './day-grid';
import { createSession, type MappingDay } from './day-session';
import { allStrings, bannedIn, lintFrench } from './day-lint.test';

const session = (() => {
  const r = createSession({ name: 'Main Street', date: '2026-11-21', bounds: { south: 43.85, west: -79.44, north: 43.86, east: -79.42 }, cellMetres: 400, focus: ['entrances', 'crossings'] });
  if (!r.ok) throw new Error('session');
  return r.session as MappingDay;
})();
const g = makeGrid(session.bounds, session.cellMetres);
if (!g.ok) throw new Error('grid');
const grid = g.grid;

let n = 0;
const rec = (lat: number, lon: number, wheelchair: CoverageRecord['wheelchair'], observedOn = '2026-11-21'): CoverageRecord => ({ id: `d${++n}`, lat, lon, wheelchair, observedOn });
const full = [rec(43.8599, -79.4399, 'yes'), rec(43.8599, -79.4399, 'UNKNOWN'), rec(43.8501, -79.4201, 'no', '2026-11-01'), rec(44, -79.43, 'yes')];
const odd = { ...rec(43.855, -79.43, 'yes'), wheelchair: 'maybe' as never };

const section = (records: CoverageRecord[], id: string, lang: 'en' | 'fr' = 'en', options = {}) => buildDebrief(session, computeCoverage(grid, records), lang, options).find((s) => s.id === id);

describe('what you recorded', () => {
  it('counts records and names each recorded status as recorded, never as fact', () => {
    const lines = section(full, 'recorded')?.lines.join('\n') ?? '';
    expect(lines).toContain('3 records inside “Main Street”.');
    expect(lines).toContain('1 recorded as step-free entrance.');
    expect(lines).toContain('1 recorded as no step-free access.');
    expect(lines).toContain('Planned focus: Entrances, Street crossings.');
  });
  it('uses the singular for one record and 0 for none', () => {
    expect(section([rec(43.8599, -79.4399, 'yes')], 'recorded')?.lines[0]).toBe('1 record inside “Main Street”.');
    expect(section([], 'recorded')?.lines[0]).toBe('0 records inside “Main Street”.');
  });
  it('leaves out the focus line when none was planned', () => {
    const none = { ...session, focus: [] };
    const sections = buildDebrief(none, computeCoverage(grid, full), 'en');
    expect(sections[0]?.lines.join(' ')).not.toMatch(/Planned focus/);
  });
});

describe('UNKNOWN', () => {
  it('gives the share and says it is not "no" and writes no tag', () => {
    const lines = section(full, 'unknown')?.lines.join('\n') ?? '';
    expect(lines).toMatch(/UNKNOWN records: 1 \(33% of the records in the area\)/);
    expect(lines).toMatch(/It is not “no”, and no wheelchair tag is written for an UNKNOWN record/);
  });
  it('says nothing about a share when there are no records', () => {
    expect(section([], 'unknown')?.lines).toEqual(['No records, so there is nothing to say about UNKNOWN.']);
  });
});

describe('cells', () => {
  it('says the share of cells is not how much is known', () => {
    expect(section(full, 'cells')?.lines[0]).toMatch(/does not say how much of the area is known/);
  });
  it('splits cells into recorded, only-UNKNOWN and no record', () => {
    const c = computeCoverage(grid, full).summary;
    expect(section(full, 'cells')?.lines[1]).toBe(`${c.cellsWithRecordedStatus} cells hold recorded statuses, ${c.cellsOnlyUnknown} hold only UNKNOWN records and ${c.cellsNoRecord} have no record yet.`);
  });
});

describe('outside the area', () => {
  it('appears only when something is outside or skipped', () => {
    expect(section([rec(43.8599, -79.4399, 'yes')], 'outside')).toBeUndefined();
    expect(section(full, 'outside')?.lines[0]).toBe('Records outside the area, not counted in any cell: 1.');
  });
  it('reports a status it does not recognise as left out, not as UNKNOWN', () => {
    expect(section([odd], 'outside')?.lines[0]).toMatch(/not counted as UNKNOWN\): 1\./);
  });
});

describe('dates', () => {
  it('gives the range and how old the newest is', () => {
    const lines = section(full, 'dates', 'en', { today: '2026-11-25' })?.lines ?? [];
    expect(lines[0]).toBe('Observations dated 2026-11-01 to 2026-11-21.');
    expect(lines[1]).toBe('The newest is 4 days old.');
  });
  it('notes records older than the mapping day', () => {
    expect(section(full, 'dates')?.lines.join(' ')).toMatch(/Some records are older than this mapping day/);
  });
  it('leaves out the age without a today, and for a date in the future', () => {
    expect(section(full, 'dates')?.lines.join(' ')).not.toMatch(/days old/);
    expect(section(full, 'dates', 'en', { today: '2026-11-01' })?.lines.join(' ')).not.toMatch(/days old/);
  });
  it('is absent with no records', () => {
    expect(section([], 'dates')).toBeUndefined();
  });
});

describe('next', () => {
  it('lists cells to look at again, with only-UNKNOWN first, up to the limit', () => {
    const lines = section(full, 'next', 'en', { nextLimit: 3 })?.lines ?? [];
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatch(/^[A-Z]+\d+: /);
  });
  it('says a full grid is still not a fully known area', () => {
    const everything: CoverageRecord[] = [];
    for (let row = 0; row < grid.rows; row++) for (let col = 0; col < grid.cols; col++) everything.push(rec(43.86 - (row + 0.5) * grid.latStep, -79.44 + (col + 0.5) * grid.lonStep, 'yes'));
    expect(section(everything, 'next')?.lines[0]).toMatch(/does not mean the area is fully known/);
  });
});

describe('limits', () => {
  it('always ends with what the numbers cannot say', () => {
    for (const lang of ['en', 'fr'] as const) {
      const sections = buildDebrief(session, computeCoverage(grid, full), lang);
      expect(sections.at(-1)?.id).toBe('limits');
    }
    const lines = section(full, 'limits')?.lines.join('\n') ?? '';
    expect(lines).toMatch(/Nobody else has checked them/);
    expect(lines).toMatch(/not a score/);
    expect(lines).toMatch(/A cell with no record is not inaccessible/);
    expect(lines).toMatch(/not medical or eligibility advice/);
  });
});

describe('wording in both languages', () => {
  const cases: [string, CoverageRecord[]][] = [['full', full], ['empty', []], ['odd', [odd]]];
  for (const [name, records] of cases) {
    it(`has no banned word, and French is correctly spaced (${name})`, () => {
      for (const lang of ['en', 'fr'] as const) {
        const sections = buildDebrief(session, computeCoverage(grid, records), lang, { today: '2026-11-25' });
        for (const text of allStrings(sections)) {
          expect(bannedIn(text), text).toEqual([]);
          if (lang === 'fr') expect(lintFrench(text), text).toEqual([]);
        }
      }
    });
  }
  it('has the same sections in both languages', () => {
    const c = computeCoverage(grid, full);
    expect(buildDebrief(session, c, 'fr').map((s) => s.id)).toEqual(buildDebrief(session, c, 'en').map((s) => s.id));
  });
  it('never calls a place inaccessible or rates an area', () => {
    const text = allStrings(buildDebrief(session, computeCoverage(grid, full), 'en')).join(' ').replace(/is not inaccessible/g, '').replace(/does not rank/g, '').replace(/not a score/g, '');
    expect(text).not.toMatch(/inaccessible|\bscore\b|\brating\b|\bgrade\b|best|worst|safe/i);
  });
});

describe('renderDebrief', () => {
  const sections = buildDebrief(session, computeCoverage(grid, full), 'en');
  it('renders text with a heading and indented lines', () => {
    const text = renderDebrief(session, sections, 'en');
    expect(text.startsWith('Mapping day debrief: “Main Street” (2026-11-21)\n\nWhat you recorded\n  3 records')).toBe(true);
    expect(text.endsWith('\n')).toBe(true);
    expect(text).not.toMatch(/\n\n\n/);
  });
  it('renders markdown with headings and bullets', () => {
    const text = renderDebrief(session, sections, 'en', 'markdown');
    expect(text.startsWith('# Mapping day debrief')).toBe(true);
    expect(text).toMatch(/^## What you recorded$/m);
    expect(text).toMatch(/^- 3 records/m);
  });
  it('renders the French heading with the right quotes and spacing', () => {
    const text = renderDebrief(session, buildDebrief(session, computeCoverage(grid, full), 'fr'), 'fr');
    expect(text.startsWith('Bilan de la journée de cartographie «\u202fMain Street\u202f» (2026-11-21)')).toBe(true);
    expect(lintFrench(text)).toEqual([]);
  });
});
