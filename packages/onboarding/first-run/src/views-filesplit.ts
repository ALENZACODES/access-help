import type { Locale } from "../../switch-first/src/index";
import { COPY, groupHeading, t } from "./copy";
import { exportHref, type ImportError } from "./exchange";
import { FACT_KEYS } from "./facts";
import {
  ANSWER_FILTERS,
  detailCounts,
  partExport,
  searchWords,
  type FilterError,
  type HandPicks,
  type Split,
  type SplitFile,
  type SplitFilters,
} from "./filesplit";
import {
  FILE_SPLIT_COPY as C,
  answerFilterText,
  chooseNoteText,
  chosenText,
  fileReadText,
  filterErrorText,
  filtersSummary,
  splitErrorText,
  splitFilename,
} from "./filesplit-copy";
import { button, esc } from "./html";
import { LIMITS } from "./model";
import { csvHref, notesToCsv } from "./notes-csv";

export interface FileSplitContext {
  readonly text: string;
  readonly fileError: ImportError | "no-notes" | undefined;
  readonly file: SplitFile | undefined;
  /** The filters as typed in the form. */
  readonly draft: SplitFilters;
  /** The filters in use. */
  readonly filters: SplitFilters;
  readonly filterErrors: readonly FilterError[];
  readonly picks: HandPicks;
  readonly split: Split | undefined;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const SPLIT_TEXT_ID = "fs-text";
export const SPLIT_OPEN_ID = "fs-open";

/** Field ids of the filters, and the field each filter error points at. */
export const FILTER_FIELD = {
  words: "fs-words",
  detail: "fs-detail",
  answer: "fs-answer",
  source: "fs-source",
  licence: "fs-licence",
  from: "fs-from",
  to: "fs-to",
} as const;

export const ERROR_FIELD: Readonly<Record<FilterError, string>> = {
  "bad-from": FILTER_FIELD.from,
  "bad-to": FILTER_FIELD.to,
  "from-after-to": FILTER_FIELD.from,
  "bad-detail": FILTER_FIELD.detail,
  "bad-answer": FILTER_FIELD.answer,
  "bad-licence": FILTER_FIELD.licence,
};

const FIELD_STYLE = 'style="min-height:44px"';
const CHOICE_STYLE = 'style="min-height:44px;min-width:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

export function noteBoxId(index: number): string {
  return `fs-note-${index}`;
}

export function renderSplitErrors(ctx: FileSplitContext): string {
  const l = ctx.locale;
  const items: string[] = [];
  if (ctx.fileError) items.push(`<li><a href="#${SPLIT_TEXT_ID}">${esc(splitErrorText(ctx.fileError, l))}</a></li>`);
  for (const e of ctx.filterErrors) items.push(`<li><a href="#${ERROR_FIELD[e]}">${esc(filterErrorText(e, l))}</a></li>`);
  if (items.length === 0) return "";
  return `<div id="fs-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${items.join("")}</ul></div>`;
}

/** The filters in use, in plain words, for the line above the list. */
export function filterParts(f: SplitFilters, l: Locale): string[] {
  const parts: string[] = [];
  const words = searchWords(f.words);
  if (words.length > 0) parts.push(l === "fr" ? `mots ${words.join(" ")}` : `words ${words.join(" ")}`);
  if (f.detail !== "") parts.push(`${t(COPY.facts[f.detail], l)}, ${answerFilterText(f.answer, l)}`);
  if (f.source !== "") parts.push(`${t(C.sourceLabel, l)} ${f.source}`);
  if (f.licence !== "") parts.push(`${t(C.licenceLabel, l)} ${f.licence}`);
  if (f.from !== "" || f.to !== "") parts.push(`${f.from === "" ? "…" : f.from} – ${f.to === "" ? "…" : f.to}`);
  return parts;
}

function fieldErrors(field: string, ctx: FileSplitContext): { attrs: string; text: string } {
  const errs = ctx.filterErrors.filter((e) => ERROR_FIELD[e] === field);
  if (errs.length === 0) return { attrs: "", text: "" };
  return {
    attrs: ` aria-invalid="true" aria-describedby="e-${field}"`,
    text: `<p id="e-${field}" class="error">${errs.map((e) => esc(filterErrorText(e, ctx.locale))).join(" ")}</p>`,
  };
}

function options(values: readonly string[], selected: string, label: (v: string) => string): string {
  return values.map((v) => `<option value="${esc(v)}"${v === selected ? " selected" : ""}>${esc(label(v))}</option>`).join("");
}

export function renderFilters(ctx: FileSplitContext, file: SplitFile): string {
  const l = ctx.locale;
  const d = ctx.draft;
  const F = FILTER_FIELD;
  const from = fieldErrors(F.from, ctx);
  const to = fieldErrors(F.to, ctx);
  const detail = fieldErrors(F.detail, ctx);
  const answer = fieldErrors(F.answer, ctx);
  const licence = fieldErrors(F.licence, ctx);
  return (
    `<form id="fs-filter-form" novalidate><fieldset><legend>${esc(t(C.filtersTitle, l))}</legend>` +
    `<p class="hint">${esc(t(C.filtersHint, l))}</p>` +
    `<label for="${F.words}">${esc(t(C.wordsLabel, l))}</label><p id="h-${F.words}" class="hint">${esc(t(C.wordsHint, l))}</p>` +
    `<input id="${F.words}" name="words" type="text" autocomplete="off" maxlength="120" aria-describedby="h-${F.words}" value="${esc(d.words)}" ${FIELD_STYLE}>` +
    `<label for="${F.detail}">${esc(t(C.detailLabel, l))}</label>${detail.text}` +
    `<select id="${F.detail}" name="detail"${detail.attrs} ${FIELD_STYLE}><option value=""${d.detail === "" ? " selected" : ""}>${esc(t(C.anyDetail, l))}</option>` +
    options(FACT_KEYS, d.detail, (k) => t(COPY.facts[k as (typeof FACT_KEYS)[number]], l)) +
    `</select>` +
    `<label for="${F.answer}">${esc(t(C.answerLabel, l))}</label>${answer.text}` +
    `<select id="${F.answer}" name="answer"${answer.attrs} ${FIELD_STYLE}>${options(ANSWER_FILTERS, d.answer, (a) => answerFilterText(a as (typeof ANSWER_FILTERS)[number], l))}</select>` +
    `<label for="${F.source}">${esc(t(C.sourceLabel, l))}</label>` +
    `<select id="${F.source}" name="source" ${FIELD_STYLE}><option value=""${d.source === "" ? " selected" : ""}>${esc(t(C.anySource, l))}</option>${options(file.sources, d.source, (s) => s)}</select>` +
    `<label for="${F.licence}">${esc(t(C.licenceLabel, l))}</label>${licence.text}` +
    `<select id="${F.licence}" name="licence"${licence.attrs} ${FIELD_STYLE}><option value=""${d.licence === "" ? " selected" : ""}>${esc(t(C.anyLicence, l))}</option>${options(file.licences, d.licence, (s) => s)}</select>` +
    `<label for="${F.from}">${esc(t(C.fromLabel, l))}</label>${from.text}` +
    `<input id="${F.from}" name="from" type="text" inputmode="numeric" autocomplete="off" maxlength="10" value="${esc(d.from)}"${from.attrs} ${FIELD_STYLE}>` +
    `<label for="${F.to}">${esc(t(C.toLabel, l))}</label>${to.text}` +
    `<input id="${F.to}" name="to" type="text" inputmode="numeric" autocomplete="off" maxlength="10" value="${esc(d.to)}"${to.attrs} ${FIELD_STYLE}>` +
    `<p>${button(t(C.apply, l), { type: "submit", "data-action": "fs-apply" })}${button(t(C.resetFilters, l), { "data-action": "fs-reset", class: "secondary" })}</p>` +
    `</fieldset></form>`
  );
}

export function renderNoteList(ctx: FileSplitContext, file: SplitFile, split: Split): string {
  const l = ctx.locale;
  const chosen = new Set(split.chosen.map((n) => n.id));
  const added = new Set(ctx.picks.add);
  const removed = new Set(ctx.picks.remove);
  const items = file.notes
    .map((n, i) => {
      const id = noteBoxId(i);
      const on = chosen.has(n.id);
      const hand = added.has(n.id) ? ` (${t(C.byHand, l)})` : removed.has(n.id) ? ` (${t(C.leftByHand, l)})` : "";
      return (
        `<li data-note="${esc(n.id)}" data-chosen="${on}">` +
        `<label class="choice" for="${id}" ${CHOICE_STYLE}><input type="checkbox" id="${id}" data-note="${esc(n.id)}"${on ? " checked" : ""}>` +
        `<span data-user-content>${esc(chooseNoteText(n.placeName, n.id, l))}</span></label>` +
        `<span data-user-content>${esc(n.address ?? t(COPY.similar.noAddress, l))}</span>${esc(hand)}</li>`
      );
    })
    .join("");
  return (
    `<h3 id="fs-notes" tabindex="-1">${esc(groupHeading(t(C.notesTitle, l), file.notes.length))}</h3>` +
    `<p id="fs-summary">${esc(filtersSummary(filterParts(ctx.filters, l), l))} ${esc(chosenText(split.chosen.length, file.notes.length, l))}</p>` +
    `<p class="hint">${esc(t(C.notesHint, l))}</p>` +
    `<ul class="fs-notes">${items}</ul>`
  );
}

export function renderCounts(split: Split, l: Locale): string {
  const counts = detailCounts(split.chosen);
  const rows = FACT_KEYS.map((k) => {
    const c = counts[k];
    return `<tr data-key="${k}"><th scope="row">${esc(t(COPY.facts[k], l))}</th><td data-col="yes">${c.yes}</td><td data-col="no">${c.no}</td><td data-col="unknown">${c.unknown}</td></tr>`;
  }).join("");
  return (
    `<div class="table-wrap" role="region" aria-labelledby="fs-counts-caption" tabindex="0"><table class="fs-counts">` +
    `<caption id="fs-counts-caption">${esc(t(C.countsCaption, l))}</caption>` +
    `<thead><tr><th scope="col">${esc(t(C.countsDetail, l))}</th><th scope="col">${esc(t(C.countsYes, l))}</th><th scope="col">${esc(t(C.countsNo, l))}</th><th scope="col">${esc(t(C.countsUnknown, l))}</th></tr></thead>` +
    `<tbody>${rows}</tbody></table></div>` +
    `<p class="hint">${esc(t(C.notRanked, l))}</p>`
  );
}

function link(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

export function renderSplitDownloads(ctx: FileSplitContext, split: Split): string {
  const l = ctx.locale;
  const head = `<h3 id="fs-chosen">${esc(groupHeading(t(C.chosenTitle, l), split.chosen.length))}</h3>`;
  if (split.chosen.length === 0) return `${head}<p>${esc(t(C.noneChosen, l))}</p>`;
  return (
    head +
    renderCounts(split, l) +
    `<p>${link(exportHref(partExport(split.chosen, ctx.today)), splitFilename("chosen", ctx.today, l), t(C.downloadChosen, l))}</p>` +
    `<p>${link(csvHref(notesToCsv(split.chosen)), splitFilename("csv", ctx.today, l), t(C.downloadCsv, l))}</p>` +
    (split.rest.length === 0
      ? `<p>${esc(t(C.allChosen, l))}</p>`
      : `<p>${link(exportHref(partExport(split.rest, ctx.today)), splitFilename("rest", ctx.today, l), t(C.downloadRest, l))}</p>`)
  );
}

export function renderFileSplit(ctx: FileSplitContext): string {
  const l = ctx.locale;
  const err = ctx.fileError;
  return (
    `<div class="app filesplit-app" lang="${l}"><section lang="${l}" aria-labelledby="fs-title" class="filesplit">` +
    `<h2 id="fs-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="fs-status">${esc(ctx.statusMessage)}</p>` : "") +
    renderSplitErrors(ctx) +
    `<form id="fs-file-form" novalidate>` +
    `<label for="${SPLIT_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${SPLIT_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${SPLIT_TEXT_ID}" class="error">${esc(splitErrorText(err, l))}</p>` : "") +
    `<textarea id="${SPLIT_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${SPLIT_TEXT_ID}${err ? ` e-${SPLIT_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${SPLIT_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${SPLIT_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "fs-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "fs-clear", class: "secondary" })}</p>` +
    (ctx.file && ctx.split
      ? `<p id="fs-file-read" tabindex="-1">${esc(fileReadText(ctx.file.notes.length, ctx.file.leftOut, l))}</p>` +
        renderFilters(ctx, ctx.file) +
        renderNoteList(ctx, ctx.file, ctx.split) +
        renderSplitDownloads(ctx, ctx.split)
      : "") +
    `</section></div>`
  );
}
