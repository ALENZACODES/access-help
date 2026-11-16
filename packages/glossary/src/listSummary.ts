import { fixFrench } from './frTypography';
import { lookupTerm } from './glossary';
import type { Place } from './places';
import { formatProvenance, type Provenance } from './provenance';
import type { Lang } from './plainTerms';
import type { PlaceList } from './savedLists';
import { mergeClaims, statusLabel, type FeatureStatus } from './status';
import { escapeHtml } from './text';
import type { ExportFile } from './textExport';
import { TEXT_MIME } from './textExport';

/**
 * What the sources report across the places on one list, feature by feature: how many are reported as
 * available, how many as not available, and how many are unknown. It only counts what each place's
 * sources say. It does not rate the list, and unknown stays unknown.
 */
export interface FeatureTally {
  readonly termId: string;
  readonly present: number;
  readonly absent: number;
  readonly unknown: number;
}

export interface ListSummary {
  /** Places on the list that are loaded now. */
  readonly places: number;
  readonly rows: readonly FeatureTally[];
}

export const LISTSUM_UI = {
  en: {
    summary: 'What the sources report for this list',
    none: 'Choose features to see what the sources report for this list.',
    empty: 'Add places to see what the sources report.',
    row: (term: string, parts: string): string => `${term}: ${parts}`,
    count: (n: number, label: string): string => `${n} ${label}`,
    exportList: 'Copy list as text',
    exportLabel: (list: string): string => `Copy the list ${list} as text`,
    titleOf: (list: string, n: number): string => `${list} (${n})`,
  },
  fr: {
    summary: 'Ce que les sources indiquent pour cette liste',
    none: 'Choisissez des caractéristiques pour voir ce que les sources indiquent pour cette liste.',
    empty: 'Ajoutez des lieux pour voir ce que les sources indiquent.',
    row: (term: string, parts: string): string => `${term}\u00a0: ${parts}`,
    count: (n: number, label: string): string => `${n} ${label}`,
    exportList: 'Copier la liste en texte',
    exportLabel: (list: string): string => `Copier la liste ${list} en texte`,
    titleOf: (list: string, n: number): string => `${list} (${n})`,
  },
} as const;

const ORDER: readonly FeatureStatus[] = ['present', 'absent', 'unknown'];

/** Tally of each chosen feature over the list's loaded places. Ids that are not loaded are skipped. */
export function summariseList(list: PlaceList, places: readonly Place[], termIds: readonly string[]): ListSummary {
  const byId = new Map(places.map((p) => [p.id, p] as const));
  const members = list.ids.flatMap((id) => {
    const p = byId.get(id);
    return p === undefined ? [] : [p];
  });
  const rows = termIds.map((termId): FeatureTally => {
    const tally = { present: 0, absent: 0, unknown: 0 };
    for (const p of members) {
      const merged = mergeClaims([termId], p.claims)[0];
      tally[merged === undefined ? 'unknown' : merged.status] += 1;
    }
    return { termId, ...tally };
  });
  return { places: members.length, rows };
}

/** "2 reported as available, 1 unknown": counts of zero are left out. */
export function tallyText(row: FeatureTally, lang: Lang): string {
  const ui = LISTSUM_UI[lang];
  const parts = ORDER.filter((s) => row[s] > 0).map((s) => ui.count(row[s], statusLabel(s, lang)));
  return parts.join(', ');
}

export function rowText(row: FeatureTally, lang: Lang): string {
  const text = LISTSUM_UI[lang].row(lookupTerm(row.termId, lang).term, tallyText(row, lang));
  return lang === 'fr' ? fixFrench(text) : text;
}

/** A fold-away block of one line per chosen feature, or a short note when there is nothing to show. */
export function renderListSummary(summary: ListSummary, lang: Lang): string {
  const ui = LISTSUM_UI[lang];
  let inner: string;
  if (summary.places === 0) inner = `<p class="gl-note">${escapeHtml(ui.empty)}</p>`;
  else if (summary.rows.length === 0) inner = `<p class="gl-note">${escapeHtml(ui.none)}</p>`;
  else inner = `<ul>${summary.rows.map((r) => `<li>${escapeHtml(rowText(r, lang))}</li>`).join('')}</ul>`;
  return `<details class="gl-listsum"><summary>${escapeHtml(ui.summary)}</summary>${inner}</details>`;
}

export function exportListId(list: number): string {
  return `gl-lexp-${list}`;
}

export function parseExportListId(id: string): number | null {
  const m = /^gl-lexp-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}

export function exportListButton(list: number, name: string, lang: Lang): string {
  const ui = LISTSUM_UI[lang];
  const label = ui.exportLabel(name);
  return `<button type="button" class="gl-btn" id="${exportListId(list)}" aria-label="${escapeHtml(lang === 'fr' ? fixFrench(label) : label)}">${escapeHtml(ui.exportList)}</button>`;
}

/** The list as plain text: its name and count, each place, then the tally for the chosen features and the data source. */
export function listToText(list: PlaceList, places: readonly Place[], termIds: readonly string[], lang: Lang, provenance: Provenance | null = null): string {
  const summary = summariseList(list, places, termIds);
  const byId = new Map(places.map((p) => [p.id, p] as const));
  const names = list.ids.flatMap((id) => {
    const p = byId.get(id);
    return p === undefined ? [] : [p.name];
  });
  const lines: string[] = [LISTSUM_UI[lang].titleOf(list.name, names.length), '', ...names.map((n) => `- ${n}`)];
  if (summary.places > 0 && summary.rows.length > 0) lines.push('', LISTSUM_UI[lang].summary, ...summary.rows.map((r) => rowText(r, lang)));
  if (provenance !== null) lines.push('', formatProvenance(provenance, lang));
  const text = lines.join('\n') + '\n';
  return lang === 'fr' ? fixFrench(text) : text;
}

export function listFilename(list: PlaceList, lang: Lang): string {
  const slug = list.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'list';
  return `list-${slug}-${lang}.txt`;
}

export function listToFile(list: PlaceList, places: readonly Place[], termIds: readonly string[], lang: Lang, provenance: Provenance | null = null): ExportFile {
  return { text: listToText(list, places, termIds, lang, provenance), filename: listFilename(list, lang), mime: TEXT_MIME };
}
