/**
 * Named sets of numbers a person keeps, such as one for a manual chair and one for a power
 * chair, or one for themselves and one for a friend. Pure functions: the screen's store does
 * the reading and writing. The names are the person's own words and stay on the device.
 */
import { cleanCriteria, hasCriteria, type Criteria } from './criteria.js';

export const MAX_SETS = 6;
export const MAX_SET_NAME = 40;

export interface CriteriaSet {
  id: string;
  name: string;
  criteria: Criteria;
}

export interface SetBook {
  version: 1;
  sets: CriteriaSet[];
}

export function emptySetBook(): SetBook {
  return { version: 1, sets: [] };
}

/** Tidies a name: one line, single spaces, no control characters, at most forty characters. */
export function cleanSetName(value: unknown): string {
  if (typeof value !== 'string') return '';
  // Control characters are dropped so a name cannot break a line in a file.
  const text = [...value.replace(/\s+/g, ' ')].filter((ch) => ch >= ' ' && ch !== '\u007f').join('').replace(/ +/g, ' ').trim();
  return [...text].slice(0, MAX_SET_NAME).join('').trim();
}

export type SetIssue = 'name-empty' | 'nothing-set' | 'too-many';
export type SetResult = { ok: true; book: SetBook; set: CriteriaSet } | { ok: false; issue: SetIssue };

function nextId(book: SetBook): string {
  const used = new Set(book.sets.map((set) => set.id));
  for (let n = 1; n <= MAX_SETS + 1; n += 1) if (!used.has(`set-${n}`)) return `set-${n}`;
  return `set-${book.sets.length + 1}`;
}

/** Saves a named set. A set with the same name, whatever its letter case, is replaced. */
export function saveSet(book: SetBook, name: string, criteria: Criteria): SetResult {
  const clean = cleanSetName(name);
  if (clean === '') return { ok: false, issue: 'name-empty' };
  if (!hasCriteria(criteria)) return { ok: false, issue: 'nothing-set' };
  const existing = book.sets.find((set) => set.name.toLowerCase() === clean.toLowerCase());
  if (existing === undefined && book.sets.length >= MAX_SETS) return { ok: false, issue: 'too-many' };
  const set: CriteriaSet = { id: existing?.id ?? nextId(book), name: clean, criteria: cleanCriteria(criteria) };
  const sets = existing === undefined ? [...book.sets, set] : book.sets.map((entry) => (entry.id === existing.id ? set : entry));
  return { ok: true, book: { version: 1, sets }, set };
}

export function removeSet(book: SetBook, id: string): SetBook {
  const sets = book.sets.filter((set) => set.id !== id);
  return sets.length === book.sets.length ? book : { version: 1, sets };
}

export function findSet(book: SetBook, id: string): CriteriaSet | null {
  return book.sets.find((set) => set.id === id) ?? null;
}

export interface ReadSets {
  book: SetBook;
  /** Sets that could not be used and were left out. */
  dropped: number;
}

/** Reads stored sets. A set with no name, nothing set, or a repeated id or name is dropped. */
export function readSetBook(value: unknown): ReadSets {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return { book: emptySetBook(), dropped: 0 };
  const item = value as Record<string, unknown>;
  if (item.version !== 1 || !Array.isArray(item.sets)) return { book: emptySetBook(), dropped: 0 };
  const ids = new Set<string>();
  const names = new Set<string>();
  const sets: CriteriaSet[] = [];
  let dropped = 0;
  for (const raw of item.sets) {
    const entry = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
    const id = entry !== null && typeof entry.id === 'string' && /^set-\d{1,3}$/.test(entry.id) ? entry.id : '';
    const name = entry === null ? '' : cleanSetName(entry.name);
    const criteria = entry === null ? null : cleanCriteria(entry.criteria);
    if (id === '' || name === '' || criteria === null || !hasCriteria(criteria) || ids.has(id) || names.has(name.toLowerCase()) || sets.length >= MAX_SETS) {
      dropped += 1;
      continue;
    }
    ids.add(id);
    names.add(name.toLowerCase());
    sets.push({ id, name, criteria });
  }
  return { book: { version: 1, sets }, dropped };
}

export interface MergeSets {
  book: SetBook;
  added: number;
  /** Sets left out because one with the same name is already there, or there was no room. */
  skipped: number;
}

/** Adds sets from a backup. A set whose name is already on the device is left as it is. */
export function mergeSetBooks(current: SetBook, incoming: SetBook): MergeSets {
  let book = current;
  let added = 0;
  let skipped = 0;
  for (const set of incoming.sets) {
    if (book.sets.some((entry) => entry.name.toLowerCase() === set.name.toLowerCase())) {
      skipped += 1;
      continue;
    }
    const result = saveSet(book, set.name, set.criteria);
    if (result.ok) {
      book = result.book;
      added += 1;
    } else skipped += 1;
  }
  return { book, added, skipped };
}
