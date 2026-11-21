import type { Locale } from "../../switch-first/src/index";
import { COPY, t } from "./copy";
import { exportHref, type ImportError } from "./exchange";
import { FACT_KEYS, type FactKey } from "./facts";
import {
  FILE_FIRST_COPY as C,
  firstErrorText,
  firstFilename,
  newestText,
  orderText,
  problemText,
  rankedSummary,
  rankingText,
  reasonLines,
  streetLine,
  streetsSummary,
  streetsText,
  viewText,
} from "./filefirst-copy";
import type { StreetFile } from "./filestreets";
import { button, esc } from "./html";
import {
  FIRST_LIMITS,
  FIRST_ORDERS,
  FIRST_VIEWS,
  firstCsv,
  firstNotesFile,
  isFirstOrder,
  isFirstView,
  pickFirst,
  pickStreets,
  rankPlaces,
  rankStreets,
  streetsCsv,
  streetsNotesFile,
  type FirstField,
  type FirstForm,
  type FirstOptions,
  type FirstProblem,
  type PlaceNeeds,
  type Ranked,
  type StreetNeeds,
} from "./lookfirst";
import { LIMITS } from "./model";
import { csvHref } from "./notes-csv";
import { textExportHref } from "./textexport";

export interface FileFirstContext {
  readonly text: string;
  readonly error: ImportError | "no-notes" | undefined;
  readonly file: StreetFile | undefined;
  /** The options of the ranking on screen: the last ones that were valid. */
  readonly options: FirstOptions;
  /** The form as typed, kept when something in it is wrong. */
  readonly form: FirstForm;
  readonly problems: readonly FirstProblem[];
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const FIRST_TEXT_ID = "ffl-text";
export const FIRST_OPEN_ID = "ffl-open";
export const OLD_ID = "ffl-old";
export const AREA_ID = "ffl-area";
export const COUNT_ID = "ffl-count";

const FIELD_STYLE = 'style="min-height:44px"';
const CHOICE_STYLE = 'style="min-height:44px;min-width:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

export function orderId(o: string): string {
  return `ffl-order-${o}`;
}

export function viewId(v: string): string {
  return `ffl-view-${v}`;
}

export function keyId(k: FactKey): string {
  return `ffl-key-${k}`;
}

/** Where a problem with a field sends focus: the field, or the first detail. */
export function fieldId(f: FirstField): string {
  return f === "keys" ? keyId(FACT_KEYS[0] as FactKey) : f === "area" ? AREA_ID : COUNT_ID;
}

function link(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

function errorFor(ctx: FileFirstContext, f: FirstField, id: string, hint: boolean): { attrs: string; text: string } {
  const codes = ctx.problems.filter((p) => p.field === f).map((p) => p.code);
  const ids = [hint ? `h-${id}` : undefined, codes.length > 0 ? `e-${id}` : undefined].filter((x): x is string => x !== undefined);
  return {
    attrs: (ids.length > 0 ? ` aria-describedby="${ids.join(" ")}"` : "") + (codes.length > 0 ? ' aria-invalid="true"' : ""),
    text: codes.length > 0 ? `<p id="e-${id}" class="error">${codes.map((c) => esc(problemText(c, ctx.locale))).join(" ")}</p>` : "",
  };
}

export function renderFirstForm(ctx: FileFirstContext): string {
  const l = ctx.locale;
  const f = ctx.form;
  const views = FIRST_VIEWS.map(
    (v) =>
      `<label class="choice" for="${viewId(v)}" ${CHOICE_STYLE}><input type="radio" id="${viewId(v)}" name="view" value="${v}"${f.view === v ? " checked" : ""}>${esc(viewText(v, l))}</label>`,
  ).join("");
  const radios = FIRST_ORDERS.map(
    (o) =>
      `<label class="choice" for="${orderId(o)}" ${CHOICE_STYLE}><input type="radio" id="${orderId(o)}" name="order" value="${o}"${f.order === o ? " checked" : ""}>${esc(orderText(o, l))}</label>`,
  ).join("");
  const keyProblems = ctx.problems.filter((p) => p.field === "keys");
  const keys = FACT_KEYS.map(
    (k) =>
      `<label class="choice" for="${keyId(k)}" ${CHOICE_STYLE}><input type="checkbox" id="${keyId(k)}" name="key" value="${k}"${f.keys.includes(k) ? " checked" : ""}>${esc(t(COPY.facts[k], l))}</label>`,
  ).join("");
  const area = errorFor(ctx, "area", AREA_ID, true);
  const count = errorFor(ctx, "count", COUNT_ID, false);
  return (
    `<h3 id="ffl-options">${esc(t(C.optionsTitle, l))}</h3>` +
    `<form id="ffl-options-form" novalidate>` +
    `<fieldset><legend>${esc(t(C.viewLegend, l))}</legend>${views}</fieldset>` +
    `<fieldset><legend>${esc(t(C.orderLegend, l))}</legend>${radios}</fieldset>` +
    `<fieldset><legend>${esc(t(C.keysLegend, l))}</legend>` +
    (keyProblems.length > 0 ? `<p id="e-ffl-keys" class="error">${esc(problemText("keys", l))}</p>` : "") +
    `${keys}</fieldset>` +
    `<p><label class="choice" for="${OLD_ID}" ${CHOICE_STYLE}><input type="checkbox" id="${OLD_ID}" name="old"${f.includeOld ? " checked" : ""}>${esc(t(C.includeOld, l))}</label></p>` +
    `<label for="${AREA_ID}">${esc(t(C.areaLabel, l))}</label><p id="h-${AREA_ID}" class="hint">${esc(t(C.areaHint, l))}</p>${area.text}` +
    `<input id="${AREA_ID}" name="area" type="text" autocomplete="off" maxlength="${FIRST_LIMITS.area + 20}" value="${esc(f.area)}"${area.attrs} ${FIELD_STYLE}>` +
    `<label for="${COUNT_ID}">${esc(t(C.countLabel, l))}</label>${count.text}` +
    `<input id="${COUNT_ID}" name="count" type="text" inputmode="numeric" autocomplete="off" maxlength="3" value="${esc(f.count)}"${count.attrs} ${FIELD_STYLE}>` +
    `<p>${button(t(C.update, l), { type: "submit", "data-action": "ffl-update" })}</p></form>`
  );
}

export function renderNeeds(n: PlaceNeeds, index: number, l: Locale): string {
  const reasons = reasonLines(n, l)
    .map((r) => `<li>${esc(r)}</li>`)
    .join("");
  return (
    `<li data-place="${esc(n.place.id)}"><h4 id="ffl-place-${index}"><span data-user-content>${esc(n.place.name)}</span></h4>` +
    `<p><span data-user-content>${esc(n.place.address ?? t(C.noAddress, l))}</span></p>` +
    `<ul class="ffl-reasons">${reasons}</ul><p class="hint">${esc(newestText(n, l))}</p></li>`
  );
}

export function renderStreet(s: StreetNeeds, index: number, l: Locale): string {
  const places = s.places.map((n) => `<li><span data-user-content>${esc(n.place.name)}</span>, <span data-user-content>${esc(n.place.address ?? "")}</span></li>`).join("");
  return (
    `<li data-street="${esc(s.key)}"><h4 id="ffl-street-${index}"><span data-user-content>${esc(s.name)}</span></h4>` +
    `<p>${esc(streetLine(s, l))}</p><ul class="ffl-street-places">${places}</ul></li>`
  );
}

/** The streets view: the first streets with what is open on each, then the places with no street. */
export function renderStreets(ctx: FileFirstContext, ranked: Ranked): string {
  const l = ctx.locale;
  const s = rankStreets(ranked, l);
  const picked = pickStreets(s, ctx.options.count);
  const summary = streetsSummary(s, picked.length, l);
  const downloads =
    picked.length === 0
      ? ""
      : `<p>${link(exportHref(streetsNotesFile(picked, ctx.today)), firstFilename("street-notes", picked.length, ctx.today, l), t(C.downloadStreetNotes, l))}</p>` +
        `<p>${link(csvHref(streetsCsv(picked)), firstFilename("streets-csv", picked.length, ctx.today, l), t(C.downloadStreetsCsv, l))}</p>` +
        `<p>${link(textExportHref(streetsText(s, picked, summary, l, ctx.today)), firstFilename("streets-text", picked.length, ctx.today, l), t(C.downloadText, l))}</p>` +
        `<p class="hint">${esc(t(C.nextHint, l))}</p>`;
  const noStreet =
    s.noStreet.length === 0
      ? ""
      : `<h3 id="ffl-no-street">${esc(`${t(C.noStreetTitle, l)} (${s.noStreet.length})`)}</h3><p class="hint">${esc(t(C.noStreetHint, l))}</p>` +
        `<ul class="ffl-no-street">${s.noStreet.map((n) => `<li><span data-user-content>${esc(n.place.name)}</span>, <span data-user-content>${esc(n.place.address ?? t(C.noAddress, l))}</span></li>`).join("")}</ul>`;
  return (
    `<p id="ffl-summary" tabindex="-1">${esc(summary)}</p>` +
    renderFirstForm(ctx) +
    downloads +
    `<h3 id="ffl-list" tabindex="-1">${esc(`${t(C.streetsTitle, l)} (${picked.length})`)}</h3>` +
    (picked.length === 0 ? "" : `<ol class="ffl-streets">${picked.map((x, i) => renderStreet(x, i, l)).join("")}</ol>`) +
    noStreet
  );
}

export function renderRanking(ctx: FileFirstContext, file: StreetFile): string {
  const l = ctx.locale;
  const o = ctx.options;
  const ranked = rankPlaces(file, o, ctx.today, l);
  if (o.view === "streets") return renderStreets(ctx, ranked);
  const picked = pickFirst(ranked, o.count);
  const summary = rankedSummary(ranked, picked.length, o.area, l);
  const downloads =
    picked.length === 0
      ? ""
      : `<p>${link(exportHref(firstNotesFile(picked, ctx.today)), firstFilename("notes", picked.length, ctx.today, l), t(C.downloadNotes, l))}</p>` +
        `<p>${link(csvHref(firstCsv(picked)), firstFilename("csv", picked.length, ctx.today, l), t(C.downloadCsv, l))}</p>` +
        `<p>${link(textExportHref(rankingText(picked, summary, l, ctx.today)), firstFilename("text", picked.length, ctx.today, l), t(C.downloadText, l))}</p>` +
        `<p class="hint">${esc(t(C.nextHint, l))}</p>`;
  return (
    `<p id="ffl-summary" tabindex="-1">${esc(summary)}</p>` +
    renderFirstForm(ctx) +
    downloads +
    `<h3 id="ffl-list" tabindex="-1">${esc(`${t(C.listTitle, l)} (${picked.length})`)}</h3>` +
    (o.includeOld ? `<p class="hint">${esc(t(C.oldNote, l))}</p>` : "") +
    (picked.length === 0 ? "" : `<ol class="ffl-places">${picked.map((n, i) => renderNeeds(n, i, l)).join("")}</ol>`)
  );
}

export function renderFileFirst(ctx: FileFirstContext): string {
  const l = ctx.locale;
  const err = ctx.error;
  const errors = [
    ...(err ? [`<li><a href="#${FIRST_TEXT_ID}">${esc(firstErrorText(err, l))}</a></li>`] : []),
    ...ctx.problems.map((p) => `<li><a href="#${fieldId(p.field)}">${esc(problemText(p.code, l))}</a></li>`),
  ];
  return (
    `<div class="app filefirst-app" lang="${l}"><section lang="${l}" aria-labelledby="ffl-title" class="filefirst">` +
    `<h2 id="ffl-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="ffl-status">${esc(ctx.statusMessage)}</p>` : "") +
    (errors.length > 0 ? `<div id="ffl-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${errors.join("")}</ul></div>` : "") +
    `<form id="ffl-file-form" novalidate>` +
    `<label for="${FIRST_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${FIRST_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${FIRST_TEXT_ID}" class="error">${esc(firstErrorText(err, l))}</p>` : "") +
    `<textarea id="${FIRST_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${FIRST_TEXT_ID}${err ? ` e-${FIRST_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${FIRST_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${FIRST_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "ffl-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "ffl-clear", class: "secondary" })}</p>` +
    (ctx.file ? renderRanking(ctx, ctx.file) : "") +
    `</section></div>`
  );
}

/** Reads the form's current values from the page. */
export function readFirstForm(root: ParentNode, fallback: FirstForm): FirstForm {
  const view = root.querySelector<HTMLInputElement>('input[name="view"]:checked')?.value;
  const order = root.querySelector<HTMLInputElement>('input[name="order"]:checked')?.value;
  const boxes = Array.from(root.querySelectorAll<HTMLInputElement>('input[name="key"]'));
  return {
    view: isFirstView(view) ? view : fallback.view,
    order: isFirstOrder(order) ? order : fallback.order,
    keys: boxes.length === 0 ? fallback.keys : FACT_KEYS.filter((k) => boxes.some((b) => b.checked && b.value === k)),
    includeOld: root.querySelector<HTMLInputElement>(`#${OLD_ID}`)?.checked ?? fallback.includeOld,
    area: root.querySelector<HTMLInputElement>(`#${AREA_ID}`)?.value ?? fallback.area,
    count: root.querySelector<HTMLInputElement>(`#${COUNT_ID}`)?.value ?? fallback.count,
  };
}
