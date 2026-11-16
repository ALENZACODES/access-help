import { auditCss } from './auditCss';
import { COVERAGE_UI } from './coverage';
import { FINDER_UI } from './finderText';
import { renderFinderShell } from './finderRender';
import { PREFS_UI, prefsCss, renderPrefsPanel } from './prefs';
import { EMPTY_STATE } from './filters';
import { renderComparison } from './compare';
import { auditHtml } from './auditHtml';
import { auditTerms } from './auditTerms';
import { finding, type Finding } from './auditTypes';
import { lintCopy } from './copyRules';
import { frenchIssues } from './frTypography';
import { CONNECTION_STRINGS } from './offlineCache';
import { buildIndex } from './offlineIndex';
import { plainLanguageIssues } from './plainLanguage';
import { PLACE_UI, renderPlaceList } from './placeRender';
import { matchPlace, rankPlaces, verdictText, summarisePlace, type Place, type Verdict } from './places';
import { isIsoDate, isOpenLicence } from './provenance';
import { UI, renderShell } from './render';
import type { FeatureClaim } from './status';
import { GLOSSARY_META, TERMS, UNKNOWN_TERM, type Lang } from './plainTerms';
import { fullGlossaryCss } from './theme';

export interface AuditReport {
  readonly findings: readonly Finding[];
  readonly errors: number;
  readonly warnings: number;
}

export const REPO_LICENCE = 'Same as this repository';
const LANGS: readonly Lang[] = ['en', 'fr'];

function decodeEntities(s: string): string {
  return s
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** Text a person reads: tags removed, entities decoded. Spaces are kept exactly as written. */
export function visibleText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ''));
}

/** Same, but each tag becomes a space so words in neighbouring elements stay separate. */
export function spacedText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' '));
}

/** Markup checks plus wording rules, and French typography when `lang` is fr. */
export function auditMarkup(name: string, html: string, lang: Lang): readonly Finding[] {
  const out: Finding[] = [...auditHtml(html, name)];
  for (const v of lintCopy(spacedText(html))) out.push(finding('copy-rule', name, `${v.rule}: "${v.match}"`));
  if (lang === 'fr') {
    for (const i of frenchIssues(visibleText(html))) out.push(finding('french-typography', name, i));
  }
  return out;
}

export function makeReport(findings: readonly Finding[]): AuditReport {
  return {
    findings,
    errors: findings.filter((f) => f.severity === 'error').length,
    warnings: findings.filter((f) => f.severity === 'warning').length,
  };
}

/** Every user-facing string this package can produce, by language, for wording checks. */
export function collectUserStrings(lang: Lang): readonly { readonly where: string; readonly text: string }[] {
  const ui = UI[lang];
  const place: Place = { id: 'x', name: 'Example', claims: [] };
  const verdicts: Verdict[] = ['all-reported', 'some-not-available', 'incomplete', 'no-requirements'];
  const strings: { where: string; text: string }[] = [
    { where: 'ui.title', text: ui.title },
    { where: 'ui.searchLabel', text: ui.searchLabel },
    { where: 'ui.none', text: ui.none },
    { where: 'ui.one', text: ui.one },
    { where: 'ui.many', text: ui.many(7) },
    { where: 'place.heading', text: PLACE_UI[lang].heading },
    { where: 'place.none', text: PLACE_UI[lang].none },
    { where: 'place.features', text: PLACE_UI[lang].features },
    { where: 'connection', text: CONNECTION_STRINGS[lang] },
    ...(['title', 'featuresLegend', 'featuresHint', 'searchLabel', 'hideLabel', 'clear', 'compare', 'compareTitle', 'pickTwo', 'none', 'one', 'dataHeading', 'noData', 'sortLabel', 'sortBest', 'sortName', 'sortNewest', 'recentLabel', 'savedLabel', 'save', 'more', 'exportSaved', 'copyCompare', 'suggestLabel'] as const).map(
      (k) => ({ where: `finder.${k}`, text: FINDER_UI[lang][k] }),
    ),
    { where: 'finder.many', text: FINDER_UI[lang].many(7) },
    ...(Object.keys(COVERAGE_UI[lang]) as (keyof (typeof COVERAGE_UI)[Lang])[]).map((k) => ({ where: `coverage.${k}`, text: COVERAGE_UI[lang][k] })),
    ...(Object.keys(PREFS_UI[lang]) as (keyof (typeof PREFS_UI)[Lang])[]).map((k) => ({ where: `prefs.${k}`, text: PREFS_UI[lang][k] })),
    { where: 'finder.saveLabel', text: FINDER_UI[lang].saveLabel('Example place') },
    { where: 'finder.partial', text: FINDER_UI[lang].partial(25, 40) },
    { where: 'finder.compareLabel', text: FINDER_UI[lang].compareLabel('Example place') },
    { where: 'summary', text: summarisePlace(place, lang) },
  ];
  for (const v of verdicts) {
    for (const n of [1, 3]) {
      const reqs = ['ramp', 'elevator', 'grab-bar'].slice(0, n);
      const m = matchPlace(
        v === 'all-reported'
          ? { ...place, claims: reqs.map((id): FeatureClaim => ({ termId: id, status: 'present', provenance: SAMPLE_PROV })) }
          : v === 'some-not-available'
            ? { ...place, claims: reqs.map((id): FeatureClaim => ({ termId: id, status: 'absent', provenance: SAMPLE_PROV })) }
            : place,
        v === 'no-requirements' ? [] : reqs,
      );
      strings.push({ where: `verdict.${v}.${n}`, text: verdictText(m, lang) });
    }
  }
  return strings;
}

