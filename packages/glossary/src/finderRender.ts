import { renderChanges, type PlaceChanges } from './changes';
import { renderComparison } from './compare';
import { renderCoverage } from './coverage';
import { summariseAges } from './listAges';
import { CSV_UI } from './planCsv';
import { renderNameSuggestions, suggestNames } from './nameSuggestions';
import { BACKUP_UI, countData, renderDataPanel, type DataPanelOptions } from './backup';
import { ANNOUNCE_REGION } from './announce';
import { renderShortcuts } from './shortcuts';
import { CLOSED_TOUR, renderTour, renderTourButton, type TourState } from './tour';
import { renderUndo, type UndoAction } from './undo';
import { visitButton, visitNote, visitDate, type Visits } from './visited';
import { renderGroups } from './featureGroups';
import { renderSummary } from './filterSummary';
import { renderHelpSection } from './helpRender';
import { PRINT_UI } from './printPlan';
import { renderCorrectionForm } from './correction';
import { MUST_UI, mustLines, renderMustCard, renderMustPanel, type MustHaves } from './mustHaves';
import { DAY_UI, dayOf, renderDayField, renderWeek, weekView, type DayPlan } from './dayPlan';
import { QUIZ_UI, quizWords, renderQuiz, startQuiz, type Best, type QuizState } from './termQuiz';
import { TAG_UI, allTags, placesWithTag, renderTagEditor, renderTagsPanel, tagsOf, type Tags } from './placeTags';
import { REMINDER_UI, dueList, reminderDate, renderReminderField, renderReminders, type Reminders } from './reminders';
import { PRACTICE_UI, practiceCards, practiceIds, renderPractice, startRound, type PracticeState } from './termPractice';
import { LOG_UI, renderLogExport, renderVisitLog, visitLog } from './visitLog';
import { NOTESEARCH_UI, renderNoteMatches, renderNotesSearch, searchNotes } from './notesSearch';
import { SEARCH_UI, renderSearchesPanel, type SavedSearches } from './savedSearches';
import { sayButton } from './readAloud';
import { LIST_UI, renderListPicker, renderListsPanel, type Lists } from './savedLists';
import { renderRelax } from './relaxSuggestions';
import { renderRecent, type RecentSearches } from './recentSearches';
import { attribution, type PlaceDataset } from './dataset';
import { renderPlaceRecords } from './recordSources';
import { SOURCES_UI, renderSources } from './sourcesPanel';
import { renderRecordsCsv } from './recordsCsv';
import { renderRecordsGuide } from './recordsGuide';
import { renderGlance } from './glance';
import { PLACEEDIT_UI, renderDuplicates, renderRename } from './placeEdit';
import { EDITLOG_UI, renderEditLog, type EditEntry } from './editLog';
import { renderLoadMode, type LoadMode } from './recordsMerge';
import { renderCheckButton } from './recordsPreview';
import { renderSourceRename } from './sourceEdit';
import { renderRecordsPrintButton } from './recordsPrint';
import { sourceNames } from './recordView';
import { DEFAULT_RECORD_VIEW, RECORDVIEW_UI, renderRecordView, renderViewNote, type RecordView } from './recordView';
import { renderRecordForm, type DraftProblem, type RecordDraft } from './recordForm';
import { DISAGREE_UI, disagreementRows, renderDisagreements } from './recordDisagreements';
import { PROBLEMS_UI, problemRows, renderProblems } from './recordProblems';
import { RECSEARCH_UI, renderRecordMatches, renderRecordSearch, searchRecords } from './recordSearch';
import type { Provenance } from './provenance';
import type { FinderState } from './filters';
import { FINDER_UI, placeCountText } from './finderText';
import { fixFrench } from './frTypography';
import { lookupTerm } from './glossary';
import { htmlLang } from './locale';
import { connectionText } from './offlineCache';
import { MAX_NOTE_LENGTH, NOTE_UI, getNote, type Notes } from './notes';
import { renderPlaceCard } from './placeRender';
import { PLAN_UI, buildPlan, renderPlan, type PlanState } from './plan';
import { findPlaces } from './placeSearch';
import type { Place } from './places';
import { renderPrefsPanel, type Prefs } from './prefs';
import { questionsFor, renderQuestions } from './questions';
import { renderQuality } from './quality';
import { firstPage, isRecent, sortMatches } from './sorting';
import { suggestFeatures } from './synonyms';
import { TERMS, type Lang } from './plainTerms';
import { escapeHtml } from './text';
import { DEFAULT_VIEW, PAGE_SIZE, SORT_KEYS, type FinderView } from './view';

