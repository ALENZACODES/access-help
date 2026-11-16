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
import { renderRecent, type RecentSearches } from './recentSearches';
import { attribution, type PlaceDataset } from './dataset';
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
.gl-fieldset { margin: 16px 0; padding: 12px; border: 1px solid currentColor; border-radius: 4px; }
.gl-options { display: grid; gap: 8px; }
.gl-check { display: flex; align-items: center; gap: 12px; min-height: 44px; padding-block: 4px; }
.gl-box { flex: none; width: 24px; height: 24px; }
.gl-box:focus-visible { outline: 3px solid currentColor; outline-offset: 2px; }
.gl-select { display: block; min-height: 44px; margin-block: 4px 12px; padding: 8px 12px; font: inherit; border: 2px solid currentColor; border-radius: 4px; background: transparent; color: inherit; }
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
      `<li>${renderPlaceCard(match, lang, today, index)}${questions}${note}<div class="gl-actions">` +
      `<button type="button" class="gl-btn" id="gl-cmp-${index}" aria-pressed="${selected.includes(index)}" ` +
      `aria-label="${escapeHtml(ui.compareLabel(name))}">${escapeHtml(ui.compare)}</button>` +
      `<button type="button" class="gl-btn" id="gl-save-${index}" aria-pressed="${saved.includes(match.place.id)}" ` +
      `aria-label="${escapeHtml(ui.saveLabel(name))}">${escapeHtml(ui.save)}</button>${copy}` +
      `${visitButton(index, name, visitDate(extra.visits ?? {}, match.place.id) !== null, lang)}</div>${visitNote(visitDate(extra.visits ?? {}, match.place.id), lang)}</li>`
    );
  });
  const more =
    page.remaining > 0
      ? `<button type="button" class="gl-btn" id="gl-more">${escapeHtml(ui.more)}</button>`
      : '';
  const list =
    items.length === 0
      ? `<p class="gl-empty">${escapeHtml(ui.none)}</p>`
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
  return renderPlan(entries, o.saved.filter((id) => o.places.some((p) => p.id === id)).length, o.lang, o.canExport) + copy + print + csv;
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
    `<div data-gl-presults>${results.list}</div>` +
    `<div data-gl-compare>${results.compare}</div>` +
    `<div data-gl-plan>${renderPlanSection({ lang, state, places: opts.places, saved, today: opts.today, plan: opts.plan ?? {}, canExport: opts.canExport === true })}</div>` +
    `<div data-gl-changes>${opts.changes === undefined ? '' : renderChanges(opts.changes, lang)}</div>` +
    renderCoverage(opts.places, lang) +
    renderQuality(opts.places, lang, opts.today) +
    renderHelpSection(lang) +
    `<details class="gl-data"><summary>${escapeHtml(BACKUP_UI[lang].heading)}</summary><div data-gl-data>` +
    renderDataPanel({ lang, canExport: opts.canExport === true, counts: opts.data?.counts ?? countData({ saved, notes: opts.notes ?? {}, plan: opts.plan ?? {}, visits: opts.visits ?? {}, recent: opts.recent ?? [] }), confirming: opts.data?.confirming === true, message: opts.data?.message ?? '' }) +
    `</div></details>` +
    `<p class="gl-source" data-gl-attribution>${escapeHtml(sourceLine)}</p>` +
    `</section>`
  );
}

