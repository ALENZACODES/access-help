import { describe, expect, it } from 'vitest';
import {
  GRID_ISSUE_TEXT,
  MAX_CELLS,
  allCells,
  boundsAround,
  cellBounds,
  cellCentre,
  cellCount,
  cellLabel,
  cellOf,
  columnLetters,
  describePoint,
  gridIssueText,
  inGrid,
  makeGrid,
  metresBetween,
  parseCellLabel,
  parseDecimal,
  validateBounds,
  type Bounds,
  type Grid,
} from './day-grid';
import { allStrings, bannedIn, lintFrench } from './day-lint.test';

const TOWN: Bounds = { south: 43.85, west: -79.44, north: 43.86, east: -79.42 };
const grid = (bounds: Bounds = TOWN, size = 200): Grid => {
  const result = makeGrid(bounds, size);
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.grid;
};

describe('parseDecimal', () => {
  it('reads a dot or a comma', () => {
    expect(parseDecimal('43.85')).toBe(43.85);
    expect(parseDecimal(' 43,85 ')).toBe(43.85);
    expect(parseDecimal('-79,4')).toBe(-79.4);
    expect(parseDecimal('+5')).toBe(5);
  });
  it('ignores spaces at either end, including a hard space', () => {
    expect(parseDecimal('\u00a043,85\u202f')).toBe(43.85);
  });
  it('refuses anything that is not one plain number', () => {
    for (const text of ['', ' ', 'abc', '1,234.5', '1.2.3', '4e5', '--1', '43.', '.5', '1 2']) expect(parseDecimal(text), text).toBeNull();
  });
});

describe('distance', () => {
  it('is zero for one point and about 111 km per degree of latitude', () => {
    expect(metresBetween({ lat: 43, lon: -79 }, { lat: 43, lon: -79 })).toBe(0);
    expect(metresBetween({ lat: 43, lon: -79 }, { lat: 44, lon: -79 })).toBeGreaterThan(111_000);
    expect(metresBetween({ lat: 43, lon: -79 }, { lat: 44, lon: -79 })).toBeLessThan(111_400);
  });
  it('shrinks east-west with latitude', () => {
    const equator = metresBetween({ lat: 0, lon: 0 }, { lat: 0, lon: 1 });
    const ontario = metresBetween({ lat: 44, lon: 0 }, { lat: 44, lon: 1 });
    expect(ontario / equator).toBeCloseTo(Math.cos((44 * Math.PI) / 180), 2);
  });
});

describe('validateBounds', () => {
  it('accepts a normal area', () => {
    expect(validateBounds(TOWN)).toEqual([]);
  });
  it('flags values that are not numbers', () => {
    expect(validateBounds({ ...TOWN, south: Number.NaN }).map((i) => `${i.field}:${i.code}`)).toEqual(['south:not-a-number']);
  });
  it('flags values out of range', () => {
    expect(validateBounds({ ...TOWN, north: 91 }).map((i) => i.field)).toEqual(['north']);
    expect(validateBounds({ ...TOWN, west: -181 }).map((i) => i.code)).toEqual(['out-of-range']);
  });
  it('flags edges the wrong way round or equal', () => {
    expect(validateBounds({ ...TOWN, south: 44, north: 43 }).map((i) => i.code)).toEqual(['south-not-below-north']);
    expect(validateBounds({ ...TOWN, west: -79.42, east: -79.42 }).map((i) => i.code)).toEqual(['west-not-below-east']);
  });
  it('flags an area over 8 km on a side', () => {
    expect(validateBounds({ south: 43, north: 43.1, west: -79.44, east: -79.42 }).map((i) => i.code)).toEqual(['too-tall']);
    expect(validateBounds({ south: 43.85, north: 43.86, west: -79.6, east: -79.4 }).map((i) => i.code)).toEqual(['too-wide']);
  });
});

