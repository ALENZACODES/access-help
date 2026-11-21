import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import { exportNotes } from "./exchange";
import { readStreetFile, type StreetFile } from "./filestreets";
import {
  FILE_VISITS_COPY,
  FIELD_LABELS,
  clockText,
  dayHeading,
  fileVisitsStrings,
  longDate,
  lookAtLine,
  planCalendar,
  planEvents,
  planSummary,
  planText,
  problemText,
  timeRange,
  visitsErrorText,
  visitsFilename,
  weekdayName,
} from "./filevisits-copy";
import { unfoldLines } from "./ics";
import { testNote } from "./testnotes";
import { PLAN_FIELDS, WEEK, defaultPlanOptions, planVisits, type PlanOptions, type PlanProblemCode } from "./visitplan";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const OPTIONS: PlanOptions = { ...defaultPlanOptions(TODAY), start: "2026-11-23", perDay: 2 };

function file(): StreetFile {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("a", "Library", [{ key: "elevator", value: "yes" }], "100 King St W"),
        testNote("b", "Café", [{ key: "elevator", value: "yes" }], "12 King St W"),
        testNote("b2", "Café", [{ key: "elevator", value: "no", on: "2026-10-05" }], "12 King St W"),
        testNote("c", "Kiosk", [], null),
      ],
      "2026-11-01",
    ),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const CODES: readonly PlanProblemCode[] = ["date", "weekdays", "time", "perDay", "minutes", "gap", "pastMidnight"];

