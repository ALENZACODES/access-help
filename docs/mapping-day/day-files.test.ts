import { describe, expect, it } from 'vitest';
import { buildDayFiles, coverageCsv, coverageGeoJson, csvField, dayFileBase, safeCell } from './day-files';
import { computeCoverage } from './day-coverage';
import { cellOf, makeGrid } from './day-grid';
import { createSession, parseSessionText } from './day-session';
import { bannedIn, lintFrench } from './day-lint.test';

const s = createSession({ name: 'Café “Étoile”, Main', date: '2026-11-21', bounds: { south: 43.85, west: -79.44, north: 43.86, east: -79.42 }, cellMetres: 400 });
if (!s.ok) throw new Error('session');
const session = s.session;
const g = makeGrid(session.bounds, session.cellMetres);
if (!g.ok) throw new Error('grid');
const grid = g.grid;
const records = [
  { id: 'a', lat: 43.8599, lon: -79.4399, wheelchair: 'yes' as const, observedOn: '2026-11-21' },
  { id: 'b', lat: 43.8599, lon: -79.4399, wheelchair: 'UNKNOWN' as const, observedOn: '2026-11-20' },
  { id: 'c', lat: 43.8501, lon: -79.4201, wheelchair: 'UNKNOWN' as const, observedOn: '2026-11-21' },
];
const coverage = computeCoverage(grid, records);

describe('spreadsheet safety', () => {
  it('prefixes cells a spreadsheet would run', () => {
    for (const text of ['=SUM(A1)', '+1', '-1', '@x', '\tx']) expect(safeCell(text), text).toBe(`'${text}`);
    expect(safeCell('B3')).toBe('B3');
  });
  it('quotes commas, quotes and line breaks', () => {
    expect(csvField('a,b')).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField('a\nb')).toBe('"a\nb"');
    expect(csvField(null)).toBe('');
    expect(csvField(7)).toBe('7');
    expect(csvField(-79.44)).toBe('-79.44');
  });
});

describe('cells csv', () => {
  const lines = coverageCsv(coverage).split('\r\n');
  it('has a header, one row per cell and a final line break', () => {
    expect(lines[0]).toBe('cell,row,col,south,west,north,east,records,yes,limited,no,UNKNOWN,state,oldest,newest');
    expect(lines).toHaveLength(coverage.cells.length + 2);
    expect(lines.at(-1)).toBe('');
  });
  it('counts a cell’s statuses and keeps UNKNOWN as UNKNOWN in its own column', () => {
    const a1 = lines[1]?.split(',') ?? [];
    expect(a1[0]).toBe('A1');
    expect(a1.slice(7, 12)).toEqual(['2', '1', '0', '0', '1']);
    expect(a1[12]).toBe('has-recorded-status');
    expect(a1.slice(13)).toEqual(['2026-11-20', '2026-11-21']);
  });
  it('leaves date columns empty for a cell with no record, and says "no-record"', () => {
    const empty = lines.find((l) => l.startsWith('B1,')) ?? '';
    expect(empty.endsWith(',0,0,0,0,0,no-record,,')).toBe(true);
  });
  it('writes bounds that put each cell’s own centre back in that cell', () => {
    for (const line of lines.slice(1, -1)) {
      const f = line.split(',');
      const lat = (Number(f[3]) + Number(f[5])) / 2;
      const lon = (Number(f[4]) + Number(f[6])) / 2;
      expect(cellOf(grid, { lat, lon })).toEqual({ row: Number(f[1]), col: Number(f[2]) });
    }
  });
});

describe('cells geojson', () => {
  const geo = JSON.parse(coverageGeoJson(session, coverage)) as { type: string; note: string; features: { properties: Record<string, unknown>; geometry: { coordinates: number[][][] } }[] };
  it('has one polygon per cell with the counts', () => {
    expect(geo.type).toBe('FeatureCollection');
    expect(geo.features).toHaveLength(coverage.cells.length);
    expect(geo.features[0]?.properties).toMatchObject({ cell: 'A1', records: 2, yes: 1, UNKNOWN: 1, state: 'has-recorded-status' });
  });
  it('closes each ring and winds it the same way', () => {
    for (const f of geo.features) {
      const ring = f.geometry.coordinates[0] as number[][];
      expect(ring).toHaveLength(5);
      expect(ring[0]).toEqual(ring[4]);
    }
  });
  it('says in the file that it is not accessibility data', () => {
    expect(geo.note).toMatch(/Not accessibility data/);
    expect(geo.note).toMatch(/A cell with no record says nothing about the place/);
  });
});

describe('file set', () => {
  it('names the files after the date and a plain name', () => {
    expect(dayFileBase(session)).toBe('mapping-day-2026-11-21-cafe-etoile-main');
    const files = buildDayFiles(session, coverage, 'en');
    expect(files.map((f) => f.name)).toEqual([
      'mapping-day-2026-11-21-cafe-etoile-main-cells.csv',
      'mapping-day-2026-11-21-cafe-etoile-main-cells.geojson',
      'mapping-day-2026-11-21-cafe-etoile-main-debrief.txt',
      'mapping-day-2026-11-21-cafe-etoile-main-session.json',
    ]);
    for (const f of files) expect(f.name).toMatch(/^[a-z0-9.-]+$/);
  });
  it('gives a session file that reads back to the same session', () => {
    const json = buildDayFiles(session, coverage, 'en').find((f) => f.name.endsWith('session.json'));
    expect(parseSessionText(json?.content ?? '')).toEqual({ ok: true, session });
  });
  it('gives a debrief in the language asked, in correct French', () => {
    const fr = buildDayFiles(session, coverage, 'fr', '2026-11-25').find((f) => f.name.endsWith('debrief.txt'));
    expect(fr?.content).toMatch(/^Bilan de la journée de cartographie/);
    expect(lintFrench(fr?.content ?? '')).toEqual([]);
  });
  it('contains no web address and no banned word', () => {
    for (const lang of ['en', 'fr'] as const) {
      for (const f of buildDayFiles(session, coverage, lang)) {
        expect(f.content, f.name).not.toMatch(/https?:\/\//);
        expect(bannedIn(f.content), f.name).toEqual([]);
      }
    }
  });
  it('is the same every time', () => {
    expect(buildDayFiles(session, coverage, 'en', '2026-11-25')).toEqual(buildDayFiles(session, coverage, 'en', '2026-11-25'));
  });
});