describe('makeGrid', () => {
  it('splits an area into rows and columns that cover it', () => {
    const g = grid();
    expect(g.rows).toBe(6);
    expect(g.cols).toBe(9);
    expect(cellCount(g)).toBe(54);
    expect(g.latStep * g.rows).toBeCloseTo(TOWN.north - TOWN.south, 9);
    expect(g.lonStep * g.cols).toBeCloseTo(TOWN.east - TOWN.west, 9);
  });
  it('makes cells close to the asked size', () => {
    const g = grid(TOWN, 100);
    const b = cellBounds(g, { row: 0, col: 0 });
    const height = metresBetween({ lat: b.south, lon: b.west }, { lat: b.north, lon: b.west });
    const width = metresBetween({ lat: b.north, lon: b.west }, { lat: b.north, lon: b.east });
    expect(height).toBeGreaterThan(90);
    expect(height).toBeLessThan(110);
    expect(width).toBeGreaterThan(90);
    expect(width).toBeLessThan(110);
  });
  it('refuses a cell size that is not on the list', () => {
    const r = makeGrid(TOWN, 123);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0]).toEqual({ code: 'bad-cell-size', field: 'cellMetres' });
  });
  it('refuses an area under half a cell', () => {
    const r = makeGrid({ south: 43.85, north: 43.8501, west: -79.44, east: -79.4399 }, 200);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0]?.code).toBe('smaller-than-a-cell');
  });
  it('refuses more than the cell cap', () => {
    const r = makeGrid({ south: 43.8, north: 43.86, west: -79.5, east: -79.42 }, 50);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0]?.code).toBe('too-many-cells');
    expect(MAX_CELLS).toBe(400);
  });
  it('reports bounds problems without building anything', () => {
    const r = makeGrid({ ...TOWN, south: 50 }, 100);
    expect(r.ok).toBe(false);
  });
});

describe('cellOf', () => {
  const g = grid();
  it('puts the north-west corner in the first cell', () => {
    expect(cellOf(g, { lat: TOWN.north, lon: TOWN.west })).toEqual({ row: 0, col: 0 });
  });
  it('puts the south-east corner in the last cell', () => {
    expect(cellOf(g, { lat: TOWN.south, lon: TOWN.east })).toEqual({ row: g.rows - 1, col: g.cols - 1 });
  });
  it('returns null outside the area or for a non-number', () => {
    expect(cellOf(g, { lat: 44, lon: -79.43 })).toBeNull();
    expect(cellOf(g, { lat: 43.855, lon: -79.5 })).toBeNull();
    expect(cellOf(g, { lat: Number.NaN, lon: -79.43 })).toBeNull();
  });
  it('agrees with the cell bounds for every cell centre', () => {
    for (const cell of allCells(g)) expect(cellOf(g, cellCentre(g, cell))).toEqual(cell);
  });
  it('keeps a point in exactly the cell whose bounds hold it', () => {
    const point = { lat: 43.8553, lon: -79.4312 };
    const cell = cellOf(g, point);
    expect(cell).not.toBeNull();
    const b = cellBounds(g, cell as { row: number; col: number });
    expect(point.lat).toBeGreaterThanOrEqual(b.south);
    expect(point.lat).toBeLessThanOrEqual(b.north);
    expect(point.lon).toBeGreaterThanOrEqual(b.west);
    expect(point.lon).toBeLessThanOrEqual(b.east);
  });
});

describe('cells', () => {
  const g = grid();
  it('lists every cell once, in reading order', () => {
    const cells = allCells(g);
    expect(cells).toHaveLength(cellCount(g));
    expect(cells[0]).toEqual({ row: 0, col: 0 });
    expect(cells[1]).toEqual({ row: 0, col: 1 });
    expect(new Set(cells.map((c) => `${c.row},${c.col}`)).size).toBe(cells.length);
  });
  it('tiles the area with no gap', () => {
    const a = cellBounds(g, { row: 0, col: 0 });
    const b = cellBounds(g, { row: 0, col: 1 });
    const c = cellBounds(g, { row: 1, col: 0 });
    expect(a.east).toBeCloseTo(b.west, 9);
    expect(a.south).toBeCloseTo(c.north, 9);
    expect(cellBounds(g, { row: g.rows - 1, col: g.cols - 1 }).south).toBeCloseTo(TOWN.south, 9);
  });
  it('checks that a cell is inside the grid', () => {
    expect(inGrid(g, { row: 0, col: 0 })).toBe(true);
    expect(inGrid(g, { row: g.rows, col: 0 })).toBe(false);
    expect(inGrid(g, { row: -1, col: 0 })).toBe(false);
    expect(inGrid(g, { row: 0.5, col: 0 })).toBe(false);
  });
});

