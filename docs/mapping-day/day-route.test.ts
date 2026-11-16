import { describe, expect, it } from 'vitest';
import { estimateTime, orderByNearest, orderByRows, orderText, planRoute, routeSummary } from './day-route';
import { cellCentre, cellLabel, makeGrid, metresBetween, type CellRef, type Grid } from './day-grid';
import { bannedIn, lintFrench } from './day-lint.test';

const made = makeGrid({ south: 43.85, west: -79.44, north: 43.86, east: -79.42 }, 400);
if (!made.ok) throw new Error('grid');
const grid: Grid = made.grid;
const C = (row: number, col: number): CellRef => ({ row, col });
const labels = (cells: CellRef[]) => cells.map(cellLabel);

describe('orderByRows', () => {
  it('goes west to east along the north row, then back along the next row', () => {
    expect(labels(orderByRows(grid, [C(1, 0), C(0, 1), C(0, 0), C(1, 1), C(0, 2), C(1, 2)]))).toEqual(['A1', 'B1', 'C1', 'C2', 'B2', 'A2']);
  });
  it('flips again on the third row', () => {
    expect(labels(orderByRows(grid, [C(0, 0), C(0, 1), C(1, 0), C(1, 1), C(2, 0), C(2, 1)]))).toEqual(['A1', 'B1', 'B2', 'A2', 'A3', 'B3']);
  });
  it('skips cells outside the grid and repeats', () => {
    expect(labels(orderByRows(grid, [C(0, 0), C(0, 0), C(99, 0), C(0, -1)]))).toEqual(['A1']);
  });
  it('returns nothing for nothing and leaves its input alone', () => {
    expect(orderByRows(grid, [])).toEqual([]);
    const input = [C(1, 0), C(0, 0)];
    orderByRows(grid, input);
    expect(input).toEqual([C(1, 0), C(0, 0)]);
  });
});

describe('orderByNearest', () => {
  it('starts at the north-west cell when no start is given', () => {
    expect(orderByNearest(grid, [C(2, 2), C(0, 0), C(0, 1)])[0]).toEqual(C(0, 0));
  });
  it('starts at the given cell when it is in the list', () => {
    const order = orderByNearest(grid, [C(0, 0), C(0, 1), C(0, 2)], C(0, 2));
    expect(labels(order)).toEqual(['C1', 'B1', 'A1']);
  });
  it('walks to the closest cell next', () => {
    expect(labels(orderByNearest(grid, [C(0, 0), C(0, 4), C(0, 1), C(0, 3)]))).toEqual(['A1', 'B1', 'D1', 'E1']);
  });
  it('visits every cell exactly once', () => {
    const cells = [C(0, 0), C(2, 3), C(1, 1), C(2, 0), C(0, 4), C(1, 4)];
    const order = orderByNearest(grid, cells);
    expect(order).toHaveLength(cells.length);
    expect(new Set(labels(order)).size).toBe(cells.length);
  });
  it('is no longer than visiting in the order given, for a scattered set', () => {
    const cells = [C(0, 0), C(2, 4), C(0, 1), C(2, 3), C(1, 2)];
    const length = (order: CellRef[]) => order.slice(1).reduce((sum, cell, i) => sum + metresBetween(cellCentre(grid, order[i] as CellRef), cellCentre(grid, cell)), 0);
    expect(length(orderByNearest(grid, cells))).toBeLessThanOrEqual(length(cells));
  });
  it('is the same for the same input', () => {
    const cells = [C(1, 1), C(0, 0), C(0, 2), C(2, 2)];
    expect(orderByNearest(grid, cells)).toEqual(orderByNearest(grid, [...cells].reverse()));
  });
  it('returns nothing for nothing', () => {
    expect(orderByNearest(grid, [])).toEqual([]);
  });
});

