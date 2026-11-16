import { BACKUP_IDS, BACKUP_MIME, BACKUP_UI, backupFilename, backupToStorage, countData, createBackup, parseBackup, renderDataPanel, restoredText, serialiseBackup } from './backup';
import { announcement, nextAnnouncement, renderAnnouncement, type AnnounceKind } from './announce';
import { LISTS_STORE_KEY, LIST_IDS, addToList, createList, deleteList, insertList, listErrorText, parseDeleteListId, parseLists, parsePickListId, parseRemoveListId, removeFromList, renderListsPanel, serialiseLists, type Lists } from './savedLists';
import { CORRECTION_MIME, composeCorrection, correctionFilename, fixFeatureId, fixNoteId, knownFeature, parseFixId } from './correction';
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
import { renderFinderShell, renderPlanSection, renderSuggestions, resultsView, type ResultsView } from './finderRender';
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
  addEventListener(type: string, listener: (event: { readonly target: unknown }) => void): void;
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
  /** Questions the person has ticked as asked, by place id. */
  getPlan(): PlanState;
  /** The person's own named lists of places. */
  getLists(): Lists;
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
export function mountPlaceFinder(root: FinderRoot, options: FinderOptions): FinderController {
  let lang = options.lang;
  let places: readonly Place[] = options.places ?? options.dataset?.places ?? [];
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

  function initialState(): FinderState {
    const fromHash = options.hash === undefined ? EMPTY_STATE : decodeState(options.hash.get());
    if (!isEmptyState(fromHash)) return fromHash;
    return readStore(options.store, FINDER_STORE_KEY, parseStoredState) ?? EMPTY_STATE;
  }
  let state = initialState();

  const canExport = options.onExport !== undefined;
  const extra = (): { view: FinderView; saved: readonly string[]; limit: number; canExport: boolean; canSpeak: boolean; notes: Notes; visits: Visits; lists: Lists } => ({
    view,
    saved,
    limit,
    canExport,
    canSpeak: options.onSpeak !== undefined,
    notes,
    visits,
    lists,
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
    return countData({ saved, notes, plan, visits, recent, lists });
  }

  function dataPanel(): string {
    return renderDataPanel({ lang, canExport, counts: dataCounts(), confirming: confirmingForget, message: dataMessage });
  }

  function listsPanel(): string {
    return renderListsPanel({ lang, lists, places, message: listMessage });
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
    const backup = createBackup({ saved, notes, plan, visits, recent, lists, view, state }, options.today);
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
    listMessage = '';
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
    listMessage = '';
    undoAction = null;
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
    root.innerHTML = renderFinderShell({
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
      offline: options.isOnline?.() === false,
      ...extra(),
      ...(prefs !== null ? { prefs: prefs.get() } : {}),
    });
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
    } else if (action.kind === 'list') {
      saveLists(insertList(lists, action.index, action.list));
      draw();
    } else if (action.kind === 'recent') {
      recent = action.recent;
      writeStore(options.store, RECENT_STORE_KEY, serialiseRecent(recent));
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
    } else if (parseFixId(t.id) !== null) {
      exportCorrection(parseFixId(t.id) ?? -1);
    } else if (parseSayId(t.id) !== null) {
      speakPlace(parseSayId(t.id) ?? -1);
    } else if (t.id === LIST_IDS.create) {
      createNewList();
    } else if (parseRemoveListId(t.id) !== null) {
      const rm = parseRemoveListId(t.id);
      if (rm !== null) removePlaceFromList(rm.list, rm.place);
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
  root.addEventListener('change', (event) => {
    if (readTarget(event.target)?.id === 'gl-pq') rememberSearch();
  });

  return {
    getState: () => state,
    getView: () => view,
    getPrefs: () => prefs?.get() ?? DEFAULT_PREFS,
    getSaved: () => saved,
    getNotes: () => notes,
    getPlan: () => plan,
    getLists: () => lists,
    getChanges: () => changes,
    getComparison: () => selected.flatMap((i) => (places[i] === undefined ? [] : [places[i].id])),
    setLang(next: Lang): void {
      lang = next;
      paint();
    },
    setPlaces(next: readonly Place[], nextDataset?: PlaceDataset | null): void {
      const diff = diffPlaces(places, next);
      changes = hasChanges(diff) ? diff : NO_CHANGES;
      places = next;
      dataset = nextDataset ?? null;
      selected = [];
      limit = PAGE_SIZE;
      saved = pruneSaved(saved, places);
      paint();
    },
    refreshConnection: paint,
    clear,
  };
}
