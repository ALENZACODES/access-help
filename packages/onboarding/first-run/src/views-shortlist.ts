import type { Locale } from "../../switch-first/src/index";
import { COPY, t } from "./copy";
import { button, esc } from "./html";
import type { Place } from "./places";
import { MAX_SHORTLIST } from "./shortlist";
import { shortlistRows, type ShortlistRow } from "./shortlist-order";

export interface ShortlistPageContext {
  readonly places: readonly Place[];
  readonly shortlist: readonly string[];
  readonly locale: Locale;
  readonly statusMessage: string | undefined;
}

/** "2 of 5", "2 sur 5". */
export function positionText(position: number, total: number, locale: Locale): string {
  return locale === "fr" ? `${position} sur ${total}` : `${position} of ${total}`;
}

function row(r: ShortlistRow, total: number, l: Locale): string {
  const nameId = `sl-name-${r.position}`;
  const name = `<span id="${nameId}" data-user-content>${esc(r.place.name)}</span>` + (r.place.address ? ` <span class="muted" data-user-content>${esc(r.place.address)}</span>` : "");
  const attrs = (action: string): Record<string, string> => ({ "data-action": action, "data-value": r.id, "aria-describedby": nameId, class: "secondary" });
  // Buttons that cannot act are left out rather than disabled, so every button on the page does something.
  const up = r.position > 1 ? button(t(COPY.shortlistPage.up, l), attrs("shortlist-up")) : "";
  const down = r.position < total ? button(t(COPY.shortlistPage.down, l), attrs("shortlist-down")) : "";
  const open = button(t(COPY.places.plan, l), attrs("open-plan"));
  const remove = button(t(COPY.shortlist.remove, l), attrs("shortlist-remove"));
  return (
    `<li data-place="${esc(r.id)}">` +
    `<p><span class="muted" data-position>${esc(positionText(r.position, total, l))}</span> · ${name}</p>` +
    `<p>${up}${down}${open}${remove}</p></li>`
  );
}

/** The person's shortlist, in their order, with controls to change the order and remove places. */
export function renderShortlistPage(ctx: ShortlistPageContext): string {
  const l = ctx.locale;
  const rows = shortlistRows(ctx.shortlist, ctx.places);
  const back = button(t(COPY.places.back, l), { "data-action": "view", "data-value": "places", class: "secondary" });
  const head =
    `<h2 id="view-title">${esc(t(COPY.shortlistPage.title, l))}</h2>` +
    `<p>${esc(t(COPY.shortlistPage.intro, l))}</p><p class="notice" role="note">${esc(t(COPY.shortlist.intro, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" role="status">${esc(ctx.statusMessage)}</p>` : "");
  if (rows.length === 0) {
    return `<section lang="${l}" aria-labelledby="view-title">${head}<p data-shortlist-empty>${esc(t(COPY.shortlistPage.empty, l))}</p><p>${back}</p></section>`;
  }
  return (
    `<section lang="${l}" aria-labelledby="view-title">${head}` +
    `<p data-shortlist-count>${esc(t(COPY.shortlistPage.count, l))}${l === "fr" ? "\u00A0:" : ":"} ${rows.length} / ${MAX_SHORTLIST}</p>` +
    `<ol class="shortlist-order" aria-labelledby="view-title">${rows.map((r) => row(r, rows.length, l)).join("")}</ol>` +
    `<p>` +
    button(t(COPY.places.viewRoundup, l), { "data-action": "view", "data-value": "roundup", class: "secondary" }) +
    back +
    `</p></section>`
  );
}
