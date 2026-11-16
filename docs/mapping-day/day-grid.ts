/**
 * A planning grid over a small area. It splits a rectangle into square-ish cells so a person
 * can see where they have recorded something and where they have not. A cell with no record
 * says nothing about the place: it only means nobody wrote anything down there yet.
 *
 * Pure functions, no network, no clock.
 */
import { NBSP, type DayLang } from './day-text';

export interface Bounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface Point {
  lat: number;
  lon: number;
}

export const CELL_SIZES_M = [50, 100, 200, 400] as const;
export type CellSizeM = (typeof CELL_SIZES_M)[number];

/** A grid larger than this is refused, so the screen stays readable. */
export const MAX_CELLS = 400;
/** The longest side of an area, in metres. */
export const MAX_SIDE_M = 8000;

const M_PER_DEG_LAT = 111_320;
const EARTH_RADIUS_M = 6_371_008.8;

export type GridIssueCode =
  | 'not-a-number'
  | 'out-of-range'
  | 'south-not-below-north'
  | 'west-not-below-east'
  | 'too-wide'
  | 'too-tall'
  | 'smaller-than-a-cell'
  | 'bad-cell-size'
  | 'too-many-cells';

export interface GridIssue {
  code: GridIssueCode;
  /** The field the problem belongs to, so a form can point at it. */
  field: 'south' | 'west' | 'north' | 'east' | 'cellMetres' | 'area';
}

export interface Grid {
  bounds: Bounds;
  cellMetres: CellSizeM;
  rows: number;
  cols: number;
  /** Degrees of latitude and longitude covered by one cell. */
  latStep: number;
  lonStep: number;
}

export type GridResult = { ok: true; grid: Grid } | { ok: false; issues: GridIssue[] };

export interface CellRef {
  row: number;
  col: number;
}

export function isCellSize(value: number): value is CellSizeM {
  return (CELL_SIZES_M as readonly number[]).includes(value);
}

