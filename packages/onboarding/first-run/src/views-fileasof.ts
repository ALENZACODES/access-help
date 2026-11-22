import type { Locale } from "../../switch-first/src/index";
import { QUICK_DAYS, answeredCount, changesCsv, comparisonCsv, quickDay, snapshotFile, type Comparison, type DayProblem, type Snapshot, type SourceSince, type ToProblem } from "./asof";
import { COPY, t } from "./copy";
import { exportHref, type ImportError } from "./exchange";
import {
  FILE_ASOF_COPY as C,
  asofErrorText,
  asofFilename,
  changeText,
  changedLine,
  comparisonText,
  countsText,
  dayProblemText,
  detailLine,
  nowLabel,
  placeLine,
  quickLabel,
  resultsTitle,
  snapshotSummary,
  sourceSinceLine,
  toProblemText,
} from "./fileasof-copy";
import type { StreetFile } from "./filestreets";
import { button, esc } from "./html";
import { LIMITS } from "./model";
import { csvHref } from "./notes-csv";
import { textExportHref } from "./textexport";

export interface FileAsofContext {
  readonly text: string;
  readonly error: ImportError | "no-notes" | undefined;
  readonly file: StreetFile | undefined;
  /** The day as typed. */
  readonly day: string;
  /** The optional second, later day as typed. */
  readonly to: string;
  readonly problem: DayProblem | undefined;
  readonly toProblem: ToProblem | undefined;
  readonly snapshot: Snapshot | undefined;
  readonly comparison: Comparison | undefined;
  /** Who added records since the day; shown with the comparison. */
  readonly sources: readonly SourceSince[];
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const ASOF_TEXT_ID = "fas-text";
export const ASOF_OPEN_ID = "fas-open";
export const DAY_ID = "fas-day";
export const TO_ID = "fas-to";

const FIELD_STYLE = 'style="min-height:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

function link(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

export function renderDayForm(ctx: FileAsofContext): string {
  const l = ctx.locale;
  const p = ctx.problem;
  const q = ctx.toProblem;
  return (
    `<form id="fas-day-form" novalidate><h3 id="fas-day-title" tabindex="-1">${esc(t(C.dayTitle, l))}</h3>` +
    `<label for="${DAY_ID}">${esc(t(C.dayLabel, l))}</label><p id="h-${DAY_ID}" class="hint">${esc(t(C.dayHint, l))}</p>` +
    (p ? `<p id="e-${DAY_ID}" class="error">${esc(dayProblemText(p, l))}</p>` : "") +
    `<input id="${DAY_ID}" type="text" inputmode="numeric" autocomplete="off" maxlength="20" value="${esc(ctx.day)}"` +
    ` aria-describedby="h-${DAY_ID}${p ? ` e-${DAY_ID}` : ""}"${p ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>` +
    `<div role="group" aria-labelledby="fas-quick-title"><p id="fas-quick-title" class="hint">${esc(t(C.quickTitle, l))}</p><p>` +
    QUICK_DAYS.map((k) => {
      const d = quickDay(k, ctx.today);
      return button(quickLabel(k, d, l), { "data-action": "fas-quick", "data-day": d, class: "secondary" });
    }).join(" ") +
    `</p></div>` +
    `<label for="${TO_ID}">${esc(t(C.toLabel, l))}</label><p id="h-${TO_ID}" class="hint">${esc(t(C.toHint, l))}</p>` +
    (q ? `<p id="e-${TO_ID}" class="error">${esc(toProblemText(q, l))}</p>` : "") +
    `<input id="${TO_ID}" type="text" inputmode="numeric" autocomplete="off" maxlength="20" value="${esc(ctx.to)}"` +
    ` aria-describedby="h-${TO_ID}${q ? ` e-${TO_ID}` : ""}"${q ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>` +
    `<p>${button(t(C.show, l), { type: "submit", "data-action": "fas-show" })}</p></form>`
  );
}

/** The comparison as a table: one row for each detail, the places with an answer on the day and now, and the change. */
export function renderTable(c: Comparison, l: Locale): string {
  const head = [t(C.colDetail, l), t(C.colThen, l), nowLabel(c.to, l), t(C.colChange, l)].map((h) => `<th scope="col">${esc(h)}</th>`).join("");
  const rows = c.details
    .map((d) => {
      const then = answeredCount(d.then);
      const now = answeredCount(d.now);
      return (
        `<tr><th scope="row">${esc(t(COPY.facts[d.key], l))}</th>` +
        `<td>${then} <span class="hint">(${esc(countsText(d.then, l))})</span></td>` +
        `<td>${now} <span class="hint">(${esc(countsText(d.now, l))})</span></td>` +
        `<td>${esc(changeText(then, now))}</td></tr>`
      );
    })
    .join("");
  return `<table id="fas-table"><caption>${esc(t(C.tableCaption, l))}</caption><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

export function renderResults(ctx: FileAsofContext, s: Snapshot, c: Comparison): string {
  const l = ctx.locale;
  const answered = c.details
    .map(
      (d, i) =>
        `<h4 id="fas-detail-${i}">${esc(detailLine(d, l, c.to))}</h4>` +
        (d.answered.length === 0
          ? `<p class="hint">${esc(t(C.noneAnswered, l))}</p>`
          : `<ul class="fas-answered">${d.answered.map((p) => `<li><span data-user-content>${esc(placeLine(p))}</span></li>`).join("")}</ul>`) +
        `<h5 id="fas-changed-${i}">${esc(t(C.changedTitle, l))}</h5>` +
        (d.differently.length === 0
          ? `<p class="hint">${esc(t(C.noneChanged, l))}</p>`
          : `<ul class="fas-changed">${d.differently.map((x) => `<li><span data-user-content>${esc(changedLine(x, l))}</span></li>`).join("")}</ul>`),
    )
    .join("");
  const sources =
    `<h3 id="fas-sources">${esc(t(C.sourcesTitle, l))}</h3>` +
    (ctx.sources.length === 0
      ? `<p class="hint">${esc(t(C.noneSources, l))}</p>`
      : `<ul class="fas-sources">${ctx.sources.map((x) => `<li><span data-user-content>${esc(sourceSinceLine(x, l))}</span></li>`).join("")}</ul>`);
  return (
    `<h3 id="fas-results" tabindex="-1">${esc(resultsTitle(s.day, l, c.to))}</h3>` +
    `<p id="fas-summary">${esc(snapshotSummary(s, c, l))}</p>` +
    `<p>${link(exportHref(snapshotFile(s, ctx.today)), asofFilename("copy", s.day, l), t(C.downloadCopy, l))}</p><p class="hint">${esc(t(C.copyHint, l))}</p>` +
    `<p>${link(csvHref(comparisonCsv(c)), asofFilename("csv", s.day, l, c.to), t(C.downloadCsv, l))} ` +
    `${link(textExportHref(comparisonText(s, c, ctx.today, l, ctx.sources)), asofFilename("text", s.day, l, c.to), t(C.downloadText, l))}</p>` +
    (c.details.some((d) => d.differently.length > 0) ? `<p>${link(csvHref(changesCsv(c)), asofFilename("changes", s.day, l, c.to), t(C.downloadChanges, l))}</p>` : "") +
    renderTable(c, l) +
    `<h3 id="fas-answered">${esc(t(C.answeredTitle, l))}</h3>` +
    answered +
    sources
  );
}

export function renderFileAsof(ctx: FileAsofContext): string {
  const l = ctx.locale;
  const err = ctx.error;
  const errors = [
    ...(err ? [`<li><a href="#${ASOF_TEXT_ID}">${esc(asofErrorText(err, l))}</a></li>`] : []),
    ...(ctx.problem ? [`<li><a href="#${DAY_ID}">${esc(dayProblemText(ctx.problem, l))}</a></li>`] : []),
    ...(ctx.toProblem ? [`<li><a href="#${TO_ID}">${esc(toProblemText(ctx.toProblem, l))}</a></li>`] : []),
  ];
  return (
    `<div class="app fileasof-app" lang="${l}"><section lang="${l}" aria-labelledby="fas-title" class="fileasof">` +
    `<h2 id="fas-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.rule, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="fas-status">${esc(ctx.statusMessage)}</p>` : "") +
    (errors.length > 0 ? `<div id="fas-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${errors.join("")}</ul></div>` : "") +
    `<form id="fas-file-form" novalidate>` +
    `<label for="${ASOF_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${ASOF_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${ASOF_TEXT_ID}" class="error">${esc(asofErrorText(err, l))}</p>` : "") +
    `<textarea id="${ASOF_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${ASOF_TEXT_ID}${err ? ` e-${ASOF_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${ASOF_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${ASOF_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "fas-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "fas-clear", class: "secondary" })}</p>` +
    (ctx.file ? renderDayForm(ctx) : "") +
    (ctx.file && ctx.snapshot && ctx.comparison ? renderResults(ctx, ctx.snapshot, ctx.comparison) : "") +
    `</section></div>`
  );
}
