import type { Locale } from "../../switch-first/src/index";
import { COPY, t } from "./copy";
import { exportHref, type ImportError } from "./exchange";
import type { StreetFile } from "./filestreets";
import { FILE_TIME_COPY as C, dayFilename, dayProblemText, dayStateText, daySummary, percentText, rowCells, stepText, timeErrorText, timeFilename, timelineSummary, timelineText } from "./filetime-copy";
import { button, esc } from "./html";
import { FIRST_LIMITS, inArea } from "./lookfirst";
import { LIMITS } from "./model";
import { DAY_STATES, fileOnDay, placesOnDay, type DayProblem } from "./recordasof";
import { csvHref } from "./notes-csv";
import { TIME_STEPS, fileTimeline, isTimeStep, percentRecorded, timelineCsv, type TimeStep, type Timeline } from "./recordtimeline";
import { textExportHref } from "./textexport";

/** What the timeline on screen was made with. */
export interface TimeChoice {
  readonly step: TimeStep;
  readonly area: string;
}

export interface FileTimeContext {
  readonly text: string;
  readonly error: ImportError | "no-notes" | undefined;
  readonly file: StreetFile | undefined;
  /** The form as typed. */
  readonly form: TimeChoice;
  readonly areaError: boolean;
  /** The choices of the timeline on screen; undefined before one is shown. */
  readonly shown: TimeChoice | undefined;
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
  /** The day as typed. */
  readonly dayText: string;
  readonly dayProblem: DayProblem | undefined;
  /** The day on screen, once one is shown. */
  readonly dayShown: string | undefined;
}

export const TIME_TEXT_ID = "ftm-text";
export const TIME_OPEN_ID = "ftm-open";
export const TIME_AREA_ID = "ftm-area";
export const TIME_DAY_ID = "ftm-day";

const FIELD_STYLE = 'style="min-height:44px"';
const CHOICE_STYLE = 'style="min-height:44px;min-width:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";
/** The widest bar, in em, for a share of 100%. */
const BAR_EM = 8;

export function stepId(s: string): string {
  return `ftm-step-${s}`;
}

/** True when the area text is too long to use. */
export function areaTooLong(area: string): boolean {
  return area.trim().length > FIRST_LIMITS.area;
}