/** Reads "43.85", "43,85" and " 43.85 " as 43.85. Anything else, including "1,234.5", is null. */
export function parseDecimal(text: string): number | null {
  const trimmed = text.replace(/^[\s\u00a0\u202f]+|[\s\u00a0\u202f]+$/g, '');
  if (!/^[+-]?\d+([.,]\d+)?$/.test(trimmed)) return null;
  const value = Number(trimmed.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

/** Straight-line distance over the ground, in metres (haversine). */
export function metresBetween(a: Point, b: Point): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function metresPerDegreeLon(lat: number): number {
  return M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

export function validateBounds(bounds: Bounds): GridIssue[] {
  const issues: GridIssue[] = [];
  const fields = ['south', 'west', 'north', 'east'] as const;
  for (const field of fields) {
    if (!Number.isFinite(bounds[field])) issues.push({ code: 'not-a-number', field });
  }
  if (issues.length > 0) return issues;
  for (const field of ['south', 'north'] as const) {
    if (bounds[field] < -90 || bounds[field] > 90) issues.push({ code: 'out-of-range', field });
  }
  for (const field of ['west', 'east'] as const) {
    if (bounds[field] < -180 || bounds[field] > 180) issues.push({ code: 'out-of-range', field });
  }
  if (issues.length > 0) return issues;
  if (bounds.south >= bounds.north) issues.push({ code: 'south-not-below-north', field: 'south' });
  if (bounds.west >= bounds.east) issues.push({ code: 'west-not-below-east', field: 'west' });
  if (issues.length > 0) return issues;
  const midLat = (bounds.south + bounds.north) / 2;
  const heightM = (bounds.north - bounds.south) * M_PER_DEG_LAT;
  const widthM = (bounds.east - bounds.west) * metresPerDegreeLon(midLat);
  if (heightM > MAX_SIDE_M) issues.push({ code: 'too-tall', field: 'north' });
  if (widthM > MAX_SIDE_M) issues.push({ code: 'too-wide', field: 'east' });
  return issues;
}

/** Builds the grid, or says what is wrong. Row 0 is the northern row, column 0 the western one. */
export function makeGrid(bounds: Bounds, cellMetres: number): GridResult {
  const issues = validateBounds(bounds);
  if (!isCellSize(cellMetres)) issues.push({ code: 'bad-cell-size', field: 'cellMetres' });
  if (issues.length > 0 || !isCellSize(cellMetres)) return { ok: false, issues };
  const midLat = (bounds.south + bounds.north) / 2;
  const heightM = (bounds.north - bounds.south) * M_PER_DEG_LAT;
  const widthM = (bounds.east - bounds.west) * metresPerDegreeLon(midLat);
  if (heightM < cellMetres / 2 || widthM < cellMetres / 2) {
    return { ok: false, issues: [{ code: 'smaller-than-a-cell', field: 'area' }] };
  }
  const rows = Math.max(1, Math.ceil(heightM / cellMetres - 1e-9));
  const cols = Math.max(1, Math.ceil(widthM / cellMetres - 1e-9));
  if (rows * cols > MAX_CELLS) return { ok: false, issues: [{ code: 'too-many-cells', field: 'area' }] };
  return {
    ok: true,
    grid: {
      bounds,
      cellMetres,
      rows,
      cols,
      latStep: (bounds.north - bounds.south) / rows,
      lonStep: (bounds.east - bounds.west) / cols,
    },
  };
}

export function cellCount(grid: Grid): number {
  return grid.rows * grid.cols;
}

/** The cell a point falls in, or null when it is outside the area. The south and east edges belong to the last cell. */
export function cellOf(grid: Grid, point: Point): CellRef | null {
  const { bounds } = grid;
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon)) return null;
  if (point.lat < bounds.south || point.lat > bounds.north || point.lon < bounds.west || point.lon > bounds.east) return null;
  const row = Math.min(grid.rows - 1, Math.floor((bounds.north - point.lat) / grid.latStep));
  const col = Math.min(grid.cols - 1, Math.floor((point.lon - bounds.west) / grid.lonStep));
  return { row, col };
}

export function inGrid(grid: Grid, cell: CellRef): boolean {
  return Number.isInteger(cell.row) && Number.isInteger(cell.col) && cell.row >= 0 && cell.col >= 0 && cell.row < grid.rows && cell.col < grid.cols;
}

export function cellBounds(grid: Grid, cell: CellRef): Bounds {
  const north = grid.bounds.north - cell.row * grid.latStep;
  const west = grid.bounds.west + cell.col * grid.lonStep;
  return { north, south: north - grid.latStep, west, east: west + grid.lonStep };
}

export function cellCentre(grid: Grid, cell: CellRef): Point {
  const b = cellBounds(grid, cell);
  return { lat: (b.north + b.south) / 2, lon: (b.west + b.east) / 2 };
}

/** Column letters A, B, … Z, AA, AB, … */
export function columnLetters(col: number): string {
  let n = col;
  let out = '';
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

/** "B3" is the second column, third row. */
export function cellLabel(cell: CellRef): string {
  return `${columnLetters(cell.col)}${cell.row + 1}`;
}

export function parseCellLabel(label: string): CellRef | null {
  const match = /^([A-Za-z]{1,2})(\d{1,3})$/.exec(label.trim());
  if (!match) return null;
  const letters = (match[1] ?? '').toUpperCase();
  let col = 0;
  for (const ch of letters) col = col * 26 + (ch.charCodeAt(0) - 64);
  const row = Number(match[2]) - 1;
  return row < 0 ? null : { row, col: col - 1 };
}

export function allCells(grid: Grid): CellRef[] {
  const cells: CellRef[] = [];
  for (let row = 0; row < grid.rows; row++) for (let col = 0; col < grid.cols; col++) cells.push({ row, col });
  return cells;
}

/** The smallest area around some points, grown by a margin in metres. Null for no points. */
export function boundsAround(points: readonly Point[], marginM = 0): Bounds | null {
  const usable = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  if (usable.length === 0) return null;
  const lats = usable.map((p) => p.lat);
  const lons = usable.map((p) => p.lon);
  const south = Math.min(...lats);
  const north = Math.max(...lats);
  const west = Math.min(...lons);
  const east = Math.max(...lons);
  const midLat = (south + north) / 2;
  const dLat = Math.max(0, marginM) / M_PER_DEG_LAT;
  const dLon = Math.max(0, marginM) / Math.max(1, metresPerDegreeLon(midLat));
  const round = (n: number) => Math.round(n * 1e6) / 1e6;
  return { south: round(Math.max(-90, south - dLat)), north: round(Math.min(90, north + dLat)), west: round(Math.max(-180, west - dLon)), east: round(Math.min(180, east + dLon)) };
}

/** "43.8500 N, 79.4300 W" style text for a point. */
export function describePoint(point: Point, lang: DayLang): string {
  const ns = point.lat >= 0 ? 'N' : lang === 'fr' ? 'S' : 'S';
  const ew = point.lon >= 0 ? (lang === 'fr' ? 'E' : 'E') : lang === 'fr' ? 'O' : 'W';
  const num = (n: number) => {
    const text = Math.abs(n).toFixed(4);
    return lang === 'fr' ? text.replace('.', ',') : text;
  };
  return `${num(point.lat)}${NBSP}${ns}, ${num(point.lon)}${NBSP}${ew}`;
}

export const GRID_ISSUE_TEXT: Record<GridIssueCode, Record<DayLang, string>> = {
  'not-a-number': { en: 'Enter a number, for example 43.85.', fr: 'Saisissez un nombre, par exemple 43,85.' },
  'out-of-range': { en: 'Latitude is between -90 and 90 and longitude between -180 and 180.', fr: 'La latitude est comprise entre -90 et 90 et la longitude entre -180 et 180.' },
  'south-not-below-north': { en: 'The south edge must be lower than the north edge.', fr: 'Le bord sud doit être plus bas que le bord nord.' },
  'west-not-below-east': { en: 'The west edge must be lower than the east edge.', fr: 'Le bord ouest doit être plus bas que le bord est.' },
  'too-wide': { en: 'The area is more than 8 km wide. Choose a smaller area.', fr: 'La zone fait plus de 8 km de large. Choisissez une zone plus petite.' },
  'too-tall': { en: 'The area is more than 8 km tall. Choose a smaller area.', fr: 'La zone fait plus de 8 km de haut. Choisissez une zone plus petite.' },
  'smaller-than-a-cell': { en: 'The area is smaller than half a cell. Choose a smaller cell size or a larger area.', fr: 'La zone est plus petite que la moitié d’une cellule. Choisissez une cellule plus petite ou une zone plus grande.' },
  'bad-cell-size': { en: 'Choose a cell size of 50, 100, 200 or 400 metres.', fr: 'Choisissez une cellule de 50, 100, 200 ou 400 mètres.' },
  'too-many-cells': { en: 'That makes more than 400 cells. Choose bigger cells or a smaller area.', fr: 'Cela fait plus de 400 cellules. Choisissez des cellules plus grandes ou une zone plus petite.' },
};

export function gridIssueText(issue: GridIssue, lang: DayLang): string {
  return GRID_ISSUE_TEXT[issue.code][lang];
}
