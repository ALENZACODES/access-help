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
import { renderFinderShell, resultsView } from './finderRender';
import type { IndexStore } from './offlineIndex';
import type { Place } from './places';
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
  /** Keeps the chosen features on this device between visits. */
  readonly store?: IndexStore;
  /** Makes a filtered view shareable as a link. Wins over the store when it has choices. */
  readonly hash?: HashHost;
  readonly isOnline?: () => boolean;
}

export interface FinderController {
  getState(): FinderState;
  /** Place ids currently selected for comparison, in the order chosen. */
  getComparison(): readonly string[];
  setLang(lang: Lang): void;
  setPlaces(places: readonly Place[], dataset?: PlaceDataset | null): void;
  refreshConnection(): void;
  clear(): void;
}

export const FINDER_STORE_KEY = 'glossary-finder-state';

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

/**
 * Renders the place finder into `root` and keeps it live: feature checkboxes, name search,
 * hide-not-available, clear, and a two-place comparison. Choices are saved on this device
 * (and in the URL hash if a host is given). Keyboard focus is kept where the person left it.
 */
export function mountPlaceFinder(root: FinderRoot, options: FinderOptions): FinderController {
  let lang = options.lang;
  let places: readonly Place[] = options.places ?? options.dataset?.places ?? [];
  let dataset: PlaceDataset | null = options.dataset ?? null;
  let selected: number[] = [];

  function initialState(): FinderState {
    const fromHash = options.hash === undefined ? EMPTY_STATE : decodeState(options.hash.get());
    if (!isEmptyState(fromHash)) return fromHash;
    try {
      const stored = options.store?.getItem(FINDER_STORE_KEY);
      return typeof stored === 'string' ? (parseStoredState(stored) ?? EMPTY_STATE) : EMPTY_STATE;
    } catch {
      return EMPTY_STATE;
    }
  }
  let state = initialState();

  function persist(): void {
    const encoded = encodeState(state);
    options.hash?.set(encoded === '' ? '' : `#${encoded}`);
    try {
      options.store?.setItem(FINDER_STORE_KEY, serialiseState(state));
    } catch {
      // Storage blocked or full: choices still work for this visit.
    }
  }

  function draw(): void {
    const view = resultsView(places, state, lang, options.today, selected);
    const results = root.querySelector('[data-gl-presults]');
    const count = root.querySelector('[data-gl-pcount]');
    const compare = root.querySelector('[data-gl-compare]');
    if (results !== null) results.innerHTML = view.list;
    if (count !== null) count.innerHTML = view.count;
    if (compare !== null) compare.innerHTML = view.compare;
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
    });
  }

  function update(next: FinderState): void {
    state = normaliseState(next);
    persist();
    draw();
  }

  function clear(): void {
    state = EMPTY_STATE;
    selected = [];
    persist();
    for (const [sel, prop, value] of [
      ['#gl-pq', 'value', ''],
      ['#gl-hide', 'checked', false],
    ] as const) {
      setProp(root.querySelector(sel), prop, value);
    }
    for (const t of TERMS) setProp(root.querySelector(`#gl-f-${t.id}`), 'checked', false);
    draw();
  }

  function toggleCompare(index: number): void {
    if (index < 0 || index >= places.length) return;
    selected = selected.includes(index) ? selected.filter((i) => i !== index) : [...selected, index].slice(-2);
    draw();
    root.querySelector(`#gl-cmp-${index}`)?.focus?.();
  }

  function onEvent(event: { readonly target: unknown }): void {
    const t = readTarget(event.target);
    if (t === null) return;
    if (t.id.startsWith('gl-f-') && t.checked !== undefined) {
      const id = t.id.slice('gl-f-'.length);
      if (state.features.includes(id) !== t.checked) update(toggleFeature(state, id));
    } else if (t.id === 'gl-pq' && t.value !== undefined) {
      update({ ...state, query: t.value });
    } else if (t.id === 'gl-hide' && t.checked !== undefined) {
      update({ ...state, hideNotAvailable: t.checked });
    } else if (t.id === 'gl-clear') {
      clear();
      root.querySelector('#gl-clear')?.focus?.();
    } else {
      const m = /^gl-cmp-(\d+)$/.exec(t.id);
      if (m !== null) toggleCompare(Number(m[1]));
    }
  }

  paint();
  for (const type of ['input', 'change', 'click']) root.addEventListener(type, onEvent);

  return {
    getState: () => state,
    getComparison: () => selected.flatMap((i) => (places[i] === undefined ? [] : [places[i].id])),
    setLang(next: Lang): void {
      lang = next;
      paint();
    },
    setPlaces(next: readonly Place[], nextDataset?: PlaceDataset | null): void {
      places = next;
      dataset = nextDataset ?? null;
      selected = [];
      paint();
    },
    refreshConnection: paint,
    clear,
  };
}
