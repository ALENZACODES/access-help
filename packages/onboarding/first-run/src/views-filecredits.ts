import type { Locale } from "../../switch-first/src/index";
import { NB, t } from "./copy";
import { collectCredits, creditsCsv, excludedFile, recordsCsv, licencesInFile, makeCopy, renamesFor, sourceVariants, type CreditLicence, type Credits, type SourceVariants } from "./credits";
import { exportHref, type ImportError } from "./exchange";
import {
  FILE_CREDITS_COPY as C,
  LICENCE_INFO,
  creditsErrorText,
  creditsFilename,
  creditsMarkdown,
  creditsSummary,
  creditsText,
  excludedSummary,
  licenceSummary,
  leftOutText,
  licenceTitle,
  outsideAreaText,
  sourceCountText,
} from "./filecredits-copy";
import type { StreetFile } from "./filestreets";
import { button, esc } from "./html";
import { FIRST_LIMITS, inArea } from "./lookfirst";
import { LIMITS, type Note } from "./model";
import { csvHref } from "./notes-csv";
import { sourceName } from "./sources";
import { textExportHref } from "./textexport";

/** A problem with the licences chosen to leave out. */
export type LeaveOutError = "none" | "nothing-left";

/** A problem with the address text: too long, or no place matches it. */
export type AreaError = "long" | "none";

