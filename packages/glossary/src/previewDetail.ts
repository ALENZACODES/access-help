import { fixFrench } from './frTypography';
import type { Place } from './places';
import type { Lang } from './plainTerms';
import { diffRecords, diffToText, renderDiff, type DiffRow } from './recordsDiff';
import type { LoadPreview } from './recordsPreview';
import { escapeHtml } from './text';

/**
 * The check of a table, record by record: exactly which places and records loading the table
 * would add, remove or change, set beside the counts the check already gives. Like the check
 * itself, it changes nothing.
 */

/** The places that would be held after loading, or null when the table cannot be read or holds no place. */
export function previewResult(p: LoadPreview): readonly Place[] | null {
  if (p.result.problems.length > 0 || p.result.places.length === 0) return null;
  return p.merge === null ? p.result.places : p.merge.places;
}

/** Every difference loading would make to the records held now. Empty when the table cannot be loaded. */
export function previewDiffRows(p: LoadPreview, existing: readonly Place[], lang: Lang): readonly DiffRow[] {
  const next = previewResult(p);
  return next === null ? [] : diffRecords(existing, next, lang);
}

export const PREVIEWDETAIL_UI = {
  en: {
    summary: 'See each difference',
    intro: 'This is what loading the table would change in the records held now. Nothing is changed yet.',
    exportList: 'Save the differences as text',
    title: 'What loading the table would change',
    made: (date: string): string => `Made on ${date}.`,
    replace: 'The table would replace the records held now.',
    add: 'The table would be added to the records held now.',
  },
  fr: {
    summary: 'Voir chaque différence',
    intro: 'Voici ce que le chargement du tableau changerait dans les fiches conservées. Rien n’est encore changé.',
    exportList: 'Enregistrer les différences en texte',
    title: 'Ce que le chargement du tableau changerait',
    made: (date: string): string => `Fait le ${date}.`,
    replace: 'Le tableau remplacerait les fiches conservées.',
    add: 'Le tableau serait ajouté aux fiches conservées.',
  },
} as const;

export const PREVIEWDETAIL_EXPORT_ID = 'gl-preview-diff-export';
export const PREVIEWDETAIL_MIME = 'text/plain;charset=utf-8';
export const MAX_PREVIEW_DIFFS_SHOWN = 20;

export function previewDetailFilename(lang: Lang): string {
  return `table-differences-${lang}.txt`;
}

/** The differences as plain text, with how the table would be loaded. Empty string when the table cannot be loaded. */
export function previewDiffText(p: LoadPreview, existing: readonly Place[], lang: Lang, today: string): string {
  if (previewResult(p) === null) return '';
  const ui = PREVIEWDETAIL_UI[lang];
  const how = p.mode === 'add' ? ui.add : ui.replace;
  return `${ui.title}\n${ui.made(today)}\n\n${how}\n\n${diffToText(previewDiffRows(p, existing, lang), lang)}`;
}

/** A closed block under the check: each difference, and a button to save them. Nothing when the table cannot be loaded. */
export function renderPreviewDetail(p: LoadPreview, existing: readonly Place[], lang: Lang, canExport: boolean, limit = MAX_PREVIEW_DIFFS_SHOWN): string {
  if (previewResult(p) === null) return '';
  const ui = PREVIEWDETAIL_UI[lang];
  const rows = previewDiffRows(p, existing, lang);
  const button =
    canExport && rows.length > 0 ? `<div class="gl-actions"><button type="button" class="gl-btn" id="${PREVIEWDETAIL_EXPORT_ID}">${escapeHtml(ui.exportList)}</button></div>` : '';
  const summary = lang === 'fr' ? fixFrench(ui.summary) : ui.summary;
  return `<details class="gl-preview-detail"><summary>${escapeHtml(summary)}</summary><p class="gl-note">${escapeHtml(ui.intro)}</p>${renderDiff(rows, lang, limit)}${button}</details>`;
}
