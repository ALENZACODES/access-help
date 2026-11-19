import { CHANGES_UI } from './changes';
import { COVERAGE_UI } from './coverage';
import { FINDER_UI } from './finderText';
import { HELP_UI } from './helpRender';
import { helpStrings } from './helpCopy';
import { NOTE_UI } from './notes';
import { CONNECTION_STRINGS } from './offlineCache';
import { PLACE_UI } from './placeRender';
import { PLAN_UI } from './plan';
import { CORRECTION_UI } from './correction';
import { LICENCE_UI } from './licenceInfo';
import { RECORDS_UI, RECORD_EDIT_UI } from './recordSources';
import { SOURCES_UI } from './sourcesPanel';
import { RECORDSCSV_UI } from './recordsCsv';
import { PROBLEMS_UI } from './recordProblems';
import { RECORDFORM_UI } from './recordForm';
import { RECORDVIEW_UI } from './recordView';
import { GUIDE_UI } from './recordsGuide';
import { MERGE_UI } from './recordsMerge';
import { GLANCE_UI } from './glance';
import { PLACEEDIT_UI } from './placeEdit';
import { EDITLOG_UI } from './editLog';
import { PREVIEW_UI } from './recordsPreview';
import { SOURCEEDIT_UI } from './sourceEdit';
import { RECORDSPRINT_UI } from './recordsPrint';
import { FEATUREVIEW_UI } from './featureRecords';
import { GAPS_UI } from './gaps';
import { SOURCEVIEW_UI } from './sourceRecords';
import { RECORDAGES_UI } from './recordAges';
import { DISAGREE_UI } from './recordDisagreements';
import { RECSEARCH_UI } from './recordSearch';
import { TIER_UI } from './sourceTier';
import { QUIZ_UI } from './termQuiz';
import { DAY_UI } from './dayPlan';
import { MUST_UI } from './mustHaves';
import { PRACTICE_UI } from './termPractice';
import { REMINDER_UI } from './reminders';
import { TAG_UI } from './placeTags';
import { LOG_UI } from './visitLog';
import { NOTESEARCH_UI } from './notesSearch';
import { LISTPRINT_UI } from './listPrint';
import { SEARCH_UI } from './savedSearches';
import { LISTSUM_UI } from './listSummary';
import { ORDER_UI } from './visitOrder';
import { SAY_UI } from './readAloud';
import { LIST_UI } from './savedLists';
import { RELAX_UI } from './relaxSuggestions';
import { BACKUP_UI } from './backup';
import { ANNOUNCE_UI } from './announce';
import { SHORTCUT_UI } from './shortcuts';
import { TOUR_UI } from './tour';
import { UNDO_UI } from './undo';
import { VISIT_UI } from './visited';
import { NAME_UI } from './nameSuggestions';
import { AGES_UI } from './listAges';
import { CSV_UI } from './planCsv';
import { GROUP_UI } from './featureGroups';
import { SUMMARY_UI } from './filterSummary';
import { PRINT_UI } from './printPlan';
import { RECENT_UI } from './recentSearches';
import { INDEX_UI } from './termIndex';
import { SUGGEST_UI } from './helpSuggest';
import { MESSAGE_UI } from './outingMessage';
import { RELATED_UI } from './related';
import { PREFS_UI } from './prefs';
import { QUALITY_UI } from './quality';
import { QUESTIONS, QUESTION_UI } from './questions';
import { UI as SHELL_UI } from './render';
import { freshnessText } from './places';
import { statusLabel, type FeatureStatus } from './status';
import { TERMS, UNKNOWN_TERM, glossaryProvenanceFor, type Lang } from './plainTerms';
import { formatProvenance } from './provenance';

/**
 * Every user-facing string the package keeps in a table, found by walking the tables rather
 * than by naming keys one at a time, so a string added later is checked without anyone remembering it.
 */
export type UiTable = Readonly<Record<Lang, Readonly<Record<string, unknown>>>>;

