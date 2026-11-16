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
import { renderFinderShell, renderSuggestions, resultsView, type ResultsView } from './finderRender';
import type { IndexStore } from './offlineIndex';
import type { Place } from './places';
import { DEFAULT_PREFS, createPrefs, type Prefs } from './prefs';
import { PAGE_SIZE, DEFAULT_VIEW, SORT_KEYS, normaliseView, parseView, serialiseView, type FinderView } from './view';
import { comparisonToText, savedToText, toExportFile, type ExportFile } from './textExport';
import { TERMS, type Lang } from './terms';

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
}

export interface FinderController {
  getState(): FinderState;
  getView(): FinderView;
  getPrefs(): Prefs;
  /** Saved place ids, in the order saved. */
  getSaved(): readonly string[];
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
  let saved: readonly string[] = pruneSaved(readStore(options.store, SAVED_STORE_KEY, parseSaved) ?? [], places);

  function initialState(): FinderState {
    const fromHash = options.hash === undefined ? EMPTY_STATE : decodeState(options.hash.get());
    if (!isEmptyState(fromHash)) return fromHash;
    return readStore(options.store, FINDER_STORE_KEY, parseStoredState) ?? EMPTY_STATE;
  }
  let state = initialState();

  const canExport = options.onExport !== undefined;
  const extra = (): { view: FinderView; saved: readonly string[]; limit: number; canExport: boolean } => ({
    view,
    saved,
    limit,
    canExport,
  });

  function persistState(): void {
    const encoded = encodeState(state);
    options.hash?.set(encoded === '' ? '' : `#${encoded}`);
    writeStore(options.store, FINDER_STORE_KEY, serialiseState(state));
  }

  function compute(): ResultsView {
    return resultsView(places, state, lang, options.today, selected, extra());
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

  function clear(): void {
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
    saved = toggleSaved(saved, place.id);
    writeStore(options.store, SAVED_STORE_KEY, serialiseSaved(saved));
    draw();
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
    } else if (t.id.startsWith('gl-sg-')) {
      addSuggested(t.id.slice('gl-sg-'.length));
    } else {
      const cmp = /^gl-cmp-(\d+)$/.exec(t.id);
      const save = /^gl-save-(\d+)$/.exec(t.id);
      if (cmp !== null) toggleCompare(Number(cmp[1]));
      else if (save !== null) toggleSave(Number(save[1]));
    }
  }

  paint();
  for (const type of ['input', 'change', 'click']) root.addEventListener(type, onEvent);

  return {
    getState: () => state,
    getView: () => view,
    getPrefs: () => prefs?.get() ?? DEFAULT_PREFS,
    getSaved: () => saved,
    getComparison: () => selected.flatMap((i) => (places[i] === undefined ? [] : [places[i].id])),
    setLang(next: Lang): void {
      lang = next;
      paint();
    },
    setPlaces(next: readonly Place[], nextDataset?: PlaceDataset | null): void {
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
