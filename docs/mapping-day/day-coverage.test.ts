import { describe, expect, it } from 'vitest';
import { cellRows, cellAt, cellsWithRecordsText, computeCoverage, describeCell, revisitList, stateText, type CoverageRecord } from './day-coverage';
import { makeGrid, type Grid } from './day-grid';
import { bannedIn, lintFrench } from './day-lint.test';

const g = makeGrid({ south: 43.85, west: -79.44, north: 43.86, east: -79.42 }, 400);
if (!g.ok) throw new Error('grid');
const grid: Grid = g.grid;

let n = 0;
const rec = (lat: number, lon: number, wheelchair: CoverageRecord['wheelchair'] = 'yes', observedOn = '2026-11-21'): CoverageRecord => ({ id: `r${++n}`, lat, lon, wheelchair, observedOn });
// North-west corner cell and south-east corner cell.
const NW = { lat: 43.8599, lon: -79.4399 };
const SE = { lat: 43.8501, lon: -79.4201 };

describe('computeCoverage', () => {
  it('starts with every cell empty and says nothing about the share', () => {
    const c = computeCoverage(grid, []);
    expect(c.cells).toHaveLength(grid.rows * grid.cols);
    expect(c.cells.every((cell) => cell.state === 'no-record' && cell.total === 0 && cell.oldest === null)).toBe(true);
    expect(c.summary).toMatchObject({ records: 0, cellsWithRecords: 0, cellsNoRecord: grid.rows * grid.cols, unknownShare: null, outside: 0 });
    expect(c.summary.cellsWithRecordsShare).toBe(0);
  });
  it('counts records by status into the cell they fall in', () => {
    const c = computeCoverage(grid, [rec(NW.lat, NW.lon, 'yes'), rec(NW.lat, NW.lon, 'no'), rec(NW.lat, NW.lon, 'UNKNOWN'), rec(SE.lat, SE.lon, 'limited')]);
    const a = cellAt(c, { row: 0, col: 0 });
    expect(a?.counts).toEqual({ yes: 1, limited: 0, no: 1, UNKNOWN: 1 });
    expect(a?.total).toBe(3);
    expect(a?.state).toBe('has-recorded-status');
    expect(cellAt(c, { row: grid.rows - 1, col: grid.cols - 1 })?.counts.limited).toBe(1);
    expect(c.summary.byStatus).toEqual({ yes: 1, limited: 1, no: 1, UNKNOWN: 1 });
    expect(c.summary.records).toBe(4);
  });
  it('calls a cell with only UNKNOWN records "only-unknown", not empty and not "no"', () => {
    const c = computeCoverage(grid, [rec(NW.lat, NW.lon, 'UNKNOWN')]);
    const cell = cellAt(c, { row: 0, col: 0 });
    expect(cell?.state).toBe('only-unknown');
    expect(cell?.counts.no).toBe(0);
    expect(c.summary).toMatchObject({ cellsOnlyUnknown: 1, cellsWithRecordedStatus: 0, cellsWithRecords: 1, unknownShare: 1 });
  });
  it('lists records outside the area and counts them nowhere', () => {
    const outside = rec(44, -79.43);
    const c = computeCoverage(grid, [outside, rec(NW.lat, NW.lon)]);
    expect(c.outsideIds).toEqual([outside.id]);
    expect(c.summary.outside).toBe(1);
    expect(c.summary.records).toBe(1);
  });
  it('skips a record with a status it does not know, and does not count it as UNKNOWN', () => {
    const odd = { ...rec(NW.lat, NW.lon), wheelchair: 'maybe' as never };
    const c = computeCoverage(grid, [odd]);
    expect(c.skippedIds).toEqual([odd.id]);
    expect(c.summary.records).toBe(0);
    expect(c.summary.byStatus.UNKNOWN).toBe(0);
  });
  it('keeps the oldest and newest dates in a cell', () => {
    const c = computeCoverage(grid, [rec(NW.lat, NW.lon, 'yes', '2026-10-01'), rec(NW.lat, NW.lon, 'no', '2026-11-20'), rec(NW.lat, NW.lon, 'no', '2026-11-02')]);
    const cell = cellAt(c, { row: 0, col: 0 });
    expect([cell?.oldest, cell?.newest]).toEqual(['2026-10-01', '2026-11-20']);
  });
  it('can look at one day, or at everything since a day', () => {
    const records = [rec(NW.lat, NW.lon, 'yes', '2026-11-01'), rec(NW.lat, NW.lon, 'no', '2026-11-21'), rec(SE.lat, SE.lon, 'no', '2026-11-22')];
    expect(computeCoverage(grid, records, { kind: 'on', date: '2026-11-21' }).summary.records).toBe(1);
    expect(computeCoverage(grid, records, { kind: 'since', date: '2026-11-21' }).summary.records).toBe(2);
    expect(computeCoverage(grid, records).summary.records).toBe(3);
  });
  it('keeps the cell counts adding up to the summary', () => {
    const records = [rec(NW.lat, NW.lon), rec(43.855, -79.43, 'limited'), rec(43.857, -79.425, 'UNKNOWN'), rec(SE.lat, SE.lon, 'no')];
    const c = computeCoverage(grid, records);
    expect(c.cells.reduce((sum, cell) => sum + cell.total, 0)).toBe(c.summary.records);
    expect(c.summary.cellsWithRecordedStatus + c.summary.cellsOnlyUnknown + c.summary.cellsNoRecord).toBe(c.summary.cells);
  });
  it('does not change the records it reads', () => {
    const records = [rec(NW.lat, NW.lon)];
    const before = JSON.stringify(records);
    computeCoverage(grid, records);
    expect(JSON.stringify(records)).toBe(before);
  });
});