export const UI_TABLES: Readonly<Record<string, UiTable>> = {
  shell: SHELL_UI,
  place: PLACE_UI,
  finder: FINDER_UI,
  coverage: COVERAGE_UI,
  questions: QUESTION_UI,
  notes: NOTE_UI,
  quality: QUALITY_UI,
  changes: CHANGES_UI,
  plan: PLAN_UI,
  prefs: PREFS_UI,
  help: HELP_UI,
  message: MESSAGE_UI,
  related: RELATED_UI,
  suggest: SUGGEST_UI,
  summary: SUMMARY_UI,
  recent: RECENT_UI,
  group: GROUP_UI,
  print: PRINT_UI,
  csv: CSV_UI,
  ages: AGES_UI,
  names: NAME_UI,
  announce: ANNOUNCE_UI,
  undo: UNDO_UI,
  shortcuts: SHORTCUT_UI,
  visit: VISIT_UI,
  tour: TOUR_UI,
  backup: BACKUP_UI,
  index: INDEX_UI,
  relax: RELAX_UI,
  lists: LIST_UI,
  say: SAY_UI,
  order: ORDER_UI,
  log: LOG_UI,
  notesearch: NOTESEARCH_UI,
  listprint: LISTPRINT_UI,
  tags: TAG_UI,
  reminders: REMINDER_UI,
  practice: PRACTICE_UI,
  must: MUST_UI,
  day: DAY_UI,
  quiz: QUIZ_UI,
  tier: TIER_UI,
  disagree: DISAGREE_UI,
  recordages: RECORDAGES_UI,
  featureview: FEATUREVIEW_UI,
  gaps: GAPS_UI,
  sourceview: SOURCEVIEW_UI,
  recsearch: RECSEARCH_UI,
  recordsprint: RECORDSPRINT_UI,
  sourceedit: SOURCEEDIT_UI,
  preview: PREVIEW_UI,
  editlog: EDITLOG_UI,
  placeedit: PLACEEDIT_UI,
  glance: GLANCE_UI,
  merge: MERGE_UI,
  guide: GUIDE_UI,
  recordview: RECORDVIEW_UI,
  recordedit: RECORD_EDIT_UI,
  recordform: RECORDFORM_UI,
  problems: PROBLEMS_UI,
  recordscsv: RECORDSCSV_UI,
  sources: SOURCES_UI,
  records: RECORDS_UI,
  licence: LICENCE_UI,
  searches: SEARCH_UI,
  listsum: LISTSUM_UI,
  correction: CORRECTION_UI,
};

/** Tables whose values are plain strings by language (no nesting). */
export const STRING_TABLES: Readonly<Record<string, Readonly<Record<Lang, string>>>> = {
  connection: CONNECTION_STRINGS,
};

export interface CopyString {
  readonly where: string;
  readonly lang: Lang;
  readonly text: string;
}

/** Inputs used to call string-building functions: names for functions that take names, counts for functions that take counts. */
export const SAMPLE_ARGS: readonly (readonly unknown[])[] = [
  ['Example place', 'Other place'],
  [0, 4],
  [1, 3],
  [2, 5],
  [7, 7],
];

/** Everything a function can say for the sample inputs. Calls that throw or do not return text are skipped. */
export function callSamples(fn: (...args: never[]) => unknown): readonly string[] {
  const out = new Set<string>();
  for (const args of SAMPLE_ARGS) {
    try {
      const r = (fn as (...a: unknown[]) => unknown)(...args);
      if (typeof r === 'string' && r !== '') out.add(r);
    } catch {
      // This sample does not suit this function.
    }
  }
  return [...out];
}

function walk(where: string, lang: Lang, value: unknown, out: CopyString[]): void {
  if (typeof value === 'string') out.push({ where, lang, text: value });
  else if (typeof value === 'function') callSamples(value as (...args: never[]) => unknown).forEach((text, i) => out.push({ where: `${where}()#${i}`, lang, text }));
  else if (typeof value === 'object' && value !== null) {
    for (const [k, v] of Object.entries(value)) walk(`${where}.${k}`, lang, v, out);
  }
}

const STATUSES: readonly FeatureStatus[] = ['present', 'absent', 'unknown'];

/** All table strings, glossary entries, questions, help topics and small generated phrases, in `lang`. */
export function inventory(lang: Lang): readonly CopyString[] {
  const out: CopyString[] = [];
  for (const [name, table] of Object.entries(UI_TABLES)) walk(`ui.${name}`, lang, table[lang], out);
  for (const [name, table] of Object.entries(STRING_TABLES)) out.push({ where: `ui.${name}`, lang, text: table[lang] });
  for (const t of [...TERMS, UNKNOWN_TERM]) {
    out.push({ where: `term.${t.id}.term`, lang, text: t[lang].term }, { where: `term.${t.id}.plain`, lang, text: t[lang].plain });
  }
  for (const [id, q] of Object.entries(QUESTIONS)) out.push({ where: `question.${id}`, lang, text: q[lang] });
  for (const h of helpStrings(lang)) out.push({ ...h, lang });
  for (const s of STATUSES) {
    out.push({ where: `status.${s}`, lang, text: statusLabel(s, lang) });
  }
  out.push({ where: 'status.conflict', lang, text: statusLabel('unknown', lang, true) });
  for (const f of ['aging', 'old'] as const) out.push({ where: `freshness.${f}`, lang, text: freshnessText(f, lang) ?? '' });
  out.push({ where: 'glossary.provenance', lang, text: formatProvenance(glossaryProvenanceFor(lang), lang) });
  return out.filter((s) => s.text !== '');
}
