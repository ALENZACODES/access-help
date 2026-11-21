import type { Locale } from "../../switch-first/src/index";
import { NB, t } from "./copy";
import type { ImportError } from "./exchange";
import type { StreetFile } from "./filestreets";
import {
  FILE_VISITS_COPY as C,
  dayHeading,
  planCalendar,
  planSummary,
  planText,
  problemText,
  timeRange,
  visitsErrorText,
  visitsFilename,
  weekdayName,
} from "./filevisits-copy";
import { button, esc } from "./html";
import { icsHref } from "./ics";
import { LIMITS } from "./model";
import { csvHref } from "./notes-csv";
import { textExportHref } from "./textexport";
import { PLAN_FIELDS, WEEK, planCsv, planVisits, type Plan, type PlanDay, type PlanField, type PlanForm, type PlanOptions, type PlanProblem, type Weekday } from "./visitplan";

export interface FileVisitsContext {
  readonly text: string;
  readonly error: ImportError | "no-notes" | undefined;
  readonly file: StreetFile | undefined;
  /** The options of the plan on screen: the last ones that were valid. */
  readonly options: PlanOptions;
  /** The form as typed, kept when something in it is wrong. */
  readonly form: PlanForm;
  readonly problems: readonly PlanProblem[];
  readonly locale: Locale;
  readonly today: Date;
  readonly statusMessage: string | undefined;
}

export const VISITS_TEXT_ID = "fvp-text";
export const VISITS_OPEN_ID = "fvp-open";
export const BOTH_SIDES_ID = "fvp-both-sides";
export const ONLY_OPEN_ID = "fvp-only-open";
export const KEEP_STREETS_ID = "fvp-keep-streets";

const FIELD_IDS: Readonly<Record<Exclude<PlanField, "weekdays">, string>> = {
  start: "fvp-start",
  startTime: "fvp-start-time",
  perDay: "fvp-per-day",
  minutes: "fvp-minutes",
  gap: "fvp-gap",
};

export function weekdayId(d: Weekday): string {
  return `fvp-weekday-${d}`;
}

/** The element a problem with a field sends focus to: the field, or the first day of the week. */
export function fieldId(f: PlanField): string {
  return f === "weekdays" ? weekdayId(WEEK[0] as Weekday) : FIELD_IDS[f];
}

const FIELD_STYLE = 'style="min-height:44px"';
const CHOICE_STYLE = 'style="min-height:44px;min-width:44px"';
const LINK_STYLE = "min-height:44px;min-width:44px;display:inline-flex;align-items:center";

function link(href: string, filename: string, label: string): string {
  return `<a class="linkbtn" download="${esc(filename)}" href="${esc(href)}" style="${LINK_STYLE}">${esc(label)}</a>`;
}

function problemsFor(ctx: FileVisitsContext, f: PlanField): PlanProblem[] {
  return ctx.problems.filter((p) => p.field === f);
}

/** The error text and attributes for one field, tied together with aria-describedby. */
function fieldError(ctx: FileVisitsContext, f: Exclude<PlanField, "weekdays">, hintId?: string): { attrs: string; text: string } {
  const id = FIELD_IDS[f];
  const problems = problemsFor(ctx, f);
  const ids = [hintId, problems.length > 0 ? `e-${id}` : undefined].filter((x): x is string => x !== undefined);
  const describedBy = ids.length > 0 ? ` aria-describedby="${ids.join(" ")}"` : "";
  if (problems.length === 0) return { attrs: describedBy, text: "" };
  return {
    attrs: `${describedBy} aria-invalid="true"`,
    text: `<p id="e-${id}" class="error">${problems.map((p) => esc(problemText(p.code, ctx.locale))).join(" ")}</p>`,
  };
}

function textField(ctx: FileVisitsContext, f: "perDay" | "minutes" | "gap", label: string): string {
  const id = FIELD_IDS[f];
  const err = fieldError(ctx, f);
  return (
    `<label for="${id}">${esc(label)}</label>${err.text}` +
    `<input id="${id}" name="${f}" type="text" inputmode="numeric" autocomplete="off" maxlength="3" value="${esc(ctx.form[f])}"${err.attrs} ${FIELD_STYLE}>`
  );
}

function checkbox(id: string, name: string, checked: boolean, label: string): string {
  return `<p><label class="choice" for="${id}" ${CHOICE_STYLE}><input type="checkbox" id="${id}" name="${name}"${checked ? " checked" : ""}>${esc(label)}</label></p>`;
}

