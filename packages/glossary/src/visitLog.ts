import { fixFrench } from './frTypography';
import type { Place } from './places';
import type { Lang } from './plainTerms';
import { escapeHtml } from './text';
import type { Visits } from './visited';

/**
 * The places a person has marked "I have been here", newest first. The marks and dates are the person's own.
 * The log says nothing about the places.
 */
export interface VisitEntry {
  readonly placeId: string;
  readonly name: string;
  /** YYYY-MM-DD the person marked it. */
  readonly date: string;
}

export const LOG_UI = {
  en: {
    heading: 'Places you have visited',
    none: 'You have not marked any place as visited.',
    on: (name: string, date: string): string => `${name}, marked on ${date}`,
    count: (n: number): string => (n === 1 ? '1 place' : `${n} places`),
    exportLog: 'Copy visited places as text',
    title: 'Places visited',
  },
  fr: {
    heading: 'Lieux que vous avez visités',
    none: 'Vous n’avez marqué aucun lieu comme visité.',
    on: (name: string, date: string): string => `${name}, marqué le ${date}`,
    count: (n: number): string => (n === 1 ? '1 lieu' : `${n} lieux`),
    exportLog: 'Copier les lieux visités en texte',
    title: 'Lieux visités',
  },
} as const;

/** Newest first; the same day by name. Marks for places that are not loaded are left out. */
export function visitLog(visits: Visits, places: readonly Place[], lang: Lang): readonly VisitEntry[] {
  const out: VisitEntry[] = [];
  for (const place of places) {
    const date = Object.prototype.hasOwnProperty.call(visits, place.id) ? visits[place.id] : undefined;
    if (date !== undefined) out.push({ placeId: place.id, name: place.name, date });
  }
  return out.sort((a, b) => (a.date === b.date ? a.name.localeCompare(b.name, lang) || a.placeId.localeCompare(b.placeId) : a.date < b.date ? 1 : -1));
}

export function entryText(entry: VisitEntry, lang: Lang): string {
  const text = LOG_UI[lang].on(entry.name, entry.date);
  return lang === 'fr' ? fixFrench(text) : text;
}

/** A numbered list, newest first, or a note when nothing is marked. */
export function renderVisitLog(entries: readonly VisitEntry[], lang: Lang): string {
  const ui = LOG_UI[lang];
  if (entries.length === 0) return `<p class="gl-note">${escapeHtml(ui.none)}</p>`;
  return `<p class="gl-note">${escapeHtml(ui.count(entries.length))}</p><ol>${entries.map((e) => `<li>${escapeHtml(entryText(e, lang))}</li>`).join('')}</ol>`;
}

export function visitLogToText(entries: readonly VisitEntry[], lang: Lang): string {
  const ui = LOG_UI[lang];
  const lines = [`${ui.title} (${entries.length})`, '', ...entries.map((e) => `- ${entryText(e, lang)}`)];
  const text = lines.join('\n') + '\n';
  return lang === 'fr' ? fixFrench(text) : text;
}

export function visitLogFilename(lang: Lang): string {
  return `visited-places-${lang}.txt`;
}

export const LOG_EXPORT_ID = 'gl-export-visits';

export function renderLogExport(entries: readonly VisitEntry[], lang: Lang): string {
  if (entries.length === 0) return '';
  return `<div class="gl-actions"><button type="button" class="gl-btn" id="${LOG_EXPORT_ID}">${escapeHtml(LOG_UI[lang].exportLog)}</button></div>`;
}
