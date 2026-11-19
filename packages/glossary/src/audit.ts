import { catalogueCopyIssues } from './copyReport';
import { auditCss } from './auditCss';
import { COVERAGE_UI } from './coverage';
import { FINDER_UI } from './finderText';
import { renderFinderShell } from './finderRender';
import { CHANGES_UI, changeSummary, describeChange, diffPlaces, renderChanges } from './changes';
import { NOTE_UI } from './notes';
import { scanMarkup, scanText } from './deepScan';
import { renderHelpPage } from './helpRender';
import { inventory, STRING_TABLES, UI_TABLES } from './inventory';
import { auditLinks } from './links';
import { allParity, stringPair } from './parity';
import { QUESTIONS, QUESTION_UI } from './questions';
import { PLAN_UI, buildPlan, placeProgressText, planToText, progressText, renderPlan } from './plan';
import { QUALITY_UI } from './quality';
import { PREFS_UI, prefsCss, renderPrefsPanel } from './prefs';
import { EMPTY_STATE } from './filters';
import { renderComparison } from './compare';
import { renderPrintPage } from './printPlan';
import { groupByLetter, letterId, renderIndexNav } from './termIndex';
import { listTerms } from './glossary';
import { CHANNELS, composeMessage, messageToText } from './outingMessage';
import { readabilityIssues } from './readability';
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

/** Style and script blocks are code, not text a person reads. */
export function withoutCode(html: string): string {
  return html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
}

/** Text a person reads: tags removed, entities decoded. Spaces are kept exactly as written. */
export function visibleText(html: string): string {
  return decodeEntities(withoutCode(html).replace(/<[^>]*>/g, ''));
}

