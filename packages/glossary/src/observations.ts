import { isFeatureId } from './featureRecords';
import type { Place } from './places';
import { TERMS } from './plainTerms';
import { isIsoDate } from './provenance';
import { mergeClaims, type FeatureStatus } from './status';

/**
 * What a person saw for themselves at a place: one feature, whether it was there, and the day.
 * These are the person's own notes. They stay on this device, they are never mixed into the
 * records, and they never change what the list reports about a place. The page only sets them
 * beside the records, so a person can see where the two say different things.
 */
export const SEEN_VALUES = ['there', 'not-there', 'not-sure'] as const;
export type Seen = (typeof SEEN_VALUES)[number];

export interface Observation {
  readonly placeId: string;
  readonly termId: string;
  readonly seen: Seen;
  /** YYYY-MM-DD, the day the person saw it. */
  readonly date: string;
  readonly note?: string;
}

export type Observations = readonly Observation[];

export const MAX_OBSERVATIONS = 500;
export const MAX_SEEN_NOTE = 140;
export const SEEN_STORE_KEY = 'glossary-seen';

export function isSeen(value: unknown): value is Seen {
  return typeof value === 'string' && (SEEN_VALUES as readonly string[]).includes(value);
}

function termOrder(termId: string): number {
  const at = TERMS.findIndex((t) => t.id === termId);
  return at === -1 ? TERMS.length : at;
}

