import type { Locale } from "../../switch-first/src/index";
import { t, type Pair } from "./copy";
import { button, esc, markTyped } from "./html";
import type { Place } from "./places";
import { noteDetailsText } from "./csvimport";
import { placeLabel } from "./survey-copy";
import {
  COMBINE_COPY,
  PLACE_TEXT_ERRORS,
  RENAME_COPY,
  SPLIT_COPY,
  SPLIT_ERRORS,
  summaryLines,
  type CombineResult,
  type PlaceTextError,
  type SplitError,
} from "./combine";

/** What the person typed and chose on the rename or split page, and whether they have looked at what it would do. */
export interface PlaceEditState {
  readonly name: string;
  readonly address: string;
  /** Notes chosen to move, when splitting. */
  readonly chosen: readonly string[];
  readonly errors: readonly (PlaceTextError | SplitError)[];
  /** What the typed values would do, once looked at; undefined before. */
  readonly preview: (CombineResult & { readonly joins: Place | undefined }) | undefined;
}

export interface PlaceEditContext {
  readonly place: Place | undefined;
  readonly edit: PlaceEditState;
  readonly locale: Locale;
  readonly statusMessage: string | undefined;
}

const FIELD_STYLE = "min-height:44px";
const CHOICE_STYLE = "min-height:44px;min-width:44px";

const ERROR_FIELD: Readonly<Record<PlaceTextError | SplitError, string>> = {
  "name-required": "pe-name",
  "name-too-long": "pe-name",
  "personal-phone": "pe-name",
  unchanged: "pe-name",
  "address-too-long": "pe-address",
  "control-chars": "pe-name",
  "personal-email": "pe-name",
  "none-chosen": "pe-notes",
  "all-chosen": "pe-notes",
};

function errorText(e: PlaceTextError | SplitError, l: Locale): string {
  const pair: Pair = e in SPLIT_ERRORS ? SPLIT_ERRORS[e as SplitError] : PLACE_TEXT_ERRORS[e as PlaceTextError];
  return t(pair, l);
}

function errorSummary(errors: readonly (PlaceTextError | SplitError)[], l: Locale): string {
  if (errors.length === 0) return "";
  const items = errors.map((e) => `<li><a href="#${ERROR_FIELD[e]}">${esc(errorText(e, l))}</a></li>`).join("");
  return `<div id="error-summary" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(RENAME_COPY.errorsTitle, l))}</h3><ul>${items}</ul></div>`;
}

function fieldAttrs(errors: readonly (PlaceTextError | SplitError)[], id: string): string {
  const mine = errors.filter((e) => ERROR_FIELD[e] === id);
  return mine.length > 0 ? ` aria-invalid="true" aria-describedby="e-${id}"` : "";
}

function fieldError(errors: readonly (PlaceTextError | SplitError)[], id: string, l: Locale): string {
  const mine = errors.filter((e) => ERROR_FIELD[e] === id);
  return mine.length === 0 ? "" : `<p id="e-${id}" class="error">${mine.map((e) => esc(errorText(e, l))).join(" ")}</p>`;
}

/** The name and address boxes, shared by both pages. */
function textFields(edit: PlaceEditState, l: Locale): string {
  return (
    `<label for="pe-name">${esc(t(RENAME_COPY.nameLabel, l))}</label>${fieldError(edit.errors, "pe-name", l)}` +
    `<input id="pe-name" name="name" type="text" autocomplete="off" maxlength="200" value="${esc(edit.name)}"${fieldAttrs(edit.errors, "pe-name")} style="${FIELD_STYLE}">` +
    `<label for="pe-address">${esc(t(RENAME_COPY.addressLabel, l))}</label>${fieldError(edit.errors, "pe-address", l)}` +
    `<input id="pe-address" name="address" type="text" autocomplete="off" maxlength="300" value="${esc(edit.address)}"${fieldAttrs(edit.errors, "pe-address")} style="${FIELD_STYLE}">`
  );
}

