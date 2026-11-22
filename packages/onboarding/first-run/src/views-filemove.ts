import type { Locale } from "../../switch-first/src/index";
import { t } from "./copy";
import { exportHref, type ImportError } from "./exchange";
import {
  FILE_MOVE_COPY as C,
  changeLine,
  changesText,
  changesTitle,
  checkText,
  copySummary,
  foundText,
  moveErrorText,
  moveFilename,
  noteSummary,
  notesTitle,
  problemText,
  targetTitle,
  type StepProblem,
} from "./filemove-copy";
import { button, esc } from "./html";
import { LIMITS, type Note } from "./model";
import { placeNameOf, type MoveChange, type MoveCheck } from "./movenote";
import type { Place } from "./places";
import { textExportHref } from "./textexport";

export interface FileMoveContext {
  readonly text: string;
  readonly error: ImportError | "no-notes" | undefined;
  /** True once a file has been read. */
  readonly loaded: boolean;
  readonly query: string;
  readonly found: { readonly places: readonly Place[]; readonly total: number } | undefined;
  /** The id of the place selected in the list. */
  readonly pickedPlace: string | undefined;
  /** The place whose notes are shown. */
  readonly place: Place | undefined;
  /** The id of the note selected in the list. */
  readonly pickedNote: string | undefined;
  /** The note being moved. */
  readonly note: Note | undefined;
  readonly targetQuery: string;
  /** Places the note can go to, without the one it is under. */
  readonly targets: { readonly places: readonly Place[]; readonly total: number } | undefined;
  /** The target selected: a place's id, "new" for a place not in the file, or undefined. */
  readonly target: string | undefined;
  readonly newName: string;
  readonly newAddress: string;
  readonly problems: readonly StepProblem[];
  readonly changes: readonly MoveChange[];
  readonly copy: { readonly text: string; readonly check: MoveCheck } | undefined;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const MOVE_TEXT_ID = "fmv-text";
export const MOVE_OPEN_ID = "fmv-open";
export const SEARCH_ID = "fmv-search";
export const TARGET_SEARCH_ID = "fmv-target-search";
export const NEW_ID = "fmv-target-new";
export const NEW_NAME_ID = "fmv-new-name";
export const NEW_ADDRESS_ID = "fmv-new-address";

const FIELD_STYLE = 'style="min-height:44px"';
const CHOICE_STYLE = 'style="min-height:44px;min-width:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

/** Radio buttons for a place, a note and a target; ids are already URL-safe. */
export const placeRadioId = (id: string): string => `fmv-place-${id}`;
export const noteRadioId = (id: string): string => `fmv-note-${id}`;
export const targetRadioId = (id: string): string => `fmv-target-${id}`;

/** Where each problem is fixed. */
export function problemTarget(p: StepProblem, ctx: Pick<FileMoveContext, "found" | "place" | "targets">): string {
  if (p === "no-place") {
    const first = ctx.found?.places[0];
    return first ? placeRadioId(first.id) : SEARCH_ID;
  }
  if (p === "no-note") {
    const first = ctx.place?.notes[0];
    return first ? noteRadioId(first.id) : SEARCH_ID;
  }
  if (p === "name-empty" || p === "name-long" || p === "name-control") return NEW_NAME_ID;
  if (p === "address-long" || p === "address-control") return NEW_ADDRESS_ID;
  if (p === "exists") return TARGET_SEARCH_ID;
  const first = ctx.targets?.places[0];
  return first ? targetRadioId(first.id) : NEW_ID;
}

function link(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

function placeText(p: Place, l: Locale): string {
  return `<span data-user-content>${esc(p.name)}</span>, ${p.address ? `<span data-user-content>${esc(p.address)}</span>` : esc(t(C.noAddress, l))}`;
}

function radio(id: string, name: string, value: string, checked: boolean, label: string): string {
  return `<label class="choice" for="${id}" ${CHOICE_STYLE}><input type="radio" id="${id}" name="${name}" value="${esc(value)}"${checked ? " checked" : ""}>${label}</label>`;
}

function problemOn(ctx: FileMoveContext, ps: readonly StepProblem[]): StepProblem | undefined {
  return ctx.problems.find((p) => ps.includes(p));
}

/** The search, and the places found, each with a radio button. */
export function renderFind(ctx: FileMoveContext): string {
  const l = ctx.locale;
  const p = problemOn(ctx, ["no-place"]);
  let list = "";
  if (ctx.found) {
    list = `<p id="fmv-found" tabindex="-1">${esc(foundText(ctx.found.places.length, ctx.found.total, l))}</p>`;
    if (ctx.found.places.length > 0)
      list +=
        `<form id="fmv-place-form" novalidate><fieldset${p ? ' aria-describedby="e-fmv-place"' : ""}><legend>${esc(t(C.placesLegend, l))}</legend>` +
        (p ? `<p id="e-fmv-place" class="error">${esc(problemText(p, l))}</p>` : "") +
        ctx.found.places.map((x) => radio(placeRadioId(x.id), "place", x.id, ctx.pickedPlace === x.id, placeText(x, l))).join("") +
        `</fieldset><p>${button(t(C.showNotes, l), { type: "submit", "data-action": "fmv-show" })}</p></form>`;
  }
  return (
    `<form id="fmv-find-form" novalidate><h3 id="fmv-find" tabindex="-1">${esc(t(C.findTitle, l))}</h3>` +
    `<label for="${SEARCH_ID}">${esc(t(C.searchLabel, l))}</label>` +
    `<p id="h-${SEARCH_ID}" class="hint">${esc(t(C.searchHint, l))}</p>` +
    `<input id="${SEARCH_ID}" type="search" name="query" maxlength="${LIMITS.address}" autocomplete="off" value="${esc(ctx.query)}" aria-describedby="h-${SEARCH_ID}" ${FIELD_STYLE}>` +
    `<p>${button(t(C.find, l), { type: "submit", "data-action": "fmv-find" })}</p></form>` +
    list
  );
}

/** The notes under the place chosen, each with a radio button and what it holds. */
export function renderNotes(place: Place, ctx: FileMoveContext): string {
  const l = ctx.locale;
  const p = problemOn(ctx, ["no-note"]);
  return (
    `<form id="fmv-note-form" novalidate><h3 id="fmv-notes" tabindex="-1"><span data-user-content>${esc(notesTitle(placeNameOf(place), place.notes.length, l))}</span></h3>` +
    `<fieldset${p ? ' aria-describedby="e-fmv-note"' : ""}><legend>${esc(t(C.notesLegend, l))}</legend>` +
    (p ? `<p id="e-fmv-note" class="error">${esc(problemText(p, l))}</p>` : "") +
    place.notes.map((n) => radio(noteRadioId(n.id), "note", n.id, ctx.pickedNote === n.id, `<span data-user-content>${esc(noteSummary(n, l))}</span>`)).join("") +
    `</fieldset><p>${button(t(C.chooseNote, l), { type: "submit", "data-action": "fmv-choose-note" })} ${button(t(C.backToPlaces, l), { "data-action": "fmv-back-places", class: "secondary" })}</p></form>`
  );
}

function field(id: string, label: string, value: string, problem: StepProblem | undefined, l: Locale): string {
  return (
    `<label for="${id}">${esc(label)}</label>` +
    (problem ? `<p id="e-${id}" class="error">${esc(problemText(problem, l))}</p>` : "") +
    `<input id="${id}" type="text" name="${id}" autocomplete="off" value="${esc(value)}" aria-describedby="h-${NEW_ID}${problem ? ` e-${id}` : ""}"${problem ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>`
  );
}

/** Where the note goes: a place in the file, found with its own search, or a place not in the file. */
export function renderTarget(note: Note, ctx: FileMoveContext): string {
  const l = ctx.locale;
  const p = problemOn(ctx, ["no-target", "same-place", "exists"]);
  const places = ctx.targets?.places ?? [];
  return (
    `<section aria-labelledby="fmv-target"><h3 id="fmv-target" tabindex="-1"><span data-user-content>${esc(targetTitle(note, l))}</span></h3>` +
    `<form id="fmv-target-find-form" novalidate><label for="${TARGET_SEARCH_ID}">${esc(t(C.targetSearchLabel, l))}</label>` +
    `<input id="${TARGET_SEARCH_ID}" type="search" name="targetQuery" maxlength="${LIMITS.address}" autocomplete="off" value="${esc(ctx.targetQuery)}" aria-describedby="h-${SEARCH_ID}-target" ${FIELD_STYLE}>` +
    `<p id="h-${SEARCH_ID}-target" class="hint">${esc(t(C.searchHint, l))}</p>` +
    `<p>${button(t(C.find, l), { type: "submit", "data-action": "fmv-find-target" })}</p></form>` +
    (ctx.targets ? `<p id="fmv-targets-found" tabindex="-1">${esc(foundText(ctx.targets.places.length, ctx.targets.total, l))}</p>` : "") +
    `<form id="fmv-move-form" novalidate><fieldset${p ? ' aria-describedby="e-fmv-target"' : ""}><legend>${esc(t(C.targetLegend, l))}</legend>` +
    (p ? `<p id="e-fmv-target" class="error">${esc(problemText(p, l))}</p>` : "") +
    places.map((x) => radio(targetRadioId(x.id), "target", x.id, ctx.target === x.id, placeText(x, l))).join("") +
    radio(NEW_ID, "target", "new", ctx.target === "new", esc(t(C.newPlace, l))) +
    `</fieldset><p id="h-${NEW_ID}" class="hint">${esc(t(C.newHint, l))}</p>` +
    field(NEW_NAME_ID, t(C.newName, l), ctx.newName, problemOn(ctx, ["name-empty", "name-long", "name-control"]), l) +
    field(NEW_ADDRESS_ID, t(C.newAddress, l), ctx.newAddress, problemOn(ctx, ["address-long", "address-control"]), l) +
    `<p>${button(t(C.save, l), { type: "submit", "data-action": "fmv-save" })} ${button(t(C.backToNotes, l), { "data-action": "fmv-back-notes", class: "secondary" })}</p></form></section>`
  );
}

export function renderChanges(ctx: FileMoveContext): string {
  const l = ctx.locale;
  const n = ctx.changes.length;
  return (
    `<section aria-labelledby="fmv-changes"><h3 id="fmv-changes" tabindex="-1">${esc(changesTitle(n, l))}</h3>` +
    (n === 0
      ? `<p>${esc(t(C.noChanges, l))}</p>`
      : `<ol class="fmv-changes">${ctx.changes.map((c) => `<li><span data-user-content>${esc(changeLine(c, l))}</span></li>`).join("")}</ol>` +
        `<p>${button(t(C.undo, l), { "data-action": "fmv-undo", class: "secondary" })}</p>`) +
    `</section>`
  );
}

/** The copy: what reading it back found, and its downloads when it read back as expected. */
export function renderCopy(copy: { text: string; check: MoveCheck }, ctx: FileMoveContext): string {
  const l = ctx.locale;
  const c = copy.check;
  const head = `<h3 id="fmv-copy" tabindex="-1">${esc(t(C.copyTitle, l))}</h3>`;
  if (!c.ok) return `<section aria-labelledby="fmv-copy">${head}<p id="fmv-check" class="error">${esc(checkText(c, l))}</p></section>`;
  const n = ctx.changes.length;
  return (
    `<section aria-labelledby="fmv-copy">${head}<p id="fmv-summary">${esc(copySummary(ctx.changes, c, l))}</p><p id="fmv-check">${esc(checkText(c, l))}</p>` +
    `<p>${link(exportHref(copy.text), moveFilename("copy", n, ctx.today, l), t(C.downloadCopy, l))} ` +
    `${link(textExportHref(changesText(ctx.changes, ctx.today, l)), moveFilename("list", n, ctx.today, l), t(C.downloadList, l))}</p></section>`
  );
}

export function renderFileMove(ctx: FileMoveContext): string {
  const l = ctx.locale;
  const err = ctx.error;
  const errors = [
    ...(err ? [`<li><a href="#${MOVE_TEXT_ID}">${esc(moveErrorText(err, l))}</a></li>`] : []),
    ...ctx.problems.map((p) => `<li><a href="#${problemTarget(p, ctx)}">${esc(problemText(p, l))}</a></li>`),
  ];
  const step = ctx.note ? renderTarget(ctx.note, ctx) : ctx.place ? renderNotes(ctx.place, ctx) : renderFind(ctx);
  return (
    `<div class="app filemove-app" lang="${l}"><section lang="${l}" aria-labelledby="fmv-title" class="filemove">` +
    `<h2 id="fmv-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.rule, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="fmv-status">${esc(ctx.statusMessage)}</p>` : "") +
    (errors.length > 0 ? `<div id="fmv-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${errors.join("")}</ul></div>` : "") +
    `<form id="fmv-file-form" novalidate>` +
    `<label for="${MOVE_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${MOVE_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${MOVE_TEXT_ID}" class="error">${esc(moveErrorText(err, l))}</p>` : "") +
    `<textarea id="${MOVE_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${MOVE_TEXT_ID}${err ? ` e-${MOVE_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${MOVE_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${MOVE_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "fmv-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "fmv-clear", class: "secondary" })}</p>` +
    (ctx.loaded ? step + renderChanges(ctx) : "") +
    (ctx.loaded && ctx.copy ? renderCopy(ctx.copy, ctx) : "") +
    `</section></div>`
  );
}
