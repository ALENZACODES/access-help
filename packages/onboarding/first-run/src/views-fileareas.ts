import type { Locale } from "../../switch-first/src/index";
import { AREA_BYS, AREA_ORDERS, areaCsv, findArea, placeGaps, type AreaOptions, type AreaReport, type AreaRow } from "./areacover";
import { COPY, t } from "./copy";
import { exportHref, type ImportError } from "./exchange";
import { FACT_KEYS, type FactKey } from "./facts";
import {
  FILE_AREAS_COPY as C,
  areaLinkLabel,
  areaName,
  areasErrorText,
  areasFilename,
  areasText,
  byText,
  cellText,
  orderText,
  placeGapLines,
  placesTitle,
  reportSummary,
  showPlacesLabel,
} from "./fileareas-copy";
import { placesExport, type StreetFile } from "./filestreets";
import { button, esc } from "./html";
import { LIMITS } from "./model";
import { csvHref } from "./notes-csv";
import { textExportHref } from "./textexport";

export interface FileAreasContext {
  readonly text: string;
  readonly error: ImportError | "no-notes" | undefined;
  readonly file: StreetFile | undefined;
  /** The options as on the form. */
  readonly form: AreaOptions;
  /** No detail is ticked when the areas are asked for. */
  readonly noKeys: boolean;
  /** The areas for the last options without a problem; undefined before they are shown. */
  readonly report: AreaReport | undefined;
  /** The key of the area whose places are listed ("" for places with no area), or undefined. */
  readonly openArea: string | undefined;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const AREAS_TEXT_ID = "far-text";
export const AREAS_OPEN_ID = "far-open";
export const HIDE_FULL_ID = "far-hide-full";
export const PLACES_TITLE_ID = "far-places-title";

const FIELD_STYLE = 'style="min-height:44px"';
const CHOICE_STYLE = 'style="min-height:44px;min-width:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

export const byId = (b: string): string => `far-by-${b}`;
export const keyBoxId = (k: FactKey): string => `far-key-${k}`;
export const orderId = (o: string): string => `far-order-${o}`;
/** The id of an area's "Show the places" button; "" is the group with no area. */
export const showId = (key: string): string => `far-show-${key === "" ? "none" : key.replace(/[^A-Za-z0-9]+/g, "-")}`;

function link(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

function choice(type: "radio" | "checkbox", id: string, name: string, value: string, checked: boolean, label: string): string {
  return `<label class="choice" for="${id}" ${CHOICE_STYLE}><input type="${type}" id="${id}" name="${name}" value="${esc(value)}"${checked ? " checked" : ""}>${esc(label)}</label>`;
}

export function renderOptions(ctx: FileAreasContext): string {
  const l = ctx.locale;
  const f = ctx.form;
  return (
    `<form id="far-options-form" novalidate><h3 id="far-options" tabindex="-1">${esc(t(C.optionsTitle, l))}</h3>` +
    `<fieldset><legend>${esc(t(C.byLegend, l))}</legend>${AREA_BYS.map((b) => choice("radio", byId(b), "by", b, f.by === b, byText(b, l))).join("")}</fieldset>` +
    `<fieldset${ctx.noKeys ? ' aria-describedby="e-far-keys"' : ""}><legend>${esc(t(C.keysLegend, l))}</legend>` +
    (ctx.noKeys ? `<p id="e-far-keys" class="error">${esc(t(C.noKeys, l))}</p>` : "") +
    FACT_KEYS.map((k) => choice("checkbox", keyBoxId(k), "key", k, f.keys.includes(k), t(COPY.facts[k], l))).join("") +
    `</fieldset>` +
    `<fieldset><legend>${esc(t(C.orderLegend, l))}</legend>${AREA_ORDERS.map((o) => choice("radio", orderId(o), "order", o, f.order === o, orderText(o, l))).join("")}</fieldset>` +
    `<p>${choice("checkbox", HIDE_FULL_ID, "hideFull", "yes", f.hideFull, t(C.hideFull, l))}</p>` +
    `<p>${button(t(C.show, l), { type: "submit", "data-action": "far-show" })}</p></form>`
  );
}

/** The areas as a table: a row for each area, with its places, gaps, each chosen detail and a download of its notes. */
export function renderTable(r: AreaReport, ctx: FileAreasContext): string {
  const l = ctx.locale;
  const head = [t(C.colArea, l), t(C.colPlaces, l), t(C.colGaps, l), ...r.keys.map((k) => t(COPY.facts[k], l)), t(C.colNotes, l)]
    .map((h) => `<th scope="col">${esc(h)}</th>`)
    .join("");
  const rows = r.rows
    .map(
      (a) =>
        `<tr><th scope="row"><span data-user-content>${esc(areaName(a, l))}</span></th><td>${a.places.length}</td><td>${a.gaps}</td>` +
        r.keys.map((k) => `<td>${esc(cellText(a.counts[k], l))}</td>`).join("") +
        `<td>${link(exportHref(placesExport(a.places, ctx.today)), areasFilename("notes", ctx.today, l, a), areaLinkLabel(a, l))} ` +
        `${button(showPlacesLabel(a, l), { id: showId(a.key), "data-action": "far-places", "data-area": a.key, "aria-expanded": String(ctx.openArea === a.key) })}</td></tr>`,
    )
    .join("");
  return `<table id="far-table"><caption>${esc(t(C.tableCaption, l))}</caption><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

export function renderResults(ctx: FileAreasContext, r: AreaReport): string {
  const l = ctx.locale;
  return (
    `<h3 id="far-results" tabindex="-1">${esc(`${t(C.resultsTitle, l)} — ${byText(r.by, l)}`)}</h3>` +
    `<p id="far-summary">${esc(reportSummary(r, l))}</p>` +
    `<p>${link(csvHref(areaCsv(r, t(C.noArea, l))), areasFilename("csv", ctx.today, l), t(C.downloadCsv, l))} ` +
    `${link(textExportHref(areasText(r, ctx.today, l)), areasFilename("text", ctx.today, l), t(C.downloadText, l))}</p>` +
    (r.rows.length === 0
      ? `<p id="far-no-rows">${esc(t(C.noRows, l))}</p>`
      : `<p class="hint">${esc(t(C.notesHint, l))}</p>${renderTable(r, ctx)}`) +
    (ctx.openArea !== undefined ? renderPlaces(r, ctx.openArea, l) : "")
  );
}

/** The places in one area, each with what it has no record for among the chosen details. */
export function renderPlaces(r: AreaReport, key: string, l: Locale): string {
  const a: AreaRow | undefined = findArea(r, key);
  if (!a) return "";
  const items = placeGaps(a, r.keys)
    .map(
      (g) =>
        `<li><h4><span data-user-content>${esc(g.place.name)}</span></h4>` +
        `<p>${g.place.address ? `<span data-user-content>${esc(g.place.address)}</span>` : esc(t(C.noAddress, l))}</p>` +
        `<ul class="far-gaps">${placeGapLines(g, l)
          .map((line) => `<li>${esc(line)}</li>`)
          .join("")}</ul></li>`,
    )
    .join("");
  return (
    `<section id="far-places" aria-labelledby="${PLACES_TITLE_ID}"><h3 id="${PLACES_TITLE_ID}" tabindex="-1"><span data-user-content>${esc(placesTitle(a, l))}</span></h3>` +
    `<p class="hint">${esc(t(C.placesHint, l))}</p><ul class="far-places">${items}</ul>` +
    `<p>${button(t(C.closePlaces, l), { "data-action": "far-close-places", class: "secondary" })}</p></section>`
  );
}

export function renderFileAreas(ctx: FileAreasContext): string {
  const l = ctx.locale;
  const err = ctx.error;
  const errors = [
    ...(err ? [`<li><a href="#${AREAS_TEXT_ID}">${esc(areasErrorText(err, l))}</a></li>`] : []),
    ...(ctx.noKeys ? [`<li><a href="#${keyBoxId(FACT_KEYS[0] ?? "step-free-entry")}">${esc(t(C.noKeys, l))}</a></li>`] : []),
  ];
  return (
    `<div class="app fileareas-app" lang="${l}"><section lang="${l}" aria-labelledby="far-title" class="fileareas">` +
    `<h2 id="far-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.rule, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="far-status">${esc(ctx.statusMessage)}</p>` : "") +
    (errors.length > 0 ? `<div id="far-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${errors.join("")}</ul></div>` : "") +
    `<form id="far-file-form" novalidate>` +
    `<label for="${AREAS_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${AREAS_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${AREAS_TEXT_ID}" class="error">${esc(areasErrorText(err, l))}</p>` : "") +
    `<textarea id="${AREAS_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${AREAS_TEXT_ID}${err ? ` e-${AREAS_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${AREAS_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${AREAS_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "far-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "far-clear", class: "secondary" })}</p>` +
    (ctx.file ? renderOptions(ctx) : "") +
    (ctx.file && ctx.report ? renderResults(ctx, ctx.report) : "") +
    `</section></div>`
  );
}

/** The options as on the form. */
export function readOptions(root: ParentNode): AreaOptions {
  const checked = (name: string): string => root.querySelector<HTMLInputElement>(`#far-options-form input[name="${name}"]:checked`)?.value ?? "";
  const by = checked("by");
  const order = checked("order");
  return {
    by: by === "street" ? "street" : "postal",
    keys: FACT_KEYS.filter((k) => root.querySelector<HTMLInputElement>(`#${keyBoxId(k)}`)?.checked),
    order: order === "name" ? "name" : "gaps",
    hideFull: root.querySelector<HTMLInputElement>(`#${HIDE_FULL_ID}`)?.checked ?? false,
  };
}
