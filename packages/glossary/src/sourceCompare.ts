import { fixFrench } from './frTypography';
import { lookupTerm } from './glossary';
import type { Place } from './places';
import { TERMS, type Lang } from './plainTerms';
import { placeRecords } from './recordSources';
import { sourceNames } from './recordView';
import { statusLabel } from './status';
import { escapeHtml } from './text';

/**
 * Two sources side by side: for each feature of each place that either source reports on, what
 * each one says and whether they agree. It shows where the sources differ. It never says which
 * source is right, and a feature where they differ stays unknown everywhere else.
 */
export type SideStatus = 'present' | 'absent' | 'mixed';
export type CompareOutcome = 'agree' | 'differ' | 'only-a' | 'only-b';

export interface SourceCompareRow {
  readonly placeId: string;
  readonly name: string;
  /** Index of the place in the list that was given. */
  readonly index: number;
  readonly termId: string;
  readonly feature: string;
  /** What the first source reports, or null when it has no usable record. "mixed" when its own records disagree. */
  readonly a: SideStatus | null;
  readonly b: SideStatus | null;
  readonly outcome: CompareOutcome;
}

export interface CompareCounts {
  /** Place and feature pairs both sources report on. */
  readonly both: number;
  readonly agree: number;
  readonly differ: number;
  readonly onlyA: number;
  readonly onlyB: number;
}

const ORDER: readonly string[] = TERMS.map((t) => t.id);

function side(statuses: readonly ('present' | 'absent')[]): SideStatus | null {
  const first = statuses[0];
  if (first === undefined) return null;
  return statuses.every((s) => s === first) ? first : 'mixed';
}

function outcomeOf(a: SideStatus | null, b: SideStatus | null): CompareOutcome {
  if (a === null) return 'only-b';
  if (b === null) return 'only-a';
  return a === b && a !== 'mixed' ? 'agree' : 'differ';
}

/** true when the two names are two different sources that are both named. */
export function canCompare(a: string, b: string): boolean {
  return a.trim() !== '' && b.trim() !== '' && a.trim() !== b.trim();
}

/**
 * One row for each place and feature that either source has a usable record for: places in the
 * order given, features in glossary order. Empty unless two different sources are named.
 */
export function compareSources(places: readonly Place[], a: string, b: string, lang: Lang): readonly SourceCompareRow[] {
  if (!canCompare(a, b)) return [];
  const nameA = a.trim();
  const nameB = b.trim();
  const out: SourceCompareRow[] = [];
  places.forEach((place, index) => {
    const usable = placeRecords(place, lang).filter((r) => r.status !== 'unknown' && (r.source === nameA || r.source === nameB));
    for (const termId of ORDER) {
      const rows = usable.filter((r) => r.termId === termId);
      if (rows.length === 0) continue;
      const statuses = (name: string): ('present' | 'absent')[] => rows.filter((r) => r.source === name).map((r) => (r.status === 'present' ? 'present' : 'absent'));
      const sideA = side(statuses(nameA));
      const sideB = side(statuses(nameB));
      out.push({ placeId: place.id, name: place.name, index, termId, feature: lookupTerm(termId, lang).term, a: sideA, b: sideB, outcome: outcomeOf(sideA, sideB) });
    }
  });
  return out;
}

export function compareCounts(rows: readonly SourceCompareRow[]): CompareCounts {
  const n = (o: CompareOutcome): number => rows.filter((r) => r.outcome === o).length;
  const agree = n('agree');
  const differ = n('differ');
  return { both: agree + differ, agree, differ, onlyA: n('only-a'), onlyB: n('only-b') };
}

/** The source a list's value stands for: values are positions in the list of names. '' for anything else. */
export function compareSourceFromValue(places: readonly Place[], value: string): string {
  if (!/^\d{1,4}$/.test(value)) return '';
  return sourceNames(places)[Number(value)] ?? '';
}

