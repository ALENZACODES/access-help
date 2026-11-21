import type { Locale } from "../../switch-first/src/index";
import { COPY, groupHeading, t } from "./copy";
import { exportHref, type ImportError } from "./exchange";
import { MAX_REPORTED, cleanedCopy, droppedEntries, fileIsClean, leftOutEntries, noticedEntries, type EntryReport, type FileCheck } from "./filecheck";
import { FILE_CHECK_COPY as C, checkErrorText, checkFilename, droppedText, entryLabel, leftOutText, noticeText } from "./filecheck-copy";
import { checkText, totalsRows } from "./filecheck-text";
import { button, esc } from "./html";
import { LIMITS } from "./model";
import { downloadLink } from "./views-sources";

export interface FileCheckContext {
  readonly text: string;
  readonly error: ImportError | undefined;
  /** Undefined until the file has been checked. */
  readonly check: FileCheck | undefined;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const CHECK_TEXT_ID = "fk-text";
export const CHECK_OPEN_ID = "fk-open";

const INPUT_STYLE = 'style="min-height:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

export function renderCheckError(error: ImportError | undefined, l: Locale): string {
  if (!error) return "";
  return (
    `<div id="fk-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3>` +
    `<ul><li><a href="#${CHECK_TEXT_ID}">${esc(checkErrorText(error, l))}</a></li></ul></div>`
  );
}

/** The entry's name and id come from the file, so they are marked as the file's own text. */
function entryHead(e: EntryReport, l: Locale): string {
  return `<span data-user-content>${esc(entryLabel(e.position, e.note?.placeName ?? e.name, e.note?.id ?? e.id, l))}</span>`;
}

export function renderCheckTotals(c: FileCheck, l: Locale): string {
  const rows = totalsRows(c, l)
    .map(([name, n], i) => `<tr data-row="${i}"><th scope="row">${esc(name)}</th><td>${n}</td></tr>`)
    .join("");
  return (
    `<div class="table-wrap" role="region" aria-labelledby="fk-totals-caption" tabindex="0">` +
    `<table class="fk-totals"><caption id="fk-totals-caption">${esc(t(C.totalsCaption, l))}</caption>` +
    `<thead><tr><th scope="col">${esc(t(C.totalsWhat, l))}</th><th scope="col">${esc(t(C.totalsCount, l))}</th></tr></thead>` +
    `<tbody>${rows}</tbody></table></div>`
  );
}

function listOrNone(items: string[], cls: string, l: Locale): string {
  return items.length === 0 ? `<p>${esc(t(C.none, l))}</p>` : `<ul class="${cls}">${items.join("")}</ul>`;
}

export function renderLeftOut(c: FileCheck, l: Locale): string {
  const items = leftOutEntries(c).map(
    (e) => `<li data-position="${e.position}">${entryHead(e, l)}. ${esc(leftOutText(e.problems, l))}</li>`,
  );
  return `<h3 id="fk-left-out">${esc(groupHeading(t(C.leftOutTitle, l), c.totals.leftOut))}</h3>${listOrNone(items, "fk-left-out", l)}`;
}

export function renderDropped(c: FileCheck, l: Locale): string {
  const items = droppedEntries(c).map(
    (e) =>
      `<li data-position="${e.position}">${entryHead(e, l)}<ul>` +
      e.dropped.map((d) => `<li data-key="${d.key}">${esc(droppedText(t(COPY.facts[d.key], l), d.value, d.reasons, l))}</li>`).join("") +
      `</ul></li>`,
  );
  return (
    `<h3 id="fk-dropped">${esc(groupHeading(t(C.droppedTitle, l), c.totals.dropped))}</h3>` +
    `<p class="hint">${esc(t(C.droppedIntro, l))}</p>` +
    listOrNone(items, "fk-dropped", l)
  );
}

export function renderNotices(c: FileCheck, l: Locale): string {
  const noticed = noticedEntries(c);
  const items = noticed.map(
    (e) =>
      `<li data-position="${e.position}">${entryHead(e, l)}<ul>` +
      e.notices.map((n) => `<li data-notice="${n}">${esc(noticeText(n, l))}.</li>`).join("") +
      `</ul></li>`,
  );
  return (
    `<h3 id="fk-notices">${esc(groupHeading(t(C.noticesTitle, l), noticed.length))}</h3>` +
    `<p class="hint">${esc(t(C.noticesIntro, l))}</p>` +
    listOrNone(items, "fk-notices", l)
  );
}

function jsonLink(text: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(exportHref(text))}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

export function renderDownloads(c: FileCheck, l: Locale, today: Date): string {
  const report = downloadLink(checkText(c, l, today), checkFilename("report", today, l), l, C.downloadReport);
  if (c.readable.length === 0) {
    return `<h3 id="fk-downloads">${esc(t(C.downloadsTitle, l))}</h3><p>${esc(t(C.noReadable, l))}</p><p>${report}</p>`;
  }
  const withWords = c.readable.some((n) => n.note !== undefined);
  return (
    `<h3 id="fk-downloads">${esc(t(C.downloadsTitle, l))}</h3>` +
    `<p class="hint">${esc(t(C.downloadsIntro, l))}</p>` +
    `<p>${jsonLink(cleanedCopy(c, today, true), checkFilename("clean", today, l), t(C.downloadClean, l))}</p>` +
    (withWords ? `<p>${jsonLink(cleanedCopy(c, today, false), checkFilename("no-words", today, l), t(C.downloadNoWords, l))}</p>` : "") +
    `<p>${report}</p>`
  );
}

export function renderCheckResults(c: FileCheck, l: Locale, today: Date): string {
  return (
    `<h3 id="fk-results" tabindex="-1">${esc(t(C.resultsTitle, l))}</h3>` +
    (c.exportedOn ? `<p>${esc(`${t(C.exported, l)} ${c.exportedOn}.`)}</p>` : "") +
    renderCheckTotals(c, l) +
    (fileIsClean(c) ? `<p class="notice">${esc(t(C.clean, l))}</p>` : "") +
    renderLeftOut(c, l) +
    renderDropped(c, l) +
    renderNotices(c, l) +
    (c.totals.entries > MAX_REPORTED ? `<p class="hint">${esc(t(C.moreEntries, l))}</p>` : "") +
    renderDownloads(c, l, today)
  );
}

export function renderFileCheck(ctx: FileCheckContext): string {
  const l = ctx.locale;
  const err = ctx.error ? `<p id="e-${CHECK_TEXT_ID}" class="error">${esc(checkErrorText(ctx.error, l))}</p>` : "";
  const describedBy = ctx.error ? `h-${CHECK_TEXT_ID} e-${CHECK_TEXT_ID}` : `h-${CHECK_TEXT_ID}`;
  return (
    `<div class="app filecheck-app" lang="${l}"><section lang="${l}" aria-labelledby="fk-title" class="filecheck">` +
    `<h2 id="fk-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="fk-status">${esc(ctx.statusMessage)}</p>` : "") +
    renderCheckError(ctx.error, l) +
    `<form id="fk-form" novalidate>` +
    `<label for="${CHECK_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${CHECK_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    err +
    `<textarea id="${CHECK_TEXT_ID}" name="text" rows="8" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="${describedBy}"${ctx.error ? ' aria-invalid="true"' : ""} ${INPUT_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${CHECK_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${CHECK_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${INPUT_STYLE}>` +
    `<p>${button(t(C.check, l), { type: "submit", "data-action": "fk-check" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "fk-clear", class: "secondary" })}</p>` +
    (ctx.check ? renderCheckResults(ctx.check, l, ctx.today) : "") +
    `</section></div>`
  );
}
