import type { FinderState } from './filters';
import { fixFrench } from './frTypography';
import type { Lang } from './plainTerms';
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
  | { readonly kind: 'unsave'; readonly placeId: string; readonly position: number };

export type UndoKind = UndoAction['kind'];

export const UNDO_UI = {
  en: {
    clear: 'Undo: clear choices',
    recent: 'Undo: clear recent searches',
    unsave: 'Undo: remove saved place',
  },
  fr: {
    clear: 'Annuler\u00a0: effacer les choix',
    recent: 'Annuler\u00a0: effacer les recherches récentes',
    unsave: 'Annuler\u00a0: retirer le lieu enregistré',
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
