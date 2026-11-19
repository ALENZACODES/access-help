import { fixFrench } from './frTypography';
import type { Place } from './places';
import { TERMS, type Lang } from './plainTerms';
import { effectiveStatus } from './status';
import { escapeHtml } from './text';

/**
 * The records that can be reported, counted by the year of their source. It shows how the dates
 * of the information are spread. A year with many records is not a statement about any place.
 */
export interface YearRow {
  readonly year: string;
  readonly records: number;
  readonly present: number;
  readonly absent: number;
  readonly places: number;
  readonly sources: number;
}

export interface YearTotals {
  readonly rows: readonly YearRow[];
  readonly records: number;
  /** '' when there are no records. */
  readonly oldest: string;
  readonly newest: string;
}

const KNOWN: ReadonlySet<string> = new Set(TERMS.map((t) => t.id));

/** One row for each year with a usable record, newest year first. */
export function recordYears(places: readonly Place[]): YearTotals {
  const map = new Map<string, { records: number; present: number; absent: number; places: Set<string>; sources: Set<string> }>();
  let oldest = '';
  let newest = '';
  let records = 0;
  for (const place of places) {
    for (const claim of place.claims) {
      const status = effectiveStatus(claim);
      if (status === 'unknown' || claim.provenance === undefined || !KNOWN.has(claim.termId)) continue;
      const date = claim.provenance.date.trim();
      const year = date.slice(0, 4);
      const row = map.get(year) ?? { records: 0, present: 0, absent: 0, places: new Set<string>(), sources: new Set<string>() };
      row.records += 1;
      row[status] += 1;
      row.places.add(place.id);
      row.sources.add(claim.provenance.source.trim());
      map.set(year, row);
      records += 1;
      if (oldest === '' || date < oldest) oldest = date;
      if (newest === '' || date > newest) newest = date;
    }
  }
  const rows = [...map.entries()]
    .map(([year, r]): YearRow => ({ year, records: r.records, present: r.present, absent: r.absent, places: r.places.size, sources: r.sources.size }))
    .sort((a, b) => (a.year < b.year ? 1 : a.year > b.year ? -1 : 0));
  return { rows, records, oldest, newest };
}

export const YEARS_UI = {
  en: {
    heading: 'Records by year',
    intro: 'This counts the records that can be reported, by the year of their source.',
    none: 'There are no records that can be reported.',
    span: (oldest: string, newest: string): string => (oldest === newest ? `Every record is dated ${oldest}.` : `The dates run from ${oldest} to ${newest}.`),
    caption: 'How many records there are for each year',
    year: 'Year',
    records: 'Records',
    present: 'Reported as available',
    absent: 'Reported as not available',
    places: 'Places',
    sources: 'Sources',
    exportList: 'Save this table as text',
    title: 'Records by year',
    made: (date: string): string => `Made on ${date}.`,
    line: (year: string, records: number): string => `${year}: records ${records}.`,
    detail: (present: number, absent: number): string => `Reported as available: ${present}. Reported as not available: ${absent}.`,
  },
  fr: {
    heading: 'Fiches par année',
    intro: 'Ce tableau compte les fiches qui peuvent être signalées, selon l’année de leur source.',
    none: 'Il n’y a aucune fiche qui peut être signalée.',
    span: (oldest: string, newest: string): string => (oldest === newest ? `Chaque fiche date du ${oldest}.` : `Les dates vont du ${oldest} au ${newest}.`),
    caption: 'Nombre de fiches pour chaque année',
    year: 'Année',
    records: 'Fiches',
    present: 'Signalé comme disponible',
    absent: 'Signalé comme non disponible',
    places: 'Lieux',
    sources: 'Provenances',
    exportList: 'Enregistrer ce tableau en texte',
    title: 'Fiches par année',
    made: (date: string): string => `Fait le ${date}.`,
    line: (year: string, records: number): string => `${year}\u00a0: fiches ${records}.`,
    detail: (present: number, absent: number): string => `Signalé comme disponible\u00a0: ${present}. Signalé comme non disponible\u00a0: ${absent}.`,
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

export const YEARS_EXPORT_ID = 'gl-years-export';
export const YEARS_MIME = 'text/plain;charset=utf-8';

export function yearsFilename(lang: Lang): string {
  return `records-by-year-${lang}.txt`;
}

/** "2026: records 3. Reported as available: 2. Reported as not available: 1." */
export function yearRowText(row: YearRow, lang: Lang): string {
  const ui = YEARS_UI[lang];
  return fr(lang, `${ui.line(row.year, row.records)} ${ui.detail(row.present, row.absent)}`);
}

/** The table as plain text. */
export function yearsText(places: readonly Place[], lang: Lang, today: string): string {
  const ui = YEARS_UI[lang];
  const totals = recordYears(places);
  const head = `${ui.title}\n${ui.made(today)}\n`;
  if (totals.records === 0) return `${head}\n${ui.none}\n`;
  return `${head}\n${ui.intro}\n${ui.span(totals.oldest, totals.newest)}\n\n${totals.rows.map((r) => `- ${yearRowText(r, lang)}`).join('\n')}\n`;
}

/** The panel: the span of the dates, then a table with one row for each year. */
export function renderYears(places: readonly Place[], lang: Lang, canExport: boolean): string {
  const ui = YEARS_UI[lang];
  const totals = recordYears(places);
  if (totals.records === 0) return `<p class="gl-note">${escapeHtml(ui.none)}</p>`;
  const body = totals.rows
    .map((r) => `<tr><th scope="row">${escapeHtml(r.year)}</th><td>${r.records}</td><td>${r.present}</td><td>${r.absent}</td><td>${r.places}</td><td>${r.sources}</td></tr>`)
    .join('');
  const heads = [ui.year, ui.records, ui.present, ui.absent, ui.places, ui.sources].map((h) => `<th scope="col">${escapeHtml(h)}</th>`).join('');
  const button = canExport ? `<div class="gl-actions"><button type="button" class="gl-btn" id="${YEARS_EXPORT_ID}">${escapeHtml(ui.exportList)}</button></div>` : '';
  return (
    `<p>${escapeHtml(ui.intro)}</p><p role="status">${escapeHtml(ui.span(totals.oldest, totals.newest))}</p>` +
    `<div class="gl-compare-wrap" role="region" aria-label="${escapeHtml(ui.caption)}" tabindex="0">` +
    `<table class="gl-compare"><caption>${escapeHtml(ui.caption)}</caption><thead><tr>${heads}</tr></thead><tbody>${body}</tbody></table></div>${button}`
  );
}