export function renderPlanForm(ctx: FileVisitsContext): string {
  const l = ctx.locale;
  const f = ctx.form;
  const start = fieldError(ctx, "start");
  const time = fieldError(ctx, "startTime", `h-${FIELD_IDS.startTime}`);
  const dayProblems = problemsFor(ctx, "weekdays");
  const days = WEEK.map(
    (d) =>
      `<label class="choice" for="${weekdayId(d)}" ${CHOICE_STYLE}><input type="checkbox" id="${weekdayId(d)}" name="weekday" value="${d}"${f.weekdays.includes(d) ? " checked" : ""}>${esc(weekdayName(d, l))}</label>`,
  ).join("");
  return (
    `<h3 id="fvp-options">${esc(t(C.optionsTitle, l))}</h3>` +
    `<form id="fvp-options-form" novalidate>` +
    `<label for="${FIELD_IDS.start}">${esc(t(C.startLabel, l))}</label>${start.text}` +
    `<input id="${FIELD_IDS.start}" name="start" type="date" value="${esc(f.start)}"${start.attrs} ${FIELD_STYLE}>` +
    `<fieldset><legend>${esc(t(C.weekdaysLegend, l))}</legend>` +
    (dayProblems.length > 0 ? `<p id="e-fvp-weekdays" class="error">${dayProblems.map((p) => esc(problemText(p.code, l))).join(" ")}</p>` : "") +
    `${days}</fieldset>` +
    `<label for="${FIELD_IDS.startTime}">${esc(t(C.startTimeLabel, l))}</label><p id="h-${FIELD_IDS.startTime}" class="hint">${esc(t(C.startTimeHint, l))}</p>${time.text}` +
    `<input id="${FIELD_IDS.startTime}" name="startTime" type="text" autocomplete="off" maxlength="8" value="${esc(f.startTime)}"${time.attrs} ${FIELD_STYLE}>` +
    textField(ctx, "perDay", t(C.perDayLabel, l)) +
    textField(ctx, "minutes", t(C.minutesLabel, l)) +
    textField(ctx, "gap", t(C.gapLabel, l)) +
    checkbox(BOTH_SIDES_ID, "both-sides", f.bothSides, t(C.bothSides, l)) +
    checkbox(ONLY_OPEN_ID, "only-open", f.onlyOpen, t(C.onlyOpen, l)) +
    checkbox(KEEP_STREETS_ID, "keep-streets", f.keepStreets, t(C.keepStreets, l)) +
    `<p>${button(t(C.update, l), { type: "submit", "data-action": "fvp-update" })}</p></form>`
  );
}

export function renderDay(d: PlanDay, l: Locale): string {
  const visits = d.visits
    .map(
      (v) =>
        `<li data-place="${esc(v.place.id)}"><span class="fvp-time">${esc(timeRange(v, l))}</span> ` +
        `<span data-user-content>${esc(v.place.name)}</span>, <span data-user-content>${esc(v.place.address ?? t(C.noAddress, l))}</span></li>`,
    )
    .join("");
  return `<li data-day="${d.index}"><h4 id="fvp-day-${d.index}">${esc(dayHeading(d, l))}</h4><ol>${visits}</ol></li>`;
}

export function renderPlan(ctx: FileVisitsContext, plan: Plan): string {
  const l = ctx.locale;
  const downloads =
    `<p>${link(icsHref(planCalendar(plan, l, ctx.today)), visitsFilename("ics", ctx.today, l), t(C.downloadCalendar, l))}</p>` +
    `<p class="hint">${esc(t(C.calendarHint, l))}</p>` +
    `<p>${link(textExportHref(planText(plan, l, ctx.today)), visitsFilename("text", ctx.today, l), t(C.downloadText, l))}</p>` +
    `<p>${link(csvHref(planCsv(plan)), visitsFilename("csv", ctx.today, l), t(C.downloadCsv, l))}</p>`;
  const split =
    plan.splitStreets.length === 0
      ? ""
      : `<p id="fvp-split">${esc(t(C.splitTitle, l))}${l === "fr" ? NB : ""}: ${plan.splitStreets.map((s) => `<span data-user-content>${esc(s)}</span>`).join(", ")}</p>`;
  return (
    downloads +
    split +
    `<h3 id="fvp-days" tabindex="-1">${esc(`${t(C.daysTitle, l)} (${plan.days.length})`)}</h3>` +
    (plan.days.length === 0 ? "" : `<ul class="fvp-days">${plan.days.map((d) => renderDay(d, l)).join("")}</ul>`)
  );
}

