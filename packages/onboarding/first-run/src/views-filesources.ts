import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t } from "./copy";
import { exportHref, type ImportError } from "./exchange";
import { FACT_KEYS, type FactKey } from "./facts";
import {
  FILE_SOURCES_COPY as C,
  aloneLine,
  aloneTitle,
  daysText,
  orderText,
  overlapLine,
  overlapSummary,
  reportSummary,
  showAloneLabel,
  sourceLabel,
  sourcesErrorText,
  sourcesFilename,
  sourcesText,
} from "./filesources-copy";
import { placesExport, type StreetFile } from "./filestreets";
import { button, esc } from "./html";
import { LIMITS } from "./model";
import { csvHref } from "./notes-csv";
import { SOURCE_ORDERS, aloneAnswers, placesOfAnswers, sourceCsv, type Overlap, type SourceOptions, type SourceReport } from "./sourcecover";
import { textExportHref } from "./textexport";

export interface FileSourcesContext {
  readonly text: string;
  readonly error: ImportError | "no-notes" | undefined;
  readonly file: StreetFile | undefined;
  /** The options as on the form. */
  readonly form: SourceOptions;
  /** No detail is ticked when the sources are asked for. */
  readonly noKeys: boolean;
  /** The sources for the last options without a problem; undefined before they are shown. */
  readonly report: SourceReport | undefined;
  /** The source whose answers resting on it alone are listed, or undefined. */
  readonly openSource: string | undefined;
  /** The two sources chosen to compare, as on the form. */
  readonly pair: readonly [string, string] | undefined;
  /** The same source was chosen twice. */
  readonly sameSource: boolean;
  /** The comparison of the last two different sources chosen. */
  readonly overlap: { readonly a: string; readonly b: string; readonly result: Overlap } | undefined;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const SOURCES_TEXT_ID = "fsr-text";
export const SOURCES_OPEN_ID = "fsr-open";
export const ALONE_TITLE_ID = "fsr-alone-title";
export const FIRST_ID = "fsr-first";
export const SECOND_ID = "fsr-second";

const FIELD_STYLE = 'style="min-height:44px"';
const CHOICE_STYLE = 'style="min-height:44px;min-width:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

export const keyBoxId = (k: FactKey): string => `fsr-key-${k}`;
export const orderId = (o: string): string => `fsr-order-${o}`;
/** The id of a source's "Show the answers" button, from its position in the table. */
export const showId = (i: number): string => `fsr-show-${i}`;

function link(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

function choice(type: "radio" | "checkbox", id: string, name: string, value: string, checked: boolean, label: string): string {
  return `<label class="choice" for="${id}" ${CHOICE_STYLE}><input type="${type}" id="${id}" name="${name}" value="${esc(value)}"${checked ? " checked" : ""}>${esc(label)}</label>`;
}

export function renderOptions(ctx: FileSourcesContext): string {
  const l = ctx.locale;
  const f = ctx.form;
  return (
    `<form id="fsr-options-form" novalidate><h3 id="fsr-options">${esc(t(C.optionsTitle, l))}</h3>` +
    `<fieldset${ctx.noKeys ? ' aria-describedby="e-fsr-keys"' : ""}><legend>${esc(t(C.keysLegend, l))}</legend>` +
    (ctx.noKeys ? `<p id="e-fsr-keys" class="error">${esc(t(C.noKeys, l))}</p>` : "") +
    FACT_KEYS.map((k) => choice("checkbox", keyBoxId(k), "key", k, f.keys.includes(k), t(COPY.facts[k], l))).join("") +
    `</fieldset>` +
    `<fieldset><legend>${esc(t(C.orderLegend, l))}</legend>${SOURCE_ORDERS.map((o) => choice("radio", orderId(o), "order", o, f.order === o, orderText(o, l))).join("")}</fieldset>` +
    `<p>${button(t(C.show, l), { type: "submit", "data-action": "fsr-show" })}</p></form>`
  );
}

/** The sources as a table: a row for each source with a row header, and a button for the answers resting on it alone. */
export function renderTable(r: SourceReport, ctx: FileSourcesContext): string {
  const l = ctx.locale;
  const head = [t(C.colSource, l), t(C.colRecords, l), t(C.colPlaces, l), t(C.colShown, l), t(C.colAlone, l), t(C.colDays, l), t(C.colLicences, l), t(C.colList, l)]
    .map((h) => `<th scope="col">${esc(h)}</th>`)
    .join("");
  const rows = r.rows
    .map(
      (s, i) =>
        `<tr><th scope="row"><span data-user-content>${esc(sourceLabel(s.source, l))}</span></th><td>${s.records}</td><td>${s.places}</td><td>${s.shown}</td><td>${s.alone}</td>` +
        `<td>${esc(daysText(s, l))}</td><td><span data-user-content>${esc(s.licences.join(", "))}</span></td>` +
        `<td>${s.alone > 0 ? button(showAloneLabel(s, l), { id: showId(i), "data-action": "fsr-alone", "data-index": String(i), "aria-expanded": String(ctx.openSource === s.source) }) : ""}</td></tr>`,
    )
    .join("");
  return `<table id="fsr-table"><caption>${esc(t(C.tableCaption, l))}</caption><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

/** The answers that rest on one source alone, with a download of the notes of their places. */
export function renderAlone(file: StreetFile, r: SourceReport, source: string, ctx: FileSourcesContext): string {
  const l = ctx.locale;
  const answers = aloneAnswers(file, source, r.keys, l);
  if (answers.length === 0) return "";
  const places = placesOfAnswers(answers);
  const items = places
    .map((p) => {
      const lines = answers.filter((a) => a.place.id === p.id).map((a) => `<li>${esc(aloneLine(a, l))}</li>`);
      return `<li><h4><span data-user-content>${esc(p.name)}</span></h4><p>${p.address ? `<span data-user-content>${esc(p.address)}</span>` : esc(t(C.noAddress, l))}</p><ul>${lines.join("")}</ul></li>`;
    })
    .join("");
  return (
    `<section id="fsr-alone" aria-labelledby="${ALONE_TITLE_ID}"><h3 id="${ALONE_TITLE_ID}" tabindex="-1"><span data-user-content>${esc(aloneTitle(source, answers.length, l))}</span></h3>` +
    `<p class="hint">${esc(t(C.aloneHint, l))}</p><ul class="fsr-alone">${items}</ul>` +
    `<p>${link(exportHref(placesExport(places, ctx.today)), sourcesFilename("notes", ctx.today, l, source), t(C.downloadAlone, l))} ` +
    `${button(t(C.closeAlone, l), { "data-action": "fsr-close", class: "secondary" })}</p></section>`
  );
}

function select(id: string, label: string, sources: readonly string[], chosen: string | undefined, invalid: boolean, l: Locale): string {
  return (
    `<label for="${id}">${esc(label)}</label>` +
    (invalid ? `<p id="e-${id}" class="error">${esc(t(C.sameSource, l))}</p>` : "") +
    `<select id="${id}" name="${id}" aria-describedby="h-fsr-compare${invalid ? ` e-${id}` : ""}"${invalid ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>` +
    sources.map((s) => `<option value="${esc(s)}"${s === chosen ? " selected" : ""}>${esc(sourceLabel(s, l))}</option>`).join("") +
    `</select>`
  );
}

/** Two sources to compare where they answer the same place and detail, and what they give there. */
export function renderCompare(r: SourceReport, ctx: FileSourcesContext): string {
  const l = ctx.locale;
  const names = r.rows.map((s) => s.source);
  const o = ctx.overlap;
  return (
    `<section aria-labelledby="fsr-compare-title"><h3 id="fsr-compare-title">${esc(t(C.compareTitle, l))}</h3>` +
    `<form id="fsr-compare-form" novalidate><p id="h-fsr-compare" class="hint">${esc(t(C.compareHint, l))}</p>` +
    select(FIRST_ID, t(C.firstSource, l), names, ctx.pair?.[0], false, l) +
    select(SECOND_ID, t(C.secondSource, l), names, ctx.pair?.[1], ctx.sameSource, l) +
    `<p>${button(t(C.compare, l), { type: "submit", "data-action": "fsr-compare" })}</p></form>` +
    (o
      ? `<h4 id="fsr-overlap" tabindex="-1"><span data-user-content>${esc(overlapSummary(o.a, o.b, o.result, l))}</span></h4>` +
        (o.result.differ.length > 0
          ? `<ul class="fsr-overlap">${o.result.differ
              .map(
                (d) =>
                  `<li><span data-user-content>${esc(d.place.name)}</span>, ${d.place.address ? `<span data-user-content>${esc(d.place.address)}</span>` : esc(t(C.noAddress, l))}${esc(l === "fr" ? `${NB}: ` : ": ")}<span data-user-content>${esc(overlapLine(d, o.a, o.b, l))}</span></li>`,
              )
              .join("")}</ul>`
          : "")
      : "") +
    `</section>`
  );
}

export function renderResults(ctx: FileSourcesContext, file: StreetFile, r: SourceReport): string {
  const l = ctx.locale;
  const head = `<h3 id="fsr-results" tabindex="-1">${esc(t(C.resultsTitle, l))}</h3><p id="fsr-summary">${esc(reportSummary(r, l))}</p>`;
  if (r.rows.length === 0) return head;
  return (
    head +
    `<p>${link(csvHref(sourceCsv(r)), sourcesFilename("csv", ctx.today, l), t(C.downloadCsv, l))} ` +
    `${link(textExportHref(sourcesText(r, ctx.today, l)), sourcesFilename("text", ctx.today, l), t(C.downloadText, l))}</p>` +
    `<p class="hint">${esc(t(C.shownHint, l))}</p>` +
    renderTable(r, ctx) +
    (ctx.openSource !== undefined ? renderAlone(file, r, ctx.openSource, ctx) : "") +
    (r.rows.length > 1 ? renderCompare(r, ctx) : "")
  );
}

export function renderFileSources(ctx: FileSourcesContext): string {
  const l = ctx.locale;
  const err = ctx.error;
  const errors = [
    ...(err ? [`<li><a href="#${SOURCES_TEXT_ID}">${esc(sourcesErrorText(err, l))}</a></li>`] : []),
    ...(ctx.noKeys ? [`<li><a href="#${keyBoxId(FACT_KEYS[0] ?? "step-free-entry")}">${esc(t(C.noKeys, l))}</a></li>`] : []),
    ...(ctx.sameSource ? [`<li><a href="#${SECOND_ID}">${esc(t(C.sameSource, l))}</a></li>`] : []),
  ];
  return (
    `<div class="app filesources-app" lang="${l}"><section lang="${l}" aria-labelledby="fsr-title" class="filesources">` +
    `<h2 id="fsr-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.rule, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="fsr-status">${esc(ctx.statusMessage)}</p>` : "") +
    (errors.length > 0 ? `<div id="fsr-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${errors.join("")}</ul></div>` : "") +
    `<form id="fsr-file-form" novalidate>` +
    `<label for="${SOURCES_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${SOURCES_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${SOURCES_TEXT_ID}" class="error">${esc(sourcesErrorText(err, l))}</p>` : "") +
    `<textarea id="${SOURCES_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${SOURCES_TEXT_ID}${err ? ` e-${SOURCES_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${SOURCES_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${SOURCES_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "fsr-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "fsr-clear", class: "secondary" })}</p>` +
    (ctx.file ? renderOptions(ctx) : "") +
    (ctx.file && ctx.report ? renderResults(ctx, ctx.file, ctx.report) : "") +
    `</section></div>`
  );
}

/** The options as on the form. */
export function readOptions(root: ParentNode): SourceOptions {
  const order = root.querySelector<HTMLInputElement>('#fsr-options-form input[name="order"]:checked')?.value;
  return {
    keys: FACT_KEYS.filter((k) => root.querySelector<HTMLInputElement>(`#${keyBoxId(k)}`)?.checked),
    order: order === "alone" || order === "name" ? order : "records",
  };
}
