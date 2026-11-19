import { fixFrench } from './frTypography';
import { lookupTerm } from './glossary';
import type { Place } from './places';
import { TERMS, type Lang } from './plainTerms';
import { effectiveStatus, statusLabel, type FeatureStatus } from './status';
import { effectiveTier, tierName, type SourceTier } from './sourceTier';
import { escapeHtml } from './text';

/**
 * Every record held for one place, each with its source, licence, date and tier.
 * A record that cannot be used (no source, a licence that is not open, a date that is not real)
 * is still listed, as Unknown, so the person can see why nothing is reported.
 */
export interface RecordRow {
  readonly termId: string;
  /** The feature's name in the language asked for. */
  readonly feature: string;
  /** What may be reported: a record that cannot be used is unknown. */
  readonly status: FeatureStatus;
  /** '' when the record has none. */
  readonly source: string;
  readonly licence: string;
  readonly date: string;
  /** The tier that may be shown, or null. */
  readonly tier: SourceTier | null;
  /** Where the record is in the place's own list. Used to remove it. */
  readonly claimIndex: number;
}

const ORDER: ReadonlyMap<string, number> = new Map(TERMS.map((t, i) => [t.id, i] as const));

/** One row for each record about a known feature: glossary order, then newest first. */
export function placeRecords(place: Place, lang: Lang): readonly RecordRow[] {
  return place.claims
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => ORDER.has(c.termId))
    .map(({ c, i }) => ({
      i,
      row: {
        termId: c.termId,
        feature: lookupTerm(c.termId, lang).term,
        status: effectiveStatus(c),
        source: c.provenance?.source.trim() ?? '',
        licence: c.provenance?.licence.trim() ?? '',
        date: c.provenance?.date.trim() ?? '',
        tier: effectiveTier(c.provenance),
        claimIndex: i,
      },
    }))
    .sort((a, b) => (ORDER.get(a.row.termId) ?? 0) - (ORDER.get(b.row.termId) ?? 0) || (a.row.date < b.row.date ? 1 : a.row.date > b.row.date ? -1 : a.i - b.i))
    .map((x) => x.row);
}

