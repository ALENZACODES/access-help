import type { Locale } from "../../switch-first/src/index";
import { t } from "./copy";
import { exportHref } from "./exchange";
import { button, esc } from "./html";
import type { Note } from "./model";
import { SHARE_COPY, filterNotes, hasOtherSources, shortlistNoteIds, pickLabel, pickedText, placesCount, shareFilename, sharedNotes, shareText } from "./share";

export interface ShareContext {
  readonly notes: readonly Note[];
  readonly query: string;
  readonly picked: readonly string[];
  readonly withText: boolean;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
  /** Place ids on the shortlist, to pick their notes in one go. */
  readonly shortlist?: readonly string[];
}

const LINK_STYLE = "display:inline-flex;align-items:center;min-width:44px;min-height:44px";

export function renderShare(ctx: ShareContext): string {
  const l = ctx.locale;
  const shown = filterNotes(ctx.notes, ctx.query);
  const status = ctx.statusMessage ? `<p class="notice" role="status">${esc(ctx.statusMessage)}</p>` : "";
  const boxes =
    shown.length === 0
      ? `<p>${esc(t(SHARE_COPY.noneShown, l))}</p>`
      : shown
          .map(
            (n) =>
              `<label class="choice" style="min-height:44px;min-width:44px"><input type="checkbox" data-action="share-pick" data-value="${esc(n.id)}"${ctx.picked.includes(n.id) ? " checked" : ""}>` +
              `<span data-user-content>${esc(pickLabel(n, l))}</span></label>`,
          )
          .join("");
  const count = ctx.picked.length;
  const shared = sharedNotes(ctx.notes, ctx.picked, ctx.withText);
  const result =
    count === 0
      ? `<p class="hint" data-share-none>${esc(t(SHARE_COPY.pickFirst, l))}</p>`
      : `<p data-share-count>${esc(pickedText(count, placesCount(ctx.notes, ctx.picked), l))}</p>` +
        (hasOtherSources(shared) ? `<p class="notice" data-share-others>${esc(t(SHARE_COPY.fromOthers, l))}</p>` : "") +
        `<p><a class="linkbtn" data-share-download download="${esc(shareFilename(ctx.today, count))}" href="${esc(exportHref(shareText(ctx.notes, ctx.picked, ctx.withText, ctx.today)))}" style="${LINK_STYLE}">${esc(t(SHARE_COPY.download, l))}</a></p>`;
  return (
    `<section lang="${l}" aria-labelledby="view-title" class="share">` +
    `<h2 id="view-title">${esc(t(SHARE_COPY.title, l))}</h2><p>${esc(t(SHARE_COPY.intro, l))}</p><p class="hint">${esc(t(SHARE_COPY.sendsNothing, l))}</p>` +
    status +
    `<form id="share-filter-form" role="search"><label for="share-q">${esc(t(SHARE_COPY.filterLabel, l))}</label>` +
    `<input id="share-q" name="q" type="search" autocomplete="off" maxlength="120" value="${esc(ctx.query)}" style="min-height:44px">` +
    `${button(t(SHARE_COPY.show, l), { type: "submit", "data-action": "share-filter", class: "secondary" })}</form>` +
    `<fieldset id="share-pick" tabindex="-1"><legend>${esc(t(SHARE_COPY.pickLegend, l))}</legend>` +
    (shown.length > 0
      ? `<p>${button(t(SHARE_COPY.all, l), { "data-action": "share-all", class: "secondary" })}${button(t(SHARE_COPY.none, l), { "data-action": "share-none", class: "secondary" })}` +
        (shortlistNoteIds(ctx.notes, ctx.shortlist ?? []).length > 0 ? button(t(SHARE_COPY.shortlist, l), { "data-action": "share-shortlist", class: "secondary" }) : "") +
        `</p>`
      : "") +
    `${boxes}</fieldset>` +
    `<p><label class="choice" style="min-height:44px;min-width:44px"><input type="checkbox" data-action="share-text" aria-describedby="share-text-hint"${ctx.withText ? " checked" : ""}>${esc(t(SHARE_COPY.textChoice, l))}</label></p>` +
    `<p id="share-text-hint" class="hint">${esc(t(SHARE_COPY.textHint, l))}</p>` +
    result +
    `<p>${button(t(SHARE_COPY.back, l), { "data-action": "view", "data-value": "notes", class: "secondary" })}</p>` +
    `</section>`
  );
}
