import { fixFrench } from './frTypography';
import { gapRows, gapTotals } from './gaps';
import { glance, unknownPercent } from './glance';
import { licenceGroups } from './licenceRecords';
import type { Place } from './places';
import type { Lang } from './plainTerms';
import { recordAgeCounts } from './recordAges';
import { disagreementRows } from './recordDisagreements';
import { problemRows, problemTotals } from './recordProblems';
import { sourceNames } from './recordView';
import { escapeHtml } from './text';

/**
 * One summary of the records held, built from the same counts the other panels use: how many
 * records there are, how many can be reported, and how many need a look. Every line is a count
 * of the data. None of them rates a place, and a low count is not a statement about a place.
 */
export interface RecordsReport {
  readonly places: number;
  /** Records that say available or not available. */
  readonly held: number;
  /** Records among them that can be reported. */
  readonly usable: number;
  /** Records that cannot be reported at all. */
  readonly notUsable: number;
  /** Records with a problem in their source, licence, date or tier. */
  readonly problems: number;
  /** Features of places where usable records disagree. */
  readonly disagreements: number;
  /** Usable records more than a year old. */
  readonly older: number;
  readonly sources: number;
  /** Open licences in use among usable records. */
  readonly licences: number;
  /** Place and feature pairs with nothing to report. */
  readonly unknownPairs: number;
  /** The share of place and feature pairs that are unknown, as a whole percent. */
  readonly unknownPercent: number;
}

export function recordsReport(places: readonly Place[], today: string): RecordsReport {
  const licences = licenceGroups(places);
  const ages = recordAgeCounts(places, today);
  const g = glance(places);
  const usable = licences.groups.reduce((n, group) => n + group.usable, 0);
  return {
    places: places.length,
    held: licences.records,
    usable,
    notUsable: licences.records - usable,
    problems: problemTotals(problemRows(places, 'en', today)).rows,
    disagreements: disagreementRows(places, 'en').length,
    older: ages.aging + ages.old,
    sources: sourceNames(places).length,
    licences: licences.groups.filter((group) => group.open && group.usable > 0).length,
    unknownPairs: gapTotals(gapRows(places, [], 'en')).gaps,
    unknownPercent: unknownPercent(g),
  };
}

export const REPORT_KEYS = ['places', 'held', 'usable', 'notUsable', 'problems', 'disagreements', 'older', 'sources', 'licences', 'unknownPairs', 'unknownPercent'] as const;
export type ReportKey = (typeof REPORT_KEYS)[number];

export const REPORT_UI = {
  en: {
    heading: 'Summary of the records',
    intro: 'These are counts of the records held on this device. They do not rate any place.',
    caption: 'The records held, in numbers',
    what: 'What is counted',
    count: 'Count',
    labels: {
      places: 'Places',
      held: 'Records held',
      usable: 'Records that can be reported',
      notUsable: 'Records that cannot be reported',
      problems: 'Records with a problem to look at',
      disagreements: 'Features where sources disagree',
      older: 'Records more than a year old',
      sources: 'Sources',
      licences: 'Open licences in use',
      unknownPairs: 'Features with nothing to report, across the places',
      unknownPercent: 'Share of features that are unknown',
    },
    percent: (n: number): string => `${n} percent`,
    exportList: 'Save this summary as text',
    title: 'Summary of the records',
    made: (date: string): string => `Made on ${date}.`,
    line: (label: string, value: string): string => `${label}: ${value}`,
  },
  fr: {
    heading: 'Résumé des fiches',
    intro: 'Ce sont des comptes des fiches conservées sur cet appareil. Ils ne notent aucun lieu.',
    caption: 'Les fiches conservées, en chiffres',
    what: 'Ce qui est compté',
    count: 'Nombre',
    labels: {
      places: 'Lieux',
      held: 'Fiches conservées',
      usable: 'Fiches qui peuvent être signalées',
      notUsable: 'Fiches qui ne peuvent pas être signalées',
      problems: 'Fiches avec un problème à examiner',
      disagreements: 'Caractéristiques où les sources ne concordent pas',
      older: 'Fiches de plus d’un an',
      sources: 'Provenances',
      licences: 'Licences ouvertes utilisées',
      unknownPairs: 'Caractéristiques sans rien à signaler, dans l’ensemble des lieux',
      unknownPercent: 'Part des caractéristiques qui sont UNKNOWN',
    },
    percent: (n: number): string => `${n} pour cent`,
    exportList: 'Enregistrer ce résumé en texte',
    title: 'Résumé des fiches',
    made: (date: string): string => `Fait le ${date}.`,
    line: (label: string, value: string): string => `${label}\u00a0: ${value}`,
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

export const REPORT_EXPORT_ID = 'gl-report-export';
export const REPORT_MIME = 'text/plain;charset=utf-8';

export function reportFilename(lang: Lang): string {
  return `records-summary-${lang}.txt`;
}

/** The value of one line as text: a number, or "94 percent" for the share. */
export function reportValue(report: RecordsReport, key: ReportKey, lang: Lang): string {
  return key === 'unknownPercent' ? REPORT_UI[lang].percent(report.unknownPercent) : String(report[key]);
}

/** One "label: value" line for each count, in a fixed order. */
export function reportLines(report: RecordsReport, lang: Lang): readonly string[] {
  const ui = REPORT_UI[lang];
  return REPORT_KEYS.map((key) => fr(lang, ui.line(ui.labels[key], reportValue(report, key, lang))));
}

/** The summary as plain text. */
export function reportText(places: readonly Place[], lang: Lang, today: string): string {
  const ui = REPORT_UI[lang];
  return `${ui.title}\n${ui.made(today)}\n\n${ui.intro}\n\n${reportLines(recordsReport(places, today), lang).map((l) => `- ${l}`).join('\n')}\n`;
}

/** The panel: a two-column table of counts, with a row header for what is counted. */
export function renderReport(places: readonly Place[], lang: Lang, today: string, canExport: boolean): string {
  const ui = REPORT_UI[lang];
  const report = recordsReport(places, today);
  const body = REPORT_KEYS.map((key) => `<tr data-count="${key}"><th scope="row">${escapeHtml(ui.labels[key])}</th><td>${escapeHtml(reportValue(report, key, lang))}</td></tr>`).join('');
  const button = canExport ? `<div class="gl-actions"><button type="button" class="gl-btn" id="${REPORT_EXPORT_ID}">${escapeHtml(ui.exportList)}</button></div>` : '';
  return (
    `<p>${escapeHtml(ui.intro)}</p><div class="gl-compare-wrap" role="region" aria-label="${escapeHtml(ui.caption)}" tabindex="0">` +
    `<table class="gl-compare"><caption>${escapeHtml(ui.caption)}</caption><thead><tr><th scope="col">${escapeHtml(ui.what)}</th><th scope="col">${escapeHtml(ui.count)}</th></tr></thead><tbody>${body}</tbody></table></div>${button}`
  );
}
