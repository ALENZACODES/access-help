import type { Locale } from "../../switch-first/src/index";
import { NB, t } from "./copy";
import { csvField, csvHref } from "./notes-csv";
import { exportHref } from "./exchange";
import { OPEN_LICENCES } from "./facts";
import {
  TARGETS,
  sheetColumnFor,
  sheetNotesFile,
  type FixedValues,
  type Mapping,
  type SetupProblem,
  type Sheet,
  type SheetError,
  type SheetResult,
  type Target,
  type ValueWords,
} from "./filesheet";
import {
  FILE_SHEET_COPY as C,
  columnLabel,
  problemLine,
  rowReasonText,
  setupErrorText,
  sheetErrorText,
  sheetFilename,
  targetText,
  unmatchedText,
} from "./filesheet-copy";
import { setupFilename, setupToJson } from "./filesheet-setup";
import { button, esc } from "./html";
import { LIMITS } from "./model";

export interface FileSheetContext {
  readonly text: string;
  readonly readError: SheetError | undefined;
  readonly sheet: Sheet | undefined;
  readonly mapping: Mapping;
  readonly fixed: FixedValues;
  readonly words: ValueWords;
  readonly setup: readonly SetupProblem[];
  readonly result: SheetResult | undefined;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const SHEET_TEXT_ID = "fh-text";
export const SHEET_OPEN_ID = "fh-open";
export const SETUP_OPEN_ID = "fh-setup-open";
export const FIXED_ID = { source: "fh-source", licence: "fh-licence", recordedOn: "fh-date" } as const;
export const WORDS_ID = { yes: "fh-words-yes", no: "fh-words-no", unknown: "fh-words-unknown" } as const;
export const MAX_LISTED = 100;

const FIELD_STYLE = 'style="min-height:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

export function columnSelectId(index: number): string {
  return `fh-col-${index}`;
}

/** The field a setup problem points at. */
export function setupField(p: SetupProblem, mapping: Mapping): string {
  switch (p.code) {
    case "no-place-column":
    case "no-detail-column":
      return columnSelectId(0);
    case "two-columns":
      return columnSelectId(Math.max(0, mapping.indexOf(p.target ?? "")));
    case "no-source":
    case "source-too-long":
    case "source-control":
      return FIXED_ID.source;
    case "bad-licence":
      return FIXED_ID.licence;
    case "bad-date":
    case "future-date":
      return FIXED_ID.recordedOn;
    case "word-in-two-lists":
      return WORDS_ID.yes;
  }
}

/** The rows not used, as the person's own rows with the column and the reason after them. */
export function sheetProblemsCsv(sheet: Sheet, mapping: Mapping, result: SheetResult, l: Locale): string {
  const extra = l === "fr" ? ["ligne", "colonne", "raison"] : ["row", "column", "reason"];
  const lines = [[...sheet.header, ...extra]];
  for (const p of result.preview.problems) {
    const own = sheet.rows[p.row - 2] ?? [];
    lines.push([...own, String(p.row), sheetColumnFor(p.column, sheet, mapping) ?? "", rowReasonText(p.code, l)]);
  }
  return `\uFEFF${lines.map((r) => r.map(csvField).join(",")).join("\r\n")}\r\n`;
}

export function renderSetupErrors(ctx: FileSheetContext): string {
  const l = ctx.locale;
  const items: string[] = [];
  if (ctx.readError) items.push(`<li><a href="#${SHEET_TEXT_ID}">${esc(sheetErrorText(ctx.readError, l))}</a></li>`);
  for (const p of ctx.setup) items.push(`<li><a href="#${setupField(p, ctx.mapping)}">${esc(setupErrorText(p.code, l, p.word))}</a></li>`);
  if (items.length === 0) return "";
  return `<div id="fh-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${items.join("")}</ul></div>`;
}

function examples(sheet: Sheet, index: number): string {
  const seen: string[] = [];
  for (const row of sheet.rows) {
    const v = (row[index] ?? "").trim();
    if (v !== "" && !seen.includes(v)) seen.push(v);
    if (seen.length === 3) break;
  }
  return seen.join(", ");
}

export function renderColumns(ctx: FileSheetContext, sheet: Sheet): string {
  const l = ctx.locale;
  const fields = sheet.header
    .map((name, i) => {
      const id = columnSelectId(i);
      const ex = examples(sheet, i);
      const options = TARGETS.map((target) => `<option value="${target}"${(ctx.mapping[i] ?? "") === target ? " selected" : ""}>${esc(targetText(target, l))}</option>`).join("");
      const err = fieldError(ctx, id, ex === "" ? undefined : `h-${id}`);
      return (
        `<label for="${id}"><span data-user-content>${esc(columnLabel(i, name === "" ? "–" : name, l))}</span></label>` +
        (ex === "" ? "" : `<p id="h-${id}" class="hint">${esc(t(C.example, l))}${l === "fr" ? NB : ""}: <span data-user-content>${esc(ex)}</span></p>`) +
        err.text +
        `<select id="${id}" name="col-${i}"${err.attrs} ${FIELD_STYLE}>${options}</select>`
      );
    })
    .join("");
  return `<fieldset><legend>${esc(t(C.columnsTitle, l))}</legend><p class="hint">${esc(t(C.columnsHint, l))}</p>${fields}</fieldset>`;
}

/**
 * The error text shown just before a field, and the attributes that tie it to
 * the field: aria-invalid, and aria-describedby naming the hint (if any) and
 * the error, so a screen reader reads why the field needs fixing.
 */
export function fieldError(ctx: FileSheetContext, id: string, hintId?: string): { attrs: string; text: string } {
  const problems = ctx.setup.filter((p) => setupField(p, ctx.mapping) === id);
  const ids = [hintId, problems.length > 0 ? `e-${id}` : undefined].filter((x): x is string => x !== undefined);
  const describedBy = ids.length > 0 ? ` aria-describedby="${ids.join(" ")}"` : "";
  if (problems.length === 0) return { attrs: describedBy, text: "" };
  return {
    attrs: `${describedBy} aria-invalid="true"`,
    text: `<p id="e-${id}" class="error">${problems.map((p) => esc(setupErrorText(p.code, ctx.locale, p.word))).join(" ")}</p>`,
  };
}

export function renderFixed(ctx: FileSheetContext): string {
  const l = ctx.locale;
  const f = ctx.fixed;
  const licences = [`<option value=""${f.licence === "" ? " selected" : ""}>${esc(t(C.chooseLicence, l))}</option>`, ...OPEN_LICENCES.map((x) => `<option value="${esc(x)}"${f.licence === x ? " selected" : ""}>${esc(x)}</option>`)].join("");
  const source = fieldError(ctx, FIXED_ID.source, `h-${FIXED_ID.source}`);
  const licence = fieldError(ctx, FIXED_ID.licence);
  const date = fieldError(ctx, FIXED_ID.recordedOn);
  return (
    `<fieldset><legend>${esc(t(C.fixedTitle, l))}</legend><p class="hint">${esc(t(C.fixedHint, l))}</p>` +
    `<label for="${FIXED_ID.source}">${esc(t(C.sourceLabel, l))}</label><p id="h-${FIXED_ID.source}" class="hint">${esc(t(C.sourceHint, l))}</p>` +
    source.text +
    `<input id="${FIXED_ID.source}" name="source" type="text" autocomplete="off" maxlength="200" value="${esc(f.source)}"${source.attrs} ${FIELD_STYLE}>` +
    `<label for="${FIXED_ID.licence}">${esc(t(C.licenceLabel, l))}</label>` +
    licence.text +
    `<select id="${FIXED_ID.licence}" name="licence"${licence.attrs} ${FIELD_STYLE}>${licences}</select>` +
    `<label for="${FIXED_ID.recordedOn}">${esc(t(C.dateLabel, l))}</label>` +
    date.text +
    `<input id="${FIXED_ID.recordedOn}" name="recordedOn" type="text" inputmode="numeric" autocomplete="off" maxlength="10" value="${esc(f.recordedOn)}"${date.attrs} ${FIELD_STYLE}>` +
    `</fieldset>`
  );
}

export function renderWords(ctx: FileSheetContext): string {
  const l = ctx.locale;
  const field = (key: keyof ValueWords, label: { en: string; fr: string }): string => {
    const err = fieldError(ctx, WORDS_ID[key], "fh-words-hint");
    return (
      `<label for="${WORDS_ID[key]}">${esc(t(label, l))}</label>` +
      err.text +
      `<input id="${WORDS_ID[key]}" name="words-${key}" type="text" autocomplete="off" maxlength="300" value="${esc(ctx.words[key])}"${err.attrs} ${FIELD_STYLE}>`
    );
  };
  return (
    `<fieldset><legend>${esc(t(C.wordsTitle, l))}</legend><p id="fh-words-hint" class="hint">${esc(t(C.wordsHint, l))}</p>` +
    field("yes", C.yesWords) +
    field("no", C.noWords) +
    field("unknown", C.unknownWords) +
    `</fieldset>`
  );
}

/** Download the current choices, or open saved ones. */
export function renderSaved(ctx: FileSheetContext, sheet: Sheet): string {
  const l = ctx.locale;
  const json = setupToJson(sheet.header, ctx.mapping, ctx.fixed, ctx.words);
  return (
    `<h3 id="fh-saved">${esc(t(C.savedTitle, l))}</h3><p class="hint">${esc(t(C.savedHint, l))}</p>` +
    `<p>${link(exportHref(json), setupFilename(ctx.today, l), t(C.downloadSetup, l))}</p>` +
    `<label for="${SETUP_OPEN_ID}">${esc(t(C.openSetup, l))}</label>` +
    `<input id="${SETUP_OPEN_ID}" type="file" accept=".json,application/json" ${FIELD_STYLE}>`
  );
}

function link(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

export function renderSheetResult(ctx: FileSheetContext, sheet: Sheet, result: SheetResult): string {
  const l = ctx.locale;
  const p = result.preview;
  const problemRows = new Set(p.problems.map((x) => x.row)).size;
  const rows: Array<[string, number]> = [
    [t(C.rows.read, l), p.rowsRead],
    [t(C.rows.notes, l), p.notes.length],
    [t(C.rows.problems, l), problemRows],
    [t(C.rows.nothingKnown, l), p.nothingKnown],
    [t(C.rows.noRoom, l), p.noRoom],
  ];
  const table =
    `<div class="table-wrap" role="region" aria-labelledby="fh-counts-caption" tabindex="0"><table class="fh-counts">` +
    `<caption id="fh-counts-caption">${esc(t(C.countsCaption, l))}</caption>` +
    `<thead><tr><th scope="col">${esc(t(C.countsWhat, l))}</th><th scope="col">${esc(t(C.countsNumber, l))}</th></tr></thead>` +
    `<tbody>${rows.map(([name, n], i) => `<tr data-row="${i}"><th scope="row">${esc(name)}</th><td>${n}</td></tr>`).join("")}</tbody></table></div>`;
  const unmatched =
    result.unmatched.length === 0
      ? ""
      : `<h4 id="fh-unmatched">${esc(t(C.unmatchedTitle, l))}</h4><p class="hint">${esc(t(C.unmatchedHint, l))}</p>` +
        `<ul class="fh-unmatched">${result.unmatched.map((u) => `<li><span data-user-content>${esc(unmatchedText(u.word, u.count, l))}</span></li>`).join("")}</ul>`;
  const listed = p.problems.slice(0, MAX_LISTED);
  const problems =
    `<h4 id="fh-problems">${esc(t(C.problemsTitle, l))}</h4>` +
    (p.problems.length === 0
      ? `<p>${esc(t(C.noProblems, l))}</p>`
      : `<ul class="fh-problems">${listed.map((x) => `<li data-row="${x.row}" data-code="${x.code}"><span data-user-content>${esc(problemLine(x.row, sheetColumnFor(x.column, sheet, ctx.mapping), rowReasonText(x.code, l), l))}</span></li>`).join("")}</ul>` +
        (p.problems.length > MAX_LISTED ? `<p class="hint">${esc(t(C.moreProblems, l))}</p>` : ""));
  const downloads =
    (p.notes.length === 0 ? `<p>${esc(t(C.noNotes, l))}</p>` : `<p>${link(exportHref(sheetNotesFile(result, ctx.today)), sheetFilename("notes", ctx.today, l), t(C.downloadNotes, l))}</p>`) +
    (p.problems.length === 0 ? "" : `<p>${link(csvHref(sheetProblemsCsv(sheet, ctx.mapping, result, l)), sheetFilename("problems", ctx.today, l), t(C.downloadProblems, l))}</p>`) +
    `<p>${link(csvHref(`\uFEFF${result.appCsv}`), sheetFilename("app", ctx.today, l), t(C.downloadAppCsv, l))}</p>`;
  return `<h3 id="fh-results" tabindex="-1">${esc(t(C.resultsTitle, l))}</h3>${table}${downloads}${unmatched}${problems}`;
}

export function renderFileSheet(ctx: FileSheetContext): string {
  const l = ctx.locale;
  const err = ctx.readError;
  return (
    `<div class="app filesheet-app" lang="${l}"><section lang="${l}" aria-labelledby="fh-title" class="filesheet">` +
    `<h2 id="fh-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="fh-status">${esc(ctx.statusMessage)}</p>` : "") +
    renderSetupErrors(ctx) +
    `<form id="fh-file-form" novalidate>` +
    `<label for="${SHEET_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${SHEET_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${SHEET_TEXT_ID}" class="error">${esc(sheetErrorText(err, l))}</p>` : "") +
    `<textarea id="${SHEET_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${SHEET_TEXT_ID}${err ? ` e-${SHEET_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${SHEET_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${SHEET_OPEN_ID}" type="file" accept=".csv,text/csv,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "fh-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "fh-clear", class: "secondary" })}</p>` +
    (ctx.sheet
      ? renderSaved(ctx, ctx.sheet) +
        `<form id="fh-setup-form" novalidate>${renderColumns(ctx, ctx.sheet)}${renderFixed(ctx)}${renderWords(ctx)}` +
        `<p>${button(t(C.make, l), { type: "submit", "data-action": "fh-make" })}</p></form>` +
        (ctx.result ? renderSheetResult(ctx, ctx.sheet, ctx.result) : "")
      : "") +
    `</section></div>`
  );
}

/** Reads a target from a select's value; anything else is "not used". */
export function targetFrom(value: string | undefined): Target {
  const v = value ?? "";
  return (TARGETS as readonly string[]).includes(v) ? (v as Target) : "";
}