/** Controls are 44px or taller; the label is the target for each checkbox. */
export const FINDER_CSS = `.gl-finder { max-width: 48rem; line-height: 1.5; }
.gl-fieldset { min-width: 0; margin: 16px 0; padding: 12px; border: 1px solid currentColor; border-radius: 4px; }
.gl-options { display: grid; gap: 8px; }
.gl-check { display: flex; align-items: center; gap: 12px; min-height: 44px; padding-block: 4px; }
.gl-box { flex: none; width: 24px; height: 24px; }
.gl-box:focus-visible { outline: 3px solid currentColor; outline-offset: 2px; }
.gl-select { display: block; max-width: 100%; min-height: 44px; margin-block: 4px 12px; padding: 8px 12px; font: inherit; border: 2px solid currentColor; border-radius: 4px; background: transparent; color: inherit; }
.gl-select:focus-visible { outline: 3px solid currentColor; outline-offset: 2px; }
.gl-btn { min-height: 44px; min-width: 44px; padding: 8px 16px; font: inherit; border: 2px solid currentColor; border-radius: 4px; background: transparent; color: inherit; }
.gl-btn:focus-visible { outline: 3px solid currentColor; outline-offset: 2px; }
.gl-btn[aria-pressed='true'] { border-width: 4px; font-weight: 700; }
.gl-textarea { display: block; box-sizing: border-box; width: 100%; min-height: 88px; margin-block: 4px; padding: 8px 12px; font: inherit; border: 2px solid currentColor; border-radius: 4px; background: transparent; color: inherit; }
.gl-textarea:focus-visible { outline: 3px solid currentColor; outline-offset: 2px; }
.gl-questions, .gl-quality, .gl-changes details { margin-top: 8px; }
.gl-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.gl-offline { margin: 8px 0; padding: 8px; border: 2px dashed currentColor; }
summary { min-height: 44px; padding-block: 12px; cursor: pointer; }
summary:focus-visible { outline: 3px solid currentColor; outline-offset: 2px; }
.gl-place mark { background: transparent; color: inherit; font-weight: 700; text-decoration: underline; text-decoration-thickness: 2px; }
.gl-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
kbd { padding: 2px 6px; border: 1px solid currentColor; border-radius: 4px; font: inherit; font-weight: 700; }
.gl-compare-wrap { margin: 16px 0; overflow-x: auto; }
.gl-compare-wrap:focus-visible { outline: 3px solid currentColor; outline-offset: 2px; }
.gl-compare { border-collapse: collapse; width: 100%; }
.gl-compare th, .gl-compare td { padding: 8px; border: 1px solid currentColor; text-align: start; vertical-align: top; }
`;

export interface ResultsExtra {
  readonly view?: FinderView;
  /** Saved place ids (used for the Save buttons and "only saved"). */
  readonly saved?: readonly string[];
  /** How many places to show before "Show more". */
  readonly limit?: number;
  /** true adds the "copy comparison" button; the host decides what to do with the text. */
  readonly canExport?: boolean;
  /** The person's own notes by place id. Shown in a text box under each place. */
  readonly notes?: Notes;
  /** The person's own visit marks by place id. */
  readonly visits?: Visits;
  /** The person's own lists. Each place gets an "Add to a list" box when there are lists. */
  readonly lists?: Lists;
  /** true adds a "Read aloud" button to each place. The host makes the sound. */
  readonly canSpeak?: boolean;
  /** true adds the buttons to remove a record or a place. The host keeps the change. */
  readonly canEditRecords?: boolean;
  /** The person's own tags by place id. */
  readonly tags?: Tags;
  /** The person's own "check again" dates by place id. */
  readonly reminders?: Reminders;
  /** The features the person cannot do without. */
  readonly must?: MustHaves;
  /** The person's own week plan by place id. */
  readonly days?: DayPlan;
}

export interface ResultsView {
  readonly count: string;
  readonly list: string;
  readonly compare: string;
  /** Places on screen. */
  readonly shown: number;
  /** Places that match, including ones behind "Show more". */
  readonly total: number;
  /** Index in `places` of each place on screen, in order. */
  readonly indexes: readonly number[];
  /** Every place that matches, including ones behind "Show more". */
  readonly matched: readonly Place[];
}

