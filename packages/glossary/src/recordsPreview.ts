import type { Place } from './places';
import type { Lang } from './plainTerms';
import { RECORDSCSV_UI, recordsFromCsv, type RecordReject, type RecordsImport } from './recordsCsv';
import { mergeRecords, type LoadMode, type MergeResult } from './recordsMerge';
import { escapeHtml } from './text';

/**
 * Checking a table before it is loaded. The check reads the table exactly as loading would and
 * says what would happen: how many places and records, which rows would be left out and why, and
 * what would be new. It changes nothing.
 */
export interface LoadPreview {
  readonly mode: LoadMode;
  readonly result: RecordsImport;
  /** What adding the table would do. Null in replace mode or when the table cannot be read. */
  readonly merge: MergeResult | null;
  /** Places held now. */
  readonly held: number;
}

export function previewLoad(csv: string, existing: readonly Place[], mode: LoadMode): LoadPreview {
  const result = recordsFromCsv(csv);
  const readable = result.problems.length === 0;
  return { mode, result, merge: readable && mode === 'add' ? mergeRecords(existing, result.places) : null, held: existing.length };
}

/** true when loading the table would change the records held. */
export function wouldChange(p: LoadPreview): boolean {
  if (p.result.problems.length > 0 || p.result.places.length === 0) return false;
  return p.merge === null ? true : p.merge.addedPlaces > 0 || p.merge.addedRecords > 0;
}

export const PREVIEW_UI = {
  en: {
    check: 'Check the table first',
    unchanged: 'This was only a check. Nothing was changed.',
    has: (places: number, records: number): string => `The table has ${records} records for ${places} places.`,
    empty: 'The table has no places that can be read.',
    wouldReplace: (n: number): string => (n === 1 ? 'Loading it replaces the 1 place you have.' : `Loading it replaces the ${n} places you have.`),
    wouldAdd: (records: number, places: number): string => `Loading it adds ${records} records and ${places} new places.`,
    nothingNew: 'Loading it adds nothing new.',
    rowsLeftOut: 'Rows that would be left out',
    line: (n: number, why: string): string => `Line ${n}: ${why}`,
    more: (n: number): string => (n === 1 ? 'And 1 more row.' : `And ${n} more rows.`),
    reasons: {
      'wrong-column-count': 'The row does not have the same number of cells as the first row.',
      'missing-id': 'The place has no id.',
      'missing-name': 'The place has no name.',
      'name-conflict': 'The id is used with a different name on an earlier row.',
      'unknown-feature': 'The feature is not one we know.',
      'status-not-known': 'The status is not present, absent or unknown.',
    },
  },
  fr: {
    check: 'Contrôler le tableau d’abord',
    unchanged: 'Ce n’était qu’un contrôle. Rien n’a été changé.',
    has: (places: number, records: number): string => `Le tableau a ${records} fiches pour ${places} lieux.`,
    empty: 'Le tableau n’a aucun lieu lisible.',
    wouldReplace: (n: number): string => (n === 1 ? 'Le charger remplace le 1 lieu que vous avez.' : `Le charger remplace les ${n} lieux que vous avez.`),
    wouldAdd: (records: number, places: number): string => `Le charger ajoute ${records} fiches et ${places} nouveaux lieux.`,
    nothingNew: 'Le charger n’ajoute rien de nouveau.',
    rowsLeftOut: 'Lignes qui seraient laissées de côté',
    line: (n: number, why: string): string => `Ligne ${n}\u00a0: ${why}`,
    more: (n: number): string => (n === 1 ? 'Et 1 autre ligne.' : `Et ${n} autres lignes.`),
    reasons: {
      'wrong-column-count': 'La ligne n’a pas le même nombre de cellules que la première ligne.',
      'missing-id': 'Le lieu n’a pas d’identifiant.',
      'missing-name': 'Le lieu n’a pas de nom.',
      'name-conflict': 'L’identifiant est utilisé avec un autre nom sur une ligne plus haut.',
      'unknown-feature': 'La caractéristique n’est pas une de celles que nous connaissons.',
      'status-not-known': 'Le statut doit être present, absent ou unknown.',
    },
  },
} as const;

export function rejectText(reason: RecordReject, lang: Lang): string {
  return PREVIEW_UI[lang].reasons[reason];
}

/** The sentences that say what loading would do, in order. */
export function previewLines(p: LoadPreview, lang: Lang): readonly string[] {
  const ui = PREVIEW_UI[lang];
  const csv = RECORDSCSV_UI[lang];
  const first = p.result.problems[0];
  if (first !== undefined) {
    const key = first.startsWith('missing-column:') ? 'missing-column' : (first as 'empty-file' | 'unterminated-quote' | 'too-many-rows');
    return [`${csv.failed} ${csv.problems[key]}`];
  }
  const lines: string[] = [];
  if (p.result.places.length === 0) lines.push(ui.empty);
  else {
    lines.push(ui.has(p.result.places.length, p.result.records));
    if (p.merge !== null) lines.push(wouldChange(p) ? ui.wouldAdd(p.merge.addedRecords, p.merge.addedPlaces) : ui.nothingNew);
    else if (p.held > 0) lines.push(ui.wouldReplace(p.held));
    if (p.result.notUsable > 0) lines.push(csv.notUsable(p.result.notUsable));
  }
  if (p.result.rejected.length > 0) lines.push(csv.rejected(p.result.rejected.length));
  lines.push(ui.unchanged);
  return lines;
}

export const PREVIEW_CHECK_ID = 'gl-records-check';
export const MAX_REJECTS_SHOWN = 20;

export function renderCheckButton(lang: Lang): string {
  return `<div class="gl-actions"><button type="button" class="gl-btn" id="${PREVIEW_CHECK_ID}">${escapeHtml(PREVIEW_UI[lang].check)}</button></div>`;
}

/** What the check found: the sentences, then each row that would be left out with its line number and the reason. */
export function renderPreview(p: LoadPreview, lang: Lang, limit = MAX_REJECTS_SHOWN): string {
  const ui = PREVIEW_UI[lang];
  const lines = previewLines(p, lang).map((l) => `<li>${escapeHtml(l)}</li>`).join('');
  const rejected = p.result.rejected;
  if (rejected.length === 0) return `<ul class="gl-preview">${lines}</ul>`;
  const shown = rejected.slice(0, Math.max(0, limit));
  const rows = shown.map((r) => `<li>${escapeHtml(ui.line(r.line, rejectText(r.reason, lang)))}</li>`).join('');
  const more = rejected.length > shown.length ? `<p class="gl-note">${escapeHtml(ui.more(rejected.length - shown.length))}</p>` : '';
  return `<ul class="gl-preview">${lines}</ul><p><strong>${escapeHtml(ui.rowsLeftOut)}</strong></p><ul class="gl-rejects">${rows}</ul>${more}`;
}
