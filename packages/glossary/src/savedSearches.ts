import { isEmptyState, normaliseState, type FinderState } from './filters';
import { summariseFilters } from './filterSummary';
import { fixFrench } from './frTypography';
import type { Lang } from './plainTerms';
import { cleanListName } from './savedLists';
import { escapeHtml } from './text';
import { DEFAULT_VIEW } from './view';

/**
 * A person's own named searches: the chosen features, the typed name words and "hide not available", kept
 * under a name so the same choices can be made again in one press. Kept on this device only.
 * A saved search remembers choices. It remembers nothing about any place.
 */
export interface SavedSearch {
  readonly name: string;
  readonly state: FinderState;
}
export type SavedSearches = readonly SavedSearch[];

export const MAX_SEARCHES = 8;
export const SEARCHES_STORE_KEY = 'glossary-saved-searches';

export type SearchError = 'name' | 'nothing' | 'duplicate' | 'full';
export type SearchResult = { readonly ok: true; readonly searches: SavedSearches } | { readonly ok: false; readonly error: SearchError };

const sameName = (a: string, b: string): boolean => a.localeCompare(b, 'en', { sensitivity: 'base' }) === 0;

/** Keeps the choices under a name. Refused with no name, with no choices to keep, with a repeated name, or past the limit. */
export function saveSearch(searches: SavedSearches, name: string, state: FinderState): SearchResult {
  const clean = cleanListName(name);
  if (clean === '') return { ok: false, error: 'name' };
  const kept = normaliseState(state);
  if (isEmptyState(kept)) return { ok: false, error: 'nothing' };
  if (searches.some((s) => sameName(s.name, clean))) return { ok: false, error: 'duplicate' };
  if (searches.length >= MAX_SEARCHES) return { ok: false, error: 'full' };
  return { ok: true, searches: [...searches, { name: clean, state: kept }] };
}

export function deleteSearch(searches: SavedSearches, index: number): SavedSearches {
  return searches.filter((_, i) => i !== index);
}

/** Puts a deleted search back, for undo. Refused when it would repeat a name or pass the limit. */
export function insertSearch(searches: SavedSearches, index: number, search: SavedSearch): SavedSearches {
  if (searches.length >= MAX_SEARCHES || searches.some((s) => sameName(s.name, search.name))) return searches;
  const at = Math.max(0, Math.min(index, searches.length));
  return [...searches.slice(0, at), search, ...searches.slice(at)];
}

export function serialiseSearches(searches: SavedSearches): string {
  return JSON.stringify(searches);
}

/** Null unless the text is a JSON array. Bad entries are dropped; features that do not exist are removed from each search. */
export function parseSearches(json: string): SavedSearches | null {
  try {
    const raw: unknown = JSON.parse(json);
    if (!Array.isArray(raw)) return null;
    let out: SavedSearches = [];
    for (const item of raw) {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) continue;
      const { name, state } = item as { name?: unknown; state?: unknown };
      if (typeof name !== 'string' || typeof state !== 'object' || state === null || Array.isArray(state)) continue;
      const s = state as { features?: unknown; query?: unknown; hideNotAvailable?: unknown };
      if (!Array.isArray(s.features) || typeof s.query !== 'string' || typeof s.hideNotAvailable !== 'boolean') continue;
      const made = saveSearch(out, name, { features: s.features.filter((f): f is string => typeof f === 'string'), query: s.query, hideNotAvailable: s.hideNotAvailable });
      if (made.ok) out = made.searches;
    }
    return out;
  } catch {
    return null;
  }
}

