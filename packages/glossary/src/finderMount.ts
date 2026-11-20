import { BACKUP_IDS, BACKUP_MIME, BACKUP_UI, backupFilename, backupToStorage, countData, createBackup, parseBackup, renderDataPanel, restoredText, serialiseBackup } from './backup';
import { fixFrench } from './frTypography';
import { announcement, nextAnnouncement, renderAnnouncement, type AnnounceKind } from './announce';
import { LISTS_STORE_KEY, LIST_IDS, addToList, createList, deleteList, insertList, listErrorText, parseDeleteListId, parseLists, parsePickListId, parseRemoveListId, removeFromList, renderListsPanel, serialiseLists, type Lists } from './savedLists';
import { CORRECTION_MIME, composeCorrection, correctionFilename, fixFeatureId, fixNoteId, knownFeature, parseFixId } from './correction';
import { escapeHtml } from './text';
import { CREDITS_EXPORT_ID, CREDITS_MIME, creditsFilename, creditsText, sourceGroups } from './sourcesPanel';
import { RECORD_EDIT_UI, parseEditRecordId, parseRemovePlaceId, parseRemoveRecordId, removePlace, removeRecord } from './recordSources';
import { lookupTerm } from './glossary';
import {
  DEFAULT_RECORD_VIEW, RECORDVIEW_IDS, RECORD_VIEW_KEY, applyRecordView, isDefaultRecordView, parseRecordView, parseSourceBoxId, renderRecordView, renderViewNote, serialiseRecordView,
  setSourceCounted, setTierChoice, sourceBoxId, sourceNames, viewChangeText, type RecordView,
} from './recordView';
import { RECORDFORM_UI } from './recordForm';
import { DRAFT_FIELDS, EMPTY_DRAFT, RECORDFORM_CANCEL_ID, RECORDFORM_IDS, addMessage, addRecord, draftFromRecord, replaceMessage, replaceRecord, cleanDraft, fieldOf, nextDraft, renderRecordForm, type RecordDraft } from './recordForm';
import { parseSourceRenameButtonId, renameSource, sourceNameInputId, sourceRenameMessage } from './sourceEdit';
import { RECORDS_PRINT_ID, recordsPrintFile } from './recordsPrint';
import { PREVIEW_CHECK_ID, previewLines, previewLoad, renderPreview } from './recordsPreview';
import { mergeMessage, mergeRecords, parseLoadModeId, type LoadMode } from './recordsMerge';
import { renderGlance } from './glance';
import {
  PLACEEDIT_UI, duplicateGroups, joinPlaces, parseJoinId, parseRenameButtonId, renameInputId, renameMessage, renamePlace, renderDuplicates,
} from './placeEdit';
import {
  EDITLOG_EXPORT_ID, EDITLOG_MIME, EDIT_LOG_KEY, editLogFilename, editLogToText, logEdit, makeEntry, parseEditLog, renderEditLog, serialiseEditLog, type EditEntry, type EditKind,
} from './editLog';
import { TEMPLATE_EXPORT_ID, TEMPLATE_FILENAME, templateCsv } from './recordsGuide';
import { LICENCEVIEW_EXPORT_ID, LICENCEVIEW_MIME, licenceViewFilename, licenceViewText, renderLicenceView } from './licenceRecords';
import { YEARS_EXPORT_ID, YEARS_MIME, renderYears, yearsFilename, yearsText } from './recordYears';
import { REPORT_EXPORT_ID, REPORT_MIME, renderReport, reportFilename, reportText } from './recordsReport';
import { SOURCECOMPARE_IDS, SOURCECOMPARE_MIME, compareSourceFromValue, renderCompareTable, sourceCompareFilename, sourceCompareText } from './sourceCompare';
import { SNAPSHOTS_KEY, SNAPSHOT_IDS, SNAPSHOT_UI, addSnapshot, matchesSnapshot, parseSnapshotButtonId, parseSnapshots, snapshotButtonId, SNAPSHOT_MIME, snapshotDiffFilename, snapshotDiffText, removeSnapshot, renderSnapshots, serialiseSnapshots, snapshotMessage, snapshotPlaces, type RecordSnapshot } from './recordSnapshots';
import { PREVIEWDETAIL_EXPORT_ID, PREVIEWDETAIL_MIME, previewDetailFilename, previewDiffText, renderPreviewDetail } from './previewDetail';
import { applyOpenPanels, panelFromTarget, togglePanel } from './panelState';
import { MATRIX_EXPORT_ID, MATRIX_MIME, matrixFilename, matrixToCsv, renderMatrix } from './placesMatrix';
import { TIDY_SOURCE_ID, parseTidyButtonId, renderTidy, tidyMessage, tidyPlan, tidySourceFromValue, tidyWouldChange, type TidyKind } from './recordsTidy';
import { INFOFILTER_IDS, INFOFILTER_UI, NO_INFO_FILTER, matchesInfoFilter, areaFromChoice, isNoInfoFilter, kindFromChoice, pruneInfoFilter, renderInfoFilter, renderInfoPanel, type InfoFilter } from './placeInfo';
import { EMPTY_INFO_DRAFT, INFOFORM_IDS, INFOFORM_UI, INFO_FIELDS, draftFromInfo, infoMessage, removePlaceInfo, renderInfoForm, setPlaceInfo, type InfoDraft, type InfoProblem, type InfoResult } from './placeInfoForm';
import { GAPS_EXPORT_ID, GAPS_MIME, gapsFilename, gapsToText, parseGapShowId, renderGaps } from './gaps';
import { SOURCEVIEW_EXPORT_ID, SOURCEVIEW_MIME, SOURCEVIEW_SELECT_ID, renderSourceTable, sourceFromValue, sourceViewFilename, sourceViewText } from './sourceRecords';
import { FEATUREVIEW_EXPORT_ID, FEATUREVIEW_MIME, FEATUREVIEW_SELECT_ID, featureViewFilename, featureViewText, isFeatureId, renderFeatureTable } from './featureRecords';
import { RECORDAGES_EXPORT_ID, RECORDAGES_MIME, oldRecordsFilename, oldRecordsToText, parseOldRecordShowId, renderRecordAges } from './recordAges';
import { DISAGREE_EXPORT_ID, DISAGREE_MIME, disagreementRows, disagreementsFilename, disagreementsToText, parseDisagreeShowId } from './recordDisagreements';
import { MAX_RECORD_QUERY, RECSEARCH_INPUT_ID, parseRecordShowId } from './recordSearch';
import { PROBLEMS_EXPORT_ID, PROBLEMS_MIME, parseProblemShowId, problemRows, problemsFilename, problemsToText } from './recordProblems';
import { SEEN_STORE_KEY, emptySeenDraft, insertObservation, isSeenFilter, parseObservations, removeObservation, seenRows, serialiseObservations, setObservation, SEEN_FIELDS, seenFieldOf, type Observations, type SeenDraft, type SeenFilter, type SeenProblem } from './observations';
import { SEEN_IDS, SEEN_RECORDS_FILENAME, SEEN_UI, parseSeenRemoveId, seenMessage, seenRemovedMessage, seenTextFilename, seenToText, shareSeen, type ShareProblem } from './observationsRender';
import { RECORDSCSV_IDS, RECORDS_CSV_MIME, RECORDSCSV_UI, importMessage, recordsFilename, recordsFromCsv, recordsToCsv } from './recordsCsv';
import { MUST_STORE_KEY, MUST_UI, featureName, parseMust, parseMustId, parseMustShowId, serialiseMust, toggleMust, type MustHaves } from './mustHaves';
import {
  DAYS_STORE_KEY, DAY_EXPORT_ID, DAY_TEXT_MIME, DAY_UI, dayName, dayOf, isWeekday, parseDayId, parseDayShowId, parseDays, pruneDays, serialiseDays, setDay, weekFilename, weekToText, weekView, type DayPlan, type Weekday,
} from './dayPlan';
import {
  QUIZ_BEST_KEY, QUIZ_UI, betterBest, currentQuestion, isDone, next as quizNext, parseBest, parseQuizId, pick as quizPick, serialiseBest, startQuiz, type Best, type QuizState,
} from './termQuiz';
import {
  TAGS_STORE_KEY, addTag, insertTag, parseTagAddId, pruneTags, TAG_UI, parseTagShowId, parseTags, parseUntagId, removeTag, serialiseTags, tagInputId, tagResultText, tagsOf, TAG_FILTER_ID, type Tags,
} from './placeTags';
import {
  CALENDAR_MIME, REMINDERS_STORE_KEY, REMINDER_EXPORT_ID, REMINDER_UI, dueList, pruneReminders, parseClearReminderId, parseDueShowId, parseReminderFieldId, parseReminders, reminderDate,
  remindersFilename, remindersToIcs, serialiseReminders, setReminder, type Reminders,
} from './reminders';
import {
  PRACTICE_STORE_KEY, PRACTICE_UI, parsePracticeId, parseProgress, practiceCards, practiceIds, renderPractice, serialiseProgress, startRound, step as practiceStep, type PracticeState,
} from './termPractice';
import { visitLog, visitLogFilename, visitLogToText, LOG_EXPORT_ID } from './visitLog';
import { NOTESEARCH_INPUT_ID, parseShowId, renderNoteMatches, searchNotes } from './notesSearch';
import { listPrintFile, parsePrintListId } from './listPrint';
import { SEARCHES_STORE_KEY, SEARCH_IDS, deleteSearch, insertSearch, parseDeleteSearchId, parseSearches, parseUseSearchId, renderSearchesPanel, saveSearch, searchErrorText, serialiseSearches, stateOf, type SavedSearches } from './savedSearches';
import { listToFile, parseExportListId } from './listSummary';
import { parseMoveId, positionOf, swapSaved, moveId } from './visitOrder';
import { parseSayId, speechChunks, speechSentences } from './readAloud';
import { applyRelaxation, parseRelaxId } from './relaxSuggestions';
import { GROUP_UI } from './featureGroups';
import { SHORTCUTS_STORE_KEY, SHORTCUTS_TOGGLE_ID, interpretKey, parseShortcuts, renderShortcuts, serialiseShortcuts } from './shortcuts';
import { CLOSED_TOUR, TOUR_IDS, closeTour, nextStep, prevStep, renderTour, startTour, type TourState } from './tour';
import { UNDO_ID, renderUndo, restoreSaved, savedPosition, type UndoAction } from './undo';
import { VISITS_STORE_KEY, parseVisitId, parseVisits, serialiseVisits, toggleVisited, visitDate, type Visits } from './visited';
import { parseNameId, renderNameSuggestions, suggestNames } from './nameSuggestions';
import { summariseAges } from './listAges';
import { CSV_MIME, csvFilename, planToCsv } from './planCsv';
import { groupById, renderGroups, parseGroupId, toggleGroup } from './featureGroups';
import { renderSummary } from './filterSummary';
import { PRINT_MIME, printFilename, renderPrintPage } from './printPlan';
import { RECENT_CLEAR_ID, RECENT_STORE_KEY, addRecent, parseRecent, parseRecentId, renderRecent, serialiseRecent, type RecentSearches } from './recentSearches';
import { NO_CHANGES, diffPlaces, hasChanges, renderChanges, type PlaceChanges } from './changes';
import type { PlaceDataset } from './dataset';
import {
  EMPTY_STATE,
  decodeState,
  encodeState,
  isEmptyState,
  normaliseState,
  parseStoredState,
  serialiseState,
  toggleFeature,
  type FinderState,
} from './filters';
import { pruneSaved, parseSaved, serialiseSaved, toggleSaved } from './favourites';
import { PLAN_STORE_KEY, askId, buildPlan, parseAskId, parsePlan, planToText, serialisePlan, setAsked, type PlanState } from './plan';
import { composeMessage, messageFilename, messageToText, parseMessageId } from './outingMessage';
import { seenFormHtml, seenListHtml, seenShareHtml, type SeenPanelOptions, type SeenPanelState, disagreePanelHtml, recordMatchesHtml, problemsPanelHtml, sourcesPanelHtml, type RecordFormState, mustPanelHtml, quizPanelHtml, weekPanelHtml, remindersPanelHtml, renderFinderShell, renderPlanSection, renderSuggestions, resultsView, tagsPanelHtml, visitLogHtml, type ResultsView } from './finderRender';
import { NOTES_STORE_KEY, getNote, parseNotes, serialiseNotes, setNote, type Notes } from './notes';
import type { IndexStore } from './offlineIndex';
import type { Place } from './places';
import { DEFAULT_PREFS, createPrefs, type Prefs } from './prefs';
import { PAGE_SIZE, DEFAULT_VIEW, SORT_KEYS, normaliseView, parseView, serialiseView, type FinderView } from './view';
import { placeFilename, placeToText } from './placeText';
import { TEXT_MIME, comparisonToText, savedToText, toExportFile, type ExportFile } from './textExport';
import { TERMS, type Lang } from './plainTerms';

/** What the finder needs from a DOM element. HTMLElement satisfies it. */
export interface FinderElement {
  innerHTML: string;
  focus?: () => void;
}

export interface FinderRoot {
  innerHTML: string;
  querySelector(selectors: string): FinderElement | null;
  /** Events bubble to the root, so one listener per type covers every control. */
  /** `capture` is asked for only for "toggle", which does not bubble. A host may ignore it. */
  addEventListener(type: string, listener: (event: { readonly target: unknown }) => void, capture?: boolean): void;
}

/** For example window.location.hash plus history.replaceState. */
export interface HashHost {
  get(): string;
  set(hash: string): void;
}

