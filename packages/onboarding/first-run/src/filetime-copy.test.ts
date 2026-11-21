import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import { exportNotes } from "./exchange";
import { readStreetFile } from "./filestreets";
import {
  FILE_TIME_COPY,
  dayFilename,
  dayProblemText,
  dayStateText,
  daySummary,
  fileTimeStrings,
  percentText,
  periodText,
  rowCells,
  stepText,
  timeErrorText,
  timeFilename,
  timelineSummary,
  timelineText,
} from "./filetime-copy";
import { DAY_STATES, type FileOnDay } from "./recordasof";
import { MAX_PERIODS, fileTimeline, type Timeline } from "./recordtimeline";
import { testNote } from "./testnotes";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const NB = "\u00A0";
const NN = "\u202F";

function timeline(): Timeline {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("a", "Library", [
          { key: "elevator", value: "yes", on: "2026-01-10" },
          { key: "accessible-washroom", value: "yes", on: "2026-03-05" },
        ], "100 King St W"),
        testNote("b1", "Bank", [{ key: "elevator", value: "yes", on: "2026-01-20" }], "40 Queen St E"),
        testNote("b2", "Bank", [{ key: "elevator", value: "no", on: "2026-03-15", source: "Visit" }], "40 Queen St E"),
        testNote("c", "Cart", [], null),
      ],
      "2026-11-01",
    ),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return fileTimeline(r.file, "month", "", TODAY);
}

