import type { Locale } from "../../switch-first/src/index";
import { COPY, t } from "./copy";
import { exportHref, type ImportError } from "./exchange";
import { FACT_KEYS } from "./facts";
import {
  FILE_GRID_COPY as C,
  badPageText,
  breakdownText,
  captionText,
  cellText,
  gridErrorText,
  gridFilename,
  gridText,
  matchText,
  tickLabel,
  tickedDownloadText,
  orderText,
  pageText,
  shownText,
} from "./filegrid-copy";
import { placesExport, type StreetFile } from "./filestreets";
import { button, esc } from "./html";
import { LIMITS } from "./model";
import { csvHref } from "./notes-csv";
import { GRID_ORDERS, SHOWN, gridCsv, gridRows, pageOf, shownCounts, unknownIn, type GridFilter, type GridRow } from "./answergrid";
import type { FactKey } from "./facts";
import { textExportHref } from "./textexport";

export interface FileGridContext {
  readonly text: string;
  readonly error: ImportError | "no-notes" | undefined;
  readonly file: StreetFile | undefined;
  /** The filter as on the form. */
  readonly filter: GridFilter;
  /** The filter the rows were worked out with; undefined before they are shown. */
  readonly shownFilter: GridFilter | undefined;
  /** The rows for that filter, in order. */
  readonly rows: readonly GridRow[] | undefined;
  /** 1-based page asked for. */
  readonly page: number;
  /** No detail is ticked to show as a column. */
  readonly noColumns: boolean;
  /** The text in the page box, and whether it is a page that exists. */
  readonly gotoText: string;
  readonly badPage: boolean;
  /** Ids of the places ticked in the table. */
  readonly ticked: readonly string[];
  /** Show only the places ticked. */
  readonly onlyTicked: boolean;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const GRID_TEXT_ID = "fgr-text";
export const GRID_OPEN_ID = "fgr-open";
export const FIND_ID = "fgr-find";
export const KEY_ID = "fgr-key";
export const SHOWN_ID = "fgr-shown";
export const GOTO_ID = "fgr-goto";
export const ONLY_TICKED_ID = "fgr-only-ticked";

export const columnId = (k: FactKey): string => `fgr-col-${k}`;
/** The tick box of a place in the table; place ids are already URL-safe. */
export const rowTickId = (placeId: string): string => `fgr-tick-${placeId}`;

const FIELD_STYLE = 'style="min-height:44px"';
const CHOICE_STYLE = 'style="min-height:44px;min-width:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

export const orderId = (o: string): string => `fgr-order-${o}`;

function link(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

export function renderFilter(ctx: FileGridContext): string {
  const l = ctx.locale;
  const f = ctx.filter;
  const option = (value: string, label: string, selected: boolean): string => `<option value="${esc(value)}"${selected ? " selected" : ""}>${esc(label)}</option>`;
  return (
    `<form id="fgr-filter-form" novalidate><h3 id="fgr-filter">${esc(t(C.filterTitle, l))}</h3>` +
    `<label for="${FIND_ID}">${esc(t(C.textLabel, l))}</label>` +
    `<p id="h-${FIND_ID}" class="hint">${esc(t(C.textHint, l))}</p>` +
    `<input id="${FIND_ID}" type="search" name="text" maxlength="${LIMITS.address}" autocomplete="off" value="${esc(f.text)}" aria-describedby="h-${FIND_ID}" ${FIELD_STYLE}>` +
    `<label for="${KEY_ID}">${esc(t(C.keyLabel, l))}</label>` +
    `<select id="${KEY_ID}" name="key" ${FIELD_STYLE}>${option("", t(C.anyKey, l), f.key === "")}${option("any", t(C.anyColumn, l), f.key === "any")}${FACT_KEYS.map((k) => option(k, t(COPY.facts[k], l), f.key === k)).join("")}</select>` +
    `<label for="${SHOWN_ID}">${esc(t(C.shownLabel, l))}</label>` +
    `<select id="${SHOWN_ID}" name="shown" ${FIELD_STYLE}>${SHOWN.map((s) => option(s, shownText(s, l), f.shown === s)).join("")}</select>` +
    `<fieldset${ctx.noColumns ? ' aria-describedby="e-fgr-columns"' : ""}><legend>${esc(t(C.columnsLegend, l))}</legend>` +
    (ctx.noColumns ? `<p id="e-fgr-columns" class="error">${esc(t(C.noColumns, l))}</p>` : "") +
    FACT_KEYS.map(
      (k) =>
        `<label class="choice" for="${columnId(k)}" ${CHOICE_STYLE}><input type="checkbox" id="${columnId(k)}" name="column" value="${k}"${f.columns.includes(k) ? " checked" : ""}>${esc(t(COPY.facts[k], l))}</label>`,
    ).join("") +
    `</fieldset>` +
    (ctx.ticked.length > 0 || ctx.onlyTicked
      ? `<p><label class="choice" for="${ONLY_TICKED_ID}" ${CHOICE_STYLE}><input type="checkbox" id="${ONLY_TICKED_ID}" name="onlyTicked" value="yes"${ctx.onlyTicked ? " checked" : ""}>${esc(t(C.onlyTicked, l))}</label></p>`
      : "") +
    `<fieldset><legend>${esc(t(C.orderLegend, l))}</legend>` +
    GRID_ORDERS.map(
      (o) =>
        `<label class="choice" for="${orderId(o)}" ${CHOICE_STYLE}><input type="radio" id="${orderId(o)}" name="order" value="${o}"${f.order === o ? " checked" : ""}>${esc(orderText(o, l))}</label>`,
    ).join("") +
    `</fieldset><p>${button(t(C.show, l), { type: "submit", "data-action": "fgr-show" })}</p></form>`
  );
}

/** The page box: a number from 1 to the number of pages, with its problem when it is not one. */
function renderGoto(pages: number, text: string, bad: boolean, l: Locale): string {
  return (
    `<form id="fgr-goto-form" novalidate><label for="${GOTO_ID}">${esc(t(C.gotoLabel, l))}</label>` +
    (bad ? `<p id="e-${GOTO_ID}" class="error">${esc(badPageText(pages, l))}</p>` : "") +
    `<input id="${GOTO_ID}" type="text" inputmode="numeric" name="page" autocomplete="off" maxlength="6" value="${esc(text)}"${bad ? ` aria-invalid="true" aria-describedby="e-${GOTO_ID}"` : ""} ${FIELD_STYLE}> ` +
    `${button(t(C.go, l), { type: "submit", "data-action": "fgr-goto" })}</form>`
  );
}

/** One page of rows as a table: a row header for each place and a column for each detail shown. */
export function renderTable(
  rows: readonly GridRow[],
  page: number,
  l: Locale,
  columns: readonly FactKey[] = FACT_KEYS,
  goto = { text: "", bad: false },
  ticked: readonly string[] = [],
): string {
  const p = pageOf(rows, page);
  if (p.total === 0) return `<p id="fgr-none">${esc(t(C.noRows, l))}</p>`;
  const keys = FACT_KEYS.filter((k) => columns.includes(k));
  const head = [t(C.colPlace, l), ...keys.map((k) => t(COPY.facts[k], l)), t(C.colUnknown, l)].map((h) => `<th scope="col">${esc(h)}</th>`).join("");
  const body = p.rows
    .map(
      (r) =>
        `<tr><th scope="row"><label class="choice" for="${rowTickId(r.place.id)}" ${CHOICE_STYLE}><input type="checkbox" id="${rowTickId(r.place.id)}" value="${esc(r.place.id)}" data-action="fgr-tick" aria-label="${esc(tickLabel(r.place.name, r.place.address, l))}"${ticked.includes(r.place.id) ? " checked" : ""}>` +
        `<span data-user-content>${esc(r.place.name)}</span></label>${r.place.address ? `<span data-user-content>${esc(r.place.address)}</span>` : esc(t(C.noAddress, l))}</th>` +
        keys.map((k) => `<td>${esc(cellText(r.cells[k], l))}</td>`).join("") +
        `<td>${unknownIn(r, keys)}</td></tr>`,
    )
    .join("");
  const pager =
    p.pages > 1
      ? `<nav aria-label="${esc(t(C.pagesLabel, l))}"><p id="fgr-page" tabindex="-1">${esc(pageText(p, l))}</p><p>` +
        `${button(t(C.prev, l), { "data-action": "fgr-prev", ...(p.page === 1 ? { disabled: "" } : {}) })} ` +
        `${button(t(C.next, l), { "data-action": "fgr-next", ...(p.page === p.pages ? { disabled: "" } : {}) })}</p>` +
        renderGoto(p.pages, goto.text, goto.bad, l) +
        `</nav>`
      : "";
  return `<table id="fgr-table"><caption>${esc(captionText(p, l))}</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>${pager}`;
}

/** For each detail, how many of the places matching the name or address show each answer. */
export function renderBreakdown(rows: readonly GridRow[], l: Locale, columns: readonly FactKey[] = FACT_KEYS): string {
  const keys = FACT_KEYS.filter((k) => columns.includes(k));
  return `<h4>${esc(t(C.breakdownTitle, l))}</h4><ul class="fgr-breakdown">${keys.map((k) => `<li>${esc(breakdownText(k, shownCounts(rows, k), l))}</li>`).join("")}</ul>`;
}

/** The notes of the places ticked, with a button to untick them all; nothing when none is ticked. */
export function renderTicked(file: StreetFile, ticked: readonly string[], today: Date, l: Locale): string {
  const places = file.places.filter((p) => ticked.includes(p.id));
  if (places.length === 0) return `<p class="hint" id="fgr-ticked">${esc(t(C.tickedHint, l))}</p>`;
  return (
    `<p id="fgr-ticked">${link(exportHref(placesExport(places, today)), gridFilename("notes", places.length, today, l), tickedDownloadText(places.length, l))} ` +
    `${button(t(C.untickAll, l), { "data-action": "fgr-untick-all", class: "secondary" })}</p>`
  );
}

export function renderResults(ctx: FileGridContext, file: StreetFile, rows: readonly GridRow[], f: GridFilter): string {
  const l = ctx.locale;
  const places = rows.map((r) => r.place);
  return (
    `<h3 id="fgr-results" tabindex="-1">${esc(t(C.resultsTitle, l))}</h3><p id="fgr-summary">${esc(matchText(rows.length, l))}</p>` +
    (rows.length > 0
      ? `<p>${link(csvHref(gridCsv(rows, f.columns)), gridFilename("csv", rows.length, ctx.today, l), t(C.downloadCsv, l))} ` +
        `${link(textExportHref(gridText(rows, FACT_KEYS.filter((k) => f.columns.includes(k)), ctx.today, l)), gridFilename("text", rows.length, ctx.today, l), t(C.downloadText, l))} ` +
        `${link(exportHref(placesExport(places, ctx.today)), gridFilename("notes", rows.length, ctx.today, l), t(C.downloadNotes, l))}</p>`
      : "") +
    renderBreakdown(gridRows(file, { ...f, key: "" }, l, ctx.onlyTicked ? new Set(ctx.ticked) : undefined), l, f.columns) +
    (rows.length > 0 ? renderTicked(file, ctx.ticked, ctx.today, l) : "") +
    renderTable(rows, ctx.page, l, f.columns, { text: ctx.gotoText, bad: ctx.badPage }, ctx.ticked)
  );
}

export function renderFileGrid(ctx: FileGridContext): string {
  const l = ctx.locale;
  const err = ctx.error;
  const pages = ctx.rows ? pageOf(ctx.rows, ctx.page).pages : 1;
  const errors = [
    ...(err ? [`<li><a href="#${GRID_TEXT_ID}">${esc(gridErrorText(err, l))}</a></li>`] : []),
    ...(ctx.noColumns ? [`<li><a href="#${columnId(FACT_KEYS[0] ?? "step-free-entry")}">${esc(t(C.noColumns, l))}</a></li>`] : []),
    ...(ctx.badPage ? [`<li><a href="#${GOTO_ID}">${esc(badPageText(pages, l))}</a></li>`] : []),
  ];
  return (
    `<div class="app filegrid-app" lang="${l}"><section lang="${l}" aria-labelledby="fgr-title" class="filegrid">` +
    `<h2 id="fgr-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.rule, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="fgr-status">${esc(ctx.statusMessage)}</p>` : "") +
    (errors.length > 0 ? `<div id="fgr-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${errors.join("")}</ul></div>` : "") +
    `<form id="fgr-file-form" novalidate>` +
    `<label for="${GRID_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${GRID_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${GRID_TEXT_ID}" class="error">${esc(gridErrorText(err, l))}</p>` : "") +
    `<textarea id="${GRID_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${GRID_TEXT_ID}${err ? ` e-${GRID_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${GRID_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${GRID_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "fgr-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "fgr-clear", class: "secondary" })}</p>` +
    (ctx.file ? renderFilter(ctx) : "") +
    (ctx.file && ctx.rows && ctx.shownFilter ? renderResults(ctx, ctx.file, ctx.rows, ctx.shownFilter) : "") +
    `</section></div>`
  );
}

/** The filter as on the form. */
export function readFilter(root: ParentNode): GridFilter {
  const key = root.querySelector<HTMLSelectElement>(`#${KEY_ID}`)?.value ?? "";
  const shown = root.querySelector<HTMLSelectElement>(`#${SHOWN_ID}`)?.value ?? "";
  const order = root.querySelector<HTMLInputElement>('#fgr-filter-form input[name="order"]:checked')?.value ?? "";
  return {
    text: root.querySelector<HTMLInputElement>(`#${FIND_ID}`)?.value ?? "",
    key: key === "any" || (FACT_KEYS as readonly string[]).includes(key) ? (key as GridFilter["key"]) : "",
    shown: (SHOWN as readonly string[]).includes(shown) ? (shown as GridFilter["shown"]) : "unknown",
    order: order === "unknown" || order === "newest" ? order : "name",
    columns: FACT_KEYS.filter((k) => root.querySelector<HTMLInputElement>(`#${columnId(k)}`)?.checked),
  };
}
