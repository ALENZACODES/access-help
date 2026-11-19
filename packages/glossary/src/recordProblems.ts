import { fixFrench } from './frTypography';
import { lookupTerm } from './glossary';
import type { Place } from './places';
import { TERMS, type Lang } from './plainTerms';
import { validateProvenance, type ProvenanceIssue } from './provenance';
import { tierProblem, type TierProblem } from './sourceTier';
import { effectiveStatus } from './status';
import { escapeHtml } from './text';

/**
 * Records that say a feature is available or not available, but that have something wrong with
 * their source, licence, date or tier. It lists problems in the data. It never says anything about
 * a place: a record that cannot be used is shown as Unknown everywhere else.
 */
export type RecordReason = 'no-source' | ProvenanceIssue | TierProblem;

/** The order reasons are listed in: what stops the record being used first. */
export const REASON_ORDER: readonly RecordReason[] = [
  'no-source', 'source-missing', 'licence-not-open', 'date-invalid', 'date-in-future', 'url-invalid', 'tier-missing', 'tier-not-known', 'tier-needs-evidence',
];

export interface ProblemRow {
  readonly placeId: string;
  readonly name: string;
  /** Index of the place in the list that was given. Used in control ids. */
  readonly index: number;
  readonly termId: string;
  readonly feature: string;
  readonly reasons: readonly RecordReason[];
  /** false when the record cannot be reported at all (it is shown as Unknown). */
  readonly usable: boolean;
}

const KNOWN: ReadonlySet<string> = new Set(TERMS.map((t) => t.id));

/**
 * One row for each record with a problem, in the order of the places and their records. Records
 * that say "unknown" are skipped: they claim nothing, so there is nothing to source.
 */
export function problemRows(places: readonly Place[], lang: Lang, today: string): readonly ProblemRow[] {
  const out: ProblemRow[] = [];
  places.forEach((place, index) => {
    for (const claim of place.claims) {
      if (claim.status === 'unknown' || !KNOWN.has(claim.termId)) continue;
      const found = new Set<RecordReason>();
      if (claim.provenance === undefined) found.add('no-source');
      else {
        for (const issue of validateProvenance(claim.provenance, today)) found.add(issue);
        const tier = tierProblem(claim.provenance);
        if (tier !== null) found.add(tier);
      }
      if (found.size === 0) continue;
      out.push({
        placeId: place.id,
        name: place.name,
        index,
        termId: claim.termId,
        feature: lookupTerm(claim.termId, lang).term,
        reasons: REASON_ORDER.filter((r) => found.has(r)),
        usable: effectiveStatus(claim) !== 'unknown',
      });
    }
  });
  return out;
}

export interface ProblemTotals {
  readonly rows: number;
  /** Records that cannot be reported at all. */
  readonly notUsable: number;
  readonly places: number;
  readonly byReason: Readonly<Record<RecordReason, number>>;
}

export function problemTotals(rows: readonly ProblemRow[]): ProblemTotals {
  const byReason = Object.fromEntries(REASON_ORDER.map((r) => [r, 0])) as Record<RecordReason, number>;
  for (const row of rows) for (const reason of row.reasons) byReason[reason] += 1;
  return { rows: rows.length, notUsable: rows.filter((r) => !r.usable).length, places: new Set(rows.map((r) => r.placeId)).size, byReason };
}