/** What the typed values would do, and the button that does it. */
function preview(edit: PlaceEditState, l: Locale, joins: Pair, save: Pair, action: string): string {
  const p = edit.preview;
  if (!p || edit.errors.length > 0) return "";
  const lines = [...(p.joins ? [t(joins, l)] : []), ...summaryLines(p.summary, l)];
  return (
    `<section id="pe-preview" aria-labelledby="pe-preview-title" tabindex="-1">` +
    `<h3 id="pe-preview-title">${esc(t(COMBINE_COPY.previewTitle, l))}</h3>` +
    `<ul>${lines.map((x) => `<li>${markTyped(x, placeLabel(p.summary.target.placeName, p.summary.target.address ?? ""))}</li>`).join("")}</ul>` +
    `<p>${button(t(save, l), { "data-action": action })}</p></section>`
  );
}

function shell(l: Locale, title: Pair, body: string, place: Place | undefined, status: string | undefined): string {
  const back = place
    ? `<p>${button(t(RENAME_COPY.back, l), { "data-action": "open-place", "data-value": place.id, class: "secondary" })}</p>`
    : `<p>${button(t(COMBINE_COPY.back, l), { "data-action": "view", "data-value": "places", class: "secondary" })}</p>`;
  return (
    `<section lang="${l}" aria-labelledby="view-title" class="place-edit">` +
    `<h2 id="view-title">${esc(t(title, l))}</h2>` +
    (status ? `<p class="notice" role="status">${esc(status)}</p>` : "") +
    body +
    back +
    `</section>`
  );
}

export function renderRename(ctx: PlaceEditContext): string {
  const l = ctx.locale;
  const p = ctx.place;
  if (!p) return shell(l, RENAME_COPY.title, `<p>${esc(t(COMBINE_COPY.gone, l))}</p>`, undefined, undefined);
  return shell(
    l,
    RENAME_COPY.title,
    `<p>${esc(t(RENAME_COPY.intro, l))}</p>` +
      `<p>${esc(l === "fr" ? "Maintenant\u00A0:" : "Now:")} <span data-user-content>${esc(placeLabel(p.name, p.address ?? ""))}</span></p>` +
      errorSummary(ctx.edit.errors, l) +
      `<form id="rename-form" novalidate>${textFields(ctx.edit, l)}<p>${button(t(RENAME_COPY.preview, l), { type: "submit", "data-action": "rename-preview" })}</p></form>` +
      preview(ctx.edit, l, RENAME_COPY.joins, RENAME_COPY.save, "rename-run"),
    p,
    ctx.statusMessage,
  );
}

export function renderSplit(ctx: PlaceEditContext): string {
  const l = ctx.locale;
  const p = ctx.place;
  if (!p) return shell(l, SPLIT_COPY.title, `<p>${esc(t(COMBINE_COPY.gone, l))}</p>`, undefined, undefined);
  const notes = p.notes
    .map((n, i) => {
      const details = noteDetailsText(n, l) || t(SPLIT_COPY.noDetails, l);
      const added = l === "fr" ? `Ajoutée le ${n.createdOn}` : `Added on ${n.createdOn}`;
      return (
        `<li><label class="choice" style="${CHOICE_STYLE}"><input type="checkbox" name="split-note" id="pe-note-${i}" value="${esc(n.id)}"${ctx.edit.chosen.includes(n.id) ? " checked" : ""}>` +
        `<span>${esc(added)}${l === "fr" ? "\u00A0:" : ":"} ${esc(details)}</span></label>` +
        (n.note ? ` <span data-user-content>${esc(n.note)}</span>` : "") +
        `</li>`
      );
    })
    .join("");
  return shell(
    l,
    SPLIT_COPY.title,
    `<p>${esc(t(SPLIT_COPY.intro, l))}</p>` +
      `<p><span data-user-content>${esc(placeLabel(p.name, p.address ?? ""))}</span></p>` +
      errorSummary(ctx.edit.errors, l) +
      `<form id="split-form" novalidate>` +
      `<fieldset id="pe-notes" tabindex="-1"${fieldAttrs(ctx.edit.errors, "pe-notes")}><legend>${esc(t(SPLIT_COPY.notesLegend, l))}</legend>${fieldError(ctx.edit.errors, "pe-notes", l)}<ul class="plain">${notes}</ul></fieldset>` +
      textFields(ctx.edit, l) +
      `<p>${button(t(RENAME_COPY.preview, l), { type: "submit", "data-action": "split-preview" })}</p></form>` +
      preview(ctx.edit, l, SPLIT_COPY.joins, SPLIT_COPY.save, "split-run"),
    p,
    ctx.statusMessage,
  );
}