const SAMPLE_PROV = { source: 'Example source', licence: 'CC0-1.0', date: '2026-01-01' } as const;

/** Markup for both languages, built from the real renderers with a tiny in-code example. */
export function sampleMarkup(lang: Lang): readonly { readonly name: string; readonly html: string }[] {
  const claims: FeatureClaim[] = [{ termId: 'ramp', status: 'present', provenance: SAMPLE_PROV }];
  const places: Place[] = [
    { id: 'a', name: 'Example place A', claims },
    { id: 'b', name: 'Example place B', claims: [{ termId: 'ramp', status: 'absent', provenance: SAMPLE_PROV }] },
  ];
  const manyPlaces: Place[] = Array.from({ length: 30 }, (_, i) => ({
    id: `p${i}`,
    name: `Example place ${i}`,
    claims: [{ termId: 'ramp', status: i % 2 === 0 ? 'present' : 'absent', provenance: SAMPLE_PROV } as FeatureClaim],
  }));
  const ranked = rankPlaces(places, ['ramp', 'elevator'], lang);
  const index = buildIndex(lang);
  return [
    { name: `shell.${lang}`, html: renderShell({ lang, index, claims }) },
    { name: `shell-offline.${lang}`, html: renderShell({ lang, index, claims, offline: true, query: 'door' }) },
    { name: `places.${lang}`, html: renderPlaceList(ranked, lang, '2026-11-15') },
    {
      name: `finder.${lang}`,
      html: renderFinderShell({ lang, state: EMPTY_STATE, places, today: '2026-11-15', selected: [0, 1] }),
    },
    {
      name: `finder-filtered.${lang}`,
      html: renderFinderShell({
        lang,
        state: { features: ['ramp', 'elevator'], query: 'example', hideNotAvailable: true },
        places,
        today: '2026-11-15',
        offline: true,
        selected: [1],
      }),
    },
    {
      name: `finder-large.${lang}`,
      html: renderFinderShell({
        lang,
        state: { features: ['ramp'], query: 'ramp', hideNotAvailable: false },
        places: manyPlaces,
        today: '2026-11-15',
        selected: [0, 1],
        saved: ['p0', 'p3'],
        limit: 10,
        canExport: true,
        view: { sort: 'newest', recentOnly: true, savedOnly: false },
        prefs: { textScale: 150, wideSpacing: true, highContrast: true, reduceMotion: true },
      }),
    },
    { name: `prefs-panel.${lang}`, html: renderPrefsPanel({ textScale: 125, wideSpacing: false, highContrast: false, reduceMotion: true }, lang) },
    { name: `comparison.${lang}`, html: `<div lang="${lang}">${renderComparison(places[0] as Place, places[1] as Place, [], lang)}</div>` },
  ];
}

/** Audits everything the package ships. Add `extra` findings from the app to include them. */
export function runAudit(extra: readonly Finding[] = []): AuditReport {
  const out: Finding[] = [...extra];
  out.push(...auditTerms([...TERMS, UNKNOWN_TERM]));
  out.push(...auditCss(fullGlossaryCss(), 'glossary-css'));
  out.push(...auditCss(fullGlossaryCss() + prefsCss({ textScale: 200, wideSpacing: true, highContrast: true, reduceMotion: true }), 'glossary-css-with-display-settings'));

  for (const lang of LANGS) {
    for (const { name, html } of sampleMarkup(lang)) out.push(...auditMarkup(name, html, lang));
    for (const { where, text } of collectUserStrings(lang)) {
      for (const v of lintCopy(text)) out.push(finding('copy-rule', `${where} [${lang}]`, `${v.rule}: "${v.match}"`));
      for (const i of plainLanguageIssues(text)) out.push(finding('plain-language', `${where} [${lang}]`, i.rule));
      if (lang === 'fr') for (const i of frenchIssues(text)) out.push(finding('french-typography', where, i));
    }
  }

  if (GLOSSARY_META.source.trim() === '') out.push(finding('provenance', 'GLOSSARY_META', 'source is empty.'));
  if (!isIsoDate(GLOSSARY_META.date)) out.push(finding('provenance', 'GLOSSARY_META', 'date is not a real YYYY-MM-DD date.'));
  if (!isOpenLicence(GLOSSARY_META.licence)) {
    out.push(
      finding(
        'provenance',
        'GLOSSARY_META',
        GLOSSARY_META.licence === REPO_LICENCE
          ? 'licence is "same as this repository": pin it to an SPDX id.'
          : `licence "${GLOSSARY_META.licence}" is not on the open-licence list.`,
        GLOSSARY_META.licence === REPO_LICENCE ? 'warning' : 'error',
      ),
    );
  }
  return makeReport(out);
}

export function formatReport(report: AuditReport): string {
  if (report.findings.length === 0) return 'Audit clean: no findings.';
  const lines = report.findings.map((f) => `${f.severity.toUpperCase()} ${f.rule} @ ${f.where}: ${f.detail}`);
  return [`${report.errors} error(s), ${report.warnings} warning(s)`, ...lines].join('\n');
}

export class AuditError extends Error {
  readonly report: AuditReport;
  constructor(report: AuditReport) {
    super(formatReport(report));
    this.name = 'AuditError';
    this.report = report;
  }
}

/** Throws when the report has any error. Warnings alone do not throw. */
export function assertAudit(report: AuditReport): void {
  if (report.errors > 0) throw new AuditError(report);
}

/** For a CI script: prints the report and returns the process exit code (1 on errors). */
export function auditExitCode(report: AuditReport, log: (line: string) => void): number {
  log(formatReport(report));
  return report.errors > 0 ? 1 : 0;
}