function countFor(lang: Lang, shown: number, total: number): string {
  if (shown >= total) return placeCountText(lang, total);
  const text = FINDER_UI[lang].partial(shown, total);
  return lang === 'fr' ? fixFrench(text) : text;
}

/**
 * Filters, ranks, sorts and pages the places. Up to two selected places (by index in `places`)
 * are compared. Button ids use the index in `places`, so they stay put when results re-rank.
 */
export function resultsView(
  places: readonly Place[],
  state: FinderState,
  lang: Lang,
  today: string,
  selected: readonly number[],
  extra: ResultsExtra = {},
): ResultsView {
  const ui = FINDER_UI[lang];
  const noteUi = NOTE_UI[lang];
  const view = extra.view ?? DEFAULT_VIEW;
  const saved = extra.saved ?? [];
  let matches = findPlaces(places, state, lang);
  if (view.savedOnly) matches = matches.filter((m) => saved.includes(m.place.id));
  if (view.recentOnly) matches = matches.filter((m) => isRecent(m.place, today));
  matches = sortMatches(matches, view.sort, lang);

  const page = firstPage(matches, extra.limit ?? PAGE_SIZE);
  const indexes = page.items.map((m) => places.indexOf(m.place));
  const items = page.items.map((match, i) => {
    const index = indexes[i] ?? 0;
    const name = match.place.name;
    const termIds = state.features.length > 0 ? state.features : TERMS.map((t) => t.id);
    const questions = renderQuestions(questionsFor(match.place, termIds, today, lang), lang);
    const note =
      `<label for="gl-note-${index}">${escapeHtml(noteUi.label(name))}</label>` +
      `<textarea id="gl-note-${index}" class="gl-textarea" rows="3" maxlength="${MAX_NOTE_LENGTH}" ` +
      `aria-describedby="gl-note-hint-${index}">${escapeHtml(getNote(extra.notes ?? {}, match.place.id))}</textarea>` +
      `<p class="gl-note" id="gl-note-hint-${index}">${escapeHtml(noteUi.hint)}</p>`;
    const copy =
      extra.canExport === true
        ? `<button type="button" class="gl-btn" id="gl-copy-${index}" aria-label="${escapeHtml(noteUi.copy(name))}">${escapeHtml(noteUi.copyShort)}</button>`
        : '';
    return (
      `<li>${renderPlaceCard(match, lang, today, index, state.query)}${renderPlaceRecords(match.place, lang, extra.canEditRecords === true ? index : undefined)}${extra.canEditRecords === true ? renderRename(index, name, lang) : ''}${questions}${note}${renderTagEditor(index, name, tagsOf(extra.tags ?? {}, match.place.id), lang)}${renderReminderField(index, name, reminderDate(extra.reminders ?? {}, match.place.id), lang)}${renderMustCard(match.place, extra.must ?? [], lang)}${saved.includes(match.place.id) ? renderDayField(index, name, dayOf(extra.days ?? {}, match.place.id), lang) : ''}<div class="gl-actions">` +
      `<button type="button" class="gl-btn" id="gl-cmp-${index}" aria-pressed="${selected.includes(index)}" ` +
      `aria-label="${escapeHtml(ui.compareLabel(name))}">${escapeHtml(ui.compare)}</button>` +
      `<button type="button" class="gl-btn" id="gl-save-${index}" aria-pressed="${saved.includes(match.place.id)}" ` +
      `aria-label="${escapeHtml(ui.saveLabel(name))}">${escapeHtml(ui.save)}</button>${copy}` +
      `${visitButton(index, name, visitDate(extra.visits ?? {}, match.place.id) !== null, lang)}${extra.canSpeak === true ? sayButton(index, name, lang) : ''}${renderListPicker(extra.lists ?? [], match.place, index, lang)}</div>${visitNote(visitDate(extra.visits ?? {}, match.place.id), lang)}${extra.canExport === true ? renderCorrectionForm(match.place, index, lang) : ''}</li>`
    );
  });
  const more =
    page.remaining > 0
      ? `<button type="button" class="gl-btn" id="gl-more">${escapeHtml(ui.more)}</button>`
      : '';
  const list =
    items.length === 0
      ? `<p class="gl-empty">${escapeHtml(ui.none)}</p>${renderRelax(places, state, view, saved, today, lang)}`
      : `<ul class="gl-places">${items.join('')}</ul>${more}`;

  let compare = '';
  const [first, second] = selected.map((i) => places[i]);
  if (first !== undefined && second !== undefined) {
    const copy =
      extra.canExport === true
        ? `<button type="button" class="gl-btn" id="gl-copy-compare">${escapeHtml(ui.copyCompare)}</button>`
        : '';
    compare = `<h3>${escapeHtml(ui.compareTitle)}</h3>${renderComparison(first, second, state.features, lang)}${copy}`;
  } else if (selected.length > 0) {
    compare = `<p class="gl-note">${escapeHtml(ui.pickTwo)}</p>`;
  }
  return { count: countFor(lang, page.shown, page.total), list, compare, shown: page.shown, total: page.total, indexes, matched: matches.map((m) => m.place) };
}

