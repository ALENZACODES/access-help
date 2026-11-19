/**
 * Builds what the observations screen shows and carries out its three actions: correct one
 * observation, remove some, take the last change back. Corrections go through the same form
 * rules as a new observation, so UNKNOWN stays UNKNOWN and only open licences are accepted.
 */
import { parseForm, type FieldErrors, type FormFields } from "./contribute.js";
import {
  addMineStep,
  cleanMineSort,
  mineChangeText,
  mineChangesObservation,
  mineNoteChanges,
  mineNoteLine,
  mineShownText,
  mineSummaryLines,
  mineUndoText,
  searchMine,
  sortMine,
  summariseMine,
  undoLastMine,
  type MineStep,
} from "./docs-bridge.js";
import { MAX_DRAFTS, type DraftStore } from "./store.js";
import type { Language, PlaceRecord } from "./types.js";

export interface MineRow {
  record: PlaceRecord;
  line: string;
}

export interface MineView {
  summaryLines: string[];
  rows: MineRow[];
  shownText: string;
  total: number;
}

export function buildMineView(records: readonly PlaceRecord[], search: string, sort: string, language: Language): MineView {
  const found = sortMine(searchMine(records, search), cleanMineSort(sort));
  return {
    summaryLines: mineSummaryLines(summariseMine(records), language),
    rows: found.map((record) => ({ record, line: mineNoteLine(record, language) })),
    shownText: mineShownText(found.length, records.length, language),
    total: records.length,
  };
}

/** The form filled from a saved observation. The confirmation box always starts empty. */
export function fieldsFor(record: PlaceRecord): FormFields {
  return {
    name: record.name ?? "",
    lat: String(record.lat),
    lon: String(record.lon),
    wheelchair: record.wheelchair,
    source: record.source,
    licence: record.licence,
    observedOn: record.observedOn,
    consent: false,
  };
}

export interface EditPreview {
  /** Lines saying what would change. Empty when nothing would, or when the form has a mistake. */
  changes: string[];
  /** True when the edit changes what was seen, where or when. */
  touchesObservation: boolean;
}

/** What the form would change, worked out without the confirmation box. */
export function previewEdit(record: PlaceRecord, fields: FormFields, today: string, language: Language): EditPreview {
  const result = parseForm({ ...fields, consent: true }, today, record.id);
  if (!result.ok) return { changes: [], touchesObservation: false };
  const changes = mineNoteChanges(record, result.record);
  return { changes: changes.map((change) => mineChangeText(change, language)), touchesObservation: mineChangesObservation(changes) };
}

export type EditOutcome =
  | { kind: "invalid"; errors: FieldErrors }
  | { kind: "unchanged" }
  | { kind: "failed" }
  | { kind: "saved"; steps: MineStep[] };

export function saveEdit(store: Pick<DraftStore, "add">, record: PlaceRecord, fields: FormFields, today: string, steps: readonly MineStep[]): EditOutcome {
  const result = parseForm(fields, today, record.id);
  if (!result.ok) return { kind: "invalid", errors: result.errors };
  if (mineNoteChanges(record, result.record).length === 0) return { kind: "unchanged" };
  if (!store.add(result.record).ok) return { kind: "failed" };
  return { kind: "saved", steps: addMineStep(steps, { kind: "edit", before: record, after: result.record }) };
}

export interface RemoveOutcome {
  removed: number;
  steps: MineStep[];
}

export function removeSelected(store: Pick<DraftStore, "remove">, records: readonly PlaceRecord[], ids: ReadonlySet<string>, steps: readonly MineStep[]): RemoveOutcome {
  const removed = records.filter((record) => ids.has(record.id));
  for (const record of removed) store.remove(record.id);
  return { removed: removed.length, steps: addMineStep(steps, { kind: "remove", removed }) };
}

export interface UndoOutcome {
  steps: MineStep[];
  /** Null when the device refused to save and nothing was taken back. */
  message: string | null;
}

export function undoMine(store: Pick<DraftStore, "add" | "list">, steps: readonly MineStep[], language: Language): UndoOutcome {
  const result = undoLastMine(steps, store.list(), MAX_DRAFTS);
  for (const note of result.restore) {
    if (!store.add(note as PlaceRecord).ok) return { steps: [...steps], message: null };
  }
  return { steps: result.steps, message: mineUndoText(result, language) };
}

export function toggleId(ids: ReadonlySet<string>, id: string, on: boolean): Set<string> {
  const next = new Set(ids);
  if (on) next.add(id);
  else next.delete(id);
  return next;
}

/** Drops selected ids that are no longer in the list. */
export function keepSelected(ids: ReadonlySet<string>, records: readonly PlaceRecord[]): Set<string> {
  const present = new Set(records.map((record) => record.id));
  return new Set([...ids].filter((id) => present.has(id)));
}
