import { ONBOARDING_PATHS } from "../../src/paths";
import {
  SCAN_INTERVALS_MS,
  attachRovingFocus,
  initialState,
  reduce,
  type FirstRunAction,
  type FirstRunState,
  type Locale,
  type MoveMode,
  type ScanMs,
} from "../../switch-first/src/index";
import { createAnnouncer, focusHeading, type Announcer } from "./announce";
import { auditDom, type Violation } from "./audit";
import { COPY, importDone, resultsCount, restoreDone, sectionOf, t } from "./copy";
import { queryWords, searchHelp } from "./search";
import { START_NODE, getQuestion } from "./chooser";
import { clearRecent, isReadingMode, loadHelpState, recordRecent, saveHelpState, setReading, type HelpState } from "./helpstate";
import { getArticle } from "./articles";
import { DEFAULT_NAME_SECTION, isNameSection, listControls, type ControlInfo, type NameSection } from "./names";
import { renderNames } from "./views-names";
import { getWord, wordAnchor } from "./glossary";
import { renderWords } from "./views-words";
import { EMPTY_PRACTICE, buttonName, clearLog, describeKey, parseButton, pushLog, recordPress, totalPresses, type PracticeState } from "./practice";
import { DEFAULT_DISPLAY, applyDisplay, loadDisplay, saveDisplay, updateDisplay, type Display } from "./display";
import { clearAll, clearItem, getItem, inspectAll, type ItemId } from "./inventory";
import { renderDevice } from "./views-device";
import { getStep, stepReports } from "./steps";
import { renderSteps } from "./views-steps";
import { exportNotes, importNotes, mergeNotes } from "./exchange";
import { FACT_KEYS, type FactKey, type Tri } from "./facts";
import { hasRequirement, withRequirement, type Requirement } from "./filter";
import {
  clearDraft,
  emptyForm,
  emptyUnknownDetails,
  loadDraft,
  saveDraft,
  toNote,
  validateForm,
  type FieldError,
  type FormValues,
} from "./form";
import { button, esc } from "./html";
import { applyLocale, nativeName, negotiateLocale, otherLocale } from "./locale";
import { LIMITS, type Note } from "./model";
import { addNote, loadNotes, removeNote, saveNotes } from "./outbox";
import type { OfflineStatus } from "./register";
import {
  clearPlaceChecklist,
  loadChecklist,
  pruneChecklist,
  saveChecklist,
  setAnswer,
  setAsked,
  type AnswerError,
  type Checklist,
} from "./checklist";
import { pruneCompare, toggleCompare, canCompare } from "./compare";
import { hasNeeds, loadNeeds, saveNeeds } from "./needs";
import { exportLists, type Lists } from "./backup";
import { buildPlan, planToText } from "./plan";
import { findPlace, groupPlaces } from "./places";
import { formForPlace } from "./report";
import { hashToView, isRouteHash, viewToHash } from "./router";
import { loadShortlist, pruneShortlist, saveShortlist, toggleShortlist } from "./shortlist";
import { isSortKey, type SortKey } from "./sort";
import { loadPrefs, savePrefs, type KeyValueStore, type Prefs, type SaveResult } from "./store";
import { injectStyles } from "./styles";
import { renderCardGuide, renderPathStep, renderSetup } from "./views";
import type { View } from "./view";
import { renderDisplay } from "./views-display";
import { renderCompare } from "./views-compare";
import { collectSources, onlySource, sourceNames } from "./sources";
import { renderSources } from "./views-sources";
import { renderSummary } from "./views-summary";
import { previewNotesImport, type NotesPreview } from "./importpreview";
import { prepareRestore, type RestorePreview } from "./restorepreview";
import { dismissPair, loadDismissed, pruneDismissed, saveDismissed } from "./dismissed";
import { findSimilar, hiddenCount, pairKey } from "./similar";
import { renderSimilar } from "./views-similar";
import { REVIEW_PAGE, buildReview, clampShown, isReviewReason, reasonLabel, shownText, type ReviewReason } from "./review";
import { renderReview } from "./views-review";
import { renderHistory } from "./views-history";
import { LATEST_PAGE, clampLatest, isRecordKind, latestRecords, latestShownText } from "./latest";
import { renderLatest } from "./views-latest";
import { renderAges } from "./views-ages";
import { renderRepeats } from "./views-repeats";
import { renderGaps } from "./views-gaps";
import { renderByDetail } from "./views-bydetail";
import { renderRoundup } from "./views-roundup";
import { renderMustHaves } from "./views-musthaves";
import { positionText, renderShortlistPage } from "./views-shortlist";
import { renderNoteCheck } from "./views-notecheck";
import { renderPathsIndex } from "./views-pathsindex";
import { stepStatus, type StepStatus } from "./stepstatus";
import { doneCount, loadProgress, nextStepIndex, progressText, resetPath, saveProgress, setDone, type PathProgress } from "./pathprogress";
import { focusAfter, moveInShortlist, removeFromShortlist } from "./shortlist-order";
import { isNeedChoice, setNeed } from "./musthaves";
import { askedText, buildRoundup, onlyQuestionsLeft } from "./roundup";
import { isFactKey } from "./bydetail";
import { detailGaps, needKeys, placesWithGaps } from "./gaps";
import { kindLabel, type RecordKind } from "./tier";
import { clampStep, renderArticle, renderFind, renderHelpBody, renderHelpHome, renderPractice, renderPracticeLog, sectionAnchor, type HelpHomeContext } from "./views-help";
import { renderForm } from "./views-form";
import { renderClearArea, renderPlaceDetail, renderPlaceResults, renderPlan, renderPlaces, type PlanContext, type PlacesContext } from "./views-places";
import { renderNotes, renderResults, type NotesContext } from "./views-notes";
import {
  addPlaceStop,
  addStop,
  answerQuestion as surveyAnswer,
  stepBack as surveyBack,
  backToPlan,
  clearSurvey,
  currentQuestion as surveyCurrent,
  editAnswer as surveyEdit,
  emptySurvey,
  hasAnswer,
  isEmptySurvey,
  leaveStop,
  loadSurvey,
  moveStop,
  removeStop,
  saveSurvey,
  setLicence,
  setObservedOn,
  startSurvey as surveyStart,
  startErrors,
  surveyToNotes as surveyNotes,
  type StartError,
  type StopError,
  type Survey,
} from "./survey";
import { SURVEY_COPY, nextAnnouncement, placeLabel, savedMessage, stopError } from "./survey-copy";
import { renderSurvey, type SurveyContext } from "./views-survey";
import { ASK_COPY, defaultAskKeys, toggleAskKey } from "./askplace";
import {
  ASKED_COPY,
  findAsk,
  isAskWay,
  loadAsked,
  markNoReply,
  markReplied,
  markWaiting,
  recordAsk,
  removeAsk,
  saveAsked,
  waitingCount,
  type AskRecord,
  type AskWay,
} from "./asked";
import { renderAsked } from "./views-asked";
import { BIN_COPY, addToBin, deleteFromBin, loadBin, restoreFromBin, saveBin, type BinEntry } from "./bin";
import { renderBin } from "./views-bin";
import { PARTS, importDevice, isDeviceFile, mergeDevice, usefulParts, broughtText, MOVE_COPY, MOVE_ERRORS, type DeviceData, type DeviceError, type Part, type PartPlan } from "./devicefile";
import { renderMove } from "./views-move";
import { filterNotes, pick as pickShared, shortlistNoteIds } from "./share";
import { renderShare } from "./views-share";
import { renderCards } from "./views-cards";
import { emptyPassport, isDeviceKind, loadPassport, needsFromRequirement, savePassport, validatePassport, PASSPORT_COPY, SIZE_KEYS, type Passport, type PassportError } from "./passport";
import { renderPassport } from "./views-passport";
import { DEFAULT_SHOW, isShowSize, type ShowOptions } from "./showcard";
import { renderShowCard } from "./views-showcard";
import {
  VISIT_COPY,
  draftFromVisit,
  emptyVisitDraft,
  followUps,
  formFromVisit,
  isFoundChoice,
  loadVisits,
  makeVisit,
  removeVisit,
  saveVisits,
  upsertVisit,
  validateVisit,
  defaultVisitId,
  type FoundChoice,
  type Visit,
  type VisitDraft,
  type VisitError,
  type VisitFilter,
  NO_FILTER,
  filterVisits,
  visitsShownText,
} from "./visits";
import { renderPlaceVisits, renderVisitForm, renderVisits } from "./views-visits";
import { CSV_FILE_ERRORS, CSV_IMPORT_COPY, chosenNotes, csvAddedText, csvTakenBackText, previewCsvImport, readFileText, type CsvPreview } from "./csvimport";
import { renderCsvImport } from "./views-csvimport";
import {
  COMBINE_COPY,
  RENAME_COPY,
  SPLIT_COPY,
  addressOptions,
  checkSplit,
  checkTarget,
  combinePlaces,
  defaultChoice,
  isValidChoice,
  maybeSame,
  nameOptions,
  renamePlace,
  splitPlace,
  targetOf,
  type CombineChoice,
  type CombineData,
} from "./combine";
import { renderCombine, renderMaybeSame } from "./views-combine";
import { renderRename, renderSplit, type PlaceEditState } from "./views-placeedit";
import { EDIT_COPY, correctNote, diffNotes, editable, formFromNote, loadCorrections, logCorrection, pruneCorrections, saveCorrections, type Correction } from "./noteedit";
import { renderAskPlace } from "./views-ask";
import { mountStatementReader, type StatementHandle } from "./statement-mount";
import type { StatementSource } from "./statement";
import { QUESTIONS } from "./plan";

export interface ShellOptions {
  readonly requestedLocales: readonly string[];
  readonly store?: KeyValueStore | undefined;
  readonly doc?: Document;
  readonly today?: Date;
  readonly onDone?: (prefs: Prefs) => void;
  /** Called after every render with the DOM audit result (see audit.ts). */
  readonly onAudit?: (violations: Violation[]) => void;
  /** Opt in to #/ addresses for each screen (back button and links work). Off by default. */
  readonly hashRouting?: boolean;
  readonly win?: Window;
}

export interface ShellHandle {
  getView(): View;
  getLocale(): Locale;
  getNotes(): readonly Note[];
  setOfflineStatus(status: OfflineStatus): void;
  destroy(): void;
}

interface State {
  view: View;
  locale: Locale;
  setup: FirstRunState;
  offline: OfflineStatus;
  display: Display;
  notes: Note[];
  droppedNotes: number;
  req: Requirement;
  query: string;
  pendingRemove: string | undefined;
  exportText: string | undefined;
  importText: string;
  importMessage: string | undefined;
  status: string | undefined;
  form: FormValues;
  errors: FieldError[];
  restored: boolean;
  needs: Requirement;
  usingSaved: boolean;
  shortlist: string[];
  shortlistOnly: boolean;
  sort: SortKey;
  compareIds: string[];
  checklist: Checklist;
  /** Short-path steps the person ticked as done. */
  pathProgress: PathProgress;
  /** On the short paths page: waiting for the second press of "Clear every tick". */
  pathsConfirm: boolean;
  answerError: { key: string; code: AnswerError } | undefined;
  confirmClear: boolean;
  /** The item waiting for a yes or no on the device page. */
  deviceConfirm: ItemId | "all" | undefined;
  /** Where to go after the "add a note" form, when it was opened from a place. */
  afterForm: View | undefined;
  prefill: FormValues | undefined;
  helpQuery: string;
  /** Reading mode and recently opened articles, kept on this device. */
  help: HelpState;
  /** Zero-based section shown when an article is read one section at a time. */
  articleStep: number;
  /** The keyboard practice log. Kept in memory only; it is never saved. */
  practice: PracticeState;
  /** The help item last opened, so going back can put focus on it again. */
  helpReturn: KeepTarget | undefined;
  backupText: string | undefined;
  restoreText: string;
  restoreMessage: string | undefined;
  summarySource: string | undefined;
  reviewOnly: ReviewReason | undefined;
  reviewShown: number;
  latestOnly: RecordKind | undefined;
  /** On the details with no record page: show only the must-have details. */
  gapsOnlyNeeds: boolean;
  /** On the shortlist round-up: show only places with questions left. */
  roundupLeft: boolean;
  latestShown: number;
  dismissed: string[];
  importPreview: NotesPreview | undefined;
  importPreviewText: string;
  restorePreview: RestorePreview | undefined;
  restorePreviewText: string;
  survey: Survey;
  surveyAddErrors: readonly StopError[];
  surveyStartErrors: readonly StartError[];
  surveyDraft: { readonly name: string; readonly address: string };
  surveyConfirm: boolean;
  /** The page reader's starting place and source, set when it is opened from a place. */
  statementStart: { readonly placeId: string; readonly placeName: string; readonly address: string; readonly from: StatementSource } | undefined;
  askKeys: readonly FactKey[];
  askLang: Locale;
  asked: readonly AskRecord[];
  askWay: AskWay | undefined;
  askWayError: boolean;
  bin: readonly BinEntry[];
  binConfirmDelete: string | undefined;
  binConfirmEmpty: boolean;
  corrections: readonly Correction[];
  /** The note being corrected in the form, if any. */
  editing: string | undefined;
  /** The note just removed, offered back with "Undo" until the person does something else. */
  undoId: string | undefined;
  /** "Move everything to another device": the pasted text, what it would add, and the parts chosen. */
  movePaste: string;
  moveError: DeviceError | undefined;
  moveIncoming: DeviceData | undefined;
  movePlans: readonly PartPlan[] | undefined;
  moveChosen: ReadonlySet<Part>;
  moveNoneChosen: boolean;
  moveMadeOn: string | undefined;
  /** "Share some notes": what is shown, what is picked, and whether the extra text goes too. */
  shareQuery: string;
  sharePicked: readonly string[];
  shareWithText: boolean;
  /** Larger text on printed cards. Kept while the person moves between card pages. */
  cardLarge: boolean;
  /** The saved access card, the form's values and their problems, and whether cards print it first. */
  passport: Passport | undefined;
  passportDraft: Passport;
  passportErrors: readonly PassportError[];
  cardPassport: boolean;
  /** How the card is shown to staff. Kept for this visit only. */
  show: ShowOptions;
  /** "My visits", the visit form's values and problems, and the visit waiting for "Yes, remove it". */
  visits: Visit[];
  visitDraft: VisitDraft;
  visitErrors: readonly VisitError[];
  visitPendingRemove: string | undefined;
  visitFilter: VisitFilter;
  /** "Bring notes in from a spreadsheet": the rows, what they would add, and the text that preview was made from. */
  csvText: string;
  csvPreview: CsvPreview | undefined;
  csvPreviewText: string;
  csvMessage: string | undefined;
  /** Notes in the preview the person left out. */
  csvLeftOut: Set<string>;
  /** Ids of the notes just added from a spreadsheet, while "Take back" is offered; and the ids to offer after the next page change. */
  csvJustAdded: readonly string[];
  csvUndoNext: readonly string[];
  /** The names chosen on the combine page. */
  combineChoice: CombineChoice | undefined;
  /** What the App kept before two places were combined, while "Undo" is offered; and what to offer after the next page change. */
  combineUndo: CombineSnapshot | undefined;
  combineUndoNext: CombineSnapshot | undefined;
  /** The rename or split page: what was typed and chosen, and what it would do. */
  placeEdit: PlaceEditState;
}

interface CombineSnapshot {
  readonly kind: "combine" | "rename" | "split";
  /** Where "Undo" takes the person: the pairs page, or the place as it was. */
  readonly back: View;
  readonly data: CombineData;
  readonly corrections: readonly Correction[];
}

