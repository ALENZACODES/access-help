import { parseCsv } from './csvImport';
import { infoKey, tidyInfo } from './placeInfo';
import type { Place, PlaceInfo } from './places';
import { TERMS, type Lang } from './plainTerms';
import type { Provenance } from './provenance';
import { parseTier } from './sourceTier';
import { effectiveStatus, type FeatureClaim, type FeatureStatus } from './status';
import { escapeHtml } from './text';

/**
 * Records as a table, one row for each record, and each row with its own source, licence, date
 * and tier. The same table can be read back, so records can be carried between devices offline
 * without losing where each one came from. Column names are a file format, not copy: they are
 * the same in both languages.
 */
export const RECORD_COLUMNS = ['place_id', 'place_name', 'feature', 'status', 'source', 'licence', 'date', 'tier', 'url'] as const;
/**
 * Two more columns, written only when a place holds a kind or an area. They are filled on the
 * place's own row: a row with no feature, whose source, licence, date and tier are those of the
 * kind and area. A table without these columns is read exactly as before.
 */
export const INFO_COLUMNS = ['place_kind', 'place_area'] as const;
export type RecordColumn = (typeof RECORD_COLUMNS)[number] | (typeof INFO_COLUMNS)[number];
export const REQUIRED_COLUMNS: readonly RecordColumn[] = ['place_id', 'place_name', 'feature', 'status'];

export const RECORDS_CSV_MIME = 'text/csv;charset=utf-8';

const RISKY_START = /^'*[=+\-@\t\r]/;

/**
 * One cell. A cell that a spreadsheet could run as a formula gets a leading apostrophe.
 * A cell with a comma, a quote, a new line or a space at either end is quoted.
 */