export interface FinderOptions {
  readonly lang: Lang;
  readonly places?: readonly Place[];
  readonly dataset?: PlaceDataset | null;
  /** YYYY-MM-DD, used to note old sources. */
  readonly today: string;
  /** Keeps choices, list settings, saved places and display settings on this device. */
  readonly store?: IndexStore;
  /** Makes a filtered view shareable as a link. Wins over the store when it has choices. */
  readonly hash?: HashHost;
  readonly isOnline?: () => boolean;
  /** Turns on the display-settings panel. Receives the CSS to put in a <style> element. */
  readonly applyStyles?: (css: string) => void;
  /** For example () => matchMedia('(prefers-reduced-motion: reduce)').matches. */
  readonly systemReducedMotion?: () => boolean;
  /** Turns on the "copy as text" buttons. The host copies or downloads the file. */
  readonly onExport?: (file: ExportFile) => void;
  /** Turns on loading a table of records. The finder shows the places at once; the host keeps them. */
  readonly onRecords?: (places: readonly Place[]) => void;
  /** Turns on the "Read aloud" buttons. The host says each piece of text in order, in the language given. */
  readonly onSpeak?: (text: string, lang: Lang) => void;
}

export interface FinderController {
  getState(): FinderState;
  getView(): FinderView;
  getPrefs(): Prefs;
  /** Saved place ids, in the order saved. */
  getSaved(): readonly string[];
  /** The person's own notes by place id. */
  getNotes(): Notes;
  /** The person's own tags by place id. */
  getTags(): Tags;
  /** What the person saw for themselves. */
  getSeen(): Observations;
  /** The person's own "check again" dates by place id. */
  getReminders(): Reminders;
  /** The features the person cannot do without. */
  getMust(): MustHaves;
  /** The person's own week plan by place id. */
  getDays(): DayPlan;
  /** Questions the person has ticked as asked, by place id. */
  getPlan(): PlanState;
  /** The person's own named lists of places. */
  getLists(): Lists;
  /** The person's own saved searches. */
  getSearches(): SavedSearches;
  /** What the last setPlaces call changed (empty before the first one). */
  getChanges(): PlaceChanges;
  /** Place ids currently selected for comparison, in the order chosen. */
  getComparison(): readonly string[];
  setLang(lang: Lang): void;
  setPlaces(places: readonly Place[], dataset?: PlaceDataset | null): void;
  refreshConnection(): void;
  clear(): void;
}

export const FINDER_STORE_KEY = 'glossary-finder-state';
export const FINDER_VIEW_KEY = 'glossary-finder-view';
export const SAVED_STORE_KEY = 'glossary-saved-places';
export { NOTES_STORE_KEY, PLAN_STORE_KEY };

interface Target {
  readonly id: string;
  readonly checked: boolean | undefined;
  readonly value: string | undefined;
}

function readTarget(target: unknown): Target | null {
  if (typeof target !== 'object' || target === null) return null;
  const t = target as { id?: unknown; checked?: unknown; value?: unknown };
  if (typeof t.id !== 'string' || t.id === '') return null;
  return {
    id: t.id,
    checked: typeof t.checked === 'boolean' ? t.checked : undefined,
    value: typeof t.value === 'string' ? t.value : undefined,
  };
}

function setProp(el: unknown, key: 'checked' | 'value', value: boolean | string): void {
  if (typeof el === 'object' && el !== null && key in el) (el as Record<string, unknown>)[key] = value;
}

