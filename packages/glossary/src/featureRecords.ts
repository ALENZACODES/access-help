import { fixFrench } from './frTypography';
import { lookupTerm } from './glossary';
import type { Place } from './places';
import { UNKNOWN_TOKEN } from './plainLanguage';
import { TERMS, type Lang } from './plainTerms';
import { effectiveStatus, mergeClaims, statusLabel, type FeatureStatus } from './status';
import { escapeHtml } from './text';

/**
 * One feature across every place: what the records report for it in each place, how many records
 * can be reported, and the date of the newest one. A place with no usable record for the feature
 * is listed as unknown, never left out and never guessed.
 */
export interface FeatureRow {
  readonly placeId: string;
  readonly name: string;
  /** Index of the place in the list that was given. */
  readonly index: number;
  readonly status: FeatureStatus;
  /** true when usable records disagree; the status is then unknown. */
  readonly conflict: boolean;
  /** Records about the feature that can be reported. */
  readonly records: number;
  /** Date of the newest usable record, or '' when there is none. */
  readonly newest: string;
}

export interface FeatureCounts {
  readonly present: number;
  readonly absent: number;
  readonly unknown: number;
}

export function isFeatureId(value: unknown): value is string {
  return typeof value === 'string' && TERMS.some((t) => t.id === value);
}

/** One row for each place, in the order given. Empty for a feature the glossary does not know. */
export function featureRows(places: readonly Place[], termId: string): readonly FeatureRow[] {
  if (!isFeatureId(termId)) return [];
  return places.map((place, index): FeatureRow => {
    const merged = mergeClaims([termId], place.claims)[0];
    const usable = place.claims.filter((c) => c.termId === termId && effectiveStatus(c) !== 'unknown');
    const newest = usable.reduce((best, c) => {
      const date = c.provenance?.date.trim() ?? '';
      return date > best ? date : best;
    }, '');
    return { placeId: place.id, name: place.name, index, status: merged?.status ?? 'unknown', conflict: merged?.conflict === true, records: usable.length, newest };
  });
}

export function featureCounts(rows: readonly FeatureRow[]): FeatureCounts {
  const counts = { present: 0, absent: 0, unknown: 0 };
  for (const row of rows) counts[row.status] += 1;
  return counts;
}

