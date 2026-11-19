import { fixFrench } from './frTypography';
import { lookupTerm } from './glossary';
import type { Place } from './places';
import { TERMS, type Lang } from './plainTerms';
import { effectiveTier, tierName, type SourceTier } from './sourceTier';
import { effectiveStatus, statusLabel } from './status';
import { escapeHtml } from './text';

/**
 * Features where the records that can be used do not agree: one source reports the feature as
 * available and another reports it as not available. Such a feature is reported as Unknown
 * everywhere else. This list shows both sides, each with its source, licence, date and tier, so
 * the person can see why. It never picks a side and never says which record is right.
 */
export interface SideRecord {
  readonly status: 'present' | 'absent';
  readonly source: string;
  readonly licence: string;
  readonly date: string;
  /** The tier that may be shown, or null. */
  readonly tier: SourceTier | null;
}

export interface DisagreementRow {
  readonly placeId: string;
  readonly name: string;
  /** Index of the place in the list that was given. Used in control ids. */
  readonly index: number;
  readonly termId: string;
  readonly feature: string;
  /** Every usable record about the feature, newest first. */
  readonly records: readonly SideRecord[];
  readonly present: number;
  readonly absent: number;
}

const ORDER: ReadonlyMap<string, number> = new Map(TERMS.map((t, i) => [t.id, i] as const));

/**
 * One row for each feature of each place where usable records disagree: places in the order
 * given, features in glossary order. Records that cannot be used take no part, so a record
 * without a source can never start a disagreement.
 */
export function disagreementRows(places: readonly Place[], lang: Lang): readonly DisagreementRow[] {
  const out: DisagreementRow[] = [];
  places.forEach((place, index) => {
    const byTerm = new Map<string, SideRecord[]>();
    for (const claim of place.claims) {
      const status = effectiveStatus(claim);
      if (status === 'unknown' || claim.provenance === undefined || !ORDER.has(claim.termId)) continue;
      const list = byTerm.get(claim.termId) ?? [];
      list.push({
        status,
        source: claim.provenance.source.trim(),
        licence: claim.provenance.licence.trim(),
        date: claim.provenance.date.trim(),
        tier: effectiveTier(claim.provenance),
      });
      byTerm.set(claim.termId, list);
    }
    const termIds = [...byTerm.keys()].sort((a, b) => (ORDER.get(a) ?? 0) - (ORDER.get(b) ?? 0));
    for (const termId of termIds) {
      const list = byTerm.get(termId) ?? [];
      const present = list.filter((r) => r.status === 'present').length;
      const absent = list.length - present;
      if (present === 0 || absent === 0) continue;
      const records = list
        .map((r, i) => ({ r, i }))
        .sort((a, b) => (a.r.date < b.r.date ? 1 : a.r.date > b.r.date ? -1 : a.i - b.i))
        .map((x) => x.r);
      out.push({ placeId: place.id, name: place.name, index, termId, feature: lookupTerm(termId, lang).term, records, present, absent });
    }
  });
  return out;
}

export interface DisagreementTotals {
  readonly rows: number;
  readonly places: number;
  readonly records: number;
}

export function disagreementTotals(rows: readonly DisagreementRow[]): DisagreementTotals {
  return { rows: rows.length, places: new Set(rows.map((r) => r.placeId)).size, records: rows.reduce((n, r) => n + r.records.length, 0) };
}