/** Runs of spaces become one space and the ends are trimmed. Nothing is cut. */
export function cleanSeenNote(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** What the form holds, as typed. */
export interface SeenDraft {
  readonly termId: string;
  readonly seen: string;
  readonly date: string;
  readonly note: string;
}

export const SEEN_FIELDS = ['termId', 'seen', 'date', 'note'] as const;
export type SeenField = (typeof SEEN_FIELDS)[number];

export function emptySeenDraft(today: string): SeenDraft {
  return { termId: '', seen: '', date: today, note: '' };
}

export type SeenProblem = 'feature-missing' | 'seen-missing' | 'date-invalid' | 'date-in-future' | 'note-too-long';

export function seenFieldOf(problem: SeenProblem): SeenField {
  if (problem === 'feature-missing') return 'termId';
  if (problem === 'seen-missing') return 'seen';
  if (problem === 'note-too-long') return 'note';
  return 'date';
}

export function cleanSeenDraft(draft: SeenDraft): SeenDraft {
  return { termId: draft.termId.trim(), seen: draft.seen.trim(), date: draft.date.trim(), note: cleanSeenNote(draft.note) };
}

/** Every problem at once, in the order of the form. A note that is too long is reported, never shortened. */
export function seenDraftProblems(draft: SeenDraft, today: string): readonly SeenProblem[] {
  const d = cleanSeenDraft(draft);
  const out: SeenProblem[] = [];
  if (!isFeatureId(d.termId)) out.push('feature-missing');
  if (!isSeen(d.seen)) out.push('seen-missing');
  if (!isIsoDate(d.date)) out.push('date-invalid');
  else if (d.date > today) out.push('date-in-future');
  if (d.note.length > MAX_SEEN_NOTE) out.push('note-too-long');
  return out;
}

export function observationFromDraft(placeId: string, draft: SeenDraft): Observation {
  const d = cleanSeenDraft(draft);
  const base = { placeId, termId: d.termId, seen: d.seen as Seen, date: d.date };
  return d.note === '' ? base : { ...base, note: d.note };
}

export function sameObservation(a: Observation, b: Observation): boolean {
  return a.placeId === b.placeId && a.termId === b.termId && a.seen === b.seen && a.date === b.date && (a.note ?? '') === (b.note ?? '');
}

export function findObservation(list: Observations, placeId: string, termId: string): number {
  return list.findIndex((o) => o.placeId === placeId && o.termId === termId);
}

export type SeenOutcome = 'added' | 'changed' | 'same' | 'invalid' | 'no-place' | 'full';

export interface SeenResult {
  readonly list: Observations;
  readonly outcome: SeenOutcome;
  readonly problems: readonly SeenProblem[];
  /** The note that was replaced, when one was. */
  readonly before?: Observation;
}

/**
 * Keeps one note for a place and a feature. A second note for the same place and feature
 * replaces the first, in the same position, so each line is what the person saw last.
 */
export function setObservation(list: Observations, placeId: string, draft: SeenDraft, today: string): SeenResult {
  if (placeId === '') return { list, outcome: 'no-place', problems: [] };
  const problems = seenDraftProblems(draft, today);
  if (problems.length > 0) return { list, outcome: 'invalid', problems };
  const next = observationFromDraft(placeId, draft);
  const at = findObservation(list, placeId, next.termId);
  if (at === -1) {
    if (list.length >= MAX_OBSERVATIONS) return { list, outcome: 'full', problems: [] };
    return { list: [...list, next], outcome: 'added', problems: [] };
  }
  const before = list[at] as Observation;
  if (sameObservation(before, next)) return { list, outcome: 'same', problems: [] };
  return { list: list.map((o, i) => (i === at ? next : o)), outcome: 'changed', problems: [], before };
}

export interface SeenRemoval {
  readonly list: Observations;
  readonly removed: Observation | null;
  readonly position: number;
}

export function removeObservation(list: Observations, index: number): SeenRemoval {
  const removed = Number.isInteger(index) ? list[index] : undefined;
  if (removed === undefined) return { list, removed: null, position: -1 };
  return { list: list.filter((_, i) => i !== index), removed, position: index };
}

/** Puts a note back where it was. A note for the same place and feature made since then gives way to it. */
export function insertObservation(list: Observations, observation: Observation, position: number): Observations {
  const rest = list.filter((o) => !(o.placeId === observation.placeId && o.termId === observation.termId));
  const at = Math.max(0, Math.min(Number.isInteger(position) ? position : rest.length, rest.length));
  return [...rest.slice(0, at), observation, ...rest.slice(at)];
}

/** The notes for one place, in the order of the glossary. */
export function observationsOf(list: Observations, placeId: string): Observations {
  return list.filter((o) => o.placeId === placeId).sort((a, b) => termOrder(a.termId) - termOrder(b.termId));
}

/** Keeps the notes for the given places only. */
export function pruneObservations(list: Observations, ids: readonly string[]): Observations {
  const keep = new Set(ids);
  const out = list.filter((o) => keep.has(o.placeId));
  return out.length === list.length ? list : out;
}

export function serialiseObservations(list: Observations): string {
  return JSON.stringify(list.map((o) => (o.note === undefined ? { placeId: o.placeId, termId: o.termId, seen: o.seen, date: o.date } : { placeId: o.placeId, termId: o.termId, seen: o.seen, date: o.date, note: o.note })));
}

function readObservation(raw: unknown): Observation | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.placeId !== 'string' || r.placeId === '' || r.placeId.length > 200) return null;
  if (typeof r.termId !== 'string' || !isFeatureId(r.termId)) return null;
  if (!isSeen(r.seen)) return null;
  if (typeof r.date !== 'string' || !isIsoDate(r.date)) return null;
  const base = { placeId: r.placeId, termId: r.termId, seen: r.seen, date: r.date };
  if (r.note === undefined) return base;
  if (typeof r.note !== 'string') return null;
  const note = cleanSeenNote(r.note);
  if (note.length > MAX_SEEN_NOTE) return null;
  return note === '' ? base : { ...base, note };
}

/**
 * Reads stored notes. Text that is not a list gives null. A line that is not a note is left
 * out, a second line for the same place and feature is left out, and the list stops at the limit.
 */
export function parseObservations(json: string): Observations | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!Array.isArray(raw)) return null;
  const out: Observation[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (out.length >= MAX_OBSERVATIONS) break;
    const o = readObservation(item);
    if (o === null) continue;
    const key = JSON.stringify([o.placeId, o.termId]);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(o);
  }
  return out;
}