/** Buttons that add a feature the typed words could mean. Empty when there is nothing to offer. */
export function renderSuggestions(query: string, state: FinderState, lang: Lang): string {
  const ids = suggestFeatures(query, lang, state.features);
  if (ids.length === 0) return '';
  const buttons = ids
    .map((id) => `<button type="button" class="gl-btn" id="gl-sg-${id}">${escapeHtml(lookupTerm(id, lang).term)}</button>`)
    .join('');
  return (
    `<p class="gl-note" id="gl-suggest-label">${escapeHtml(FINDER_UI[lang].suggestLabel)}</p>` +
    `<div class="gl-actions" role="group" aria-labelledby="gl-suggest-label">${buttons}</div>`
  );
}

export interface PlanSectionOptions {
  readonly lang: Lang;
  readonly state: FinderState;
  readonly places: readonly Place[];
  readonly saved: readonly string[];
  readonly today: string;
  readonly plan: PlanState;
  readonly canExport: boolean;
}

/** The visit plan for saved places, with a copy button when export is on and there is something to copy. */
export function renderPlanSection(o: PlanSectionOptions): string {
  const termIds = o.state.features.length > 0 ? o.state.features : TERMS.map((t) => t.id);
  const entries = buildPlan(o.places, o.saved, termIds, o.today, o.lang, o.plan);
  const copy =
    o.canExport && entries.length > 0
      ? `<button type="button" class="gl-btn" id="gl-export-plan">${escapeHtml(PLAN_UI[o.lang].exportPlan)}</button>`
      : '';
  const print =
    o.canExport && entries.length > 0
      ? `<button type="button" class="gl-btn" id="gl-print-plan">${escapeHtml(PRINT_UI[o.lang].exportPrint)}</button>`
      : '';
  const csv =
    o.canExport && entries.length > 0
      ? `<button type="button" class="gl-btn" id="gl-export-plan-csv">${escapeHtml(CSV_UI[o.lang].exportCsv)}</button>`
      : '';
  return renderPlan(entries, o.saved.filter((id) => o.places.some((p) => p.id === id)).length, o.lang, o.canExport, true) + copy + print + csv;
}

export interface FinderShellOptions extends ResultsExtra {
  readonly lang: Lang;
  readonly state: FinderState;
  readonly places: readonly Place[];
  readonly dataset?: PlaceDataset | null;
  readonly today: string;
  readonly selected?: readonly number[];
  readonly offline?: boolean;
  /** Shows the display-settings panel when given. */
  readonly prefs?: Prefs;
  /** What the last data update changed. Shown as a status message when not empty. */
  readonly changes?: PlaceChanges;
  /** Which planned questions the person has ticked. */
  readonly plan?: PlanState;
  /** Recent searches, newest first. */
  readonly recent?: RecentSearches;
  readonly shortcuts?: boolean;
  readonly tour?: TourState;
  readonly undo?: UndoAction | null;
  /** What the "Your data" panel shows. */
  readonly data?: Pick<DataPanelOptions, 'counts' | 'confirming' | 'message'>;
  /** A short message for the lists panel. */
  readonly listMessage?: string;
  /** The person's saved searches. */
  readonly searches?: SavedSearches;
  /** A short message for the saved-searches panel. */
  readonly searchMessage?: string;
  /** The words typed in the notes search. */
  readonly notesQuery?: string;
  /** What is typed in the record search. */
  readonly recordQuery?: string;
  /** The person's own tags. */
  readonly tags?: Tags;
  /** The tag chosen in the tags panel (its comparison form). */
  readonly tagFilter?: string;
  /** The person's own "check again" dates. */
  readonly reminders?: Reminders;
  /** The state of the word practice. */
  readonly practice?: PracticeState;
  /** The features the person cannot do without. */
  readonly must?: MustHaves;
  /** The person's own week plan. */
  readonly days?: DayPlan;
  /** true adds the box to load a table of records. The host keeps the places. */
  readonly canLoadRecords?: boolean;
  /** What happened the last time a table of records was loaded. */
  readonly recordsMessage?: string;
  /** The changes the person made to the records on this device. Shown when the host keeps records. */
  readonly editLog?: readonly EditEntry[];
  /** Whether a loaded table replaces the records held or is added to them. */
  readonly loadMode?: LoadMode;
  /** Every place held, before any record is left out. Defaults to `places`. */
  readonly allPlaces?: readonly Place[];
  /** Which records are counted. */
  readonly recordView?: RecordView;
  /** The "add a record" form: what was typed, the last message and any problems. */
  readonly recordForm?: RecordFormState;
  /** The state of the word quiz and the best score. */
  readonly quiz?: QuizState;
  readonly quizBest?: Best | null;
}

