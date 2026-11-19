import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t } from "./copy";
import type { Requirement } from "./filter";
import { detailGaps, gapQuestion, needKeys, gapsFilename, gapsToText, placeCount, placesWithGaps, type DetailGaps } from "./gaps";
import { button, esc } from "./html";
import type { Place } from "./places";
import { downloadLink } from "./views-sources";

function placeItem(p: Place, key: string, index: number, l: Locale): string {
  const nameId = `gap-${key}-${index}`;
  return (
    `<li data-place="${esc(p.id)}"><span id="${nameId}" data-user-content>${esc(p.name)}</span>` +
    (p.address ? ` <span class="muted" data-user-content>${esc(p.address)}</span>` : "") +
    ` ${button(t(COPY.gaps.openPlace, l), { "data-action": "open-place", "data-value": p.id, "aria-describedby": nameId, class: "secondary" })}</li>`
  );
}

function detailBlock(g: DetailGaps, l: Locale): string {
  const colon = l === "fr" ? `${NB}:` : ":";
  const titleId = `gap-title-${g.key}`;
  const head =
    `<h3 id="${titleId}">${esc(t(COPY.facts[g.key], l))} ` +
    `<span class="muted" data-gap-count="${g.places.length}">(${esc(placeCount(g.places.length, l))})</span></h3>`;
  if (g.places.length === 0) {
    return `<section class="card gap-detail" data-key="${g.key}" aria-labelledby="${titleId}">${head}<p data-gap-none>${esc(t(COPY.gaps.allRecorded, l))}</p></section>`;
  }
  return (
    `<section class="card gap-detail" data-key="${g.key}" aria-labelledby="${titleId}">${head}` +
    `<p><strong>${esc(t(COPY.gaps.ask, l))}</strong>${colon} ${esc(gapQuestion(g.key, l))}</p>` +
    `<ul>${g.places.map((p, i) => placeItem(p, g.key, i, l)).join("")}</ul></section>`
  );
}

export interface GapsOptions {
  /** The person's saved must-haves. When there are any, the page offers to show only those details. */
  readonly needs?: Requirement;
  /** Show only the details in the must-haves. Ignored when no must-have is saved. */
  readonly onlyNeeds?: boolean;
}

/** Two buttons: every detail, or only the must-haves. aria-pressed shows the current choice. */
function needsFilter(only: boolean, l: Locale): string {
  const one = (value: "all" | "needs", label: string, pressed: boolean): string =>
    button(label, { "data-action": "gaps-only", "data-value": value, "aria-pressed": String(pressed), class: "secondary" });
  return (
    `<div role="group" aria-labelledby="gaps-filter-label" class="gaps-filter">` +
    `<p id="gaps-filter-label">${esc(t(COPY.gaps.filterLabel, l))}</p>` +
    one("all", t(COPY.gaps.all, l), !only) +
    one("needs", t(COPY.gaps.onlyNeeds, l), only) +
    `</div>`
  );
}

/** The "details with no record" page: what to ask, detail by detail. It guesses nothing and changes nothing. */
export function renderGaps(places: readonly Place[], locale: Locale, today: Date, opts: GapsOptions = {}): string {
  const l = locale;
  const keys = needKeys(opts.needs ?? {});
  const offerNeeds = keys.length > 0;
  const only = offerNeeds && opts.onlyNeeds === true;
  const colon = l === "fr" ? `${NB}:` : ":";
  const back = button(t(COPY.places.back, l), { "data-action": "view", "data-value": "places", class: "secondary" });
  const head =
    `<h2 id="view-title">${esc(t(COPY.gaps.title, l))}</h2><p>${esc(t(COPY.gaps.intro, l))}</p>` +
    `<p class="notice" role="note">${esc(t(COPY.gaps.notNo, l))}</p>`;
  if (places.length === 0) {
    return `<section lang="${l}" aria-labelledby="view-title">${head}<p data-gaps-empty>${esc(t(COPY.gaps.noPlaces, l))}</p><p>${back}</p></section>`;
  }
  const list = only ? detailGaps(places, keys) : detailGaps(places);
  const missing = placesWithGaps(list);
  const filter = offerNeeds ? needsFilter(only, l) + (only ? `<p data-gaps-showing-needs>${esc(t(COPY.gaps.showingNeeds, l))}</p>` : "") : "";
  const totals =
    filter +
    `<ul class="totals"><li>${esc(t(COPY.gaps.placesMissing, l))}${colon} <strong data-gaps-places>${missing}</strong> / <span data-gaps-of>${places.length}</span></li></ul>` +
    (missing === 0 ? `<p data-gaps-none>${esc(t(COPY.gaps.none, l))}</p>` : "");
  return (
    `<section lang="${l}" aria-labelledby="view-title">${head}${totals}${list.map((g) => detailBlock(g, l)).join("")}` +
    `<p class="hint">${esc(t(COPY.textExport.keepNote, l))}</p>` +
    `<p>${downloadLink(gapsToText(list, places.length, l, today, only), gapsFilename(today, l), l, COPY.gaps.download)}${back}</p></section>`
  );
}