describe("copy", () => {
  it("passes the App's copy audit, with no banned words", () => {
    expect(auditCopy(fileTimeStrings())).toEqual([]);
    for (const [k, p] of fileTimeStrings()) {
      expect(findBanned(p.en), k).toBeUndefined();
      expect(findBanned(p.fr), k).toBeUndefined();
    }
  });

  it("has a message for every file error and a name for each step", () => {
    for (const l of ["en", "fr"] as const) {
      for (const e of ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes"] as const) expect(timeErrorText(e, l).length).toBeGreaterThan(0);
      expect(stepText("month", l)).not.toBe(stepText("year", l));
    }
  });

  it("says what the dates mean, that places with no record count, and that the French copy uses the UNKNOWN token", () => {
    expect(FILE_TIME_COPY.meaning.en).toContain("not the day it was added to the App");
    expect(FILE_TIME_COPY.meaning.en).toContain("even a place with no record yet");
    expect(FILE_TIME_COPY.noDates.fr).toContain("UNKNOWN");
  });
});

describe("numbers and periods", () => {
  it("writes a percent the way each language does", () => {
    expect(percentText(42, "en")).toBe("42%");
    expect(percentText(42, "fr")).toBe(`42${NN}%`);
  });

  it("names a month in each language and leaves a year as it is", () => {
    expect(periodText("2026-03", "en")).toBe("March 2026");
    expect(periodText("2026-03", "fr")).toBe("mars 2026");
    expect(periodText("2024", "fr")).toBe("2024");
  });

  it("gives a row's cells with the share beside the details with a record", () => {
    const row = timeline().rows[2];
    if (!row) throw new Error("no row");
    expect(rowCells(row, 12, "en")).toEqual(["March 2026", "2", "1", "0", "3 (25%)", "1"]);
    expect(rowCells(row, 12, "fr")).toEqual(["mars 2026", "2", "1", "0", `3 (25${NN}%)`, "1"]);
  });
});

describe("timelineSummary", () => {
  it("gives the records, the span and where the file stands at the end", () => {
    expect(timelineSummary(timeline(), "en")).toBe("3 places, 4 records dated January 2026 – March 2026. By the end, 3 of 12 details have a record (25%); 1 detail has reports that differ.");
    const fr = timelineSummary(timeline(), "fr");
    expect(fr).toBe(
      `3 lieux, 4 données datées de janvier 2026 – mars 2026. À la fin, 3 des 12${NB}détails ont une donnée (25${NN}%)${NN}; 1 détail a des rapports divergents.`,
    );
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("says when periods are not listed and when records are dated after today", () => {
    const tl = { ...timeline(), hidden: 7, future: 2 };
    expect(timelineSummary(tl, "en")).toContain(`The last ${MAX_PERIODS} periods are shown; the 7 before them count in the totals. 2 records are dated after today and left out.`);
    const fr = timelineSummary({ ...tl, future: 1 }, "fr");
    expect(fr).toContain("1 donnée est datée d’après aujourd’hui et n’est pas comptée.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("says so when nothing is dated, and names one month once", () => {
    expect(timelineSummary({ ...timeline(), rows: [] }, "en")).toBe("3 places, no dated record.");
    const one = timeline();
    expect(timelineSummary({ ...one, rows: one.rows.slice(0, 1) }, "en")).toContain("dated January 2026.");
  });
});

describe("timelineText", () => {
  it("prints the title, the day, the area, the summary and each row and detail", () => {
    const text = timelineText(timeline(), " queen ", TODAY, "en");
    expect(text.split("\n").slice(0, 4)).toEqual(["Records over time", "Made on 2026-11-21", "Area: queen", ""]);
    expect(text).toContain(
      "  March 2026: Records dated in the period 2 · Details with their first record 1 · Places with their first record 0 · Details with a record by the end 3 (25%) · Details where reports differ by the end 1\n",
    );
    expect(text).toContain("  Elevator: Records 3 · Places with a record 2 · 2026-01-10 – 2026-03-15\n");
    expect(text).toContain("  Automatic door: Records 0 · Places with a record 0 · none\n");
  });

  it("leaves out the area line when there is none, and keeps French typography", () => {
    const text = timelineText(timeline(), "", TODAY, "fr");
    expect(text).not.toContain("Secteur");
    for (const line of text.split("\n")) expect(frenchTypographyIssues(line), line).toEqual([]);
  });

  it("names downloads by step, day and language", () => {
    expect(timeFilename("csv", "month", TODAY, "en")).toBe("records-over-time-by-month-2026-11-21.csv");
    expect(timeFilename("text", "year", TODAY, "fr")).toBe("donnees-au-fil-du-temps-par-annee-2026-11-21.txt");
  });
});

describe("the day", () => {
  const day: FileOnDay = { day: "2026-03-31", places: 3, details: 12, recorded: 5, differing: 1, later: 0, byDetail: [] };

  it("says what the file held on the day, and how many later records are left out", () => {
    expect(daySummary(day, "en")).toBe("On 2026-03-31, 5 of 12 details had a record (41%) and 1 had reports that differ.");
    expect(daySummary({ ...day, later: 3 }, "en")).toBe("On 2026-03-31, 5 of 12 details had a record (41%) and 1 had reports that differ. 3 records dated later are left out.");
    const fr = daySummary({ ...day, later: 1 }, "fr");
    expect(fr).toBe(`Au 2026-03-31, 5 des 12${NB}détails avaient une donnée (41${NN}%) et 1 des rapports divergents. 1 donnée datée d’après cette date est laissée de côté.`);
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("uses the App's words for each state, UNKNOWN in French", () => {
    expect(DAY_STATES.map((s) => dayStateText(s, "en"))).toEqual(["Yes", "No", "Reports differ", "Unknown"]);
    expect(dayStateText("unknown", "fr")).toBe("UNKNOWN");
  });

  it("explains each problem with the day and names the download by the day", () => {
    for (const l of ["en", "fr"] as const) for (const p of ["empty", "not-date", "after-today"] as const) expect(dayProblemText(p, l)).toContain(p === "after-today" ? (l === "en" ? "today" : "aujourd’hui") : "2026-03-31");
    expect(dayFilename("2026-03-31", "en")).toBe("notes-as-of-2026-03-31.json");
    expect(dayFilename("2026-03-31", "fr")).toBe("notes-au-2026-03-31.json");
  });

  it("says the copy keeps every note and holds only what was recorded by then", () => {
    expect(FILE_TIME_COPY.day.downloadHint.en).toContain("Every note stays in the copy.");
    expect(FILE_TIME_COPY.day.intro.fr).toContain("UNKNOWN");
  });
});