describe('labels', () => {
  it('counts columns in letters, then double letters', () => {
    expect([0, 1, 25, 26, 27, 51, 52].map(columnLetters)).toEqual(['A', 'B', 'Z', 'AA', 'AB', 'AZ', 'BA']);
  });
  it('writes column then row, rows from 1', () => {
    expect(cellLabel({ row: 2, col: 1 })).toBe('B3');
    expect(cellLabel({ row: 0, col: 26 })).toBe('AA1');
  });
  it('reads a label back, in either case', () => {
    expect(parseCellLabel('B3')).toEqual({ row: 2, col: 1 });
    expect(parseCellLabel(' aa1 ')).toEqual({ row: 0, col: 26 });
  });
  it('round-trips every label in a grid', () => {
    for (const cell of allCells(grid())) expect(parseCellLabel(cellLabel(cell))).toEqual(cell);
  });
  it('refuses bad labels', () => {
    for (const text of ['', '3B', 'B0', 'B', '12', 'ABC1', 'B-1']) expect(parseCellLabel(text), text).toBeNull();
  });
});

describe('boundsAround', () => {
  it('returns null for no usable points', () => {
    expect(boundsAround([])).toBeNull();
    expect(boundsAround([{ lat: Number.NaN, lon: 1 }])).toBeNull();
  });
  it('wraps the points and adds a margin in metres', () => {
    const b = boundsAround([{ lat: 43.85, lon: -79.43 }, { lat: 43.855, lon: -79.425 }], 100) as Bounds;
    expect(b.south).toBeLessThan(43.85);
    expect(b.north).toBeGreaterThan(43.855);
    expect(metresBetween({ lat: b.south, lon: -79.43 }, { lat: 43.85, lon: -79.43 })).toBeGreaterThan(95);
    expect(metresBetween({ lat: b.south, lon: -79.43 }, { lat: 43.85, lon: -79.43 })).toBeLessThan(105);
  });
  it('makes bounds a grid accepts when there is a margin', () => {
    const b = boundsAround([{ lat: 43.85, lon: -79.43 }], 120) as Bounds;
    expect(makeGrid(b, 100).ok).toBe(true);
  });
  it('never goes past the poles or the date line', () => {
    const b = boundsAround([{ lat: 89.9999, lon: 179.9999 }], 5000) as Bounds;
    expect(b.north).toBeLessThanOrEqual(90);
    expect(b.east).toBeLessThanOrEqual(180);
  });
});

describe('text', () => {
  it('describes a point with hemispheres, in French with a decimal comma', () => {
    expect(describePoint({ lat: 43.85, lon: -79.43 }, 'en')).toBe('43.8500\u00a0N, 79.4300\u00a0W');
    expect(describePoint({ lat: 43.85, lon: -79.43 }, 'fr')).toBe('43,8500\u00a0N, 79,4300\u00a0O');
  });
  it('has a message in both languages for every issue and none is banned or badly spaced', () => {
    for (const [code, text] of Object.entries(GRID_ISSUE_TEXT)) {
      expect(text.en.length, code).toBeGreaterThan(10);
      expect(text.fr.length, code).toBeGreaterThan(10);
      expect(bannedIn(text.en + text.fr), code).toEqual([]);
      expect(lintFrench(text.fr), code).toEqual([]);
    }
    expect(allStrings(GRID_ISSUE_TEXT).length).toBe(Object.keys(GRID_ISSUE_TEXT).length * 2);
    expect(gridIssueText({ code: 'bad-cell-size', field: 'cellMetres' }, 'fr')).toMatch(/50, 100, 200 ou 400/);
  });
});
