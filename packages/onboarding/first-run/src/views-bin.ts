import type { Locale } from "../../switch-first/src/index";
import { t } from "./copy";
import { BIN_COPY, binLine, deleteLabel, putBackLabel, type BinEntry } from "./bin";
import { button, esc } from "./html";
import { renderFactList } from "./views";

export interface BinContext {
  readonly bin: readonly BinEntry[];
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
  /** The note asking "remove for good?", if any. */
  readonly confirmDelete: string | undefined;
  readonly confirmEmpty: boolean;
}

function placeName(e: BinEntry): string {
  return e.note.address ? `${e.note.placeName}, ${e.note.address}` : e.note.placeName;
}

function entry(e: BinEntry, i: number, ctx: BinContext): string {
  const l = ctx.locale;
  const name = placeName(e);
  const asking = ctx.confirmDelete === e.note.id;
  const actions = asking
    ? `<div role="group" aria-labelledby="bin-ask-${i}"><p id="bin-ask-${i}">${esc(t(BIN_COPY.confirmDelete, l))}</p><p>` +
      button(deleteLabel(name, l), { "data-action": "bin-delete-confirm", "data-value": e.note.id }) +
      button(t(BIN_COPY.no, l), { "data-action": "bin-delete-cancel", "data-value": e.note.id, class: "secondary" }) +
      `</p></div>`
    : `<p>${button(putBackLabel(name, l), { "data-action": "bin-restore", "data-value": e.note.id })}` +
      `${button(deleteLabel(name, l), { "data-action": "bin-delete", "data-value": e.note.id, class: "secondary" })}</p>`;
  return (
    `<li class="card" data-bin="${esc(e.note.id)}"><h3 id="bin-title-${i}"><span data-user-content>${esc(e.note.placeName)}</span></h3>` +
    (e.note.address ? `<p class="muted"><span data-user-content>${esc(e.note.address)}</span></p>` : "") +
    `<p data-bin-left>${esc(binLine(e, l, ctx.today))}</p>` +
    renderFactList(e.note.facts, l, ctx.today) +
    (e.note.note ? `<p><span data-user-content>${esc(e.note.note)}</span></p>` : "") +
    actions +
    `</li>`
  );
}

export function renderBin(ctx: BinContext): string {
  const l = ctx.locale;
  const status = ctx.statusMessage ? `<p class="notice" role="status">${esc(ctx.statusMessage)}</p>` : "";
  const back = button(t(BIN_COPY.back, l), { "data-action": "view", "data-value": "notes", class: "secondary" });
  const head = `<h2 id="view-title">${esc(t(BIN_COPY.title, l))}</h2><p>${esc(t(BIN_COPY.intro, l))}</p>${status}`;
  if (ctx.bin.length === 0) return `<section lang="${l}" aria-labelledby="view-title">${head}<p>${esc(t(BIN_COPY.none, l))}</p><p>${back}</p></section>`;
  const empty = ctx.confirmEmpty
    ? `<div role="group" aria-labelledby="bin-empty-q"><p id="bin-empty-q">${esc(t(BIN_COPY.confirmEmpty, l))}</p><p>` +
      button(t(BIN_COPY.yesEmpty, l), { "data-action": "bin-empty-confirm" }) +
      button(t(BIN_COPY.no, l), { "data-action": "bin-empty-cancel", class: "secondary" }) +
      `</p></div>`
    : `<p>${button(t(BIN_COPY.empty, l), { "data-action": "bin-empty", class: "secondary" })}</p>`;
  return (
    `<section lang="${l}" aria-labelledby="view-title">${head}` +
    `<ul class="bin-list" id="bin-list" tabindex="-1">${ctx.bin.map((e, i) => entry(e, i, ctx)).join("")}</ul>` +
    empty +
    `<p>${back}</p></section>`
  );
}