export interface FileCreditsContext {
  readonly text: string;
  readonly error: ImportError | "no-notes" | undefined;
  readonly file: StreetFile | undefined;
  /** The licences ticked on the page. */
  readonly checked: readonly string[];
  /** The licences the copy on screen leaves out. */
  readonly leaveOut: readonly string[];
  /** The spelling picked on the page for each group of source spellings, by group key. */
  readonly picks: Readonly<Record<string, string>>;
  /** The spellings the copy on screen uses. */
  readonly appliedPicks: Readonly<Record<string, string>>;
  readonly leaveOutError: LeaveOutError | undefined;
  /** The address text the credits and the copy are limited to; empty for the whole file. */
  readonly area: string;
  /** The address text as typed, kept when it is wrong. */
  readonly areaText: string;
  readonly areaError: AreaError | undefined;
  /** True once the person asked for the copy with the current choice. */
  readonly copyMade: boolean;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const CREDITS_TEXT_ID = "fcr-text";
export const CREDITS_OPEN_ID = "fcr-open";
export const AREA_ID = "fcr-area";

const FIELD_STYLE = 'style="min-height:44px"';
const CHOICE_STYLE = 'style="min-height:44px;min-width:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

/** The notes of the file: every readable note of every place, or of the places whose address holds the area text. */
export function fileNotes(file: StreetFile, area = ""): Note[] {
  return file.places.filter((p) => inArea(p, area)).flatMap((p) => [...p.notes]);
}

/** Places left out by the area text. */
export function outsideArea(file: StreetFile, area: string): number {
  return file.places.filter((p) => !inArea(p, area)).length;
}

/** Why an address text cannot be used, if it cannot. */
export function areaProblem(file: StreetFile, text: string): AreaError | undefined {
  const area = text.trim();
  if (area.length > FIRST_LIMITS.area) return "long";
  return area !== "" && outsideArea(file, area) === file.places.length ? "none" : undefined;
}

export function renderArea(ctx: FileCreditsContext): string {
  const l = ctx.locale;
  const err = ctx.areaError === "long" ? t(C.areaTooLong, l) : ctx.areaError === "none" ? t(C.areaNone, l) : undefined;
  return (
    `<h3 id="fcr-part">${esc(t(C.partTitle, l))}</h3><form id="fcr-area-form" novalidate>` +
    `<label for="${AREA_ID}">${esc(t(C.areaLabel, l))}</label><p id="h-${AREA_ID}" class="hint">${esc(t(C.areaHint, l))}</p>` +
    (err ? `<p id="e-${AREA_ID}" class="error">${esc(err)}</p>` : "") +
    `<input id="${AREA_ID}" name="area" type="text" autocomplete="off" maxlength="${FIRST_LIMITS.area + 20}" value="${esc(ctx.areaText)}" aria-describedby="h-${AREA_ID}${err ? ` e-${AREA_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>` +
    `<p>${button(t(C.updateCredits, l), { type: "submit", "data-action": "fcr-area" })}</p></form>`
  );
}

export function leaveOutId(index: number): string {
  return `fcr-out-${index}`;
}

export function variantId(index: number): string {
  return `fcr-variant-${index}`;
}

/** A download link target for Markdown text. */
export function markdownHref(md: string): string {
  return `data:text/markdown;charset=utf-8,${encodeURIComponent(md)}`;
}

function download(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

export function renderLicence(lic: CreditLicence, index: number, l: Locale): string {
  const k = l === "fr" ? `${NB}:` : ":";
  const summary = licenceSummary(lic.licence, l);
  const url = LICENCE_INFO[lic.licence]?.url;
  const sources =
    lic.sources.length === 0
      ? `<p class="hint">${esc(t(C.noRecords, l))}</p>`
      : `<ul class="fcr-sources">${lic.sources
          .map((s) => `<li><span data-user-content>${esc(sourceName(s.source, l))}</span>${esc(k)} ${esc(sourceCountText(s, l))}</li>`)
          .join("")}</ul>`;
  return (
    `<li data-licence="${esc(lic.licence)}"><h4 id="fcr-licence-${index}">${esc(licenceTitle(lic.licence))}</h4>` +
    (summary ? `<p>${esc(summary)}</p>` : "") +
    (url ? `<p><a class="linkbtn" href="${esc(url)}" rel="noopener" style="${LINK_STYLE}">${esc(`${t(C.licenceText, l)} (${lic.licence})`)}</a></p>` : "") +
    sources +
    `</li>`
  );
}

export function renderLeaveOut(ctx: FileCreditsContext, credits: Credits): string {
  const l = ctx.locale;
  const err = ctx.leaveOutError;
  const errText = err === "none" ? t(C.noneChosen, l) : err === "nothing-left" ? t(C.nothingLeft, l) : undefined;
  const boxes = licencesInFile(credits)
    .map(
      (lic, i) =>
        `<label class="choice" for="${leaveOutId(i)}" ${CHOICE_STYLE}><input type="checkbox" id="${leaveOutId(i)}" name="leave-out" value="${esc(lic)}"${ctx.checked.includes(lic) ? " checked" : ""}>${esc(licenceTitle(lic))}</label>`,
    )
    .join("");
  const variants = sourceVariants(fileNotes(ctx.file as StreetFile, ctx.area));
  return (
    `<h3 id="fcr-leave">${esc(t(C.shareTitle, l))}</h3>` +
    `<form id="fcr-leave-form" novalidate>` +
    (errText ? `<p id="e-fcr-leave" class="error">${esc(errText)}</p>` : "") +
    `<fieldset><legend>${esc(t(C.leaveOutLegend, l))}</legend>` +
    `<p class="hint">${esc(t(C.leaveOutHint, l))}</p>${boxes}</fieldset>` +
    renderVariants(variants, ctx.picks, l) +
    `<p>${button(t(C.makeCopy, l), { type: "submit", "data-action": "fcr-copy" })}</p></form>`
  );
}

/** For each group of spellings of what may be one source, a choice of how to write it in the copy. */
export function renderVariants(variants: readonly SourceVariants[], picks: Readonly<Record<string, string>>, l: Locale): string {
  if (variants.length === 0) return "";
  const k = l === "fr" ? `${NB}:` : ":";
  const groups = variants
    .map((v, i) => {
      const id = variantId(i);
      const options =
        `<option value=""${picks[v.key] === undefined ? " selected" : ""}>${esc(t(C.keepAsIs, l))}</option>` +
        v.spellings.map((s) => `<option value="${esc(s.source)}"${picks[v.key] === s.source ? " selected" : ""}>${esc(s.source)}</option>`).join("");
      const names = v.spellings.map((s) => `<span data-user-content>${esc(s.source)}</span>`).join(" / ");
      return `<label for="${id}">${esc(t(C.writeAs, l))}${esc(k)} ${names}</label><select id="${id}" name="variant" data-key="${esc(v.key)}" ${FIELD_STYLE}>${options}</select>`;
    })
    .join("");
  return `<fieldset><legend>${esc(t(C.variantsLegend, l))}</legend><p class="hint">${esc(t(C.variantsHint, l))}</p>${groups}</fieldset>`;
}

/** The copy as it is on screen: the licences left out and the spellings chosen when it was made. */
export function copyFor(ctx: FileCreditsContext, file: StreetFile): ReturnType<typeof makeCopy> {
  const notes = fileNotes(file, ctx.area);
  return makeCopy(notes, ctx.leaveOut, renamesFor(sourceVariants(notes), ctx.appliedPicks));
}

export function renderCopy(ctx: FileCreditsContext, file: StreetFile): string {
  if (!ctx.copyMade || ctx.leaveOutError) return "";
  const l = ctx.locale;
  const e = copyFor(ctx, file);
  if (e.notes.length === 0) return "";
  return (
    `<h3 id="fcr-copy" tabindex="-1">${esc(t(C.copyTitle, l))}</h3>` +
    `<p id="fcr-copy-summary">${esc(excludedSummary(e, l))}</p>` +
    `<p>${download(exportHref(excludedFile(e, ctx.today)), creditsFilename("copy", ctx.today, l), t(C.downloadCopy, l))}</p>`
  );
}

export function renderCredits(ctx: FileCreditsContext, file: StreetFile): string {
  const l = ctx.locale;
  const notes = fileNotes(file, ctx.area);
  const credits = collectCredits(notes);
  const outside = ctx.area === "" ? 0 : outsideArea(file, ctx.area);
  const leftOut = [...(file.leftOut > 0 ? [leftOutText(file.leftOut, l)] : []), ...(outside > 0 ? [outsideAreaText(outside, ctx.area, l)] : [])];
  return (
    `<p id="fcr-summary" tabindex="-1">${esc(creditsSummary(credits, l))}</p>` +
    (leftOut.length > 0 ? `<p id="fcr-left-out">${esc(leftOut.join(" "))}</p>` : "") +
    renderArea(ctx) +
    `<p>${download(textExportHref(creditsText(credits, l, ctx.today)), creditsFilename("text", ctx.today, l), t(C.downloadText, l))}</p>` +
    `<p class="hint">${esc(t(C.textHint, l))}</p>` +
    `<p>${download(markdownHref(creditsMarkdown(credits, l, ctx.today)), creditsFilename("markdown", ctx.today, l), t(C.downloadMarkdown, l))}</p>` +
    `<p>${download(csvHref(creditsCsv(credits)), creditsFilename("csv", ctx.today, l), t(C.downloadCsv, l))}</p>` +
    `<p>${download(csvHref(recordsCsv(notes)), creditsFilename("records", ctx.today, l), t(C.downloadRecords, l))}</p>` +
    `<p class="hint">${esc(t(C.recordsHint, l))}</p>` +
    `<h3 id="fcr-licences">${esc(`${t(C.licencesTitle, l)} (${credits.licences.length})`)}</h3>` +
    `<p class="hint">${esc(t(C.notAdvice, l))}</p>` +
    `<ul class="fcr-licences">${credits.licences.map((x, i) => renderLicence(x, i, l)).join("")}</ul>` +
    renderLeaveOut(ctx, credits) +
    renderCopy(ctx, file)
  );
}

export function renderFileCredits(ctx: FileCreditsContext): string {
  const l = ctx.locale;
  const err = ctx.error;
  const leaveText = ctx.leaveOutError === "none" ? t(C.noneChosen, l) : ctx.leaveOutError === "nothing-left" ? t(C.nothingLeft, l) : undefined;
  const areaText = ctx.areaError === "long" ? t(C.areaTooLong, l) : ctx.areaError === "none" ? t(C.areaNone, l) : undefined;
  const errors = [
    ...(err ? [`<li><a href="#${CREDITS_TEXT_ID}">${esc(creditsErrorText(err, l))}</a></li>`] : []),
    ...(areaText ? [`<li><a href="#${AREA_ID}">${esc(areaText)}</a></li>`] : []),
    ...(leaveText ? [`<li><a href="#${leaveOutId(0)}">${esc(leaveText)}</a></li>`] : []),
  ];
  return (
    `<div class="app filecredits-app" lang="${l}"><section lang="${l}" aria-labelledby="fcr-title" class="filecredits">` +
    `<h2 id="fcr-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="fcr-status">${esc(ctx.statusMessage)}</p>` : "") +
    (errors.length > 0 ? `<div id="fcr-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${errors.join("")}</ul></div>` : "") +
    `<form id="fcr-file-form" novalidate>` +
    `<label for="${CREDITS_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${CREDITS_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${CREDITS_TEXT_ID}" class="error">${esc(creditsErrorText(err, l))}</p>` : "") +
    `<textarea id="${CREDITS_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${CREDITS_TEXT_ID}${err ? ` e-${CREDITS_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${CREDITS_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${CREDITS_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "fcr-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "fcr-clear", class: "secondary" })}</p>` +
    (ctx.file ? renderCredits(ctx, ctx.file) : "") +
    `</section></div>`
  );
}

/** The licences checked on the page. */
export function readLeaveOut(root: ParentNode): string[] {
  return Array.from(root.querySelectorAll<HTMLInputElement>('input[name="leave-out"]:checked')).map((b) => b.value);
}

/** The spelling picked for each group on the page; "Leave as they are" picks nothing. */
export function readPicks(root: ParentNode): Record<string, string> {
  const out: Record<string, string> = {};
  for (const sel of Array.from(root.querySelectorAll<HTMLSelectElement>('select[name="variant"]'))) {
    const key = sel.dataset["key"];
    if (key !== undefined && sel.value !== "") out[key] = sel.value;
  }
  return out;
}

/** Why a choice cannot make a copy, if it cannot: nothing chosen, or no note left. */
export function leaveOutProblem(file: StreetFile, leaveOut: readonly string[], picks: Readonly<Record<string, string>> = {}, area = ""): LeaveOutError | undefined {
  const notes = fileNotes(file, area);
  const renames = renamesFor(sourceVariants(notes), picks);
  if (leaveOut.length === 0 && Object.keys(renames).length === 0) return "none";
  return makeCopy(notes, leaveOut, renames).notes.length === 0 ? "nothing-left" : undefined;
}