export const RECORDS_UI = {
  en: {
    summary: (name: string): string => `Sources for ${name}`,
    caption: (name: string): string => `Every record we hold for ${name}`,
    feature: 'Feature',
    reported: 'What is reported',
    source: 'Source',
    licence: 'Licence',
    date: 'Dated',
    tier: 'Tier',
    missing: 'Unknown',
    none: 'We hold no records for this place. Every feature is unknown.',
    count: (n: number): string => (n === 1 ? '1 record' : `${n} records`),
    action: 'Change',
    remove: 'Remove',
    removeLabel: (feature: string, source: string): string => `Remove the record: ${feature}, ${source}`,
    removePlace: 'Remove this place',
    removePlaceLabel: (name: string): string => `Remove this place: ${name}`,
    text: (feature: string, reported: string): string => `${feature}: ${reported}.`,
    from: (source: string, licence: string): string => `Source: ${source}. Licence: ${licence}.`,
    when: (date: string, tier: string): string => `Dated: ${date}. ${tier}.`,
  },
  fr: {
    summary: (name: string): string => `Sources pour ${name}`,
    caption: (name: string): string => `Toutes les fiches que nous avons pour ${name}`,
    feature: 'Caractéristique',
    reported: 'Ce qui est signalé',
    source: 'Provenance',
    licence: 'Licence d’utilisation',
    date: 'Date de la source',
    tier: 'Niveau',
    missing: 'Inconnu',
    none: 'Nous n’avons aucune fiche pour ce lieu. Chaque caractéristique est inconnue.',
    count: (n: number): string => (n === 1 ? '1 fiche' : `${n} fiches`),
    action: 'Modifier',
    remove: 'Retirer',
    removeLabel: (feature: string, source: string): string => `Retirer la fiche\u00a0: ${feature}, ${source}`,
    removePlace: 'Retirer ce lieu',
    removePlaceLabel: (name: string): string => `Retirer ce lieu\u00a0: ${name}`,
    text: (feature: string, reported: string): string => `${feature}\u00a0: ${reported}.`,
    from: (source: string, licence: string): string => `Provenance\u00a0: ${source}. Licence\u00a0: ${licence}.`,
    when: (date: string, tier: string): string => `Date\u00a0: ${date}. ${tier}.`,
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

/** The record as one line of plain text. */
export function recordText(row: RecordRow, lang: Lang): string {
  const ui = RECORDS_UI[lang];
  const or = (v: string): string => (v === '' ? ui.missing : v);
  return [ui.text(row.feature, statusLabel(row.status, lang)), ui.from(or(row.source), or(row.licence)), ui.when(or(row.date), tierName(row.tier, lang))].join(' ');
}

/** All the records for a place as plain text: a heading line, then one line for each record. */
export function placeRecordsText(place: Place, lang: Lang): string {
  const ui = RECORDS_UI[lang];
  const rows = placeRecords(place, lang);
  const body = rows.length === 0 ? ui.none : rows.map((r) => `- ${recordText(r, lang)}`).join('\n');
  return `${fr(lang, ui.caption(place.name))}\n${body}\n`;
}

export function removeRecordId(placeIndex: number, claimIndex: number): string {
  return `gl-rrm-${placeIndex}-${claimIndex}`;
}
export function parseRemoveRecordId(id: string): { readonly placeIndex: number; readonly claimIndex: number } | null {
  const m = /^gl-rrm-(\d+)-(\d+)$/.exec(id);
  return m === null ? null : { placeIndex: Number(m[1]), claimIndex: Number(m[2]) };
}
export function removePlaceId(placeIndex: number): string {
  return `gl-prm-${placeIndex}`;
}
export function parseRemovePlaceId(id: string): number | null {
  const m = /^gl-prm-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}

/**
 * A closed "Sources for…" block with a table: one row for each record, with row and column headers.
 * With `editIndex` (the place's index in the list), each row gets a Remove button and the block
 * gets a button to remove the place. The host must be able to keep the change.
 */
export function renderPlaceRecords(place: Place, lang: Lang, editIndex?: number): string {
  const ui = RECORDS_UI[lang];
  const rows = placeRecords(place, lang);
  const summary = `<summary>${escapeHtml(fr(lang, ui.summary(place.name)))} <span class="gl-note">(${escapeHtml(ui.count(rows.length))})</span></summary>`;
  const removePlace =
    editIndex === undefined
      ? ''
      : `<div class="gl-actions"><button type="button" class="gl-btn" id="${removePlaceId(editIndex)}" aria-label="${escapeHtml(fr(lang, ui.removePlaceLabel(place.name)))}">${escapeHtml(ui.removePlace)}</button></div>`;
  if (rows.length === 0) return `<details class="gl-records">${summary}<p class="gl-note">${escapeHtml(ui.none)}</p>${removePlace}</details>`;
  const cell = (v: string): string => `<td>${escapeHtml(v === '' ? ui.missing : v)}</td>`;
  const body = rows
    .map((r) => {
      const remove =
        editIndex === undefined
          ? ''
          : `<td><button type="button" class="gl-btn" id="${removeRecordId(editIndex, r.claimIndex)}" aria-label="${escapeHtml(fr(lang, ui.removeLabel(r.feature, r.source === '' ? ui.missing : r.source)))}">${escapeHtml(ui.remove)}</button></td>`;
      return (
        `<tr><th scope="row">${escapeHtml(r.feature)}</th><td data-status="${r.status}">${escapeHtml(statusLabel(r.status, lang))}</td>` +
        `${cell(r.source)}${cell(r.licence)}${cell(r.date)}<td>${escapeHtml(tierName(r.tier, lang))}</td>${remove}</tr>`
      );
    })
    .join('');
  const caption = fr(lang, ui.caption(place.name));
  const heads = [ui.feature, ui.reported, ui.source, ui.licence, ui.date, ui.tier, ...(editIndex === undefined ? [] : [ui.action])];
  const head = heads.map((h) => `<th scope="col">${escapeHtml(h)}</th>`).join('');
  return (
    `<details class="gl-records">${summary}<div class="gl-compare-wrap" role="region" aria-label="${escapeHtml(caption)}" tabindex="0">` +
    `<table class="gl-compare"><caption>${escapeHtml(caption)}</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>${removePlace}</details>`
  );
}

/** The list without one record of one place. The same list when there is no such record. */
export function removeRecord(places: readonly Place[], placeIndex: number, claimIndex: number): readonly Place[] {
  const place = places[placeIndex];
  if (place === undefined || !Number.isInteger(claimIndex) || claimIndex < 0 || claimIndex >= place.claims.length) return places;
  return places.map((p, i) => (i === placeIndex ? { ...p, claims: p.claims.filter((_, c) => c !== claimIndex) } : p));
}

/** The list without one place. The same list when there is no such place. */
export function removePlace(places: readonly Place[], placeIndex: number): readonly Place[] {
  return places[placeIndex] === undefined ? places : places.filter((_, i) => i !== placeIndex);
}

export const RECORD_EDIT_UI = {
  en: {
    removedRecord: (place: string, feature: string): string => `Removed a record from ${place}: ${feature}.`,
    removedPlace: (place: string): string => `Removed ${place} and its records.`,
  },
  fr: {
    removedRecord: (place: string, feature: string): string => `Fiche retirée de ${place}\u00a0: ${feature}.`,
    removedPlace: (place: string): string => `${place} et ses fiches ont été retirés.`,
  },
} as const;
