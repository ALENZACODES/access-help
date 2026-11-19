import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t } from "./copy";
import { button, esc } from "./html";
import type { Place } from "./places";
import {
  REVIEW_REASONS,
  buildReview,
  clampShown,
  itemQuestion,
  itemReason,
  reasonLabel,
  reviewCounts,
  reviewFilename,
  reviewToText,
  shownText,
  totalItems,
  type ReviewPlace,
  type ReviewReason,
} from "./review";
import { downloadLink } from "./views-sources";

export interface ReviewContext {
  readonly places: readonly Place[];
  readonly only: ReviewReason | undefined;
  /** How many places are shown; the rest come with "Show more places". */
  readonly shown: number;
  readonly locale: Locale;
  readonly today: Date;
}

function filterButtons(ctx: ReviewContext): string {
  const l = ctx.locale;
  const counts = reviewCounts(ctx.places, ctx.today);
  const all = counts.differ + counts.old + counts.unknown;
  const one = (value: string, label: string, n: number, pressed: boolean): string =>
    button(`${label} (${n})`, { "data-action": "review-filter", "data-value": value, "aria-pressed": pressed ? "true" : "false", class: "secondary" });
  return (
    `<div role="group" aria-labelledby="review-filter-label" class="review-filter">` +
    `<p id="review-filter-label">${esc(t(COPY.review.filterLabel, l))}</p>` +
    one("", t(COPY.review.all, l), all, ctx.only === undefined) +
    REVIEW_REASONS.map((r) => one(r, reasonLabel(r, l), counts[r], ctx.only === r)).join("") +
    `</div>`
  );
}

function placeBlock(p: ReviewPlace, index: number, l: Locale): string {
  const titleId = `review-place-${index}`;
  const colon = l === "fr" ? `${NB}:` : ":";
  const items = p.items
    .map(
      (i) =>
        `<li data-reason="${i.reason}" data-key="${i.key}"><strong>${esc(t(COPY.facts[i.key], l))}</strong>${colon} ${esc(reasonLabel(i.reason, l))}. ` +
        `${esc(itemReason(i, l))}<br><span class="review-ask">${esc(t(COPY.review.ask, l))}${colon} ${esc(itemQuestion(i, l))}</span></li>`,
    )
    .join("");
  return (
    `<article class="card review-place" data-place="${esc(p.place.id)}">` +
    `<h3 id="${titleId}"><span data-user-content>${esc(p.place.name)}</span></h3>` +
    (p.place.address ? `<p class="muted"><span data-user-content>${esc(p.place.address)}</span></p>` : "") +
    `<ul>${items}</ul>` +
    `<p>${button(t(COPY.review.openPlan, l), { "data-action": "open-plan", "data-value": p.place.id, "aria-describedby": titleId, class: "secondary" })}` +
    `${button(t(COPY.review.openHistory, l), { "data-action": "open-history", "data-value": p.place.id, "aria-describedby": titleId, class: "secondary" })}</p>` +
    `</article>`
  );
}

/** The "details to ask about again" page. A to-ask list across every place; it changes no note. */
export function renderReview(ctx: ReviewContext): string {
  const l = ctx.locale;
  const back = button(t(COPY.places.back, l), { "data-action": "view", "data-value": "places", class: "secondary" });
  const head =
    `<h2 id="view-title">${esc(t(COPY.review.title, l))}</h2><p>${esc(t(COPY.review.intro, l))}</p>` +
    `<p class="notice" role="note">${esc(t(COPY.review.notWrong, l))}</p>`;
  if (ctx.places.length === 0) {
    return `<section lang="${l}" aria-labelledby="view-title">${head}<p>${esc(t(COPY.review.noPlaces, l))}</p><p>${back}</p></section>`;
  }
  const list = buildReview(ctx.places, ctx.today, ctx.only);
  const shown = clampShown(ctx.shown, list.length);
  const visible = list.slice(0, shown);
  const body =
    list.length === 0
      ? `<p data-review-none>${esc(t(COPY.review.none, l))}</p>`
      : visible.map((p, i) => placeBlock(p, i, l)).join("") +
        `<p class="hint" data-review-shown>${esc(shownText(shown, list.length, l))}</p>` +
        (shown < list.length ? `<p>${button(t(COPY.review.more, l), { "data-action": "review-more", class: "secondary" })}</p>` : "");
  const text = reviewToText(list, l, ctx.today, ctx.only);
  return (
    `<section lang="${l}" aria-labelledby="view-title" data-review-items="${totalItems(list)}">${head}${filterButtons(ctx)}${body}` +
    `<p class="hint">${esc(t(COPY.textExport.keepNote, l))}</p>` +
    `<p>${downloadLink(text, reviewFilename(ctx.today, l, ctx.only), l, COPY.review.download)}${back}</p></section>`
  );
}