/** How a note stands against the records of its place. */
export type Against = 'same' | 'different' | 'records-unknown' | 'records-disagree' | 'not-compared';

export interface RecordSide {
  readonly status: FeatureStatus;
  readonly conflict: boolean;
}

/** What the records of a place report for one feature, by the same rules as the list. */
export function recordSide(place: Pick<Place, 'claims'>, termId: string): RecordSide {
  const resolved = mergeClaims([termId], place.claims)[0];
  return resolved === undefined ? { status: 'unknown', conflict: false } : { status: resolved.status, conflict: resolved.conflict };
}

/**
 * Sets a note beside the records. A person who could not tell is not compared. Records that
 * report nothing stay unknown: a note never fills that gap in what the list reports.
 */
export function compareSeen(place: Pick<Place, 'claims'>, observation: Pick<Observation, 'termId' | 'seen'>): Against {
  if (observation.seen === 'not-sure') return 'not-compared';
  const side = recordSide(place, observation.termId);
  if (side.conflict) return 'records-disagree';
  if (side.status === 'unknown') return 'records-unknown';
  return (side.status === 'present') === (observation.seen === 'there') ? 'same' : 'different';
}

export interface SeenRow {
  readonly observation: Observation;
  /** Position in the stored list, for the remove button. */
  readonly index: number;
  /** Position of the place in the loaded places. */
  readonly placeIndex: number;
  readonly placeName: string;
  readonly against: Against;
  readonly record: RecordSide;
}

/** One row per note whose place is loaded: by place name, then in the order of the glossary. */
export function seenRows(list: Observations, places: readonly Place[], locale: string): readonly SeenRow[] {
  const byId = new Map<string, number>();
  places.forEach((p, i) => {
    if (!byId.has(p.id)) byId.set(p.id, i);
  });
  const rows: SeenRow[] = [];
  list.forEach((observation, index) => {
    const placeIndex = byId.get(observation.placeId);
    if (placeIndex === undefined) return;
    const place = places[placeIndex] as Place;
    rows.push({ observation, index, placeIndex, placeName: place.name, against: compareSeen(place, observation), record: recordSide(place, observation.termId) });
  });
  return rows.sort(
    (a, b) => a.placeName.localeCompare(b.placeName, locale) || a.placeIndex - b.placeIndex || termOrder(a.observation.termId) - termOrder(b.observation.termId),
  );
}

/** How many notes are for places that are not loaded now. They are kept, and not shown. */
export function notLoadedCount(list: Observations, places: readonly Place[]): number {
  const ids = new Set(places.map((p) => p.id));
  return list.filter((o) => !ids.has(o.placeId)).length;
}

export const AGAINST_VALUES = ['same', 'different', 'records-unknown', 'records-disagree', 'not-compared'] as const;

export function againstCounts(rows: readonly SeenRow[]): Readonly<Record<Against, number>> {
  const out: Record<Against, number> = { same: 0, different: 0, 'records-unknown': 0, 'records-disagree': 0, 'not-compared': 0 };
  for (const row of rows) out[row.against] += 1;
  return out;
}

export const SEEN_FILTERS = ['all', 'different', 'records-unknown'] as const;
export type SeenFilter = (typeof SEEN_FILTERS)[number];

export function isSeenFilter(value: unknown): value is SeenFilter {
  return typeof value === 'string' && (SEEN_FILTERS as readonly string[]).includes(value);
}

/** "different" also keeps the notes where the sources in the records disagree with each other. */
export function filterSeenRows(rows: readonly SeenRow[], filter: SeenFilter): readonly SeenRow[] {
  if (filter === 'different') return rows.filter((r) => r.against === 'different' || r.against === 'records-disagree');
  if (filter === 'records-unknown') return rows.filter((r) => r.against === 'records-unknown');
  return rows;
}
