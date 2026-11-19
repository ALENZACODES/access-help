import { fixFrench } from './frTypography';
import { creditLine, licenceDuties, LICENCE_UI } from './licenceInfo';
import { htmlLang } from './locale';
import type { Place } from './places';
import type { Lang } from './plainTerms';
import { PRINT_CSS, PRINT_MIME } from './printPlan';
import type { Provenance } from './provenance';
import { RECORDS_UI, placeRecords } from './recordSources';
import { sourceGroups } from './sourcesPanel';
import { TIER_UI, tierName } from './sourceTier';
import { statusLabel } from './status';
import { escapeHtml } from './text';
import type { ExportFile } from './textExport';

/**
 * Every record on one printable page: each place with a table of its records, and each record
 * with its source, licence, date and tier. The credits and what the licences ask are at the end,
 * so a printed copy still says where the information came from. The page has no script, no
 * image and no link, and it works offline.
 */
export interface RecordsPrintOptions {
  readonly lang: Lang;
  /** YYYY-MM-DD, printed on the page. */
  readonly today: string;
  /** The source of the place list itself, if there is one. */
  readonly listSource?: Provenance | null;
}

export const RECORDSPRINT_UI = {
  en: {
    title: 'Records for every place',
    date: (today: string): string => `Printed on ${today}.`,
    note: 'This page shows what sources report. It says nothing more about any place.',
    counts: (places: number, records: number): string => `${places} places, ${records} records.`,
    none: 'No places are loaded.',
    credits: 'Where the information comes from',
    exportPrint: 'Save every record as a page to print',
  },
  fr: {
    title: 'Fiches de tous les lieux',
    date: (today: string): string => `Imprimé le ${today}.`,
    note: 'Cette page montre ce que les sources signalent. Elle ne dit rien de plus sur les lieux.',
    counts: (places: number, records: number): string => `${places} lieux, ${records} fiches.`,
    none: 'Aucun lieu n’est chargé.',
    credits: 'D’où vient l’information',
    exportPrint: 'Enregistrer toutes les fiches dans une page à imprimer',
  },
} as const;

export const RECORDS_PRINT_ID = 'gl-records-print';

const TABLE_CSS = ' table { width: 100%; border-collapse: collapse; margin: 8px 0 20px; } caption { text-align: left; font-weight: 700; padding-bottom: 4px; } th, td { border: 1px solid #000000; padding: 4px 6px; text-align: left; vertical-align: top; } section { break-inside: avoid; }';

function placeSection(place: Place, lang: Lang): string {
  const ui = RECORDS_UI[lang];
  const rows = placeRecords(place, lang);
  if (rows.length === 0) return `<section><h2>${escapeHtml(place.name)}</h2><p class="note">${escapeHtml(ui.none)}</p></section>`;
  const cell = (v: string): string => `<td>${escapeHtml(v === '' ? ui.missing : v)}</td>`;
  const head = [ui.feature, ui.reported, ui.source, ui.licence, ui.date, ui.tier].map((h) => `<th scope="col">${escapeHtml(h)}</th>`).join('');
  const body = rows
    .map((r) => `<tr><th scope="row">${escapeHtml(r.feature)}</th><td>${escapeHtml(statusLabel(r.status, lang))}</td>${cell(r.source)}${cell(r.licence)}${cell(r.date)}<td>${escapeHtml(tierName(r.tier, lang))}</td></tr>`)
    .join('');
  const caption = lang === 'fr' ? fixFrench(ui.caption(place.name)) : ui.caption(place.name);
  return `<section><h2>${escapeHtml(place.name)}</h2><table><caption>${escapeHtml(caption)}</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></section>`;
}

/** The whole page as one HTML document. */
export function renderRecordsPrintPage(places: readonly Place[], options: RecordsPrintOptions): string {
  const { lang } = options;
  const ui = RECORDSPRINT_UI[lang];
  const records = places.reduce((n, p) => n + placeRecords(p, lang).length, 0);
  const groups = sourceGroups(places, options.listSource);
  const credits =
    groups.length === 0
      ? ''
      : `<section><h2>${escapeHtml(ui.credits)}</h2><ul>` +
        groups
          .map((g) => `<li>${escapeHtml(creditLine({ source: g.source, licence: g.licence, date: g.newest }, lang))}<ul>${licenceDuties(g.licence, lang).map((d) => `<li>${escapeHtml(d)}</li>`).join('')}</ul></li>`)
          .join('') +
        `</ul><p class="note">${escapeHtml(LICENCE_UI[lang].note)}</p><p class="note">${escapeHtml(TIER_UI[lang].intro)}</p></section>`;
  const body = places.length === 0 ? `<p>${escapeHtml(ui.none)}</p>` : `<p class="note">${escapeHtml(ui.counts(places.length, records))}</p>${places.map((p) => placeSection(p, lang)).join('')}`;
  return (
    `<!doctype html><html lang="${htmlLang(lang)}"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(ui.title)}</title>` +
    `<style>${PRINT_CSS}${TABLE_CSS}</style></head>` +
    `<body><main><h1>${escapeHtml(ui.title)}</h1><p class="note">${escapeHtml(ui.date(options.today))}</p><p class="note">${escapeHtml(ui.note)}</p>${body}${credits}</main></body></html>`
  );
}

export function recordsPrintFilename(lang: Lang): string {
  return `records-to-print-${lang}.html`;
}

export function recordsPrintFile(places: readonly Place[], options: RecordsPrintOptions): ExportFile {
  return { text: renderRecordsPrintPage(places, options), filename: recordsPrintFilename(options.lang), mime: PRINT_MIME };
}

export function renderRecordsPrintButton(lang: Lang): string {
  return `<div class="gl-actions"><button type="button" class="gl-btn" id="${RECORDS_PRINT_ID}">${escapeHtml(RECORDSPRINT_UI[lang].exportPrint)}</button></div>`;
}
