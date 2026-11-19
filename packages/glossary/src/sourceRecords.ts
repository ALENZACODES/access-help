import { fixFrench } from './frTypography';
import type { Place } from './places';
import type { Lang } from './plainTerms';
import { placeRecords } from './recordSources';
import { sourceNames } from './recordView';
import { tierName, type SourceTier } from './sourceTier';
import { statusLabel } from './status';
import { escapeHtml } from './text';

/**
 * One source, every record: what a single source reports, place by place, with the licence, date
 * and tier of each record. Only records that can be reported are listed, so the table shows
 * exactly what this source adds to the list. It says nothing about any other source.
 */
export interface SourceRecordRow {
  readonly placeId: string;
  readonly name: string;
  /** Index of the place in the list that was given. */
  readonly index: number;
  readonly termId: string;
  readonly feature: string;
  readonly status: 'present' | 'absent';
  readonly licence: string;
  readonly date: string;
  readonly tier: SourceTier | null;
}

/** Every usable record from the source: places in the order given, then features in glossary order. */
export function sourceRecordRows(places: readonly Place[], source: string, lang: Lang): readonly SourceRecordRow[] {
  const name = source.trim();
  if (name === '') return [];
  const out: SourceRecordRow[] = [];
  places.forEach((place, index) => {
    for (const row of placeRecords(place, lang)) {
      if (row.source !== name || row.status === 'unknown') continue;
      out.push({ placeId: place.id, name: place.name, index, termId: row.termId, feature: row.feature, status: row.status, licence: row.licence, date: row.date, tier: row.tier });
    }
  });
  return out;
}

export interface SourceRecordTotals {
  readonly records: number;
  readonly places: number;
  /** '' when there are no records. */
  readonly oldest: string;
  readonly newest: string;
}

export function sourceRecordTotals(rows: readonly SourceRecordRow[]): SourceRecordTotals {
  const dates = rows.map((r) => r.date).sort();
  return { records: rows.length, places: new Set(rows.map((r) => r.placeId)).size, oldest: dates[0] ?? '', newest: dates[dates.length - 1] ?? '' };
}

/** The source the list's value stands for: values are positions in the list of names. '' for anything else. */
export function sourceFromValue(places: readonly Place[], value: string): string {
  if (!/^\d{1,4}$/.test(value)) return '';
  return sourceNames(places)[Number(value)] ?? '';
}