export const SEARCH_UI = {
  en: {
    heading: 'Your searches',
    intro: 'Keep your current choices under a name and use them again later. They stay on this device.',
    nameLabel: 'Name for these choices',
    save: 'Save these choices',
    none: 'You have no saved searches yet.',
    use: 'Use',
    useLabel: (name: string): string => `Use the search ${name}`,
    delete: 'Delete',
    deleteLabel: (name: string): string => `Delete the search ${name}`,
    errors: {
      name: 'Type a name for the search.',
      nothing: 'Choose a feature or type a name first, so there is something to keep.',
      duplicate: 'You already have a search with that name.',
      full: 'You have the most saved searches allowed. Delete one first.',
    },
  },
  fr: {
    heading: 'Vos recherches',
    intro: 'Gardez vos choix actuels sous un nom pour les réutiliser plus tard. Ils restent sur cet appareil.',
    nameLabel: 'Nom de ces choix',
    save: 'Enregistrer ces choix',
    none: 'Vous n’avez pas encore de recherche enregistrée.',
    use: 'Utiliser',
    useLabel: (name: string): string => `Utiliser la recherche ${name}`,
    delete: 'Supprimer',
    deleteLabel: (name: string): string => `Supprimer la recherche ${name}`,
    errors: {
      name: 'Saisissez un nom pour la recherche.',
      nothing: 'Choisissez une caractéristique ou saisissez un nom d’abord, pour avoir quelque chose à garder.',
      duplicate: 'Vous avez déjà une recherche portant ce nom.',
      full: 'Vous avez le nombre maximal de recherches enregistrées. Supprimez-en une d’abord.',
    },
  },
} as const;

export const SEARCH_IDS = { name: 'gl-search-name', save: 'gl-search-save' } as const;

export function searchErrorText(error: SearchError, lang: Lang): string {
  return SEARCH_UI[lang].errors[error];
}

export function useSearchId(index: number): string {
  return `gl-sus-${index}`;
}
export function deleteSearchId(index: number): string {
  return `gl-sdel-${index}`;
}
export function parseUseSearchId(id: string): number | null {
  const m = /^gl-sus-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}
export function parseDeleteSearchId(id: string): number | null {
  const m = /^gl-sdel-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}

export interface SearchesPanelOptions {
  readonly lang: Lang;
  readonly searches: SavedSearches;
  readonly message: string;
}

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

/** A form to keep the current choices, then each saved search with what it chooses and buttons to use or delete it. */
export function renderSearchesPanel(o: SearchesPanelOptions): string {
  const ui = SEARCH_UI[o.lang];
  const message = o.message === '' ? '' : `<p class="gl-note" role="status">${escapeHtml(o.message)}</p>`;
  const form =
    `<label for="${SEARCH_IDS.name}">${escapeHtml(ui.nameLabel)}</label>` +
    `<input id="${SEARCH_IDS.name}" class="gl-input" type="text" maxlength="40" autocomplete="off">` +
    `<div class="gl-actions"><button type="button" class="gl-btn" id="${SEARCH_IDS.save}">${escapeHtml(ui.save)}</button></div>`;
  const body =
    o.searches.length === 0
      ? `<p class="gl-note">${escapeHtml(ui.none)}</p>`
      : `<ul>${o.searches
          .map(
            (s, i) =>
              `<li><strong>${escapeHtml(s.name)}</strong> <span class="gl-note">${escapeHtml(summariseFilters(s.state, DEFAULT_VIEW, o.lang))}</span>` +
              `<div class="gl-actions"><button type="button" class="gl-btn" id="${useSearchId(i)}" aria-label="${escapeHtml(fr(o.lang, ui.useLabel(s.name)))}">${escapeHtml(ui.use)}</button>` +
              `<button type="button" class="gl-btn" id="${deleteSearchId(i)}" aria-label="${escapeHtml(fr(o.lang, ui.deleteLabel(s.name)))}">${escapeHtml(ui.delete)}</button></div></li>`,
          )
          .join('')}</ul>`;
  return `<p class="gl-note">${escapeHtml(ui.intro)}</p>${message}${form}${body}`;
}

/** The state a saved search stands for. Always a clean state, even if the saved one was edited by hand. */
export function stateOf(search: SavedSearch): FinderState {
  return normaliseState(search.state);
}
