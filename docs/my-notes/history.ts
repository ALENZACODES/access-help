/**
 * A short list of the person's last changes on this screen, so one can be taken back.
 * Pure: it works on lists of notes and returns new lists. It is kept for the visit only and
 * is never stored.
 */
import type { MyNote } from './organise.js';

export type Step =
  | { kind: 'edit'; before: MyNote; after: MyNote }
  | { kind: 'remove'; removed: MyNote[] };

export const MAX_STEPS = 20;

export function addStep(steps: readonly Step[], step: Step): Step[] {
  if (step.kind === 'remove' && step.removed.length === 0) return [...steps];
  return [...steps, step].slice(-MAX_STEPS);
}

export interface UndoResult {
  steps: Step[];
  /** Null when there was nothing to take back. */
  undone: Step | null;
  /** Notes to save again: the earlier version of an edited note, or the removed notes. */
  restore: MyNote[];
  /** Removed notes that could not come back because the device list is full. */
  notRestored: number;
}

/**
 * Takes back the last step against the notes saved now. An edited note returns to how it was,
 * even if it has since been removed. Removed notes return unless the list is full or a note
 * with the same id has been saved since.
 */
export function undoLast(steps: readonly Step[], current: readonly MyNote[], maxNotes: number): UndoResult {
  const last = steps[steps.length - 1];
  if (last === undefined) return { steps: [], undone: null, restore: [], notRestored: 0 };
  const rest = steps.slice(0, -1);
  if (last.kind === 'edit') {
    const present = current.some((note) => note.id === last.before.id);
    if (!present && current.length >= maxNotes) return { steps: rest, undone: last, restore: [], notRestored: 1 };
    return { steps: rest, undone: last, restore: [last.before], notRestored: 0 };
  }
  const ids = new Set(current.map((note) => note.id));
  const restore: MyNote[] = [];
  let room = Math.max(0, maxNotes - current.length);
  let notRestored = 0;
  for (const note of last.removed) {
    if (ids.has(note.id)) continue;
    if (room === 0) {
      notRestored += 1;
      continue;
    }
    restore.push(note);
    room -= 1;
  }
  return { steps: rest, undone: last, restore, notRestored };
}

export function canUndo(steps: readonly Step[]): boolean {
  return steps.length > 0;
}