function readStore<T>(store: IndexStore | undefined, key: string, parse: (raw: string) => T | null): T | null {
  try {
    const raw = store?.getItem(key);
    return typeof raw === 'string' ? parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStore(store: IndexStore | undefined, key: string, value: string): void {
  try {
    store?.setItem(key, value);
  } catch {
    // Storage blocked or full: everything still works for this visit.
  }
}

/**
 * Renders the place finder into `root` and keeps it live: features, name search, feature
 * suggestions, sort, recent-only, saved places, "show more", a two-place comparison and
 * display settings. Everything a person chooses stays on this device. Keyboard focus is kept
 * where the person left it after each change.
 */
/** French text is given its spacing; English is left as it is. */
function isWeekdayValue(value: string): value is Weekday {
  return isWeekday(value);
}

function fixIf(lang: Lang, text: string): string {
  return lang === 'fr' ? fixFrench(text) : text;
}

export function mountPlaceFinder(root: FinderRoot, options: FinderOptions): FinderController {
  let lang = options.lang;
  /** Every place held. `places` is the same list with only the records that are counted. */
  let allPlaces: readonly Place[] = options.places ?? options.dataset?.places ?? [];
  let recordView: RecordView = readStore(options.store, RECORD_VIEW_KEY, parseRecordView) ?? DEFAULT_RECORD_VIEW;
  let places: readonly Place[] = applyRecordView(allPlaces, recordView);
  let dataset: PlaceDataset | null = options.dataset ?? null;
  let selected: number[] = [];
  let limit = PAGE_SIZE;
  const prefs =
    options.applyStyles === undefined
      ? null
      : createPrefs({
          apply: options.applyStyles,
          ...(options.store !== undefined ? { store: options.store } : {}),
          ...(options.systemReducedMotion !== undefined ? { systemReducedMotion: options.systemReducedMotion } : {}),
        });

  let view = readStore(options.store, FINDER_VIEW_KEY, parseView) ?? DEFAULT_VIEW;
  // Notes are kept even for places not loaded yet (data may arrive later); the cap bounds them.
  let notes: Notes = readStore(options.store, NOTES_STORE_KEY, parseNotes) ?? {};
  let changes: PlaceChanges = NO_CHANGES;
  let plan: PlanState = readStore(options.store, PLAN_STORE_KEY, parsePlan) ?? {};
  let saved: readonly string[] = pruneSaved(readStore(options.store, SAVED_STORE_KEY, parseSaved) ?? [], places);

  let visits: Visits = readStore(options.store, VISITS_STORE_KEY, parseVisits) ?? {};
  let shortcuts = readStore(options.store, SHORTCUTS_STORE_KEY, (raw) => parseShortcuts(raw)) ?? false;
  let tour: TourState = CLOSED_TOUR;
  let undoAction: UndoAction | null = null;
  let lastAnnouncement = '';
  let dataMessage = '';
  let confirmingForget = false;
  let recent: RecentSearches = readStore(options.store, RECENT_STORE_KEY, parseRecent) ?? [];
  let lists: Lists = readStore(options.store, LISTS_STORE_KEY, parseLists) ?? [];
  let listMessage = '';
  let searches: SavedSearches = readStore(options.store, SEARCHES_STORE_KEY, parseSearches) ?? [];
  let searchMessage = '';
  let notesQuery = '';
  let recordQuery = '';
  let featureChoice = '';
  let sourceChoice = '';
  let seenList: Observations = readStore(options.store, SEEN_STORE_KEY, parseObservations) ?? [];
  let seenPlace: number | null = null;
  let seenDraft: SeenDraft = emptySeenDraft(options.today);
  let seenNote = '';
  let seenProblems: readonly SeenProblem[] = [];
  let seenFilter: SeenFilter = 'all';
  let shareName = '';
  let shareLicence = '';
  let shareProblemsNow: readonly ShareProblem[] = [];
  let shareNote = '';
  let infoFilter: InfoFilter = NO_INFO_FILTER;
  let infoPlace: number | null = null;
  let infoDraft: InfoDraft = EMPTY_INFO_DRAFT;
  let infoNote = '';
  let infoProblems: readonly InfoProblem[] = [];
  let openPanels: ReadonlySet<string> = new Set();
  let tidySource = '';
  let tidyNote = '';
  let compareA = '';
  let compareB = '';
  let tags: Tags = readStore(options.store, TAGS_STORE_KEY, parseTags) ?? {};
  let tagFilter = '';
  let must: MustHaves = readStore(options.store, MUST_STORE_KEY, parseMust) ?? [];
  let days: DayPlan = readStore(options.store, DAYS_STORE_KEY, parseDays) ?? {};
  let quizBest: Best | null = readStore(options.store, QUIZ_BEST_KEY, parseBest) ?? null;
  let quiz: QuizState = startQuiz(practiceIds());
  let reminders: Reminders = readStore(options.store, REMINDERS_STORE_KEY, parseReminders) ?? {};
  let practice: PracticeState = startRound(readStore(options.store, PRACTICE_STORE_KEY, (raw) => parseProgress(raw, practiceIds())) ?? {}, practiceIds());

  function initialState(): FinderState {
    const fromHash = options.hash === undefined ? EMPTY_STATE : decodeState(options.hash.get());
    if (!isEmptyState(fromHash)) return fromHash;
    return readStore(options.store, FINDER_STORE_KEY, parseStoredState) ?? EMPTY_STATE;
  }
  let state = initialState();

  const canExport = options.onExport !== undefined;
  const canLoadRecords = options.onRecords !== undefined;
  let recordsMessage = '';
  let editLog: readonly EditEntry[] = readStore(options.store, EDIT_LOG_KEY, parseEditLog) ?? [];
  /** Writes one line in the list of changes made on this device. Call it before the page is redrawn. */
  const note = (kind: EditKind, parts: { place?: string; detail?: string; count?: number } = {}): void => {
    editLog = logEdit(editLog, makeEntry(options.today, kind, parts));
    writeStore(options.store, EDIT_LOG_KEY, serialiseEditLog(editLog));
  };
  let loadMode: LoadMode = 'replace';
  let snapshots: readonly RecordSnapshot[] = readStore(options.store, SNAPSHOTS_KEY, parseSnapshots) ?? [];
  let snapshotNote = '';
  let snapshotShowing: number | null = null;
  let recordForm: RecordFormState = { draft: EMPTY_DRAFT, message: '', problems: [] };
  const matchesInfoFilterNow = (p: Place): boolean => matchesInfoFilter(p, activeInfoFilter());
  const INFOFORM_UI_INVALID = (n: number): string => INFOFORM_UI[lang].invalid(n);

  /** The kind and area the list is narrowed to. A choice that no place can match any more counts as "any". */
  const activeInfoFilter = (): InfoFilter => pruneInfoFilter(infoFilter, places);

  const extra = (): { seen: Observations; view: FinderView; saved: readonly string[]; limit: number; canExport: boolean; canSpeak: boolean; canEditRecords: boolean; notes: Notes; visits: Visits; lists: Lists; tags: Tags; reminders: Reminders; must: MustHaves; days: DayPlan; infoFilter: InfoFilter } => ({
    infoFilter: activeInfoFilter(),
    seen: seenList,
    view,
    saved,
    limit,
    canExport,
    canEditRecords: canLoadRecords && isDefaultRecordView(recordView),
    canSpeak: options.onSpeak !== undefined,
    notes,
    visits,
    lists,
    tags,
    reminders,
    must,
    days,
  });

  function persistState(): void {
    const encoded = encodeState(state);
    options.hash?.set(encoded === '' ? '' : `#${encoded}`);
    writeStore(options.store, FINDER_STORE_KEY, serialiseState(state));
  }

  function compute(): ResultsView {
    return resultsView(places, state, lang, options.today, selected, extra());
  }

  function planOptions(): Parameters<typeof renderPlanSection>[0] {
    return { lang, state, places, saved, today: options.today, plan, canExport };
  }

  function drawPlan(): void {
    const el = root.querySelector('[data-gl-plan]');
    if (el !== null) el.innerHTML = renderPlanSection(planOptions());
  }

  function dataCounts(): ReturnType<typeof countData> {
    return countData({ saved, notes, plan, visits, recent, lists, searches, tags, reminders, must, days, seen: seenList });
  }

  function dataPanel(): string {
    return renderDataPanel({ lang, canExport, counts: dataCounts(), confirming: confirmingForget, message: dataMessage });
  }

  /** The notes-search results. Only this region is redrawn, so the person's typing is not disturbed. */
  function drawNoteMatches(): void {
    const el = root.querySelector('[data-gl-nsr]');
    if (el !== null) el.innerHTML = renderNoteMatches(searchNotes(notes, places, notesQuery), places, notesQuery, lang);
  }

  /** The table for the chosen feature. Only this region is redrawn, so the list keeps the focus. */
  function drawFeatureTable(): void {
    const el = root.querySelector('[data-gl-fview]');
    if (el !== null) el.innerHTML = renderFeatureTable(places, featureChoice, lang, canExport);
  }

  /** The table for the chosen source. Only this region is redrawn, so the list keeps the focus. */
  function drawSourceTable(): void {
    const el = root.querySelector('[data-gl-sview]');
    if (el !== null) el.innerHTML = renderSourceTable(allPlaces, sourceChoice, lang, canExport);
  }

  /** The comparison of the two chosen sources. Only this region is redrawn, so the lists keep the focus. */
  function drawCompareTable(): void {
    const el = root.querySelector('[data-gl-sc]');
    if (el !== null) el.innerHTML = renderCompareTable(allPlaces, compareA, compareB, lang, canExport);
  }

  /** The record-search results. Only this region is redrawn, so the person's typing is not disturbed. */
  function drawRecordMatches(): void {
    const el = root.querySelector('[data-gl-rsr]');
    if (el !== null) el.innerHTML = recordMatchesHtml({ lang, places: allPlaces, query: recordQuery });
  }

  /** Puts a place's name in the name search, so the list shows it. */
  function showPlaceByIndex(index: number): void {
    const place = places[index];
    if (place === undefined) return;
    setProp(root.querySelector('#gl-pq'), 'value', place.name);
    updateState({ ...state, query: place.name });
    root.querySelector('#gl-pq')?.focus?.();
  }

  function addTagFromBox(index: number): void {
    const place = places[index];
    if (place === undefined) return;
    const box = root.querySelector(`#${tagInputId(index)}`) as { value?: unknown } | null;
    const text = typeof box?.value === 'string' ? box.value : '';
    const change = addTag(tags, place.id, text);
    if (change.result === 'added') {
      tags = change.tags;
      writeStore(options.store, TAGS_STORE_KEY, serialiseTags(tags));
    }
    draw();
    const spoken = tagResultText(change.result, tagsOf(tags, place.id).at(-1) ?? '', place.name, lang);
    announceText(spoken);
    root.querySelector(`#${tagInputId(index)}`)?.focus?.();
  }

  function removeTagAt(index: number, tagIndex: number): void {
    const place = places[index];
    const tag = place === undefined ? undefined : tagsOf(tags, place.id)[tagIndex];
    if (place === undefined || tag === undefined) return;
    undoAction = { kind: 'tag', placeId: place.id, tag, position: tagIndex };
    tags = removeTag(tags, place.id, tag);
    writeStore(options.store, TAGS_STORE_KEY, serialiseTags(tags));
    draw();
    announceText(fixIf(lang, TAG_UI[lang].removed(tag, place.name)));
    root.querySelector(`#${tagInputId(index)}`)?.focus?.();
  }

  function chooseTag(key: string): void {
    tagFilter = key;
    const el = root.querySelector('[data-gl-tags]');
    if (el !== null) el.innerHTML = tagsPanelHtml({ lang, places, tags, tagFilter });
    root.querySelector(`#${TAG_FILTER_ID}`)?.focus?.();
  }

  function changeReminder(index: number, date: string): void {
    const place = places[index];
    if (place === undefined) return;
    const next = setReminder(reminders, place.id, date);
    if (next === reminders && date !== '') return;
    const was = reminderDate(reminders, place.id);
    if (date === '' && was !== '') undoAction = { kind: 'reminder', placeId: place.id, date: was };
    reminders = next;
    writeStore(options.store, REMINDERS_STORE_KEY, serialiseReminders(reminders));
    draw();
    announceText(date === '' ? fixIf(lang, REMINDER_UI[lang].cleared(place.name)) : fixIf(lang, REMINDER_UI[lang].set(place.name, date)));
    root.querySelector(`#gl-due-${index}`)?.focus?.();
  }

  function setMust(termId: string, on: boolean): void {
    if (must.includes(termId) === on) return;
    must = toggleMust(must, termId);
    writeStore(options.store, MUST_STORE_KEY, serialiseMust(must));
    draw();
    const name = featureName(termId, lang);
    announceText(fixIf(lang, on ? MUST_UI[lang].on(name) : MUST_UI[lang].off(name)));
    root.querySelector(`#gl-must-${termId}`)?.focus?.();
  }

  function changeDay(index: number, value: string): void {
    const place = places[index];
    if (place === undefined) return;
    const next = setDay(days, place.id, value);
    if (next === days) return;
    const was = dayOf(days, place.id);
    if (value === '' && was !== null) undoAction = { kind: 'day', placeId: place.id, day: was };
    days = next;
    writeStore(options.store, DAYS_STORE_KEY, serialiseDays(days));
    draw();
    const spoken = value === '' ? DAY_UI[lang].cleared(place.name) : DAY_UI[lang].set(place.name, isWeekdayValue(value) ? dayName(value, lang) : value);
    announceText(fixIf(lang, spoken));
    root.querySelector(`#gl-day-${index}`)?.focus?.();
  }

  /** Changes which records are counted, keeps the choice, redraws and says what changed. Nothing is deleted. */
  function changeRecordView(next: RecordView, change: Parameters<typeof viewChangeText>[0]): void {
    if (next === recordView) return;
    recordView = next;
    writeStore(options.store, RECORD_VIEW_KEY, serialiseRecordView(recordView));
    places = applyRecordView(allPlaces, recordView);
    selected = [];
    limit = PAGE_SIZE;
    paint();
    announceText(viewChangeText(change, lang));
    const at = change.kind === 'source' ? sourceNames(allPlaces).indexOf(change.source) : -1;
    root.querySelector(`#${at === -1 ? RECORDVIEW_IDS.tier : sourceBoxId(at)}`)?.focus?.();
  }

  /** Gives a place the name typed in its box. With a problem, nothing changes and the reason is said. */
  function doRename(index: number): void {
    const place = places[index];
    if (options.onRecords === undefined || place === undefined || !isDefaultRecordView(recordView)) return;
    const box = root.querySelector(`#${renameInputId(index)}`) as { value?: unknown } | null;
    const result = renamePlace(allPlaces, index, typeof box?.value === 'string' ? box.value : '');
    const message = renameMessage(result, place.name, lang);
    if (result.outcome === 'renamed') {
      undoAction = { kind: 'rename', places: allPlaces, saved };
      note('rename', { place: place.name, detail: result.name });
      usePlaces(result.places, dataset);
      options.onRecords(result.places);
    }
    announceText(message);
    root.querySelector(`#${result.outcome === 'renamed' ? UNDO_ID : renameInputId(index)}`)?.focus?.();
  }

  /** Gives a source the name typed in its box, on every record that carries it. */
  function doRenameSource(index: number): void {
    const from = sourceNames(allPlaces)[index];
    if (options.onRecords === undefined || from === undefined || !isDefaultRecordView(recordView)) return;
    const box = root.querySelector(`#${sourceNameInputId(index)}`) as { value?: unknown } | null;
    const result = renameSource(allPlaces, from, typeof box?.value === 'string' ? box.value : '');
    if (result.outcome === 'renamed') {
      undoAction = { kind: 'source', places: allPlaces, saved };
      note('rename-source', { place: from, detail: result.name });
      usePlaces(result.places, dataset);
      options.onRecords(result.places);
    }
    announceText(sourceRenameMessage(result, from, lang));
    root.querySelector(`#${result.outcome === 'renamed' ? UNDO_ID : sourceNameInputId(index)}`)?.focus?.();
  }

  /** Joins the entries that share a name with the entry at `firstIndex`. Every record is kept once. */
  function doJoin(firstIndex: number): void {
    const group = duplicateGroups(allPlaces).find((g) => g.indexes[0] === firstIndex);
    if (options.onRecords === undefined || group === undefined || !isDefaultRecordView(recordView)) return;
    const result = joinPlaces(allPlaces, group.indexes);
    if (result.places === allPlaces) return;
    undoAction = { kind: 'join', places: allPlaces, saved };
    note('join', { place: group.name, count: result.moved });
    usePlaces(result.places, dataset);
    writeStore(options.store, SAVED_STORE_KEY, serialiseSaved(saved));
    options.onRecords(result.places);
    announceText(fixIf(lang, PLACEEDIT_UI[lang].joined(group.name, result.moved)));
    root.querySelector(`#${UNDO_ID}`)?.focus?.();
  }

  /** Removes one record. The step can be undone; the host is told each time. */
  function dropRecord(placeIndex: number, claimIndex: number): void {
    const place = places[placeIndex];
    const claim = place?.claims[claimIndex];
    if (options.onRecords === undefined || place === undefined || claim === undefined) return;
    if (!isDefaultRecordView(recordView)) return;
    const next = removeRecord(allPlaces, placeIndex, claimIndex);
    undoAction = { kind: 'record', places: allPlaces, saved };
    note('remove-record', { place: place.name, detail: claim.termId });
    usePlaces(next, dataset);
    options.onRecords(next);
    announceText(fixIf(lang, RECORD_EDIT_UI[lang].removedRecord(place.name, lookupTerm(claim.termId, lang).term)));
    root.querySelector(`#${UNDO_ID}`)?.focus?.();
  }

  /** Removes one place and its records. The step can be undone, and a saved place is saved again then. */
  function dropPlace(placeIndex: number): void {
    const place = places[placeIndex];
    if (options.onRecords === undefined || place === undefined) return;
    if (!isDefaultRecordView(recordView)) return;
    const next = removePlace(allPlaces, placeIndex);
    undoAction = { kind: 'place', places: allPlaces, saved };
    note('remove-place', { place: place.name });
    usePlaces(next, dataset);
    writeStore(options.store, SAVED_STORE_KEY, serialiseSaved(saved));
    options.onRecords(next);
    announceText(fixIf(lang, RECORD_EDIT_UI[lang].removedPlace(place.name)));
    root.querySelector(`#${UNDO_ID}`)?.focus?.();
  }

  /** Puts a held record in the form so it can be changed. The sources panel is opened, because the form is in it. */
  function startEdit(placeIndex: number, claimIndex: number): void {
    const place = allPlaces[placeIndex];
    const claim = place?.claims[claimIndex];
    if (options.onRecords === undefined || place === undefined || claim === undefined || !isDefaultRecordView(recordView)) return;
    recordForm = { draft: draftFromRecord(place, claim), message: '', problems: [], editing: { placeIndex, claimIndex } };
    paint();
    announceText(RECORDFORM_UI[lang].editLegend);
    root.querySelector(`#${RECORDFORM_IDS.status}`)?.focus?.();
  }

  function cancelEdit(): void {
    if (recordForm.editing === undefined || recordForm.editing === null) return;
    recordForm = { draft: EMPTY_DRAFT, message: RECORDFORM_UI[lang].cancelled, problems: [] };
    paint();
    announceText(RECORDFORM_UI[lang].cancelled);
    root.querySelector('#gl-pq')?.focus?.();
  }

  /** Saves the changed record in place of the old one. With a problem, the form stays as it is and says what to fix. */
  function saveEdit(draft: RecordDraft, target: { readonly placeIndex: number; readonly claimIndex: number }): void {
    if (options.onRecords === undefined) return;
    const place = allPlaces[target.placeIndex];
    const filled = { ...draft, placeName: place?.name ?? draft.placeName };
    const result = replaceRecord(allPlaces, target.placeIndex, target.claimIndex, filled, options.today);
    const message = replaceMessage(result, filled, lang);
    if (result.outcome === 'changed') {
      undoAction = { kind: 'change', places: allPlaces, saved };
      note('change-record', { place: filled.placeName, detail: cleanDraft(filled).termId });
      recordForm = { draft: EMPTY_DRAFT, message, problems: [] };
      usePlaces(result.places, dataset);
      options.onRecords(result.places);
      announceText(message);
      root.querySelector(`#${UNDO_ID}`)?.focus?.();
      return;
    }
    if (result.outcome === 'missing') {
      recordForm = { draft: EMPTY_DRAFT, message, problems: [] };
      paint();
      announceText(message);
      return;
    }
    recordForm = { draft: cleanDraft(filled), message: result.outcome === 'invalid' ? '' : message, problems: result.problems, editing: target };
    const el = root.querySelector('[data-gl-recform]');
    if (el !== null) el.innerHTML = renderRecordForm(lang, recordForm.draft, recordForm.message, recordForm.problems, true);
    announceText(message);
    const first = result.problems[0];
    root.querySelector(`#${RECORDFORM_IDS[first === undefined ? 'status' : fieldOf(first)]}`)?.focus?.();
  }

  /** What is in the form now, read from the page. */
  function readDraft(): RecordDraft {
    const value = (id: string): string => {
      const el = root.querySelector(`#${id}`) as { value?: unknown } | null;
      return typeof el?.value === 'string' ? el.value : '';
    };
    return Object.fromEntries(DRAFT_FIELDS.map((f) => [f, value(RECORDFORM_IDS[f])])) as unknown as RecordDraft;
  }

  /** Adds the record typed in the form. With a problem, only the form is redrawn and focus goes to the first field to fix. */
  function addTypedRecord(): void {
    if (options.onRecords === undefined) return;
    const draft = readDraft();
    if (recordForm.editing !== undefined && recordForm.editing !== null) {
      saveEdit(draft, recordForm.editing);
      return;
    }
    const result = addRecord(allPlaces, draft, options.today);
    const message = addMessage(result, draft, lang);
    if (result.outcome === 'added' || result.outcome === 'added-place') {
      recordForm = { draft: nextDraft(draft), message, problems: [] };
      note('add', { place: cleanDraft(draft).placeName, detail: cleanDraft(draft).termId });
      recordsMessage = '';
      usePlaces(result.places, dataset);
      options.onRecords(result.places);
      announceText(message);
      root.querySelector(`#${RECORDFORM_IDS.termId}`)?.focus?.();
      return;
    }
    recordForm = { draft: cleanDraft(draft), message: result.outcome === 'duplicate' ? message : '', problems: result.problems };
    const el = root.querySelector('[data-gl-recform]');
    if (el !== null) el.innerHTML = renderRecordForm(lang, recordForm.draft, recordForm.message, recordForm.problems);
    announceText(message);
    const first = result.problems[0];
    root.querySelector(`#${RECORDFORM_IDS[first === undefined ? 'placeName' : fieldOf(first)]}`)?.focus?.();
  }

  function exportCompare(): void {
    const text = sourceCompareText(allPlaces, compareA, compareB, lang, options.today);
    if (options.onExport === undefined || text === '') return;
    options.onExport({ text, filename: sourceCompareFilename(lang), mime: SOURCECOMPARE_MIME });
  }

  function exportGaps(): void {
    if (options.onExport === undefined) return;
    options.onExport({ text: gapsToText(places, state.features, lang, options.today), filename: gapsFilename(lang), mime: GAPS_MIME });
  }

  function exportSourceView(): void {
    const text = sourceViewText(allPlaces, sourceChoice, lang, options.today);
    if (options.onExport === undefined || text === '') return;
    options.onExport({ text, filename: sourceViewFilename(lang), mime: SOURCEVIEW_MIME });
  }

  function exportOldRecords(): void {
    if (options.onExport === undefined) return;
    options.onExport({ text: oldRecordsToText(allPlaces, lang, options.today), filename: oldRecordsFilename(lang), mime: RECORDAGES_MIME });
  }

  function exportFeatureView(): void {
    if (options.onExport === undefined || !isFeatureId(featureChoice)) return;
    options.onExport({ text: featureViewText(places, featureChoice, lang, options.today), filename: featureViewFilename(featureChoice, lang), mime: FEATUREVIEW_MIME });
  }

  function exportDisagreements(): void {
    if (options.onExport === undefined) return;
    options.onExport({ text: disagreementsToText(disagreementRows(allPlaces, lang), lang, options.today), filename: disagreementsFilename(lang), mime: DISAGREE_MIME });
  }

  function exportProblems(): void {
    if (options.onExport === undefined) return;
    const rows = problemRows(allPlaces, lang, options.today);
    options.onExport({ text: problemsToText(rows, lang, options.today), filename: problemsFilename(lang), mime: PROBLEMS_MIME });
  }

  function exportRecords(): void {
    if (options.onExport === undefined) return;
    options.onExport({ text: recordsToCsv(allPlaces), filename: recordsFilename(lang), mime: RECORDS_CSV_MIME });
  }

  /** Says what loading the pasted table would do. Nothing is changed. */
  function checkTable(): void {
    if (options.onRecords === undefined) return;
    const box = root.querySelector(`#${RECORDSCSV_IDS.text}`) as { value?: unknown } | null;
    const preview = previewLoad(typeof box?.value === 'string' ? box.value : '', allPlaces, loadMode);
    const el = root.querySelector('[data-gl-preview]');
    if (el !== null) el.innerHTML = renderPreview(preview, lang) + renderPreviewDetail(preview, allPlaces, lang, canExport);
    announceText(previewLines(preview, lang).join(' '));
    root.querySelector(`#${PREVIEW_CHECK_ID}`)?.focus?.();
  }

  /** Reads the pasted table. Places are replaced only when the table could be read and has at least one place. */
  const snapshotsHtml = (): string =>
    renderSnapshots({ lang, snapshots, places: allPlaces, message: snapshotNote, showing: snapshotShowing, canRestore: canLoadRecords && isDefaultRecordView(recordView), canExport });

  /** Draws the copies panel only, says the message, and puts the focus back on a control that is still there. */
  function drawSnapshots(focusId: string): void {
    const el = root.querySelector('[data-gl-snaps]');
    if (el !== null) el.innerHTML = snapshotsHtml();
    announceText(snapshotNote);
    root.querySelector(`#${focusId}`)?.focus?.();
  }

  /** Keeps a copy of the records held now, under the name typed in the box. */
  function keepSnapshot(): void {
    if (!canLoadRecords) return;
    const box = root.querySelector(`#${SNAPSHOT_IDS.name}`) as { value?: unknown } | null;
    const result = addSnapshot(snapshots, typeof box?.value === 'string' ? box.value : '', allPlaces, options.today);
    snapshotNote = snapshotMessage(result.outcome, result.name, lang);
    if (result.outcome === 'added') {
      snapshots = result.snapshots;
      writeStore(options.store, SNAPSHOTS_KEY, serialiseSnapshots(snapshots));
    }
    drawSnapshots(SNAPSHOT_IDS.name);
  }

  function dropSnapshot(index: number): void {
    const snapshot = snapshots[index];
    if (snapshot === undefined) return;
    snapshots = removeSnapshot(snapshots, index);
    writeStore(options.store, SNAPSHOTS_KEY, serialiseSnapshots(snapshots));
    snapshotShowing = snapshotShowing === null || snapshotShowing === index ? null : snapshotShowing > index ? snapshotShowing - 1 : snapshotShowing;
    snapshotNote = lang === 'fr' ? fixFrench(SNAPSHOT_UI.fr.removed(snapshot.name)) : SNAPSHOT_UI.en.removed(snapshot.name);
    drawSnapshots(SNAPSHOT_IDS.name);
  }

  /** Puts the records back to a copy. The records held before can be brought back with Undo. */
  function restoreSnapshot(index: number): void {
    const snapshot = snapshots[index];
    if (snapshot === undefined || options.onRecords === undefined || !isDefaultRecordView(recordView)) return;
    const next = snapshotPlaces(snapshot);
    if (next.length === 0 || matchesSnapshot(snapshot, allPlaces)) {
      snapshotNote = next.length === 0 ? SNAPSHOT_UI[lang].unreadable : SNAPSHOT_UI[lang].same;
      drawSnapshots(SNAPSHOT_IDS.name);
      return;
    }
    undoAction = { kind: 'restore', places: allPlaces, saved };
    note('restore', { detail: snapshot.name });
    snapshotNote = lang === 'fr' ? fixFrench(SNAPSHOT_UI.fr.restored(snapshot.name)) : SNAPSHOT_UI.en.restored(snapshot.name);
    snapshotShowing = null;
    usePlaces(next, null);
    options.onRecords(next);
    announceText(snapshotNote);
    root.querySelector(`#${SNAPSHOT_IDS.name}`)?.focus?.();
  }

  const tidyHtml = (): string => renderTidy({ lang, places: allPlaces, today: options.today, source: tidySource, message: tidyNote });

  /** Removes one whole group of records, or the places with no records. The step can be undone. */
  function runTidy(kind: TidyKind): void {
    if (options.onRecords === undefined || !isDefaultRecordView(recordView)) return;
    const plan = tidyPlan(allPlaces, kind, options.today, tidySource);
    tidyNote = tidyMessage(plan, lang);
    if (!tidyWouldChange(plan)) {
      const el = root.querySelector('[data-gl-tidy]');
      if (el !== null) el.innerHTML = tidyHtml();
      announceText(tidyNote);
      return;
    }
    undoAction = { kind: 'tidy', places: allPlaces, saved };
    note('tidy', { place: kind === 'source' ? tidySource : '', detail: kind });
    if (kind === 'source') tidySource = '';
    usePlaces(plan.places, dataset);
    writeStore(options.store, SAVED_STORE_KEY, serialiseSaved(saved));
    options.onRecords(plan.places);
    announceText(tidyNote);
    root.querySelector(`#${UNDO_ID}`)?.focus?.();
  }

  const seenState = (): SeenPanelState => ({ placeIndex: seenPlace, draft: seenDraft, message: seenNote, problems: seenProblems, filter: seenFilter, shareName, shareLicence, shareProblems: shareProblemsNow, shareMessage: shareNote });
  const seenOptions = (): SeenPanelOptions => ({ lang, places, list: seenList, today: options.today, canExport, state: seenState() });

  function resetSeenForms(): void {
    seenPlace = null;
    seenDraft = emptySeenDraft(options.today);
    seenNote = '';
    seenProblems = [];
    seenFilter = 'all';
    shareProblemsNow = [];
    shareNote = '';
  }

  /** Draws the form for what the person saw only, and puts the focus on one of its controls. */
  function drawSeenForm(focusId: string): void {
    const el = root.querySelector('[data-gl-seen-form]');
    if (el !== null) el.innerHTML = seenFormHtml(seenOptions());
    root.querySelector(`#${focusId}`)?.focus?.();
  }

  /** Reads the form's boxes. A box the page does not have keeps what the draft held. */
  function readSeenForm(): void {
    const value = (id: string): string | null => {
      const el = root.querySelector(`#${id}`) as { value?: unknown } | null;
      return el !== null && typeof el.value === 'string' ? el.value : null;
    };
    const next: Record<string, string> = { ...seenDraft };
    for (const field of SEEN_FIELDS) next[field] = value(SEEN_IDS[field]) ?? next[field] ?? '';
    seenDraft = next as unknown as SeenDraft;
    const chosen = value(SEEN_IDS.place);
    if (chosen !== null) seenPlace = /^\d{1,5}$/.test(chosen) && places[Number(chosen)] !== undefined ? Number(chosen) : null;
  }

  /** Keeps what the person saw at the chosen place. The note is the person's own: the host is not told and the records do not change. */
  function saveSeen(): void {
    readSeenForm();
    const place = seenPlace === null ? undefined : places[seenPlace];
    const result = setObservation(seenList, place?.id ?? '', seenDraft, options.today);
    seenProblems = result.problems;
    seenNote = seenMessage(result.outcome, place?.name ?? '', seenDraft.termId.trim(), lang);
    if (result.outcome !== 'added' && result.outcome !== 'changed') {
      const first = result.problems[0];
      drawSeenForm(result.outcome === 'no-place' ? SEEN_IDS.place : first === undefined ? SEEN_IDS.termId : SEEN_IDS[seenFieldOf(first)]);
      announceText(result.problems.length > 0 ? SEEN_UI[lang].invalid(result.problems.length) : seenNote);
      return;
    }
    seenList = result.list;
    writeStore(options.store, SEEN_STORE_KEY, serialiseObservations(seenList));
    seenDraft = { ...emptySeenDraft(options.today), date: seenDraft.date.trim() };
    shareProblemsNow = [];
    shareNote = '';
    draw();
    drawSeenForm(SEEN_IDS.termId);
    announceText(seenNote);
  }

  /** Removes one note. The step can be undone. */
  function dropSeen(index: number): void {
    const removal = removeObservation(seenList, index);
    if (removal.removed === null) return;
    const name = places.find((p) => p.id === removal.removed?.placeId)?.name ?? '';
    undoAction = { kind: 'seen', observation: removal.removed, position: removal.position };
    seenList = removal.list;
    writeStore(options.store, SEEN_STORE_KEY, serialiseObservations(seenList));
    shareProblemsNow = [];
    shareNote = '';
    paint();
    announceText(seenRemovedMessage(name, removal.removed.termId, lang));
    root.querySelector(`#${UNDO_ID}`)?.focus?.();
  }

  function chooseSeenFilter(next: SeenFilter): void {
    seenFilter = next;
    const el = root.querySelector('[data-gl-seen-list]');
    if (el !== null) el.innerHTML = seenListHtml(seenOptions());
    root.querySelector(`#${SEEN_IDS.filter}`)?.focus?.();
  }

  /** Saves the notes as a table of records that names the person as the source, under the licence the person chose. */
  function shareSeenNow(): void {
    if (options.onExport === undefined) return;
    const value = (id: string, held: string): string => {
      const el = root.querySelector(`#${id}`) as { value?: unknown } | null;
      return el !== null && typeof el.value === 'string' ? el.value : held;
    };
    shareName = value(SEEN_IDS.shareName, shareName);
    shareLicence = value(SEEN_IDS.shareLicence, shareLicence);
    const result = shareSeen(seenRows(seenList, places, lang), shareName, shareLicence);
    shareProblemsNow = result.problems;
    shareNote = result.ok ? SEEN_UI[lang].shared(result.records) : '';
    if (result.ok) options.onExport({ text: result.csv, filename: SEEN_RECORDS_FILENAME, mime: RECORDS_CSV_MIME });
    const el = root.querySelector('[data-gl-seen-share]');
    if (el !== null) el.innerHTML = seenShareHtml(seenOptions());
    const first = result.problems[0];
    announceText(first === undefined ? shareNote : SEEN_UI[lang].shareProblems[first]);
    root.querySelector(`#${first === undefined || first === 'nothing-to-share' ? SEEN_IDS.share : first === 'licence-not-open' ? SEEN_IDS.shareLicence : SEEN_IDS.shareName}`)?.focus?.();
  }

  const infoFormHtml = (): string => renderInfoForm({ lang, places: allPlaces, placeIndex: infoPlace, draft: infoDraft, message: infoNote, problems: infoProblems });

  /** Draws the form for the kind and area only, and puts the focus back on one of its controls. */
  function drawInfoForm(focusId: string): void {
    const el = root.querySelector('[data-gl-pi]');
    if (el !== null) el.innerHTML = infoFormHtml();
    root.querySelector(`#${focusId}`)?.focus?.();
  }

  /** Reads the form's boxes into the draft. A box the page does not have keeps what the draft held. */
  function readInfoDraft(): void {
    const next: Record<string, string> = { ...infoDraft };
    for (const field of INFO_FIELDS) {
      const el = root.querySelector(`#${INFOFORM_IDS[field]}`) as { value?: unknown } | null;
      if (el !== null && typeof el.value === 'string') next[field] = el.value;
    }
    infoDraft = next as unknown as InfoDraft;
  }

  /** Keeps a change to the kind and area of a place, so that it can be undone, and tells the host. */
  function applyInfo(result: InfoResult, name: string, removed: boolean): void {
    infoProblems = result.problems;
    infoNote = infoMessage(result, name, lang);
    if (result.outcome !== 'saved' && result.outcome !== 'removed') {
      drawInfoForm(result.outcome === 'missing' ? INFOFORM_IDS.place : INFOFORM_IDS.kind);
      announceText(result.problems.length > 0 ? fixIf(lang, INFOFORM_UI_INVALID(result.problems.length)) : infoNote);
      return;
    }
    undoAction = { kind: 'info', places: allPlaces, saved };
    note('place-info', { place: name, detail: removed ? 'removed' : 'set' });
    const message = infoNote;
    usePlaces(result.places, dataset);
    infoNote = message;
    options.onRecords?.(result.places);
    paint();
    announceText(message);
    root.querySelector(`#${UNDO_ID}`)?.focus?.();
  }

  function saveInfo(): void {
    if (options.onRecords === undefined || !isDefaultRecordView(recordView)) return;
    readInfoDraft();
    const index = infoPlace ?? -1;
    applyInfo(setPlaceInfo(allPlaces, index, infoDraft, options.today), allPlaces[index]?.name ?? '', false);
  }

  function dropInfo(): void {
    if (options.onRecords === undefined || !isDefaultRecordView(recordView)) return;
    const index = infoPlace ?? -1;
    applyInfo(removePlaceInfo(allPlaces, index), allPlaces[index]?.name ?? '', true);
  }

  /** Narrows the list to a kind or an area, says how many places are left, and keeps the focus on the list that was used. */
  function narrowByInfo(next: InfoFilter, focusId: string): void {
    infoFilter = next;
    limit = PAGE_SIZE;
    selected = [];
    draw();
    const ui = INFOFILTER_UI[lang];
    const active = activeInfoFilter();
    announceText(isNoInfoFilter(active) ? ui.cleared : ui.showing(places.filter((p) => matchesInfoFilterNow(p)).length, places.length));
    root.querySelector(`#${focusId}`)?.focus?.();
  }

  function loadRecords(): void {
    if (options.onRecords === undefined) return;
    const box = root.querySelector(`#${RECORDSCSV_IDS.text}`) as { value?: unknown } | null;
    const result = recordsFromCsv(typeof box?.value === 'string' ? box.value : '');
    recordsMessage = importMessage(result, lang);
    if (result.problems.length === 0 && result.places.length > 0) {
      const before = allPlaces;
      let next = result.places;
      let addedFromTable = 0;
      if (loadMode === 'add') {
        const merged = mergeRecords(allPlaces, result.places);
        next = merged.places;
        addedFromTable = merged.addedRecords;
        const left = result.rejected.length > 0 ? ` ${RECORDSCSV_UI[lang].rejected(result.rejected.length)}` : '';
        recordsMessage = `${mergeMessage(merged, lang)}${left}`;
      }
      if (next !== before) {
        if (before.length > 0) undoAction = { kind: 'load', places: before, saved };
        if (loadMode === 'add') note('add-table', { count: addedFromTable });
        else note('load', { count: next.length });
        usePlaces(next, loadMode === 'add' ? dataset : null);
        options.onRecords(next);
      } else {
        const el = root.querySelector('[data-gl-records-msg]');
        if (el !== null) el.innerHTML = escapeHtml(recordsMessage);
      }
    } else {
      const el = root.querySelector('[data-gl-records-msg]');
      if (el !== null) el.innerHTML = escapeHtml(recordsMessage);
    }
    announceText(recordsMessage);
    root.querySelector(`#${RECORDSCSV_IDS.text}`)?.focus?.();
  }

  function usePlaces(next: readonly Place[], nextDataset: PlaceDataset | null): void {
    const diff = diffPlaces(places, next);
    changes = hasChanges(diff) ? diff : NO_CHANGES;
    allPlaces = next;
    // Positions may have moved, so a change in progress is dropped rather than applied to the wrong record.
    if (recordForm.editing !== undefined && recordForm.editing !== null) recordForm = { draft: EMPTY_DRAFT, message: '', problems: [] };
    places = applyRecordView(next, recordView);
    // Positions may have moved, so the form no longer points at a place.
    seenPlace = null;
    seenNote = '';
    seenProblems = [];
    shareProblemsNow = [];
    shareNote = '';
    infoPlace = null;
    infoDraft = EMPTY_INFO_DRAFT;
    infoProblems = [];
    dataset = nextDataset;
    selected = [];
    limit = PAGE_SIZE;
    saved = pruneSaved(saved, places);
    tagFilter = '';
    paint();
  }

  function exportCredits(): void {
    if (options.onExport === undefined) return;
    const groups = sourceGroups(allPlaces, dataset?.provenance);
    options.onExport({ text: creditsText(groups, lang, options.today), filename: creditsFilename(lang), mime: CREDITS_MIME });
  }

  function exportWeek(): void {
    if (options.onExport === undefined) return;
    options.onExport({ text: weekToText(weekView(days, places), options.today, lang), filename: weekFilename(lang), mime: DAY_TEXT_MIME });
  }

  function quizAct(action: NonNullable<ReturnType<typeof parseQuizId>>): void {
    const before = quiz;
    if (action.kind === 'again') quiz = startQuiz(practiceIds());
    else if (action.kind === 'pick') quiz = quizPick(quiz, action.id);
    else quiz = quizNext(quiz);
    if (quiz === before) return;
    if (action.kind === 'next' && isDone(quiz)) {
      quizBest = betterBest(quizBest, quiz.score, quiz.quiz.length);
      writeStore(options.store, QUIZ_BEST_KEY, serialiseBest(quizBest));
    }
    const el = root.querySelector('[data-gl-quiz]');
    if (el !== null) el.innerHTML = quizPanelHtml({ lang, quiz, best: quizBest });
    if (action.kind === 'pick') {
      const asked = before.quiz[before.position];
      const word = practiceCards(lang).find((c) => c.id === asked?.id)?.term ?? '';
      announceText(fixIf(lang, asked !== undefined && action.id === asked.id ? QUIZ_UI[lang].saidRight : QUIZ_UI[lang].saidWrong(word)));
      root.querySelector('#gl-quiz-next')?.focus?.();
    } else {
      const first = currentQuestion(quiz)?.options[0];
      root.querySelector(first === undefined ? '#gl-quiz-again' : `#gl-quiz-opt-${first}`)?.focus?.();
    }
  }

  function exportReminders(): void {
    if (options.onExport === undefined) return;
    options.onExport({ text: remindersToIcs(dueList(reminders, places, options.today), lang, options.today), filename: remindersFilename(lang), mime: CALENDAR_MIME });
  }

  function practiceAct(action: NonNullable<ReturnType<typeof parsePracticeId>>): void {
    const before = practice;
    practice = practiceStep(practice, action, practiceIds());
    if (practice === before) return;
    if (practice.progress !== before.progress) writeStore(options.store, PRACTICE_STORE_KEY, serialiseProgress(practice.progress));
    const el = root.querySelector('[data-gl-practice]');
    if (el !== null) el.innerHTML = renderPractice(practice, practiceCards(lang), lang);
    const word = practiceCards(lang).find((c) => c.id === before.deck[before.position])?.term ?? '';
    if (action === 'know') announceText(fixIf(lang, PRACTICE_UI[lang].saidKnow(word)));
    else if (action === 'again') announceText(fixIf(lang, PRACTICE_UI[lang].saidAgain(word)));
    root.querySelector(action === 'show' ? '#gl-prac-know' : '#gl-prac-show')?.focus?.();
  }

  function exportVisits(): void {
    if (options.onExport === undefined) return;
    options.onExport({ text: visitLogToText(visitLog(visits, places, lang), lang), filename: visitLogFilename(lang), mime: TEXT_MIME });
  }

  function printList(listIndex: number): void {
    const list = lists[listIndex];
    if (options.onExport === undefined || list === undefined) return;
    options.onExport(listPrintFile(list, places, { lang, today: options.today, termIds: state.features, provenance: dataset?.provenance ?? null }));
  }

  function searchesPanel(): string {
    return renderSearchesPanel({ lang, searches, message: searchMessage });
  }

  function saveSearches(next: SavedSearches): void {
    searches = next;
    writeStore(options.store, SEARCHES_STORE_KEY, serialiseSearches(searches));
  }

  function saveCurrentSearch(): void {
    const box = root.querySelector(`#${SEARCH_IDS.name}`) as { value?: unknown } | null;
    const result = saveSearch(searches, typeof box?.value === 'string' ? box.value : '', state);
    if (!result.ok) {
      searchMessage = searchErrorText(result.error, lang);
      draw();
      root.querySelector(`#${SEARCH_IDS.name}`)?.focus?.();
      return;
    }
    saveSearches(result.searches);
    searchMessage = '';
    setProp(box, 'value', '');
    draw();
    announce('search-saved', result.searches[result.searches.length - 1]?.name ?? '');
    root.querySelector(`#${SEARCH_IDS.name}`)?.focus?.();
  }

  /** Makes the saved choices again: ticks the boxes, fills the search box, and shows the results. */
  function useSearch(index: number): void {
    const search = searches[index];
    if (search === undefined) return;
    const next = stateOf(search);
    for (const t of TERMS) setProp(root.querySelector(`#gl-f-${t.id}`), 'checked', next.features.includes(t.id));
    setProp(root.querySelector('#gl-pq'), 'value', next.query);
    setProp(root.querySelector('#gl-hide'), 'checked', next.hideNotAvailable);
    updateState(next);
    announce('search-used', search.name);
    root.querySelector('#gl-pq')?.focus?.();
  }

  function removeSearch(index: number): void {
    const search = searches[index];
    if (search === undefined) return;
    undoAction = { kind: 'search', index, search };
    saveSearches(deleteSearch(searches, index));
    draw();
    announce('search-deleted', search.name);
    root.querySelector(`#${SEARCH_IDS.name}`)?.focus?.();
  }

  function listsPanel(): string {
    return renderListsPanel({ lang, lists, places, message: listMessage, termIds: state.features, canExport });
  }

  /** Redraws the lists panel and the "Add to a list" boxes, which depend on the lists. */
  function drawLists(): void {
    draw();
  }

  function saveLists(next: Lists): void {
    lists = next;
    writeStore(options.store, LISTS_STORE_KEY, serialiseLists(lists));
  }

  function createNewList(): void {
    const box = root.querySelector(`#${LIST_IDS.name}`) as { value?: unknown } | null;
    const result = createList(lists, typeof box?.value === 'string' ? box.value : '');
    if (!result.ok) {
      listMessage = listErrorText(result.error, lang);
      drawLists();
      root.querySelector(`#${LIST_IDS.name}`)?.focus?.();
      return;
    }
    saveLists(result.lists);
    const created = result.lists[result.lists.length - 1];
    listMessage = '';
    setProp(box, 'value', '');
    drawLists();
    announce('list-created', created?.name ?? '');
    root.querySelector(`#${LIST_IDS.name}`)?.focus?.();
  }

  function addPlaceToList(placeIndex: number, value: string): void {
    const place = places[placeIndex];
    const listIndex = /^\d+$/.test(value) ? Number(value) : -1;
    const list = lists[listIndex];
    if (place === undefined || list === undefined) return;
    saveLists(addToList(lists, listIndex, place.id));
    listMessage = '';
    drawLists();
    announce('list-added', place.name, list.name);
    root.querySelector(`#gl-save-${placeIndex}`)?.focus?.();
  }

  function removePlaceFromList(listIndex: number, placeIndex: number): void {
    const place = places[placeIndex];
    const list = lists[listIndex];
    if (place === undefined || list === undefined) return;
    saveLists(removeFromList(lists, listIndex, place.id));
    drawLists();
    announce('list-removed', place.name, list.name);
    root.querySelector(`#${LIST_IDS.name}`)?.focus?.();
  }

  function exportList(listIndex: number): void {
    const list = lists[listIndex];
    if (options.onExport === undefined || list === undefined) return;
    options.onExport(listToFile(list, places, state.features, lang, dataset?.provenance ?? null));
  }

  function removeList(listIndex: number): void {
    const list = lists[listIndex];
    if (list === undefined) return;
    undoAction = { kind: 'list', index: listIndex, list };
    saveLists(deleteList(lists, listIndex));
    drawLists();
    announce('list-deleted', list.name);
    root.querySelector(`#${LIST_IDS.name}`)?.focus?.();
  }

  function drawData(): void {
    const el = root.querySelector('[data-gl-data]');
    if (el !== null) el.innerHTML = dataPanel();
  }

  function exportBackup(): void {
    if (options.onExport === undefined) return;
    const backup = createBackup({ saved, notes, plan, visits, recent, lists, searches, tags, reminders, must, days, seen: seenList, view, state }, options.today);
    options.onExport({ text: serialiseBackup(backup), filename: backupFilename(options.today), mime: BACKUP_MIME });
  }

  function importBackup(): void {
    const box = root.querySelector(`#${BACKUP_IDS.text}`) as { value?: unknown } | null;
    const result = parseBackup(typeof box?.value === 'string' ? box.value : '');
    if (!result.ok) {
      dataMessage = BACKUP_UI[lang].errors[result.error];
      drawData();
      return;
    }
    const b = result.backup;
    saved = pruneSaved(b.saved, places);
    notes = b.notes;
    plan = b.plan;
    visits = b.visits;
    recent = b.recent;
    lists = b.lists;
    searches = b.searches;
    tags = pruneTags(b.tags, places.map((p) => p.id));
    reminders = pruneReminders(b.reminders, places.map((p) => p.id));
    must = b.must;
    seenList = b.seen ?? [];
    resetSeenForms();
    writeStore(options.store, SEEN_STORE_KEY, serialiseObservations(seenList));
    days = pruneDays(b.days, places.map((p) => p.id));
    tagFilter = '';
    listMessage = '';
    searchMessage = '';
    view = normaliseView(b.view);
    state = normaliseState(b.state);
    selected = [];
    limit = PAGE_SIZE;
    undoAction = null;
    const stored = backupToStorage({ ...b, saved, view, state });
    writeStore(options.store, SAVED_STORE_KEY, stored.saved);
    writeStore(options.store, NOTES_STORE_KEY, stored.notes);
    writeStore(options.store, PLAN_STORE_KEY, stored.plan);
    writeStore(options.store, VISITS_STORE_KEY, stored.visits);
    writeStore(options.store, RECENT_STORE_KEY, stored.recent);
    writeStore(options.store, LISTS_STORE_KEY, stored.lists);
    writeStore(options.store, SEARCHES_STORE_KEY, stored.searches);
    writeStore(options.store, TAGS_STORE_KEY, serialiseTags(tags));
    writeStore(options.store, REMINDERS_STORE_KEY, serialiseReminders(reminders));
    writeStore(options.store, MUST_STORE_KEY, serialiseMust(must));
    writeStore(options.store, DAYS_STORE_KEY, serialiseDays(days));
    writeStore(options.store, FINDER_VIEW_KEY, stored.view);
    persistState();
    dataMessage = restoredText(b, lang);
    paint();
  }

  function forgetAll(): void {
    saved = [];
    notes = {};
    plan = {};
    visits = {};
    recent = [];
    lists = [];
    searches = [];
    tags = {};
    reminders = {};
    recordView = DEFAULT_RECORD_VIEW;
    editLog = [];
    writeStore(options.store, EDIT_LOG_KEY, serialiseEditLog(editLog));
    places = allPlaces;
    writeStore(options.store, RECORD_VIEW_KEY, serialiseRecordView(recordView));
    must = [];
    days = {};
    seenList = [];
    resetSeenForms();
    writeStore(options.store, SEEN_STORE_KEY, serialiseObservations(seenList));
    quizBest = null;
    quiz = startQuiz(practiceIds());
    tagFilter = '';
    practice = startRound({}, practiceIds());
    listMessage = '';
    searchMessage = '';
    undoAction = null;
    writeStore(options.store, TAGS_STORE_KEY, serialiseTags(tags));
    writeStore(options.store, MUST_STORE_KEY, serialiseMust(must));
    writeStore(options.store, DAYS_STORE_KEY, serialiseDays(days));
    writeStore(options.store, QUIZ_BEST_KEY, serialiseBest(quizBest));
    writeStore(options.store, REMINDERS_STORE_KEY, serialiseReminders(reminders));
    writeStore(options.store, PRACTICE_STORE_KEY, serialiseProgress(practice.progress));
    writeStore(options.store, SEARCHES_STORE_KEY, serialiseSearches(searches));
    writeStore(options.store, LISTS_STORE_KEY, serialiseLists(lists));
    writeStore(options.store, SAVED_STORE_KEY, serialiseSaved(saved));
    writeStore(options.store, NOTES_STORE_KEY, serialiseNotes(notes));
    writeStore(options.store, PLAN_STORE_KEY, serialisePlan(plan));
    writeStore(options.store, VISITS_STORE_KEY, serialiseVisits(visits));
    writeStore(options.store, RECENT_STORE_KEY, serialiseRecent(recent));
    confirmingForget = false;
    dataMessage = BACKUP_UI[lang].forgotten;
    paint();
  }

  function draw(): ResultsView {
    const r = compute();
    const set = (selector: string, html: string): void => {
      const el = root.querySelector(selector);
      if (el !== null) el.innerHTML = html;
    };
    set('[data-gl-presults]', r.list);
    set('[data-gl-pcount]', r.count);
    set('[data-gl-compare]', r.compare);
    set('[data-gl-suggest]', renderSuggestions(state.query, state, lang));
    set('[data-gl-changes]', renderChanges(changes, lang));
    set('[data-gl-data]', dataPanel());
    set('[data-gl-lists]', listsPanel());
    set('[data-gl-searches]', searchesPanel());
    set('[data-gl-must]', mustPanelHtml({ lang, places, must }));
    set('[data-gl-week]', weekPanelHtml({ lang, places, today: options.today, days, canExport }));
    set('[data-gl-dupes]', renderDuplicates(allPlaces, lang, canLoadRecords && isDefaultRecordView(recordView)));
    set('[data-gl-editlog]', renderEditLog(editLog, lang, canExport));
    set('[data-gl-glance]', renderGlance(places, lang));
    set('[data-gl-recordview]', renderRecordView(allPlaces, recordView, lang));
    set('[data-gl-rvnote]', renderViewNote(allPlaces, recordView, lang));
    set('[data-gl-sources]', sourcesPanelHtml({ lang, places: allPlaces, listSource: dataset?.provenance, canExport, canLoad: canLoadRecords, message: recordsMessage, form: recordForm, loadMode, canEdit: canLoadRecords && isDefaultRecordView(recordView) }));
    set('[data-gl-problems]', problemsPanelHtml({ lang, places: allPlaces, today: options.today, canExport }));
    set('[data-gl-recages]', renderRecordAges(allPlaces, lang, options.today, canExport));
    drawFeatureTable();
    drawSourceTable();
    drawCompareTable();
    set('[data-gl-snaps]', snapshotsHtml());
    set('[data-gl-if]', renderInfoFilter(places, activeInfoFilter(), lang));
    set('[data-gl-info]', renderInfoPanel(places, lang));
    set('[data-gl-seen-list]', seenListHtml(seenOptions()));
    set('[data-gl-seen-share]', seenShareHtml(seenOptions()));
    set('[data-gl-tidy]', tidyHtml());
    set('[data-gl-matrix]', renderMatrix(places, state.features, lang, canExport));
    set('[data-gl-licences]', renderLicenceView(allPlaces, lang, canExport));
    set('[data-gl-years]', renderYears(allPlaces, lang, canExport));
    set('[data-gl-report]', renderReport(allPlaces, lang, options.today, canExport));
    set('[data-gl-gaps]', renderGaps(places, state.features, lang, canExport));
    set('[data-gl-disagree]', disagreePanelHtml({ lang, places: allPlaces, canExport }));
    set('[data-gl-quiz]', quizPanelHtml({ lang, quiz, best: quizBest }));
    set('[data-gl-tags]', tagsPanelHtml({ lang, places, tags, tagFilter }));
    set('[data-gl-reminders]', remindersPanelHtml({ lang, places, today: options.today, reminders, canExport }));
    set('[data-gl-practice]', renderPractice(practice, practiceCards(lang), lang));
    set('[data-gl-visitlog]', visitLogHtml({ lang, places, visits, canExport }));
    drawNoteMatches();
    drawRecordMatches();
    set('[data-gl-undo]', renderUndo(undoAction, lang));
    set('[data-gl-groups]', renderGroups(state, lang));
    set('[data-gl-names]', renderNameSuggestions(suggestNames(places, state.query, lang), lang));
    set('[data-gl-ages]', summariseAges(r.matched, options.today, lang));
    set('[data-gl-summary]', renderSummary(state, view, lang));
    set('[data-gl-recent-searches]', renderRecent(recent, lang));
    drawPlan();
    return r;
  }

  function paint(): void {
    root.innerHTML = applyOpenPanels(renderFinderShell({
      lang,
      state,
      places,
      dataset,
      today: options.today,
      selected,
      changes,
      plan,
      recent,
      shortcuts,
      tour,
      undo: undoAction,
      data: { counts: dataCounts(), confirming: confirmingForget, message: dataMessage },
      listMessage,
      searches,
      searchMessage,
      notesQuery,
      recordQuery,
      featureChoice,
      sourceChoice,
      seenForm: seenState(),
      infoForm: { placeIndex: infoPlace, draft: infoDraft, message: infoNote, problems: infoProblems },
      tidy: { source: tidySource, message: tidyNote },
      snapshots: { list: snapshots, message: snapshotNote, showing: snapshotShowing },
      compareSources: { a: compareA, b: compareB },
      tagFilter,
      practice,
      quiz,
      quizBest,
      allPlaces,
      recordView,
      canLoadRecords,
      recordsMessage,
      editLog,
      loadMode,
      recordForm,
      offline: options.isOnline?.() === false,
      ...extra(),
      ...(prefs !== null ? { prefs: prefs.get() } : {}),
    }), openPanels);
  }

  function updateState(next: FinderState): void {
    state = normaliseState(next);
    limit = PAGE_SIZE;
    persistState();
    draw();
  }

  function updateView(next: FinderView): void {
    view = normaliseView(next);
    limit = PAGE_SIZE;
    writeStore(options.store, FINDER_VIEW_KEY, serialiseView(view));
    draw();
  }

  /** Says a message that is already written. */
  function announceText(text: string): void {
    lastAnnouncement = nextAnnouncement(lastAnnouncement, text);
    const el = root.querySelector('[data-gl-announce]');
    if (el !== null) el.innerHTML = renderAnnouncement(lastAnnouncement);
  }

  function announce(kind: AnnounceKind, subject = '', other = ''): void {
    lastAnnouncement = nextAnnouncement(lastAnnouncement, announcement(kind, lang, subject, other));
    const el = root.querySelector('[data-gl-announce]');
    if (el !== null) el.innerHTML = renderAnnouncement(lastAnnouncement);
  }

  function clear(): void {
    if (!(isEmptyState(state) && view === DEFAULT_VIEW && selected.length === 0)) {
      undoAction = { kind: 'clear', state, view, selected };
    }
    state = EMPTY_STATE;
    view = DEFAULT_VIEW;
    selected = [];
    limit = PAGE_SIZE;
    persistState();
    writeStore(options.store, FINDER_VIEW_KEY, serialiseView(view));
    setProp(root.querySelector('#gl-pq'), 'value', '');
    for (const id of ['#gl-hide', '#gl-recent', '#gl-only-saved']) setProp(root.querySelector(id), 'checked', false);
    setProp(root.querySelector('#gl-sort'), 'value', DEFAULT_VIEW.sort);
    for (const t of TERMS) setProp(root.querySelector(`#gl-f-${t.id}`), 'checked', false);
    draw();
    announce('cleared');
  }

  function toggleCompare(index: number): void {
    if (index < 0 || index >= places.length) return;
    selected = selected.includes(index) ? selected.filter((i) => i !== index) : [...selected, index].slice(-2);
    draw();
    root.querySelector(`#gl-cmp-${index}`)?.focus?.();
  }

  function toggleSave(index: number): void {
    const place = places[index];
    if (place === undefined) return;
    const wasSaved = saved.includes(place.id);
    if (wasSaved) undoAction = { kind: 'unsave', placeId: place.id, position: savedPosition(saved, place.id) };
    saved = toggleSaved(saved, place.id);
    writeStore(options.store, SAVED_STORE_KEY, serialiseSaved(saved));
    draw();
    announce(wasSaved ? 'unsaved' : 'saved', place.name);
    root.querySelector(`#gl-save-${index}`)?.focus?.();
  }

  function showMore(): void {
    const before = limit;
    limit += PAGE_SIZE;
    const r = draw();
    const first = r.indexes[before];
    if (first !== undefined) root.querySelector(`#gl-cmp-${first}`)?.focus?.();
  }

  function addSuggested(id: string): void {
    if (!TERMS.some((t) => t.id === id) || state.features.includes(id)) return;
    setProp(root.querySelector(`#gl-f-${id}`), 'checked', true);
    updateState(toggleFeature(state, id));
    root.querySelector('#gl-pq')?.focus?.();
  }

  function exportFile(kind: 'saved' | 'comparison'): void {
    if (options.onExport === undefined) return;
    const provenance = dataset?.provenance ?? null;
    if (kind === 'saved') {
      options.onExport(toExportFile('saved', savedToText(places, saved, lang, provenance), lang));
      return;
    }
    const [a, b] = selected.map((i) => places[i]);
    if (a !== undefined && b !== undefined) {
      options.onExport(toExportFile('comparison', comparisonToText(a, b, state.features, lang, provenance), lang));
    }
  }

  function tickAsked(index: number, termId: string, checked: boolean): void {
    const place = places[index];
    if (place === undefined) return;
    plan = setAsked(plan, place.id, termId, checked);
    writeStore(options.store, PLAN_STORE_KEY, serialisePlan(plan));
    drawPlan();
    root.querySelector(`#${askId(index, termId)}`)?.focus?.();
  }

  function exportPlan(): void {
    if (options.onExport === undefined) return;
    const termIds = state.features.length > 0 ? state.features : TERMS.map((t) => t.id);
    const text = planToText(buildPlan(places, saved, termIds, options.today, lang, plan), lang);
    options.onExport({ text, filename: `visit-plan-${lang}.txt`, mime: TEXT_MIME });
  }

  function exportPrint(): void {
    if (options.onExport === undefined) return;
    const termIds = state.features.length > 0 ? state.features : TERMS.map((t) => t.id);
    const entries = buildPlan(places, saved, termIds, options.today, lang, plan);
    options.onExport({ text: renderPrintPage(entries, { lang, today: options.today }), filename: printFilename(lang), mime: PRINT_MIME });
  }

  function exportPlanCsv(): void {
    if (options.onExport === undefined) return;
    const termIds = state.features.length > 0 ? state.features : TERMS.map((t) => t.id);
    const entries = buildPlan(places, saved, termIds, options.today, lang, plan);
    options.onExport({ text: planToCsv(entries, lang), filename: csvFilename(lang), mime: CSV_MIME });
  }

  function toggleVisit(index: number): void {
    const place = places[index];
    if (place === undefined) return;
    const was = visitDate(visits, place.id) !== null;
    visits = toggleVisited(visits, place.id, options.today);
    writeStore(options.store, VISITS_STORE_KEY, serialiseVisits(visits));
    draw();
    announce(was ? 'unvisited' : 'visited', place.name);
    root.querySelector(`#gl-visit-${index}`)?.focus?.();
  }

  /** Drops one choice the person was offered. Focus goes to the search box, since the offer is gone. */
  function relax(id: string): void {
    const r = parseRelaxId(id);
    if (r === null) return;
    const next = applyRelaxation(state, view, r);
    if (r.kind === 'feature') setProp(root.querySelector(`#gl-f-${r.id}`), 'checked', false);
    if (r.kind === 'query') setProp(root.querySelector('#gl-pq'), 'value', '');
    if (r.kind === 'hide') setProp(root.querySelector('#gl-hide'), 'checked', false);
    if (r.kind === 'saved') setProp(root.querySelector('#gl-only-saved'), 'checked', false);
    if (r.kind === 'recent') setProp(root.querySelector('#gl-recent'), 'checked', false);
    if (next.view !== view) {
      view = normaliseView(next.view);
      writeStore(options.store, FINDER_VIEW_KEY, serialiseView(view));
    }
    updateState(next.state);
    announce('relaxed');
    root.querySelector('#gl-pq')?.focus?.();
  }

  function undo(): void {
    const action = undoAction;
    if (action === null) return;
    undoAction = null;
    if (action.kind === 'clear') {
      state = action.state;
      view = action.view;
      selected = [...action.selected];
      persistState();
      writeStore(options.store, FINDER_VIEW_KEY, serialiseView(view));
      paint();
    } else if (action.kind === 'search') {
      saveSearches(insertSearch(searches, action.index, action.search));
      draw();
    } else if (action.kind === 'list') {
      saveLists(insertList(lists, action.index, action.list));
      draw();
    } else if (action.kind === 'tag') {
      tags = insertTag(tags, action.placeId, action.tag, action.position);
      writeStore(options.store, TAGS_STORE_KEY, serialiseTags(tags));
      draw();
    } else if (action.kind === 'reminder') {
      reminders = setReminder(reminders, action.placeId, action.date);
      writeStore(options.store, REMINDERS_STORE_KEY, serialiseReminders(reminders));
      draw();
    } else if (action.kind === 'day') {
      days = setDay(days, action.placeId, action.day);
      writeStore(options.store, DAYS_STORE_KEY, serialiseDays(days));
      draw();
    } else if (action.kind === 'record' || action.kind === 'place' || action.kind === 'load' || action.kind === 'rename' || action.kind === 'join' || action.kind === 'source' || action.kind === 'change' || action.kind === 'restore' || action.kind === 'tidy' || action.kind === 'info') {
      saved = action.saved;
      note('undo');
      usePlaces(action.places, dataset);
      writeStore(options.store, SAVED_STORE_KEY, serialiseSaved(saved));
      options.onRecords?.(action.places);
    } else if (action.kind === 'recent') {
      recent = action.recent;
      writeStore(options.store, RECENT_STORE_KEY, serialiseRecent(recent));
      draw();
    } else if (action.kind === 'seen') {
      seenList = insertObservation(seenList, action.observation, action.position);
      writeStore(options.store, SEEN_STORE_KEY, serialiseObservations(seenList));
      draw();
    } else {
      saved = restoreSaved(saved, action.placeId, action.position);
      writeStore(options.store, SAVED_STORE_KEY, serialiseSaved(saved));
      draw();
    }
    announce('undone');
    root.querySelector('#gl-pq')?.focus?.();
  }

  function setShortcuts(on: boolean): void {
    shortcuts = on;
    writeStore(options.store, SHORTCUTS_STORE_KEY, serialiseShortcuts(on));
    const el = root.querySelector('[data-gl-shortcuts]');
    if (el !== null) el.innerHTML = renderShortcuts(shortcuts, lang);
    announce(on ? 'shortcuts-on' : 'shortcuts-off');
    root.querySelector(`#${SHORTCUTS_TOGGLE_ID}`)?.focus?.();
  }

  function drawTour(): void {
    const el = root.querySelector('[data-gl-tour]');
    if (el !== null) el.innerHTML = renderTour(tour, lang);
    root.querySelector(tour.open ? `#${TOUR_IDS.title}` : `#${TOUR_IDS.open}`)?.focus?.();
  }

  function onKey(event: { readonly target: unknown }): void {
    const e = event as { key?: unknown; ctrlKey?: unknown; altKey?: unknown; metaKey?: unknown; preventDefault?: () => void };
    const t = event.target as { tagName?: unknown; isContentEditable?: unknown } | null;
    if (typeof e.key !== 'string') return;
    const action = interpretKey(
      {
        key: e.key,
        ctrlKey: e.ctrlKey === true,
        altKey: e.altKey === true,
        metaKey: e.metaKey === true,
        targetTag: typeof t?.tagName === 'string' ? t.tagName : '',
        editable: t?.isContentEditable === true,
      },
      shortcuts,
    );
    if (action === null) return;
    e.preventDefault?.();
    if (action === 'focus-search') root.querySelector('#gl-pq')?.focus?.();
    else if (action === 'only-saved') {
      setProp(root.querySelector('#gl-only-saved'), 'checked', !view.savedOnly);
      updateView({ ...view, savedOnly: !view.savedOnly });
    } else {
      setProp(root.querySelector('#gl-recent'), 'checked', !view.recentOnly);
      updateView({ ...view, recentOnly: !view.recentOnly });
    }
  }

  function rememberSearch(): void {
    const next = addRecent(recent, state.query);
    if (next === recent) return;
    recent = next;
    writeStore(options.store, RECENT_STORE_KEY, serialiseRecent(recent));
    draw();
  }

  function useName(index: number): void {
    const name = suggestNames(places, state.query, lang)[index];
    if (name === undefined) return;
    setProp(root.querySelector('#gl-pq'), 'value', name);
    updateState({ ...state, query: name });
    root.querySelector('#gl-pq')?.focus?.();
  }

  function useRecent(index: number): void {
    const q = recent[index];
    if (q === undefined) return;
    setProp(root.querySelector('#gl-pq'), 'value', q);
    updateState({ ...state, query: q });
    root.querySelector('#gl-pq')?.focus?.();
  }

  function clearRecent(): void {
    if (recent.length > 0) undoAction = { kind: 'recent', recent };
    recent = [];
    writeStore(options.store, RECENT_STORE_KEY, serialiseRecent(recent));
    draw();
    announce('recent-cleared');
    root.querySelector('#gl-pq')?.focus?.();
  }

  function chooseGroup(id: string): void {
    const group = groupById(id);
    if (group === undefined) return;
    const next = toggleGroup(state, group);
    for (const t of TERMS) setProp(root.querySelector(`#gl-f-${t.id}`), 'checked', next.features.includes(t.id));
    updateState(next);
    announce(next.features.some((f) => group.features.includes(f)) ? 'group-on' : 'group-off', GROUP_UI[lang].names[group.id as keyof typeof GROUP_UI.en.names]);
  }

  function exportMessage(index: number): void {
    const place = places[index];
    if (options.onExport === undefined || place === undefined) return;
    const termIds = state.features.length > 0 ? state.features : TERMS.map((t) => t.id);
    const entry = buildPlan(places, [place.id], termIds, options.today, lang, plan)[0];
    const message = entry === undefined ? null : composeMessage(entry, lang);
    if (message === null) return;
    options.onExport({ text: messageToText(message, lang), filename: messageFilename(place.name, lang), mime: TEXT_MIME });
  }

  function speakPlace(index: number): void {
    const place = places[index];
    if (options.onSpeak === undefined || place === undefined) return;
    const termIds = state.features.length > 0 ? state.features : TERMS.map((t) => t.id);
    for (const chunk of speechChunks(speechSentences(place, termIds, lang))) options.onSpeak(chunk, lang);
  }

  /** Makes the report text from the form under a place. With nothing written, the box gets focus and nothing is made. */
  function exportCorrection(index: number): void {
    const place = places[index];
    if (options.onExport === undefined || place === undefined) return;
    const note = root.querySelector(`#${fixNoteId(index)}`) as { value?: unknown } | null;
    const feature = root.querySelector(`#${fixFeatureId(index)}`) as { value?: unknown } | null;
    const text = composeCorrection(place, knownFeature(typeof feature?.value === 'string' ? feature.value : ''), typeof note?.value === 'string' ? note.value : '', lang, options.today);
    if (text === null) {
      root.querySelector(`#${fixNoteId(index)}`)?.focus?.();
      return;
    }
    options.onExport({ text, filename: correctionFilename(place, lang), mime: CORRECTION_MIME });
  }

  /** Moves a place one step in the visit plan by swapping it with its neighbour in the plan. */
  function movePlace(index: number, direction: 'earlier' | 'later'): void {
    const place = places[index];
    if (place === undefined) return;
    const termIds = state.features.length > 0 ? state.features : TERMS.map((t) => t.id);
    const entries = buildPlan(places, saved, termIds, options.today, lang, plan);
    const at = entries.findIndex((e) => e.placeId === place.id);
    const neighbour = entries[direction === 'earlier' ? at - 1 : at + 1];
    if (at < 0 || neighbour === undefined) return;
    saved = swapSaved(saved, place.id, neighbour.placeId);
    writeStore(options.store, SAVED_STORE_KEY, serialiseSaved(saved));
    drawPlan();
    const now = buildPlan(places, saved, termIds, options.today, lang, plan).map((e) => e.placeId);
    announce('moved', place.name, String(positionOf(now, place.id)));
    const same = root.querySelector(`#${moveId(direction, index)}`);
    (same ?? root.querySelector(`#${moveId(direction === 'earlier' ? 'later' : 'earlier', index)}`))?.focus?.();
  }

  function exportPlace(index: number): void {
    const place = places[index];
    if (options.onExport === undefined || place === undefined) return;
    const termIds = state.features.length > 0 ? state.features : TERMS.map((t) => t.id);
    const text = placeToText(place, termIds, lang, options.today, getNote(notes, place.id), dataset?.provenance ?? null);
    options.onExport({ text, filename: placeFilename(place, lang), mime: TEXT_MIME });
  }

  /** Notes are saved as the person types. The list is not redrawn, so the cursor stays put. */
  function editNote(index: number, text: string): void {
    const place = places[index];
    if (place === undefined) return;
    notes = setNote(notes, place.id, text);
    writeStore(options.store, NOTES_STORE_KEY, serialiseNotes(notes));
    drawNoteMatches();
  }

  function resetDisplayControls(): void {
    if (prefs === null) return;
    const p = prefs.get();
    setProp(root.querySelector('#gl-pref-size'), 'value', String(p.textScale));
    setProp(root.querySelector('#gl-pref-spacing'), 'checked', p.wideSpacing);
    setProp(root.querySelector('#gl-pref-contrast'), 'checked', p.highContrast);
    setProp(root.querySelector('#gl-pref-motion'), 'checked', p.reduceMotion);
  }

  function onEvent(event: { readonly target: unknown }): void {
    const t = readTarget(event.target);
    if (t === null) return;
    if (t.id.startsWith('gl-pref-')) {
      if (prefs?.handle(t) === true && t.id === 'gl-pref-reset') {
        resetDisplayControls();
        root.querySelector('#gl-pref-reset')?.focus?.();
      }
      return;
    }
    if (t.id.startsWith('gl-f-') && t.checked !== undefined) {
      const id = t.id.slice('gl-f-'.length);
      if (state.features.includes(id) !== t.checked) updateState(toggleFeature(state, id));
    } else if (t.id === 'gl-pq' && t.value !== undefined) {
      updateState({ ...state, query: t.value });
    } else if (t.id === 'gl-hide' && t.checked !== undefined) {
      updateState({ ...state, hideNotAvailable: t.checked });
    } else if (t.id === 'gl-recent' && t.checked !== undefined) {
      if (view.recentOnly !== t.checked) updateView({ ...view, recentOnly: t.checked });
    } else if (t.id === 'gl-only-saved' && t.checked !== undefined) {
      if (view.savedOnly !== t.checked) updateView({ ...view, savedOnly: t.checked });
    } else if (t.id === 'gl-sort' && t.value !== undefined) {
      const sort = SORT_KEYS.find((k) => k === t.value);
      if (sort !== undefined && sort !== view.sort) updateView({ ...view, sort });
    } else if (t.id === 'gl-clear') {
      clear();
      root.querySelector('#gl-clear')?.focus?.();
    } else if (t.id === 'gl-more') {
      showMore();
    } else if (t.id === 'gl-export-saved') {
      exportFile('saved');
    } else if (t.id === 'gl-copy-compare') {
      exportFile('comparison');
    } else if (t.id === 'gl-export-plan') {
      exportPlan();
    } else if (t.id === BACKUP_IDS.export) {
      exportBackup();
    } else if (t.id === BACKUP_IDS.import) {
      importBackup();
    } else if (t.id === BACKUP_IDS.forget) {
      confirmingForget = true;
      drawData();
      root.querySelector(`#${BACKUP_IDS.forgetCancel}`)?.focus?.();
    } else if (t.id === BACKUP_IDS.forgetCancel) {
      confirmingForget = false;
      drawData();
      root.querySelector(`#${BACKUP_IDS.forget}`)?.focus?.();
    } else if (t.id === BACKUP_IDS.forgetSure) {
      if (confirmingForget) forgetAll();
    } else if (parseMoveId(t.id) !== null) {
      const mv = parseMoveId(t.id);
      if (mv !== null) movePlace(mv.index, mv.direction);
    } else if (parseFixId(t.id) !== null) {
      exportCorrection(parseFixId(t.id) ?? -1);
    } else if (parseSayId(t.id) !== null) {
      speakPlace(parseSayId(t.id) ?? -1);
    } else if (t.id === NOTESEARCH_INPUT_ID) {
      if (t.value !== undefined) {
        const next = t.value.slice(0, 100);
        if (next !== notesQuery) {
          notesQuery = next;
          drawNoteMatches();
        }
      }
    } else if (parseShowId(t.id) !== null) {
      showPlaceByIndex(parseShowId(t.id) ?? -1);
    } else if (parseMustId(t.id) !== null) {
      if (t.checked !== undefined) setMust(parseMustId(t.id) ?? '', t.checked);
    } else if (parseMustShowId(t.id) !== null) {
      showPlaceByIndex(parseMustShowId(t.id) ?? -1);
    } else if (parseDayShowId(t.id) !== null) {
      showPlaceByIndex(parseDayShowId(t.id) ?? -1);
    } else if (parseDayId(t.id) !== null) {
      if (t.value !== undefined) changeDay(parseDayId(t.id) ?? -1, t.value);
    } else if (t.id === DAY_EXPORT_ID) {
      exportWeek();
    } else if (t.id === CREDITS_EXPORT_ID) {
      exportCredits();
    } else if (parseSourceRenameButtonId(t.id) !== null) {
      doRenameSource(parseSourceRenameButtonId(t.id) ?? -1);
    } else if (parseRenameButtonId(t.id) !== null) {
      doRename(parseRenameButtonId(t.id) ?? -1);
    } else if (parseJoinId(t.id) !== null) {
      doJoin(parseJoinId(t.id) ?? -1);
    } else if (t.id === EDITLOG_EXPORT_ID) {
      options.onExport?.({ text: editLogToText(editLog, lang), filename: editLogFilename(lang), mime: EDITLOG_MIME });
    } else if (t.id === RECORDS_PRINT_ID) {
      options.onExport?.(recordsPrintFile(allPlaces, { lang, today: options.today, listSource: dataset?.provenance ?? null }));
    } else if (t.id === PREVIEW_CHECK_ID) {
      checkTable();
    } else if (parseLoadModeId(t.id) !== null) {
      if (t.checked === true) loadMode = parseLoadModeId(t.id) ?? 'replace';
    } else if (t.id === RECORDVIEW_IDS.tier) {
      if (t.value !== undefined) {
        const next = setTierChoice(recordView, t.value);
        changeRecordView(next, { kind: 'tier', tier: next.tier });
      }
    } else if (parseSourceBoxId(t.id) !== null) {
      const name = sourceNames(allPlaces)[parseSourceBoxId(t.id) ?? -1];
      if (name !== undefined && t.checked !== undefined) changeRecordView(setSourceCounted(recordView, name, t.checked), { kind: 'source', source: name, counted: t.checked });
    } else if (t.id === RECORDVIEW_IDS.reset) {
      if (!isDefaultRecordView(recordView)) changeRecordView(DEFAULT_RECORD_VIEW, { kind: 'reset' });
    } else if (parseEditRecordId(t.id) !== null) {
      const target = parseEditRecordId(t.id);
      if (target !== null) startEdit(target.placeIndex, target.claimIndex);
    } else if (t.id === RECORDFORM_CANCEL_ID) {
      cancelEdit();
    } else if (parseRemoveRecordId(t.id) !== null) {
      const target = parseRemoveRecordId(t.id);
      if (target !== null) dropRecord(target.placeIndex, target.claimIndex);
    } else if (parseRemovePlaceId(t.id) !== null) {
      dropPlace(parseRemovePlaceId(t.id) ?? -1);
    } else if (t.id === RECORDFORM_IDS.add) {
      addTypedRecord();
    } else if (t.id === TEMPLATE_EXPORT_ID) {
      options.onExport?.({ text: templateCsv(), filename: TEMPLATE_FILENAME, mime: RECORDS_CSV_MIME });
    } else if (t.id === SOURCECOMPARE_IDS.a || t.id === SOURCECOMPARE_IDS.b) {
      if (t.value !== undefined) {
        const next = compareSourceFromValue(allPlaces, t.value);
        const first = t.id === SOURCECOMPARE_IDS.a;
        if (next !== (first ? compareA : compareB)) {
          if (first) compareA = next;
          else compareB = next;
          drawCompareTable();
        }
      }
    } else if (t.id === SOURCECOMPARE_IDS.export) {
      exportCompare();
    } else if (t.id === LICENCEVIEW_EXPORT_ID) {
      options.onExport?.({ text: licenceViewText(allPlaces, lang, options.today), filename: licenceViewFilename(lang), mime: LICENCEVIEW_MIME });
    } else if (t.id === YEARS_EXPORT_ID) {
      options.onExport?.({ text: yearsText(allPlaces, lang, options.today), filename: yearsFilename(lang), mime: YEARS_MIME });
    } else if (t.id === REPORT_EXPORT_ID) {
      options.onExport?.({ text: reportText(allPlaces, lang, options.today), filename: reportFilename(lang), mime: REPORT_MIME });
    } else if (t.id === PREVIEWDETAIL_EXPORT_ID) {
      const box = root.querySelector(`#${RECORDSCSV_IDS.text}`) as { value?: unknown } | null;
      const text = previewDiffText(previewLoad(typeof box?.value === 'string' ? box.value : '', allPlaces, loadMode), allPlaces, lang, options.today);
      if (text !== '') options.onExport?.({ text, filename: previewDetailFilename(lang), mime: PREVIEWDETAIL_MIME });
    } else if (t.id === SNAPSHOT_IDS.exportDiff) {
      const shown = snapshotShowing === null ? undefined : snapshots[snapshotShowing];
      if (shown !== undefined) options.onExport?.({ text: snapshotDiffText(shown, allPlaces, lang, options.today), filename: snapshotDiffFilename(lang), mime: SNAPSHOT_MIME });
    } else if (t.id === TIDY_SOURCE_ID) {
      if (t.value !== undefined) {
        const next = tidySourceFromValue(allPlaces, t.value);
        if (next !== tidySource) {
          tidySource = next;
          tidyNote = '';
          const el = root.querySelector('[data-gl-tidy]');
          if (el !== null) el.innerHTML = tidyHtml();
          root.querySelector(`#${TIDY_SOURCE_ID}`)?.focus?.();
        }
      }
    } else if (parseTidyButtonId(t.id) !== null) {
      const kind = parseTidyButtonId(t.id);
      if (kind !== null) runTidy(kind);
    } else if (t.id === MATRIX_EXPORT_ID) {
      options.onExport?.({ text: matrixToCsv(places, state.features, lang), filename: matrixFilename(lang), mime: MATRIX_MIME });
    } else if (t.id === SEEN_IDS.save) {
      saveSeen();
    } else if (t.id === SEEN_IDS.filter) {
      if (isSeenFilter(t.value)) chooseSeenFilter(t.value);
    } else if (t.id === SEEN_IDS.exportText) {
      options.onExport?.({ text: seenToText(seenRows(seenList, places, lang), lang, options.today), filename: seenTextFilename(lang), mime: TEXT_MIME });
    } else if (t.id === SEEN_IDS.share) {
      shareSeenNow();
    } else if (parseSeenRemoveId(t.id) !== null) {
      dropSeen(parseSeenRemoveId(t.id) ?? -1);
    } else if (t.id === INFOFILTER_IDS.kind) {
      if (t.value !== undefined) narrowByInfo({ ...activeInfoFilter(), kind: kindFromChoice(t.value, places) }, INFOFILTER_IDS.kind);
    } else if (t.id === INFOFILTER_IDS.area) {
      if (t.value !== undefined) narrowByInfo({ ...activeInfoFilter(), area: areaFromChoice(t.value, places) }, INFOFILTER_IDS.area);
    } else if (t.id === INFOFILTER_IDS.clear) {
      narrowByInfo(NO_INFO_FILTER, INFOFILTER_IDS.kind);
    } else if (t.id === INFOFORM_IDS.place) {
      if (t.value !== undefined) {
        const index = /^\d{1,5}$/.test(t.value) && allPlaces[Number(t.value)] !== undefined ? Number(t.value) : null;
        if (index !== infoPlace) {
          infoPlace = index;
          infoDraft = draftFromInfo(index === null ? undefined : allPlaces[index]?.info);
          infoNote = '';
          infoProblems = [];
          drawInfoForm(INFOFORM_IDS.place);
        }
      }
    } else if (t.id === INFOFORM_IDS.save) {
      saveInfo();
    } else if (t.id === INFOFORM_IDS.remove) {
      dropInfo();
    } else if (t.id === SNAPSHOT_IDS.add) {
      keepSnapshot();
    } else if (parseSnapshotButtonId(t.id) !== null) {
      const target = parseSnapshotButtonId(t.id);
      if (target?.action === 'rm') dropSnapshot(target.index);
      else if (target?.action === 'use') restoreSnapshot(target.index);
      else if (target !== null && snapshots[target.index] !== undefined) {
        snapshotShowing = snapshotShowing === target.index ? null : target.index;
        snapshotNote = '';
        drawSnapshots(snapshotButtonId('diff', target.index));
      }
    } else if (t.id === GAPS_EXPORT_ID) {
      exportGaps();
    } else if (parseGapShowId(t.id) !== null) {
      showPlaceByIndex(parseGapShowId(t.id) ?? -1);
    } else if (t.id === SOURCEVIEW_SELECT_ID) {
      if (t.value !== undefined) {
        const next = sourceFromValue(allPlaces, t.value);
        if (next !== sourceChoice) {
          sourceChoice = next;
          drawSourceTable();
        }
      }
    } else if (t.id === SOURCEVIEW_EXPORT_ID) {
      exportSourceView();
    } else if (t.id === RECORDAGES_EXPORT_ID) {
      exportOldRecords();
    } else if (parseOldRecordShowId(t.id) !== null) {
      showPlaceByIndex(parseOldRecordShowId(t.id) ?? -1);
    } else if (t.id === FEATUREVIEW_SELECT_ID) {
      if (t.value !== undefined) {
        const next = isFeatureId(t.value) ? t.value : '';
        if (next !== featureChoice) {
          featureChoice = next;
          drawFeatureTable();
        }
      }
    } else if (t.id === FEATUREVIEW_EXPORT_ID) {
      exportFeatureView();
    } else if (t.id === DISAGREE_EXPORT_ID) {
      exportDisagreements();
    } else if (parseDisagreeShowId(t.id) !== null) {
      showPlaceByIndex(parseDisagreeShowId(t.id) ?? -1);
    } else if (t.id === RECSEARCH_INPUT_ID) {
      if (t.value !== undefined) {
        // Leaving the box fires "change" with the same text. Drawing again then would replace a
        // Show button while it is being pressed, and the press would be lost.
        const next = t.value.slice(0, MAX_RECORD_QUERY);
        if (next !== recordQuery) {
          recordQuery = next;
          drawRecordMatches();
        }
      }
    } else if (parseRecordShowId(t.id) !== null) {
      showPlaceByIndex(parseRecordShowId(t.id) ?? -1);
    } else if (t.id === PROBLEMS_EXPORT_ID) {
      exportProblems();
    } else if (parseProblemShowId(t.id) !== null) {
      showPlaceByIndex(parseProblemShowId(t.id) ?? -1);
    } else if (t.id === RECORDSCSV_IDS.export) {
      exportRecords();
    } else if (t.id === RECORDSCSV_IDS.load) {
      loadRecords();
    } else if (parseQuizId(t.id) !== null) {
      const q = parseQuizId(t.id);
      if (q !== null) quizAct(q);
    } else if (parseTagShowId(t.id) !== null) {
      showPlaceByIndex(parseTagShowId(t.id) ?? -1);
    } else if (parseDueShowId(t.id) !== null) {
      showPlaceByIndex(parseDueShowId(t.id) ?? -1);
    } else if (parseTagAddId(t.id) !== null) {
      addTagFromBox(parseTagAddId(t.id) ?? -1);
    } else if (parseUntagId(t.id) !== null) {
      const u = parseUntagId(t.id);
      if (u !== null) removeTagAt(u.index, u.tagIndex);
    } else if (t.id === TAG_FILTER_ID) {
      if (t.value !== undefined) chooseTag(t.value);
    } else if (parseReminderFieldId(t.id) !== null) {
      if (t.value !== undefined) changeReminder(parseReminderFieldId(t.id) ?? -1, t.value);
    } else if (parseClearReminderId(t.id) !== null) {
      changeReminder(parseClearReminderId(t.id) ?? -1, '');
    } else if (t.id === REMINDER_EXPORT_ID) {
      exportReminders();
    } else if (parsePracticeId(t.id) !== null) {
      practiceAct(parsePracticeId(t.id) ?? 'show');
    } else if (t.id === LOG_EXPORT_ID) {
      exportVisits();
    } else if (parsePrintListId(t.id) !== null) {
      printList(parsePrintListId(t.id) ?? -1);
    } else if (t.id === SEARCH_IDS.save) {
      saveCurrentSearch();
    } else if (parseUseSearchId(t.id) !== null) {
      useSearch(parseUseSearchId(t.id) ?? -1);
    } else if (parseDeleteSearchId(t.id) !== null) {
      removeSearch(parseDeleteSearchId(t.id) ?? -1);
    } else if (t.id === LIST_IDS.create) {
      createNewList();
    } else if (parseRemoveListId(t.id) !== null) {
      const rm = parseRemoveListId(t.id);
      if (rm !== null) removePlaceFromList(rm.list, rm.place);
    } else if (parseExportListId(t.id) !== null) {
      exportList(parseExportListId(t.id) ?? -1);
    } else if (parseDeleteListId(t.id) !== null) {
      removeList(parseDeleteListId(t.id) ?? -1);
    } else if (parsePickListId(t.id) !== null) {
      if (t.value !== undefined && t.value !== '') addPlaceToList(parsePickListId(t.id) ?? -1, t.value);
    } else if (parseRelaxId(t.id) !== null) {
      relax(t.id);
    } else if (t.id === UNDO_ID) {
      undo();
    } else if (t.id === SHORTCUTS_TOGGLE_ID && t.checked !== undefined) {
      if (t.checked !== shortcuts) setShortcuts(t.checked);
    } else if (parseVisitId(t.id) !== null) {
      toggleVisit(parseVisitId(t.id) ?? -1);
    } else if (t.id === TOUR_IDS.open) {
      tour = startTour();
      drawTour();
    } else if (t.id === TOUR_IDS.next) {
      tour = nextStep(tour);
      drawTour();
    } else if (t.id === TOUR_IDS.prev) {
      tour = prevStep(tour);
      drawTour();
    } else if (t.id === TOUR_IDS.close) {
      tour = closeTour();
      drawTour();
    } else if (t.id === 'gl-export-plan-csv') {
      exportPlanCsv();
    } else if (t.id === 'gl-print-plan') {
      exportPrint();
    } else if (parseNameId(t.id) !== null) {
      useName(parseNameId(t.id) ?? -1);
    } else if (t.id === RECENT_CLEAR_ID) {
      clearRecent();
    } else if (parseRecentId(t.id) !== null) {
      useRecent(parseRecentId(t.id) ?? -1);
    } else if (parseGroupId(t.id) !== null) {
      chooseGroup(parseGroupId(t.id) ?? '');
    } else if (parseMessageId(t.id) !== null) {
      exportMessage(parseMessageId(t.id) ?? -1);
    } else if (t.id.startsWith('gl-ask-')) {
      const ask = parseAskId(t.id);
      if (ask !== null && t.checked !== undefined) tickAsked(ask.index, ask.termId, t.checked);
    } else if (/^gl-note-\d+$/.test(t.id)) {
      if (t.value !== undefined) editNote(Number(t.id.slice('gl-note-'.length)), t.value);
    } else if (t.id.startsWith('gl-sg-')) {
      addSuggested(t.id.slice('gl-sg-'.length));
    } else {
      const cmp = /^gl-cmp-(\d+)$/.exec(t.id);
      const save = /^gl-save-(\d+)$/.exec(t.id);
      const copy = /^gl-copy-(\d+)$/.exec(t.id);
      if (cmp !== null) toggleCompare(Number(cmp[1]));
      else if (save !== null) toggleSave(Number(save[1]));
      else if (copy !== null) exportPlace(Number(copy[1]));
    }
  }

  paint();
  for (const type of ['input', 'change', 'click']) root.addEventListener(type, onEvent);
  root.addEventListener('keydown', onKey);
  // "toggle" does not bubble, so it is caught on the way down. The open panels are drawn open again after a redraw.
  root.addEventListener(
    'toggle',
    (event) => {
      const toggle = panelFromTarget(event.target);
      if (toggle !== null) openPanels = togglePanel(openPanels, toggle);
    },
    true,
  );
  root.addEventListener('change', (event) => {
    if (readTarget(event.target)?.id === 'gl-pq') rememberSearch();
  });

  return {
    getState: () => state,
    getView: () => view,
    getPrefs: () => prefs?.get() ?? DEFAULT_PREFS,
    getSaved: () => saved,
    getNotes: () => notes,
    getTags: () => tags,
    getSeen: () => seenList,
    getReminders: () => reminders,
    getMust: () => must,
    getDays: () => days,
    getPlan: () => plan,
    getLists: () => lists,
    getSearches: () => searches,
    getChanges: () => changes,
    getComparison: () => selected.flatMap((i) => (places[i] === undefined ? [] : [places[i].id])),
    setLang(next: Lang): void {
      lang = next;
      paint();
    },
    setPlaces(next: readonly Place[], nextDataset?: PlaceDataset | null): void {
      recordsMessage = '';
      recordForm = { draft: EMPTY_DRAFT, message: '', problems: [] };
      usePlaces(next, nextDataset ?? null);
    },
    refreshConnection: paint,
    clear,
  };
}
