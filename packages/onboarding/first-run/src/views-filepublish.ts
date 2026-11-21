import type { Locale } from "../../switch-first/src/index";
import { t } from "./copy";
import type { ImportError } from "./exchange";
import {
  FILE_PUBLISH_COPY as C,
  checkLines,
  languageText,
  layoutText,
  publishErrorText,
  publishFilename,
  publishProblemText,
  readmeText,
} from "./filepublish-copy";
import type { StreetFile } from "./filestreets";
import { button, esc } from "./html";
import { FIRST_LIMITS } from "./lookfirst";
import { LIMITS } from "./model";
import { csvHref } from "./notes-csv";
import {
  DICT_LANGUAGES,
  LAYOUTS,
  TITLE_MAX,
  datasetCsv,
  datasetRows,
  fileLicences,
  isDictLanguage,
  isLayout,
  licenceLeftOut,
  placeLayoutRows,
  placesCsv,
  publishChecks,
  publishedLicences,
  type PublishOptions,
  type PublishProblem,
} from "./publishpack";
import { textExportHref } from "./textexport";

export interface FilePublishContext {
  readonly text: string;
  readonly error: ImportError | "no-notes" | undefined;
  readonly file: StreetFile | undefined;
  /** The form as typed. */
  readonly form: PublishOptions;
  readonly problems: readonly PublishProblem[];
  /** The options of the dataset on screen; undefined before one is prepared. */
  readonly prepared: PublishOptions | undefined;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const PUBLISH_TEXT_ID = "fpb-text";
export const PUBLISH_OPEN_ID = "fpb-open";
export const TITLE_ID = "fpb-title-field";
export const UNKNOWN_ID = "fpb-unknown";
export const NOTE_TEXT_ID = "fpb-note-text";
export const AREA_ID = "fpb-area";

const FIELD_STYLE = 'style="min-height:44px"';
const CHOICE_STYLE = 'style="min-height:44px;min-width:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

/** The text and the language start as the page's. */
export function startOptions(l: Locale): PublishOptions {
  return { title: "", language: l, withUnknown: false, withNoteText: false, layout: "records", area: "", licences: undefined };
}

export function languageId(x: string): string {
  return `fpb-lang-${x}`;
}

export function layoutId(x: string): string {
  return `fpb-layout-${x}`;
}

/** Each licence box gets its place in the file's licence list, so any licence text gives a safe id. */
export function licenceId(index: number): string {
  return `fpb-licence-${index}`;
}

export function problemTarget(p: PublishProblem): string {
  if (p === "personal-text") return NOTE_TEXT_ID;
  if (p === "area-long") return AREA_ID;
  if (p === "no-licence") return licenceId(0);
  return TITLE_ID;
}

function link(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

/** The problems of one field, as escaped text, and whether there are any. */
function errorFor(ctx: Pick<FilePublishContext, "problems" | "locale">, id: string): { text: string; bad: boolean } {
  const mine = ctx.problems.filter((p) => problemTarget(p) === id);
  return { text: mine.map((p) => esc(publishProblemText(p, ctx.locale))).join(" "), bad: mine.length > 0 };
}

export function renderChecks(file: StreetFile, today: Date, l: Locale): string {
  return `<h3 id="fpb-checks">${esc(t(C.checksTitle, l))}</h3><ul id="fpb-check-list">${checkLines(publishChecks(file, today), l)
    .map((x) => `<li>${esc(x)}</li>`)
    .join("")}</ul>`;
}

/** One box per licence in the file, ticked when it goes in. */
function licenceBoxes(ctx: FilePublishContext, file: StreetFile): string {
  const l = ctx.locale;
  const all = fileLicences(file);
  if (all.length === 0) return "";
  const err = errorFor(ctx, licenceId(0));
  const chosen = ctx.form.licences;
  const boxes = all
    .map(
      (x, i) =>
        `<label class="choice" for="${licenceId(i)}" ${CHOICE_STYLE}><input type="checkbox" id="${licenceId(i)}" name="licence" value="${esc(x)}"${chosen === undefined || chosen.includes(x) ? " checked" : ""}` +
        ` aria-describedby="h-fpb-licences${err.bad ? " e-fpb-licences" : ""}"><span data-user-content>${esc(x)}</span></label>`,
    )
    .join("");
  return `<fieldset><legend>${esc(t(C.licencesLegend, l))}</legend><p id="h-fpb-licences" class="hint">${esc(t(C.licencesHint, l))}</p>${err.bad ? `<p id="e-fpb-licences" class="error">${err.text}</p>` : ""}${boxes}</fieldset>`;
}

export function renderPublishForm(ctx: FilePublishContext): string {
  const l = ctx.locale;
  const f = ctx.form;
  const area = errorFor(ctx, AREA_ID);
  const layouts = LAYOUTS.map(
    (x) =>
      `<label class="choice" for="${layoutId(x)}" ${CHOICE_STYLE}><input type="radio" id="${layoutId(x)}" name="layout" value="${x}"${f.layout === x ? " checked" : ""}>${esc(layoutText(x, l))}</label>`,
  ).join("");
  const title = errorFor(ctx, TITLE_ID);
  const noteText = errorFor(ctx, NOTE_TEXT_ID);
  const langs = DICT_LANGUAGES.map(
    (x) =>
      `<label class="choice" for="${languageId(x)}" ${CHOICE_STYLE}><input type="radio" id="${languageId(x)}" name="language" value="${x}"${f.language === x ? " checked" : ""}>${esc(languageText(x, l))}</label>`,
  ).join("");
  return (
    `<h3 id="fpb-form" tabindex="-1">${esc(t(C.formTitle, l))}</h3>` +
    `<form id="fpb-publish-form" novalidate>` +
    `<label for="${TITLE_ID}">${esc(t(C.titleLabel, l))}</label><p id="h-${TITLE_ID}" class="hint">${esc(t(C.titleHint, l))}</p>` +
    (title.bad ? `<p id="e-${TITLE_ID}" class="error">${title.text}</p>` : "") +
    `<input id="${TITLE_ID}" name="title" type="text" autocomplete="off" maxlength="${TITLE_MAX + 20}" value="${esc(f.title)}"` +
    ` aria-describedby="h-${TITLE_ID}${title.bad ? ` e-${TITLE_ID}` : ""}"${title.bad ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>` +
    `<fieldset><legend>${esc(t(C.languageLegend, l))}</legend>${langs}</fieldset>` +
    `<fieldset><legend>${esc(t(C.layoutLegend, l))}</legend>${layouts}</fieldset>` +
    `<label for="${AREA_ID}">${esc(t(C.areaLabel, l))}</label><p id="h-${AREA_ID}" class="hint">${esc(t(C.areaHint, l))}</p>` +
    (area.bad ? `<p id="e-${AREA_ID}" class="error">${area.text}</p>` : "") +
    `<input id="${AREA_ID}" name="area" type="text" autocomplete="off" maxlength="${FIRST_LIMITS.area + 20}" value="${esc(f.area)}"` +
    ` aria-describedby="h-${AREA_ID}${area.bad ? ` e-${AREA_ID}` : ""}"${area.bad ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>` +
    (ctx.file ? licenceBoxes(ctx, ctx.file) : "") +
    `<p><label class="choice" for="${UNKNOWN_ID}" ${CHOICE_STYLE}><input type="checkbox" id="${UNKNOWN_ID}" name="unknown"${f.withUnknown ? " checked" : ""}>${esc(t(C.withUnknown, l))}</label></p>` +
    `<p id="h-${NOTE_TEXT_ID}" class="hint">${esc(t(C.noteTextHint, l))}</p>` +
    (noteText.bad ? `<p id="e-${NOTE_TEXT_ID}" class="error">${noteText.text}</p>` : "") +
    `<p><label class="choice" for="${NOTE_TEXT_ID}" ${CHOICE_STYLE}><input type="checkbox" id="${NOTE_TEXT_ID}" name="notetext"${f.withNoteText ? " checked" : ""}` +
    ` aria-describedby="h-${NOTE_TEXT_ID}${noteText.bad ? ` e-${NOTE_TEXT_ID}` : ""}"${noteText.bad ? ' aria-invalid="true"' : ""}>${esc(t(C.withNoteText, l))}</label></p>` +
    `<p>${button(t(C.prepare, l), { type: "submit", "data-action": "fpb-prepare" })}</p></form>`
  );
}

export function renderDataset(ctx: FilePublishContext, file: StreetFile, o: PublishOptions): string {
  const l = ctx.locale;
  const rows = datasetRows(file, o, ctx.today);
  const text = readmeText(rows, publishChecks(file, ctx.today), publishedLicences(file, ctx.today, o), o, ctx.today, { licenceLeft: licenceLeftOut(file, o, ctx.today) });
  const byPlace = o.layout === "places" ? placeLayoutRows(rows) : undefined;
  const csv = byPlace ? placesCsv(byPlace) : datasetCsv(rows, o);
  return (
    `<h3 id="fpb-results" tabindex="-1">${esc(`${t(C.resultsTitle, l)} (${byPlace ? byPlace.length : rows.length})`)}</h3>` +
    `<p>${link(csvHref(csv), publishFilename("csv", ctx.today, l), t(C.downloadCsv, l))}</p>` +
    `<p>${link(textExportHref(text), publishFilename("text", ctx.today, l), t(C.downloadText, l))}</p>` +
    `<p class="hint">${esc(t(C.keepTogether, l))}</p>` +
    `<details><summary style="min-height:44px">${esc(t(C.showText, l))}</summary><pre id="fpb-readme" data-user-content>${esc(text)}</pre></details>`
  );
}

export function renderFilePublish(ctx: FilePublishContext): string {
  const l = ctx.locale;
  const err = ctx.error;
  const errors = [
    ...(err ? [`<li><a href="#${PUBLISH_TEXT_ID}">${esc(publishErrorText(err, l))}</a></li>`] : []),
    ...ctx.problems.map((p) => `<li><a href="#${problemTarget(p)}">${esc(publishProblemText(p, l))}</a></li>`),
  ];
  return (
    `<div class="app filepublish-app" lang="${l}"><section lang="${l}" aria-labelledby="fpb-title" class="filepublish">` +
    `<h2 id="fpb-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="fpb-status">${esc(ctx.statusMessage)}</p>` : "") +
    (errors.length > 0 ? `<div id="fpb-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${errors.join("")}</ul></div>` : "") +
    `<form id="fpb-file-form" novalidate>` +
    `<label for="${PUBLISH_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${PUBLISH_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${PUBLISH_TEXT_ID}" class="error">${esc(publishErrorText(err, l))}</p>` : "") +
    `<textarea id="${PUBLISH_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${PUBLISH_TEXT_ID}${err ? ` e-${PUBLISH_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${PUBLISH_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${PUBLISH_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "fpb-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "fpb-clear", class: "secondary" })}</p>` +
    (ctx.file ? renderChecks(ctx.file, ctx.today, l) + renderPublishForm(ctx) + (ctx.prepared ? renderDataset(ctx, ctx.file, ctx.prepared) : "") : "") +
    `</section></div>`
  );
}

/** The form's values on the page, or the fallback. */
export function readPublishForm(root: ParentNode, fallback: PublishOptions): PublishOptions {
  const lang = root.querySelector<HTMLInputElement>('input[name="language"]:checked')?.value;
  const layout = root.querySelector<HTMLInputElement>('input[name="layout"]:checked')?.value;
  const boxes = Array.from(root.querySelectorAll<HTMLInputElement>('input[name="licence"]'));
  // Every box ticked is the same as every licence.
  const licences = boxes.length === 0 ? fallback.licences : boxes.every((b) => b.checked) ? undefined : boxes.filter((b) => b.checked).map((b) => b.value);
  return {
    layout: isLayout(layout) ? layout : fallback.layout,
    area: root.querySelector<HTMLInputElement>(`#${AREA_ID}`)?.value ?? fallback.area,
    licences,
    title: root.querySelector<HTMLInputElement>(`#${TITLE_ID}`)?.value ?? fallback.title,
    language: isDictLanguage(lang) ? lang : fallback.language,
    withUnknown: root.querySelector<HTMLInputElement>(`#${UNKNOWN_ID}`)?.checked ?? fallback.withUnknown,
    withNoteText: root.querySelector<HTMLInputElement>(`#${NOTE_TEXT_ID}`)?.checked ?? fallback.withNoteText,
  };
}