export const PROBLEMS_UI = {
  en: {
    heading: 'Records to look at',
    intro: 'These records have a problem with their source, licence, date or tier. This is about the data, not the places.',
    none: 'Nothing to look at in the records.',
    count: (n: number): string => (n === 1 ? '1 record has a problem.' : `${n} records have a problem.`),
    notUsable: (n: number): string => (n === 1 ? '1 of them cannot be used. It is shown as unknown.' : `${n} of them cannot be used. They are shown as unknown.`),
    line: (place: string, feature: string): string => `${place}, ${feature}`,
    more: (n: number): string => (n === 1 ? 'And 1 more.' : `And ${n} more.`),
    show: 'Show',
    showLabel: (name: string): string => `Show ${name} in the list`,
    exportProblems: 'Save this list as text',
    title: 'Records to look at',
    made: (date: string): string => `Made on ${date}.`,
    reasons: {
      'no-source': 'No source is given.',
      'source-missing': 'The source has no name.',
      'licence-not-open': 'The licence is not an open licence we accept.',
      'date-invalid': 'The date is missing or is not a real date.',
      'date-in-future': 'The date is in the future.',
      'url-invalid': 'The link is not a secure web address.',
      'tier-missing': 'No tier is given.',
      'tier-not-known': 'The tier is not one we know.',
      'tier-needs-evidence': 'The tier needs evidence that this version does not hold.',
    },
  },
  fr: {
    heading: 'Fiches à examiner',
    intro: 'Ces fiches ont un problème de provenance, de licence, de date ou de niveau. Cela concerne les données, pas les lieux.',
    none: 'Rien à examiner dans les fiches.',
    count: (n: number): string => (n === 1 ? '1 fiche a un problème.' : `${n} fiches ont un problème.`),
    notUsable: (n: number): string => (n === 1 ? '1 d’entre elles ne peut pas être utilisée. Elle est affichée comme inconnue.' : `${n} d’entre elles ne peuvent pas être utilisées. Elles sont affichées comme inconnues.`),
    line: (place: string, feature: string): string => `${place}, ${feature}`,
    more: (n: number): string => (n === 1 ? 'Et 1 de plus.' : `Et ${n} de plus.`),
    show: 'Afficher',
    showLabel: (name: string): string => `Afficher ${name} dans la liste`,
    exportProblems: 'Enregistrer cette liste en texte',
    title: 'Fiches à examiner',
    made: (date: string): string => `Fait le ${date}.`,
    reasons: {
      'no-source': 'Aucune provenance n’est donnée.',
      'source-missing': 'La provenance n’a pas de nom.',
      'licence-not-open': 'La licence n’est pas une licence ouverte que nous acceptons.',
      'date-invalid': 'La date manque ou n’est pas une vraie date.',
      'date-in-future': 'La date est dans le futur.',
      'url-invalid': 'Le lien n’est pas une adresse Web sécurisée.',
      'tier-missing': 'Aucun niveau n’est donné.',
      'tier-not-known': 'Le niveau n’est pas un niveau que nous connaissons.',
      'tier-needs-evidence': 'Le niveau demande des preuves que cette version ne possède pas.',
    },
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

/** "Library, Ramp: No source is given. No tier is given." */
export function problemText(row: ProblemRow, lang: Lang): string {
  const ui = PROBLEMS_UI[lang];
  const head = ui.line(row.name, row.feature);
  const text = `${head}${lang === 'fr' ? '\u00a0:' : ':'} ${row.reasons.map((r) => ui.reasons[r]).join(' ')}`;
  return fr(lang, text);
}

export const MAX_PROBLEMS_SHOWN = 30;
export const PROBLEMS_EXPORT_ID = 'gl-problems-export';
export const PROBLEMS_MIME = 'text/plain;charset=utf-8';

export function parseProblemShowId(id: string): number | null {
  const m = /^gl-pshow-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}

export function problemsFilename(lang: Lang): string {
  return `records-to-look-at-${lang}.txt`;
}

/** Every problem as plain text. Nothing is cut short in the file. */
export function problemsToText(rows: readonly ProblemRow[], lang: Lang, today: string): string {
  const ui = PROBLEMS_UI[lang];
  const head = `${ui.title}\n${ui.made(today)}\n`;
  if (rows.length === 0) return `${head}\n${ui.none}\n`;
  const totals = problemTotals(rows);
  const summary = [ui.count(totals.rows), ...(totals.notUsable > 0 ? [ui.notUsable(totals.notUsable)] : [])].join(' ');
  return `${head}\n${summary}\n\n${rows.map((r) => `- ${problemText(r, lang)}`).join('\n')}\n`;
}

/** The panel: how many records have a problem, then each one with its reasons and a Show button for its place. */
export function renderProblems(rows: readonly ProblemRow[], lang: Lang, canExport: boolean, limit = MAX_PROBLEMS_SHOWN): string {
  const ui = PROBLEMS_UI[lang];
  const intro = `<p>${escapeHtml(ui.intro)}</p>`;
  if (rows.length === 0) return `${intro}<p class="gl-note">${escapeHtml(ui.none)}</p>`;
  const totals = problemTotals(rows);
  const shown = rows.slice(0, Math.max(0, limit));
  const seen = new Set<number>();
  const items = shown
    .map((r) => {
      // One Show button for each place, on its first row, so no id is used twice.
      const first = !seen.has(r.index);
      seen.add(r.index);
      const button = first
        ? ` <button type="button" class="gl-btn" id="gl-pshow-${r.index}" aria-label="${escapeHtml(fr(lang, ui.showLabel(r.name)))}">${escapeHtml(ui.show)}</button>`
        : '';
      return `<li data-usable="${r.usable ? 'yes' : 'no'}">${escapeHtml(problemText(r, lang))}${button}</li>`;
    })
    .join('');
  const more = rows.length > shown.length ? `<p class="gl-note">${escapeHtml(ui.more(rows.length - shown.length))}</p>` : '';
  const unusable = totals.notUsable > 0 ? ` ${escapeHtml(ui.notUsable(totals.notUsable))}` : '';
  const button = canExport ? `<div class="gl-actions"><button type="button" class="gl-btn" id="${PROBLEMS_EXPORT_ID}">${escapeHtml(ui.exportProblems)}</button></div>` : '';
  return `${intro}<p role="status">${escapeHtml(ui.count(totals.rows))}${unusable}</p><ul class="gl-problems">${items}</ul>${more}${button}`;
}