const EMPTY_EDIT: PlaceEditState = { name: "", address: "", chosen: [], errors: [], preview: undefined };

const UNDO_COPY = {
  combine: { undo: COMBINE_COPY.undo, undone: COMBINE_COPY.undone },
  rename: { undo: RENAME_COPY.undo, undone: RENAME_COPY.undone },
  split: { undo: SPLIT_COPY.undo, undone: SPLIT_COPY.undone },
} as const;

type FocusMode = "keep" | "heading" | "summary" | "none";

interface KeepTarget {
  readonly action: string;
  readonly value?: string | undefined;
  readonly key?: string | undefined;
}

const SWITCH_ACTIONS = new Set(["choose-mode", "set-scan", "next", "back", "skip"]);

function isMode(v: string | undefined): v is MoveMode {
  return v === "keyboard" || v === "switch" || v === "pointer";
}

function toScan(v: string | undefined): ScanMs | undefined {
  return SCAN_INTERVALS_MS.find((ms) => String(ms) === v);
}

function navSection(v: View): "setup" | "notes" | "help" | "display" {
  switch (v.kind) {
    case "setup":
      return "setup";
    case "notes":
    case "form":
    case "places":
    case "place":
    case "plan":
    case "compare":
    case "sources":
    case "summary":
    case "similar":
    case "combine":
    case "placerename":
    case "placesplit":
    case "review":
    case "history":
    case "latest":
    case "ages":
    case "repeats":
    case "gaps":
    case "bydetail":
    case "roundup":
    case "musthaves":
    case "shortlistpage":
    case "notecheck":
    case "survey":
    case "statement":
    case "ask":
    case "asked":
    case "removed":
    case "share":
    case "passport":
    case "showcard":
    case "visits":
    case "visit":
    case "csvimport":
      return "notes";
    case "display":
      return "display";
    default:
      return "help";
  }
}

