import { emptyMeasures, type Measures } from './measures.js';
import type { MeasuredPlace } from './sheet.js';

export const TODAY = '2026-11-19';

export function place(over: Partial<MeasuredPlace> = {}): MeasuredPlace {
  return { id: 'a1', name: 'Sample Library', wheelchair: 'limited', source: 'own visit', licence: 'CC0-1.0', observedOn: '2026-11-10', ...over };
}

/** Everything measured with a tape. */
export function full(over: Partial<Measures> = {}): Measures {
  return { recordId: 'a1', measuredOn: '2026-11-12', method: 'tape', steps: 2, stepHeightCm: 14, doorWidthCm: 82.5, doorOpening: 'button', ramp: 'no', toilet: 'yes', toiletDoorCm: 86, ...over };
}

/** One fact only: the door width, estimated. */
export function sparse(over: Partial<Measures> = {}): Measures {
  return { ...emptyMeasures('a1', '2026-11-12'), method: 'estimate', doorWidthCm: 80, ...over };
}

/** No step and no wheelchair toilet, so two facts do not apply. */
export function flat(over: Partial<Measures> = {}): Measures {
  return { ...emptyMeasures('a1', '2026-11-12'), steps: 0, toilet: 'no', ramp: 'yes', doorOpening: 'automatic', ...over };
}