describe('planRoute', () => {
  it('gives labels, legs and the total straight-line distance', () => {
    const route = planRoute(grid, [C(0, 0), C(0, 1), C(1, 1)]);
    expect(route.labels).toEqual(['A1', 'B1', 'B2']);
    expect(route.legs.map((l) => `${l.from}-${l.to}`)).toEqual(['A1-B1', 'B1-B2']);
    expect(route.straightLineMetres).toBeCloseTo(route.legs.reduce((s, l) => s + l.metres, 0), 6);
    expect(route.legs[0]?.metres).toBeGreaterThan(300);
    expect(route.legs[0]?.metres).toBeLessThan(500);
  });
  it('has no legs for one cell and none for no cells', () => {
    expect(planRoute(grid, [C(0, 0)]).legs).toEqual([]);
    expect(planRoute(grid, []).straightLineMetres).toBe(0);
  });
  it('uses the style asked for', () => {
    const cells = [C(0, 0), C(0, 1), C(1, 0), C(1, 1)];
    expect(planRoute(grid, cells, 'rows').labels).toEqual(['A1', 'B1', 'B2', 'A2']);
    expect(planRoute(grid, cells, 'nearest', C(1, 1)).labels[0]).toBe('B2');
  });
  it('writes the order with arrows', () => {
    expect(orderText(planRoute(grid, [C(0, 0), C(0, 1)]))).toBe('A1 → B1');
  });
});

describe('estimateTime', () => {
  const route = planRoute(grid, [C(0, 0), C(0, 1), C(0, 2)]);
  it('gives nothing at all when the person gave no pace', () => {
    expect(estimateTime(route, {})).toEqual({ travelMinutes: null, stopMinutes: null, totalMinutes: null });
  });
  it('gives travel time only when only a speed is given', () => {
    const t = estimateTime(route, { metresPerMinute: 50 });
    expect(t.travelMinutes).toBeCloseTo(route.straightLineMetres / 50, 6);
    expect(t.stopMinutes).toBeNull();
    expect(t.totalMinutes).toBeNull();
  });
  it('gives stop time only when only minutes per cell are given', () => {
    expect(estimateTime(route, { minutesPerCell: 5 })).toMatchObject({ travelMinutes: null, stopMinutes: 15, totalMinutes: null });
  });
  it('adds both when both are given', () => {
    const t = estimateTime(route, { metresPerMinute: 40, minutesPerCell: 10 });
    expect(t.totalMinutes).toBeCloseTo(route.straightLineMetres / 40 + 30, 6);
  });
  it('ignores a speed that is zero, negative or not a number', () => {
    for (const metresPerMinute of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) expect(estimateTime(route, { metresPerMinute }).travelMinutes).toBeNull();
  });
  it('accepts zero minutes per cell', () => {
    expect(estimateTime(route, { metresPerMinute: 40, minutesPerCell: 0 }).stopMinutes).toBe(0);
  });
});

describe('routeSummary', () => {
  const route = planRoute(grid, [C(0, 0), C(0, 1)]);
  it('says the distance is not a walking route', () => {
    const lines = routeSummary(route, estimateTime(route, {}), 'en');
    expect(lines.join(' ')).toMatch(/not a walking route: it does not know about steps, kerbs or crossings/);
  });
  it('says no time is estimated when no pace is given', () => {
    expect(routeSummary(route, estimateTime(route, {}), 'en').at(-1)).toMatch(/^No time is estimated/);
    expect(routeSummary(route, estimateTime(route, {}), 'fr').at(-1)).toMatch(/^Aucune durée n’est estimée/);
  });
  it('gives a time only from the person’s own pace', () => {
    const lines = routeSummary(route, estimateTime(route, { metresPerMinute: 40, minutesPerCell: 10 }), 'en');
    expect(lines.at(-1)).toMatch(/^At your pace, about \d+ min/);
  });
  it('handles an empty route', () => {
    expect(routeSummary(planRoute(grid, []), estimateTime(planRoute(grid, []), {}), 'en')).toEqual(['No cells to visit.']);
  });
  it('is in correct French and has no banned word', () => {
    for (const time of [estimateTime(route, {}), estimateTime(route, { metresPerMinute: 40, minutesPerCell: 5 })]) {
      for (const line of routeSummary(route, time, 'fr')) {
        expect(lintFrench(line), line).toEqual([]);
        expect(bannedIn(line)).toEqual([]);
      }
      for (const line of routeSummary(route, time, 'en')) expect(bannedIn(line)).toEqual([]);
    }
  });
});
