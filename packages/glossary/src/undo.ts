import type { FinderState } from './filters';
import type { Observation } from './observations';
import { fixFrench } from './frTypography';
import type { Place } from './places';
import type { Lang } from './plainTerms';
import type { SavedSearch } from './savedSearches';
import type { PlaceList } from './savedLists';
import type { RecentSearches } from './recentSearches';
import { escapeHtml } from './text';
import type { FinderView } from './view';

/**
 * One step of undo for actions that throw away a person's work: clearing choices, clearing recent searches,
 * and removing a saved place. Only the last such action can be undone, and the offer goes away after any
 * other undoable action, so it is always clear what "Undo" will do.
 */
export type UndoAction =
  | { readonly kind: 'clear'; readonly state: FinderState; readonly view: FinderView; readonly selected: readonly number[] }
  | { readonly kind: 'recent'; readonly recent: RecentSearches }
  | { readonly kind: 'unsave'; readonly placeId: string; readonly position: number }
  | { readonly kind: 'list'; readonly index: number; readonly list: PlaceList }
  | { readonly kind: 'search'; readonly index: number; readonly search: SavedSearch }
  | { readonly kind: 'tag'; readonly placeId: string; readonly tag: string; readonly position: number }
  | { readonly kind: 'reminder'; readonly placeId: string; readonly date: string }
  | { readonly kind: 'day'; readonly placeId: string; readonly day: string }
  | { readonly kind: 'record'; readonly places: readonly Place[]; readonly saved: readonly string[] }
  | { readonly kind: 'place'; readonly places: readonly Place[]; readonly saved: readonly string[] }
  | { readonly kind: 'load'; readonly places: readonly Place[]; readonly saved: readonly string[] }
  | { readonly kind: 'rename'; readonly places: readonly Place[]; readonly saved: readonly string[] }
  | { readonly kind: 'join'; readonly places: readonly Place[]; readonly saved: readonly string[] }
  | { readonly kind: 'source'; readonly places: readonly Place[]; readonly saved: readonly string[] }
  | { readonly kind: 'change'; readonly places: readonly Place[]; readonly saved: readonly string[] }
  | { readonly kind: 'restore'; readonly places: readonly Place[]; readonly saved: readonly string[] }
  | { readonly kind: 'tidy'; readonly places: readonly Place[]; readonly saved: readonly string[] }
  | { readonly kind: 'info'; readonly places: readonly Place[]; readonly saved: readonly string[] }
  | { readonly kind: 'contact'; readonly places: readonly Place[]; readonly saved: readonly string[] }
  | { readonly kind: 'seen'; readonly observation: Observation; readonly position: number };

export type UndoKind = UndoAction['kind'];

export const UNDO_UI = {
  en: {
    clear: 'Undo: clear choices',
    recent: 'Undo: clear recent searches',
    unsave: 'Undo: remove saved place',
    list: 'Undo: delete list',
    search: 'Undo: delete saved search',
    tag: 'Undo: remove tag',
    reminder: 'Undo: clear date',
    day: 'Undo: clear day',
    record: 'Undo: remove record',
    place: 'Undo: remove place',
    load: 'Undo: load table',
    rename: 'Undo: rename place',
    join: 'Undo: join entries',
    source: 'Undo: rename source',
    change: 'Undo: change record',
    restore: 'Undo: go back to a copy',
    tidy: 'Undo: tidy the records',
    info: 'Undo: kind and area',
    contact: 'Undo: contact details',
    seen: 'Undo: remove what you saw',
  },
  fr: {
    clear: 'Annuler\u00a0: effacer les choix',
    recent: 'Annuler\u00a0: effacer les recherches récentes',
    unsave: 'Annuler\u00a0: retirer le lieu enregistré',
    list: 'Annuler\u00a0: supprimer la liste',
    search: 'Annuler\u00a0: supprimer la recherche enregistrée',
    tag: 'Annuler\u00a0: retirer l’étiquette',
    reminder: 'Annuler\u00a0: effacer la date',
    day: 'Annuler\u00a0: effacer le jour',
    record: 'Annuler\u00a0: retirer la fiche',
    place: 'Annuler\u00a0: retirer le lieu',
    load: 'Annuler\u00a0: charger le tableau',
    rename: 'Annuler\u00a0: renommer le lieu',
    join: 'Annuler\u00a0: réunir les entrées',
    source: 'Annuler\u00a0: renommer la provenance',
    change: 'Annuler\u00a0: modifier la fiche',
    restore: 'Annuler\u00a0: revenir à une copie',
    tidy: 'Annuler\u00a0: ranger les fiches',
    info: 'Annuler\u00a0: type et secteur',
    contact: 'Annuler\u00a0: coordonnées',
    seen: 'Annuler\u00a0: retirer la note',
  },
} as const;

export const UNDO_ID = 'gl-undo';

export function undoLabel(kind: UndoKind, lang: Lang): string {
  const text = UNDO_UI[lang][kind];
  return lang === 'fr' ? fixFrench(text) : text;
}

/** The button for the pending action, or nothing. */
export function renderUndo(action: UndoAction | null, lang: Lang): string {
  if (action === null) return '';
  return `<button type="button" class="gl-btn" id="${UNDO_ID}">${escapeHtml(undoLabel(action.kind, lang))}</button>`;
}

/** Puts a saved place back where it was, or at the end when the list is shorter now. A place already saved stays once. */
export function restoreSaved(saved: readonly string[], placeId: string, position: number): readonly string[] {
  if (saved.includes(placeId)) return saved;
  const at = Math.max(0, Math.min(position, saved.length));
  return [...saved.slice(0, at), placeId, ...saved.slice(at)];
}

/** Where a saved place sits now, for undoing its removal. -1 when it is not saved. */
export function savedPosition(saved: readonly string[], placeId: string): number {
  return saved.indexOf(placeId);
}