describe('cellRows', () => {
  it('gives rows north to south with columns west to east', () => {
    const rows = cellRows(computeCoverage(grid, []));
    expect(rows).toHaveLength(grid.rows);
    expect(rows.every((row) => row.length === grid.cols)).toBe(true);
    expect(rows[0]?.[0]?.label).toBe('A1');
    expect(rows[0]?.[1]?.label).toBe('B1');
  });
});

describe('revisitList', () => {
  const c = computeCoverage(grid, [rec(NW.lat, NW.lon, 'yes'), rec(SE.lat, SE.lon, 'UNKNOWN')]);
  it('puts only-unknown cells before empty ones and leaves out cells with a recorded status', () => {
    const list = revisitList(c);
    expect(list[0]?.state).toBe('only-unknown');
    expect(list.find((cell) => cell.label === 'A1')).toBeUndefined();
    expect(list.filter((cell) => cell.state === 'only-unknown')).toHaveLength(1);
    expect(list).toHaveLength(c.cells.length - 1);
  });
  it('keeps reading order inside each group', () => {
    const empties = revisitList(c).filter((cell) => cell.state === 'no-record');
    const keys = empties.map((cell) => cell.row * 1000 + cell.col);
    expect(keys).toEqual([...keys].sort((a, b) => a - b));
  });
  it('honours a limit, including zero', () => {
    expect(revisitList(c, 2)).toHaveLength(2);
    expect(revisitList(c, 0)).toEqual([]);
  });
});

describe('wording', () => {
  const c = computeCoverage(grid, [rec(NW.lat, NW.lon, 'yes'), rec(NW.lat, NW.lon, 'UNKNOWN'), rec(NW.lat, NW.lon, 'limited'), rec(NW.lat, NW.lon, 'no')]);
  it('describes an empty cell as no record yet', () => {
    expect(describeCell(cellAt(c, { row: 1, col: 1 })!, 'en')).toBe('B2: No record here yet');
    expect(describeCell(cellAt(c, { row: 1, col: 1 })!, 'fr')).toBe('B2 : Aucune fiche ici pour l’instant');
  });
  it('describes a cell with every status', () => {
    const text = describeCell(cellAt(c, { row: 0, col: 0 })!, 'en');
    expect(text).toBe('A1: 4 records, 1 recorded as step-free entrance, 1 recorded as partial access, 1 recorded as no step-free access, 1 UNKNOWN');
  });
  it('writes the French description with correct spacing and singular for one record', () => {
    const one = computeCoverage(grid, [rec(NW.lat, NW.lon, 'yes')]);
    const text = describeCell(cellAt(one, { row: 0, col: 0 })!, 'fr');
    expect(text).toMatch(/^A1 : 1 fiche, 1 consignée comme entrée sans marche$/);
    expect(lintFrench(text)).toEqual([]);
  });
  it('says the share of cells with a record is not how much is known', () => {
    expect(cellsWithRecordsText(c.summary, 'en')).toMatch(/does not say how much of the area is known/);
    expect(cellsWithRecordsText(c.summary, 'fr')).toMatch(/Cela ne dit pas quelle part de la zone est connue/);
    expect(lintFrench(cellsWithRecordsText(c.summary, 'fr'))).toEqual([]);
  });
  it('never uses a banned word or implies an empty cell is inaccessible', () => {
    for (const state of ['no-record', 'only-unknown', 'has-recorded-status'] as const) {
      for (const lang of ['en', 'fr'] as const) {
        const text = stateText(state, lang);
        expect(bannedIn(text)).toEqual([]);
        expect(text).not.toMatch(/inaccessible|not accessible|no access|aucun accès/i);
      }
    }
  });
});
