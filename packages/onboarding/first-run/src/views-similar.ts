import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t } from "./copy";
import { button, esc } from "./html";
import type { Place } from "./places";
import { type SimilarReason, type Suggestion, withoutAddress } from "./similar";

export interface SimilarContext {
  readonly places: readonly Place[];
  readonly suggestions: readonly Suggestion[];
  readonly hidden: number;
  readonly locale: Locale;
  readonly statusMessage: string | undefined;
}

export function reasonText(r: SimilarReason, l: Locale): string {
  return t(r === "same-address" ? COPY.similar.reasonAddress : r === "same-name" ? COPY.similar.reasonName : COPY.similar.reasonSimilar, l);
}

/** "3 pairs hidden", "1 paire masquée". */
export function hiddenText(n: number, l: Locale): string {
  if (l === "fr") return n > 1 ? `${n} paires masquées` : `${n} paire masquée`;
  return n === 1 ? "1 pair hidden" : `${n} pairs hidden`;
}

function side(p: Place, l: Locale): string {
  const address = p.address ? `<span data-user-content>${esc(p.address)}</span>` : `<em>${esc(t(COPY.similar.noAddress, l))}</em>`;
  return `<li><strong data-user-content>${esc(p.name)}</strong>${l === "fr" ? NB : ""}: ${address}</li>`;
}

function card(s: Suggestion, i: number, l: Locale): string {
  const id = `pair-${i}`;
  return (
    `<article class="card" aria-labelledby="${id}"><h3 id="${id}">${esc(t(COPY.similar.pair, l))} ${i + 1}</h3>` +
    `<p>${esc(reasonText(s.reason, l))}</p><ul class="pair">${side(s.a, l)}${side(s.b, l)}</ul>` +
    `<p>${button(t(COPY.similar.compare, l), { "data-action": "similar-compare", "data-value": s.key, "aria-describedby": id })}` +
    `${button(t(COPY.similar.notSame, l), { "data-action": "similar-dismiss", "data-value": s.key, "aria-describedby": id, class: "secondary" })}</p></article>`
  );
}

function renderNoAddress(places: readonly Place[], l: Locale): string {
  const list = withoutAddress(places);
  if (list.length === 0) return "";
  const items = list
    .map((p, i) => {
      const id = `noaddr-${i}`;
      return `<li><span id="${id}" data-user-content>${esc(p.name)}</span> ${button(t(COPY.places.open, l), { "data-action": "open-place", "data-value": p.id, "aria-describedby": id, class: "secondary" })}</li>`;
    })
    .join("");
  return `<h3>${esc(t(COPY.similar.noAddressTitle, l))}</h3><p>${esc(t(COPY.similar.noAddressIntro, l))}</p><ul class="no-address">${items}</ul>`;
}

/** Pairs of places that may be the same. Suggestions only: nothing is merged. */
export function renderSimilar(ctx: SimilarContext): string {
  const l = ctx.locale;
  const back = button(t(COPY.places.back, l), { "data-action": "view", "data-value": "places", class: "secondary" });
  const hidden =
    ctx.hidden > 0
      ? `<p>${esc(hiddenText(ctx.hidden, l))}. ${button(t(COPY.similar.showAgain, l), { "data-action": "similar-reset", class: "secondary" })}</p>`
      : "";
  return (
    `<section lang="${l}" aria-labelledby="view-title"><h2 id="view-title">${esc(t(COPY.similar.title, l))}</h2>` +
    `<p>${esc(t(COPY.similar.intro, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" role="status">${esc(ctx.statusMessage)}</p>` : "") +
    (ctx.suggestions.length === 0 ? `<p>${esc(t(COPY.similar.none, l))}</p>` : ctx.suggestions.map((s, i) => card(s, i, l)).join("")) +
    hidden +
    renderNoAddress(ctx.places, l) +
    `<p>${back}</p></section>`
  );
}