export function mountShell(root: HTMLElement, opts: ShellOptions): ShellHandle {
  const doc = opts.doc ?? root.ownerDocument;
  const today = opts.today ?? new Date();
  const saved = loadPrefs(opts.store);
  const locale = negotiateLocale(opts.requestedLocales, saved.locale);

  let setup = initialState();
  if (saved.mode) setup = reduce(setup, { type: "choose-mode", mode: saved.mode });
  if (saved.scanMs) setup = reduce(setup, { type: "set-scan", ms: saved.scanMs });

  const loaded = loadNotes(opts.store);
  const state: State = {
    view: { kind: "setup" },
    locale,
    setup,
    offline: "pending",
    display: loadDisplay(opts.store),
    notes: loaded.notes,
    droppedNotes: loaded.dropped,
    req: {},
    query: "",
    pendingRemove: undefined,
    exportText: undefined,
    importText: "",
    importMessage: undefined,
    status: loaded.dropped > 0 ? t(COPY.notes.dropped, locale) : undefined,
    form: emptyForm(today),
    errors: [],
    restored: false,
    needs: loadNeeds(opts.store),
    usingSaved: false,
    shortlist: loadShortlist(opts.store),
    shortlistOnly: false,
    sort: "name",
    compareIds: [],
    checklist: loadChecklist(opts.store),
    pathProgress: loadProgress(opts.store),
    pathsConfirm: false,
    answerError: undefined,
    confirmClear: false,
    deviceConfirm: undefined,
    afterForm: undefined,
    prefill: undefined,
    helpQuery: "",
    help: loadHelpState(opts.store),
    articleStep: 0,
    practice: EMPTY_PRACTICE,
    helpReturn: undefined,
    backupText: undefined,
    restoreText: "",
    restoreMessage: undefined,
    summarySource: undefined,
    reviewOnly: undefined,
    reviewShown: REVIEW_PAGE,
    latestOnly: undefined,
    gapsOnlyNeeds: false,
    roundupLeft: false,
    latestShown: LATEST_PAGE,
    dismissed: loadDismissed(opts.store),
    importPreview: undefined,
    importPreviewText: "",
    restorePreview: undefined,
    restorePreviewText: "",
    survey: loadSurvey(opts.store, today) ?? emptySurvey(today),
    surveyAddErrors: [],
    surveyStartErrors: [],
    surveyDraft: { name: "", address: "" },
    surveyConfirm: false,
    statementStart: undefined,
    askKeys: [],
    askLang: locale,
    asked: loadAsked(opts.store),
    askWay: undefined,
    askWayError: false,
    bin: loadBin(opts.store, today),
    binConfirmDelete: undefined,
    binConfirmEmpty: false,
    corrections: loadCorrections(opts.store),
    editing: undefined,
    undoId: undefined,
    movePaste: "",
    moveError: undefined,
    moveIncoming: undefined,
    movePlans: undefined,
    moveChosen: new Set(),
    moveNoneChosen: false,
    moveMadeOn: undefined,
    shareQuery: "",
    sharePicked: [],
    shareWithText: false,
    cardLarge: false,
    passport: loadPassport(opts.store, today),
    passportDraft: loadPassport(opts.store, today) ?? emptyPassport(today),
    passportErrors: [],
    cardPassport: true,
    show: DEFAULT_SHOW,
    visits: loadVisits(opts.store, today),
    visitDraft: emptyVisitDraft(today),
    visitErrors: [],
    visitPendingRemove: undefined,
    visitFilter: NO_FILTER,
    csvText: "",
    csvPreview: undefined,
    csvPreviewText: "",
    csvMessage: undefined,
    csvLeftOut: new Set(),
    csvJustAdded: [],
    csvUndoNext: [],
    combineChoice: undefined,
    combineUndo: undefined,
    combineUndoNext: undefined,
    placeEdit: EMPTY_EDIT,
  };

  injectStyles(doc);
  applyDisplay(doc, state.display);
  const announcer: Announcer = createAnnouncer(doc);
  let detachers: Array<() => void> = [];
  /** The page reader, while its screen is showing. It draws and listens inside its own element. */
  let reader: StatementHandle | undefined;

  function mountReader(): void {
    const host = root.querySelector<HTMLElement>("#statement-host");
    if (state.view.kind !== "statement" || !host) return;
    const start = state.statementStart;
    reader = mountStatementReader(host, {
      locale: state.locale,
      store: opts.store,
      doc,
      today,
      announcer,
      ...(start ? { initial: { placeName: start.placeName, address: start.address, from: start.from } } : {}),
      onSaved: () => {
        state.notes = loadNotes(opts.store).notes;
        // A note read from the place's own reply means the place answered.
        if (start?.from === "reply" && findAsk(state.asked, start.placeId)?.state === "waiting") keepAsked(markReplied(state.asked, start.placeId, today));
      },
      ...(opts.onAudit ? { onAudit: opts.onAudit } : {}),
    });
  }

  const currentPrefs = (): Prefs => ({
    locale: state.locale,
    mode: state.setup.mode,
    scanMs: state.setup.scanMs,
  });
  const persist = (): SaveResult => savePrefs(opts.store, currentPrefs());

  const notesContext = (): NotesContext => ({
    notes: state.notes,
    req: state.req,
    query: state.query,
    locale: state.locale,
    today,
    pendingRemove: state.pendingRemove,
    exportText: state.exportText,
    importText: state.importText,
    importMessage: state.importMessage,
    importPreview: state.importPreview,
    statusMessage: state.status,
    hasSavedNeeds: hasNeeds(state.needs),
    askedWaiting: waitingCount(state.asked),
    corrections: state.corrections,
    binCount: state.bin.length,
    undoId: state.undoId,
    csvJustAdded: state.csvJustAdded.length,
  });

  const placesContext = (): PlacesContext => ({
    places: groupPlaces(state.notes, state.locale),
    req: state.req,
    query: state.query,
    locale: state.locale,
    today,
    hasSavedNeeds: hasNeeds(state.needs),
    statusMessage: state.status,
    shortlist: state.shortlist,
    shortlistOnly: state.shortlistOnly,
    sort: state.sort,
    compareIds: state.compareIds,
    backupText: state.backupText,
    restoreText: state.restoreText,
    restoreMessage: state.restoreMessage,
    restorePreview: state.restorePreview,
  });

  const planContext = (id: string): PlanContext => ({
    place: findPlace(groupPlaces(state.notes, state.locale), id),
    req: state.usingSaved ? state.needs : state.req,
    usingSaved: state.usingSaved,
    locale: state.locale,
    today,
    checklist: state.checklist,
    answerError: state.answerError,
    confirmClear: state.confirmClear,
    statusMessage: state.status,
  });

  /** Keeps saved lists pointing at places that still exist. */
  function pruneSaved(): void {
    const places = groupPlaces(state.notes, state.locale);
    const sl = pruneShortlist(state.shortlist, places);
    if (sl.length !== state.shortlist.length) {
      state.shortlist = sl;
      saveShortlist(opts.store, sl);
    }
    state.compareIds = pruneCompare(state.compareIds, places);
    const dm = pruneDismissed(state.dismissed, places);
    if (dm.length !== state.dismissed.length) {
      state.dismissed = dm;
      saveDismissed(opts.store, dm);
    }
    const cl = pruneChecklist(state.checklist, places);
    if (Object.keys(cl).length !== Object.keys(state.checklist).length) {
      state.checklist = cl;
      saveChecklist(opts.store, cl);
    }
  }

  /** What the path step will find on this device now, or undefined for steps away from the App. */
  function statusFor(pathId: string, step: number): StepStatus | undefined {
    const path = ONBOARDING_PATHS.find((p) => p.id === pathId);
    const s = path?.steps[Math.min(Math.max(step, 0), path.steps.length - 1)];
    if (!s) return undefined;
    return stepStatus(pathId, s.id, { notes: state.notes, needs: state.needs, shortlist: state.shortlist, dismissed: state.dismissed, locale: state.locale, today });
  }

  function helpContext(): HelpHomeContext {
    return { locale: state.locale, mode: state.setup.mode, query: state.helpQuery, recent: state.help.recent, progress: state.pathProgress };
  }

  function body(): string {
    return bodyFor(state.view);
  }

  /** Where the names of one screen come from: the whole page for that section, built off to the side. */
  function sectionNames(section: NameSection): ControlInfo[] {
    const holder = doc.createElement("div");
    holder.innerHTML = chrome(bodyFor({ kind: section }));
    return listControls(holder);
  }

  function bodyFor(v: View): string {
    switch (v.kind) {
      case "words":
        return renderWords(v.term, state.locale);
      case "names":
        return renderNames({ section: v.section, controls: sectionNames(v.section), locale: state.locale });
      case "setup":
        return renderSetup(state.setup, state.locale);
      case "help":
        return renderHelpHome(helpContext());
      case "steps":
        return renderSteps({ locale: state.locale, reports: stepReports(opts.store) });
      case "device":
        return renderDevice({ locale: state.locale, reports: inspectAll(opts.store), confirm: state.deviceConfirm, status: state.status });
      case "article":
        return renderArticle(v.id, state.locale, { reading: state.help.reading, step: state.articleStep });
      case "find":
        return renderFind(v.node, state.locale);
      case "practice":
        return renderPractice({ log: state.practice.log, total: totalPresses(state.practice) }, state.locale);
      case "pathsindex":
        return renderPathsIndex({ locale: state.locale, progress: state.pathProgress, confirmClear: state.pathsConfirm, statusMessage: state.status });
      case "card":
        return renderCardGuide(state.locale, today);
      case "path":
        return renderPathStep(v.id, v.step, state.locale, state.pathProgress, today, statusFor(v.id, v.step)) ?? renderHelpHome(helpContext());
      case "notes":
        return renderNotes(notesContext());
      case "form":
        return renderForm(state.form, state.errors, state.locale, state.restored, state.editing ? "correct" : "add");
      case "display":
        return renderDisplay(state.display, state.locale);
      case "places":
        return renderPlaces(placesContext());
      case "place":
      {
        const place = findPlace(groupPlaces(state.notes, state.locale), v.id);
        // A message from the step just taken (combined, renamed, undone) is shown on the place's page, with "Undo" while it is offered.
        const notice = state.status ? `<p class="notice">${esc(state.status)}</p>` : "";
        const undo = notice + (state.combineUndo ? `<p>${button(t(UNDO_COPY[state.combineUndo.kind].undo, state.locale), { "data-action": "combine-undo" })}</p>` : "");
        const same = place ? renderMaybeSame(maybeSame(place, groupPlaces(state.notes, state.locale), state.dismissed), state.locale) : "";
        return renderPlaceDetail(place, state.locale, today, state.shortlist.includes(v.id), place ? undo + same + renderPlaceVisits(place, state.visits, state.locale) : "");
      }
      case "plan":
        return renderPlan(planContext(v.id));
      case "history":
        return renderHistory(findPlace(groupPlaces(state.notes, state.locale), v.id), state.locale, today);
      case "latest":
        return renderLatest({ places: groupPlaces(state.notes, state.locale), only: state.latestOnly, shown: state.latestShown, locale: state.locale, today });
      case "ages":
        return renderAges(groupPlaces(state.notes, state.locale), state.locale, today);
      case "repeats":
        return renderRepeats(groupPlaces(state.notes, state.locale), state.locale, today);
      case "survey":
        return renderSurvey(surveyContext());
      case "statement":
        // The page reader draws itself into this element after the page is drawn (see render).
        return (
          `<div id="statement-host"></div>` +
          `<p>${
            state.statementStart
              ? button(t(ASK_COPY.back, state.locale), { "data-action": "open-place", "data-value": state.statementStart.placeId, class: "secondary" })
              : button(t(SURVEY_COPY.toNotes, state.locale), { "data-action": "view", "data-value": "notes", class: "secondary" })
          }</p>`
        );
      case "ask":
        return renderAskPlace({
          place: findPlace(groupPlaces(state.notes, state.locale), v.id),
          keys: state.askKeys,
          letterLocale: state.askLang,
          locale: state.locale,
          statusMessage: state.status,
          today,
          way: state.askWay,
          wayError: state.askWayError,
          sent: findAsk(state.asked, v.id),
        });
      case "placecard":
      case "placecards": {
        const places = groupPlaces(state.notes, state.locale);
        const shown =
          v.kind === "placecard"
            ? places.filter((p) => p.id === v.id)
            : state.shortlist.map((id) => places.find((p) => p.id === id)).filter((p): p is (typeof places)[number] => p !== undefined);
        return renderCards({
          places: shown,
          needs: state.needs,
          locale: state.locale,
          today,
          large: state.cardLarge,
          passport: state.passport,
          withPassport: state.cardPassport,
          back: v.kind === "placecard" ? { action: "open-place", value: v.id } : { action: "view", value: "shortlistpage" },
        });
      }
      case "passport":
        return renderPassport({
          draft: state.passportDraft,
          saved: state.passport !== undefined,
          errors: state.passportErrors,
          locale: state.locale,
          hasMustHaves: needsFromRequirement(state.needs).length > 0,
          statusMessage: state.status,
        });
      case "csvimport":
        return renderCsvImport({
          text: state.csvText,
          preview: state.csvPreview,
          message: state.csvMessage,
          locale: state.locale,
          leftOut: state.csvLeftOut,
          places: groupPlaces(state.notes, state.locale),
        });
      case "visits":
        return renderVisits({
          visits: state.visits,
          places: groupPlaces(state.notes, state.locale),
          locale: state.locale,
          pendingRemove: state.visitPendingRemove,
          statusMessage: state.status,
          filter: state.visitFilter,
          today,
        });
      case "visit":
        return renderVisitForm({
          draft: state.visitDraft,
          errors: state.visitErrors,
          places: groupPlaces(state.notes, state.locale),
          editing: state.visits.find((x) => x.id === v.id),
          locale: state.locale,
        });
      case "showcard":
        return renderShowCard({ passport: state.passport, options: state.show, locale: state.locale });
      case "share":
        return renderShare({
          notes: state.notes,
          query: state.shareQuery,
          picked: state.sharePicked,
          withText: state.shareWithText,
          shortlist: state.shortlist,
          locale: state.locale,
          today,
          statusMessage: state.status,
        });
      case "move":
        return renderMove({
          current: currentDevice(),
          locale: state.locale,
          today,
          pasteText: state.movePaste,
          error: state.moveError,
          plans: state.movePlans,
          chosen: state.moveChosen,
          noneChosen: state.moveNoneChosen,
          madeOn: state.moveMadeOn,
          statusMessage: state.status,
        });
      case "removed":
        return renderBin({
          bin: state.bin,
          locale: state.locale,
          today,
          statusMessage: state.status,
          confirmDelete: state.binConfirmDelete,
          confirmEmpty: state.binConfirmEmpty,
        });
      case "asked":
        return renderAsked({
          list: state.asked,
          locale: state.locale,
          today,
          statusMessage: state.status,
          knownIds: new Set(groupPlaces(state.notes, state.locale).map((p) => p.id)),
        });
      case "notecheck":
        return renderNoteCheck({ notes: state.notes, pendingRemove: state.pendingRemove, locale: state.locale, today, statusMessage: state.status });
      case "shortlistpage":
        return renderShortlistPage({ places: groupPlaces(state.notes, state.locale), shortlist: state.shortlist, locale: state.locale, statusMessage: state.status, needs: state.needs, today });
      case "musthaves":
        return renderMustHaves({ places: groupPlaces(state.notes, state.locale), needs: state.needs, locale: state.locale, today, statusMessage: state.status });
      case "roundup":
        return renderRoundup({ places: groupPlaces(state.notes, state.locale), shortlist: state.shortlist, needs: state.needs, checklist: state.checklist, locale: state.locale, today, onlyLeft: state.roundupLeft });
      case "bydetail":
        return renderByDetail(groupPlaces(state.notes, state.locale), v.key, state.locale, today);
      case "gaps":
        return renderGaps(groupPlaces(state.notes, state.locale), state.locale, today, { needs: state.needs, onlyNeeds: state.gapsOnlyNeeds });
      case "review":
        return renderReview({ places: groupPlaces(state.notes, state.locale), only: state.reviewOnly, shown: state.reviewShown, locale: state.locale, today });
      case "sources":
        return renderSources(state.notes, state.locale, today);
      case "summary": {
        const names = sourceNames(collectSources(state.notes, today));
        const source = state.summarySource !== undefined && names.includes(state.summarySource) ? state.summarySource : undefined;
        const notes = source === undefined ? state.notes : onlySource(state.notes, source);
        return renderSummary({ places: groupPlaces(notes, state.locale), source, sourceNames: names, locale: state.locale, today });
      }
      case "similar": {
        const places = groupPlaces(state.notes, state.locale);
        const set = new Set(state.dismissed);
        return renderSimilar({ places, suggestions: findSimilar(places, set), hidden: hiddenCount(places, set), locale: state.locale, statusMessage: state.status });
      }
      case "placerename":
      case "placesplit": {
        const place = findPlace(groupPlaces(state.notes, state.locale), v.id);
        const ctx = { place, edit: state.placeEdit, locale: state.locale, statusMessage: state.status };
        return v.kind === "placerename" ? renderRename(ctx) : renderSplit(ctx);
      }
      case "combine": {
        const places = groupPlaces(state.notes, state.locale);
        const a = findPlace(places, v.a);
        const b = findPlace(places, v.b);
        const choice = a && b ? (state.combineChoice && isValidChoice(a, b, state.combineChoice) ? state.combineChoice : defaultChoice(a, b)) : undefined;
        return renderCombine({ a, b, choice, data: combineData(), locale: state.locale, today });
      }
      case "compare": {
        const places = groupPlaces(state.notes, state.locale);
        const chosen = v.ids.map((id) => findPlace(places, id));
        const found = chosen.filter((p): p is NonNullable<typeof p> => p !== undefined);
        return renderCompare(found, state.usingSaved ? state.needs : state.req, state.locale, today, found.length !== chosen.length);
      }
    }
  }

  function chrome(inner: string): string {
    const l = state.locale;
    const other = otherLocale(l);
    const current = navSection(state.view);
    const navButton = (section: typeof current, label: string): string =>
      button(label, {
        "data-action": "view",
        "data-value": section,
        ...(current === section ? { "aria-current": "page" } : {}),
      });
    return (
      `<div class="app" lang="${l}">` +
      `<a class="skip-link" href="#main">${esc(t(COPY.skipLink, l))}</a>` +
      `<header><h1>${esc(t(COPY.appName, l))}</h1>` +
      button(nativeName(other), { "data-action": "set-locale", "data-value": other, class: "secondary" }, other) +
      `</header>` +
      `<nav aria-label="${esc(t(COPY.nav.label, l))}">` +
      navButton("setup", t(COPY.nav.setup, l)) +
      navButton("notes", t(COPY.nav.notes, l)) +
      navButton("help", t(COPY.nav.help, l)) +
      navButton("display", t(COPY.nav.display, l)) +
      `</nav>` +
      `<main id="main" tabindex="-1">${inner}</main>` +
      `<footer><p class="muted">${esc(t(COPY.offline[state.offline], l))}</p></footer>` +
      `</div>`
    );
  }

  function render(focus: FocusMode, keep?: KeepTarget): void {
    for (const d of detachers) d();
    detachers = [];
    applyLocale(doc, state.locale);
    pruneSaved();
    reader?.destroy();
    reader = undefined;
    root.innerHTML = chrome(body());
    mountReader();
    const heading = root.querySelector("h2")?.textContent;
    doc.title = `${t(COPY.appName, state.locale)} – ${heading ?? ""}`.trim();

    for (const g of Array.from(root.querySelectorAll<HTMLElement>('[role="group"]'))) {
      detachers.push(attachRovingFocus(g));
    }

    if (focus === "summary") {
      const el = root.querySelector<HTMLElement>("#error-summary");
      if (el) el.focus();
      else focusHeading(root);
    } else if (focus === "keep" && keep) {
      let sel = `[data-action="${keep.action}"]`;
      // Values can be typed text (an id from a file, say): quotes and backslashes are escaped so the selector stays valid.
      const q = (s: string): string => s.replace(/["\\]/g, "\\$&");
      if (keep.key !== undefined) sel += `[data-key="${q(keep.key)}"]`;
      if (keep.value !== undefined) sel += `[data-value="${q(keep.value)}"]`;
      const el = root.querySelector<HTMLElement>(sel);
      if (el) el.focus();
      else focusHeading(root);
    } else if (focus === "heading" || focus === "keep") {
      focusHeading(root);
    }
    // A word asked for by address or search result gets focus, so the person lands on it.
    if (state.view.kind === "words" && state.view.term !== undefined && focus !== "keep") {
      root.querySelector<HTMLElement>(`#${wordAnchor(state.view.term)}`)?.focus();
    }
    opts.onAudit?.(auditDom(root, { locale: state.locale }));
  }

  const win = opts.win ?? doc.defaultView ?? undefined;
  let fromRoute = false;

  /** Puts the App's own copy of an item back to what it is when nothing is saved. */
  function resetInMemory(id: ItemId): void {
    switch (id) {
      case "notes":
        state.notes = [];
        state.droppedNotes = 0;
        state.pendingRemove = undefined;
        break;
      case "shortlist":
        state.shortlist = [];
        state.shortlistOnly = false;
        state.compareIds = [];
        break;
      case "needs":
        state.needs = {};
        state.usingSaved = false;
        break;
      case "checklist":
        state.checklist = {};
        break;
      case "display":
        state.display = DEFAULT_DISPLAY;
        applyDisplay(doc, state.display);
        break;
      case "survey":
        state.survey = emptySurvey(today);
        state.surveyConfirm = false;
        break;
      case "asked":
        state.asked = [];
        break;
      case "bin":
        state.bin = [];
        state.binConfirmDelete = undefined;
        state.binConfirmEmpty = false;
        break;
      case "corrections":
        state.corrections = [];
        break;
      case "passport":
        state.passport = undefined;
        state.passportDraft = emptyPassport(today);
        state.passportErrors = [];
        break;
      case "visits":
        state.visits = [];
        state.visitDraft = emptyVisitDraft(today);
        state.visitErrors = [];
        break;
      case "draft":
      case "prefs":
        break;
    }
  }

  function clearOne(value: string | undefined): string {
    const item = getItem(value);
    if (!item) return t(COPY.device.clearFailed, state.locale);
    if (clearItem(opts.store, item.id) !== "cleared") return t(COPY.device.clearFailed, state.locale);
    resetInMemory(item.id);
    return `${t(COPY.device.clearedOne, state.locale)} ${item.title[state.locale]}.`;
  }

  function clearEverything(): string {
    const { cleared, failed } = clearAll(opts.store);
    for (const id of cleared) resetInMemory(id);
    return failed.length > 0 ? t(COPY.device.clearFailed, state.locale) : t(COPY.device.clearedAll, state.locale);
  }

  function go(view: View, status?: string): void {
    const prevView = state.view;
    // A visit's address opens its form with that visit; an address for a visit that is not here shows the list.
    if (view.kind === "visit" && view.id !== "new") {
      const id = view.id;
      const visit = state.visits.find((x) => x.id === id);
      if (visit) {
        state.visitDraft = draftFromVisit(visit);
        state.visitErrors = [];
      } else view = { kind: "visits" };
    }
    state.view = view;
    state.visitPendingRemove = undefined;
    // "Take back" is offered only on the page shown right after adding.
    state.csvJustAdded = state.csvUndoNext;
    state.csvUndoNext = [];
    state.combineUndo = state.combineUndoNext;
    state.combineUndoNext = undefined;
    if (view.kind !== "combine") state.combineChoice = undefined;
    // The rename and split pages start from the place as it is.
    if ((view.kind === "placerename" || view.kind === "placesplit") && !(prevView.kind === view.kind && prevView.id === view.id)) {
      const place = findPlace(groupPlaces(state.notes, state.locale), view.id);
      state.placeEdit = { ...EMPTY_EDIT, name: place?.name ?? "", address: place?.address ?? "" };
    }
    state.answerError = undefined;
    state.confirmClear = false;
    if (view.kind !== "device") state.deviceConfirm = undefined;
    state.backupText = undefined;
    state.restoreMessage = undefined;
    if (view.kind !== "summary") state.summarySource = undefined;
    if (view.kind !== "review") {
      state.reviewOnly = undefined;
      state.reviewShown = REVIEW_PAGE;
    }
    if (view.kind !== "gaps") state.gapsOnlyNeeds = false;
    if (view.kind !== "pathsindex") state.pathsConfirm = false;
    if (view.kind !== "roundup") state.roundupLeft = false;
    if (view.kind !== "latest") {
      state.latestOnly = undefined;
      state.latestShown = LATEST_PAGE;
    }
    state.restorePreview = undefined;
    if (view.kind !== "form") {
      state.afterForm = undefined;
      state.editing = undefined;
    }
    if (view.kind !== "move") resetMove();
    if (view.kind !== "share") {
      state.shareQuery = "";
      state.sharePicked = [];
      state.shareWithText = false;
    }
    if (view.kind !== "removed") {
      state.binConfirmDelete = undefined;
      state.binConfirmEmpty = false;
    }
    if (view.kind !== "survey" || state.view.kind !== "survey") {
      state.surveyAddErrors = [];
      state.surveyStartErrors = [];
      state.surveyDraft = { name: "", address: "" };
      state.surveyConfirm = false;
    }
    // A walk saved part-way through but no longer valid (say, its licence was removed) goes back to planning.
    if (view.kind === "survey" && state.survey.phase !== "plan" && startErrors(state.survey, today).length > 0) state.survey = backToPlan(state.survey);
    if (opts.hashRouting && win && !fromRoute) {
      const h = viewToHash(view);
      if (win.location.hash !== h) win.history.pushState(null, "", h);
    }
    state.status = status;
    state.pendingRemove = undefined;
    state.exportText = undefined;
    state.importMessage = undefined;
    state.importPreview = undefined;
    if (view.kind === "form") {
      const draft = state.prefill ? undefined : loadDraft(opts.store, today);
      state.form = state.prefill ?? draft ?? emptyForm(today);
      state.restored = draft !== undefined;
      state.prefill = undefined;
      state.errors = [];
    }
    render("heading");
  }

  function dispatchSetup(action: FirstRunAction): void {
    state.setup = reduce(state.setup, action);
    persist();
  }

  /** Reads the form fields from the DOM. Unanswered details stay unknown. */
  function readForm(): FormValues {
    const form = root.querySelector<HTMLFormElement>("#note-form");
    if (!form) return state.form;
    const data = new FormData(form);
    const text = (k: string): string => {
      const v = data.get(k);
      return typeof v === "string" ? v : "";
    };
    const details = emptyUnknownDetails();
    for (const k of FACT_KEYS) {
      const v = text(`detail-${k}`);
      if (v === "yes" || v === "no") details[k as FactKey] = v as Tri;
    }
    return {
      placeName: text("placeName"),
      address: text("address"),
      details,
      observedOn: text("observedOn"),
      licence: text("licence"),
      note: text("note"),
    };
  }

  function refreshResults(): void {
    const el = root.querySelector("#results");
    if (el) el.innerHTML = state.view.kind === "places" ? renderPlaceResults(placesContext()) : renderResults(notesContext());
    opts.onAudit?.(auditDom(root, { locale: state.locale }));
  }

  /** Rewrites the text to copy after a tick or an answer, without redrawing the page. */
  function refreshPlanText(placeId: string): void {
    const ta = root.querySelector<HTMLTextAreaElement>("#plan-text");
    const ctx = planContext(placeId);
    if (!ta || !ctx.place) return;
    ta.value = planToText(ctx.place, buildPlan(ctx.place, ctx.req), state.locale, today, state.checklist);
    const area = root.querySelector("#clear-area");
    if (area) area.innerHTML = renderClearArea(state.checklist, placeId, state.confirmClear, state.locale);
  }

  function submitForm(): void {
    state.form = readForm();
    state.errors = validateForm(state.form, today);
    if (state.errors.length > 0) {
      state.restored = false;
      render("summary");
      return;
    }
    if (state.editing) {
      saveCorrection(state.editing);
      return;
    }
    const res = addNote(opts.store, toNote(state.form, today));
    const next: View = state.afterForm ?? { kind: "notes" };
    if (res.result === "full") {
      state.errors = [];
      go(next, t(COPY.notes.full, state.locale));
      return;
    }
    state.notes = res.notes;
    clearDraft(opts.store);
    state.form = emptyForm(today);
    const message = t(res.result === "saved" ? COPY.notes.added : COPY.save.unavailable, state.locale);
    go(next, message);
    announcer.say(message);
  }

  /** Saves a corrected note in place, logs what changed, and goes back. The unfinished new-note draft is left alone. */
  function saveCorrection(id: string): void {
    const before = state.notes.find((n) => n.id === id);
    const next: View = state.afterForm ?? { kind: "notes" };
    state.editing = undefined;
    if (!before) {
      go(next);
      return;
    }
    const after = correctNote(before, state.form, today);
    const changes = diffNotes(before, after);
    if (changes.length === 0) {
      const message = t(EDIT_COPY.unchanged, state.locale);
      go(next, message);
      announcer.say(message);
      return;
    }
    const notes = state.notes.map((n) => (n.id === id ? after : n));
    const res = saveNotes(opts.store, notes);
    if (res !== "saved") {
      const message = t(COPY.save.unavailable, state.locale);
      go(next, message);
      announcer.say(message);
      return;
    }
    state.notes = notes;
    keepCorrections(logCorrection(state.corrections, id, changes, today));
    state.form = emptyForm(today);
    const message = t(EDIT_COPY.corrected, state.locale);
    go(next, message);
    announcer.say(message);
  }

  /** Keeps the corrections log for notes that still exist, here or in Recently removed. */
  function keepCorrections(log: readonly Correction[]): void {
    const ids = new Set([...state.notes.map((n) => n.id), ...state.bin.map((e) => e.note.id)]);
    state.corrections = pruneCorrections(log, ids);
    saveCorrections(opts.store, state.corrections);
  }

  function keepBin(next: readonly BinEntry[]): void {
    state.bin = next;
    if (saveBin(opts.store, next) === "unavailable") announcer.say(t(COPY.save.unavailable, state.locale));
  }

  // ---- Survey walk ----

  const surveyContext = (): SurveyContext => ({
    survey: state.survey,
    locale: state.locale,
    today,
    places: groupPlaces(state.notes, state.locale),
    addErrors: state.surveyAddErrors,
    startErrors: state.surveyStartErrors,
    draftName: state.surveyDraft.name,
    draftAddress: state.surveyDraft.address,
    confirmDiscard: state.surveyConfirm,
    statusMessage: state.status,
    notesRoom: Math.max(0, LIMITS.notes - state.notes.length),
  });

  /** The access card's form, read from the page. Anything missing keeps its current value. */
  function readPassportForm(): Passport {
    const form = root.querySelector<HTMLFormElement>("#passport-form");
    if (!form) return state.passportDraft;
    const data = new FormData(form);
    const device = data.get("device");
    const sizes = Object.fromEntries(SIZE_KEYS.map((k) => [k, String(data.get(k) ?? "")])) as Record<(typeof SIZE_KEYS)[number], string>;
    return {
      device: isDeviceKind(device) ? device : "",
      sizes,
      needs: data.getAll("need").map(String).filter(isFactKey),
      helps: String(data.get("helps") ?? ""),
      updatedOn: state.passportDraft.updatedOn,
    };
  }

  function savePassportForm(): void {
    const draft = { ...readPassportForm(), updatedOn: today.toISOString().slice(0, 10) };
    state.passportDraft = draft;
    state.passportErrors = validatePassport(draft);
    state.status = undefined;
    if (state.passportErrors.length > 0) {
      render("summary");
      return;
    }
    if (savePassport(opts.store, draft) !== "saved") {
      state.status = t(COPY.save.unavailable, state.locale);
      render("none");
      announcer.say(state.status);
      return;
    }
    state.passport = draft;
    state.status = t(PASSPORT_COPY.saved, state.locale);
    render("none");
    const preview = root.querySelector<HTMLElement>("#pp-preview");
    preview?.setAttribute("tabindex", "-1");
    preview?.focus();
    announcer.say(state.status);
  }

  /** Reads the rows in the box and shows what they would add; `changed` says the rows changed since the last look. */
  function previewCsv(changed: boolean): void {
    const typed = root.querySelector<HTMLTextAreaElement>("#csv-text")?.value ?? state.csvText;
    state.csvText = typed;
    const r = previewCsvImport(state.notes, typed, today);
    if (r.error) {
      state.csvPreview = undefined;
      state.csvMessage = t(CSV_FILE_ERRORS[r.error], state.locale);
      render("none");
      root.querySelector<HTMLElement>("#csv-message")?.focus();
      announcer.say(state.csvMessage);
      return;
    }
    state.csvPreview = r;
    state.csvPreviewText = typed;
    state.csvLeftOut = new Set();
    state.csvMessage = changed ? t(CSV_IMPORT_COPY.changed, state.locale) : undefined;
    render("none");
    root.querySelector<HTMLElement>("#csv-preview")?.focus();
    announcer.say(`${changed ? `${state.csvMessage} ` : ""}${t(CSV_IMPORT_COPY.previewTitle, state.locale)}. ${r.notes.length}`);
  }

  /** Adds the previewed notes, if the rows are still the ones previewed; otherwise shows the new preview. */
  function addFromCsv(): void {
    const typed = root.querySelector<HTMLTextAreaElement>("#csv-text")?.value ?? state.csvText;
    if (!state.csvPreview || typed !== state.csvPreviewText) {
      previewCsv(true);
      return;
    }
    // Worked out again against the notes as they are now, so nothing is added twice.
    const r = previewCsvImport(state.notes, typed, today);
    const chosen = r.error ? [] : chosenNotes(r, state.csvLeftOut);
    if (r.error || chosen.length === 0) {
      previewCsv(true);
      return;
    }
    const notes = [...state.notes, ...chosen];
    if (saveNotes(opts.store, notes) !== "saved") {
      state.csvMessage = t(COPY.save.unavailable, state.locale);
      render("none");
      root.querySelector<HTMLElement>("#csv-message")?.focus();
      announcer.say(state.csvMessage);
      return;
    }
    state.notes = notes;
    state.csvText = "";
    state.csvPreview = undefined;
    state.csvPreviewText = "";
    state.csvMessage = undefined;
    state.csvLeftOut = new Set();
    state.csvUndoNext = chosen.map((n) => n.id);
    const message = csvAddedText(chosen.length, state.locale);
    go({ kind: "notes" }, message);
    announcer.say(message);
  }

  /** Reads a chosen CSV file into the box. */
  async function readCsvFile(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    if (!file) return;
    // A file far larger than the App reads is not opened at all.
    const tooLarge = file.size > LIMITS.importChars * 4;
    let text: string | undefined;
    try {
      text = tooLarge ? undefined : await readFileText(file);
    } catch {
      text = undefined;
    }
    if (state.view.kind !== "csvimport") return;
    if (text === undefined) {
      state.csvMessage = t(tooLarge ? CSV_FILE_ERRORS["too-large"] : CSV_IMPORT_COPY.fileFailed, state.locale);
    } else {
      state.csvText = text;
      state.csvPreview = undefined;
      state.csvMessage = t(CSV_IMPORT_COPY.fileRead, state.locale);
    }
    render("none");
    root.querySelector<HTMLElement>("#csv-file")?.focus();
    announcer.say(state.csvMessage);
  }

  /** Everything the App keeps by place, as it is now. */
  function combineData(): CombineData {
    return { notes: state.notes, shortlist: state.shortlist, checklist: state.checklist, asked: state.asked, visits: state.visits, dismissed: state.dismissed, bin: state.bin };
  }

  /** Puts combined (or restored) data in place and keeps it on this device; notes first, so nothing else changes if they cannot be kept. */
  function keepCombineData(d: CombineData): boolean {
    if (saveNotes(opts.store, d.notes) !== "saved") return false;
    state.notes = [...d.notes];
    state.shortlist = [...d.shortlist];
    state.checklist = d.checklist;
    state.visits = [...d.visits];
    state.dismissed = [...d.dismissed];
    const others = [saveShortlist(opts.store, d.shortlist), saveChecklist(opts.store, d.checklist), saveVisits(opts.store, d.visits), saveDismissed(opts.store, d.dismissed)];
    keepAsked(d.asked);
    if (d.bin) keepBin(d.bin);
    if (others.some((r) => r !== "saved")) announcer.say(t(COPY.save.unavailable, state.locale));
    return true;
  }

  function runCombine(): void {
    if (state.view.kind !== "combine") return;
    const places = groupPlaces(state.notes, state.locale);
    const a = findPlace(places, state.view.a);
    const b = findPlace(places, state.view.b);
    if (!a || !b || a.id === b.id) return;
    const choice = state.combineChoice && isValidChoice(a, b, state.combineChoice) ? state.combineChoice : defaultChoice(a, b);
    const before = { data: combineData(), corrections: state.corrections };
    const r = combinePlaces(a, b, choice, before.data);
    if (!keepCombineData(r.data)) {
      state.status = t(COMBINE_COPY.unavailable, state.locale);
      render("heading");
      announcer.say(state.status);
      return;
    }
    let log = state.corrections;
    for (const x of r.summary.renamed) log = logCorrection(log, x.noteId, x.changes, today);
    keepCorrections(log);
    state.combineUndoNext = { ...before, kind: "combine", back: { kind: "similar" } };
    const message = t(COMBINE_COPY.done, state.locale);
    go({ kind: "place", id: r.summary.targetId }, message);
    announcer.say(message);
  }

  /** Reads the rename or split page and works out what it would do; errors instead when something is off. */
  function readPlaceEdit(): { place: NonNullable<ReturnType<typeof findPlace>>; edit: PlaceEditState } | undefined {
    const v = state.view;
    if (v.kind !== "placerename" && v.kind !== "placesplit") return undefined;
    const places = groupPlaces(state.notes, state.locale);
    const place = findPlace(places, v.id);
    if (!place) return undefined;
    const name = root.querySelector<HTMLInputElement>("#pe-name")?.value ?? state.placeEdit.name;
    const address = root.querySelector<HTMLInputElement>("#pe-address")?.value ?? state.placeEdit.address;
    const chosen = v.kind === "placesplit" ? Array.from(root.querySelectorAll<HTMLInputElement>('input[name="split-note"]:checked')).map((x) => x.value) : [];
    // Splitting may keep the place's own name for the moved notes only with another address, so "unchanged" applies to both.
    const textErrors = checkTarget(name, address, { placeName: place.name, address: place.address });
    const splitError = v.kind === "placesplit" ? checkSplit(chosen.length, place.notes.length) : undefined;
    const errors = [...(splitError ? [splitError] : []), ...textErrors];
    const target = targetOf(name, address);
    const data = combineData();
    const preview = errors.length > 0 ? undefined : v.kind === "placerename" ? renamePlace(place, target, data, places) : splitPlace(place, new Set(chosen), target, data, places);
    return { place, edit: { name, address, chosen, errors, preview } };
  }

  function previewPlaceEdit(changed: boolean): void {
    const r = readPlaceEdit();
    if (!r) return;
    state.placeEdit = r.edit;
    state.status = changed && r.edit.errors.length === 0 ? t(RENAME_COPY.changed, state.locale) : undefined;
    if (r.edit.errors.length > 0) {
      render("summary");
      return;
    }
    render("none");
    root.querySelector<HTMLElement>("#pe-preview")?.focus();
    announcer.say(`${state.status ? `${state.status} ` : ""}${t(COMBINE_COPY.previewTitle, state.locale)}`);
  }

  function runPlaceEdit(): void {
    const kind = state.view.kind === "placerename" ? "rename" : "split";
    const r = readPlaceEdit();
    if (!r) return;
    const prev = state.placeEdit;
    const same = prev.preview !== undefined && prev.name === r.edit.name && prev.address === r.edit.address && prev.chosen.join(",") === r.edit.chosen.join(",");
    if (!same || !r.edit.preview) {
      previewPlaceEdit(true);
      return;
    }
    const before = { data: combineData(), corrections: state.corrections };
    if (!keepCombineData(r.edit.preview.data)) {
      state.status = t(COMBINE_COPY.unavailable, state.locale);
      render("heading");
      announcer.say(state.status);
      return;
    }
    let log = state.corrections;
    for (const x of r.edit.preview.summary.renamed) log = logCorrection(log, x.noteId, x.changes, today);
    keepCorrections(log);
    state.combineUndoNext = { ...before, kind, back: { kind: "place", id: r.place.id } };
    state.placeEdit = EMPTY_EDIT;
    const message = t(kind === "rename" ? RENAME_COPY.done : SPLIT_COPY.done, state.locale);
    go({ kind: "place", id: kind === "rename" ? r.edit.preview.summary.targetId : r.place.id }, message);
    announcer.say(message);
  }

  function undoCombine(): void {
    const before = state.combineUndo;
    if (!before) return;
    state.combineUndo = undefined;
    if (!keepCombineData(before.data)) {
      state.status = t(COPY.save.unavailable, state.locale);
      render("heading");
      announcer.say(state.status);
      return;
    }
    keepCorrections(before.corrections);
    const message = t(UNDO_COPY[before.kind].undone, state.locale);
    go(before.back, message);
    announcer.say(message);
  }

  /** Says how many visits the filter shows, after it changes. */
  function announceVisitsShown(): void {
    const shown = filterVisits(state.visits, groupPlaces(state.notes, state.locale), state.visitFilter).length;
    announcer.say(visitsShownText(shown, state.visits.length, state.locale));
  }

  function readVisitForm(): VisitDraft {
    const form = root.querySelector<HTMLFormElement>("#visit-form");
    if (!form) return state.visitDraft;
    const data = new FormData(form);
    const found = { ...state.visitDraft.found };
    for (const k of FACT_KEYS) {
      const c = data.get(`found-${k}`) ?? "";
      found[k] = isFoundChoice(c) ? (c as FoundChoice) : "";
    }
    return { placeId: String(data.get("place") ?? ""), visitedOn: String(data.get("visitedOn") ?? ""), found, words: String(data.get("words") ?? "") };
  }

  /** Checks the visit form; saves it as a new visit or over the one being changed. */
  function saveVisitForm(): void {
    if (state.view.kind !== "visit") return;
    const editing = state.visits.find((x) => x.id === (state.view.kind === "visit" ? state.view.id : ""));
    const draft = readVisitForm();
    const places = groupPlaces(state.notes, state.locale);
    state.visitDraft = draft;
    state.visitErrors = validateVisit(draft, places, today, editing?.placeId);
    state.status = undefined;
    if (state.visitErrors.length > 0) {
      render("summary");
      return;
    }
    const place = places.find((p) => p.id === draft.placeId) ?? (editing ? { id: editing.placeId, name: editing.placeName, address: editing.address } : undefined);
    if (!place) return;
    const r = upsertVisit(state.visits, makeVisit(draft, place, today, editing?.id ?? defaultVisitId()));
    if (!r.ok || saveVisits(opts.store, r.visits) !== "saved") {
      state.status = t(r.ok ? VISIT_COPY.unavailable : VISIT_COPY.full, state.locale);
      render("none");
      announcer.say(state.status);
      return;
    }
    state.visits = r.visits;
    state.visitDraft = emptyVisitDraft(today);
    const message = t(editing ? VISIT_COPY.changed : VISIT_COPY.saved, state.locale);
    go({ kind: "visits" }, message);
    announcer.say(message);
  }

  /** Keeps "Questions you sent" in memory and on this device. */
  function keepAsked(next: readonly AskRecord[]): void {
    state.asked = next;
    if (saveAsked(opts.store, next) === "unavailable") announcer.say(t(COPY.save.unavailable, state.locale));
  }

  /** Keeps the walk in memory and on this device. Says so if the device would not keep it. */
  function keepSurvey(next: Survey): void {
    state.survey = next;
    if (saveSurvey(opts.store, next) === "unavailable") announcer.say(t(COPY.save.unavailable, state.locale));
  }

  function surveyAdded(name: string): string {
    return `${t(SURVEY_COPY.added, state.locale)}${state.locale === "fr" ? "\u00A0:" : ":"} ${name}`;
  }

  function surveyAddTyped(): void {
    const name = root.querySelector<HTMLInputElement>("#s-name")?.value ?? "";
    const address = root.querySelector<HTMLInputElement>("#s-address")?.value ?? "";
    const r = addStop(state.survey, name, address, today);
    state.surveyStartErrors = [];
    if (!r.ok) {
      state.surveyAddErrors = r.errors;
      state.surveyDraft = { name, address };
      state.status = undefined;
      render("none");
      root.querySelector<HTMLElement>(r.errors.some((x) => x.field === "address") && !r.errors.some((x) => x.field !== "address") ? "#s-address" : "#s-name")?.focus();
      announcer.say(r.errors.map((x) => stopError(x.code, state.locale)).join(" "));
      return;
    }
    keepSurvey(r.survey);
    state.surveyAddErrors = [];
    state.surveyDraft = { name: "", address: "" };
    state.status = surveyAdded(placeLabel(name.trim(), address.trim()));
    render("none");
    // Focus goes back to the name field, ready for the next place.
    (root.querySelector<HTMLElement>("#s-name") ?? root.querySelector<HTMLElement>("#survey-stops"))?.focus();
    announcer.say(state.status);
  }

  /** After an answer or a move: a new place gets the heading, the same place keeps focus on the answers. */
  function surveyShow(prevStop: number | undefined): void {
    const c = surveyCurrent(state.survey);
    if (c && prevStop === c.stopIndex) {
      render("none");
      root.querySelector<HTMLElement>('[data-action="survey-answer"][data-value="yes"]')?.focus();
      announcer.say(`${nextAnnouncement(t(COPY.facts[c.key], state.locale), state.locale)}. ${t(QUESTIONS[c.key], state.locale)}`);
      return;
    }
    render("heading");
  }

  /** A contents link inside an article: move focus to the section heading, not only the scroll position. */
  function onJump(e: Event): boolean {
    const link = (e.target as HTMLElement | null)?.closest<HTMLElement>("a[data-jump]");
    if (!link || !root.contains(link)) return false;
    e.preventDefault();
    const heading = doc.getElementById(link.dataset["jump"] ?? "");
    if (heading) {
      heading.focus();
      heading.scrollIntoView?.({ block: "start" });
    }
    return true;
  }

  /** Updates the practice log in place, so focus stays on the button that was pressed. */
  function refreshPractice(): void {
    const log = root.querySelector("#practice-log");
    if (log) log.innerHTML = renderPracticeLog(state.practice.log, state.locale);
    const total = root.querySelector("#practice-total");
    if (total) total.textContent = `${t(COPY.practice.total, state.locale)}${state.locale === "fr" ? "\u00A0: " : ": "}${totalPresses(state.practice)}`;
  }

  function onKey(e: Event): void {
    if (state.view.kind !== "practice") return;
    const ev = e as KeyboardEvent;
    const target = ev.target as HTMLElement | null;
    if (!target || !target.closest("[data-practice]")) return;
    // The roving-focus handler on the button group has already moved focus when this runs.
    const focused = doc.activeElement as HTMLElement | null;
    const n = parseButton(focused?.dataset["value"]);
    const line = describeKey(ev.key, ev.shiftKey, n === undefined ? undefined : buttonName(n, state.locale), state.locale);
    if (line === undefined) return;
    state.practice = pushLog(state.practice, line);
    refreshPractice();
  }

  function onClick(e: Event): void {
    if (onJump(e)) return;
    const target = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-action]");
    if (!target || !root.contains(target)) return;
    const action = target.dataset["action"] ?? "";
    const value = target.dataset["value"];
    const key = target.dataset["key"];
    // "Undo" is offered only right after a removal: anything else puts it away.
    if (action !== "confirm-remove") state.undoId = undefined;
    if (action !== "csv-undo") state.csvJustAdded = [];
    if (action !== "combine-undo") state.combineUndo = undefined;

    if (SWITCH_ACTIONS.has(action)) {
      if (action === "choose-mode" && isMode(value)) dispatchSetup({ type: "choose-mode", mode: value });
      else if (action === "set-scan") {
        const ms = toScan(value);
        if (ms) dispatchSetup({ type: "set-scan", ms });
      } else if (action === "next" || action === "back" || action === "skip") {
        dispatchSetup({ type: action });
      }
      if (action === "choose-mode" || action === "set-scan") render("keep", { action, value });
      else render("heading");
      return;
    }

    switch (action) {
      case "done": {
        const result = persist();
        go({ kind: "help" });
        announcer.say(t(result === "saved" ? COPY.save.saved : COPY.save.unavailable, state.locale));
        opts.onDone?.(currentPrefs());
        return;
      }
      case "set-locale":
        if (value === "en" || value === "fr") {
          state.locale = value;
          persist();
          // The toggle now offers the other language, so keep focus by action only.
          render("keep", { action });
          announcer.say(t(COPY.language.changed, state.locale));
        }
        return;
      case "view":
        if (value === "setup") go({ kind: "setup" });
        else if (value === "help") {
          const from = state.view.kind;
          go({ kind: "help" });
          // Back from a guide: put focus on the guide that was opened, not at the top.
          if (from === "find") root.querySelector<HTMLElement>('[data-action="find-open"]')?.focus();
          else if (from === "words") root.querySelector<HTMLElement>('[data-action="open-words"]')?.focus();
          else if (from === "names") root.querySelector<HTMLElement>('[data-action="open-names"]')?.focus();
          else if (from === "practice") root.querySelector<HTMLElement>('[data-action="open-practice"]')?.focus();
          else if (state.helpReturn && (from === "article" || from === "path" || from === "card" || from === "device" || from === "steps")) {
            const { action: a, value: v } = state.helpReturn;
            const el = root.querySelector<HTMLElement>(`[data-action="${a}"]${v === undefined ? "" : `[data-value="${v}"]`}`);
            el?.focus();
          }
        }
        else if (value === "notes") go({ kind: "notes" });
        else if (value === "display") go({ kind: "display" });
        else if (value === "places") go({ kind: "places" });
        else if (value === "sources") go({ kind: "sources" });
        else if (value === "summary") go({ kind: "summary" });
        else if (value === "similar") go({ kind: "similar" });
        else if (value === "review") go({ kind: "review" });
        else if (value === "latest") go({ kind: "latest" });
        else if (value === "ages") go({ kind: "ages" });
        else if (value === "repeats") go({ kind: "repeats" });
        else if (value === "gaps") go({ kind: "gaps" });
        else if (value === "bydetail") go({ kind: "bydetail", key: undefined });
        else if (value === "roundup") go({ kind: "roundup" });
        else if (value === "musthaves") go({ kind: "musthaves" });
        else if (value === "shortlistpage") go({ kind: "shortlistpage" });
        else if (value === "notecheck") go({ kind: "notecheck" });
        else if (value === "pathsindex") go({ kind: "pathsindex" });
        else if (value === "survey") go({ kind: "survey" });
        else if (value === "asked") go({ kind: "asked" });
        else if (value === "removed") go({ kind: "removed" });
        else if (value === "share") go({ kind: "share" });
        else if (value === "cards") go({ kind: "placecards" });
        else if (value === "passport") go({ kind: "passport" });
        else if (value === "showcard") go({ kind: "showcard" });
        else if (value === "visits") go({ kind: "visits" });
        else if (value === "csvimport") go({ kind: "csvimport" });
        else if (value === "statement") {
          state.statementStart = undefined;
          go({ kind: "statement" });
        }
        return;
      case "summary-source":
        state.summarySource = value ? value : undefined;
        render("keep", { action, value: value ?? "" });
        announcer.say(state.summarySource === undefined ? t(COPY.summary.all, state.locale) : state.summarySource);
        return;
      case "similar-combine": {
        const [a, b] = (value ?? "").split("|");
        if (!a || !b || pairKey(a, b) !== value) return;
        state.combineChoice = undefined;
        go({ kind: "combine", a, b });
        return;
      }
      case "combine-name":
      case "combine-address": {
        if (!state.view || state.view.kind !== "combine" || value === undefined) return;
        const places = groupPlaces(state.notes, state.locale);
        const a = findPlace(places, state.view.a);
        const b = findPlace(places, state.view.b);
        if (!a || !b) return;
        // The radios carry the place of their value in the list, so typed names never go into a selector.
        const base = state.combineChoice ?? defaultChoice(a, b);
        const picked = (action === "combine-name" ? nameOptions(a, b) : addressOptions(a, b))[Number(value)];
        if (picked === undefined) return;
        const next = action === "combine-name" ? { ...base, name: picked } : { ...base, address: picked };
        if (!isValidChoice(a, b, next)) return;
        state.combineChoice = next;
        render("keep", { action, value });
        return;
      }
      case "combine-run":
        runCombine();
        return;
      case "open-rename":
        if (value) go({ kind: "placerename", id: value });
        return;
      case "open-split":
        if (value) go({ kind: "placesplit", id: value });
        return;
      case "rename-run":
      case "split-run":
        runPlaceEdit();
        return;
      case "combine-undo":
        undoCombine();
        return;
      case "similar-dismiss":
      case "similar-compare": {
        const [a, b] = (value ?? "").split("|");
        const places = groupPlaces(state.notes, state.locale);
        if (!a || !b || pairKey(a, b) !== value || !findPlace(places, a) || !findPlace(places, b)) return;
        if (action === "similar-compare") {
          state.compareIds = [a, b];
          go({ kind: "compare", ids: [a, b] });
          return;
        }
        const d = dismissPair(state.dismissed, a, b);
        if (d.result === "full") state.status = t(COPY.similar.full, state.locale);
        else {
          state.dismissed = d.list;
          state.status = saveDismissed(opts.store, state.dismissed) === "saved" ? t(COPY.similar.marked, state.locale) : t(COPY.similar.saveFailed, state.locale);
        }
        render("heading");
        announcer.say(state.status);
        return;
      }
      case "similar-reset":
        state.dismissed = [];
        saveDismissed(opts.store, []);
        state.status = t(COPY.similar.shownAgain, state.locale);
        render("heading");
        announcer.say(state.status);
        return;
      case "open-place":
        if (value) go({ kind: "place", id: value });
        return;
      case "open-history":
        if (value) go({ kind: "history", id: value });
        return;
      case "view-detail":
        if (isFactKey(value)) go({ kind: "bydetail", key: value });
        return;
      case "shortlist-up":
      case "shortlist-down": {
        if (!value) return;
        const r = moveInShortlist(state.shortlist, value, action === "shortlist-up" ? "up" : "down");
        if (r.result !== "moved") return;
        state.status = undefined;
        state.shortlist = r.list;
        saveShortlist(opts.store, r.list);
        render("none");
        // Stay on the same button; at the top or bottom that button is gone, so use the other one.
        const other = action === "shortlist-up" ? "shortlist-down" : "shortlist-up";
        (root.querySelector<HTMLElement>(`[data-action="${action}"][data-value="${value}"]`) ?? root.querySelector<HTMLElement>(`[data-action="${other}"][data-value="${value}"]`))?.focus();
        announcer.say(`${t(COPY.shortlistPage.moved, state.locale)} ${positionText(r.list.indexOf(value) + 1, r.list.length, state.locale)}`);
        return;
      }
      case "shortlist-remove": {
        if (!value) return;
        const before = state.shortlist;
        const r = removeFromShortlist(before, value);
        if (!r.removed) return;
        state.shortlist = r.list;
        saveShortlist(opts.store, r.list);
        state.status = t(COPY.shortlistPage.removed, state.locale);
        render("none");
        const next = focusAfter(before, r.list, value);
        const el = next ? root.querySelector<HTMLElement>(`[data-action="shortlist-remove"][data-value="${next}"]`) : null;
        if (el) el.focus();
        else focusHeading(root);
        announcer.say(state.status);
        return;
      }
      case "roundup-left": {
        state.roundupLeft = value === "left";
        render("keep", { action, value: value ?? "" });
        const full = buildRoundup(groupPlaces(state.notes, state.locale), state.shortlist, state.needs, state.checklist, state.locale, today);
        const shown = state.roundupLeft ? onlyQuestionsLeft(full) : full;
        announcer.say(`${t(state.roundupLeft ? COPY.roundup.onlyLeft : COPY.roundup.allPlaces, state.locale)}. ${t(COPY.roundup.placesLabel, state.locale)}${state.locale === "fr" ? "\u00A0:" : ":"} ${shown.totals.places}`);
        return;
      }
      case "gaps-only": {
        state.gapsOnlyNeeds = value === "needs" && hasNeeds(state.needs);
        render("keep", { action, value: value ?? "" });
        const shown = state.gapsOnlyNeeds ? detailGaps(groupPlaces(state.notes, state.locale), needKeys(state.needs)) : detailGaps(groupPlaces(state.notes, state.locale));
        announcer.say(`${t(state.gapsOnlyNeeds ? COPY.gaps.onlyNeeds : COPY.gaps.all, state.locale)}. ${t(COPY.gaps.placesMissing, state.locale)}${state.locale === "fr" ? "\u00A0:" : ":"} ${placesWithGaps(shown)}`);
        return;
      }
      case "latest-filter": {
        state.latestOnly = isRecordKind(value) ? value : undefined;
        state.latestShown = LATEST_PAGE;
        render("keep", { action, value: value ?? "" });
        const n = latestRecords(groupPlaces(state.notes, state.locale), state.latestOnly).length;
        const label = state.latestOnly === undefined ? t(COPY.latest.all, state.locale) : kindLabel(state.latestOnly, state.locale);
        announcer.say(`${label}. ${latestShownText(clampLatest(state.latestShown, n), n, state.locale)}`);
        return;
      }
      case "latest-more": {
        const n = latestRecords(groupPlaces(state.notes, state.locale), state.latestOnly).length;
        const before = clampLatest(state.latestShown, n);
        state.latestShown = clampLatest(before + LATEST_PAGE, n);
        render("none");
        // Focus goes to the first record that was just added, so reading carries on from there.
        const first = root.querySelector<HTMLElement>(`#latest-record-${before}`);
        if (first) {
          first.setAttribute("tabindex", "-1");
          first.focus();
        }
        announcer.say(latestShownText(state.latestShown, n, state.locale));
        return;
      }
      case "review-filter": {
        state.reviewOnly = isReviewReason(value) ? value : undefined;
        state.reviewShown = REVIEW_PAGE;
        render("keep", { action, value: value ?? "" });
        const n = buildReview(groupPlaces(state.notes, state.locale), today, state.reviewOnly).length;
        const label = state.reviewOnly === undefined ? t(COPY.review.all, state.locale) : reasonLabel(state.reviewOnly, state.locale);
        announcer.say(`${label}. ${shownText(clampShown(state.reviewShown, n), n, state.locale)}`);
        return;
      }
      case "review-more": {
        const n = buildReview(groupPlaces(state.notes, state.locale), today, state.reviewOnly).length;
        const before = clampShown(state.reviewShown, n);
        state.reviewShown = clampShown(before + REVIEW_PAGE, n);
        render("none");
        // Focus goes to the first place that was just added, so reading carries on from there.
        const first = root.querySelector<HTMLElement>(`#review-place-${before}`);
        if (first) {
          first.setAttribute("tabindex", "-1");
          first.focus();
        }
        announcer.say(shownText(state.reviewShown, n, state.locale));
        return;
      }
      case "open-plan":
        if (value) {
          // Plan from the saved must-haves only when the filter is empty and some are saved.
          state.usingSaved = !hasRequirement(state.req) && hasNeeds(state.needs);
          go({ kind: "plan", id: value });
        }
        return;
      case "save-needs": {
        const r = saveNeeds(opts.store, state.req);
        if (r === "saved") state.needs = { ...state.req };
        state.status = t(r === "saved" ? COPY.needs.saved : COPY.save.unavailable, state.locale);
        render("keep", { action });
        announcer.say(state.status);
        return;
      }
      case "use-needs":
        state.req = { ...state.needs };
        state.status = t(COPY.needs.applied, state.locale);
        render("keep", { action });
        announcer.say(state.status);
        return;
      case "clear-needs":
        saveNeeds(opts.store, {});
        state.needs = {};
        state.status = t(COPY.needs.cleared, state.locale);
        render("heading");
        announcer.say(state.status);
        return;
      case "backup-open":
        state.backupText = exportLists({ needs: state.needs, shortlist: state.shortlist, checklist: state.checklist }, today.toISOString().slice(0, 10));
        render("keep", { action: "backup-hide" });
        return;
      case "backup-hide":
        state.backupText = undefined;
        render("keep", { action: "backup-open" });
        return;
      case "backup-restore": {
        const ta = root.querySelector<HTMLTextAreaElement>("#restore-text");
        state.restoreText = ta?.value ?? "";
        state.restorePreview = undefined;
        runRestore();
        render("none");
        announcer.say(state.restoreMessage ?? "");
        return;
      }
      case "restore-preview":
      case "restore-confirm": {
        const ta = root.querySelector<HTMLTextAreaElement>("#restore-text");
        const typed = ta?.value ?? "";
        if (action === "restore-confirm" && state.restorePreview && typed === state.restorePreviewText) {
          state.restoreText = typed;
          state.restorePreview = undefined;
          runRestore();
          render("none");
          announcer.say(state.restoreMessage ?? "");
          return;
        }
        state.restoreText = typed;
        const p = prepareRestore(currentLists(), state.notes, typed, state.locale);
        if (p.error) {
          state.restorePreview = undefined;
          state.restoreMessage = p.error === "wrong-format" && isDeviceFile(typed) ? t(MOVE_COPY.isDeviceFile, state.locale) : t(RESTORE_ERRORS[p.error], state.locale);
        } else {
          state.restorePreview = p.preview;
          state.restorePreviewText = typed;
          state.restoreMessage = action === "restore-confirm" ? t(COPY.restorePreview.changed, state.locale) : undefined;
        }
        render("none");
        const target = root.querySelector<HTMLElement>(p.error ? "#restore-message" : "#restore-preview");
        target?.setAttribute("tabindex", "-1");
        target?.focus();
        announcer.say(p.error ? (state.restoreMessage ?? "") : t(COPY.restorePreview.title, state.locale));
        return;
      }
      case "restore-cancel":
        state.restorePreview = undefined;
        state.restoreMessage = t(COPY.restorePreview.closed, state.locale);
        render("none");
        root.querySelector<HTMLElement>("#restore-text")?.focus();
        announcer.say(state.restoreMessage);
        return;
      case "toggle-shortlist": {
        if (!value) return;
        const r = toggleShortlist(state.shortlist, value);
        if (r.result === "invalid") return;
        state.shortlist = r.list;
        const saved = r.result === "full" ? "saved" : saveShortlist(opts.store, r.list);
        const msg = r.result === "full" ? COPY.shortlist.full : saved === "unavailable" ? COPY.save.unavailable : r.result === "added" ? COPY.shortlist.added : COPY.shortlist.removed;
        state.status = t(msg, state.locale);
        render("keep", { action, value });
        announcer.say(state.status);
        return;
      }
      case "shortlist-only":
        state.shortlistOnly = !state.shortlistOnly;
        render("keep", { action });
        return;
      case "toggle-compare": {
        if (!value) return;
        const r = toggleCompare(state.compareIds, value);
        state.compareIds = r.ids;
        state.status = r.result === "full" ? t(COPY.compare.full, state.locale) : undefined;
        render("keep", { action, value });
        if (state.status) announcer.say(state.status);
        return;
      }
      case "open-compare":
        if (canCompare(state.compareIds)) {
          state.usingSaved = !hasRequirement(state.req) && hasNeeds(state.needs);
          go({ kind: "compare", ids: [...state.compareIds] });
        }
        return;
      case "compare-clear":
        state.compareIds = [];
        render("heading");
        return;
      case "report-place": {
        const place = findPlace(groupPlaces(state.notes, state.locale), value ?? "");
        if (!place) return;
        if (state.notes.length >= LIMITS.notes) {
          state.status = t(COPY.notes.full, state.locale);
          render("heading");
          return;
        }
        state.prefill = formForPlace(place, today);
        state.editing = undefined;
        const back = state.view;
        go({ kind: "form" });
        state.afterForm = back.kind === "form" ? undefined : back;
        return;
      }
      case "path-done": {
        if (!key || !value) return;
        const path = ONBOARDING_PATHS.find((p) => p.id === key);
        if (!path) return;
        state.pathProgress = setDone(state.pathProgress, key, value, (target as HTMLInputElement).checked);
        const saved = saveProgress(opts.store, state.pathProgress);
        render("keep", { action: "path-done", key, value });
        announcer.say(saved === "saved" ? progressText(doneCount(state.pathProgress, key), path.steps.length, state.locale) : t(COPY.save.unavailable, state.locale));
        return;
      }
      case "path-reset": {
        if (!value) return;
        state.pathProgress = resetPath(state.pathProgress, value);
        saveProgress(opts.store, state.pathProgress);
        render("none");
        root.querySelector<HTMLElement>('[data-action="path-done"]')?.focus();
        announcer.say(t(COPY.pathProgress.resetDone, state.locale));
        return;
      }
      case "survey-open":
        go({ kind: "survey" });
        return;
      case "open-statement":
        state.statementStart = undefined;
        go({ kind: "statement" });
        return;
      case "read-page":
      case "read-reply": {
        const place = findPlace(groupPlaces(state.notes, state.locale), value ?? "");
        if (!place) return;
        state.statementStart = { placeId: place.id, placeName: place.name, address: place.address ?? "", from: action === "read-reply" ? "reply" : "page" };
        go({ kind: "statement" });
        return;
      }
      case "open-ask": {
        const place = findPlace(groupPlaces(state.notes, state.locale), value ?? "");
        if (!place) return;
        state.askKeys = defaultAskKeys(place);
        state.askLang = state.locale;
        state.askWay = findAsk(state.asked, place.id)?.way;
        state.askWayError = false;
        go({ kind: "ask", id: place.id });
        return;
      }
      case "ask-key": {
        if (!key || !isFactKey(key)) return;
        state.askKeys = toggleAskKey(state.askKeys, key, (target as HTMLInputElement).checked);
        state.status = undefined;
        render("keep", { action, key });
        return;
      }
      case "edit-note": {
        const note = state.notes.find((n) => n.id === value);
        const values = note ? formFromNote(note) : undefined;
        if (!note || !values) {
          state.status = t(note && editable(note) === "mixed" ? EDIT_COPY.mixed : EDIT_COPY.notOwn, state.locale);
          render("none");
          announcer.say(state.status);
          return;
        }
        const back = state.view;
        state.prefill = values;
        state.editing = note.id;
        go({ kind: "form" });
        state.afterForm = back.kind === "form" ? undefined : back;
        return;
      }
      case "share-pick": {
        if (!value) return;
        state.sharePicked = pickShared(state.sharePicked, [value], (target as HTMLInputElement).checked, state.notes);
        state.status = undefined;
        render("keep", { action, value });
        return;
      }
      case "share-all":
      case "share-none":
        state.sharePicked = pickShared(state.sharePicked, filterNotes(state.notes, state.shareQuery).map((n) => n.id), action === "share-all", state.notes);
        state.status = undefined;
        render("keep", { action });
        return;
      case "open-place-card":
        if (!value) return;
        go({ kind: "placecard", id: value });
        return;
      case "show-size": {
        if (!isShowSize(value)) return;
        state.show = { ...state.show, size: value };
        render("keep", { action, value });
        return;
      }
      case "visit-new":
        state.visitDraft = emptyVisitDraft(today, value ?? "");
        state.visitErrors = [];
        go({ kind: "visit", id: "new" });
        return;
      case "visit-edit":
        if (!value || !state.visits.some((x) => x.id === value)) return;
        go({ kind: "visit", id: value });
        return;
      case "visit-note": {
        const visit = state.visits.find((x) => x.id === value);
        if (!visit) return;
        state.prefill = formFromVisit(visit, today);
        go({ kind: "form" });
        return;
      }
      case "csv-preview":
        previewCsv(false);
        return;
      case "csv-add":
        addFromCsv();
        return;
      case "csv-undo": {
        const ids = new Set(state.csvJustAdded);
        const notes = state.notes.filter((n) => !ids.has(n.id));
        const taken = state.notes.length - notes.length;
        if (taken === 0) return;
        if (saveNotes(opts.store, notes) !== "saved") {
          state.status = t(COPY.save.unavailable, state.locale);
        } else {
          state.notes = notes;
          state.csvJustAdded = [];
          state.status = csvTakenBackText(taken, state.locale);
        }
        render("heading");
        announcer.say(state.status);
        return;
      }
      case "csv-choose":
        if (!value) return;
        if ((target as HTMLInputElement).checked) state.csvLeftOut.delete(value);
        else state.csvLeftOut.add(value);
        render("keep", { action, value });
        return;
      case "csv-cancel":
        state.csvPreview = undefined;
        state.csvMessage = t(CSV_IMPORT_COPY.closed, state.locale);
        render("none");
        root.querySelector<HTMLElement>("#csv-text")?.focus();
        announcer.say(state.csvMessage);
        return;
      case "visit-only-follow":
        state.visitFilter = { ...state.visitFilter, onlyFollow: (target as HTMLInputElement).checked };
        render("keep", { action });
        announceVisitsShown();
        return;
      case "visit-ask": {
        // Asking a place opens with the details this visit found that the notes do not show.
        const visit = state.visits.find((x) => x.id === value);
        const places = groupPlaces(state.notes, state.locale);
        const follow = visit ? followUps([visit], places)[0] : undefined;
        const place = visit ? findPlace(places, visit.placeId) : undefined;
        if (!visit || !place || !follow) return;
        state.askKeys = follow.items.map((c) => c.key);
        state.askLang = state.locale;
        state.askWay = findAsk(state.asked, place.id)?.way;
        state.askWayError = false;
        go({ kind: "ask", id: place.id });
        return;
      }
      case "visit-remove":
        state.visitPendingRemove = value;
        render("keep", { action: "visit-remove-confirm", value });
        return;
      case "visit-remove-cancel":
        state.visitPendingRemove = undefined;
        render("keep", { action: "visit-remove", value });
        return;
      case "visit-remove-confirm": {
        if (!value) return;
        const next = removeVisit(state.visits, value);
        const saved = saveVisits(opts.store, next);
        state.visits = next;
        state.visitPendingRemove = undefined;
        if (!next.some((x) => x.placeId === state.visitFilter.placeId)) state.visitFilter = { ...state.visitFilter, placeId: "" };
        state.status = t(saved === "saved" ? VISIT_COPY.removed : VISIT_COPY.unavailable, state.locale);
        render("heading");
        announcer.say(state.status);
        return;
      }
      case "show-both":
        state.show = { ...state.show, both: (target as HTMLInputElement).checked };
        render("keep", { action });
        return;
      case "show-questions":
        state.show = { ...state.show, questions: (target as HTMLInputElement).checked };
        render("keep", { action });
        return;
      case "card-passport":
        state.cardPassport = (target as HTMLInputElement).checked;
        render("keep", { action });
        return;
      case "passport-musthaves":
        state.passportDraft = { ...readPassportForm(), needs: needsFromRequirement(state.needs) };
        state.passportErrors = [];
        render("keep", { action });
        return;
      case "card-large":
        state.cardLarge = (target as HTMLInputElement).checked;
        render("keep", { action });
        return;
      case "card-print":
        // The browser's own print dialog; the print styles hide the App's menus and buttons.
        try {
          win?.print();
        } catch {
          /* printing is not available here */
        }
        return;
      case "share-shortlist":
        state.sharePicked = pickShared(state.sharePicked, shortlistNoteIds(state.notes, state.shortlist), true, state.notes);
        state.status = undefined;
        render("keep", { action });
        return;
      case "share-text":
        state.shareWithText = (target as HTMLInputElement).checked;
        render("keep", { action });
        return;
      case "open-move":
        go({ kind: "move" });
        return;
      case "move-look":
        lookAtMove();
        return;
      case "move-part": {
        if (!key || !(PARTS as readonly string[]).includes(key)) return;
        const next = new Set(state.moveChosen);
        if ((target as HTMLInputElement).checked) next.add(key as Part);
        else next.delete(key as Part);
        state.moveChosen = next;
        state.moveNoneChosen = false;
        render("keep", { action, key });
        return;
      }
      case "move-apply":
        applyMove();
        return;
      case "move-cancel":
        resetMove();
        state.status = t(MOVE_COPY.cancelled, state.locale);
        render("none");
        root.querySelector<HTMLElement>("#move-text")?.focus();
        announcer.say(state.status);
        return;
      case "bin-restore": {
        const r = restoreFromBin(state.bin, state.notes, value ?? "");
        if (!r.ok) {
          if (r.reason === "missing") return;
          state.status = t(r.reason === "full" ? BIN_COPY.full : BIN_COPY.exists, state.locale);
          render("none");
          announcer.say(state.status);
          return;
        }
        const saved = saveNotes(opts.store, r.notes);
        if (saved !== "saved") {
          state.status = t(COPY.save.unavailable, state.locale);
        } else {
          const place = r.notes[0]?.placeName ?? "";
          state.notes = r.notes;
          keepBin(r.bin);
          state.status = `${t(BIN_COPY.restored, state.locale)}${state.locale === "fr" ? "\u00A0:" : ":"} ${place}`;
        }
        render("none");
        (root.querySelector<HTMLElement>("#bin-list") ?? root.querySelector<HTMLElement>("h2"))?.focus();
        announcer.say(state.status);
        return;
      }
      case "bin-delete":
        state.binConfirmDelete = value;
        state.binConfirmEmpty = false;
        state.status = undefined;
        render("keep", { action: "bin-delete-confirm", ...(value !== undefined ? { value } : {}) });
        return;
      case "bin-delete-cancel":
        state.binConfirmDelete = undefined;
        state.status = t(BIN_COPY.kept, state.locale);
        render("keep", { action: "bin-delete", ...(value !== undefined ? { value } : {}) });
        announcer.say(state.status);
        return;
      case "bin-delete-confirm": {
        const e = state.bin.find((x) => x.note.id === value);
        if (!e) return;
        keepBin(deleteFromBin(state.bin, e.note.id));
        keepCorrections(state.corrections);
        state.binConfirmDelete = undefined;
        state.status = `${t(BIN_COPY.deleted, state.locale)}${state.locale === "fr" ? "\u00A0:" : ":"} ${e.note.placeName}`;
        render("none");
        (root.querySelector<HTMLElement>("#bin-list") ?? root.querySelector<HTMLElement>("h2"))?.focus();
        announcer.say(state.status);
        return;
      }
      case "bin-empty":
        state.binConfirmEmpty = true;
        state.binConfirmDelete = undefined;
        state.status = undefined;
        render("keep", { action: "bin-empty-confirm" });
        return;
      case "bin-empty-cancel":
        state.binConfirmEmpty = false;
        state.status = t(BIN_COPY.kept, state.locale);
        render("keep", { action: "bin-empty" });
        announcer.say(state.status);
        return;
      case "bin-empty-confirm":
        keepBin([]);
        keepCorrections(state.corrections);
        state.binConfirmEmpty = false;
        state.status = t(BIN_COPY.emptied, state.locale);
        render("heading");
        announcer.say(state.status);
        return;
      case "asked-way":
        if (!isAskWay(value)) return;
        state.askWay = value;
        state.askWayError = false;
        state.status = undefined;
        render("keep", { action, value });
        return;
      case "asked-add": {
        const place = findPlace(groupPlaces(state.notes, state.locale), value ?? "");
        if (!place) return;
        if (!state.askWay) {
          state.askWayError = true;
          state.status = undefined;
          render("none");
          root.querySelector<HTMLElement>('[data-action="asked-way"]')?.focus();
          announcer.say(t(ASKED_COPY.chooseWay, state.locale));
          return;
        }
        const next = recordAsk(state.asked, place, state.askKeys.length > 0 ? state.askKeys : defaultAskKeys(place), state.askWay, today);
        const message = next === "full" ? t(ASKED_COPY.full, state.locale) : `${t(ASKED_COPY.added, state.locale)}${state.locale === "fr" ? "\u00A0:" : ":"} ${place.name}`;
        if (next !== "full") keepAsked(next);
        state.status = message;
        render("keep", { action, value: place.id });
        announcer.say(message);
        return;
      }
      case "asked-replied":
      case "asked-noreply":
      case "asked-waiting":
      case "asked-remove": {
        const r = findAsk(state.asked, value ?? "");
        if (!r) return;
        const next =
          action === "asked-replied"
            ? markReplied(state.asked, r.id, today)
            : action === "asked-noreply"
              ? markNoReply(state.asked, r.id, today)
              : action === "asked-waiting"
                ? markWaiting(state.asked, r.id, today)
                : removeAsk(state.asked, r.id);
        keepAsked(next);
        const said =
          action === "asked-remove"
            ? t(ASKED_COPY.removed, state.locale)
            : t(action === "asked-replied" ? ASKED_COPY.markedReplied : action === "asked-noreply" ? ASKED_COPY.markedNoReply : ASKED_COPY.markedWaiting, state.locale);
        state.status = `${said}${state.locale === "fr" ? "\u00A0:" : ":"} ${r.placeName}`;
        render("none");
        // The place moved to the other list or left it: focus goes to the top of the waiting list.
        root.querySelector<HTMLElement>("#asked-waiting")?.focus();
        announcer.say(state.status);
        return;
      }
      case "ask-lang":
        if (value !== "en" && value !== "fr") return;
        state.askLang = value;
        state.status = undefined;
        render("keep", { action, value });
        return;
      case "survey-add-place": {
        const place = findPlace(groupPlaces(state.notes, state.locale), value ?? "");
        const r = place ? addPlaceStop(state.survey, place, today) : undefined;
        state.surveyStartErrors = [];
        if (!place || !r) return;
        if (!r.ok) {
          state.status = r.errors.map((x) => stopError(x.code, state.locale)).join(" ");
        } else {
          keepSurvey(r.survey);
          state.status = surveyAdded(placeLabel(place.name, place.address ?? ""));
        }
        render("none");
        root.querySelector<HTMLElement>("#survey-stops")?.focus();
        announcer.say(state.status);
        return;
      }
      case "survey-remove": {
        const i = Number(value);
        const gone = state.survey.stops[i];
        if (!gone) return;
        keepSurvey(removeStop(state.survey, i));
        state.status = `${t(SURVEY_COPY.removed, state.locale)}${state.locale === "fr" ? "\u00A0:" : ":"} ${placeLabel(gone.placeName, gone.address)}`;
        render("none");
        root.querySelector<HTMLElement>("#survey-stops")?.focus();
        announcer.say(state.status);
        return;
      }
      case "survey-up":
      case "survey-down": {
        const i = Number(value);
        const by = action === "survey-up" ? -1 : 1;
        const before = state.survey;
        keepSurvey(moveStop(state.survey, i, by));
        if (state.survey === before) return;
        const to = String(i + by);
        state.status = undefined;
        render("none");
        // Focus follows the place that moved; at either end its move button is gone, so use the other one.
        const other = action === "survey-up" ? "survey-down" : "survey-up";
        (root.querySelector<HTMLElement>(`[data-action="${action}"][data-value="${to}"]`) ??
          root.querySelector<HTMLElement>(`[data-action="${other}"][data-value="${to}"]`))?.focus();
        const moved = state.survey.stops[i + by];
        if (moved) announcer.say(`${placeLabel(moved.placeName, moved.address)}${state.locale === "fr" ? "\u00A0:" : ":"} ${i + by + 1}/${state.survey.stops.length}`);
        return;
      }
      case "survey-start": {
        const r = surveyStart(state.survey, today);
        state.surveyAddErrors = [];
        if (!r.ok) {
          state.surveyStartErrors = r.errors;
          state.status = undefined;
          render("summary");
          return;
        }
        state.surveyStartErrors = [];
        keepSurvey(r.survey);
        state.status = undefined;
        render("heading");
        return;
      }
      case "survey-answer": {
        if (value !== "yes" && value !== "no" && value !== "unknown") return;
        const prev = surveyCurrent(state.survey)?.stopIndex;
        keepSurvey(surveyAnswer(state.survey, value));
        state.status = undefined;
        surveyShow(prev);
        return;
      }
      case "survey-back": {
        const prev = surveyCurrent(state.survey)?.stopIndex;
        keepSurvey(surveyBack(state.survey));
        state.status = undefined;
        surveyShow(prev);
        return;
      }
      case "survey-leave":
        keepSurvey(leaveStop(state.survey));
        state.status = undefined;
        render("heading");
        return;
      case "survey-plan":
        keepSurvey(backToPlan(state.survey));
        state.status = undefined;
        render("heading");
        return;
      case "survey-edit": {
        const k = key;
        if (!k || !isFactKey(k)) return;
        keepSurvey(surveyEdit(state.survey, Number(value), k));
        state.status = undefined;
        render("heading");
        return;
      }
      case "survey-save": {
        const errors = startErrors(state.survey, today);
        if (errors.length > 0) {
          state.surveyStartErrors = errors;
          keepSurvey(backToPlan(state.survey));
          render("summary");
          return;
        }
        const savable = state.survey.stops.filter(hasAnswer).length;
        if (savable === 0 || state.notes.length + savable > LIMITS.notes) {
          state.status = t(savable === 0 ? SURVEY_COPY.nothingToSave : SURVEY_COPY.notesFull, state.locale);
          render("none");
          announcer.say(state.status);
          return;
        }
        const out = surveyNotes(state.survey, today);
        let notes = state.notes;
        let device = true;
        for (const n of out.notes) {
          const res = addNote(opts.store, n);
          if (res.result !== "saved") device = false;
          notes = res.notes;
        }
        state.notes = notes;
        clearSurvey(opts.store);
        state.survey = emptySurvey(today);
        const message = device
          ? savedMessage(out.notes.length, out.skipped.length, state.locale)
          : t(COPY.save.unavailable, state.locale);
        go({ kind: "notes" }, message);
        announcer.say(message);
        return;
      }
      case "survey-discard":
        state.surveyConfirm = true;
        state.status = undefined;
        render("keep", { action: "survey-discard-confirm" });
        return;
      case "survey-discard-cancel":
        state.surveyConfirm = false;
        state.status = t(SURVEY_COPY.kept, state.locale);
        render("keep", { action: "survey-discard" });
        announcer.say(state.status);
        return;
      case "survey-discard-confirm":
        clearSurvey(opts.store);
        state.survey = emptySurvey(today);
        state.surveyConfirm = false;
        state.surveyAddErrors = [];
        state.surveyStartErrors = [];
        state.status = t(SURVEY_COPY.discarded, state.locale);
        render("heading");
        announcer.say(state.status);
        return;
      case "paths-clear":
        state.pathsConfirm = true;
        render("none");
        root.querySelector<HTMLElement>('[data-action="paths-clear-confirm"]')?.focus();
        return;
      case "paths-clear-cancel":
        state.pathsConfirm = false;
        render("none");
        root.querySelector<HTMLElement>('[data-action="paths-clear"]')?.focus();
        return;
      case "paths-clear-confirm":
        state.pathsConfirm = false;
        state.pathProgress = {};
        saveProgress(opts.store, state.pathProgress);
        state.status = t(COPY.pathsIndex.cleared, state.locale);
        render("heading");
        announcer.say(state.status);
        return;
      case "path-continue": {
        const path = ONBOARDING_PATHS.find((p) => p.id === value);
        if (!path) return;
        go({ kind: "path", id: path.id, step: nextStepIndex(state.pathProgress, path) ?? 0 });
        return;
      }
      case "path-open": {
        const v = value ? hashToView(value) : undefined;
        if (v) go(v);
        return;
      }
      case "asked": {
        if (!value || !key || !(FACT_KEYS as readonly string[]).includes(key)) return;
        state.checklist = setAsked(state.checklist, value, key as FactKey, (target as HTMLInputElement).checked);
        saveChecklist(opts.store, state.checklist);
        if (state.view.kind === "roundup") {
          // The round-up counts ticks, so it is drawn again and focus stays on the same checkbox.
          render("keep", { action: "asked", key, value });
          const r = buildRoundup(groupPlaces(state.notes, state.locale), [value], state.needs, state.checklist, state.locale, today);
          const p = r.places[0];
          if (p) announcer.say(`${t(COPY.roundup.progressFor, state.locale)}${state.locale === "fr" ? "\u00A0:" : ":"} ${askedText(p.asked, p.questions.length, state.locale)}`);
          return;
        }
        refreshPlanText(value);
        return;
      }
      case "clear-checklist":
        state.confirmClear = true;
        render("keep", { action: "confirm-clear-checklist", value });
        return;
      case "cancel-clear-checklist":
        state.confirmClear = false;
        render("keep", { action: "clear-checklist", value });
        return;
      case "confirm-clear-checklist":
        if (!value) return;
        state.checklist = clearPlaceChecklist(state.checklist, value);
        saveChecklist(opts.store, state.checklist);
        state.confirmClear = false;
        state.status = t(COPY.checklist.cleared, state.locale);
        render("heading");
        announcer.say(state.status);
        return;
      case "copy-plan": {
        const ta = root.querySelector<HTMLTextAreaElement>("#plan-text");
        if (!ta) return;
        const clip = win?.navigator?.clipboard;
        const fail = (): void => {
          ta.focus();
          ta.select();
          state.status = t(COPY.copy.failed, state.locale);
          announcer.say(state.status);
        };
        if (!clip) return fail();
        clip.writeText(ta.value).then(
          () => announcer.say(t(COPY.copy.done, state.locale)),
          fail,
        );
        return;
      }
      case "select-text": {
        const ta = root.querySelector<HTMLTextAreaElement>(value === "ask-text" ? "#ask-text" : "#plan-text");
        if (ta) { ta.focus(); ta.select(); }
        return;
      }
      case "open-path":
        if (value) {
          state.helpReturn = { action, value };
          // A search result can name the step that matched best; anything else opens step 1.
          const n = Number(key);
          const path = ONBOARDING_PATHS.find((p) => p.id === value);
          const step = key !== undefined && Number.isInteger(n) && path && n >= 0 && n < path.steps.length ? n : 0;
          go({ kind: "path", id: value, step });
        }
        return;
      case "open-article":
        if (value) {
          state.helpReturn = { action, value };
          state.articleStep = 0;
          // Only real articles are remembered; the list stays on this device.
          const next = recordRecent(state.help, value);
          if (next !== state.help) {
            state.help = next;
            saveHelpState(opts.store, state.help);
          }
          go({ kind: "article", id: value });
        }
        return;
      case "open-words":
        state.helpReturn = { action };
        go({ kind: "words", term: value !== undefined && getWord(value) ? value : undefined });
        return;
      case "open-names":
        state.helpReturn = { action };
        go({ kind: "names", section: DEFAULT_NAME_SECTION });
        return;
      case "names-open": {
        if (!isNameSection(value)) return;
        go({ kind: "names", section: value });
        return;
      }
      case "open-practice":
        state.helpReturn = { action };
        go({ kind: "practice" });
        return;
      case "practice-press": {
        const n = parseButton(value);
        if (n !== undefined) {
          state.practice = recordPress(state.practice, n, state.locale);
          refreshPractice();
        }
        return;
      }
      case "practice-clear":
        state.practice = clearLog(state.practice);
        refreshPractice();
        announcer.say(t(COPY.practice.cleared, state.locale));
        return;
      case "find-open":
        go({ kind: "find", node: value !== undefined && getQuestion(value) ? value : START_NODE });
        return;
      case "recent-clear":
        state.help = clearRecent(state.help);
        saveHelpState(opts.store, state.help);
        render("none");
        root.querySelector<HTMLElement>("#help-q")?.focus();
        announcer.say(t(COPY.helpHome.recentCleared, state.locale));
        return;
      case "read-mode":
        if (isReadingMode(value)) {
          state.help = setReading(state.help, value);
          state.articleStep = 0;
          saveHelpState(opts.store, state.help);
          render("keep", { action });
          announcer.say(t(value === "steps" ? COPY.helpHome.readStepsOn : COPY.helpHome.readWholeOn, state.locale));
        }
        return;
      case "read-step":
        if (state.view.kind === "article") {
          const article = getArticle(state.view.id);
          const n = Number(value);
          if (article && Number.isInteger(n)) {
            state.articleStep = clampStep(n, article.sections.length);
            render("none");
            const section = article.sections[state.articleStep];
            if (section) doc.getElementById(sectionAnchor(article.id, section.id))?.focus();
            announcer.say(sectionOf(state.articleStep + 1, article.sections.length, state.locale));
          }
        }
        return;
      case "help-clear":
        state.helpQuery = "";
        render("none");
        root.querySelector<HTMLElement>("#help-q")?.focus();
        return;
      case "path-step":
        if (state.view.kind === "path") {
          const n = Number(value);
          if (Number.isInteger(n) && n >= 0) state.view = { ...state.view, step: n };
        }
        render("heading");
        return;
      case "open-steps":
        state.helpReturn = { action };
        go({ kind: "steps" });
        return;
      case "step-go": {
        const step = getStep(value);
        if (step) go(step.goes);
        return;
      }
      case "open-device":
        state.helpReturn = { action };
        state.deviceConfirm = undefined;
        go({ kind: "device" });
        return;
      case "device-clear":
        state.deviceConfirm = value === "all" ? "all" : getItem(value) ? (value as ItemId) : undefined;
        render("keep", { action: "device-confirm", ...(value !== undefined ? { value } : {}) });
        return;
      case "device-cancel": {
        const was = value;
        state.deviceConfirm = undefined;
        state.status = t(COPY.device.kept, state.locale);
        render("keep", { action: "device-clear", ...(was !== undefined ? { value: was } : {}) });
        announcer.say(state.status);
        return;
      }
      case "device-confirm": {
        const message = value === "all" ? clearEverything() : clearOne(value);
        state.deviceConfirm = undefined;
        state.status = message;
        render("heading");
        announcer.say(message);
        return;
      }
      case "open-card":
        state.helpReturn = { action };
        go({ kind: "card" });
        return;
      case "display":
        if (key === "scale" || key === "spacing" || key === "contrast" || key === "motion") {
          state.display = updateDisplay(state.display, key, value ?? "");
          applyDisplay(doc, state.display);
          saveDisplay(opts.store, state.display);
          render("keep", { action, key, value });
          announcer.say(t(COPY.display.changed, state.locale));
        }
        return;
      case "add-note":
      case "open-form":
        state.editing = undefined;
        if (state.notes.length >= LIMITS.notes) {
          state.status = t(COPY.notes.full, state.locale);
          render("heading");
        } else go({ kind: "form" });
        return;
      case "cancel-form":
        go(state.afterForm ?? { kind: "notes" });
        return;
      case "filter":
        if (key && (FACT_KEYS as readonly string[]).includes(key) && (value === "any" || value === "yes" || value === "no")) {
          state.req = withRequirement(state.req, key as FactKey, value);
          render("keep", { action, key, value });
        }
        return;
      case "remove-note":
        state.pendingRemove = value;
        render("keep", { action: "confirm-remove", value });
        return;
      case "cancel-remove":
        state.pendingRemove = undefined;
        render("keep", { action: "remove-note", value });
        return;
      case "confirm-remove": {
        if (!value) return;
        const gone = state.notes.find((n) => n.id === value);
        const res = removeNote(opts.store, value);
        state.notes = res.notes;
        state.pendingRemove = undefined;
        // The removed note waits in Recently removed for 30 days, so a slip can be undone.
        if (gone && res.result === "saved") {
          keepBin(addToBin(state.bin, gone, today));
          state.undoId = gone.id;
        }
        state.status = t(res.result === "saved" ? (gone ? BIN_COPY.moved : COPY.notes.removed) : COPY.save.unavailable, state.locale);
        // Focus goes to "Undo" when it is there, so a slip can be undone at once.
        if (state.undoId) render("keep", { action: "bin-restore", value: state.undoId });
        else render("heading");
        announcer.say(state.status);
        return;
      }
      case "export-open":
        state.exportText = exportNotes(state.notes, today.toISOString().slice(0, 10));
        render("none");
        root.querySelector<HTMLElement>("#export-text")?.focus();
        return;
      case "import-run": {
        const ta = root.querySelector<HTMLTextAreaElement>("#import-text");
        state.importText = ta?.value ?? "";
        state.importPreview = undefined;
        runImport();
        render("none");
        root.querySelector<HTMLElement>("#import-message")?.setAttribute("tabindex", "-1");
        announcer.say(state.importMessage ?? "");
        return;
      }
      case "import-preview":
      case "import-confirm": {
        const ta = root.querySelector<HTMLTextAreaElement>("#import-text");
        const typed = ta?.value ?? "";
        const same = typed === state.importPreviewText;
        if (action === "import-confirm" && state.importPreview && same) {
          state.importText = typed;
          state.importPreview = undefined;
          runImport();
          render("none");
          root.querySelector<HTMLElement>("#import-message")?.setAttribute("tabindex", "-1");
          announcer.say(state.importMessage ?? "");
          return;
        }
        state.importText = typed;
        const p = previewNotesImport(state.notes, typed, state.locale);
        if (p.error) {
          state.importPreview = undefined;
          state.importMessage = p.error === "wrong-format" && isDeviceFile(typed) ? t(MOVE_COPY.isDeviceFile, state.locale) : t(IMPORT_ERRORS[p.error], state.locale);
        } else {
          state.importPreview = p;
          state.importPreviewText = typed;
          state.importMessage = action === "import-confirm" ? t(COPY.preview.changed, state.locale) : undefined;
        }
        render("none");
        const target = p.error ? root.querySelector<HTMLElement>("#import-message") : root.querySelector<HTMLElement>("#import-preview");
        target?.setAttribute("tabindex", "-1");
        target?.focus();
        announcer.say(p.error ? (state.importMessage ?? "") : `${t(COPY.preview.title, state.locale)}: ${p.added} ${t(COPY.preview.added, state.locale)}`);
        return;
      }
      case "import-cancel":
        state.importPreview = undefined;
        state.importMessage = t(COPY.preview.closed, state.locale);
        render("none");
        root.querySelector<HTMLElement>("#import-text")?.focus();
        announcer.say(state.importMessage);
        return;
    }
  }

  const IMPORT_ERRORS = {
    empty: COPY.notes.importErrors.empty,
    "too-large": COPY.notes.importErrors.tooLarge,
    "not-json": COPY.notes.importErrors.notJson,
    "wrong-format": COPY.notes.importErrors.wrongFormat,
    "wrong-version": COPY.notes.importErrors.wrongVersion,
  } as const;

  /** Reads state.importText and adds what is new. Sets the message; the caller redraws. */
  function runImport(): void {
    const r = importNotes(state.importText);
    const l = state.locale;
    if (r.error) {
      state.importMessage = r.error === "wrong-format" && isDeviceFile(state.importText) ? t(MOVE_COPY.isDeviceFile, l) : t(IMPORT_ERRORS[r.error], l);
      return;
    }
    const m = mergeNotes(state.notes, r.notes);
    if (saveNotes(opts.store, m.notes) === "saved") {
      state.notes = m.notes;
      state.importText = "";
      state.importMessage = importDone(m.added, m.skipped, r.rejected, l);
    } else {
      state.importMessage = t(COPY.notes.importFailedSave, l);
    }
  }

  const RESTORE_ERRORS = {
    empty: COPY.lists.errors.empty,
    "too-large": COPY.lists.errors.tooLarge,
    "not-json": COPY.lists.errors.notJson,
    "wrong-format": COPY.lists.errors.wrongFormat,
    "wrong-version": COPY.lists.errors.wrongVersion,
  } as const;

  const currentLists = (): Lists => ({ needs: state.needs, shortlist: state.shortlist, checklist: state.checklist });

  /** Everything the App keeps on this device, as one "move" file holds it. */
  function currentDevice(): DeviceData {
    return { notes: state.notes, lists: currentLists(), asked: state.asked, corrections: state.corrections, bin: state.bin, survey: isEmptySurvey(state.survey) ? undefined : state.survey, visits: state.visits, passport: state.passport };
  }

  function resetMove(): void {
    state.movePaste = "";
    state.moveError = undefined;
    state.moveIncoming = undefined;
    state.movePlans = undefined;
    state.moveChosen = new Set();
    state.moveNoneChosen = false;
    state.moveMadeOn = undefined;
  }

  /** Reads the pasted file and works out what each part would add, without changing anything. */
  function lookAtMove(): void {
    state.movePaste = root.querySelector<HTMLTextAreaElement>("#move-text")?.value ?? state.movePaste;
    const r = importDevice(state.movePaste, today);
    state.moveNoneChosen = false;
    state.status = undefined;
    if (r.error) {
      state.moveError = r.error;
      state.moveIncoming = undefined;
      state.movePlans = undefined;
      render("none");
      root.querySelector<HTMLElement>("#move-text")?.focus();
      announcer.say(t(MOVE_ERRORS[r.error], state.locale));
      return;
    }
    state.moveError = undefined;
    state.moveIncoming = r.data;
    state.moveMadeOn = r.exportedOn;
    state.movePlans = mergeDevice(currentDevice(), r.data, new Set(PARTS)).plans;
    state.moveChosen = new Set(usefulParts(state.movePlans));
    render("none");
    root.querySelector<HTMLElement>("#move-preview")?.focus();
  }

  /** Brings in the chosen parts and saves each one. Parts not chosen are left as they are. */
  function applyMove(): void {
    const incoming = state.moveIncoming;
    if (!incoming) return;
    if (state.moveChosen.size === 0) {
      state.moveNoneChosen = true;
      render("none");
      root.querySelector<HTMLElement>('[data-action="move-part"]')?.focus();
      announcer.say(t(MOVE_COPY.noneChosen, state.locale));
      return;
    }
    const chosen = state.moveChosen;
    const { data, plans } = mergeDevice(currentDevice(), incoming, chosen);
    const results: string[] = [];
    if (chosen.has("notes")) results.push(saveNotes(opts.store, data.notes));
    if (chosen.has("lists")) results.push(saveNeeds(opts.store, data.lists.needs), saveShortlist(opts.store, data.lists.shortlist), saveChecklist(opts.store, data.lists.checklist));
    if (chosen.has("asked")) results.push(saveAsked(opts.store, data.asked));
    if (chosen.has("bin")) results.push(saveBin(opts.store, data.bin));
    if (chosen.has("corrections")) results.push(saveCorrections(opts.store, data.corrections));
    if (chosen.has("survey") && data.survey) results.push(saveSurvey(opts.store, data.survey));
    if (chosen.has("visits")) results.push(saveVisits(opts.store, data.visits));
    if (chosen.has("passport") && data.passport) results.push(savePassport(opts.store, data.passport));
    state.notes = [...data.notes];
    state.needs = data.lists.needs;
    state.shortlist = [...data.lists.shortlist];
    state.checklist = data.lists.checklist;
    state.asked = data.asked;
    state.bin = data.bin;
    state.corrections = data.corrections;
    if (data.survey) state.survey = data.survey;
    state.visits = [...data.visits];
    if (data.passport) {
      state.passport = data.passport;
      state.passportDraft = data.passport;
    }
    const message = results.every((x) => x === "saved" || x === "cleared") ? broughtText(plans, chosen, state.locale) : t(MOVE_COPY.unavailable, state.locale);
    resetMove();
    state.status = message;
    render("heading");
    announcer.say(message);
  }

  /** Reads state.restoreText and adds what is missing. Sets the message; the caller redraws. */
  function runRestore(): void {
    const l = state.locale;
    const p = prepareRestore(currentLists(), state.notes, state.restoreText, l);
    if (p.error) {
      state.restoreMessage = p.error === "wrong-format" && isDeviceFile(state.restoreText) ? t(MOVE_COPY.isDeviceFile, l) : t(RESTORE_ERRORS[p.error], l);
      return;
    }
    const m = p.merged;
    const results = [saveNeeds(opts.store, m.lists.needs), saveShortlist(opts.store, m.lists.shortlist), saveChecklist(opts.store, m.lists.checklist)];
    if (results.every((x) => x === "saved")) {
      state.needs = m.lists.needs;
      state.shortlist = [...m.lists.shortlist];
      state.checklist = m.lists.checklist;
      state.restoreText = "";
      state.restoreMessage = restoreDone(m.added, l);
    } else {
      state.restoreMessage = t(COPY.save.unavailable, l);
    }
  }

  function onSubmit(e: Event): void {
    const formId = (e.target as HTMLElement | null)?.id;
    if (formId === "rename-form" || formId === "split-form") {
      e.preventDefault();
      previewPlaceEdit(false);
      return;
    }
    if ((e.target as HTMLElement | null)?.id === "visit-form") {
      e.preventDefault();
      saveVisitForm();
      return;
    }
    if ((e.target as HTMLElement | null)?.id === "passport-form") {
      e.preventDefault();
      savePassportForm();
      return;
    }
    if ((e.target as HTMLElement | null)?.id === "share-filter-form") {
      e.preventDefault();
      state.shareQuery = root.querySelector<HTMLInputElement>("#share-q")?.value ?? "";
      render("none");
      root.querySelector<HTMLElement>("#share-pick")?.focus();
      return;
    }
    if ((e.target as HTMLElement | null)?.id === "survey-stop-form") {
      e.preventDefault();
      surveyAddTyped();
      return;
    }
    if ((e.target as HTMLElement | null)?.id !== "note-form") return;
    e.preventDefault();
    submitForm();
  }

  function onInput(e: Event): void {
    const el = e.target as HTMLInputElement | null;
    if (!el) return;
    if (el.id === "q") {
      state.query = el.value;
      refreshResults();
    } else if (el.id === "help-q") {
      state.helpQuery = el.value;
      const body = root.querySelector("#help-body");
      if (body) body.innerHTML = renderHelpBody(helpContext());
      if (queryWords(state.helpQuery).length > 0) announcer.say(resultsCount(searchHelp(state.helpQuery, state.locale).length, state.locale));
      opts.onAudit?.(auditDom(root, { locale: state.locale }));
    } else if (el.id === "csv-file" && e.type === "change") {
      void readCsvFile(el as HTMLInputElement);
    } else if (el.id === "visit-filter-place" && e.type === "change") {
      state.visitFilter = { ...state.visitFilter, placeId: el.value };
      render("keep", { action: "visit-filter-place" });
      announceVisitsShown();
    } else if (el.id === "sort") {
      if (isSortKey(el.value)) {
        state.sort = el.value;
        refreshResults();
      }
    } else if (e.type === "change" && el.dataset["action"] === "need-choice") {
      const key = el.dataset["key"];
      const choice = el.dataset["value"];
      if (!key || !(FACT_KEYS as readonly string[]).includes(key) || !isNeedChoice(choice)) return;
      state.needs = setNeed(state.needs, key as FactKey, choice);
      const saved = saveNeeds(opts.store, state.needs);
      render("keep", { action: "need-choice", key, value: choice });
      announcer.say(saved === "saved" ? `${t(COPY.mustHaves.savedOne, state.locale)}. ${t(COPY.facts[key as FactKey], state.locale)}${state.locale === "fr" ? "\u00A0:" : ":"} ${t(COPY.mustHaves.choices[choice], state.locale)}` : t(COPY.save.unavailable, state.locale));
    } else if (e.type === "change" && el.dataset["action"] === "answer") {
      const placeId = el.dataset["value"];
      const key = el.dataset["key"];
      if (!placeId || !key || !(FACT_KEYS as readonly string[]).includes(key)) return;
      const r = setAnswer(state.checklist, placeId, key as FactKey, el.value);
      if (!r.ok) {
        state.answerError = { key, code: r.error };
        render("keep", { action: "answer", key, value: placeId });
        announcer.say(t(COPY.checklist.error[r.error], state.locale));
        return;
      }
      state.answerError = undefined;
      state.checklist = r.list;
      const saved = saveChecklist(opts.store, r.list);
      refreshPlanText(placeId);
      announcer.say(t(saved === "saved" ? COPY.checklist.saved : COPY.save.unavailable, state.locale));
    } else if (e.type === "change" && el.dataset["surveyField"] !== undefined) {
      const field = el.dataset["surveyField"];
      keepSurvey(field === "licence" ? setLicence(state.survey, el.value) : setObservedOn(state.survey, el.value));
    } else if (el.closest("#note-form")) {
      state.form = readForm();
      // A correction is not a new note: it must not overwrite the unfinished new-note draft.
      if (!state.editing) saveDraft(opts.store, state.form);
    }
  }

  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKey);
  root.addEventListener("submit", onSubmit);
  root.addEventListener("input", onInput);
  root.addEventListener("change", onInput);
  function onHash(): void {
    if (!win || !isRouteHash(win.location.hash)) return;
    const v = hashToView(win.location.hash);
    if (!v) return;
    fromRoute = true;
    try { go(v); } finally { fromRoute = false; }
  }
  if (opts.hashRouting && win) {
    win.addEventListener("popstate", onHash);
    win.addEventListener("hashchange", onHash);
  }
  render("none");
  if (opts.hashRouting && win) onHash();

  return {
    getView: () => state.view,
    getLocale: () => state.locale,
    getNotes: () => state.notes,
    setOfflineStatus(status: OfflineStatus): void {
      state.offline = status;
      const footer = root.querySelector("footer p");
      if (footer) footer.textContent = t(COPY.offline[status], state.locale);
    },
    destroy(): void {
      if (opts.hashRouting && win) {
        win.removeEventListener("popstate", onHash);
        win.removeEventListener("hashchange", onHash);
      }
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKey);
      root.removeEventListener("submit", onSubmit);
      root.removeEventListener("input", onInput);
      root.removeEventListener("change", onInput);
      for (const d of detachers) d();
      detachers = [];
      reader?.destroy();
      reader = undefined;
      announcer.destroy();
      root.innerHTML = "";
    },
  };
}