export const FEATUREVIEW_UI = {
  en: {
    heading: 'One feature in every place',
    label: 'Feature to look at',
    choose: 'Choose a feature',
    prompt: 'Choose a feature to see what is reported for it in each place.',
    noPlaces: 'There are no places in the list.',
    caption: (feature: string): string => `What is reported for this feature in each place: ${feature}`,
    place: 'Place',
    reported: 'What is reported',
    records: 'Records that can be reported',
    newest: 'Newest record',
    noDate: 'No record',
    counts: (present: number, absent: number, unknown: number): string =>
      `Places where it is reported as available: ${present}. Reported as not available: ${absent}. Where it is unknown: ${unknown}.`,
    note: 'Unknown means we have no information, or the sources disagree. It does not mean the feature is missing.',
    exportList: 'Save this table as text',
    title: (feature: string): string => `One feature in every place: ${feature}`,
    made: (date: string): string => `Made on ${date}.`,
    line: (place: string, reported: string): string => `${place}: ${reported}.`,
    detail: (records: number, newest: string): string => (records === 1 ? `1 record, dated ${newest}.` : `${records} records, the newest dated ${newest}.`),
  },
  fr: {
    heading: 'Une caractéristique dans chaque lieu',
    label: 'Caractéristique à examiner',
    choose: 'Choisissez une caractéristique',
    prompt: 'Choisissez une caractéristique pour voir ce qui est signalé dans chaque lieu.',
    noPlaces: 'Il n’y a aucun lieu dans la liste.',
    caption: (feature: string): string => `Ce qui est signalé pour cette caractéristique dans chaque lieu\u00a0: ${feature}`,
    place: 'Lieu',
    reported: 'Ce qui est signalé',
    records: 'Fiches qui peuvent être signalées',
    newest: 'Fiche la plus récente',
    noDate: 'Aucune fiche',
    counts: (present: number, absent: number, unknown: number): string =>
      `Lieux où elle est signalée comme disponible\u00a0: ${present}. Signalée comme non disponible\u00a0: ${absent}. Où elle est ${UNKNOWN_TOKEN}\u00a0: ${unknown}.`,
    note: `${UNKNOWN_TOKEN} veut dire que nous n’avons pas d’information, ou que les sources ne concordent pas. Cela ne veut pas dire que la caractéristique manque.`,
    exportList: 'Enregistrer ce tableau en texte',
    title: (feature: string): string => `Une caractéristique dans chaque lieu\u00a0: ${feature}`,
    made: (date: string): string => `Fait le ${date}.`,
    line: (place: string, reported: string): string => `${place}\u00a0: ${reported}.`,
    detail: (records: number, newest: string): string => (records === 1 ? `1 fiche, date du ${newest}.` : `${records} fiches, la plus récente date du ${newest}.`),
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

export const FEATUREVIEW_SELECT_ID = 'gl-fview';
export const FEATUREVIEW_EXPORT_ID = 'gl-fview-export';
export const FEATUREVIEW_MIME = 'text/plain;charset=utf-8';

export function featureViewFilename(termId: string, lang: Lang): string {
  return `feature-${isFeatureId(termId) ? termId : 'none'}-${lang}.txt`;
}

/** "Hall: sources disagree. 2 records, the newest dated 2026-10-01." */
export function featureRowText(row: FeatureRow, lang: Lang): string {
  const ui = FEATUREVIEW_UI[lang];
  const head = ui.line(row.name, statusLabel(row.status, lang, row.conflict));
  return fr(lang, row.records === 0 ? head : `${head} ${ui.detail(row.records, row.newest)}`);
}

/** The feature in every place as plain text. Empty string for a feature the glossary does not know. */
export function featureViewText(places: readonly Place[], termId: string, lang: Lang, today: string): string {
  if (!isFeatureId(termId)) return '';
  const ui = FEATUREVIEW_UI[lang];
  const rows = featureRows(places, termId);
  const head = `${fr(lang, ui.title(lookupTerm(termId, lang).term))}\n${ui.made(today)}\n`;
  if (rows.length === 0) return `${head}\n${ui.noPlaces}\n`;
  const counts = featureCounts(rows);
  return `${head}\n${ui.counts(counts.present, counts.absent, counts.unknown)}\n${ui.note}\n\n${rows.map((r) => `- ${featureRowText(r, lang)}`).join('\n')}\n`;
}

/** The table for the chosen feature, or a prompt when none is chosen. */
export function renderFeatureTable(places: readonly Place[], termId: string, lang: Lang, canExport: boolean): string {
  const ui = FEATUREVIEW_UI[lang];
  if (!isFeatureId(termId)) return `<p class="gl-note">${escapeHtml(ui.prompt)}</p>`;
  const rows = featureRows(places, termId);
  if (rows.length === 0) return `<p class="gl-note" role="status">${escapeHtml(ui.noPlaces)}</p>`;
  const counts = featureCounts(rows);
  const caption = fr(lang, ui.caption(lookupTerm(termId, lang).term));
  const body = rows
    .map(
      (r) =>
        `<tr><th scope="row">${escapeHtml(r.name)}</th><td data-status="${r.conflict ? 'conflict' : r.status}">${escapeHtml(statusLabel(r.status, lang, r.conflict))}</td>` +
        `<td>${r.records}</td><td>${escapeHtml(r.newest === '' ? ui.noDate : r.newest)}</td></tr>`,
    )
    .join('');
  const heads = [ui.place, ui.reported, ui.records, ui.newest].map((h) => `<th scope="col">${escapeHtml(h)}</th>`).join('');
  const button = canExport ? `<div class="gl-actions"><button type="button" class="gl-btn" id="${FEATUREVIEW_EXPORT_ID}">${escapeHtml(ui.exportList)}</button></div>` : '';
  return (
    `<p role="status">${escapeHtml(ui.counts(counts.present, counts.absent, counts.unknown))}</p><p class="gl-note">${escapeHtml(ui.note)}</p>` +
    `<div class="gl-compare-wrap" role="region" aria-label="${escapeHtml(caption)}" tabindex="0">` +
    `<table class="gl-compare"><caption>${escapeHtml(caption)}</caption><thead><tr>${heads}</tr></thead><tbody>${body}</tbody></table></div>${button}`
  );
}

/** The labelled list of features and a region the finder fills with the table. */
export function renderFeatureView(places: readonly Place[], termId: string, lang: Lang, canExport: boolean): string {
  const ui = FEATUREVIEW_UI[lang];
  const chosen = isFeatureId(termId) ? termId : '';
  const options =
    `<option value=""${chosen === '' ? ' selected' : ''}>${escapeHtml(ui.choose)}</option>` +
    TERMS.map((t) => `<option value="${escapeHtml(t.id)}"${t.id === chosen ? ' selected' : ''}>${escapeHtml(lookupTerm(t.id, lang).term)}</option>`).join('');
  return (
    `<label for="${FEATUREVIEW_SELECT_ID}">${escapeHtml(ui.label)}</label>` +
    `<select id="${FEATUREVIEW_SELECT_ID}" class="gl-select">${options}</select>` +
    `<div data-gl-fview>${renderFeatureTable(places, chosen, lang, canExport)}</div>`
  );
}
