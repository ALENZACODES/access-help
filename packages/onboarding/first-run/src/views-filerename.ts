import type { Locale } from "../../switch-first/src/index";
import { t } from "./copy";
import { exportHref, type ImportError } from "./exchange";
import {
  FILE_RENAME_COPY as C,
  changeLine,
  changesText,
  changesTitle,
  checkText,
  copySummary,
  editTitle,
  foundText,
  joinsText,
  mixedTitle,
  notesText,
  problemText,
  renameErrorText,
  renameFilename,
  renamePlaceLabel,
  spellingsText,
  type EditProblem,
} from "./filerename-copy";
import { button, esc } from "./html";
import { LIMITS } from "./model";
import type { Place } from "./places";
import { mixedPlaces, placeNameOf, spellingsOf, type CopyCheck, type PlaceName, type RenameChange } from "./renameplace";
import { textExportHref } from "./textexport";

export interface FileRenameContext {
  readonly text: string;
  readonly error: ImportError | "no-notes" | undefined;
  /** True once a file has been read. */
  readonly loaded: boolean;
  readonly query: string;
  /** The places found by the last search; undefined before one. */
  readonly found: { readonly places: readonly Place[]; readonly total: number } | undefined;
  /** Every place in the copy now, for the places written more than one way. */
  readonly places: readonly Place[];
  /** The id of the place whose button is selected in the list. */
  readonly picked: string | undefined;
  /** The place being renamed, as it is in the copy now. */
  readonly editing: Place | undefined;
  /** The name and address on the form. */
  readonly to: PlaceName;
  /** The other place the new name and address belong to, shown so the person can say they are one. */
  readonly joins: PlaceName | undefined;
  readonly allowJoin: boolean;
  readonly problems: readonly EditProblem[];
  readonly changes: readonly RenameChange[];
  /** The copy and what reading it back found; undefined before a change. */
  readonly copy: { readonly text: string; readonly check: CopyCheck } | undefined;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const RENAME_TEXT_ID = "frn-text";
export const RENAME_OPEN_ID = "frn-open";
export const SEARCH_ID = "frn-search";
export const NAME_ID = "frn-name";
export const ADDRESS_ID = "frn-address";
export const JOIN_ID = "frn-join";

const FIELD_STYLE = 'style="min-height:44px"';
const CHOICE_STYLE = 'style="min-height:44px;min-width:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

/** The radio button for a place found; place ids are already URL-safe. */
export const pickId = (id: string): string => `frn-pick-${id}`;
/** The "Rename …" button of a place written more than one way. */
export const mixedId = (id: string): string => `frn-mixed-${id}`;

/** Places written more than one way, each with its spellings and a button to rename it; nothing when there are none. */
export function renderMixed(places: readonly Place[], l: Locale): string {
  const mixed = mixedPlaces(places);
  if (mixed.length === 0) return "";
  return (
    `<section aria-labelledby="frn-mixed"><h3 id="frn-mixed">${esc(mixedTitle(mixed.length, l))}</h3><p class="hint">${esc(t(C.mixedHint, l))}</p><ul class="frn-mixed">` +
    mixed
      .map(
        (p) =>
          `<li><span data-user-content>${esc(spellingsText(spellingsOf(p), l))}</span> ` +
          `${button(renamePlaceLabel(p.name, l), { id: mixedId(p.id), "data-action": "frn-rename-place", "data-id": p.id, class: "secondary" })}</li>`,
      )
      .join("") +
    `</ul></section>`
  );
}

/** Where each problem is fixed; "no-choice" goes to the first place listed, or the search. */
export function problemTarget(p: EditProblem, ctx: Pick<FileRenameContext, "found">): string {
  if (p === "no-choice") {
    const first = ctx.found?.places[0];
    return first ? pickId(first.id) : SEARCH_ID;
  }
  if (p === "address-long" || p === "address-control") return ADDRESS_ID;
  if (p === "joins") return JOIN_ID;
  return NAME_ID;
}

const fieldOf = (p: EditProblem): string | undefined =>
  p === "no-choice" ? undefined : p === "address-long" || p === "address-control" ? ADDRESS_ID : p === "joins" ? JOIN_ID : NAME_ID;

function link(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

function placeText(p: Place, l: Locale): string {
  return `<span data-user-content>${esc(p.name)}</span>, ${p.address ? `<span data-user-content>${esc(p.address)}</span>` : esc(t(C.noAddress, l))}`;
}

export function renderFind(ctx: FileRenameContext): string {
  const l = ctx.locale;
  const noChoice = ctx.problems.includes("no-choice");
  let list = "";
  if (ctx.found) {
    const f = ctx.found;
    list = `<p id="frn-found" tabindex="-1">${esc(foundText(f.places.length, f.total, l))}</p>`;
    if (f.places.length > 0)
      list +=
        `<form id="frn-pick-form" novalidate><fieldset${noChoice ? ' aria-describedby="e-frn-pick"' : ""}><legend>${esc(t(C.foundLegend, l))}</legend>` +
        (noChoice ? `<p id="e-frn-pick" class="error">${esc(problemText("no-choice", l))}</p>` : "") +
        f.places
          .map(
            (p) =>
              `<label class="choice" for="${pickId(p.id)}" ${CHOICE_STYLE}><input type="radio" id="${pickId(p.id)}" name="place" value="${esc(p.id)}"${ctx.picked === p.id ? " checked" : ""}>${placeText(p, l)}</label>`,
          )
          .join("") +
        `</fieldset><p>${button(t(C.choose, l), { type: "submit", "data-action": "frn-choose" })}</p></form>`;
  }
  return (
    `<form id="frn-find-form" novalidate><h3 id="frn-find" tabindex="-1">${esc(t(C.findTitle, l))}</h3>` +
    `<label for="${SEARCH_ID}">${esc(t(C.searchLabel, l))}</label>` +
    `<p id="h-${SEARCH_ID}" class="hint">${esc(t(C.searchHint, l))}</p>` +
    `<input id="${SEARCH_ID}" type="search" name="query" maxlength="${LIMITS.address}" autocomplete="off" value="${esc(ctx.query)}" aria-describedby="h-${SEARCH_ID}" ${FIELD_STYLE}>` +
    `<p>${button(t(C.find, l), { type: "submit", "data-action": "frn-find" })}</p></form>` +
    list
  );
}

function field(id: string, label: string, value: string, problem: EditProblem | undefined, l: Locale): string {
  return (
    `<label for="${id}">${esc(label)}</label>` +
    (problem ? `<p id="e-${id}" class="error">${esc(problemText(problem, l))}</p>` : "") +
    `<input id="${id}" type="text" name="${id}" autocomplete="off" value="${esc(value)}" aria-describedby="h-frn-edit${problem ? ` e-${id}` : ""}"${problem ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>`
  );
}

/** The form to write the new name and address of the place being renamed. */
export function renderEdit(place: Place, ctx: FileRenameContext): string {
  const l = ctx.locale;
  const on = (id: string): EditProblem | undefined => ctx.problems.find((p) => fieldOf(p) === id);
  const joinProblem = on(JOIN_ID);
  return (
    `<form id="frn-edit-form" novalidate><h3 id="frn-edit" tabindex="-1">${esc(editTitle(placeNameOf(place), l))}</h3>` +
    `<p>${esc(notesText(place.notes.length, l))}</p>` +
    `<p id="h-frn-edit" class="hint">${esc(t(C.editHint, l))}</p>` +
    field(NAME_ID, t(C.nameLabel, l), ctx.to.name, on(NAME_ID), l) +
    field(ADDRESS_ID, t(C.addressLabel, l), ctx.to.address, on(ADDRESS_ID), l) +
    (ctx.joins
      ? `<p id="frn-joins">${esc(joinsText(ctx.joins, l))}</p>` +
        (joinProblem ? `<p id="e-${JOIN_ID}" class="error">${esc(problemText(joinProblem, l))}</p>` : "") +
        `<p><label class="choice" for="${JOIN_ID}" ${CHOICE_STYLE}><input type="checkbox" id="${JOIN_ID}" name="join" value="yes" aria-describedby="frn-joins${joinProblem ? ` e-${JOIN_ID}` : ""}"${ctx.allowJoin ? " checked" : ""}>${esc(t(C.joinLabel, l))}</label></p>`
      : "") +
    `<p>${button(t(C.save, l), { type: "submit", "data-action": "frn-save" })} ${button(t(C.back, l), { "data-action": "frn-back", class: "secondary" })}</p></form>`
  );
}

export function renderChanges(ctx: FileRenameContext): string {
  const l = ctx.locale;
  const n = ctx.changes.length;
  return (
    `<section aria-labelledby="frn-changes"><h3 id="frn-changes" tabindex="-1">${esc(changesTitle(n, l))}</h3>` +
    (n === 0
      ? `<p>${esc(t(C.noChanges, l))}</p>`
      : `<ol class="frn-changes">${ctx.changes.map((c) => `<li><span data-user-content>${esc(changeLine(c, l))}</span></li>`).join("")}</ol>` +
        `<p>${button(t(C.undo, l), { "data-action": "frn-undo", class: "secondary" })}</p>`) +
    `</section>`
  );
}

/** The copy: what reading it back found, and its downloads when it read back as expected. */
export function renderCopy(copy: { text: string; check: CopyCheck }, ctx: FileRenameContext): string {
  const l = ctx.locale;
  const c = copy.check;
  const head = `<h3 id="frn-copy" tabindex="-1">${esc(t(C.copyTitle, l))}</h3>`;
  if (!c.ok) return `<section aria-labelledby="frn-copy">${head}<p id="frn-check" class="error">${esc(checkText(c, l))}</p></section>`;
  const n = ctx.changes.length;
  return (
    `<section aria-labelledby="frn-copy">${head}<p id="frn-summary">${esc(copySummary(ctx.changes, c, l))}</p><p id="frn-check">${esc(checkText(c, l))}</p>` +
    `<p>${link(exportHref(copy.text), renameFilename("copy", n, ctx.today, l), t(C.downloadCopy, l))} ` +
    `${link(textExportHref(changesText(ctx.changes, ctx.today, l)), renameFilename("list", n, ctx.today, l), t(C.downloadList, l))}</p></section>`
  );
}

export function renderFileRename(ctx: FileRenameContext): string {
  const l = ctx.locale;
  const err = ctx.error;
  const errors = [
    ...(err ? [`<li><a href="#${RENAME_TEXT_ID}">${esc(renameErrorText(err, l))}</a></li>`] : []),
    ...ctx.problems.map((p) => `<li><a href="#${problemTarget(p, ctx)}">${esc(problemText(p, l))}</a></li>`),
  ];
  return (
    `<div class="app filerename-app" lang="${l}"><section lang="${l}" aria-labelledby="frn-title" class="filerename">` +
    `<h2 id="frn-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.rule, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="frn-status">${esc(ctx.statusMessage)}</p>` : "") +
    (errors.length > 0 ? `<div id="frn-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${errors.join("")}</ul></div>` : "") +
    `<form id="frn-file-form" novalidate>` +
    `<label for="${RENAME_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${RENAME_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${RENAME_TEXT_ID}" class="error">${esc(renameErrorText(err, l))}</p>` : "") +
    `<textarea id="${RENAME_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${RENAME_TEXT_ID}${err ? ` e-${RENAME_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${RENAME_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${RENAME_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "frn-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "frn-clear", class: "secondary" })}</p>` +
    (ctx.loaded ? (ctx.editing ? renderEdit(ctx.editing, ctx) : renderFind(ctx) + renderMixed(ctx.places, l)) + renderChanges(ctx) : "") +
    (ctx.loaded && ctx.copy ? renderCopy(ctx.copy, ctx) : "") +
    `</section></div>`
  );
}
