/**
 * Entry point for "Plan visits by day" (`@access/onboarding/file-visits`).
 * Like the other file tools, it is loaded with a dynamic import() only when a
 * person opens it, so it adds nothing to the first install.
 */
export { decodeIcsHref, foldLine, icsCalendar, icsEscape, icsHref, icsLocalTime, icsStamp, unfoldLines, type IcsCalendar, type IcsEvent, type IcsTime } from "./ics";
export {
  DAY_MINUTES,
  PLAN_CSV_COLUMNS,
  PLAN_FIELDS,
  PLAN_LIMITS,
  WEEK,
  checkPlanForm,
  clockValue,
  dayLength,
  defaultPlanOptions,
  formFor,
  parseClock,
  parseIsoDate,
  planComplete,
  planCsv,
  planVisitList,
  planVisits,
  visitDates,
  type Plan,
  type PlanCheck,
  type PlanDay,
  type PlanField,
  type PlanForm,
  type PlanOptions,
  type PlanProblem,
  type Visit,
  type Weekday,
} from "./visitplan";
export { FILE_VISITS_COPY, fileVisitsStrings, longDate, planCalendar, planSummary, planText, visitsFilename } from "./filevisits-copy";
export { mountFileVisits, type FileVisitsHandle, type FileVisitsOptions } from "./filevisits-mount";
export { readPlanForm, renderFileVisits, type FileVisitsContext } from "./views-filevisits";
