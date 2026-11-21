import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t } from "./copy";
import { BACKINGS, SINGLE_MODES, differCsv, differNotesFile, fileSingle, hasDifferences, isSingleMode, singleCsv, singleNotesFile, type SingleMode, type SingleReport } from "./corroboration";
import { exportHref, type ImportError } from "./exchange";
import { FACT_KEYS, type FactKey } from "./facts";
import {
  FILE_SINGLE_COPY as C,
  backingText,
  detailText,
  differHeading,
  differenceText,
  keysText,
  modeText,
  singleErrorText,
  singleFilename,
  singleSummary,
  singleText,
} from "./filesingle-copy";
import type { StreetFile } from "./filestreets";
import { button, esc } from "./html";
import { FIRST_LIMITS } from "./lookfirst";
import { LIMITS } from "./model";
import { csvHref } from "./notes-csv";
import { sourceName } from "./sources";
import { textExportHref } from "./textexport";

/** What the results on screen were made with. */
export interface SingleChoice {
  readonly mode: SingleMode;
  readonly area: string;
  /** The details to consider, in the App's order. */
  readonly keys: readonly FactKey[];
}

export interface FileSingleContext {
  readonly text: string;
  readonly error: ImportError | "no-notes" | undefined;
  readonly file: StreetFile | undefined;
  /** The form as typed. */
  readonly form: SingleChoice;
  readonly areaError: boolean;
  /** No detail is ticked. */
  readonly keysError: boolean;
  /** The choices of the results on screen; undefined before they are shown. */
  readonly shown: SingleChoice | undefined;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const SINGLE_TEXT_ID = "fsg-text";
export const SINGLE_OPEN_ID = "fsg-open";
export const SINGLE_AREA_ID = "fsg-area";
export const START_CHOICE: SingleChoice = { mode: "report", area: "", keys: FACT_KEYS };

const FIELD_STYLE = 'style="min-height:44px"';
const CHOICE_STYLE = 'style="min-height:44px;min-width:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

export function keyId(k: string): string {
  return `fsg-key-${k}`;
}

/** Where the "choose at least one detail" link sends focus: the first box. */
export const KEYS_TARGET = keyId(FACT_KEYS[0] ?? "");

export function modeId(m: string): string {
  return `fsg-mode-${m}`;
}

export function areaTooLong(area: string): boolean {
  return area.trim().length > FIRST_LIMITS.area;
}

function link(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

/** A table in a scrolling region named by its caption. */
function table(id: string, caption: string, head: readonly string[], rows: readonly string[]): string {
  return (
    `<div class="table-wrap" tabindex="0" role="region" aria-labelledby="${id}-caption"><table id="${id}"><caption id="${id}-caption">${esc(caption)}</caption>` +
    `<thead><tr>${head.map((h, i) => `<th scope="col"${i === 0 ? "" : ' class="num"'}>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`
  );
}

/** One box per detail, at least one to be ticked. */
export function renderKeys(ctx: FileSingleContext): string {
  const l = ctx.locale;
  const err = ctx.keysError;
  const boxes = FACT_KEYS.map(
    (k) =>
      `<label class="choice" for="${keyId(k)}" ${CHOICE_STYLE}><input type="checkbox" id="${keyId(k)}" name="key" value="${k}"${ctx.form.keys.includes(k) ? " checked" : ""}${err ? ' aria-describedby="e-fsg-keys"' : ""}>${esc(t(COPY.facts[k], l))}</label>`,
  ).join("");
  return `<fieldset><legend>${esc(t(C.keysLegend, l))}</legend>${err ? `<p id="e-fsg-keys" class="error">${esc(t(C.keysEmpty, l))}</p>` : ""}${boxes}</fieldset>`;
}

export function renderSingleForm(ctx: FileSingleContext): string {
  const l = ctx.locale;
  const err = ctx.areaError;
  const modes = SINGLE_MODES.map(
    (m) =>
      `<label class="choice" for="${modeId(m)}" ${CHOICE_STYLE}><input type="radio" id="${modeId(m)}" name="mode" value="${m}"${ctx.form.mode === m ? " checked" : ""}>${esc(modeText(m, l))}</label>`,
  ).join("");
  return (
    `<h3 id="fsg-form" tabindex="-1">${esc(t(C.formTitle, l))}</h3>` +
    `<form id="fsg-show-form" novalidate>` +
    `<fieldset><legend>${esc(t(C.modeLegend, l))}</legend>${modes}</fieldset>` +
    renderKeys(ctx) +
    `<label for="${SINGLE_AREA_ID}">${esc(t(C.areaLabel, l))}</label><p id="h-${SINGLE_AREA_ID}" class="hint">${esc(t(C.areaHint, l))}</p>` +
    (err ? `<p id="e-${SINGLE_AREA_ID}" class="error">${esc(t(C.areaLong, l))}</p>` : "") +
    `<input id="${SINGLE_AREA_ID}" name="area" type="text" autocomplete="off" maxlength="${FIRST_LIMITS.area + 20}" value="${esc(ctx.form.area)}"` +
    ` aria-describedby="h-${SINGLE_AREA_ID}${err ? ` e-${SINGLE_AREA_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>` +
    `<p>${button(t(C.show, l), { type: "submit", "data-action": "fsg-show" })}</p></form>`
  );
}

export function renderCounts(r: SingleReport, l: Locale): string {
  return table(
    "fsg-counts",
    t(C.countsCaption, l),
    [t(C.countsColumns.backing, l), t(C.countsColumns.details, l)],
    BACKINGS.map((b) => `<tr><th scope="row">${esc(backingText(b, l))}</th><td class="num">${r.counts[b]}</td></tr>`),
  );
}

export function renderSources(r: SingleReport, l: Locale): string {
  if (r.bySource.length === 0) return "";
  const cols = C.sourcesColumns;
  return (
    `<h4 id="fsg-sources-title">${esc(t(C.sourcesTitle, l))}</h4>` +
    table(
      "fsg-sources",
      t(C.sourcesCaption, l),
      [t(cols.source, l), t(cols.alone, l), t(cols.reports, l)],
      r.bySource.map((s) => `<tr><th scope="row"><span data-user-content>${esc(sourceName(s.source, l))}</span></th><td class="num">${s.alone}</td><td class="num">${s.reports}</td></tr>`),
    )
  );
}

export function renderPairs(r: SingleReport, l: Locale): string {
  const cols = C.pairsColumns;
  const head = `<h4 id="fsg-pairs-title">${esc(t(C.pairsTitle, l))}</h4><p class="hint">${esc(t(C.pairsHint, l))}</p>`;
  if (r.pairs.length === 0) return `${head}<p id="fsg-no-pairs">${esc(t(C.noPairs, l))}</p>`;
  const where = r.pairs
    .filter((p) => p.differences.length > 0)
    .map(
      (p, i) =>
        `<details class="fsg-differ" id="fsg-differ-${i}"><summary style="min-height:44px"><span data-user-content>${esc(differHeading(p, l))}</span></summary><ul>` +
        p.differences
          .map(
            (d) =>
              `<li><span data-user-content>${esc(d.place.name)}</span>${d.place.address ? `, <span data-user-content>${esc(d.place.address)}</span>` : ""} — <span data-user-content>${esc(differenceText(d, p, l))}</span></li>`,
          )
          .join("") +
        `</ul></details>`,
    )
    .join("");
  return (
    head +
    table(
      "fsg-pairs",
      t(C.pairsCaption, l),
      [t(cols.a, l), t(cols.b, l), t(cols.both, l), t(cols.same, l), t(cols.different, l)],
      r.pairs.map(
        (p) =>
          `<tr><th scope="row"><span data-user-content>${esc(sourceName(p.a, l))}</span></th><td><span data-user-content>${esc(sourceName(p.b, l))}</span></td>` +
          `<td class="num">${p.both}</td><td class="num">${p.same}</td><td class="num">${p.different}</td></tr>`,
      ),
    ) +
    (where === "" ? "" : `<h5 id="fsg-where-title">${esc(t(C.whereDiffer, l))}</h5>${where}`)
  );
}

/** The download of every place and detail where two sources differ, when there is one. */
export function renderDifferDownload(r: SingleReport, mode: SingleMode, today: Date, l: Locale): string {
  if (!hasDifferences(r)) return "";
  return (
    `<p>${link(csvHref(differCsv(r)), singleFilename("differ", mode, today, l), t(C.downloadDiffer, l))}</p>` +
    `<p>${link(exportHref(differNotesFile(r, today)), singleFilename("differ-notes", mode, today, l), t(C.downloadDifferNotes, l))}</p>`
  );
}

export function renderSingle(ctx: FileSingleContext, file: StreetFile, choice: SingleChoice): string {
  const l = ctx.locale;
  const r = fileSingle(file, choice.mode, choice.area, choice.keys);
  const head = `<h3 id="fsg-results" tabindex="-1">${esc(t(C.resultsTitle, l))}</h3>`;
  if (r.places === 0) return `${head}<p id="fsg-summary">${esc(t(C.noPlaces, l))}</p>`;
  const downloads =
    r.list.length === 0
      ? ""
      : `<p>${link(csvHref(singleCsv(r)), singleFilename("csv", choice.mode, ctx.today, l), t(C.downloadCsv, l))}</p>` +
        `<p>${link(exportHref(singleNotesFile(r, ctx.today)), singleFilename("notes", choice.mode, ctx.today, l), t(C.downloadNotes, l))}</p>` +
        `<p class="hint">${esc(t(C.notesHint, l))}</p>` +
        `<p>${link(textExportHref(singleText(r, choice.area, ctx.today, l)), singleFilename("text", choice.mode, ctx.today, l), t(C.downloadText, l))}</p>`;
  const places =
    r.list.length === 0
      ? `<p id="fsg-none">${esc(t(C.noneListed[choice.mode], l))}</p>`
      : `<h4 id="fsg-places-title">${esc(`${t(C.placesTitle, l)} (${r.list.length})`)}</h4><ul aria-labelledby="fsg-places-title">` +
        r.list
          .map(
            (p) =>
              `<li><span data-user-content>${esc(p.place.name)}</span>, <span data-user-content>${esc(p.place.address ?? t(C.noAddress, l))}</span>` +
              `<ul>${p.details.map((d) => `<li><span data-user-content>${esc(detailText(d, l))}</span></li>`).join("")}</ul></li>`,
          )
          .join("") +
        `</ul>`;
  return (
    head +
    `<p id="fsg-summary">${esc(singleSummary(r, l))}</p>` +
    // When only some details are chosen, the counts are about those alone, so the page says which.
    (r.keys.length < FACT_KEYS.length ? `<p id="fsg-keys">${esc(`${t(C.keysLegend, l)}${l === "fr" ? NB : ""}: ${keysText(r, l)}`)}</p>` : "") +
    `<p class="hint">${esc(t(C.meaning, l))}</p>` +
    renderCounts(r, l) +
    downloads +
    places +
    renderSources(r, l) +
    renderPairs(r, l) +
    renderDifferDownload(r, choice.mode, ctx.today, l)
  );
}

export function renderFileSingle(ctx: FileSingleContext): string {
  const l = ctx.locale;
  const err = ctx.error;
  const errors = [
    ...(err ? [`<li><a href="#${SINGLE_TEXT_ID}">${esc(singleErrorText(err, l))}</a></li>`] : []),
    ...(ctx.keysError ? [`<li><a href="#${KEYS_TARGET}">${esc(t(C.keysEmpty, l))}</a></li>`] : []),
    ...(ctx.areaError ? [`<li><a href="#${SINGLE_AREA_ID}">${esc(t(C.areaLong, l))}</a></li>`] : []),
  ];
  return (
    `<div class="app filesingle-app" lang="${l}"><section lang="${l}" aria-labelledby="fsg-title" class="filesingle">` +
    `<h2 id="fsg-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="fsg-status">${esc(ctx.statusMessage)}</p>` : "") +
    (errors.length > 0 ? `<div id="fsg-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${errors.join("")}</ul></div>` : "") +
    `<form id="fsg-file-form" novalidate>` +
    `<label for="${SINGLE_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${SINGLE_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${SINGLE_TEXT_ID}" class="error">${esc(singleErrorText(err, l))}</p>` : "") +
    `<textarea id="${SINGLE_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${SINGLE_TEXT_ID}${err ? ` e-${SINGLE_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${SINGLE_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${SINGLE_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "fsg-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "fsg-clear", class: "secondary" })}</p>` +
    (ctx.file ? renderSingleForm(ctx) + (ctx.shown ? renderSingle(ctx, ctx.file, ctx.shown) : "") : "") +
    `</section></div>`
  );
}

/** The form's values on the page, or the fallback. */
export function readSingleForm(root: ParentNode, fallback: SingleChoice): SingleChoice {
  const mode = root.querySelector<HTMLInputElement>('input[name="mode"]:checked')?.value;
  return {
    mode: isSingleMode(mode) ? mode : fallback.mode,
    area: root.querySelector<HTMLInputElement>(`#${SINGLE_AREA_ID}`)?.value ?? fallback.area,
    keys: root.querySelector('input[name="key"]') ? FACT_KEYS.filter((k) => root.querySelector<HTMLInputElement>(`#${keyId(k)}`)?.checked === true) : fallback.keys,
  };
}
