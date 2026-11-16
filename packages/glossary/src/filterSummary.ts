import { fixFrench } from './frTypography';
import { lookupTerm } from './glossary';
import type { FinderState } from './filters';
import type { Lang } from './plainTerms';
import type { FinderView } from './view';

/**
 * The finder's choices said in one short passage, so a screen reader can hear what the list is showing.
 * It describes the choices only. It says nothing about any place.
 */
export const SUMMARY_UI = {
  en: {
    ranking: (list: string): string => `Ranking by: ${list}.`,
    name: (q: string): string => `Name contains “${q}”.`,
    hide: 'Hiding places with a feature reported as not available.',
    recent: 'Only places with information from the last year.',
    saved: 'Only saved places.',
    and: 'and',
  },
  fr: {
    ranking: (list: string): string => fixFrench(`Classement selon : ${list}.`),
    name: (q: string): string => fixFrench(`Le nom contient « ${q} ».`),
    hide: 'Lieux avec une caractéristique signalée comme non disponible masqués.',
    recent: 'Seulement les lieux avec une information de la dernière année.',
    saved: 'Seulement les lieux enregistrés.',
    and: 'et',
  },
} as const;

/** "Ramp", "Ramp and Elevator", "Ramp, Elevator and Grab bar". */
export function joinList(items: readonly string[], and: string): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} ${and} ${items[items.length - 1]}`;
}

/** The parts of the summary, one sentence each, in a fixed order. Empty when nothing is chosen. */
export function summaryParts(state: FinderState, view: FinderView, lang: Lang): readonly string[] {
  const ui = SUMMARY_UI[lang];
  const parts: string[] = [];
  if (state.features.length > 0) {
    parts.push(ui.ranking(joinList(state.features.map((id) => lookupTerm(id, lang).term), ui.and)));
  }
  const query = state.query.trim().replace(/\s+/g, ' ');
  if (query !== '') parts.push(ui.name(query));
  if (state.hideNotAvailable) parts.push(ui.hide);
  if (view.recentOnly) parts.push(ui.recent);
  if (view.savedOnly) parts.push(ui.saved);
  return parts;
}

export function summariseFilters(state: FinderState, view: FinderView, lang: Lang): string {
  const text = summaryParts(state, view, lang).join(' ');
  return lang === 'fr' ? fixFrench(text) : text;
}

/** The region the finder keeps up to date. Hidden from the page when there is nothing to say, but still in the DOM. */
export function renderSummary(state: FinderState, view: FinderView, lang: Lang): string {
  const text = summariseFilters(state, view, lang);
  return text === '' ? '' : `<span class="gl-note">${escapeText(text)}</span>`;
}

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
