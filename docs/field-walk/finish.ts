/**
 * Turns a finished walk-through into measures, and says what saving it would change. The
 * person sees the changes first. Saving replaces the place's measures with the answers of this
 * walk; a question that was skipped or left stays UNKNOWN.
 */
import { dropInapplicable } from './steps.js';
import type { Walk } from './walk.js';
import { FACT_KEYS, readForm, type FactKey, type FormIssue, type MeasureForm, type Measures, type SeenOn } from '../place-measures/index.js';

/** The walk's answers in the shape the measuring form reads. Lengths are already in centimetres. */
export function walkForm(walk: Walk): MeasureForm {
  const answers = dropInapplicable(walk.answers);
  return {
    measuredOn: walk.startedOn,
    method: answers.method,
    steps: answers.steps,
    stepHeight: answers.stepHeight,
    doorWidth: answers.doorWidth,
    doorOpening: answers.doorOpening,
    ramp: answers.ramp,
    toilet: answers.toilet,
    toiletDoor: answers.toiletDoor,
  };
}

export type FinishResult = { ok: true; measures: Measures } | { ok: false; issues: FormIssue[] };

/** The measures this walk would save. It goes through the same checks as the measuring form. */
export function finishWalk(walk: Walk, record: SeenOn, today: string): FinishResult {
  return readForm(walkForm(walk), { id: record.id, observedOn: record.observedOn }, today);
}

export type ChangeKind = 'new' | 'changed' | 'same' | 'cleared';

export interface FactChange {
  key: FactKey;
  kind: ChangeKind;
}

/**
 * What saving would do to each fact, against what is saved now. "Cleared" means a saved fact
 * would go back to UNKNOWN because this walk did not answer it.
 */
export function walkChanges(saved: Measures | null, next: Measures): FactChange[] {
  const out: FactChange[] = [];
  for (const key of FACT_KEYS) {
    const before = saved === null ? null : saved[key];
    const after = next[key];
    if (before === null && after === null) continue;
    if (before === null) out.push({ key, kind: 'new' });
    else if (after === null) out.push({ key, kind: 'cleared' });
    else out.push({ key, kind: before === after ? 'same' : 'changed' });
  }
  return out;
}

export function changeCounts(changes: readonly FactChange[]): Record<ChangeKind, number> {
  const counts: Record<ChangeKind, number> = { new: 0, changed: 0, same: 0, cleared: 0 };
  for (const change of changes) counts[change.kind] += 1;
  return counts;
}
