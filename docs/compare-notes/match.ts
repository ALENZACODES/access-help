/**
 * Finds the place in a loaded pack that a person's own observation is most likely about.
 * Pure: no network, no storage, no clock. A match is a suggestion for the person to look at.
 * It never decides that two records are the same place.
 */
import { haversineMetres } from '../presubmit/geo.js';

export interface NoteRecord {
  id: string;
  lat: number;
  lon: number;
  name: string | null;
  wheelchair: string;
  source: string;
  licence: string;
  observedOn: string;
}

export const RADIUS_CHOICES = [15, 30, 60] as const;
export type Radius = (typeof RADIUS_CHOICES)[number];
export const DEFAULT_RADIUS: Radius = 30;
/** Two candidates closer to each other than this, in distance from the observation, cannot be told apart. */
export const TIE_METRES = 5;
export const NAME_MATCH = 0.5;
export const MAX_COMPARED = 5000;

const STOP_WORDS: readonly string[] = ['the', 'a', 'an', 'of', 'and', 'le', 'la', 'les', 'l', 'de', 'du', 'des', 'd', 'et', 'au', 'aux'];

/** Lower-case words of a name, accents removed, small joining words dropped. */
export function nameTokens(name: string | null): string[] {
  if (name === null) return [];
  const words = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((word) => word !== '' && !STOP_WORDS.includes(word));
  return [...new Set(words)];
}

/** Share of words the two names have in common, 0 to 1. Null when either name is missing. */
export function nameSimilarity(a: string | null, b: string | null): number | null {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (ta.length === 0 || tb.length === 0) return null;
  const shared = ta.filter((word) => tb.includes(word)).length;
  return shared / (ta.length + tb.length - shared);
}

export interface Candidate {
  record: NoteRecord;
  metres: number;
  /** Null when either record has no name. */
  similarity: number | null;
  sameId: boolean;
}

/** Pack places within the radius of the observation, best first: same id, then name match, then distance. */
export function candidatesFor(mine: NoteRecord, theirs: readonly NoteRecord[], radius: number): Candidate[] {
  const out: Candidate[] = [];
  const limit = Math.min(theirs.length, MAX_COMPARED);
  for (let i = 0; i < limit; i += 1) {
    const record = theirs[i];
    if (record === undefined) continue;
    const sameId = record.id === mine.id;
    if (!sameId && Math.abs(record.lat - mine.lat) > 0.01) continue;
    const metres = haversineMetres(mine, record);
    if (!Number.isFinite(metres)) continue;
    if (!sameId && metres > radius) continue;
    out.push({ record, metres, similarity: nameSimilarity(mine.name, record.name), sameId });
  }
  const rank = (c: Candidate) => (c.sameId ? 0 : (c.similarity ?? 0) >= NAME_MATCH ? 1 : 2);
  return out.sort((a, b) => rank(a) - rank(b) || a.metres - b.metres || a.record.id.localeCompare(b.record.id));
}

export type MatchKind = 'none' | 'same-id' | 'name-and-place' | 'place-only' | 'unsure';

export interface Match {
  kind: MatchKind;
  /** The suggested pack place. Null for none and for unsure. */
  best: Candidate | null;
  /** Every pack place within the radius, best first. */
  candidates: Candidate[];
}

export function matchFor(mine: NoteRecord, theirs: readonly NoteRecord[], radius: number): Match {
  const candidates = candidatesFor(mine, theirs, radius);
  const [first, second] = candidates;
  if (first === undefined) return { kind: 'none', best: null, candidates };
  if (first.sameId) return { kind: 'same-id', best: first, candidates };
  const named = (c: Candidate) => (c.similarity ?? 0) >= NAME_MATCH;
  if (named(first)) {
    if (second !== undefined && named(second) && Math.abs(second.metres - first.metres) <= TIE_METRES) return { kind: 'unsure', best: null, candidates };
    return { kind: 'name-and-place', best: first, candidates };
  }
  // No name agrees. A different name close by is more likely a neighbour than the same place.
  if (first.similarity !== null) return { kind: 'unsure', best: null, candidates };
  if (second !== undefined && Math.abs(second.metres - first.metres) <= TIE_METRES) return { kind: 'unsure', best: null, candidates };
  return { kind: 'place-only', best: first, candidates };
}
