import { emptyLog, recordAsk, type AskLog } from './log.js';
import type { LetterInput } from './letter.js';
import { emptyMeasures, type MeasuredPlace, type Measures } from '../place-measures/index.js';

export const TODAY = '2026-11-19';

export function place(over: Partial<MeasuredPlace> = {}): MeasuredPlace {
  return { id: 'a1', name: 'Sample Library', wheelchair: 'limited', source: 'own visit', licence: 'CC0-1.0', observedOn: '2026-11-10', ...over };
}

/** What the person measured: steps and the door, with a tape. */
export function measured(over: Partial<Measures> = {}): Measures {
  return { ...emptyMeasures('a1', '2026-11-12'), method: 'tape', steps: 2, stepHeightCm: 14, doorWidthCm: 82.5, ...over };
}

/** What the place said: a wider door, a button, a ramp and a wheelchair toilet. */
export function told(over: Partial<Measures> = {}): Measures {
  return { ...emptyMeasures('a1', '2026-11-16'), steps: 2, doorWidthCm: 90, doorOpening: 'button', ramp: 'yes', toilet: 'yes', ...over };
}

export function letterInput(over: Partial<LetterInput> = {}): LetterInput {
  return { placeName: 'Sample Library', questions: ['steps', 'doorWidthCm', 'toilet'], withHints: true, ...over };
}

/** Two asks for a1 (one answered) and one for a2. */
export function sampleLog(): AskLog {
  let log = emptyLog();
  for (const [recordId, askedOn, channel] of [
    ['a1', '2026-11-11', 'email'],
    ['a1', '2026-11-15', 'phone'],
    ['a2', '2026-11-13', 'message'],
  ] as const) {
    const result = recordAsk(log, { recordId, askedOn, channel, questions: ['doorWidthCm', 'toilet'] }, TODAY);
    if (result.ok) log = result.log;
  }
  return log;
}
