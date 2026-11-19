/**
 * Looks at one group of notes that may be the same place and says what the person should know
 * before keeping one. It suggests which note to keep only when the notes agree. When a person's
 * own notes give different statuses, it suggests nothing: only the person knows which is right.
 */
import type { Group, OwnNote } from './groups.js';

export type GroupKind = 'same' | 'status-differs' | 'only-unknown-differs' | 'details-differ';

export interface Advice {
  kind: GroupKind;
  /** The note the App suggests keeping. Null when the statuses differ. */
  suggestedKeep: string | null;
  /** Distinct statuses in the group, in a fixed order. */
  statuses: string[];
  licences: string[];
  /** True when keeping the suggestion would drop a name another note has. */
  nameOnlyOnAnother: boolean;
}

const KNOWN: readonly string[] = ['yes', 'limited', 'no'];
const STATUS_ORDER: readonly string[] = ['yes', 'limited', 'no', 'UNKNOWN'];

function statusOf(note: OwnNote): string {
  return KNOWN.includes(note.wheelchair) ? note.wheelchair : 'UNKNOWN';
}

function distinct(values: readonly string[], order: readonly string[] = []): string[] {
  const set = [...new Set(values)];
  return set.sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia < 0 ? order.length : ia) - (ib < 0 ? order.length : ib) || a.localeCompare(b);
  });
}

function sameDetails(a: OwnNote, b: OwnNote): boolean {
  return a.name === b.name && a.source === b.source && a.licence === b.licence && a.observedOn === b.observedOn && a.lat === b.lat && a.lon === b.lon;
}

export function adviseGroup(group: Group): Advice {
  const statuses = distinct(group.notes.map(statusOf), STATUS_ORDER);
  const licences = distinct(group.notes.map((n) => n.licence));
  const known = statuses.filter((s) => s !== 'UNKNOWN');
  let kind: GroupKind;
  if (known.length > 1) kind = 'status-differs';
  else if (statuses.length > 1) kind = 'only-unknown-differs';
  else {
    const [first, ...rest] = group.notes;
    kind = first !== undefined && rest.every((note) => sameDetails(first, note)) ? 'same' : 'details-differ';
  }
  // Notes are newest first. With one known status, prefer the newest note that carries it:
  // UNKNOWN never replaces a recorded status.
  let suggestedKeep: string | null = null;
  if (kind !== 'status-differs') {
    const pick = known.length === 1 ? group.notes.find((n) => statusOf(n) === known[0]) : group.notes[0];
    suggestedKeep = pick?.id ?? null;
  }
  const kept = group.notes.find((n) => n.id === suggestedKeep);
  const nameOnlyOnAnother = kept !== undefined && (kept.name === null || kept.name.trim() === '') && group.notes.some((n) => n.name !== null && n.name.trim() !== '');
  return { kind, suggestedKeep, statuses, licences, nameOnlyOnAnother };
}

export interface KeepPlan {
  keep: OwnNote;
  remove: OwnNote[];
}

/** The plan for keeping one note of a group. Null when the id is not in the group. */
export function planKeep(group: Group, keepId: string): KeepPlan | null {
  const keep = group.notes.find((n) => n.id === keepId);
  if (keep === undefined) return null;
  return { keep, remove: group.notes.filter((n) => n.id !== keepId) };
}

export interface DuplicateReport {
  distance: number;
  groups: { group: Group; advice: Advice }[];
  /** Notes that are in a group. */
  notesInGroups: number;
  total: number;
}

export function reportGroups(groups: readonly Group[], total: number, distance: number): DuplicateReport {
  return {
    distance,
    groups: groups.map((group) => ({ group, advice: adviseGroup(group) })),
    notesInGroups: groups.reduce((sum, group) => sum + group.notes.length, 0),
    total,
  };
}
