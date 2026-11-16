/**
 * The logic behind the mapping-day screen, kept out of the component so it can be tested
 * without a browser. Nothing here reads the clock: today comes in as a value.
 */
import {
  CELL_SIZES_M,
  FOCUS_IDS,
  areaIssues,
  boundsAround,
  buildDayFiles,
  buildDebrief,
  cellRows,
  computeCoverage,
  createSession,
  estimateTime,
  makeGrid,
  parseDecimal,
  planRoute,
  revisitList,
  routeSummary,
  type Bounds,
  type CellCoverage,
  type Coverage,
  type CoverageRecord,
  type DayFile,
  type DayLang,
  type DebriefSection,
  type FocusId,
  type MappingDay,
  type OrderStyle,
  type PlannedRoute,
  type SessionIssue,
} from "./docs-bridge.js";
import type { PlaceRecord } from "./types.js";

export type DayFormField = "name" | "date" | "south" | "west" | "north" | "east" | "cellMetres" | "notes" | "focus" | "area";

export interface DayForm {
  name: string;
  date: string;
  south: string;
  west: string;
  north: string;
  east: string;
  cellMetres: string;
  focus: FocusId[];
  notes: string;
}

export type FormErrors = Partial<Record<DayFormField, SessionIssue[]>>;

export function emptyDayForm(today: string): DayForm {
  return { name: "", date: today, south: "", west: "", north: "", east: "", cellMetres: "200", focus: [], notes: "" };
}

/** A number as text for a form field, with a decimal comma in French. */
export function numberText(value: number, language: DayLang): string {
  const text = String(Math.round(value * 1e6) / 1e6);
  return language === "fr" ? text.replace(".", ",") : text;
}

export function formWithBounds(form: DayForm, bounds: Bounds, language: DayLang): DayForm {
  return { ...form, south: numberText(bounds.south, language), west: numberText(bounds.west, language), north: numberText(bounds.north, language), east: numberText(bounds.east, language) };
}

/** The area around saved observations, with a margin. Null when there are none to go on. */
export function boundsFromRecords(records: readonly PlaceRecord[], marginM = 120): Bounds | null {
  return boundsAround(records, marginM);
}

function group(errors: FormErrors, issue: SessionIssue): void {
  const field = issue.field === "session" || issue.field === "id" ? "name" : issue.field;
  (errors[field] ??= []).push(issue);
}

/** Turns the text in the form into a session, or says which field is wrong. A field that is not a number is reported, not read as zero. */
export function submitDayForm(form: DayForm): { ok: true; session: MappingDay } | { ok: false; errors: FormErrors } {
  const errors: FormErrors = {};
  const read = (field: "south" | "west" | "north" | "east"): number => {
    const value = parseDecimal(form[field]);
    if (value === null) group(errors, { code: "not-a-number", field });
    return value ?? Number.NaN;
  };
  const bounds: Bounds = { south: read("south"), west: read("west"), north: read("north"), east: read("east") };
  const cell = /^\d+$/.test(form.cellMetres.trim()) ? Number(form.cellMetres.trim()) : Number.NaN;
  const result = createSession({ name: form.name, date: form.date, bounds, cellMetres: cell, focus: form.focus, notes: form.notes });
  if (result.ok && Object.keys(errors).length === 0) return { ok: true, session: result.session };
  if (!result.ok) {
    for (const issue of result.issues) {
      // A bounds field that was not a number is already reported above.
      if (issue.code === "not-a-number" && errors[issue.field as DayFormField]) continue;
      group(errors, issue);
    }
  }
  return { ok: false, errors };
}

export function toCoverageRecords(records: readonly PlaceRecord[]): CoverageRecord[] {
  return records.map((r) => ({ id: r.id, lat: r.lat, lon: r.lon, wheelchair: r.wheelchair, observedOn: r.observedOn }));
}

export interface DayOptions {
  /** Which records count: all saved ones, or only those observed on or after the session date. */
  scope: "all" | "since-session-date";
  order: OrderStyle;
  /** Pace text from the form. Blank means the person gave none. */
  metresPerMinute: string;
  minutesPerCell: string;
}

export const DEFAULT_OPTIONS: DayOptions = { scope: "all", order: "rows", metresPerMinute: "", minutesPerCell: "" };

export interface DayView {
  coverage: Coverage;
  rows: CellCoverage[][];
  route: PlannedRoute;
  routeLines: string[];
  debrief: DebriefSection[];
  files: DayFile[];
  toRevisit: CellCoverage[];
}

function positiveNumber(text: string): number | undefined {
  const value = parseDecimal(text);
  return value !== null && value > 0 ? value : undefined;
}

export function buildDayView(session: MappingDay, records: readonly PlaceRecord[], options: DayOptions, language: DayLang, today: string): DayView | null {
  const grid = makeGrid(session.bounds, session.cellMetres);
  if (!grid.ok) return null;
  const scope = options.scope === "all" ? ({ kind: "all" } as const) : ({ kind: "since", date: session.date } as const);
  const coverage = computeCoverage(grid.grid, toCoverageRecords(records), scope);
  const toRevisit = revisitList(coverage);
  const route = planRoute(grid.grid, toRevisit, options.order);
  const minutesPerCell = parseDecimal(options.minutesPerCell);
  const time = estimateTime(route, { metresPerMinute: positiveNumber(options.metresPerMinute), minutesPerCell: minutesPerCell !== null && minutesPerCell >= 0 ? minutesPerCell : undefined });
  return {
    coverage,
    rows: cellRows(coverage),
    route,
    routeLines: routeSummary(route, time, language),
    debrief: buildDebrief(session, coverage, language, { today }),
    files: buildDayFiles(session, coverage, language, today),
    toRevisit,
  };
}

export const FORM_CELL_SIZES: readonly number[] = CELL_SIZES_M;
export const FORM_FOCUS: readonly FocusId[] = FOCUS_IDS;

/** Problems with the four edges alone, for a check before the rest of the form is filled in. */
export function edgeProblems(form: DayForm): SessionIssue[] {
  const values = [form.south, form.west, form.north, form.east].map(parseDecimal);
  if (values.some((v) => v === null)) return [];
  const [south, west, north, east] = values as number[];
  return areaIssues({ south: south as number, west: west as number, north: north as number, east: east as number }).map((i) => ({ code: i.code, field: i.field }));
}
