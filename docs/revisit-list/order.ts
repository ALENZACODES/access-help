/**
 * Puts the chosen places in an order to visit: always the nearest place not yet visited.
 * Distances are straight lines. They are not walking or rolling distances, and the order
 * knows nothing about kerbs, slopes, stairs or closures.
 */
import { haversineMetres, type Point } from '../presubmit/geo.js';
import type { RevisitItem } from './list.js';

export interface Stop {
  /** 1 for the first stop. */
  order: number;
  item: RevisitItem;
  /** Straight-line metres from the previous stop, or from the start for the first stop. Null for a first stop with no start. */
  metresFromPrevious: number | null;
}

export interface VisitOrder {
  stops: Stop[];
  /** Sum of the straight-line legs, in metres. */
  totalMetres: number;
  hasStart: boolean;
}

export function visitOrder(items: readonly RevisitItem[], start: Point | null): VisitOrder {
  const left = [...items];
  const stops: Stop[] = [];
  let here: Point | null = start;
  let total = 0;
  while (left.length > 0) {
    let bestIndex = 0;
    let bestMetres: number | null = null;
    if (here !== null) {
      for (let i = 0; i < left.length; i += 1) {
        const candidate = left[i];
        if (candidate === undefined) continue;
        const metres = haversineMetres(here, candidate.place.record);
        if (bestMetres === null || metres < bestMetres) {
          bestMetres = metres;
          bestIndex = i;
        }
      }
    }
    const [next] = left.splice(bestIndex, 1);
    if (next === undefined) break;
    const leg = bestMetres !== null && Number.isFinite(bestMetres) ? bestMetres : null;
    if (leg !== null) total += leg;
    stops.push({ order: stops.length + 1, item: next, metresFromPrevious: leg });
    here = next.place.record;
  }
  return { stops, totalMetres: total, hasStart: start !== null };
}
