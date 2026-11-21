import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, groupHeading, t } from "./copy";
import { exportHref } from "./exchange";
import { FACT_KEYS } from "./facts";
import { CLASH_CHOICES, MAX_FILES, applyChoices, clashChoice, mergedExport, cleanLabel, type Choices, type Clash, type Copy, type FileProblem, type MergePlan } from "./filemerge";
import {
  FILE_MERGE_COPY as C,
  choiceText,
  clashLegend,
  copyText,
  fileName,
  fileProblemText,
  fileSummaryText,
  mergeFilename,
  removeFileText,
} from "./filemerge-copy";
import { mergeText, mergeTotals } from "./filemerge-text";
import { FILE_COMPARE_COPY } from "./filecompare-copy";
import { button, esc } from "./html";
import { LIMITS, noteFact, type Note } from "./model";
import type { Resolution } from "./places";
import { downloadLink } from "./views-sources";
import { resolutionBody } from "./views-places";

/** A file in the list, with what the App reads in it. */
export interface ListedFile {
  readonly label: string;
  readonly text: string;
  readonly notes: number;
  readonly leftOut: number;
  /** Set when the file cannot be read at all. */
  readonly unreadable: boolean;
}

export type MergeFormError = "empty-paste" | "need-two" | "too-many";

export interface FileMergeContext {
  readonly files: readonly ListedFile[];
  readonly pasteText: string;
  readonly pasteLabel: string;
  readonly formError: MergeFormError | undefined;
  readonly plan: MergePlan | undefined;
  /** Files the last combine could not use. */
  readonly problems: readonly FileProblem[];
  readonly choices: Choices;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const PASTE_ID = "fm-text";
export const LABEL_ID = "fm-name";
export const OPEN_ID = "fm-open";

const INPUT_STYLE = 'style="min-height:44px"';
const CHOICE_STYLE = 'style="min-height:44px;min-width:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

const FORM_ERROR: Readonly<Record<MergeFormError, keyof typeof C>> = { "empty-paste": "emptyPaste", "need-two": "needTwo", "too-many": "tooMany" };

export function formErrorText(e: MergeFormError, l: Locale): string {
  return t(C[FORM_ERROR[e]] as { en: string; fr: string }, l);
}

export function clashRadioId(index: number, choice: string): string {
  return `fm-clash-${index}-${choice}`;
}

export function copyBoxId(index: number): string {
  return `fm-copy-${index}`;
}

/** The field each form error points at. */
function errorTarget(e: MergeFormError): string {
  return e === "empty-paste" ? PASTE_ID : e === "too-many" ? "fm-files" : PASTE_ID;
}

export function renderMergeErrors(ctx: FileMergeContext): string {
  const l = ctx.locale;
  const items: string[] = [];
  if (ctx.formError) items.push(`<li><a href="#${errorTarget(ctx.formError)}">${esc(formErrorText(ctx.formError, l))}</a></li>`);
  for (const p of ctx.problems) items.push(`<li><a href="#fm-file-${p.index}">${esc(fileProblemText(p.index, p.label, p.error, l))}</a></li>`);
  if (items.length === 0) return "";
  return `<div id="fm-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${items.join("")}</ul></div>`;
}

export function renderFileList(ctx: FileMergeContext): string {
  const l = ctx.locale;
  const head = `<h3 id="fm-files" tabindex="-1">${esc(groupHeading(t(C.filesTitle, l), ctx.files.length))}</h3>`;
  if (ctx.files.length === 0) return `${head}<p>${esc(t(C.noFiles, l))}</p>`;
  const items = ctx.files
    .map((f, i) => {
      const summary = f.unreadable ? t(C.errors["not-json"], l) : fileSummaryText(f.notes, f.leftOut, l);
      const label = cleanLabel(f.label, i);
      return (
        `<li id="fm-file-${i}" data-file="${i}" tabindex="-1"><span data-user-content>${esc(fileName(i, label, l))}</span>${l === "fr" ? NB : ""}: ${esc(summary)} ` +
        button(removeFileText(i, label, l), { "data-action": "fm-remove", "data-value": String(i), class: "secondary" }) +
        `</li>`
      );
    })
    .join("");
  return (
    head +
    `<ul class="fm-files">${items}</ul>` +
    `<p>${button(t(C.combine, l), { "data-action": "fm-combine" })}${button(t(C.clearAll, l), { "data-action": "fm-clear", class: "secondary" })}</p>`
  );
}

/** One detail of one version, in the App's own detail wording, so source, licence and date always show. */
function versionCell(n: Note, key: (typeof FACT_KEYS)[number], l: Locale, today: Date): string {
  const f = noteFact(n, key);
  const r: Resolution =
    f.value === "unknown" || !f.provenance ? { kind: "unknown" } : { kind: "agree", value: f.value, observations: [{ noteId: n.id, value: f.value, provenance: f.provenance }] };
  return `<td>${resolutionBody(key, r, l, today)}</td>`;
}

function versionFacts(n: Note, l: Locale): string {
  const k = l === "fr" ? `${NB}:` : ":";
  const parts = [
    `<span data-user-content>${esc(n.placeName)}</span>`,
    n.address ? `<span data-user-content>${esc(n.address)}</span>` : esc(t(COPY.similar.noAddress, l)),
    `Licence${k} ${esc(n.licence)}`,
    esc(n.createdOn),
  ];
  return parts.join(", ");
}

/** "File 2 (sam.json)": the file's name as the person gave it. */
function fileOf(plan: MergePlan | undefined, index: number, l: Locale): string {
  const f = plan?.files.find((x) => x.index === index);
  return fileName(index, f?.label ?? `#${index + 1}`, l);
}

export function renderClash(c: Clash, i: number, ctx: FileMergeContext): string {
  const l = ctx.locale;
  const a = fileOf(ctx.plan, c.first.file, l);
  const b = fileOf(ctx.plan, c.later.file, l);
  const chosen = clashChoice(ctx.choices, c.key);
  const cap = `fm-clash-cap-${i}`;
  const radios = CLASH_CHOICES.map((ch) => {
    const id = clashRadioId(i, ch);
    return `<label class="choice" for="${id}" ${CHOICE_STYLE}><input type="radio" id="${id}" name="fm-clash-${i}" value="${ch}" data-clash="${esc(c.key)}"${chosen === ch ? " checked" : ""}>${esc(choiceText(ch, l))}</label>`;
  }).join("");
  const rows = FACT_KEYS.map((k) => `<tr><th scope="row">${esc(t(COPY.facts[k], l))}</th>${versionCell(c.first.note, k, l, ctx.today)}${versionCell(c.later.note, k, l, ctx.today)}</tr>`).join("");
  return (
    `<div class="fm-clash" data-clash="${esc(c.key)}">` +
    `<h4 id="fm-clash-h-${i}"><span data-user-content>${esc(clashLegend(c.first.note.placeName, c.id, c.first.file, c.later.file, l))}</span></h4>` +
    `<p><span data-user-content>${esc(a)}</span>${l === "fr" ? NB : ""}: ${versionFacts(c.first.note, l)}</p>` +
    `<p><span data-user-content>${esc(b)}</span>${l === "fr" ? NB : ""}: ${versionFacts(c.later.note, l)}</p>` +
    `<div class="table-wrap" role="region" aria-labelledby="${cap}" tabindex="0"><table class="compare"><caption id="${cap}"><span data-user-content>${esc(c.first.note.placeName)}</span></caption>` +
    `<thead><tr><th scope="col">${esc(t(FILE_COMPARE_COPY.detailColumn, l))}</th><th scope="col"><span data-user-content>${esc(a)}</span></th><th scope="col"><span data-user-content>${esc(b)}</span></th></tr></thead>` +
    `<tbody>${rows}</tbody></table></div>` +
    `<fieldset><legend><span data-user-content>${esc(clashLegend(c.first.note.placeName, c.id, c.first.file, c.later.file, l))}</span></legend>${radios}</fieldset>` +
    `</div>`
  );
}

export function renderCopy(c: Copy, i: number, ctx: FileMergeContext): string {
  const l = ctx.locale;
  const id = copyBoxId(i);
  const on = ctx.choices.dropCopies.includes(c.key);
  return (
    `<li data-copy="${esc(c.key)}"><span data-user-content>${esc(copyText(c.copy.note.id, c.kept.note.placeName, c.kept.note.id, c.kept.file, l))}</span> ` +
    `<label class="choice" for="${id}" ${CHOICE_STYLE}><input type="checkbox" id="${id}" data-copy="${esc(c.key)}"${on ? " checked" : ""}>${esc(`${t(C.dropCopy, l)} (${c.copy.note.id})`)}</label></li>`
  );
}

function jsonLink(text: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(exportHref(text))}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

export function renderMergeResults(plan: MergePlan, ctx: FileMergeContext): string {
  const l = ctx.locale;
  const result = applyChoices(plan, ctx.choices);
  const rows = mergeTotals(plan, result, l)
    .map(([name, n], i) => `<tr data-row="${i}"><th scope="row">${esc(name)}</th><td>${n}</td></tr>`)
    .join("");
  const clashes =
    plan.clashes.length === 0
      ? ""
      : `<h3 id="fm-clashes">${esc(groupHeading(t(C.clashesTitle, l), plan.clashes.length))}</h3><p class="hint">${esc(t(C.clashesIntro, l))}</p>` +
        plan.clashes.map((c, i) => renderClash(c, i, ctx)).join("");
  const copies =
    plan.copies.length === 0
      ? ""
      : `<h3 id="fm-copies">${esc(groupHeading(t(C.copiesTitle, l), plan.copies.length))}</h3><p class="hint">${esc(t(C.copiesIntro, l))}</p>` +
        `<ul class="fm-copies">${plan.copies.map((c, i) => renderCopy(c, i, ctx)).join("")}</ul>`;
  return (
    `<h3 id="fm-results" tabindex="-1">${esc(t(C.resultsTitle, l))}</h3>` +
    `<div class="table-wrap" role="region" aria-labelledby="fm-totals-caption" tabindex="0"><table class="fm-totals"><caption id="fm-totals-caption">${esc(t(C.totalsCaption, l))}</caption>` +
    `<thead><tr><th scope="col">${esc(t(C.totalsWhat, l))}</th><th scope="col">${esc(t(C.totalsCount, l))}</th></tr></thead><tbody>${rows}</tbody></table></div>` +
    (result.overDeviceLimit ? `<p class="notice">${esc(t(C.overLimit, l))}</p>` : "") +
    `<p>${jsonLink(mergedExport(result, ctx.today), mergeFilename("notes", ctx.today, l), t(C.download, l))}</p>` +
    `<p>${downloadLink(mergeText(plan, ctx.choices, result, l, ctx.today), mergeFilename("report", ctx.today, l), l, C.downloadReport)}</p>` +
    clashes +
    copies
  );
}

export function renderFileMerge(ctx: FileMergeContext): string {
  const l = ctx.locale;
  const pasteError = ctx.formError === "empty-paste";
  return (
    `<div class="app filemerge-app" lang="${l}"><section lang="${l}" aria-labelledby="fm-title" class="filemerge">` +
    `<h2 id="fm-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="fm-status">${esc(ctx.statusMessage)}</p>` : "") +
    renderMergeErrors(ctx) +
    `<form id="fm-form" novalidate>` +
    `<label for="${LABEL_ID}">${esc(t(C.nameLabel, l))}</label>` +
    `<input id="${LABEL_ID}" name="label" type="text" autocomplete="off" maxlength="80" value="${esc(ctx.pasteLabel)}" ${INPUT_STYLE}>` +
    `<label for="${PASTE_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${PASTE_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (pasteError ? `<p id="e-${PASTE_ID}" class="error">${esc(formErrorText("empty-paste", l))}</p>` : "") +
    `<textarea id="${PASTE_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${PASTE_ID}${pasteError ? ` e-${PASTE_ID}` : ""}"${pasteError ? ' aria-invalid="true"' : ""} ${INPUT_STYLE}>${esc(ctx.pasteText)}</textarea>` +
    `<p>${button(t(C.add, l), { type: "submit", "data-action": "fm-add" })}</p>` +
    `<label for="${OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${OPEN_ID}" type="file" multiple accept=".json,application/json,text/plain" ${INPUT_STYLE}>` +
    `</form>` +
    renderFileList(ctx) +
    (ctx.files.length >= MAX_FILES ? `<p class="hint">${esc(t(C.tooMany, l))}</p>` : "") +
    (ctx.plan ? renderMergeResults(ctx.plan, ctx) : "") +
    `</section></div>`
  );
}
