/**
 * Finds a person's own saved observations that look like the same place saved more than once.
 * Pure: no network, no storage, no clock. A group is a suggestion for the person to look at.
 * Nothing here removes or changes an observation.
 */
import { nameSimilarity } from '../compare-notes/match.js';
import { haversineMetres } from '../presubmit/geo.js';

export interface OwnNote {
  id: string;
  lat: number;
  lon: number;
  name: string | null;
  wheelchair: string;
  source: string;
  licence: string;
  observedOn: string;
}

export const DISTANCE_CHOICES = [10, 25, 50] as const;
export const DEFAULT_DISTANCE = 25;
export const NAME_MATCH = 0.5;
export const MAX_NOTES = 500;

export type LinkReason = 'same-name-close' | 'no-name-close';

export interface Link {
  a: string;
  b: string;
  metres: number;
  reason: LinkReason;
}

/**
 * Two notes are linked when they are within the distance and either their names share at least
 * half their words, or at least one has no name. Two different names close together are
 * neighbours, not the same place, and are not linked.
 */
export function linkFor(a: OwnNote, b: OwnNote, maxMetres: number): Link | null {
  if (Math.abs(a.lat - b.lat) > 0.01) return null;
  const metres = haversineMetres(a, b);
  if (!Number.isFinite(metres) || metres > maxMetres) return null;
  const similarity = nameSimilarity(a.name, b.name);
  if (similarity === null) return { a: a.id, b: b.id, metres, reason: 'no-name-close' };
  if (similarity >= NAME_MATCH) return { a: a.id, b: b.id, metres, reason: 'same-name-close' };
  return null;
}

export function linksAmong(notes: readonly OwnNote[], maxMetres: number): Link[] {
  const limit = Math.min(notes.length, MAX_NOTES);
  const out: Link[] = [];
  for (let i = 0; i < limit; i += 1) {
    const a = notes[i];
    if (a === undefined) continue;
    for (let j = i + 1; j < limit; j += 1) {
      const b = notes[j];
      if (b === undefined) continue;
      const link = linkFor(a, b, maxMetres);
      if (link !== null) out.push(link);
    }
  }
  return out;
}

export interface Group {
  /** Stable key: the ids in the group, sorted and joined. */
  key: string;
  /** Members, newest observation first. */
  notes: OwnNote[];
  links: Link[];
  /** Largest distance between two linked members, in metres. */
  spanMetres: number;
}

/** Groups notes joined by links, directly or through another note. Notes with no link are left out. */
export function groupNotes(notes: readonly OwnNote[], maxMetres: number = DEFAULT_DISTANCE): Group[] {
  const links = linksAmong(notes, maxMetres);
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== undefined && parent.get(root) !== root) root = parent.get(root) as string;
    return root;
  };
  for (const link of links) {
    if (!parent.has(link.a)) parent.set(link.a, link.a);
    if (!parent.has(link.b)) parent.set(link.b, link.b);
    const ra = find(link.a);
    const rb = find(link.b);
    if (ra !== rb) parent.set(ra < rb ? rb : ra, ra < rb ? ra : rb);
  }
  const byId = new Map(notes.map((note) => [note.id, note] as const));
  const members = new Map<string, OwnNote[]>();
  for (const id of parent.keys()) {
    const note = byId.get(id);
    if (note === undefined) continue;
    const root = find(id);
    members.set(root, [...(members.get(root) ?? []), note]);
  }
  const groups: Group[] = [];
  for (const list of members.values()) {
    const ids = new Set(list.map((n) => n.id));
    const own = links.filter((link) => ids.has(link.a) && ids.has(link.b));
    const sorted = [...list].sort((x, y) => y.observedOn.localeCompare(x.observedOn) || x.id.localeCompare(y.id));
    groups.push({
      key: [...ids].sort().join('|'),
      notes: sorted,
      links: own,
      spanMetres: own.reduce((max, link) => Math.max(max, link.metres), 0),
    });
  }
  return groups.sort((x, y) => y.notes.length - x.notes.length || x.key.localeCompare(y.key));
}
