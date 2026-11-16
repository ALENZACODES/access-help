/**
 * Files the person can keep from a mapping day: a table of cells, the cells as shapes, and the
 * debrief. They describe the person's own plan and counts. They are not accessibility data and
 * carry no licence of their own beyond what the person chooses for what they record.
 * Nothing here sends anything anywhere.
 */
import { cellBounds, type Grid } from './day-grid';
import type { Coverage } from './day-coverage';
import type { MappingDay } from './day-session';
import { buildDebrief, renderDebrief } from './day-debrief';
import { slug, type DayLang } from './day-text';

export interface DayFile {
  name: string;
  mime: string;
  content: string;
}

const CSV_COLUMNS = ['cell', 'row', 'col', 'south', 'west', 'north', 'east', 'records', 'yes', 'limited', 'no', 'UNKNOWN', 'state', 'oldest', 'newest'] as const;

/** Stops a spreadsheet from running a cell as a formula. */
export function safeCell(text: string): string {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

export function csvField(value: string | number | null): string {
  // Numbers are written as they are: a negative longitude is not a formula.
  const text = value === null ? '' : typeof value === 'number' ? String(value) : safeCell(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Six decimals, as a number, so a negative longitude stays a number. */
const fixed = (n: number): number => Number(n.toFixed(6));


export function coverageCsv(coverage: Coverage): string {
  const rows: string[] = [CSV_COLUMNS.join(',')];
  for (const cell of coverage.cells) {
    const b = cellBounds(coverage.grid, cell);
    rows.push(
      [cell.label, cell.row, cell.col, fixed(b.south), fixed(b.west), fixed(b.north), fixed(b.east), cell.total, cell.counts.yes, cell.counts.limited, cell.counts.no, cell.counts.UNKNOWN, cell.state, cell.oldest, cell.newest].map(csvField).join(','),
    );
  }
  return `${rows.join('\r\n')}\r\n`;
}

interface Feature {
  type: 'Feature';
  properties: Record<string, string | number | null>;
  geometry: { type: 'Polygon'; coordinates: number[][][] };
}

function polygon(grid: Grid, row: number, col: number): number[][][] {
  const b = cellBounds(grid, { row, col });
  const r = (n: number) => Math.round(n * 1e6) / 1e6;
  return [[[r(b.west), r(b.north)], [r(b.east), r(b.north)], [r(b.east), r(b.south)], [r(b.west), r(b.south)], [r(b.west), r(b.north)]]];
}

export function coverageGeoJson(session: MappingDay, coverage: Coverage): string {
  const features: Feature[] = coverage.cells.map((cell) => ({
    type: 'Feature',
    properties: { cell: cell.label, records: cell.total, yes: cell.counts.yes, limited: cell.counts.limited, no: cell.counts.no, UNKNOWN: cell.counts.UNKNOWN, state: cell.state, oldest: cell.oldest, newest: cell.newest },
    geometry: { type: 'Polygon', coordinates: polygon(coverage.grid, cell.row, cell.col) },
  }));
  return JSON.stringify(
    {
      type: 'FeatureCollection',
      name: session.name,
      note: 'Planning cells with counts of the contributor’s own records. Not accessibility data. A cell with no record says nothing about the place.',
      features,
    },
    null,
    2,
  );
}

export function dayFileBase(session: MappingDay): string {
  return `mapping-day-${session.date}-${slug(session.name)}`;
}

export function buildDayFiles(session: MappingDay, coverage: Coverage, lang: DayLang, today?: string): DayFile[] {
  const base = dayFileBase(session);
  const sections = buildDebrief(session, coverage, lang, { today });
  return [
    { name: `${base}-cells.csv`, mime: 'text/csv', content: coverageCsv(coverage) },
    { name: `${base}-cells.geojson`, mime: 'application/geo+json', content: coverageGeoJson(session, coverage) },
    { name: `${base}-debrief.txt`, mime: 'text/plain', content: renderDebrief(session, sections, lang, 'text') },
    { name: `${base}-session.json`, mime: 'application/json', content: JSON.stringify(session, null, 2) },
  ];
}
