/**
 * Searching, sorting and counting a person's own saved observations. Pure: no network, no
 * storage, no clock. Nothing here changes a record.
 */
export interface MyNote {
  id: string;
  lat: number;
  lon: number;
  name: string | null;
  wheelchair: string;
  source: string;
  licence: string;
  observedOn: string;
}

export const SORTS = ['newest', 'oldest', 'name', 'status'] as const;
export type Sort = (typeof SORTS)[number];

export function cleanSort(value: string): Sort {
  return (SORTS as readonly string[]).includes(value) ? (value as Sort) : 'newest';
}

/** Lower case with accents removed, for matching what a person types. */
export function fold(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export const MAX_SEARCH = 100;

/** Notes whose name, source, id, status or date contains every word typed. Empty text matches all. */
export function searchNotes<T extends MyNote>(notes: readonly T[], text: string): T[] {
  const words = fold(text.slice(0, MAX_SEARCH)).split(/\s+/).filter((w) => w !== '');
  if (words.length === 0) return [...notes];
  return notes.filter((note) => {
    const hay = fold(`${note.name ?? ''} ${note.source} ${note.id} ${note.wheelchair} ${note.observedOn} ${note.licence}`);
    return words.every((word) => hay.includes(word));
  });
}

const STATUS_ORDER: readonly string[] = ['UNKNOWN', 'no', 'limited', 'yes'];

function statusRank(status: string): number {
  const index = STATUS_ORDER.indexOf(status);
  return index < 0 ? 0 : index;
}

function byName(a: MyNote, b: MyNote): number {
  // Unnamed places go last so they are not lost among the names.
  if (a.name === null && b.name !== null) return 1;
  if (a.name !== null && b.name === null) return -1;
  return fold(a.name ?? '').localeCompare(fold(b.name ?? ''), 'en') || a.id.localeCompare(b.id);
}

export function sortNotes<T extends MyNote>(notes: readonly T[], sort: Sort): T[] {
  const out = [...notes];
  switch (sort) {
    case 'newest':
      return out.sort((a, b) => b.observedOn.localeCompare(a.observedOn) || byName(a, b));
    case 'oldest':
      return out.sort((a, b) => a.observedOn.localeCompare(b.observedOn) || byName(a, b));
    case 'name':
      return out.sort(byName);
    case 'status':
      return out.sort((a, b) => statusRank(a.wheelchair) - statusRank(b.wheelchair) || byName(a, b));
  }
}

export interface Count {
  key: string;
  count: number;
}

export interface NotesSummary {
  total: number;
  byStatus: Count[];
  byLicence: Count[];
  /** Months as YYYY-MM, newest first. */
  byMonth: Count[];
  unnamed: number;
  /** Null when there are no notes. */
  oldest: string | null;
  newest: string | null;
}

function counted(values: readonly string[], order: (a: Count, b: Count) => number): Count[] {
  const map = new Map<string, number>();
  for (const value of values) map.set(value, (map.get(value) ?? 0) + 1);
  return [...map.entries()].map(([key, count]) => ({ key, count })).sort(order);
}

export function summariseNotes(notes: readonly MyNote[]): NotesSummary {
  const days = notes.map((n) => n.observedOn).sort();
  return {
    total: notes.length,
    byStatus: counted(notes.map((n) => n.wheelchair), (a, b) => statusRank(b.key) - statusRank(a.key) || a.key.localeCompare(b.key)),
    byLicence: counted(notes.map((n) => n.licence), (a, b) => a.key.localeCompare(b.key)),
    byMonth: counted(notes.map((n) => n.observedOn.slice(0, 7)), (a, b) => b.key.localeCompare(a.key)),
    unnamed: notes.filter((n) => n.name === null || n.name.trim() === '').length,
    oldest: days[0] ?? null,
    newest: days[days.length - 1] ?? null,
  };
}
