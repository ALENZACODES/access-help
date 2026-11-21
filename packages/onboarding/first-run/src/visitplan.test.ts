import { describe, expect, it } from "vitest";
import { exportNotes } from "./exchange";
import { readStreetFile, type StreetFile } from "./filestreets";
import { testNote } from "./testnotes";
import {
  PLAN_CSV_COLUMNS,
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
  type PlanForm,
  type PlanOptions,
} from "./visitplan";

const TODAY = new Date(Date.UTC(2026, 10, 20)); // a Friday

const DONE = [
  { key: "elevator", value: "yes" },
  { key: "step-free-entry", value: "yes" },
  { key: "automatic-door", value: "no" },
  { key: "accessible-washroom", value: "yes" },
] as const;

function file(notes = [
  testNote("k1", "Library", [], "100 King St W"),
  testNote("k2", "Café", [], "12 King Street West"),
  testNote("k3", "Bank", [], "40 King St W"),
  testNote("e1", "Bakery", [], "5 Elm Ave"),
  testNote("e2", "Florist", [], "9 Elm Ave"),
  testNote("n1", "Market", [], "Toronto"),
]): StreetFile {
  const r = readStreetFile(exportNotes(notes, "2026-11-01"), TODAY, "en");
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const OPTIONS: PlanOptions = { ...defaultPlanOptions(TODAY), start: "2026-11-23", perDay: 3 };

const names = (o: PlanOptions, f = file()): string[][] => planVisits(f, o, "en").days.map((d) => d.visits.map((v) => v.place.name));

describe("dates and times", () => {
  it("reads a real date only", () => {
    expect(parseIsoDate("2026-11-23")?.toISOString()).toBe("2026-11-23T00:00:00.000Z");
    expect(parseIsoDate(" 2028-02-29 ")).toBeDefined();
    for (const s of ["2026-02-29", "2026-13-01", "2026-11-31", "26-11-23", "2026/11/23", "", "tomorrow"]) expect(parseIsoDate(s), s).toBeUndefined();
  });

  it("reads a time the English or the French way", () => {
    expect(parseClock("9:30")).toBe(570);
    expect(parseClock("09:30")).toBe(570);
    expect(parseClock("9 h 30")).toBe(570);
    expect(parseClock("9h30")).toBe(570);
    expect(parseClock("0:00")).toBe(0);
    expect(parseClock("23:59")).toBe(1439);
    for (const s of ["24:00", "9:60", "930", "9:3", "nine", ""]) expect(parseClock(s), s).toBeUndefined();
    expect(clockValue(570)).toBe("09:30");
  });

  it("gives the dates for the chosen weekdays, from the first day on", () => {
    const it = visitDates("2026-11-20", [1, 3]);
    expect([it.next().value, it.next().value, it.next().value]).toEqual(["2026-11-23", "2026-11-25", "2026-11-30"]);
    const sat = visitDates("2026-11-21", [6]);
    expect(sat.next().value).toBe("2026-11-21");
    expect(visitDates("2026-11-21", []).next().done).toBe(true);
    expect(visitDates("nope", [1]).next().done).toBe(true);
  });

  it("measures a day from the first start to the last end", () => {
    expect(dayLength(1, 30, 15)).toBe(30);
    expect(dayLength(6, 30, 15)).toBe(255);
  });
});

describe("checkPlanForm", () => {
  const good = formFor(OPTIONS);

  it("reads a good form back into the same options", () => {
    const c = checkPlanForm(good);
    expect(c.ok && c.options).toEqual(OPTIONS);
  });

  it("puts the weekdays in week order, Monday first, without repeats", () => {
    const c = checkPlanForm({ ...good, weekdays: [0, 5, 1, 1] });
    expect(c.ok && c.options.weekdays).toEqual([1, 5, 0]);
  });

  it("reports every problem at once, in the order of the fields", () => {
    const bad: PlanForm = { ...good, start: "2026-02-30", weekdays: [], startTime: "25:00", perDay: "0", minutes: "4", gap: "121" };
    const c = checkPlanForm(bad);
    expect(c.ok).toBe(false);
    if (c.ok) return;
    expect(c.problems.map((p) => `${p.field}:${p.code}`)).toEqual(["start:date", "weekdays:weekdays", "startTime:time", "perDay:perDay", "minutes:minutes", "gap:gap"]);
  });

  it("refuses a day that would end after midnight, on the visits-a-day field", () => {
    const c = checkPlanForm({ ...good, startTime: "22:00", perDay: "4", minutes: "30", gap: "15" });
    expect(c.ok ? [] : c.problems).toEqual([{ field: "perDay", code: "pastMidnight" }]);
    expect(checkPlanForm({ ...good, startTime: "22:00", perDay: "2", minutes: "30", gap: "60" }).ok).toBe(true);
  });

  it("accepts the limits and refuses what is past them or not a whole number", () => {
    expect(checkPlanForm({ ...good, startTime: "0:00", perDay: "30", minutes: "5", gap: "0" }).ok).toBe(true);
    expect(checkPlanForm({ ...good, startTime: "0:00", perDay: "1", minutes: "240", gap: "120" }).ok).toBe(true);
    for (const perDay of ["31", "2.5", "-1", " ", "1e1"]) expect(checkPlanForm({ ...good, perDay }).ok, perDay).toBe(false);
  });
});

describe("planVisits", () => {
  it("visits street by street in house-number order, then the places with no street", () => {
    expect(names({ ...OPTIONS, perDay: 30 })).toEqual([["Bakery", "Florist", "Café", "Bank", "Library", "Market"]]);
  });

  it("starts a street on the next day when it would not fit in what is left of a day", () => {
    // Elm (2) fits on day 1; King (3) does not fit in the 1 slot left, so it starts day 2.
    expect(names(OPTIONS)).toEqual([["Bakery", "Florist"], ["Café", "Bank", "Library"], ["Market"]]);
    expect(planVisits(file(), OPTIONS, "en").splitStreets).toEqual([]);
  });

  it("fills every day when streets may be cut, and says which streets were cut", () => {
    const o = { ...OPTIONS, keepStreets: false };
    expect(names(o)).toEqual([["Bakery", "Florist", "Café"], ["Bank", "Library", "Market"]]);
    expect(planVisits(file(), o, "en").splitStreets).toEqual(["King Street West"]);
  });

  it("cuts a street longer than a day even when keeping streets together", () => {
    const o = { ...OPTIONS, perDay: 2 };
    expect(names(o)).toEqual([["Bakery", "Florist"], ["Café", "Bank"], ["Library", "Market"]]);
    expect(planVisits(file(), o, "en").splitStreets).toEqual(["King Street West"]);
  });

  it("puts the days on the chosen weekdays only", () => {
    const plan = planVisits(file(), { ...OPTIONS, start: "2026-11-20", weekdays: [2, 4] }, "en");
    expect(plan.days.map((d) => d.date)).toEqual(["2026-11-24", "2026-11-26", "2026-12-01"]);
  });

  it("times the visits one after another with the gap between", () => {
    const plan = planVisits(file(), { ...OPTIONS, startTime: 9 * 60, minutes: 45, gap: 20 }, "en");
    const day = plan.days[1];
    expect(day?.visits.map((v) => `${clockValue(v.start)}-${clockValue(v.end)}`)).toEqual(["09:00-09:45", "10:05-10:50", "11:10-11:55"]);
    expect(day?.visits.every((v) => v.street === "King Street West")).toBe(true);
    expect(plan.days[2]?.visits[0]?.street).toBeUndefined();
  });

  it("walks both sides of a street when asked", () => {
    const f = file([testNote("a", "One", [], "1 Oak St"), testNote("b", "Two", [], "2 Oak St"), testNote("c", "Three", [], "3 Oak St"), testNote("d", "Four", [], "4 Oak St")]);
    expect(names({ ...OPTIONS, perDay: 10, bothSides: true }, f)).toEqual([["One", "Three", "Four", "Two"]]);
  });

  it("leaves out places with nothing to look at, and counts them", () => {
    const f = file([testNote("a", "Done", DONE, "1 Oak St"), testNote("b", "Open", [], "2 Oak St")]);
    const plan = planVisits(f, { ...OPTIONS, onlyOpen: true }, "en");
    expect(plan.leftOutDone).toBe(1);
    expect(planVisitList(plan).map((v) => v.place.name)).toEqual(["Open"]);
    expect(planComplete(f, plan, true)).toBe(true);
    expect(planComplete(f, plan, false)).toBe(false);
  });

  it("makes no days when every place is left out", () => {
    const f = file([testNote("a", "Done", DONE, "1 Oak St")]);
    expect(planVisits(f, { ...OPTIONS, onlyOpen: true }, "en").days).toEqual([]);
  });

  it("holds every place once, with no visits overlapping, for many sizes", () => {
    const many = file(Array.from({ length: 23 }, (_, i) => testNote(`p${i}`, `Place ${i}`, [], i % 5 === 0 ? null : `${i + 1} ${["Oak St", "Elm Ave", "rue Principale"][i % 3]}`)));
    for (const perDay of [1, 2, 4, 7, 30]) {
      for (const keepStreets of [true, false]) {
        const plan = planVisits(many, { ...OPTIONS, perDay, keepStreets, gap: 0 }, "en");
        expect(planComplete(many, plan, false), `${perDay} ${keepStreets}`).toBe(true);
        expect(plan.days.every((d) => d.visits.length >= 1 && d.visits.length <= perDay)).toBe(true);
        expect(new Set(plan.days.map((d) => d.date)).size).toBe(plan.days.length);
      }
    }
  });
});

describe("planCsv", () => {
  it("has a row per visit with its time, street and what to look at", () => {
    const f = file([testNote("a", "=Shop", [{ key: "elevator", value: "yes" }], "12 King St W"), testNote("b", "Kiosk", [], null)]);
    const lines = planCsv(planVisits(f, OPTIONS, "en")).replace(/^\uFEFF/, "").trimEnd().split("\r\n");
    expect(lines[0]).toBe(PLAN_CSV_COLUMNS.join(","));
    expect(lines[1]).toMatch(/^2026-11-23,10:00,10:30,King Street West,12,'=Shop,12 King St W,step-free-entry accessible-washroom automatic-door,$/);
    expect(lines[2]).toBe("2026-11-23,10:45,11:15,,,Kiosk,,step-free-entry accessible-washroom automatic-door elevator,");
  });
});