/** The visit log with its copy button (when the host takes files). */
export function visitLogHtml(o: Pick<FinderShellOptions, 'lang' | 'places' | 'visits' | 'canExport'>): string {
  const entries = visitLog(o.visits ?? {}, o.places, o.lang);
  return renderVisitLog(entries, o.lang) + (o.canExport === true ? renderLogExport(entries, o.lang) : '');
}

/** The tags panel: the tags in use, and the places with the chosen one. */
export function tagsPanelHtml(o: { lang: Lang; places: readonly Place[]; tags?: Tags | undefined; tagFilter?: string | undefined }): string {
  const tags = o.tags ?? {};
  const counts = allTags(tags, o.places);
  const key = counts.some((c) => c.key === o.tagFilter) ? (o.tagFilter ?? '') : '';
  return renderTagsPanel(counts, key, placesWithTag(tags, o.places, key), o.lang);
}

/** What the "add a record" form is showing. */
export interface RecordFormState {
  readonly draft: RecordDraft;
  readonly message: string;
  readonly problems: readonly DraftProblem[];
  /** The record being changed, by place and record position. Absent when the form adds a new record. */
  readonly editing?: { readonly placeIndex: number; readonly claimIndex: number } | null;
}

/** The sources panel: where the information comes from, then saving and loading records as a table. */
export function sourcesPanelHtml(o: {
  lang: Lang;
  places: readonly Place[];
  listSource?: Provenance | null | undefined;
  canExport: boolean;
  canLoad: boolean;
  message?: string | undefined;
  form?: RecordFormState | undefined;
  loadMode?: LoadMode | undefined;
  canEdit?: boolean | undefined;
}): string {
  const form = o.canLoad ? `<div data-gl-recform>${renderRecordForm(o.lang, o.form?.draft, o.form?.message ?? '', o.form?.problems ?? [], o.form?.editing !== undefined && o.form.editing !== null)}</div>` : '';
  return renderSources(o.places, o.listSource, o.lang, o.canExport) + renderRecordsCsv(o.lang, o.canExport, o.canLoad, o.message ?? '', o.canLoad ? `${renderLoadMode(o.loadMode ?? 'replace', o.lang)}${renderCheckButton(o.lang)}<div data-gl-preview></div>` : '') + (o.canExport && o.places.length > 0 ? renderRecordsPrintButton(o.lang) : '') + (o.canExport || o.canLoad ? renderRecordsGuide(o.lang, o.canExport) : '') + form + (o.canEdit === true ? renderSourceRename(sourceNames(o.places), o.lang) : '');
}

/** The "records to look at" panel. */
export function problemsPanelHtml(o: { lang: Lang; places: readonly Place[]; today: string; canExport: boolean }): string {
  return renderProblems(problemRows(o.places, o.lang, o.today), o.lang, o.canExport);
}

/** The "where sources disagree" panel. */
export function disagreePanelHtml(o: { lang: Lang; places: readonly Place[]; canExport: boolean }): string {
  return renderDisagreements(disagreementRows(o.places, o.lang), o.lang, o.canExport);
}

/** The matches of the record search. */
export function recordMatchesHtml(o: { lang: Lang; places: readonly Place[]; query: string }): string {
  return renderRecordMatches(searchRecords(o.places, o.query, o.lang), o.query, o.lang);
}

