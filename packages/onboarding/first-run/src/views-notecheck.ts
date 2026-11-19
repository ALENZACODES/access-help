import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t } from "./copy";
import { button, esc } from "./html";
import type { Note } from "./model";
import { NOTE_FLAGS, checkNotes, flagLabel, noteCheckFilename, noteCheckToText, type FlaggedNote } from "./notecheck";
import { downloadLink } from "./views-sources";

export interface NoteCheckContext {
  readonly notes: readonly Note[];
  readonly pendingRemove: string | undefined;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

function item(x: FlaggedNote, ctx: NoteCheckContext): string {
  const l = ctx.locale;
  const titleId = `check-${x.note.id}`;
  // The same two-step remove as on My notes: Remove, then Remove for good or Keep.
  const actions =
    ctx.pendingRemove === x.note.id
      ? button(t(COPY.notes.confirmRemove, l), { "data-action": "confirm-remove", "data-value": x.note.id, "aria-describedby": titleId }) +
        button(t(COPY.notes.cancel, l), { "data-action": "cancel-remove", "data-value": x.note.id, class: "secondary" })
      : button(t(COPY.notes.remove, l), { "data-action": "remove-note", "data-value": x.note.id, "aria-describedby": titleId, class: "secondary" });
  return (
    `<li data-note="${esc(x.note.id)}"><p id="${esc(titleId)}"><strong data-user-content>${esc(x.note.placeName)}</strong>` +
    (x.note.address ? ` <span class="muted" data-user-content>${esc(x.note.address)}</span>` : "") +
    ` <span class="muted">(${esc(t(COPY.noteCheck.created, l))} ${esc(x.note.createdOn)})</span></p>` +
    `<ul>${x.flags.map((f) => `<li data-flag="${f}">${esc(flagLabel(f, l))}</li>`).join("")}</ul>` +
    `<p>${actions}</p></li>`
  );
}

/** Notes to check: plain facts about each note, and the person's own choice to keep or remove it. */
export function renderNoteCheck(ctx: NoteCheckContext): string {
  const l = ctx.locale;
  const colon = l === "fr" ? `${NB}:` : ":";
  const back = button(t(COPY.noteCheck.back, l), { "data-action": "view", "data-value": "notes", class: "secondary" });
  const head =
    `<h2 id="view-title">${esc(t(COPY.noteCheck.title, l))}</h2><p>${esc(t(COPY.noteCheck.intro, l))}</p>` +
    `<p class="notice" role="note">${esc(t(COPY.noteCheck.notFault, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" role="status">${esc(ctx.statusMessage)}</p>` : "");
  const check = checkNotes(ctx.notes, ctx.today);
  if (check.notes === 0) return `<section lang="${l}" aria-labelledby="view-title">${head}<p data-check-nonotes>${esc(t(COPY.noteCheck.noNotes, l))}</p><p>${back}</p></section>`;
  if (check.flagged.length === 0) return `<section lang="${l}" aria-labelledby="view-title">${head}<p data-check-none>${esc(t(COPY.noteCheck.none, l))}</p><p>${back}</p></section>`;
  return (
    `<section lang="${l}" aria-labelledby="view-title">${head}` +
    `<ul class="totals">${NOTE_FLAGS.map((f) => `<li>${esc(flagLabel(f, l))}${colon} <strong data-check-count="${f}">${check.counts[f]}</strong></li>`).join("")}</ul>` +
    `<h3 id="check-list">${esc(t(COPY.noteCheck.listTitle, l))}</h3>` +
    `<ul class="note-check" aria-labelledby="check-list">${check.flagged.map((x) => item(x, ctx)).join("")}</ul>` +
    `<p>${downloadLink(noteCheckToText(check, l, ctx.today), noteCheckFilename(ctx.today, l), l, COPY.noteCheck.download)}${back}</p></section>`
  );
}
