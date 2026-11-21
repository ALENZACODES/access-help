import type { Locale } from "../../switch-first/src/index";
import { t } from "./copy";
import { exportHref, type ImportError } from "./exchange";
import {
  FILE_DATES_COPY as C,
  changeText,
  copySummary,
  dateProblemText,
  datesErrorText,
  datesFilename,
  datesSummary,
  datesText,
  sourceLine,
  placeText,
  recordText,
  suggestionLabel,
} from "./filedates-copy";
import type { StreetFile } from "./filestreets";
import { button, esc } from "./html";
import { LIMITS } from "./model";
import { csvHref } from "./notes-csv";
import { textExportHref } from "./textexport";
import { applyDates, bySource, copyChanges, datesCsv, dateProblem, fixedFile, type DateChoice, type DateProblem, type DatesReport, type FixedCopy, type FutureRecord } from "./recorddates";

/** What a record's radio group holds: keep, a suggested date ("s:2026-03-01"), the typed date, or Unknown. */
export type DatePick = "keep" | "typed" | "unknown" | `s:${string}`;

export interface FileDatesContext {
  readonly text: string;
  readonly error: ImportError | "no-notes" | undefined;
  readonly file: StreetFile | undefined;
  readonly report: DatesReport | undefined;
  /** By record id; a record not here is kept. */
  readonly picks: ReadonlyMap<string, DatePick>;
  /** Dates typed, by record id, as typed. */
  readonly typed: ReadonlyMap<string, string>;
  /** Problems with typed dates, by record id, shown when the copy is asked for. */
  readonly typedErrors: ReadonlyMap<string, DateProblem>;
  /** Every record is kept when the copy is asked for. */
  readonly noneError: boolean;
  /** The choices the copy on screen was made with; undefined before one is made. */
  readonly made: ReadonlyMap<string, DateChoice> | undefined;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const DATES_TEXT_ID = "fdt-text";
export const DATES_OPEN_ID = "fdt-open";

const FIELD_STYLE = 'style="min-height:44px"';
const CHOICE_STYLE = 'style="min-height:44px;min-width:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

export const groupName = (i: number): string => `fdt-pick-${i}`;
export const keepId = (i: number): string => `fdt-keep-${i}`;
export const suggestionId = (i: number, j: number): string => `fdt-suggest-${i}-${j}`;
export const typedId = (i: number): string => `fdt-typed-${i}`;
export const typedFieldId = (i: number): string => `fdt-date-${i}`;
export const unknownId = (i: number): string => `fdt-unknown-${i}`;

export function isPick(s: string | undefined): s is DatePick {
  return s === "keep" || s === "typed" || s === "unknown" || (s !== undefined && s.startsWith("s:"));
}

/** The choice a pick makes for a record, or undefined when the typed date has a problem. */
export function choiceOf(f: FutureRecord, pick: DatePick | undefined, typed: string | undefined, today: Date): DateChoice | undefined {
  if (pick === undefined || pick === "keep") return { kind: "keep" };
  if (pick === "unknown") return { kind: "unknown" };
  if (pick === "typed") {
    const d = (typed ?? "").trim();
    return dateProblem(d, today) === undefined ? { kind: "date", date: d } : undefined;
  }
  const date = pick.slice(2);
  // Only a date the App suggested for this record can be picked this way.
  return f.suggestions.some((s) => s.date === date) ? { kind: "date", date } : { kind: "keep" };
}

function link(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

function radio(id: string, name: string, value: string, checked: boolean, label: string): string {
  return `<label class="choice" for="${id}" ${CHOICE_STYLE}><input type="radio" id="${id}" name="${name}" value="${esc(value)}"${checked ? " checked" : ""}>${label}</label>`;
}

/** One record: where it is, what it says, and what to do with its date. */
export function renderRecord(f: FutureRecord, i: number, ctx: FileDatesContext): string {
  const l = ctx.locale;
  const pick = ctx.picks.get(f.id) ?? "keep";
  const problem = ctx.typedErrors.get(f.id);
  const field = typedFieldId(i);
  const options =
    radio(keepId(i), groupName(i), "keep", pick === "keep", esc(t(C.keep, l))) +
    f.suggestions.map((s, j) => radio(suggestionId(i, j), groupName(i), `s:${s.date}`, pick === `s:${s.date}`, esc(suggestionLabel(s.date, s.slip, l)))).join("") +
    (f.suggestions.length === 0 ? `<p class="hint">${esc(t(C.noSuggestion, l))}</p>` : "") +
    radio(typedId(i), groupName(i), "typed", pick === "typed", esc(t(C.typed, l))) +
    `<label for="${field}">${esc(`${t(C.typedLabel, l)} ${i + 1}`)}</label><p id="h-${field}" class="hint">${esc(t(C.typedHint, l))}</p>` +
    (problem ? `<p id="e-${field}" class="error">${esc(dateProblemText(problem, l))}</p>` : "") +
    `<input id="${field}" type="text" inputmode="numeric" autocomplete="off" maxlength="20" value="${esc(ctx.typed.get(f.id) ?? "")}"` +
    ` aria-describedby="h-${field}${problem ? ` e-${field}` : ""}"${problem ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>` +
    radio(unknownId(i), groupName(i), "unknown", pick === "unknown", esc(t(C.unknown, l)));
  return (
    `<li><h4 id="fdt-record-${i}"><span data-user-content>${esc(placeText(f))}</span></h4>` +
    `<p><span data-user-content>${esc(recordText(f, l))}</span></p>` +
    `<fieldset><legend>${esc(`${t(C.recordLegend, l)} ${i + 1}`)}</legend>${options}</fieldset></li>`
  );
}

/** Each change the copy holds, so it can be read through before it is imported. */
export function renderChanges(r: DatesReport, copy: FixedCopy, l: Locale): string {
  const changes = copyChanges(r, copy);
  if (changes.length === 0) return "";
  return `<h4 id="fdt-changes">${esc(t(C.changesTitle, l))}</h4><ul class="fdt-changes">${changes.map((c) => `<li><span data-user-content>${esc(changeText(c, l))}</span></li>`).join("")}</ul>`;
}

/** Where the records come from, most first. */
export function renderSources(r: DatesReport, l: Locale): string {
  const sources = bySource(r);
  if (sources.length === 0) return "";
  return (
    `<h4 id="fdt-sources">${esc(t(C.sourcesTitle, l))}</h4><p class="hint">${esc(t(C.sourcesHint, l))}</p>` +
    `<ul class="fdt-sources">${sources.map((s) => `<li><span data-user-content>${esc(sourceLine(s, l))}</span></li>`).join("")}</ul>`
  );
}

export function renderRecords(ctx: FileDatesContext, file: StreetFile, r: DatesReport): string {
  const l = ctx.locale;
  const head = `<h3 id="fdt-results" tabindex="-1">${esc(`${t(C.resultsTitle, l)} (${r.future.length})`)}</h3><p id="fdt-summary">${esc(datesSummary(r, l))}</p>`;
  if (r.future.length === 0) return `${head}<p id="fdt-none">${esc(t(C.none, l))}</p>`;
  const copy = ctx.made === undefined ? undefined : applyDates(file, r, ctx.made, ctx.today);
  return (
    head +
    `<p>${link(csvHref(datesCsv(r)), datesFilename("csv", ctx.today, l), t(C.downloadCsv, l))} ` +
    `${link(textExportHref(datesText(r, ctx.today, l)), datesFilename("text", ctx.today, l), t(C.downloadText, l))}</p>` +
    renderSources(r, l) +
    `<form id="fdt-fix-form" novalidate><ol class="fdt-records">${r.future.map((f, i) => renderRecord(f, i, ctx)).join("")}</ol>` +
    `<p>${button(t(C.make, l), { type: "submit", "data-action": "fdt-make" })}</p></form>` +
    (copy === undefined
      ? ""
      : `<h3 id="fdt-copy" tabindex="-1">${esc(t(C.copyTitle, l))}</h3><p id="fdt-copy-summary">${esc(copySummary(copy, l))}</p>` +
        renderChanges(r, copy, l) +
        `<p>${link(exportHref(fixedFile(copy, ctx.today)), datesFilename("copy", ctx.today, l), t(C.downloadCopy, l))}</p>` +
        `<p class="hint">${esc(t(C.copyHint, l))}</p>`)
  );
}

export function renderFileDates(ctx: FileDatesContext): string {
  const l = ctx.locale;
  const err = ctx.error;
  const records = ctx.report?.future ?? [];
  const errors = [
    ...(err ? [`<li><a href="#${DATES_TEXT_ID}">${esc(datesErrorText(err, l))}</a></li>`] : []),
    ...(ctx.noneError ? [`<li><a href="#${keepId(0)}">${esc(t(C.noneChanged, l))}</a></li>`] : []),
    ...records.flatMap((f, i) => {
      const p = ctx.typedErrors.get(f.id);
      return p ? [`<li><a href="#${typedFieldId(i)}">${esc(`${t(C.typedLabel, l)} ${i + 1} — ${dateProblemText(p, l)}`)}</a></li>`] : [];
    }),
  ];
  return (
    `<div class="app filedates-app" lang="${l}"><section lang="${l}" aria-labelledby="fdt-title" class="filedates">` +
    `<h2 id="fdt-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.rule, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="fdt-status">${esc(ctx.statusMessage)}</p>` : "") +
    (errors.length > 0 ? `<div id="fdt-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${errors.join("")}</ul></div>` : "") +
    `<form id="fdt-file-form" novalidate>` +
    `<label for="${DATES_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${DATES_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${DATES_TEXT_ID}" class="error">${esc(datesErrorText(err, l))}</p>` : "") +
    `<textarea id="${DATES_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${DATES_TEXT_ID}${err ? ` e-${DATES_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${DATES_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${DATES_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "fdt-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "fdt-clear", class: "secondary" })}</p>` +
    (ctx.file && ctx.report ? renderRecords(ctx, ctx.file, ctx.report) : "") +
    `</section></div>`
  );
}

/** The picks and typed dates on the page, record by record. */
export function readPicks(root: ParentNode, r: DatesReport): { picks: Map<string, DatePick>; typed: Map<string, string> } {
  const picks = new Map<string, DatePick>();
  const typed = new Map<string, string>();
  r.future.forEach((f, i) => {
    const v = root.querySelector<HTMLInputElement>(`input[name="${groupName(i)}"]:checked`)?.value;
    if (isPick(v) && v !== "keep") picks.set(f.id, v);
    const d = root.querySelector<HTMLInputElement>(`#${typedFieldId(i)}`)?.value ?? "";
    if (d !== "") typed.set(f.id, d);
  });
  return { picks, typed };
}
