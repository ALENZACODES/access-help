/** What an edit would change in a saved observation, field by field. Pure. */
import type { MyNote } from './organise.js';

export const NOTE_FIELDS = ['name', 'wheelchair', 'lat', 'lon', 'source', 'licence', 'observedOn'] as const;
export type NoteField = (typeof NOTE_FIELDS)[number];

export interface FieldChange {
  field: NoteField;
  /** Empty string for a name that is not set. */
  before: string;
  after: string;
}

function show(note: MyNote, field: NoteField): string {
  const value = note[field];
  return value === null ? '' : String(value);
}

export function noteChanges(before: MyNote, after: MyNote): FieldChange[] {
  const out: FieldChange[] = [];
  for (const field of NOTE_FIELDS) {
    if (before[field] !== after[field]) out.push({ field, before: show(before, field), after: show(after, field) });
  }
  return out;
}

export function sameNote(a: MyNote, b: MyNote): boolean {
  return a.id === b.id && noteChanges(a, b).length === 0;
}

/** True when the edit changes what was seen or when, not just how it is written down. */
export function changesObservation(changes: readonly FieldChange[]): boolean {
  return changes.some((c) => c.field === 'wheelchair' || c.field === 'observedOn' || c.field === 'lat' || c.field === 'lon');
}