export const DISAGREE_UI = {
  en: {
    heading: 'Where sources disagree',
    intro: 'Here, one source reports a feature as available and another reports it as not available. We report these features as Unknown.',
    order: 'The newest record comes first. A newer record is not always the right one.',
    none: 'No sources disagree in the records.',
    count: (n: number): string => (n === 1 ? 'Sources disagree about 1 feature.' : `Sources disagree about ${n} features.`),
    inPlaces: (n: number): string => (n === 1 ? 'It is in 1 place.' : `They are in ${n} places.`),
    line: (place: string, feature: string): string => `${place}, ${feature}`,
    record: (reported: string, source: string, date: string): string => `${source}, dated ${date}: ${reported}.`,
    licence: (licence: string, tier: string): string => `Licence: ${licence}. ${tier}.`,
    more: (n: number): string => (n === 1 ? 'And 1 more.' : `And ${n} more.`),
    show: 'Show',
    showLabel: (name: string): string => `Show ${name} in the list`,
    exportList: 'Save this list as text',
    title: 'Where sources disagree',
    made: (date: string): string => `Made on ${date}.`,
  },
  fr: {
    heading: 'Là où les sources ne concordent pas',
    intro: 'Ici, une source signale une caractéristique comme disponible et une autre la signale comme non disponible. Nous signalons ces caractéristiques comme UNKNOWN.',
    order: 'La fiche la plus récente vient en premier. Une fiche plus récente n’est pas toujours la bonne.',
    none: 'Aucune source ne contredit une autre dans les fiches.',
    count: (n: number): string => (n === 1 ? 'Les sources ne concordent pas pour 1 caractéristique.' : `Les sources ne concordent pas pour ${n} caractéristiques.`),
    inPlaces: (n: number): string => (n === 1 ? 'Elle se trouve dans 1 lieu.' : `Elles se trouvent dans ${n} lieux.`),
    line: (place: string, feature: string): string => `${place}, ${feature}`,
    record: (reported: string, source: string, date: string): string => `${source}, date du ${date}\u00a0: ${reported}.`,
    licence: (licence: string, tier: string): string => `Licence\u00a0: ${licence}. ${tier}.`,
    more: (n: number): string => (n === 1 ? 'Et 1 de plus.' : `Et ${n} de plus.`),
    show: 'Afficher',
    showLabel: (name: string): string => `Afficher ${name} dans la liste`,
    exportList: 'Enregistrer cette liste en texte',
    title: 'Là où les sources ne concordent pas',
    made: (date: string): string => `Fait le ${date}.`,
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

/** "City open data, dated 2026-01-05: reported as available. Licence: OGL-Ontario-1.0. Tier 1." */
export function sideText(record: SideRecord, lang: Lang): string {
  const ui = DISAGREE_UI[lang];
  return fr(lang, `${ui.record(statusLabel(record.status, lang), record.source, record.date)} ${ui.licence(record.licence, tierName(record.tier, lang))}`);
}

export const MAX_DISAGREEMENTS_SHOWN = 30;
export const DISAGREE_EXPORT_ID = 'gl-disagree-export';
export const DISAGREE_MIME = 'text/plain;charset=utf-8';

export function disagreeShowId(index: number): string {
  return `gl-disshow-${index}`;
}

export function parseDisagreeShowId(id: string): number | null {
  const m = /^gl-disshow-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}

export function disagreementsFilename(lang: Lang): string {
  return `sources-disagree-${lang}.txt`;
}

function summaryText(rows: readonly DisagreementRow[], lang: Lang): string {
  const ui = DISAGREE_UI[lang];
  const totals = disagreementTotals(rows);
  return `${ui.count(totals.rows)} ${ui.inPlaces(totals.places)}`;
}

/** Every disagreement as plain text. Nothing is cut short in the file. */
export function disagreementsToText(rows: readonly DisagreementRow[], lang: Lang, today: string): string {
  const ui = DISAGREE_UI[lang];
  const head = `${ui.title}\n${ui.made(today)}\n`;
  if (rows.length === 0) return `${head}\n${ui.none}\n`;
  const body = rows.map((r) => `${ui.line(r.name, r.feature)}\n${r.records.map((s) => `- ${sideText(s, lang)}`).join('\n')}`).join('\n\n');
  return `${head}\n${ui.intro}\n${ui.order}\n${summaryText(rows, lang)}\n\n${body}\n`;
}

/** The panel: how many features have sources that disagree, then each one with both sides and a Show button for its place. */
export function renderDisagreements(rows: readonly DisagreementRow[], lang: Lang, canExport: boolean, limit = MAX_DISAGREEMENTS_SHOWN): string {
  const ui = DISAGREE_UI[lang];
  const intro = `<p>${escapeHtml(ui.intro)}</p>`;
  if (rows.length === 0) return `${intro}<p class="gl-note">${escapeHtml(ui.none)}</p>`;
  const shown = rows.slice(0, Math.max(0, limit));
  const seen = new Set<number>();
  const items = shown
    .map((r) => {
      // One Show button for each place, on its first row, so no id is used twice.
      const first = !seen.has(r.index);
      seen.add(r.index);
      const button = first
        ? ` <button type="button" class="gl-btn" id="${disagreeShowId(r.index)}" aria-label="${escapeHtml(fr(lang, ui.showLabel(r.name)))}">${escapeHtml(ui.show)}</button>`
        : '';
      const sides = r.records.map((s) => `<li data-status="${s.status}">${escapeHtml(sideText(s, lang))}</li>`).join('');
      return `<li><strong>${escapeHtml(ui.line(r.name, r.feature))}</strong>${button}<ul>${sides}</ul></li>`;
    })
    .join('');
  const more = rows.length > shown.length ? `<p class="gl-note">${escapeHtml(ui.more(rows.length - shown.length))}</p>` : '';
  const button = canExport ? `<div class="gl-actions"><button type="button" class="gl-btn" id="${DISAGREE_EXPORT_ID}">${escapeHtml(ui.exportList)}</button></div>` : '';
  return `${intro}<p class="gl-note">${escapeHtml(ui.order)}</p><p role="status">${escapeHtml(summaryText(rows, lang))}</p><ul class="gl-disagree">${items}</ul>${more}${button}`;
}
