import { MAX_QUERY_LENGTH } from './filters';
import { fixFrench } from './frTypography';
import type { Lang } from './plainTerms';
import { escapeHtml, fold } from './text';

/**
 * The last few place searches, kept on this device so a person can search again with one press.
 * Nothing leaves the device. A person can clear the list at any time.
 */
export type RecentSearches = readonly string[];

export const RECENT_STORE_KEY = 'glossary-recent-searches';
export const MAX_RECENT = 5;
export const MIN_RECENT_LENGTH = 2;

export const RECENT_UI = {
  en: {
    heading: 'Recent searches',
    clear: 'Clear recent searches',
    again: (q: string): string => `Search again: ${q}`,
  },
  fr: {
    heading: 'Recherches récentes',
    clear: 'Effacer les recherches récentes',
    again: (q: string): string => fixFrench(`Chercher à nouveau : ${q}`),
  },
} as const;

/** Trimmed, spaces collapsed, capped at the length the finder allows. */
export function normaliseRecent(query: string): string {
  return query.trim().replace(/\s+/g, ' ').slice(0, MAX_QUERY_LENGTH).trim();
}

/** Puts a search first. A search that is too short is ignored; a repeat (ignoring case and accents) moves to the front. */
export function addRecent(list: RecentSearches, query: string): RecentSearches {
  const q = normaliseRecent(query);
  if (q.length < MIN_RECENT_LENGTH) return list;
  const key = fold(q);
  return [q, ...list.filter((x) => fold(x) !== key)].slice(0, MAX_RECENT);
}

export function removeRecent(list: RecentSearches, index: number): RecentSearches {
  return list.filter((_, i) => i !== index);
}

export function serialiseRecent(list: RecentSearches): string {
  return JSON.stringify(list.slice(0, MAX_RECENT));
}

/** Null for anything that is not a list of strings we wrote. Bad entries inside a list are dropped. */
export function parseRecent(json: string): RecentSearches | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!Array.isArray(raw)) return null;
  let out: RecentSearches = [];
  for (const item of [...raw].reverse()) if (typeof item === 'string') out = addRecent(out, item);
  return out;
}

export const RECENT_ID_PREFIX = 'gl-rs-';
export const RECENT_CLEAR_ID = 'gl-rs-clear';

export function recentId(index: number): string {
  return `${RECENT_ID_PREFIX}${index}`;
}

export function parseRecentId(id: string): number | null {
  const m = /^gl-rs-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}

/** A row of buttons, or nothing for an empty list. */
export function renderRecent(list: RecentSearches, lang: Lang): string {
  if (list.length === 0) return '';
  const ui = RECENT_UI[lang];
  const buttons = list
    .map((q, i) => {
      const label = lang === 'fr' ? fixFrench(ui.again(q)) : ui.again(q);
      return `<button type="button" class="gl-btn" id="${recentId(i)}" aria-label="${escapeHtml(label)}">${escapeHtml(q)}</button>`;
    })
    .join('');
  return (
    `<p class="gl-note" id="gl-rs-label">${escapeHtml(ui.heading)}</p>` +
    `<div class="gl-actions" role="group" aria-labelledby="gl-rs-label">${buttons}` +
    `<button type="button" class="gl-btn" id="${RECENT_CLEAR_ID}">${escapeHtml(ui.clear)}</button></div>`
  );
}
