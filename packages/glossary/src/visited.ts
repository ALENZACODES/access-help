import { fixFrench } from './frTypography';
import type { Lang } from './plainTerms';
import { isIsoDate } from './provenance';
import { escapeHtml } from './text';

/**
 * The person's own record of places they have been to, kept on this device. It records a visit and its date.
 * It says nothing about the place and is never sent anywhere.
 */
export type Visits = Readonly<Record<string, string>>;

export const VISITS_STORE_KEY = 'glossary-visited-places';
export const MAX_VISITS = 200;

export const VISIT_UI = {
  en: {
    mark: 'Mark as visited',
    unmark: 'Remove visit mark',
    label: (name: string): string => `Mark as visited: ${name}`,
    unlabel: (name: string): string => `Remove visit mark: ${name}`,
    on: (date: string): string => `You marked this place as visited on ${date}.`,
  },
  fr: {
    mark: 'Marquer comme visité',
    unmark: 'Retirer la marque de visite',
    label: (name: string): string => `Marquer comme visité\u00a0: ${name}`,
    unlabel: (name: string): string => `Retirer la marque de visite\u00a0: ${name}`,
    on: (date: string): string => `Vous avez marqué ce lieu comme visité le ${date}.`,
  },
} as const;

export function isVisited(visits: Visits, placeId: string): boolean {
  return Object.prototype.hasOwnProperty.call(visits, placeId);
}

export function visitDate(visits: Visits, placeId: string): string | null {
  return isVisited(visits, placeId) ? (visits[placeId] ?? null) : null;
}

/** Keeps the newest MAX_VISITS, so the record cannot grow without limit. */
function capped(visits: Visits): Visits {
  const entries = Object.entries(visits);
  if (entries.length <= MAX_VISITS) return visits;
  return Object.fromEntries([...entries].sort((a, b) => (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0)).slice(0, MAX_VISITS));
}

/** Records a visit on `date` (a real YYYY-MM-DD). An empty id or a bad date changes nothing. Marking again keeps the first date. */
export function markVisited(visits: Visits, placeId: string, date: string): Visits {
  if (placeId === '' || !isIsoDate(date) || isVisited(visits, placeId)) return visits;
  return capped({ ...visits, [placeId]: date });
}

export function unmarkVisited(visits: Visits, placeId: string): Visits {
  if (!isVisited(visits, placeId)) return visits;
  return Object.fromEntries(Object.entries(visits).filter(([id]) => id !== placeId));
}

export function toggleVisited(visits: Visits, placeId: string, date: string): Visits {
  return isVisited(visits, placeId) ? unmarkVisited(visits, placeId) : markVisited(visits, placeId, date);
}

export function serialiseVisits(visits: Visits): string {
  return JSON.stringify(visits);
}

/** Null for anything that is not an object of ids to real dates. Entries with a bad date are dropped. */
export function parseVisits(json: string): Visits | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  let out: Visits = {};
  for (const [id, date] of Object.entries(raw)) if (typeof date === 'string') out = markVisited(out, id, date);
  return out;
}

/** Drops visits for places that are not in the current list of ids. Used when data is replaced. */
export function pruneVisits(visits: Visits, ids: readonly string[]): Visits {
  const keep = new Set(ids);
  const entries = Object.entries(visits);
  return entries.every(([id]) => keep.has(id)) ? visits : Object.fromEntries(entries.filter(([id]) => keep.has(id)));
}

export const VISIT_ID_PREFIX = 'gl-visit-';

export function parseVisitId(id: string): number | null {
  const m = /^gl-visit-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}

export function visitButton(index: number, name: string, visited: boolean, lang: Lang): string {
  const ui = VISIT_UI[lang];
  const label = visited ? ui.unlabel(name) : ui.label(name);
  return (
    `<button type="button" class="gl-btn" id="${VISIT_ID_PREFIX}${index}" data-visited="${visited ? 'yes' : 'no'}" ` +
    `aria-label="${escapeHtml(lang === 'fr' ? fixFrench(label) : label)}">${escapeHtml(visited ? ui.unmark : ui.mark)}</button>`
  );
}

/** A line saying when the place was marked, or nothing. */
export function visitNote(date: string | null, lang: Lang): string {
  if (date === null) return '';
  const text = VISIT_UI[lang].on(date);
  return `<p class="gl-note">${escapeHtml(lang === 'fr' ? fixFrench(text) : text)}</p>`;
}
