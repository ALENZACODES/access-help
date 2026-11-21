import type { Locale } from "../../switch-first/src/index";
import { t } from "./copy";
import { exportHref, type ImportError } from "./exchange";
import {
  FILE_REPLACE_COPY as C,
  acceptLabel,
  changeText,
  copySummary,
  hitHeading,
  placesLine,
  hitProblemText,
  optionProblemText,
  replaceErrorText,
  replaceFilename,
  replaceSummary,
} from "./filereplace-copy";
import type { StreetFile } from "./filestreets";
import { button, esc } from "./html";
import { LIMITS } from "./model";
import { csvHref } from "./notes-csv";
import {
  MAX_FIND,
  MAX_REPLACE,
  REPLACE_FIELDS,
  applyReplace,
  copyPlaces,
  replaceChanges,
  replaceCsv,
  replacedFile,
  type Hit,
  type OptionProblem,
  type ReplaceField,
  type ReplaceOptions,
  type ReplaceReport,
} from "./textreplace";

export interface FileReplaceContext {
  readonly text: string;
  readonly error: ImportError | "no-notes" | undefined;
  readonly file: StreetFile | undefined;
  /** The options as on the form, kept as typed even when they have a problem. */
  readonly form: ReplaceOptions;
  readonly problems: readonly OptionProblem[];
  /** The changes for the last options without a problem; undefined before any are shown. */
  readonly report: ReplaceReport | undefined;
  /** The options the report was made with. */
  readonly options: ReplaceOptions | undefined;
  /** Changes ticked, by id. */
  readonly accepted: ReadonlySet<string>;
  /** No change that can be made is ticked when the copy is asked for. */
  readonly noneError: boolean;
  /** The changes the copy on screen was made with; undefined before one is made. */
  readonly made: ReadonlySet<string> | undefined;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const REPLACE_TEXT_ID = "fre-text";
export const REPLACE_OPEN_ID = "fre-open";
export const FIND_ID = "fre-find";
export const WITH_ID = "fre-with";
export const CASE_ID = "fre-case";
export const WHOLE_ID = "fre-whole";

const FIELD_STYLE = 'style="min-height:44px"';
const CHOICE_STYLE = 'style="min-height:44px;min-width:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

export const fieldBoxId = (f: ReplaceField): string => `fre-in-${f}`;
export const acceptId = (i: number): string => `fre-accept-${i}`;

/** The field a problem with the options is about. */
export function problemTarget(p: OptionProblem): string {
  if (p.startsWith("find")) return FIND_ID;
  if (p.startsWith("replace")) return WITH_ID;
  return fieldBoxId(REPLACE_FIELDS[0] ?? "name");
}

/** The text with each match marked, everything escaped. */
export function markedBefore(h: Hit): string {
  let out = "";
  let at = 0;
  for (const m of h.matches) {
    out += esc(h.before.slice(at, m.start)) + `<mark>${esc(h.before.slice(m.start, m.end))}</mark>`;
    at = m.end;
  }
  return out + esc(h.before.slice(at));
}

function link(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

function check(id: string, checked: boolean, label: string, extra = ""): string {
  return `<label class="choice" for="${id}" ${CHOICE_STYLE}><input type="checkbox" id="${id}"${checked ? " checked" : ""}${extra}>${esc(label)}</label>`;
}

export function renderOptionsForm(ctx: FileReplaceContext): string {
  const l = ctx.locale;
  const has = (prefix: string): boolean => ctx.problems.some((p) => p.startsWith(prefix));
  const box = (id: string, label: string, hint: string, value: string, max: number, prefix: string): string => {
    const errs = ctx.problems.filter((p) => p.startsWith(prefix));
    return (
      `<label for="${id}">${esc(label)}</label><p id="h-${id}" class="hint">${esc(hint)}</p>` +
      errs.map((p) => `<p id="e-${id}-${p}" class="error">${esc(optionProblemText(p, l))}</p>`).join("") +
      `<input id="${id}" type="text" autocomplete="off" spellcheck="false" maxlength="${max + 40}" value="${esc(value)}"` +
      ` aria-describedby="${[`h-${id}`, ...errs.map((p) => `e-${id}-${p}`)].join(" ")}"${has(prefix) ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>`
    );
  };
  const noFields = ctx.problems.includes("no-fields");
  return (
    `<form id="fre-options-form" novalidate><h3 id="fre-options">${esc(t(C.optionsTitle, l))}</h3>` +
    box(FIND_ID, t(C.findLabel, l), t(C.findHint, l), ctx.form.find, MAX_FIND, "find") +
    box(WITH_ID, t(C.replaceLabel, l), t(C.replaceHint, l), ctx.form.replace, MAX_REPLACE, "replace") +
    `<fieldset${noFields ? ' aria-describedby="e-fre-fields"' : ""}><legend>${esc(t(C.fieldsLegend, l))}</legend>` +
    (noFields ? `<p id="e-fre-fields" class="error">${esc(optionProblemText("no-fields", l))}</p>` : "") +
    REPLACE_FIELDS.map((f) => check(fieldBoxId(f), ctx.form.fields.includes(f), t(C.fields[f], l), ` name="field" value="${f}"`)).join("") +
    `</fieldset>` +
    check(CASE_ID, ctx.form.matchCase, t(C.matchCase, l)) +
    check(WHOLE_ID, ctx.form.wholeWords, t(C.wholeWords, l), ` aria-describedby="h-${WHOLE_ID}"`) +
    `<p id="h-${WHOLE_ID}" class="hint">${esc(t(C.wholeHint, l))}</p>` +
    `<p>${button(t(C.show, l), { type: "submit", "data-action": "fre-show" })}</p></form>`
  );
}

/** One change: where, how many matches, now and after, and whether to make it. */
export function renderHit(h: Hit, i: number, ctx: FileReplaceContext): string {
  const l = ctx.locale;
  const k = l === "fr" ? "\u00A0:" : ":";
  const after = h.after.trim() === "" ? `<em>${esc(t(C.empty, l))}</em>` : `<span data-user-content style="white-space:pre-wrap">${esc(h.after)}</span>`;
  const control = h.problem
    ? `<p class="error" id="fre-blocked-${i}">${esc(hitProblemText(h.problem, l))}</p>`
    : check(acceptId(i), ctx.accepted.has(h.id), acceptLabel(h, i, l), ` name="accept" value="${esc(h.id)}"`);
  return (
    `<li><h4 id="fre-hit-${i}"><span data-user-content>${esc(hitHeading(h, l))}</span></h4>` +
    `<p>${esc(`${t(C.before, l)}${k}`)} <span data-user-content style="white-space:pre-wrap">${markedBefore(h)}</span></p>` +
    `<p>${esc(`${t(C.after, l)}${k}`)} ${after}</p>` +
    control +
    `</li>`
  );
}

export function renderCopy(file: StreetFile, r: ReplaceReport, made: ReadonlySet<string>, ctx: FileReplaceContext): string {
  const l = ctx.locale;
  const copy = applyReplace(file, r, made);
  const changes = replaceChanges(r, copy, file);
  return (
    `<h3 id="fre-copy" tabindex="-1">${esc(t(C.copyTitle, l))}</h3><p id="fre-copy-summary">${esc(copySummary(copy, l))}</p>` +
    `<p id="fre-copy-places">${esc(placesLine(file.places.length, copyPlaces(copy, l), l))}</p>` +
    (changes.length > 0
      ? `<h4 id="fre-changes">${esc(t(C.changesTitle, l))}</h4><ul class="fre-changes">${changes.map((c) => `<li><span data-user-content style="white-space:pre-wrap">${esc(changeText(c, l))}</span></li>`).join("")}</ul>`
      : "") +
    `<p>${link(exportHref(replacedFile(copy, ctx.today)), replaceFilename("copy", ctx.today, l), t(C.downloadCopy, l))}</p>` +
    `<p class="hint">${esc(t(C.copyHint, l))}</p>`
  );
}

export function renderHits(ctx: FileReplaceContext, file: StreetFile, r: ReplaceReport, o: ReplaceOptions): string {
  const l = ctx.locale;
  const head = `<h3 id="fre-results" tabindex="-1">${esc(`${t(C.resultsTitle, l)} (${r.hits.length})`)}</h3><p id="fre-summary"><span data-user-content>${esc(replaceSummary(r, o, l))}</span></p>`;
  if (r.hits.length === 0) return `${head}<p id="fre-none">${esc(t(C.none, l))}</p>`;
  return (
    head +
    `<p>${link(csvHref(replaceCsv(r)), replaceFilename("csv", ctx.today, l), t(C.downloadCsv, l))}</p>` +
    (r.hits.some((h) => h.problem === undefined)
      ? `<p>${button(t(C.tickAll, l), { "data-action": "fre-tick-all", class: "secondary" })} ${button(t(C.untickAll, l), { "data-action": "fre-untick-all", class: "secondary" })}</p>`
      : "") +
    `<form id="fre-apply-form" novalidate><ol class="fre-hits">${r.hits.map((h, i) => renderHit(h, i, ctx)).join("")}</ol>` +
    `<p>${button(t(C.make, l), { type: "submit", "data-action": "fre-make" })}</p></form>` +
    (ctx.made === undefined ? "" : renderCopy(file, r, ctx.made, ctx))
  );
}

export function renderFileReplace(ctx: FileReplaceContext): string {
  const l = ctx.locale;
  const err = ctx.error;
  const firstAccept = ctx.report?.hits.findIndex((h) => h.problem === undefined) ?? -1;
  const errors = [
    ...(err ? [`<li><a href="#${REPLACE_TEXT_ID}">${esc(replaceErrorText(err, l))}</a></li>`] : []),
    ...ctx.problems.map((p) => `<li><a href="#${problemTarget(p)}">${esc(optionProblemText(p, l))}</a></li>`),
    ...(ctx.noneError ? [`<li><a href="#${firstAccept >= 0 ? acceptId(firstAccept) : FIND_ID}">${esc(t(C.noneAccepted, l))}</a></li>`] : []),
  ];
  return (
    `<div class="app filereplace-app" lang="${l}"><section lang="${l}" aria-labelledby="fre-title" class="filereplace">` +
    `<h2 id="fre-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.rule, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="fre-status">${esc(ctx.statusMessage)}</p>` : "") +
    (errors.length > 0 ? `<div id="fre-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${errors.join("")}</ul></div>` : "") +
    `<form id="fre-file-form" novalidate>` +
    `<label for="${REPLACE_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${REPLACE_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${REPLACE_TEXT_ID}" class="error">${esc(replaceErrorText(err, l))}</p>` : "") +
    `<textarea id="${REPLACE_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${REPLACE_TEXT_ID}${err ? ` e-${REPLACE_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${REPLACE_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${REPLACE_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "fre-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "fre-clear", class: "secondary" })}</p>` +
    (ctx.file ? renderOptionsForm(ctx) : "") +
    (ctx.file && ctx.report && ctx.options ? renderHits(ctx, ctx.file, ctx.report, ctx.options) : "") +
    `</section></div>`
  );
}

/** The options as on the form. */
export function readOptions(root: ParentNode): ReplaceOptions {
  const value = (id: string): string => root.querySelector<HTMLInputElement>(`#${id}`)?.value ?? "";
  const on = (id: string): boolean => root.querySelector<HTMLInputElement>(`#${id}`)?.checked ?? false;
  return {
    find: value(FIND_ID),
    replace: value(WITH_ID),
    fields: REPLACE_FIELDS.filter((f) => on(fieldBoxId(f))),
    matchCase: on(CASE_ID),
    wholeWords: on(WHOLE_ID),
  };
}

/** The changes ticked on the page. */
export function readAccepted(root: ParentNode, r: ReplaceReport): Set<string> {
  const out = new Set<string>();
  r.hits.forEach((h, i) => {
    if (root.querySelector<HTMLInputElement>(`#${acceptId(i)}`)?.checked) out.add(h.id);
  });
  return out;
}
