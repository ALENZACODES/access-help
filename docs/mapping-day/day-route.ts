/**
 * A suggested order for visiting cells, and a rough time if the person gives a pace.
 *
 * Distances are straight lines between cell centres. They are not walking routes: they do not
 * know about stairs, kerbs, closed paths or crossings. With no pace given there is no time
 * estimate at all, because inventing one would present a guess as information.
 */
import { cellCentre, cellLabel, inGrid, metresBetween, type CellRef, type Grid } from './day-grid';
import { fill, formatDistance, formatMinutes, type DayLang } from './day-text';

export type OrderStyle = 'rows' | 'nearest';

export interface Leg {
  from: string;
  to: string;
  metres: number;
}

export interface PlannedRoute {
  style: OrderStyle;
  order: CellRef[];
  labels: string[];
  legs: Leg[];
  straightLineMetres: number;
}

export interface Pace {
  /** Walking or rolling speed in metres per minute, given by the person. */
  metresPerMinute?: number;
  /** Time spent at each cell, in minutes, given by the person. */
  minutesPerCell?: number;
}

export interface TimeEstimate {
  travelMinutes: number | null;
  stopMinutes: number | null;
  totalMinutes: number | null;
}

const key = (c: CellRef) => `${c.row},${c.col}`;

function unique(grid: Grid, cells: readonly CellRef[]): CellRef[] {
  const seen = new Set<string>();
  const out: CellRef[] = [];
  for (const cell of cells) {
    if (!inGrid(grid, cell) || seen.has(key(cell))) continue;
    seen.add(key(cell));
    out.push({ row: cell.row, col: cell.col });
  }
  return out;
}

/** North to south, alternating west-east and east-west, so there is no long walk back at the end of a row. */
export function orderByRows(grid: Grid, cells: readonly CellRef[]): CellRef[] {
  const items = unique(grid, cells).sort((a, b) => a.row - b.row || a.col - b.col);
  const rows = new Map<number, CellRef[]>();
  for (const cell of items) (rows.get(cell.row) ?? rows.set(cell.row, []).get(cell.row)!).push(cell);
  const out: CellRef[] = [];
  let flip = false;
  for (const row of [...rows.keys()].sort((a, b) => a - b)) {
    const list = rows.get(row) ?? [];
    out.push(...(flip ? [...list].reverse() : list));
    flip = !flip;
  }
  return out;
}

/** Greedy nearest neighbour from a start cell (default: the north-west most cell). Ties go to reading order. */
export function orderByNearest(grid: Grid, cells: readonly CellRef[], start?: CellRef): CellRef[] {
  const left = unique(grid, cells).sort((a, b) => a.row - b.row || a.col - b.col);
  if (left.length === 0) return [];
  let current = start && inGrid(grid, start) ? { ...start } : (left[0] as CellRef);
  const out: CellRef[] = [];
  const first = left.findIndex((c) => key(c) === key(current));
  if (first >= 0) {
    out.push(left[first] as CellRef);
    left.splice(first, 1);
  }
  while (left.length > 0) {
    const here = cellCentre(grid, current);
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    left.forEach((cell, index) => {
      const d = metresBetween(here, cellCentre(grid, cell));
      if (d < bestDistance - 1e-6) {
        best = index;
        bestDistance = d;
      }
    });
    current = left[best] as CellRef;
    out.push(current);
    left.splice(best, 1);
  }
  return out;
}

export function planRoute(grid: Grid, cells: readonly CellRef[], style: OrderStyle = 'rows', start?: CellRef): PlannedRoute {
  const order = style === 'rows' ? orderByRows(grid, cells) : orderByNearest(grid, cells, start);
  const legs: Leg[] = [];
  for (let i = 1; i < order.length; i++) {
    const a = order[i - 1] as CellRef;
    const b = order[i] as CellRef;
    legs.push({ from: cellLabel(a), to: cellLabel(b), metres: metresBetween(cellCentre(grid, a), cellCentre(grid, b)) });
  }
  return { style, order, labels: order.map(cellLabel), legs, straightLineMetres: legs.reduce((sum, leg) => sum + leg.metres, 0) };
}

function positive(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/** Each part is null when the person did not give the number it needs. Nothing is assumed. */
export function estimateTime(route: PlannedRoute, pace: Pace): TimeEstimate {
  const travelMinutes = positive(pace.metresPerMinute) && route.order.length > 0 ? route.straightLineMetres / pace.metresPerMinute : null;
  const stopMinutes = typeof pace.minutesPerCell === 'number' && Number.isFinite(pace.minutesPerCell) && pace.minutesPerCell >= 0 ? pace.minutesPerCell * route.order.length : null;
  const totalMinutes = travelMinutes !== null && stopMinutes !== null ? travelMinutes + stopMinutes : null;
  return { travelMinutes, stopMinutes, totalMinutes };
}

/** "A1 → B1 → B2", with an arrow a screen reader reads as "to" through the surrounding text. */
export function orderText(route: PlannedRoute): string {
  return route.labels.join(' → ');
}

export function routeSummary(route: PlannedRoute, time: TimeEstimate, lang: DayLang): string[] {
  if (route.order.length === 0) {
    return [lang === 'fr' ? 'Aucune cellule à parcourir.' : 'No cells to visit.'];
  }
  const lines = [
    fill(lang === 'fr' ? '{count} cellules à parcourir dans cet ordre : {order}.' : '{count} cells to visit in this order: {order}.', { count: route.order.length, order: orderText(route) }),
    fill(
      lang === 'fr'
        ? 'Distance à vol d’oiseau entre les centres : {distance}. Ce n’est pas un trajet : elle ne tient pas compte des marches, des trottoirs ni des traverses.'
        : 'Straight-line distance between centres: {distance}. This is not a walking route: it does not know about steps, kerbs or crossings.',
      { distance: formatDistance(route.straightLineMetres, lang) },
    ),
  ];
  if (time.totalMinutes !== null) {
    lines.push(fill(lang === 'fr' ? 'Avec votre rythme, environ {total} (déplacements {travel}, arrêts {stops}).' : 'At your pace, about {total} (travel {travel}, stops {stops}).', { total: formatMinutes(time.totalMinutes), travel: formatMinutes(time.travelMinutes ?? 0), stops: formatMinutes(time.stopMinutes ?? 0) }));
  } else {
    lines.push(lang === 'fr' ? 'Aucune durée n’est estimée : indiquez votre rythme de déplacement et le temps passé à chaque cellule pour en obtenir une.' : 'No time is estimated: enter your own pace and the time you spend in each cell to get one.');
  }
  return lines;
}