/** The must-haves panel: a check box for each feature, then the places in order. */
export function mustPanelHtml(o: { lang: Lang; places: readonly Place[]; must?: MustHaves | undefined }): string {
  const must = o.must ?? [];
  return renderMustPanel(must, mustLines(o.places, must, o.lang), o.lang);
}

/** The week panel. */
export function weekPanelHtml(o: { lang: Lang; places: readonly Place[]; today: string; days?: DayPlan | undefined; canExport: boolean }): string {
  return renderWeek(weekView(o.days ?? {}, o.places), o.today, o.lang, o.canExport);
}

/** The quiz panel. */
export function quizPanelHtml(o: { lang: Lang; quiz?: QuizState | undefined; best?: Best | null | undefined }): string {
  const { ids, cards } = quizWords(o.lang);
  return renderQuiz(o.quiz ?? startQuiz(ids), cards, o.best ?? null, o.lang);
}

/** The "check again" dates panel. */
export function remindersPanelHtml(o: { lang: Lang; places: readonly Place[]; today: string; reminders?: Reminders | undefined; canExport: boolean }): string {
  return renderReminders(dueList(o.reminders ?? {}, o.places, o.today), o.lang, o.canExport);
}

const SORT_LABEL = {
  best: 'sortBest',
  name: 'sortName',
  newest: 'sortNewest',
} as const;

function checkbox(id: string, on: boolean, label: string): string {
  return (
    `<label class="gl-check" for="${id}"><input class="gl-box" type="checkbox" id="${id}"${on ? ' checked' : ''}>` +
    `<span>${escapeHtml(label)}</span></label>`
  );
}

