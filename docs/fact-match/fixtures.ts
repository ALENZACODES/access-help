import { emptyCriteria, type Criteria } from './criteria.js';
import type { MatchInput } from './report.js';
import { emptyMeasures, type MeasuredPlace, type Measures } from '../place-measures/index.js';

export const TODAY = '2026-11-19';

export function place(over: Partial<MeasuredPlace> = {}): MeasuredPlace {
  return { id: 'a1', name: 'Sample Library', wheelchair: 'limited', source: 'own visit', licence: 'CC0-1.0', observedOn: '2026-11-10', ...over };
}

export function m(recordId: string, over: Partial<Measures> = {}): Measures {
  return { ...emptyMeasures(recordId, '2026-11-12'), method: 'tape', ...over };
}

/** No step, a door of at least 80 cm. */
export function simple(over: Partial<Criteria> = {}): Criteria {
  return { ...emptyCriteria(), maxSteps: 0, minDoorWidthCm: 80, ...over };
}

/** Every criterion set. */
export function strict(over: Partial<Criteria> = {}): Criteria {
  return { maxSteps: 1, rampInstead: true, maxStepHeightCm: 5, minDoorWidthCm: 80, door: 'not-by-hand', toilet: true, minToiletDoorCm: 85, countTold: false, ...over };
}

/**
 * Four places: one flat with a wide door, one with steps, one with only a door width measured,
 * and one with no measures of the person's own but an answer from the place.
 */
export function sample(): MatchInput {
  return {
    places: [place(), place({ id: 'a2', name: 'Sample Arena' }), place({ id: 'a3', name: 'Sample Café' }), place({ id: 'a4', name: null, wheelchair: 'UNKNOWN' })],
    measured: [m('a1', { steps: 0, doorWidthCm: 90, doorOpening: 'automatic', toilet: 'yes', toiletDoorCm: 88 }), m('a2', { steps: 3, stepHeightCm: 15, doorWidthCm: 76, ramp: 'no' }), m('a3', { doorWidthCm: 82.5 })],
    told: [m('a3', { steps: 0, method: null }), m('a4', { steps: 0, doorWidthCm: 85, method: null })],
  };
}