export const SOURCECOMPARE_UI = {
  en: {
    heading: 'Compare two sources',
    labelA: 'First source',
    labelB: 'Second source',
    choose: 'Choose a source',
    prompt: 'Choose two different sources to see where they agree and where they differ.',
    fewSources: 'You need records from two sources to compare them.',
    both: (n: number): string => (n === 1 ? 'Both sources report on the same feature in 1 case.' : `Both sources report on the same feature in ${n} cases.`),
    agree: (n: number): string => (n === 1 ? 'They agree in 1 case.' : `They agree in ${n} cases.`),
    differ: (n: number): string => (n === 1 ? 'They differ in 1 case.' : `They differ in ${n} cases.`),
    only: (source: string, n: number): string => (n === 1 ? `1 feature is reported only by ${source}.` : `${n} features are reported only by ${source}.`),
    note: 'Where two sources differ, the feature is reported as Unknown. This table does not say which source is right.',
    caption: (a: string, b: string): string => `Where these two sources agree and differ: ${a}, ${b}`,
    place: 'Place',
    feature: 'Feature',
    result: 'Result',
    outcomes: { agree: 'They agree', differ: 'They differ', 'only-a': 'Only the first source', 'only-b': 'Only the second source' },
    mixed: 'gives both answers',
    nothing: 'no record',
    exportList: 'Save this table as text',
    title: (a: string, b: string): string => `Two sources compared: ${a}, ${b}`,
    made: (date: string): string => `Made on ${date}.`,
    line: (place: string, feature: string, outcome: string): string => `${place}, ${feature}: ${outcome}.`,
    sides: (a: string, sideA: string, b: string, sideB: string): string => `${a}: ${sideA}. ${b}: ${sideB}.`,
  },
  fr: {
    heading: 'Comparer deux sources',
    labelA: 'Première source',
    labelB: 'Deuxième source',
    choose: 'Choisissez une source',
    prompt: 'Choisissez deux sources différentes pour voir où elles concordent et où elles diffèrent.',
    fewSources: 'Il faut des fiches de deux sources pour les comparer.',
    both: (n: number): string => (n === 1 ? 'Les deux sources parlent de la même caractéristique dans 1 cas.' : `Les deux sources parlent de la même caractéristique dans ${n} cas.`),
    agree: (n: number): string => (n === 1 ? 'Elles concordent dans 1 cas.' : `Elles concordent dans ${n} cas.`),
    differ: (n: number): string => (n === 1 ? 'Elles diffèrent dans 1 cas.' : `Elles diffèrent dans ${n} cas.`),
    only: (source: string, n: number): string => (n === 1 ? `1 caractéristique est signalée seulement par ${source}.` : `${n} caractéristiques sont signalées seulement par ${source}.`),
    note: 'Là où deux sources diffèrent, la caractéristique est signalée comme UNKNOWN. Ce tableau ne dit pas quelle source a raison.',
    caption: (a: string, b: string): string => `Où ces deux sources concordent et diffèrent\u00a0: ${a}, ${b}`,
    place: 'Lieu',
    feature: 'Caractéristique',
    result: 'Résultat',
    outcomes: { agree: 'Elles concordent', differ: 'Elles diffèrent', 'only-a': 'Seulement la première source', 'only-b': 'Seulement la deuxième source' },
    mixed: 'donne les deux réponses',
    nothing: 'aucune fiche',
    exportList: 'Enregistrer ce tableau en texte',
    title: (a: string, b: string): string => `Deux sources comparées\u00a0: ${a}, ${b}`,
    made: (date: string): string => `Fait le ${date}.`,
    line: (place: string, feature: string, outcome: string): string => `${place}, ${feature}\u00a0: ${outcome}.`,
    sides: (a: string, sideA: string, b: string, sideB: string): string => `${a}\u00a0: ${sideA}. ${b}\u00a0: ${sideB}.`,
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

export const SOURCECOMPARE_IDS = { a: 'gl-sca', b: 'gl-scb', export: 'gl-sc-export' } as const;
export const SOURCECOMPARE_MIME = 'text/plain;charset=utf-8';

export function sourceCompareFilename(lang: Lang): string {
  return `two-sources-${lang}.txt`;
}

/** "reported as available", "gives both answers" or "no record". */
export function sideLabel(status: SideStatus | null, lang: Lang): string {
  const ui = SOURCECOMPARE_UI[lang];
  if (status === null) return ui.nothing;
  return status === 'mixed' ? ui.mixed : statusLabel(status, lang);
}

/** The counts as sentences. Kinds with a count of zero are left out, except the first. */
export function compareSummary(counts: CompareCounts, a: string, b: string, lang: Lang): readonly string[] {
  const ui = SOURCECOMPARE_UI[lang];
  return [
    ui.both(counts.both),
    ...(counts.agree > 0 ? [ui.agree(counts.agree)] : []),
    ...(counts.differ > 0 ? [ui.differ(counts.differ)] : []),
    ...(counts.onlyA > 0 ? [ui.only(a.trim(), counts.onlyA)] : []),
    ...(counts.onlyB > 0 ? [ui.only(b.trim(), counts.onlyB)] : []),
  ];
}

/** "Hall, Ramp: They differ. City open data: reported as available. Transit agency: reported as not available." */
export function compareRowText(row: SourceCompareRow, a: string, b: string, lang: Lang): string {
  const ui = SOURCECOMPARE_UI[lang];
  return fr(lang, `${ui.line(row.name, row.feature, ui.outcomes[row.outcome])} ${ui.sides(a.trim(), sideLabel(row.a, lang), b.trim(), sideLabel(row.b, lang))}`);
}

/** The comparison as plain text. Empty string unless two different sources with usable records are named. */
export function sourceCompareText(places: readonly Place[], a: string, b: string, lang: Lang, today: string): string {
  const rows = compareSources(places, a, b, lang);
  if (rows.length === 0) return '';
  const ui = SOURCECOMPARE_UI[lang];
  const summary = compareSummary(compareCounts(rows), a, b, lang).join('\n');
  return `${fr(lang, ui.title(a.trim(), b.trim()))}\n${ui.made(today)}\n\n${summary}\n${ui.note}\n\n${rows.map((r) => `- ${compareRowText(r, a, b, lang)}`).join('\n')}\n`;
}

/** The counts and the table for the two chosen sources, or a prompt. */
export function renderCompareTable(places: readonly Place[], a: string, b: string, lang: Lang, canExport: boolean): string {
  const ui = SOURCECOMPARE_UI[lang];
  const names = sourceNames(places);
  if (names.length < 2) return `<p class="gl-note">${escapeHtml(ui.fewSources)}</p>`;
  const rows = names.includes(a.trim()) && names.includes(b.trim()) ? compareSources(places, a, b, lang) : [];
  if (rows.length === 0) return `<p class="gl-note">${escapeHtml(ui.prompt)}</p>`;
  const caption = fr(lang, ui.caption(a.trim(), b.trim()));
  const summary = compareSummary(compareCounts(rows), a, b, lang).map((s) => escapeHtml(s)).join(' ');
  const cell = (status: SideStatus | null): string => `<td data-side="${status ?? 'none'}">${escapeHtml(sideLabel(status, lang))}</td>`;
  const body = rows
    .map((r) => `<tr data-outcome="${r.outcome}"><th scope="row">${escapeHtml(r.name)}</th><td>${escapeHtml(r.feature)}</td>${cell(r.a)}${cell(r.b)}<td>${escapeHtml(ui.outcomes[r.outcome])}</td></tr>`)
    .join('');
  const heads = [ui.place, ui.feature, a.trim(), b.trim(), ui.result].map((h) => `<th scope="col">${escapeHtml(h)}</th>`).join('');
  const button = canExport ? `<div class="gl-actions"><button type="button" class="gl-btn" id="${SOURCECOMPARE_IDS.export}">${escapeHtml(ui.exportList)}</button></div>` : '';
  return (
    `<p role="status">${summary}</p><p class="gl-note">${escapeHtml(ui.note)}</p>` +
    `<div class="gl-compare-wrap" role="region" aria-label="${escapeHtml(caption)}" tabindex="0">` +
    `<table class="gl-compare"><caption>${escapeHtml(caption)}</caption><thead><tr>${heads}</tr></thead><tbody>${body}</tbody></table></div>${button}`
  );
}

/** Two labelled lists of sources and a region the finder fills with the comparison. */
export function renderSourceCompare(places: readonly Place[], a: string, b: string, lang: Lang, canExport: boolean): string {
  const ui = SOURCECOMPARE_UI[lang];
  const names = sourceNames(places);
  const list = (id: string, label: string, chosen: string): string => {
    const at = names.indexOf(chosen.trim());
    const options =
      `<option value=""${at === -1 ? ' selected' : ''}>${escapeHtml(ui.choose)}</option>` +
      names.map((n, i) => `<option value="${i}"${i === at ? ' selected' : ''}>${escapeHtml(n)}</option>`).join('');
    return `<label for="${id}">${escapeHtml(label)}</label><select id="${id}" class="gl-select">${options}</select>`;
  };
  return `${list(SOURCECOMPARE_IDS.a, ui.labelA, a)}${list(SOURCECOMPARE_IDS.b, ui.labelB, b)}<div data-gl-sc>${renderCompareTable(places, a, b, lang, canExport)}</div>`;
}