function link(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

export function renderTimeForm(ctx: FileTimeContext): string {
  const l = ctx.locale;
  const steps = TIME_STEPS.map(
    (s) =>
      `<label class="choice" for="${stepId(s)}" ${CHOICE_STYLE}><input type="radio" id="${stepId(s)}" name="step" value="${s}"${ctx.form.step === s ? " checked" : ""}>${esc(stepText(s, l))}</label>`,
  ).join("");
  const err = ctx.areaError;
  return (
    `<h3 id="ftm-form" tabindex="-1">${esc(t(C.formTitle, l))}</h3>` +
    `<form id="ftm-show-form" novalidate>` +
    `<fieldset><legend>${esc(t(C.stepLegend, l))}</legend>${steps}</fieldset>` +
    `<label for="${TIME_AREA_ID}">${esc(t(C.areaLabel, l))}</label><p id="h-${TIME_AREA_ID}" class="hint">${esc(t(C.areaHint, l))}</p>` +
    (err ? `<p id="e-${TIME_AREA_ID}" class="error">${esc(t(C.areaLong, l))}</p>` : "") +
    `<input id="${TIME_AREA_ID}" name="area" type="text" autocomplete="off" maxlength="${FIRST_LIMITS.area + 20}" value="${esc(ctx.form.area)}"` +
    ` aria-describedby="h-${TIME_AREA_ID}${err ? ` e-${TIME_AREA_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>` +
    `<p>${button(t(C.show, l), { type: "submit", "data-action": "ftm-show" })}</p></form>`
  );
}

/** A bar for the share of details with a record; the number beside it says the same, so the bar is hidden from screen readers. */
function bar(percent: number): string {
  const width = ((percent * BAR_EM) / 100).toFixed(2);
  return `<span class="ftm-bar" aria-hidden="true" style="display:inline-block;width:${width}em;height:0.75em;background:currentColor;margin-inline-end:0.5em"></span>`;
}

export function renderTimeTable(tl: Timeline, l: Locale): string {
  const cols = C.columns;
  const head = [cols.period, cols.records, cols.firstRecords, cols.placesStarted, cols.recorded, cols.differing].map((c, i) => `<th scope="col"${i === 0 ? "" : ' class="num"'}>${esc(t(c, l))}</th>`).join("");
  const body = tl.rows
    .map((r) => {
      const cells = rowCells(r, tl.details, l);
      const pct = percentRecorded(r.recorded, tl.details);
      return (
        `<tr><th scope="row">${esc(cells[0] ?? "")}</th>` +
        cells
          .slice(1)
          .map((c, i) => `<td class="num">${i === 3 ? bar(pct) : ""}${esc(c)}</td>`)
          .join("") +
        `</tr>`
      );
    })
    .join("");
  return `<div class="table-wrap" tabindex="0" role="region" aria-labelledby="ftm-caption"><table id="ftm-table"><caption id="ftm-caption">${esc(t(C.tableCaption, l))}</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

export function renderDetailTable(tl: Timeline, l: Locale): string {
  const cols = C.detailColumns;
  const head = [cols.detail, cols.records, cols.places, cols.oldest, cols.newest].map((c, i) => `<th scope="col"${i === 1 || i === 2 ? ' class="num"' : ""}>${esc(t(c, l))}</th>`).join("");
  const body = tl.byDetail
    .map(
      (d) =>
        `<tr><th scope="row">${esc(t(COPY.facts[d.key], l))}</th><td class="num">${d.records}</td>` +
        `<td class="num">${d.places} (${esc(percentText(percentRecorded(d.places, tl.places), l))})</td>` +
        `<td>${esc(d.oldest ?? t(C.none, l))}</td><td>${esc(d.newest ?? t(C.none, l))}</td></tr>`,
    )
    .join("");
  return (
    `<h4 id="ftm-detail-title">${esc(t(C.detailTitle, l))}</h4>` +
    `<div class="table-wrap" tabindex="0" role="region" aria-labelledby="ftm-detail-caption"><table id="ftm-detail-table"><caption id="ftm-detail-caption">${esc(t(C.detailCaption, l))}</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`
  );
}

/** What the file said on one day, for the places of the timeline on screen. */
export function renderDay(ctx: FileTimeContext, file: StreetFile, area: string): string {
  const l = ctx.locale;
  const D = C.day;
  const p = ctx.dayProblem;
  const places = file.places.filter((x) => inArea(x, area));
  const form =
    `<form id="ftm-day-form" novalidate>` +
    `<label for="${TIME_DAY_ID}">${esc(t(D.label, l))}</label><p id="h-${TIME_DAY_ID}" class="hint">${esc(t(D.hint, l))}</p>` +
    (p ? `<p id="e-${TIME_DAY_ID}" class="error">${esc(dayProblemText(p, l))}</p>` : "") +
    `<input id="${TIME_DAY_ID}" name="day" type="text" inputmode="numeric" autocomplete="off" maxlength="10" value="${esc(ctx.dayText)}"` +
    ` aria-describedby="h-${TIME_DAY_ID}${p ? ` e-${TIME_DAY_ID}` : ""}"${p ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>` +
    `<p>${button(t(D.show, l), { type: "submit", "data-action": "ftm-day" })}</p></form>`;
  let result = "";
  const day = ctx.dayShown;
  if (day !== undefined) {
    const d = placesOnDay(places, day);
    const head = DAY_STATES.map((s) => `<th scope="col" class="num">${esc(dayStateText(s, l))}</th>`).join("");
    const body = d.byDetail
      .map((x) => `<tr><th scope="row">${esc(t(COPY.facts[x.key], l))}</th>${DAY_STATES.map((s) => `<td class="num">${x.counts[s]}</td>`).join("")}</tr>`)
      .join("");
    result =
      `<p id="ftm-day-summary" tabindex="-1">${esc(daySummary(d, l))}</p>` +
      `<div class="table-wrap" tabindex="0" role="region" aria-labelledby="ftm-day-caption"><table id="ftm-day-table"><caption id="ftm-day-caption">${esc(`${t(D.caption, l)} (${day})`)}</caption>` +
      `<thead><tr><th scope="col">${esc(t(D.detail, l))}</th>${head}</tr></thead><tbody>${body}</tbody></table></div>` +
      `<p class="hint" id="ftm-day-hint">${esc(t(D.downloadHint, l))}</p>` +
      `<p>${link(exportHref(fileOnDay(places, day, ctx.today)), dayFilename(day, l), t(D.download, l))}</p>`;
  }
  return `<h3 id="ftm-day-title">${esc(t(D.title, l))}</h3><p>${esc(t(D.intro, l))}</p>${form}${result}`;
}

export function renderTimeline(ctx: FileTimeContext, file: StreetFile, choice: TimeChoice): string {
  const l = ctx.locale;
  const tl = fileTimeline(file, choice.step, choice.area, ctx.today);
  const head = `<h3 id="ftm-results" tabindex="-1">${esc(t(C.resultsTitle, l))}</h3>`;
  if (tl.places === 0) return `${head}<p id="ftm-summary">${esc(t(C.noPlaces, l))}</p>`;
  const downloads =
    tl.rows.length === 0
      ? ""
      : `<p>${link(csvHref(timelineCsv(tl)), timeFilename("csv", choice.step, ctx.today, l), t(C.downloadCsv, l))}</p>` +
        `<p>${link(textExportHref(timelineText(tl, choice.area, ctx.today, l)), timeFilename("text", choice.step, ctx.today, l), t(C.downloadText, l))}</p>`;
  return (
    head +
    `<p id="ftm-summary">${esc(timelineSummary(tl, l))}</p>` +
    `<p class="hint">${esc(t(C.meaning, l))}</p>` +
    (tl.rows.length === 0 ? `<p id="ftm-none">${esc(t(C.noDates, l))}</p>` : downloads + renderTimeTable(tl, l)) +
    renderDetailTable(tl, l)
  );
}

export function renderFileTime(ctx: FileTimeContext): string {
  const l = ctx.locale;
  const err = ctx.error;
  const errors = [
    ...(err ? [`<li><a href="#${TIME_TEXT_ID}">${esc(timeErrorText(err, l))}</a></li>`] : []),
    ...(ctx.areaError ? [`<li><a href="#${TIME_AREA_ID}">${esc(t(C.areaLong, l))}</a></li>`] : []),
    ...(ctx.dayProblem ? [`<li><a href="#${TIME_DAY_ID}">${esc(dayProblemText(ctx.dayProblem, l))}</a></li>`] : []),
  ];
  return (
    `<div class="app filetime-app" lang="${l}"><section lang="${l}" aria-labelledby="ftm-title" class="filetime">` +
    `<h2 id="ftm-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="ftm-status">${esc(ctx.statusMessage)}</p>` : "") +
    (errors.length > 0 ? `<div id="ftm-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${errors.join("")}</ul></div>` : "") +
    `<form id="ftm-file-form" novalidate>` +
    `<label for="${TIME_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${TIME_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${TIME_TEXT_ID}" class="error">${esc(timeErrorText(err, l))}</p>` : "") +
    `<textarea id="${TIME_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${TIME_TEXT_ID}${err ? ` e-${TIME_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${TIME_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${TIME_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "ftm-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "ftm-clear", class: "secondary" })}</p>` +
    (ctx.file ? renderTimeForm(ctx) + (ctx.shown ? renderTimeline(ctx, ctx.file, ctx.shown) + renderDay(ctx, ctx.file, ctx.shown.area) : "") : "") +
    `</section></div>`
  );
}

/** The form's values on the page, or the fallback. */
export function readTimeForm(root: ParentNode, fallback: TimeChoice): TimeChoice {
  const step = root.querySelector<HTMLInputElement>('input[name="step"]:checked')?.value;
  return {
    step: isTimeStep(step) ? step : fallback.step,
    area: root.querySelector<HTMLInputElement>(`#${TIME_AREA_ID}`)?.value ?? fallback.area,
  };
}
