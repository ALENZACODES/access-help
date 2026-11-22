import type { Locale } from "../../switch-first/src/index";
import { t } from "./copy";
import type { FoundPlaces, ReadBack, Removal } from "./dropplaces";
import { exportHref, type ImportError } from "./exchange";
import {
  FILE_DROP_COPY as C,
  chosenTitle,
  dropErrorText,
  dropFilename,
  foundText,
  keepLabel,
  placeLine,
  problemText,
  readBackText,
  removalSummary,
  removalText,
  removeLabel,
  type DropProblem,
} from "./filedrop-copy";
import type { StreetFile } from "./filestreets";
import { button, esc } from "./html";
import { LIMITS } from "./model";
import type { Place } from "./places";
import { textExportHref } from "./textexport";

export interface DropOutcome {
  readonly removal: Removal;
  readonly check: ReadBack;
  /** The copy and the notes taken out, as files. */
  readonly copy: string;
  readonly removed: string;
  /** The reason as given when the places were removed. */
  readonly reason: string;
}

export interface FileDropContext {
  readonly text: string;
  readonly error: ImportError | "no-notes" | undefined;
  readonly file: StreetFile | undefined;
  readonly query: string;
  /** The places found by the last search; undefined before one. */
  readonly found: FoundPlaces | undefined;
  /** Places ticked to remove, in the file's order. */
  readonly chosen: readonly Place[];
  readonly reason: string;
  readonly problems: readonly DropProblem[];
  /** The text of the list box. */
  readonly list: string;
  /** What the last list ticked, said in words. */
  readonly listResult: string | undefined;
  readonly outcome: DropOutcome | undefined;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const DROP_TEXT_ID = "fdp-text";
export const DROP_OPEN_ID = "fdp-open";
export const SEARCH_ID = "fdp-search";
export const REASON_ID = "fdp-reason";
export const LIST_ID = "fdp-list";

const FIELD_STYLE = 'style="min-height:44px"';
const CHOICE_STYLE = 'style="min-height:44px;min-width:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

/** The tick box for a place found; the place's id is already URL-safe. */
export const pickId = (id: string): string => `fdp-pick-${id}`;
/** The "Do not remove" button for a place ticked. */
export const keepId = (id: string): string => `fdp-keep-${id}`;

/** Where each problem is fixed. */
export function problemTarget(p: DropProblem): string {
  if (p === "none") return SEARCH_ID;
  if (p === "list-empty" || p === "list-long") return LIST_ID;
  return REASON_ID;
}

const isListProblem = (p: DropProblem): boolean => p === "list-empty" || p === "list-long";

/** A box to tick many places at once from a list of names. */
export function renderList(ctx: FileDropContext): string {
  const l = ctx.locale;
  const p = ctx.problems.find(isListProblem);
  return (
    `<form id="fdp-list-form" novalidate><h3 id="fdp-list-title">${esc(t(C.listTitle, l))}</h3>` +
    `<label for="${LIST_ID}">${esc(t(C.listLabel, l))}</label>` +
    `<p id="h-${LIST_ID}" class="hint">${esc(t(C.listHint, l))}</p>` +
    (p ? `<p id="e-${LIST_ID}" class="error">${esc(problemText(p, l))}</p>` : "") +
    `<textarea id="${LIST_ID}" name="list" rows="4" spellcheck="false" aria-describedby="h-${LIST_ID}${p ? ` e-${LIST_ID}` : ""}"${p ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.list)}</textarea>` +
    `<p>${button(t(C.listButton, l), { type: "submit", "data-action": "fdp-list" })}</p>` +
    (ctx.listResult !== undefined ? `<p id="fdp-list-result" tabindex="-1">${esc(ctx.listResult)}</p>` : "") +
    `</form>`
  );
}

function link(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

function placeText(place: Place, l: Locale): string {
  return `<span data-user-content>${esc(place.name)}</span>, ${place.address ? `<span data-user-content>${esc(place.address)}</span>` : esc(t(C.noAddress, l))}`;
}

export function renderFind(ctx: FileDropContext): string {
  const l = ctx.locale;
  const none = ctx.problems.includes("none");
  const described = `h-${SEARCH_ID}${none ? " e-fdp-none" : ""}`;
  return (
    `<form id="fdp-find-form" novalidate><h3 id="fdp-find" tabindex="-1">${esc(t(C.findTitle, l))}</h3>` +
    `<label for="${SEARCH_ID}">${esc(t(C.searchLabel, l))}</label>` +
    `<p id="h-${SEARCH_ID}" class="hint">${esc(t(C.searchHint, l))}</p>` +
    (none ? `<p id="e-fdp-none" class="error">${esc(problemText("none", l))}</p>` : "") +
    `<input id="${SEARCH_ID}" type="search" name="query" maxlength="${LIMITS.address}" autocomplete="off" value="${esc(ctx.query)}" aria-describedby="${described}" ${FIELD_STYLE}>` +
    `<p>${button(t(C.find, l), { type: "submit", "data-action": "fdp-find" })}</p></form>`
  );
}

/** The places found, each with a tick box; ticked when already chosen. */
export function renderFound(found: FoundPlaces, chosen: readonly Place[], l: Locale): string {
  const ids = new Set(chosen.map((p) => p.id));
  const summary = `<p id="fdp-found" tabindex="-1">${esc(foundText(found.places.length, found.total, l))}</p>`;
  if (found.places.length === 0) return summary;
  const boxes = found.places
    .map(
      (p) =>
        `<label class="choice" for="${pickId(p.id)}" ${CHOICE_STYLE}><input type="checkbox" id="${pickId(p.id)}" name="pick" value="${esc(p.id)}" data-action="fdp-pick"${ids.has(p.id) ? " checked" : ""}>${placeText(p, l)}</label>`,
    )
    .join("");
  return `${summary}<fieldset id="fdp-found-list"><legend>${esc(t(C.foundLegend, l))}</legend>${boxes}</fieldset>`;
}

/** The places ticked, each with a button to untick it, and the form to remove them. */
export function renderChosen(ctx: FileDropContext): string {
  const l = ctx.locale;
  const p = ctx.problems.find((x) => x === "too-long" || x === "control");
  const list =
    ctx.chosen.length === 0
      ? `<p id="fdp-none-chosen">${esc(t(C.noneChosen, l))}</p>`
      : `<ul class="fdp-chosen">${ctx.chosen
          .map((x) => `<li>${placeText(x, l)} ${button(keepLabel(x, l), { id: keepId(x.id), "data-action": "fdp-keep", "data-id": x.id, class: "secondary" })}</li>`)
          .join("")}</ul>`;
  return (
    `<section aria-labelledby="fdp-chosen-title"><h3 id="fdp-chosen-title" tabindex="-1">${esc(chosenTitle(ctx.chosen.length, l))}</h3>${list}` +
    `<form id="fdp-remove-form" novalidate>` +
    `<label for="${REASON_ID}">${esc(t(C.reasonLabel, l))}</label>` +
    `<p id="h-${REASON_ID}" class="hint">${esc(t(C.reasonHint, l))}</p>` +
    (p ? `<p id="e-${REASON_ID}" class="error">${esc(problemText(p, l))}</p>` : "") +
    `<input id="${REASON_ID}" type="text" name="reason" autocomplete="off" value="${esc(ctx.reason)}" aria-describedby="h-${REASON_ID}${p ? ` e-${REASON_ID}` : ""}"${p ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>` +
    `<p>${button(removeLabel(ctx.chosen.length, l), { type: "submit", "data-action": "fdp-remove" })}</p></form></section>`
  );
}

/** What was taken out, the read-back, and the downloads when the copy read back as expected. */
export function renderOutcome(o: DropOutcome, ctx: FileDropContext): string {
  const l = ctx.locale;
  const r = o.removal;
  const n = r.removed.length;
  const head = `<h3 id="fdp-result" tabindex="-1">${esc(t(C.resultTitle, l))}</h3><p id="fdp-summary">${esc(removalSummary(r, l))}</p>`;
  if (!o.check.ok) return `<section aria-labelledby="fdp-result">${head}<p id="fdp-check" class="error">${esc(readBackText(o.check, l))}</p></section>`;
  return (
    `<section aria-labelledby="fdp-result">${head}<p id="fdp-check">${esc(readBackText(o.check, l))}</p>` +
    `<p>${link(exportHref(o.copy), dropFilename("copy", n, ctx.today, l), t(C.downloadCopy, l))} ` +
    `${link(exportHref(o.removed), dropFilename("removed", n, ctx.today, l), t(C.downloadRemoved, l))} ` +
    `${link(textExportHref(removalText(r, o.reason, ctx.today, l)), dropFilename("list", n, ctx.today, l), t(C.downloadList, l))}</p>` +
    `<p class="hint">${esc(t(C.downloadsHint, l))}</p>` +
    `<h4>${esc(t(C.removedTitle, l))}</h4><ul class="fdp-removed">${r.removed.map((p) => `<li>${placeText(p, l)}</li>`).join("")}</ul></section>`
  );
}

export function renderFileDrop(ctx: FileDropContext): string {
  const l = ctx.locale;
  const err = ctx.error;
  const errors = [
    ...(err ? [`<li><a href="#${DROP_TEXT_ID}">${esc(dropErrorText(err, l))}</a></li>`] : []),
    ...ctx.problems.map((p) => `<li><a href="#${problemTarget(p)}">${esc(problemText(p, l))}</a></li>`),
  ];
  return (
    `<div class="app filedrop-app" lang="${l}"><section lang="${l}" aria-labelledby="fdp-title" class="filedrop">` +
    `<h2 id="fdp-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.rule, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="fdp-status">${esc(ctx.statusMessage)}</p>` : "") +
    (errors.length > 0 ? `<div id="fdp-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${errors.join("")}</ul></div>` : "") +
    `<form id="fdp-file-form" novalidate>` +
    `<label for="${DROP_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${DROP_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${DROP_TEXT_ID}" class="error">${esc(dropErrorText(err, l))}</p>` : "") +
    `<textarea id="${DROP_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${DROP_TEXT_ID}${err ? ` e-${DROP_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${DROP_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${DROP_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "fdp-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "fdp-clear", class: "secondary" })}</p>` +
    (ctx.file ? renderFind(ctx) + (ctx.found ? renderFound(ctx.found, ctx.chosen, l) : "") + renderList(ctx) + renderChosen(ctx) : "") +
    (ctx.file && ctx.outcome ? renderOutcome(ctx.outcome, ctx) : "") +
    `</section></div>`
  );
}