export function recordCell(value: string): string {
  const safe = RISKY_START.test(value) ? `'${value}` : value;
  return /[",\r\n]|^\s|\s$/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Undoes the apostrophe that recordCell adds. Any other text is returned as it is. */
export function recordUncell(value: string): string {
  return /^'+[=+\-@\t\r]/.test(value) ? value.slice(1) : value;
}

function rowOf(place: Place, claim: FeatureClaim | null, withInfo = false): string {
  // The place's own row carries the source of its kind and area. A record's row carries the record's source.
  const p = claim === null ? place.info?.provenance : claim.provenance;
  const cells = [
    place.id,
    place.name,
    claim?.termId ?? '',
    claim?.status ?? '',
    p?.source ?? '',
    p?.licence ?? '',
    p?.date ?? '',
    p?.tier === undefined ? '' : (parseTier(p.tier) ?? p.tier),
    p?.url ?? '',
    ...(withInfo ? [claim === null ? (place.info?.kind ?? '') : '', claim === null ? (place.info?.area ?? '') : ''] : []),
  ];
  return cells.map(recordCell).join(',');
}

/**
 * Every record of every place. A place with no records gets one row with an empty feature, so it
 * is not lost. A place with a kind or an area gets such a row too, and it carries them. Records are written as they are held: nothing is filled in and nothing is moved up.
 */
export function recordsToCsv(places: readonly Place[]): string {
  const withInfo = places.some((p) => p.info !== undefined);
  const lines = [(withInfo ? [...RECORD_COLUMNS, ...INFO_COLUMNS] : RECORD_COLUMNS).join(',')];
  for (const place of places) {
    if (place.claims.length === 0 || place.info !== undefined) lines.push(rowOf(place, null, withInfo));
    for (const claim of place.claims) lines.push(rowOf(place, claim, withInfo));
  }
  return `${lines.join('\r\n')}\r\n`;
}

export function recordsFilename(lang: Lang): string {
  return `records-${lang}.csv`;
}

export type RecordsProblem = 'empty-file' | 'unterminated-quote' | 'too-many-rows' | `missing-column:${string}`;
export type RecordReject = 'wrong-column-count' | 'missing-id' | 'missing-name' | 'name-conflict' | 'unknown-feature' | 'status-not-known' | 'info-conflict';

export interface RecordsImport {
  readonly places: readonly Place[];
  /** 1-based line numbers of rows left out, with why. */
  readonly rejected: readonly { readonly line: number; readonly reason: RecordReject }[];
  /** Any problem here means nothing was read. */
  readonly problems: readonly RecordsProblem[];
  /** Records read. */
  readonly records: number;
  /** Records that say available or not available but cannot be reported (no usable source). They are kept, as unknown. */
  readonly notUsable: number;
}

export const MAX_RECORD_ROWS = 20_000;

const STATUS_WORDS: Readonly<Record<string, FeatureStatus>> = { present: 'present', absent: 'absent', unknown: 'unknown' };
const KNOWN_TERMS: ReadonlySet<string> = new Set(TERMS.map((t) => t.id));

/**
 * Reads a table written by recordsToCsv (or made by hand with the same columns). Each record keeps
 * the source, licence, date and tier from its own row. A row is never guessed at: an unknown
 * feature or status word leaves the row out, and a record with no usable source is kept as unknown.
 */
export function recordsFromCsv(csv: string): RecordsImport {
  const parsed = parseCsv(csv);
  const problems: RecordsProblem[] = [];
  if (parsed.unterminatedQuote) problems.push('unterminated-quote');
  const [header, ...body] = parsed.rows;
  if (header === undefined) return { places: [], rejected: [], problems: [...problems, 'empty-file'], records: 0, notUsable: 0 };
  const names = header.map((h) => (h.charCodeAt(0) === 0xfeff ? h.slice(1) : h).trim().toLowerCase());
  const col = (name: RecordColumn): number => names.indexOf(name);
  for (const name of REQUIRED_COLUMNS) if (col(name) === -1) problems.push(`missing-column:${name}`);
  if (body.length > MAX_RECORD_ROWS) problems.push('too-many-rows');
  if (problems.length > 0) return { places: [], rejected: [], problems, records: 0, notUsable: 0 };

  const order: string[] = [];
  const byId = new Map<string, { name: string; claims: FeatureClaim[]; info?: PlaceInfo }>();
  const rejected: { line: number; reason: RecordReject }[] = [];
  let records = 0;
  let notUsable = 0;
  body.forEach((row, i) => {
    const line = i + 2;
    const reject = (reason: RecordReject): void => void rejected.push({ line, reason });
    if (row.length !== header.length) return reject('wrong-column-count');
    const cell = (name: RecordColumn): string => {
      const at = col(name);
      return at === -1 ? '' : recordUncell(row[at] ?? '').trim();
    };
    const id = cell('place_id');
    const name = cell('place_name');
    if (id === '') return reject('missing-id');
    if (name === '') return reject('missing-name');
    const known = byId.get(id);
    if (known !== undefined && known.name !== name) return reject('name-conflict');
    const feature = cell('feature');
    const statusWord = cell('status').toLowerCase();
    if (feature !== '' && !KNOWN_TERMS.has(feature)) return reject('unknown-feature');
    const statusKnown = statusWord === '' || Object.prototype.hasOwnProperty.call(STATUS_WORDS, statusWord);
    if (feature !== '' && !statusKnown) return reject('status-not-known');
    const status: FeatureStatus = statusKnown && statusWord !== '' ? (STATUS_WORDS[statusWord] ?? 'unknown') : 'unknown';
    let place = known;
    if (place === undefined) {
      place = { name, claims: [] };
      byId.set(id, place);
      order.push(id);
    }
    const source = cell('source');
    const licence = cell('licence');
    const date = cell('date');
    const tierText = cell('tier');
    const url = cell('url');
    let provenance: Provenance | undefined;
    if (source !== '' || licence !== '' || date !== '') {
      provenance = { source, licence, date };
      if (tierText !== '') provenance = { ...provenance, tier: parseTier(tierText) ?? tierText };
      if (/^https:\/\/\S+$/.test(url)) provenance = { ...provenance, url };
    }
    if (feature === '') {
      // The place's own row. Its kind and area are kept as written, with the source of this row.
      const info = tidyInfo({ kind: cell('place_kind'), area: cell('place_area'), ...(provenance === undefined ? {} : { provenance }) });
      if (info === undefined) return undefined;
      if (place.info !== undefined && infoKey(place.info) !== infoKey(info)) return reject('info-conflict');
      place.info = info;
      return undefined;
    }
    const claim: FeatureClaim = provenance === undefined ? { termId: feature, status } : { termId: feature, status, provenance };
    place.claims.push(claim);
    records += 1;
    if (claim.status !== 'unknown' && effectiveStatus(claim) === 'unknown') notUsable += 1;
    return undefined;
  });
  const places: Place[] = order.map((id) => {
    const held = byId.get(id);
    const place: Place = { id, name: held?.name ?? '', claims: held?.claims ?? [] };
    return held?.info === undefined ? place : { ...place, info: held.info };
  });
  return { places, rejected, problems: [], records, notUsable };
}

export const RECORDSCSV_UI = {
  en: {
    heading: 'Carry records between devices',
    intro: 'Each row keeps its own source, licence, date and tier.',
    exportCsv: 'Save every record as a table',
    label: 'Paste a table of records',
    hint: 'Use a table saved from this screen. Nothing is sent anywhere.',
    load: 'Load the records',
    loaded: (places: number, records: number): string => `Loaded ${records} records for ${places} places.`,
    rejected: (n: number): string => (n === 1 ? '1 row was left out.' : `${n} rows were left out.`),
    notUsable: (n: number): string => (n === 1 ? '1 record has no usable source. It is shown as Unknown.' : `${n} records have no usable source. They are shown as Unknown.`),
    failed: 'The table could not be read. Nothing was changed.',
    problems: {
      'empty-file': 'The table is empty.',
      'unterminated-quote': 'A quote mark is not closed.',
      'too-many-rows': 'The table has too many rows.',
      'missing-column': 'A column is missing.',
    },
  },
  fr: {
    heading: 'Transporter les fiches entre appareils',
    intro: 'Chaque ligne garde sa provenance, sa licence, sa date et son niveau.',
    exportCsv: 'Enregistrer toutes les fiches dans un tableau',
    label: 'Coller un tableau de fiches',
    hint: 'Utilisez un tableau enregistré à partir de cet écran. Rien n’est envoyé.',
    load: 'Charger les fiches',
    loaded: (places: number, records: number): string => `${records} fiches chargées pour ${places} lieux.`,
    rejected: (n: number): string => (n === 1 ? '1 ligne a été laissée de côté.' : `${n} lignes ont été laissées de côté.`),
    notUsable: (n: number): string => (n === 1 ? '1 fiche n’a pas de provenance utilisable. Elle est affichée comme UNKNOWN.' : `${n} fiches n’ont pas de provenance utilisable. Elles sont affichées comme UNKNOWN.`),
    failed: 'Le tableau n’a pas pu être lu. Rien n’a été changé.',
    problems: {
      'empty-file': 'Le tableau est vide.',
      'unterminated-quote': 'Un guillemet n’est pas fermé.',
      'too-many-rows': 'Le tableau a trop de lignes.',
      'missing-column': 'Il manque une colonne.',
    },
  },
} as const;

/** What to tell the person after a table was read: what was loaded, or why nothing was. */
export function importMessage(result: RecordsImport, lang: Lang): string {
  const ui = RECORDSCSV_UI[lang];
  if (result.problems.length > 0) {
    const first = result.problems[0] ?? 'empty-file';
    const key = first.startsWith('missing-column:') ? 'missing-column' : (first as 'empty-file' | 'unterminated-quote' | 'too-many-rows');
    return `${ui.failed} ${ui.problems[key]}`;
  }
  const parts = [ui.loaded(result.places.length, result.records)];
  if (result.rejected.length > 0) parts.push(ui.rejected(result.rejected.length));
  if (result.notUsable > 0) parts.push(ui.notUsable(result.notUsable));
  return parts.join(' ');
}

export const RECORDSCSV_IDS = { export: 'gl-records-export', text: 'gl-records-text', load: 'gl-records-load' } as const;

/**
 * The save button (when the host takes files) and the box to load a table (when the host takes records).
 * `loadOptions` is markup placed just before the Load button, such as the choice to replace or add.
 */
export function renderRecordsCsv(lang: Lang, canExport: boolean, canLoad: boolean, message = '', loadOptions = ''): string {
  if (!canExport && !canLoad) return '';
  const ui = RECORDSCSV_UI[lang];
  const save = canExport ? `<div class="gl-actions"><button type="button" class="gl-btn" id="${RECORDSCSV_IDS.export}">${escapeHtml(ui.exportCsv)}</button></div>` : '';
  const load = canLoad
    ? `<label for="${RECORDSCSV_IDS.text}">${escapeHtml(ui.label)}</label>` +
      `<textarea id="${RECORDSCSV_IDS.text}" class="gl-input" rows="4" spellcheck="false" aria-describedby="${RECORDSCSV_IDS.text}-hint"></textarea>` +
      `<span class="gl-note" id="${RECORDSCSV_IDS.text}-hint">${escapeHtml(ui.hint)}</span>` +
      `${loadOptions}<div class="gl-actions"><button type="button" class="gl-btn" id="${RECORDSCSV_IDS.load}">${escapeHtml(ui.load)}</button></div>`
    : '';
  const status = `<p role="status" data-gl-records-msg>${escapeHtml(message)}</p>`;
  return `<h4>${escapeHtml(ui.heading)}</h4><p>${escapeHtml(ui.intro)}</p>${save}${load}${status}`;
}
