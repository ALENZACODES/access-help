import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t } from "./copy";
import { button, esc } from "./html";
import {
  clampLatest,
  groupByMonth,
  kindCounts,
  latestFilename,
  latestRecords,
  latestShownText,
  latestToText,
  monthLabel,
  type LatestEntry,
} from "./latest";
import type { Place } from "./places";
import { RECORD_KINDS, kindLabel, recordParts, type RecordKind } from "./tier";
import { downloadLink } from "./views-sources";

export interface LatestContext {
  readonly places: readonly Place[];
  readonly only: RecordKind | undefined;
  /** How many records are shown; the rest come with "Show more records". */
  readonly shown: number;
  readonly locale: Locale;
  readonly today: Date;
}

function filterButtons(ctx: LatestContext): string {
  const l = ctx.locale;
  const counts = kindCounts(ctx.places);
  const one = (value: string, label: string, n: number, pressed: boolean): string =>
    button(`${label} (${n})`, { "data-action": "latest-filter", "data-value": value, "aria-pressed": pressed ? "true" : "false", class: "secondary" });
  return (
    `<div role="group" aria-labelledby="latest-filter-label" class="latest-filter">` +
    `<p id="latest-filter-label">${esc(t(COPY.latest.filterLabel, l))}</p>` +
    one("", t(COPY.latest.all, l), counts.person + counts["named-source"], ctx.only === undefined) +
    RECORD_KINDS.map((k) => one(k, kindLabel(k, l), counts[k], ctx.only === k)).join("") +
    `</div>`
  );
}

function item(e: LatestEntry, index: number, l: Locale): string {
  const colon = l === "fr" ? `${NB}:` : ":";
  const r = recordParts(e.entry.provenance, l);
  return (
    `<li id="latest-record-${index}" data-key="${e.entry.key}" data-kind="${e.entry.kind}" data-place="${esc(e.place.id)}">` +
    `<time datetime="${esc(r.date)}">${esc(r.date)}</time>${colon} ` +
    `${button(e.place.name, { "data-action": "open-history", "data-value": e.place.id, "data-user-content": "", class: "secondary" })} ` +
    `<strong>${esc(t(COPY.facts[e.entry.key], l))}</strong>${colon} ${esc(t(COPY.values[e.entry.value], l))}. ` +
    `<span data-user-content>${esc(r.source)}</span> · ${esc(r.licence)} · ${esc(r.tier)}</li>`
  );
}

/** The "latest records" page: every record on this device in date order, a page at a time. */
export function renderLatest(ctx: LatestContext): string {
  const l = ctx.locale;
  const back = button(t(COPY.places.back, l), { "data-action": "view", "data-value": "places", class: "secondary" });
  const head =
    `<h2 id="view-title">${esc(t(COPY.latest.title, l))}</h2><p>${esc(t(COPY.latest.intro, l))}</p>` +
    `<p class="notice" role="note">${esc(t(COPY.latest.noRank, l))}</p>`;
  if (ctx.places.length === 0) {
    return `<section lang="${l}" aria-labelledby="view-title">${head}<p>${esc(t(COPY.latest.noPlaces, l))}</p><p>${back}</p></section>`;
  }
  const all = latestRecords(ctx.places, ctx.only);
  const shown = clampLatest(ctx.shown, all.length);
  let index = 0;
  const months = groupByMonth(all.slice(0, shown))
    .map((m) => `<h3 data-month="${esc(m.month)}">${esc(monthLabel(m.month, l))}</h3><ul class="latest">${m.entries.map((e) => item(e, index++, l)).join("")}</ul>`)
    .join("");
  const body =
    all.length === 0
      ? `<p data-latest-none>${esc(t(COPY.latest.none, l))}</p>`
      : months +
        `<p class="hint" data-latest-shown>${esc(latestShownText(shown, all.length, l))}</p>` +
        (shown < all.length ? `<p>${button(t(COPY.latest.more, l), { "data-action": "latest-more", class: "secondary" })}</p>` : "");
  return (
    `<section lang="${l}" aria-labelledby="view-title" data-latest-records="${all.length}">${head}${filterButtons(ctx)}${body}` +
    `<p class="hint">${esc(t(COPY.tier.explain, l))}</p>` +
    `<p class="hint">${esc(t(COPY.textExport.keepNote, l))}</p>` +
    `<p>${downloadLink(latestToText(all, l, ctx.today, ctx.only), latestFilename(ctx.today, l, ctx.only), l, COPY.latest.download)}${back}</p></section>`
  );
}