/** The whole finder: features, search, list controls, results, comparison, display settings, data source. */
export function renderFinderShell(opts: FinderShellOptions): string {
  const { lang, state } = opts;
  const ui = FINDER_UI[lang];
  const view = opts.view ?? DEFAULT_VIEW;
  const saved = opts.saved ?? [];
  const results = resultsView(opts.places, state, lang, opts.today, opts.selected ?? [], opts);
  const checks = TERMS.map((t) => {
    const term = lookupTerm(t.id, lang);
    const checked = state.features.includes(t.id) ? ' checked' : '';
    return (
      `<div><label class="gl-check" for="gl-f-${t.id}">` +
      `<input class="gl-box" type="checkbox" id="gl-f-${t.id}"${checked} aria-describedby="gl-fd-${t.id}">` +
      `<span>${escapeHtml(term.term)}</span></label>` +
      `<p class="gl-note" id="gl-fd-${t.id}">${escapeHtml(term.plain)}</p></div>`
    );
  }).join('');
  const sortOptions = SORT_KEYS.map(
    (k) => `<option value="${k}"${k === view.sort ? ' selected' : ''}>${escapeHtml(ui[SORT_LABEL[k]])}</option>`,
  ).join('');
  const offlineText = connectionText(opts.offline !== true, lang);
  const banner =
    offlineText === null ? '' : `<p class="gl-offline" role="status" data-gl-offline>${escapeHtml(offlineText)}</p>`;
  const source =
    opts.dataset === undefined || opts.dataset === null ? ui.noData : attribution(opts.dataset, lang);
  const sourceLine = lang === 'fr' ? fixFrench(`${ui.dataHeading} : ${source}`) : `${ui.dataHeading}: ${source}`;
  const exportSaved =
    opts.canExport === true
      ? `<button type="button" class="gl-btn" id="gl-export-saved">${escapeHtml(ui.exportSaved)}</button>`
      : '';
  return (
    `<section class="gl-finder" lang="${htmlLang(lang)}" aria-labelledby="gl-finder-title">` +
    `<h2 id="gl-finder-title">${escapeHtml(ui.title)}</h2>${banner}${ANNOUNCE_REGION}` +
    `<div class="gl-actions">${renderTourButton(lang)}</div><div data-gl-tour>${renderTour(opts.tour ?? CLOSED_TOUR, lang)}</div>` +
    (opts.prefs === undefined ? '' : renderPrefsPanel(opts.prefs, lang)) +
    `<fieldset class="gl-fieldset"><legend>${escapeHtml(ui.featuresLegend)}</legend>` +
    `<p class="gl-note">${escapeHtml(ui.featuresHint)}</p><div data-gl-groups>${renderGroups(state, lang)}</div><div class="gl-options">${checks}</div></fieldset>` +
    `<label for="gl-pq">${escapeHtml(ui.searchLabel)}</label>` +
    `<input id="gl-pq" class="gl-input" type="search" autocomplete="off" spellcheck="false" ` +
    `enterkeyhint="search" value="${escapeHtml(state.query)}">` +
    `<div data-gl-suggest>${renderSuggestions(state.query, state, lang)}</div>` +
    `<div data-gl-names>${renderNameSuggestions(suggestNames(opts.places, state.query, lang), lang)}</div>` +
    `<div data-gl-recent-searches>${renderRecent(opts.recent ?? [], lang)}</div>` +
    checkbox('gl-hide', state.hideNotAvailable, ui.hideLabel) +
    `<div data-gl-shortcuts>${renderShortcuts(opts.shortcuts === true, lang)}</div>` +
    checkbox('gl-recent', view.recentOnly, ui.recentLabel) +
    checkbox('gl-only-saved', view.savedOnly, ui.savedLabel) +
    `<label for="gl-sort">${escapeHtml(ui.sortLabel)}</label>` +
    `<select id="gl-sort" class="gl-select">${sortOptions}</select>` +
    `<div class="gl-actions"><button type="button" class="gl-btn" id="gl-clear">${escapeHtml(ui.clear)}</button>${exportSaved}<span data-gl-undo>${renderUndo(opts.undo ?? null, lang)}</span></div>` +
    `<p id="gl-pcount" role="status" aria-live="polite" data-gl-pcount>${escapeHtml(results.count)}</p>` +
    `<p data-gl-summary>${renderSummary(state, view, lang)}</p>` +
    `<p class="gl-note" data-gl-ages>${escapeHtml(summariseAges(results.matched, opts.today, lang))}</p>` +
    `<div data-gl-glance>${renderGlance(opts.places, lang)}</div>` +
    `<div data-gl-rvnote>${renderViewNote(opts.allPlaces ?? opts.places, opts.recordView ?? DEFAULT_RECORD_VIEW, lang)}</div>` +
    `<div data-gl-presults>${results.list}</div>` +
    `<div data-gl-compare>${results.compare}</div>` +
    `<div data-gl-plan>${renderPlanSection({ lang, state, places: opts.places, saved, today: opts.today, plan: opts.plan ?? {}, canExport: opts.canExport === true })}</div>` +
    `<div data-gl-changes>${opts.changes === undefined ? '' : renderChanges(opts.changes, lang)}</div>` +
    renderCoverage(opts.places, lang) +
    renderQuality(opts.places, lang, opts.today) +
    renderHelpSection(lang) +
    `<details class="gl-must-panel"><summary>${escapeHtml(MUST_UI[lang].heading)}</summary><div data-gl-must>${mustPanelHtml({ lang, places: opts.places, must: opts.must })}</div></details>` +
    `<details class="gl-week-panel"><summary>${escapeHtml(DAY_UI[lang].heading)}</summary><div data-gl-week>${weekPanelHtml({ lang, places: opts.places, today: opts.today, days: opts.days, canExport: opts.canExport === true })}</div></details>` +
    `<details class="gl-sources-panel"${opts.recordForm?.editing !== undefined && opts.recordForm.editing !== null ? ' open' : ''}><summary>${escapeHtml(SOURCES_UI[lang].heading)}</summary><div data-gl-sources>${sourcesPanelHtml({ lang, places: opts.allPlaces ?? opts.places, listSource: opts.dataset?.provenance, canExport: opts.canExport === true, canLoad: opts.canLoadRecords === true, message: opts.recordsMessage, form: opts.recordForm, loadMode: opts.loadMode, canEdit: opts.canEditRecords === true })}</div></details>` +
    `<details class="gl-recordview-panel"><summary>${escapeHtml(RECORDVIEW_UI[lang].heading)}</summary><div data-gl-recordview>${renderRecordView(opts.allPlaces ?? opts.places, opts.recordView ?? DEFAULT_RECORD_VIEW, lang)}</div></details>` +
    `<details class="gl-dupes-panel"><summary>${escapeHtml(PLACEEDIT_UI[lang].dupHeading)}</summary><div data-gl-dupes>${renderDuplicates(opts.allPlaces ?? opts.places, lang, opts.canEditRecords === true)}</div></details>` +
    (opts.canLoadRecords === true
      ? `<details class="gl-editlog-panel"><summary>${escapeHtml(EDITLOG_UI[lang].heading)}</summary><div data-gl-editlog>${renderEditLog(opts.editLog ?? [], lang, opts.canExport === true)}</div></details>`
      : '') +
    `<details class="gl-problems-panel"><summary>${escapeHtml(PROBLEMS_UI[lang].heading)}</summary><div data-gl-problems>${problemsPanelHtml({ lang, places: opts.allPlaces ?? opts.places, today: opts.today, canExport: opts.canExport === true })}</div></details>` +
    `<details class="gl-disagree-panel"><summary>${escapeHtml(DISAGREE_UI[lang].heading)}</summary><div data-gl-disagree>${disagreePanelHtml({ lang, places: opts.allPlaces ?? opts.places, canExport: opts.canExport === true })}</div></details>` +
    `<details class="gl-recsearch"><summary>${escapeHtml(RECSEARCH_UI[lang].heading)}</summary>` +
    renderRecordSearch(opts.recordQuery ?? '', recordMatchesHtml({ lang, places: opts.allPlaces ?? opts.places, query: opts.recordQuery ?? '' }), lang) +
    `</details>` +
    `<details class="gl-quiz-panel"><summary>${escapeHtml(QUIZ_UI[lang].heading)}</summary><div data-gl-quiz>${quizPanelHtml({ lang, quiz: opts.quiz, best: opts.quizBest })}</div></details>` +
    `<details class="gl-tags-panel"><summary>${escapeHtml(TAG_UI[lang].heading)}</summary><div data-gl-tags>${tagsPanelHtml({ lang, places: opts.places, tags: opts.tags, tagFilter: opts.tagFilter })}</div></details>` +
    `<details class="gl-reminders-panel"><summary>${escapeHtml(REMINDER_UI[lang].heading)}</summary><div data-gl-reminders>${remindersPanelHtml({ lang, places: opts.places, today: opts.today, reminders: opts.reminders, canExport: opts.canExport === true })}</div></details>` +
    `<details class="gl-practice-panel"><summary>${escapeHtml(PRACTICE_UI[lang].heading)}</summary><div data-gl-practice>${renderPractice(opts.practice ?? startRound({}, practiceIds()), practiceCards(lang), lang)}</div></details>` +
    `<details class="gl-visitlog"><summary>${escapeHtml(LOG_UI[lang].heading)}</summary><div data-gl-visitlog>${visitLogHtml(opts)}</div></details>` +
    `<details class="gl-notesearch"><summary>${escapeHtml(NOTESEARCH_UI[lang].heading)}</summary>` +
    renderNotesSearch(opts.notesQuery ?? '', renderNoteMatches(searchNotes(opts.notes ?? {}, opts.places, opts.notesQuery ?? ''), opts.places, opts.notesQuery ?? '', lang), lang) +
    `</details>` +
    `<details class="gl-searches"><summary>${escapeHtml(SEARCH_UI[lang].heading)}</summary><div data-gl-searches>` +
    renderSearchesPanel({ lang, searches: opts.searches ?? [], message: opts.searchMessage ?? '' }) +
    `</div></details>` +
    `<details class="gl-lists"><summary>${escapeHtml(LIST_UI[lang].heading)}</summary><div data-gl-lists>` +
    renderListsPanel({ lang, lists: opts.lists ?? [], places: opts.places, message: opts.listMessage ?? '', termIds: state.features, canExport: opts.canExport === true }) +
    `</div></details>` +
    `<details class="gl-data"><summary>${escapeHtml(BACKUP_UI[lang].heading)}</summary><div data-gl-data>` +
    renderDataPanel({ lang, canExport: opts.canExport === true, counts: opts.data?.counts ?? countData({ saved, notes: opts.notes ?? {}, plan: opts.plan ?? {}, visits: opts.visits ?? {}, recent: opts.recent ?? [], lists: opts.lists ?? [], searches: opts.searches ?? [], tags: opts.tags ?? {}, reminders: opts.reminders ?? {}, must: opts.must ?? [], days: opts.days ?? {} }), confirming: opts.data?.confirming === true, message: opts.data?.message ?? '' }) +
    `</div></details>` +
    `<p class="gl-source" data-gl-attribution>${escapeHtml(sourceLine)}</p>` +
    `</section>`
  );
}

