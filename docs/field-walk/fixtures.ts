import type { WalkStep } from './steps.js';
import { answerStep, beginWalk, skipStep, type Walk } from './walk.js';
import { emptyMeasures, type Measures } from '../place-measures/index.js';

export const TODAY = '2026-11-19';
export const SEEN = { id: 'a1', observedOn: '2026-11-10' };

export function fresh(): Walk {
  return beginWalk('a1', TODAY, null);
}

/** Answers the questions given, in order, and fails loudly on a bad answer. */
export function answered(pairs: readonly [WalkStep, string][], from: Walk = fresh()): Walk {
  let walk = from;
  for (const [step, value] of pairs) {
    const result = answerStep(walk, step, value);
    if (!result.ok) throw new Error(`${step}: ${result.issue}`);
    walk = result.walk;
  }
  return walk;
}

/** Every question answered: two steps, a door, a button, a ramp, a toilet, with a tape. */
export function complete(): Walk {
  return answered([['steps', '2'], ['stepHeight', '14'], ['ramp', 'no'], ['doorWidth', '82.5'], ['doorOpening', 'button'], ['toilet', 'yes'], ['toiletDoor', '86'], ['method', 'tape']]);
}

/** No step and no wheelchair toilet, the ramp skipped: three questions never come up. */
export function short(): Walk {
  let walk = answered([['steps', '0']]);
  walk = skipStep(walk, 'ramp');
  return answered([['doorWidth', '32 in'], ['doorOpening', 'manual'], ['toilet', 'no'], ['method', 'estimate']], walk);
}

export function saved(over: Partial<Measures> = {}): Measures {
  return { ...emptyMeasures('a1', '2026-11-12'), method: 'tape', steps: 2, stepHeightCm: 14, doorWidthCm: 82.5, ...over };
}