describe("copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileVisitsStrings())).toEqual([]);
  });

  it("names every field and every weekday, in both languages", () => {
    for (const f of PLAN_FIELDS) expect(FIELD_LABELS[f].en.length).toBeGreaterThan(0);
    expect(WEEK.map((d) => weekdayName(d, "en"))).toEqual(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);
    expect(WEEK.map((d) => weekdayName(d, "fr"))).toEqual(["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]);
  });

  it("has a message for every problem and file error, without banned words", () => {
    for (const l of ["en", "fr"] as const) {
      for (const c of CODES) expect(findBanned(problemText(c, l)), c).toBeUndefined();
      for (const e of ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes"] as const) expect(visitsErrorText(e, l).length).toBeGreaterThan(0);
    }
  });
});

describe("dates and times in words", () => {
  it("writes a long date the same way on every device", () => {
    expect(longDate("2026-11-23", "en")).toBe("Monday, November 23, 2026");
    expect(longDate("2026-11-23", "fr")).toBe("lundi 23 novembre 2026");
    expect(longDate("2026-12-01", "fr")).toBe("mardi 1er décembre 2026");
    expect(longDate("not a date", "en")).toBe("not a date");
  });

  it("writes times the English and the French way", () => {
    expect(clockText(9 * 60 + 5, "en")).toBe("9:05");
    expect(clockText(9 * 60 + 5, "fr")).toBe("9 h 05");
    expect(timeRange({ start: 600, end: 630 }, "en")).toBe("10:00 to 10:30");
    expect(timeRange({ start: 600, end: 630 }, "fr")).toBe("10 h 00 à 10 h 30");
  });
});

describe("summaries", () => {
  it("counts the visits and days, with the first and last day", () => {
    const plan = planVisits(file(), OPTIONS, "en");
    expect(planSummary(plan, "en")).toBe("3 visits over 2 days, from Monday, November 23, 2026 to Tuesday, November 24, 2026.");
    expect(planSummary(plan, "fr")).toBe("3 visites sur 2 jours, du lundi 23 novembre 2026 au mardi 24 novembre 2026.");
    expect(dayHeading(plan.days[0] ?? { index: 0, date: "", visits: [] }, "en")).toBe("Monday, November 23, 2026 (2 visits)");
  });

  it("names the one day when everything fits in it, and says when nothing is left to plan", () => {
    const plan = planVisits(file(), { ...OPTIONS, perDay: 5 }, "en");
    expect(planSummary(plan, "en")).toBe("3 visits on Monday, November 23, 2026.");
    expect(planSummary(plan, "fr")).toBe("3 visites le lundi 23 novembre 2026.");
    expect(planSummary({ days: [], leftOutDone: 0, splitStreets: [] }, "en")).toBe("No visits to plan.");
    expect(planSummary({ days: [], leftOutDone: 2, splitStreets: [] }, "fr")).toBe("Aucune visite à planifier. 2 lieux sans rien à regarder sont laissés de côté.");
  });

  it("keeps French typography in every summary", () => {
    const plan = planVisits(file(), OPTIONS, "fr");
    for (const s of [planSummary(plan, "fr"), ...plan.days.map((d) => dayHeading(d, "fr")), ...plan.days.flatMap((d) => d.visits.map((v) => lookAtLine(v, "fr")))]) {
      expect(frenchTypographyIssues(s), s).toEqual([]);
    }
  });
});

describe("what to look at", () => {
  it("lists details with no record and reports that differ", () => {
    const plan = planVisits(file(), OPTIONS, "en");
    const cafe = plan.days[0]?.visits.find((v) => v.place.name === "Café");
    if (!cafe) throw new Error("no café");
    expect(lookAtLine(cafe, "en")).toBe("To look at: Step-free entrance, Accessible washroom, Automatic door (Unknown); Elevator (reports differ)");
    expect(lookAtLine(cafe, "fr")).toContain("(UNKNOWN)");
    expect(lookAtLine(cafe, "fr")).not.toMatch(/inconnu/i);
  });
});

describe("calendar", () => {
  it("makes one event per visit, with a stable uid, the address and what to look at", () => {
    const plan = planVisits(file(), OPTIONS, "en");
    const events = planEvents(plan, "en");
    expect(events.map((e) => e.summary)).toEqual(["Café", "Library", "Kiosk"]);
    expect(events[0]?.uid).toMatch(/-20261123@plan-visits$/);
    expect(planEvents(planVisits(file(), OPTIONS, "en"), "en").map((e) => e.uid)).toEqual(events.map((e) => e.uid));
    expect(events[2]?.location).toBeUndefined();
    expect(events[0]?.description?.split("\n")[0]).toBe(lookAtLine(plan.days[0]?.visits[0] as never, "en"));
  });

  it("writes the calendar file with the plan's times", () => {
    const lines = unfoldLines(planCalendar(planVisits(file(), OPTIONS, "fr"), "fr", TODAY));
    expect(lines).toContain("PRODID:-//the App//Plan visits by day//FR");
    expect(lines).toContain("X-WR-CALNAME:Visites");
    expect(lines.filter((l) => l.startsWith("DTSTART:"))).toEqual(["DTSTART:20261123T100000", "DTSTART:20261123T104500", "DTSTART:20261124T100000"]);
    expect(lines).toContain("LOCATION:12 King St W");
  });
});

describe("planText", () => {
  it("prints each day with its visits, times and a line to write what was found", () => {
    const text = planText(planVisits(file(), OPTIONS, "en"), "en", TODAY);
    expect(text).toContain("Plan of visits\nMade on 2026-11-20\n3 visits over 2 days");
    expect(text).toContain("Monday, November 23, 2026 (2 visits)\n=");
    expect(text).toContain("10:00 to 10:30 (King Street West)\n[ ] Café\n    12 King St W\n");
    expect(text).toContain("10:00 to 10:30\n[ ] Kiosk\n    No address\n");
    expect(text).toContain("Found: ________");
  });

  it("keeps French typography outside the places' own names and addresses", () => {
    const text = planText(planVisits(file(), OPTIONS, "fr"), "fr", TODAY);
    for (const line of text.split("\n")) if (!line.startsWith("[ ]") && !/^ {4}\d/.test(line)) expect(frenchTypographyIssues(line), line).toEqual([]);
    expect(text).toContain("10 h 00 à 10 h 30");
  });
});

describe("visitsFilename", () => {
  it("names the downloads by kind, day and language", () => {
    expect(visitsFilename("ics", TODAY, "en")).toBe("visit-plan-2026-11-20.ics");
    expect(visitsFilename("text", TODAY, "fr")).toBe("plan-des-visites-2026-11-20.txt");
    expect(visitsFilename("csv", TODAY, "en")).toBe("visit-plan-2026-11-20.csv");
  });

  it("has a title on the Note files page", () => {
    expect(FILE_VISITS_COPY.title.fr).toBe("Planifier les visites par jour");
  });
});