export const SOURCEVIEW_UI = {
  en: {
    heading: 'One source, every record',
    label: 'Source to look at',
    choose: 'Choose a source',
    prompt: 'Choose a source to see every record that comes from it.',
    noSources: 'No source has a record that can be reported.',
    caption: (source: string): string => `Every record from this source: ${source}`,
    place: 'Place',
    feature: 'Feature',
    reported: 'What is reported',
    licence: 'Licence',
    date: 'Dated',
    tier: 'Tier',
    count: (records: number, places: number): string =>
      `${records === 1 ? '1 record' : `${records} records`}, in ${places === 1 ? '1 place' : `${places} places`}.`,
    dates: (oldest: string, newest: string): string => (oldest === newest ? `Dated ${oldest}.` : `Dated from ${oldest} to ${newest}.`),
    exportList: 'Save this table as text',
    title: (source: string): string => `Every record from this source: ${source}`,
    made: (date: string): string => `Made on ${date}.`,
    line: (place: string, feature: string, reported: string): string => `${place}, ${feature}: ${reported}.`,
    detail: (licence: string, date: string, tier: string): string => `Licence: ${licence}. Dated: ${date}. ${tier}.`,
  },
  fr: {
    heading: 'Une source, toutes ses fiches',
    label: 'Source à examiner',
    choose: 'Choisissez une source',
    prompt: 'Choisissez une source pour voir toutes les fiches qui en viennent.',
    noSources: 'Aucune source n’a de fiche qui peut être signalée.',
    caption: (source: string): string => `Toutes les fiches de cette source\u00a0: ${source}`,
    place: 'Lieu',
    feature: 'Caractéristique',
    reported: 'Ce qui est signalé',
    licence: 'Licence d’utilisation',
    date: 'Date de la source',
    tier: 'Niveau',
    count: (records: number, places: number): string =>
      `${records === 1 ? '1 fiche' : `${records} fiches`}, dans ${places === 1 ? '1 lieu' : `${places} lieux`}.`,
    dates: (oldest: string, newest: string): string => (oldest === newest ? `Date du ${oldest}.` : `Dates du ${oldest} au ${newest}.`),
    exportList: 'Enregistrer ce tableau en texte',
    title: (source: string): string => `Toutes les fiches de cette source\u00a0: ${source}`,
    made: (date: string): string => `Fait le ${date}.`,
    line: (place: string, feature: string, reported: string): string => `${place}, ${feature}\u00a0: ${reported}.`,
    detail: (licence: string, date: string, tier: string): string => `Licence\u00a0: ${licence}. Date\u00a0: ${date}. ${tier}.`,
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

export const SOURCEVIEW_SELECT_ID = 'gl-sview';
export const SOURCEVIEW_EXPORT_ID = 'gl-sview-export';
export const SOURCEVIEW_MIME = 'text/plain;charset=utf-8';

export function sourceViewFilename(lang: Lang): string {
  return `source-records-${lang}.txt`;
}

/** "Hall, Ramp: reported as not available. Licence: OGL-Canada-2.0. Dated: 2025-03-04. Tier unknown." */
export function sourceRowText(row: SourceRecordRow, lang: Lang): string {
  const ui = SOURCEVIEW_UI[lang];
  return fr(lang, `${ui.line(row.name, row.feature, statusLabel(row.status, lang))} ${ui.detail(row.licence, row.date, tierName(row.tier, lang))}`);
}

function totalsText(rows: readonly SourceRecordRow[], lang: Lang): string {
  const ui = SOURCEVIEW_UI[lang];
  const totals = sourceRecordTotals(rows);
  return `${ui.count(totals.records, totals.places)} ${ui.dates(totals.oldest, totals.newest)}`;
}

/** Every record from the source as plain text. Empty string when the source has no usable record. */
export function sourceViewText(places: readonly Place[], source: string, lang: Lang, today: string): string {
  const rows = sourceRecordRows(places, source, lang);
  if (rows.length === 0) return '';
  const ui = SOURCEVIEW_UI[lang];
  return `${fr(lang, ui.title(source.trim()))}\n${ui.made(today)}\n\n${totalsText(rows, lang)}\n\n${rows.map((r) => `- ${sourceRowText(r, lang)}`).join('\n')}\n`;
}

/** The table for the chosen source, or a prompt when none is chosen or the source is no longer held. */
export function renderSourceTable(places: readonly Place[], source: string, lang: Lang, canExport: boolean): string {
  const ui = SOURCEVIEW_UI[lang];
  const rows = sourceRecordRows(places, source, lang);
  if (rows.length === 0) return `<p class="gl-note">${escapeHtml(sourceNames(places).length === 0 ? ui.noSources : ui.prompt)}</p>`;
  const caption = fr(lang, ui.caption(source.trim()));
  const body = rows
    .map(
      (r) =>
        `<tr><th scope="row">${escapeHtml(r.name)}</th><td>${escapeHtml(r.feature)}</td><td data-status="${r.status}">${escapeHtml(statusLabel(r.status, lang))}</td>` +
        `<td>${escapeHtml(r.licence)}</td><td>${escapeHtml(r.date)}</td><td>${escapeHtml(tierName(r.tier, lang))}</td></tr>`,
    )
    .join('');
  const heads = [ui.place, ui.feature, ui.reported, ui.licence, ui.date, ui.tier].map((h) => `<th scope="col">${escapeHtml(h)}</th>`).join('');
  const button = canExport ? `<div class="gl-actions"><button type="button" class="gl-btn" id="${SOURCEVIEW_EXPORT_ID}">${escapeHtml(ui.exportList)}</button></div>` : '';
  return (
    `<p role="status">${escapeHtml(totalsText(rows, lang))}</p>` +
    `<div class="gl-compare-wrap" role="region" aria-label="${escapeHtml(caption)}" tabindex="0">` +
    `<table class="gl-compare"><caption>${escapeHtml(caption)}</caption><thead><tr>${heads}</tr></thead><tbody>${body}</tbody></table></div>${button}`
  );
}

/** The labelled list of sources and a region the finder fills with the table. */
export function renderSourceView(places: readonly Place[], source: string, lang: Lang, canExport: boolean): string {
  const ui = SOURCEVIEW_UI[lang];
  const names = sourceNames(places);
  const chosen = names.indexOf(source.trim());
  const options =
    `<option value=""${chosen === -1 ? ' selected' : ''}>${escapeHtml(ui.choose)}</option>` +
    names.map((n, i) => `<option value="${i}"${i === chosen ? ' selected' : ''}>${escapeHtml(n)}</option>`).join('');
  return (
    `<label for="${SOURCEVIEW_SELECT_ID}">${escapeHtml(ui.label)}</label>` +
    `<select id="${SOURCEVIEW_SELECT_ID}" class="gl-select">${options}</select>` +
    `<div data-gl-sview>${renderSourceTable(places, chosen === -1 ? '' : source, lang, canExport)}</div>`
  );
}
