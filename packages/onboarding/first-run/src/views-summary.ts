import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t } from "./copy";
import { button, esc } from "./html";
import { coverageLines, renderCoverage } from "./coverage";
import type { FactKey } from "./facts";
import type { Place } from "./places";
import { summarisePlaces, summaryToText, type DetailRow, type PlacesSummary } from "./summary";
import { downloadLink } from "./views-sources";

export interface SummaryContext {
  readonly places: readonly Place[];
  /** The source the counts are limited to, or undefined for all of them. */
  readonly source: string | undefined;
  /** Source names to offer, in report order. */
  readonly sourceNames: readonly string[];
  readonly locale: Locale;
  readonly today: Date;
}

function numberRow(r: DetailRow, l: Locale): string {
  return (
    `<tr><th scope="row">${esc(t(COPY.facts[r.key], l))}</th>` +
    `<td data-col="yes">${r.yes}</td><td data-col="no">${r.no}</td>` +
    `<td data-col="differ">${r.differ}</td><td data-col="unknown">${r.unknown}</td></tr>`
  );
}

function renderTable(s: PlacesSummary, l: Locale): string {
  const th = (label: string): string => `<th scope="col">${esc(label)}</th>`;
  return (
    `<div class="table-wrap" role="region" aria-labelledby="summary-caption" tabindex="0">` +
    `<table class="data summary" data-kind="summary" data-places="${s.places}"><caption id="summary-caption">${esc(t(COPY.summary.caption, l))}</caption>` +
    `<thead><tr>${th(t(COPY.summary.detail, l))}${th(t(COPY.values.yes, l))}${th(t(COPY.values.no, l))}${th(t(COPY.places.differ, l))}${th(t(COPY.values.unknown, l))}</tr></thead>` +
    `<tbody>${s.rows.map((r) => numberRow(r, l)).join("")}</tbody></table></div>`
  );
}

/** A list of places with the details that made them appear, and a button to open each one. */
function placeList(items: ReadonlyArray<{ readonly place: Place; readonly keys: readonly FactKey[] }>, prefix: string, l: Locale, cls: string): string {
  const li = items
    .map((o, i) => {
      const id = `${prefix}-${i}`;
      const names = o.keys.map((k) => t(COPY.facts[k], l)).join(", ");
      return (
        `<li><span id="${id}" data-user-content>${esc(o.place.name)}</span>${l === "fr" ? NB : ""}: ${esc(names)}. ` +
        `${button(t(COPY.places.open, l), { "data-action": "open-place", "data-value": o.place.id, "aria-describedby": id, class: "secondary" })}</li>`
      );
    })
    .join("");
  return `<ul class="${cls}">${li}</ul>`;
}

function renderOld(s: PlacesSummary, l: Locale): string {
  const title = `<h3>${esc(t(COPY.summary.oldTitle, l))}</h3>`;
  if (s.old.length === 0) return `${title}<p>${esc(t(COPY.summary.noneOld, l))}</p>`;
  return `${title}<p>${esc(t(COPY.summary.oldIntro, l))}</p>${placeList(s.old, "old", l, "old-places")}`;
}

function renderDiffering(s: PlacesSummary, l: Locale): string {
  const title = `<h3>${esc(t(COPY.summary.differTitle, l))}</h3>`;
  if (s.differing.length === 0) return `${title}<p>${esc(t(COPY.summary.noneDiffer, l))}</p>`;
  return `${title}<p>${esc(t(COPY.summary.differIntro, l))}</p>${placeList(s.differing, "differ", l, "differ-places")}`;
}

function renderFilter(ctx: SummaryContext): string {
  const l = ctx.locale;
  if (ctx.sourceNames.length < 2) return "";
  const choice = (label: string, value: string, pressed: boolean, user: boolean): string =>
    `<button type="button" data-action="summary-source" data-value="${esc(value)}" aria-pressed="${pressed}" class="secondary" style="min-width:44px;min-height:44px">${user ? `<span data-user-content>${esc(label)}</span>` : esc(label)}</button>`;
  const buttons =
    choice(t(COPY.summary.all, l), "", ctx.source === undefined, false) +
    ctx.sourceNames.map((n) => choice(n, n, ctx.source === n, true)).join("");
  return (
    `<div role="group" aria-labelledby="source-filter-title"><h3 id="source-filter-title">${esc(t(COPY.summary.filterTitle, l))}</h3><p>${buttons}</p></div>` +
    (ctx.source !== undefined ? `<p class="notice" role="note">${esc(t(COPY.summary.onlyNote, l))}</p>` : "")
  );
}

/** Counts of Yes, No, differing and Unknown places for each detail. */
export function renderSummary(ctx: SummaryContext): string {
  const l = ctx.locale;
  const back = button(t(COPY.places.back, l), { "data-action": "view", "data-value": "places", class: "secondary" });
  const head = `<h2 id="view-title">${esc(t(COPY.summary.title, l))}</h2><p>${esc(t(COPY.summary.intro, l))}</p>`;
  if (ctx.places.length === 0) return `<section lang="${l}" aria-labelledby="view-title">${head}<p>${esc(t(COPY.summary.empty, l))}</p><p>${back}</p></section>`;
  const s = summarisePlaces(ctx.places, ctx.today);
  const text = `${summaryToText(s, l)}\n${coverageLines(ctx.places, l).join("\n")}\n`;
  return (
    `<section lang="${l}" aria-labelledby="view-title">${head}${renderFilter(ctx)}` +
    `<p>${esc(t(COPY.summary.places, l))}${l === "fr" ? NB : ""}: <strong>${s.places}</strong></p>` +
    renderTable(s, l) +
    renderCoverage(ctx.places, l) +
    renderDiffering(s, l) +
    renderOld(s, l) +
    `<p class="hint">${esc(t(COPY.textExport.keepNote, l))}</p>` +
    `<p>${downloadLink(text, `summary-${ctx.today.toISOString().slice(0, 10)}-${l}.txt`, l)}${back}</p></section>`
  );
}