/** Same, but each tag becomes a space so words in neighbouring elements stay separate. */
export function spacedText(html: string): string {
  return decodeEntities(withoutCode(html).replace(/<[^>]*>/g, ' '));
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
    ...Object.entries(QUESTIONS).map(([id, q]) => ({ where: `questions.${id}`, text: q[lang] })),
    ...Object.entries(QUESTION_UI[lang].reason).map(([k, text]) => ({ where: `questions.reason.${k}`, text })),
    { where: 'questions.summary', text: QUESTION_UI[lang].summary(3) },
    { where: 'questions.title', text: QUESTION_UI[lang].title },
    { where: 'notes.label', text: NOTE_UI[lang].label('Example place') },
    { where: 'notes.hint', text: NOTE_UI[lang].hint },
    { where: 'notes.copy', text: NOTE_UI[lang].copy('Example place') },
    { where: 'notes.copyShort', text: NOTE_UI[lang].copyShort },
    { where: 'notes.yourNote', text: NOTE_UI[lang].yourNote },
    ...(['summary', 'caption', 'place', 'conflicts', 'unsourced', 'old', 'none'] as const).map((k) => ({ where: `quality.${k}`, text: QUALITY_UI[lang][k] })),
    { where: 'quality.lead', text: QUALITY_UI[lang].lead(2, 9) },
    { where: 'quality.more', text: QUALITY_UI[lang].more(4) },
    { where: 'changes.heading', text: CHANGES_UI[lang].heading },
    { where: 'changes.added', text: CHANGES_UI[lang].added },
    { where: 'changes.removed', text: CHANGES_UI[lang].removed },
    { where: 'changes.more', text: CHANGES_UI[lang].more(4) },
    ...(['heading', 'intro', 'noSaved', 'nothing', 'exportPlan', 'title'] as const).map((k) => ({ where: `plan.${k}`, text: PLAN_UI[lang][k] })),
    { where: 'plan.progress', text: progressText(1, 3, lang) },
    { where: 'plan.progress-many', text: progressText(2, 5, lang) },
    { where: 'plan.placeProgress', text: placeProgressText('Example place', 2, 5, lang) },
    { where: 'finder.saveLabel', text: FINDER_UI[lang].saveLabel('Example place') },
    { where: 'finder.partial', text: FINDER_UI[lang].partial(25, 40) },
    { where: 'finder.compareLabel', text: FINDER_UI[lang].compareLabel('Example place') },
    { where: 'summary', text: summarisePlace(place, lang) },
  ];
  for (const channel of CHANNELS) {
    const entry = buildPlan([place], ['x'], ['ramp', 'elevator'], '2026-11-15', lang, {})[0];
    const message = entry === undefined ? null : composeMessage(entry, lang, channel);
    if (message !== null) strings.push({ where: `message.${channel}`, text: messageToText(message, lang) });
  }
  strings.push({ where: 'plan.text', text: planToText(buildPlan([place], ['x'], ['ramp', 'elevator'], '2026-11-15', lang, {}), lang) });
  const sampleChanges = diffPlaces(
    [{ id: 'a', name: 'Example', claims: [] }],
    [{ id: 'a', name: 'Example', claims: [{ termId: 'ramp', status: 'present', provenance: SAMPLE_PROV }] }],
  );
  for (const c of sampleChanges.changed) strings.push({ where: 'changes.describe', text: describeChange(c, lang) });
  strings.push({ where: 'changes.summary', text: changeSummary(sampleChanges, lang) ?? '' });
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
  const after: Place[] = [
    { ...(places[0] as Place), claims: [...claims, { termId: 'elevator', status: 'present', provenance: SAMPLE_PROV }] },
    { id: 'c', name: 'Example place C', claims: [] },
  ];
  const changes = diffPlaces(places, after);
  const messy: Place[] = [
    {
      id: 'm',
      name: 'Example place M',
      claims: [
        { termId: 'ramp', status: 'present', provenance: SAMPLE_PROV },
        { termId: 'ramp', status: 'absent', provenance: { ...SAMPLE_PROV, source: 'Second source' } },
        { termId: 'elevator', status: 'present' },
        { termId: 'grab-bar', status: 'present', provenance: { ...SAMPLE_PROV, date: '2020-01-01' } },
      ],
    },
    ...places,
  ];
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
    {
      name: `finder-notes.${lang}`,
      html: renderFinderShell({
        lang,
        state: EMPTY_STATE,
        places: messy,
        today: '2026-11-15',
        canExport: true,
        saved: ['m', 'a'],
        plan: { m: ['ramp'] },
        notes: { m: 'Ask about the side door.\nCall first.' },
        changes,
      }),
    },
    {
      name: `plan.${lang}`,
      html: `<div lang="${lang}">${renderPlan(buildPlan(messy, ['m', 'b'], ['ramp', 'elevator', 'grab-bar'], '2026-11-15', lang, { m: ['elevator'] }), 2, lang)}</div>`,
    },
    {
      name: `finder-recent.${lang}`,
      html: renderFinderShell({
        lang,
        state: { features: ['ramp', 'elevator'], query: 'café', hideNotAvailable: true },
        places: messy,
        today: '2026-11-15',
        canExport: true,
        saved: ['m', 'b'],
        recent: ['café', 'library'],
        shortcuts: true,
        tour: { open: true, index: 2 },
        undo: { kind: 'recent', recent: ['café'] },
        visits: { m: '2026-11-01' },
        view: { sort: 'name', recentOnly: true, savedOnly: true },
        lists: [{ name: 'Saturday', ids: ['m'] }, { name: 'Dentist', ids: [] }],
        searches: [{ name: 'Ramp places', state: { features: ['ramp'], query: 'café', hideNotAvailable: true } }],
        searchMessage: 'Done.',
        listMessage: 'Done.',
        canSpeak: true,
        tags: { m: ['spring', 'with Sam'], b: ['spring'] },
        tagFilter: 'spring',
        reminders: { m: '2026-11-10', b: '2026-12-01' },
        must: ['ramp', 'elevator'],
        canLoadRecords: true,
        canEditRecords: true,
        editLog: [{ date: '2026-10-01', kind: 'rename', place: 'M', detail: 'N', count: 0 }],
        recordView: { tier: 'shown', hiddenSources: [] },
        recordsMessage: 'Done.',
        recordQuery: 'ramp second',
        featureChoice: 'ramp',
        sourceChoice: 'Example source',
        compareSources: { a: 'Example source', b: 'Second source' },
        recordForm: { draft: { placeName: 'M', termId: 'ramp', status: 'present', source: '', licence: 'CC0-1.0', date: '2026-10-01', tier: '' }, message: '', problems: ['source-missing'] },
        days: { m: 'wed' },
        quiz: { quiz: [{ id: 'unknown', options: ['unknown', 'ramp', 'elevator'] }], position: 0, picked: 'ramp', score: 0 },
        quizBest: { score: 5, total: 9 },
        practice: { deck: ['unknown', 'automatic-door'], position: 1, revealed: true, progress: { unknown: 'known' } },
      }),
    },
    {
      name: `finder-empty.${lang}`,
      html: renderFinderShell({
        lang,
        state: { features: ['ramp'], query: 'zzz', hideNotAvailable: true },
        places: messy,
        today: '2026-11-15',
        canExport: true,
        canSpeak: true,
        lists: [{ name: 'Saturday', ids: ['m'] }],
      }),
    },
    {
      name: `print-plan.${lang}`,
      html: renderPrintPage(buildPlan(messy, ['m', 'b'], ['ramp', 'elevator', 'grab-bar'], '2026-11-15', lang, { m: ['elevator'] }), { lang, today: '2026-11-15' }),
    },
    { name: `print-empty.${lang}`, html: renderPrintPage([], { lang, today: '2026-11-15' }) },
    { name: `term-index.${lang}`, html: `<div lang="${lang}">${renderIndexNav(listTerms(lang), lang)}${groupByLetter(listTerms(lang)).map((g) => `<p id="${letterId(g.letter)}">${g.letter}</p>`).join('')}</div>` },
    {
      name: `plan-message.${lang}`,
      html: `<div lang="${lang}">${renderPlan(buildPlan(messy, ['m', 'b'], ['ramp', 'elevator', 'grab-bar'], '2026-11-15', lang, { m: ['elevator'] }), 2, lang, true)}</div>`,
    },
    { name: `plan-empty.${lang}`, html: `<div lang="${lang}">${renderPlan([], 0, lang)}</div>` },
    { name: `changes.${lang}`, html: `<div lang="${lang}">${renderChanges(changes, lang)}</div>` },
    { name: `help-page.${lang}`, html: renderHelpPage(lang, '') },
    { name: `help-page-search.${lang}`, html: renderHelpPage(lang, 'ramp') },
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
    for (const { name, html } of sampleMarkup(lang)) {
      out.push(...auditMarkup(name, html, lang));
      out.push(...auditLinks(html, name));
      for (const f of scanMarkup(html)) out.push(finding('scan', `${name} (${f.where})`, `${f.rule}: "${f.match}" (${f.view})`));
    }
    for (const { where, text } of inventory(lang)) {
      for (const f of scanText(text)) out.push(finding('scan', `${where} [${lang}]`, `${f.rule}: "${f.match}" (${f.view})`));
      if (lang === 'fr') for (const i of frenchIssues(text)) out.push(finding('french-typography', where, i));
      for (const i of readabilityIssues(text, lang)) out.push(finding('readability', `${where} [${lang}]`, `${i.rule}: ${i.detail}`));
    }
    for (const { where, text } of collectUserStrings(lang)) {
      for (const v of lintCopy(text)) out.push(finding('copy-rule', `${where} [${lang}]`, `${v.rule}: "${v.match}"`));
      for (const i of plainLanguageIssues(text)) out.push(finding('plain-language', `${where} [${lang}]`, i.rule));
      if (lang === 'fr') for (const i of frenchIssues(text)) out.push(finding('french-typography', where, i));
    }
  }

  // The term catalogue: every label and note under the same wording checks, and the shape of the catalogue.
  for (const i of catalogueCopyIssues()) out.push(finding(`catalogue-${i.check}`, `${i.where} [${i.lang}]`, i.detail));

  const connection = STRING_TABLES['connection'];
  for (const p of [...allParity(UI_TABLES), ...(connection === undefined ? [] : stringPair('ui.connection', connection.en, connection.fr))]) {
    out.push(finding('parity', p.where, `${p.rule}: ${p.detail}`));
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