export function renderFileVisits(ctx: FileVisitsContext): string {
  const l = ctx.locale;
  const err = ctx.error;
  const plan = ctx.file ? planVisits(ctx.file, ctx.options, l) : undefined;
  const errors = [
    ...(err ? [`<li><a href="#${VISITS_TEXT_ID}">${esc(visitsErrorText(err, l))}</a></li>`] : []),
    ...PLAN_FIELDS.flatMap((f) => problemsFor(ctx, f).map((p) => `<li><a href="#${fieldId(f)}">${esc(problemText(p.code, l))}</a></li>`)),
  ];
  return (
    `<div class="app filevisits-app" lang="${l}"><section lang="${l}" aria-labelledby="fvp-title" class="filevisits">` +
    `<h2 id="fvp-title" tabindex="-1">${esc(t(C.title, l))}</h2>` +
    `<p>${esc(t(C.intro, l))}</p><p class="hint">${esc(t(C.privacy, l))}</p>` +
    (ctx.statusMessage ? `<p class="notice" id="fvp-status">${esc(ctx.statusMessage)}</p>` : "") +
    (errors.length > 0 ? `<div id="fvp-errors" class="error-summary" role="alert" tabindex="-1"><h3>${esc(t(C.errorsTitle, l))}</h3><ul>${errors.join("")}</ul></div>` : "") +
    `<form id="fvp-file-form" novalidate>` +
    `<label for="${VISITS_TEXT_ID}">${esc(t(C.pasteLabel, l))}</label>` +
    `<p id="h-${VISITS_TEXT_ID}" class="hint">${esc(t(C.pasteHint, l))}</p>` +
    (err ? `<p id="e-${VISITS_TEXT_ID}" class="error">${esc(visitsErrorText(err, l))}</p>` : "") +
    `<textarea id="${VISITS_TEXT_ID}" name="text" rows="6" maxlength="${LIMITS.importChars}" spellcheck="false" aria-describedby="h-${VISITS_TEXT_ID}${err ? ` e-${VISITS_TEXT_ID}` : ""}"${err ? ' aria-invalid="true"' : ""} ${FIELD_STYLE}>${esc(ctx.text)}</textarea>` +
    `<label for="${VISITS_OPEN_ID}">${esc(t(C.openLabel, l))}</label>` +
    `<input id="${VISITS_OPEN_ID}" type="file" accept=".json,application/json,text/plain" ${FIELD_STYLE}>` +
    `<p>${button(t(C.read, l), { type: "submit", "data-action": "fvp-read" })}</p>` +
    `</form>` +
    `<p>${button(t(C.clear, l), { "data-action": "fvp-clear", class: "secondary" })}</p>` +
    (plan ? `<p id="fvp-summary" tabindex="-1">${esc(planSummary(plan, l))}</p>${renderPlanForm(ctx)}${renderPlan(ctx, plan)}` : "") +
    `</section></div>`
  );
}

/** Reads the form's current values from the page. */
export function readPlanForm(root: ParentNode, fallback: PlanForm): PlanForm {
  const value = (id: string, f: string): string => root.querySelector<HTMLInputElement>(`#${id}`)?.value ?? f;
  const checked = (id: string, f: boolean): boolean => root.querySelector<HTMLInputElement>(`#${id}`)?.checked ?? f;
  const boxes = Array.from(root.querySelectorAll<HTMLInputElement>('input[name="weekday"]'));
  return {
    start: value(FIELD_IDS.start, fallback.start),
    weekdays: boxes.length === 0 ? fallback.weekdays : WEEK.filter((d) => boxes.some((b) => b.checked && b.value === String(d))),
    startTime: value(FIELD_IDS.startTime, fallback.startTime),
    perDay: value(FIELD_IDS.perDay, fallback.perDay),
    minutes: value(FIELD_IDS.minutes, fallback.minutes),
    gap: value(FIELD_IDS.gap, fallback.gap),
    bothSides: checked(BOTH_SIDES_ID, fallback.bothSides),
    onlyOpen: checked(ONLY_OPEN_ID, fallback.onlyOpen),
    keepStreets: checked(KEEP_STREETS_ID, fallback.keepStreets),
  };
}
