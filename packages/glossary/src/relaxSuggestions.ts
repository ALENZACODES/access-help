import type { FinderState } from './filters';
import { fixFrench } from './frTypography';
import { lookupTerm } from './glossary';
import type { Place } from './places';
import { findPlaces } from './placeSearch';
import type { Lang } from './plainTerms';
import { isRecent } from './sorting';
import { escapeHtml } from './text';
import type { FinderView } from './view';

/**
 * When no place matches, say which single choice to drop would bring places back, and how many.
 * It only describes the list. It says nothing about any place, and it never changes a choice by itself.
 */
export type Relaxation =
  | { readonly kind: 'feature'; readonly id: string }
  | { readonly kind: 'query' }
  | { readonly kind: 'hide' }
  | { readonly kind: 'saved' }
  | { readonly kind: 'recent' };

export interface RelaxOption {
  readonly relax: Relaxation;
  /** Places that would match without this one choice. */
  readonly count: number;
}

export const MAX_RELAX_OPTIONS = 5;
export const RELAX_PREFIX = 'gl-relax-';

const placesEn = (n: number): string => (n === 1 ? '1 place' : `${n} places`);
const placesFr = (n: number): string => (n === 1 ? '1 lieu' : `${n} lieux`);

export const RELAX_UI = {
  en: {
    label: 'Places come back if you drop one choice:',
    feature: (name: string, count: number): string => `Without “${name}”: ${placesEn(count)}`,
    query: (count: number): string => `Without the name search: ${placesEn(count)}`,
    hide: (count: number): string => `Show places where a feature is not available: ${placesEn(count)}`,
    saved: (count: number): string => `Not only saved places: ${placesEn(count)}`,
    recent: (count: number): string => `Not only recent sources: ${placesEn(count)}`,
    none: 'Dropping one choice would not bring places back. Try the Clear choices button.',
  },
  fr: {
    label: 'Des lieux reviennent si vous retirez un seul choix\u00a0:',
    feature: (name: string, count: number): string => `Sans «\u202f${name}\u202f»\u00a0: ${placesFr(count)}`,
    query: (count: number): string => `Sans la recherche par nom\u00a0: ${placesFr(count)}`,
    hide: (count: number): string => `Afficher les lieux où une caractéristique n’est pas offerte\u00a0: ${placesFr(count)}`,
    saved: (count: number): string => `Pas seulement les lieux enregistrés\u00a0: ${placesFr(count)}`,
    recent: (count: number): string => `Pas seulement les sources récentes\u00a0: ${placesFr(count)}`,
    none: 'Retirer un seul choix ne ferait pas revenir de lieux. Essayez le bouton Effacer les choix.',
  },
} as const;

/** The places left after the list controls (only saved, only recent). */
function visibleCount(places: readonly Place[], state: FinderState, view: FinderView, saved: readonly string[], today: string, lang: Lang): number {
  let matched = findPlaces(places, state, lang).map((m) => m.place);
  if (view.savedOnly) matched = matched.filter((p) => saved.includes(p.id));
  if (view.recentOnly) matched = matched.filter((p) => isRecent(p, today));
  return matched.length;
}

/**
 * One option for each choice that, dropped alone, gives at least one place. Empty unless nothing matches now.
 * Best first (most places), then the order choices were made in.
 */
export function relaxOptions(
  places: readonly Place[],
  state: FinderState,
  view: FinderView,
  saved: readonly string[],
  today: string,
  lang: Lang,
): readonly RelaxOption[] {
  if (visibleCount(places, state, view, saved, today, lang) > 0) return [];
  const tries: { relax: Relaxation; state: FinderState; view: FinderView }[] = [];
  for (const id of state.features) tries.push({ relax: { kind: 'feature', id }, state: { ...state, features: state.features.filter((f) => f !== id) }, view });
  if (state.query.trim() !== '') tries.push({ relax: { kind: 'query' }, state: { ...state, query: '' }, view });
  if (state.hideNotAvailable) tries.push({ relax: { kind: 'hide' }, state: { ...state, hideNotAvailable: false }, view });
  if (view.savedOnly) tries.push({ relax: { kind: 'saved' }, state, view: { ...view, savedOnly: false } });
  if (view.recentOnly) tries.push({ relax: { kind: 'recent' }, state, view: { ...view, recentOnly: false } });
  const options = tries
    .map((t, order) => ({ relax: t.relax, count: visibleCount(places, t.state, t.view, saved, today, lang), order }))
    .filter((o) => o.count > 0)
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .slice(0, MAX_RELAX_OPTIONS);
  return options.map(({ relax, count }) => ({ relax, count }));
}

export function relaxId(relax: Relaxation): string {
  return relax.kind === 'feature' ? `${RELAX_PREFIX}feature-${relax.id}` : `${RELAX_PREFIX}${relax.kind}`;
}

/** The choice a button id stands for, or null. Feature ids must be known features. */
export function parseRelaxId(id: string): Relaxation | null {
  if (!id.startsWith(RELAX_PREFIX)) return null;
  const rest = id.slice(RELAX_PREFIX.length);
  if (rest === 'query' || rest === 'hide' || rest === 'saved' || rest === 'recent') return { kind: rest };
  if (rest.startsWith('feature-')) {
    const featureId = rest.slice('feature-'.length);
    return /^[a-z0-9-]+$/.test(featureId) ? { kind: 'feature', id: featureId } : null;
  }
  return null;
}

/** The state and view with that one choice dropped. */
export function applyRelaxation(state: FinderState, view: FinderView, relax: Relaxation): { state: FinderState; view: FinderView } {
  switch (relax.kind) {
    case 'feature':
      return { state: { ...state, features: state.features.filter((f) => f !== relax.id) }, view };
    case 'query':
      return { state: { ...state, query: '' }, view };
    case 'hide':
      return { state: { ...state, hideNotAvailable: false }, view };
    case 'saved':
      return { state, view: { ...view, savedOnly: false } };
    case 'recent':
      return { state, view: { ...view, recentOnly: false } };
  }
}

export function relaxLabel(option: RelaxOption, lang: Lang): string {
  const ui = RELAX_UI[lang];
  const r = option.relax;
  const count = option.count;
  const text =
    r.kind === 'feature' ? ui.feature(lookupTerm(r.id, lang).term, count) : r.kind === 'query' ? ui.query(count) : r.kind === 'hide' ? ui.hide(count) : r.kind === 'saved' ? ui.saved(count) : ui.recent(count);
  return lang === 'fr' ? fixFrench(text) : text;
}

/** Buttons for the options, or a short note when no single choice helps. Empty when places match. */
export function renderRelax(
  places: readonly Place[],
  state: FinderState,
  view: FinderView,
  saved: readonly string[],
  today: string,
  lang: Lang,
): string {
  if (places.length === 0) return '';
  if (visibleCount(places, state, view, saved, today, lang) > 0) return '';
  const options = relaxOptions(places, state, view, saved, today, lang);
  const ui = RELAX_UI[lang];
  if (options.length === 0) return `<p class="gl-note">${escapeHtml(ui.none)}</p>`;
  const buttons = options
    .map((o) => `<button type="button" class="gl-btn" id="${relaxId(o.relax)}">${escapeHtml(relaxLabel(o, lang))}</button>`)
    .join('');
  return `<p class="gl-note" id="gl-relax-label">${escapeHtml(ui.label)}</p><div class="gl-actions" role="group" aria-labelledby="gl-relax-label">${buttons}</div>`;
}
