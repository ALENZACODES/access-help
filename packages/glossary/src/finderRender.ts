import { renderComparison } from './compare';
import { renderCoverage } from './coverage';
import { attribution, type PlaceDataset } from './dataset';
import { fixFrench } from './frTypography';
import { findPlaces } from './placeSearch';
import type { FinderState } from './filters';
import { FINDER_UI, placeCountText } from './finderText';
import { lookupTerm } from './glossary';
import { htmlLang } from './locale';
import { connectionText } from './offlineCache';
import { renderPlaceCard } from './placeRender';
import type { Place } from './places';
import { TERMS, type Lang } from './terms';
import { escapeHtml } from './text';

/** Controls are 44px or taller; the label is the target for each checkbox. */
export const FINDER_CSS = `.gl-finder { max-width: 48rem; line-height: 1.5; }
.gl-fieldset { margin: 16px 0; padding: 12px; border: 1px solid currentColor; border-radius: 4px; }
.gl-options { display: grid; gap: 8px; }
.gl-check { display: flex; align-items: center; gap: 12px; min-height: 44px; padding-block: 4px; }
.gl-box { flex: none; width: 24px; height: 24px; }
.gl-box:focus-visible { outline: 3px solid currentColor; outline-offset: 2px; }
.gl-btn { min-height: 44px; min-width: 44px; padding: 8px 16px; font: inherit; border: 2px solid currentColor; border-radius: 4px; background: transparent; color: inherit; }
.gl-btn:focus-visible { outline: 3px solid currentColor; outline-offset: 2px; }
.gl-btn[aria-pressed='true'] { border-width: 4px; font-weight: 700; }
.gl-offline { margin: 8px 0; padding: 8px; border: 2px dashed currentColor; }
summary { min-height: 44px; padding-block: 12px; cursor: pointer; }
summary:focus-visible { outline: 3px solid currentColor; outline-offset: 2px; }
.gl-compare-wrap { margin: 16px 0; overflow-x: auto; }
.gl-compare-wrap:focus-visible { outline: 3px solid currentColor; outline-offset: 2px; }
.gl-compare { border-collapse: collapse; width: 100%; }
.gl-compare th, .gl-compare td { padding: 8px; border: 1px solid currentColor; text-align: start; vertical-align: top; }
`;

export interface PlaceEntry {
  readonly match: ReturnType<typeof findPlaces>[number];
  /** Position in the full places array: stable ids that do not change when results are re-ranked. */
  readonly index: number;
}

export interface ResultsView {
  readonly count: string;
  readonly list: string;
  readonly compare: string;
  readonly shown: number;
}

/** Up to two selected places (by index in `places`) are compared. */
export function resultsView(
  places: readonly Place[],
  state: FinderState,
  lang: Lang,
  today: string,
  selected: readonly number[],
): ResultsView {
  const ui = FINDER_UI[lang];
  const matches = findPlaces(places, state, lang);
  const entries: PlaceEntry[] = matches.map((match) => ({ match, index: places.indexOf(match.place) }));
  const items = entries.map(({ match, index }) => {
    const pressed = selected.includes(index);
    return (
      `<li>${renderPlaceCard(match, lang, today, index)}` +
      `<button type="button" class="gl-btn" id="gl-cmp-${index}" aria-pressed="${pressed}" ` +
      `aria-label="${escapeHtml(ui.compareLabel(match.place.name))}">${escapeHtml(ui.compare)}</button></li>`
    );
  });
  const list =
    items.length === 0
      ? `<p class="gl-empty">${escapeHtml(ui.none)}</p>`
      : `<ul class="gl-places">${items.join('')}</ul>`;

  let compare = '';
  const [first, second] = selected.map((i) => places[i]);
  if (first !== undefined && second !== undefined) {
    compare = `<h3>${escapeHtml(ui.compareTitle)}</h3>${renderComparison(first, second, state.features, lang)}`;
  } else if (selected.length > 0) {
    compare = `<p class="gl-note">${escapeHtml(ui.pickTwo)}</p>`;
  }
  return { count: placeCountText(lang, matches.length), list, compare, shown: matches.length };
}

export interface FinderShellOptions {
  readonly lang: Lang;
  readonly state: FinderState;
  readonly places: readonly Place[];
  readonly dataset?: PlaceDataset | null;
  readonly today: string;
  readonly selected?: readonly number[];
  readonly offline?: boolean;
}

/** The whole finder: feature checkboxes, search, live count, results, comparison, data source. */
export function renderFinderShell(opts: FinderShellOptions): string {
  const { lang, state } = opts;
  const ui = FINDER_UI[lang];
  const view = resultsView(opts.places, state, lang, opts.today, opts.selected ?? []);
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
  const offlineText = connectionText(opts.offline !== true, lang);
  const banner =
    offlineText === null ? '' : `<p class="gl-offline" role="status" data-gl-offline>${escapeHtml(offlineText)}</p>`;
  const source =
    opts.dataset === undefined || opts.dataset === null
      ? ui.noData
      : attribution(opts.dataset, lang);
  return (
    `<section class="gl-finder" lang="${htmlLang(lang)}" aria-labelledby="gl-finder-title">` +
    `<h2 id="gl-finder-title">${escapeHtml(ui.title)}</h2>${banner}` +
    `<fieldset class="gl-fieldset"><legend>${escapeHtml(ui.featuresLegend)}</legend>` +
    `<p class="gl-note">${escapeHtml(ui.featuresHint)}</p><div class="gl-options">${checks}</div></fieldset>` +
    `<label for="gl-pq">${escapeHtml(ui.searchLabel)}</label>` +
    `<input id="gl-pq" class="gl-input" type="search" autocomplete="off" spellcheck="false" ` +
    `enterkeyhint="search" value="${escapeHtml(state.query)}">` +
    `<label class="gl-check" for="gl-hide"><input class="gl-box" type="checkbox" id="gl-hide"` +
    `${state.hideNotAvailable ? ' checked' : ''}><span>${escapeHtml(ui.hideLabel)}</span></label>` +
    `<button type="button" class="gl-btn" id="gl-clear">${escapeHtml(ui.clear)}</button>` +
    `<p id="gl-pcount" role="status" aria-live="polite" data-gl-pcount>${escapeHtml(view.count)}</p>` +
    `<div data-gl-presults>${view.list}</div>` +
    `<div data-gl-compare>${view.compare}</div>` +
    renderCoverage(opts.places, lang) +
    `<p class="gl-source" data-gl-attribution>${escapeHtml(lang === 'fr' ? fixFrench(`${ui.dataHeading} : ${source}`) : `${ui.dataHeading}: ${source}`)}</p>` +
    `</section>`
  );
}
