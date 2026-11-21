import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import { exportNotes } from "./exchange";
import {
  FILE_DATES_COPY as C,
  changeText,
  copySummary,
  dateProblemText,
  datesErrorText,
  datesFilename,
  datesSummary,
  datesText,
  fileDatesStrings,
  placeText,
  recordText,
  slipText,
  sourceLine,
  suggestionLabel,
} from "./filedates-copy";
import { readStreetFile } from "./filestreets";
import { SLIP_KINDS, bySource, futureRecords, type DatesReport, type FixedCopy, type FutureRecord } from "./recorddates";
import { testNote } from "./testnotes";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function report(): DatesReport {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("a", "Library", [{ key: "elevator", value: "yes", on: "2062-03-01", source: "Branch walk", licence: "CC-BY-4.0" }], "100 King St W"),
        testNote("b", "Kiosk", [{ key: "automatic-door", value: "no", on: "2099-01-01" }], null),
      ],
      "2026-11-01",
    ),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return futureRecords(r.file, TODAY);
}

const record = (name: string): FutureRecord => {
  const f = report().future.find((x) => x.place.name === name);
  if (!f) throw new Error(name);
  return f;
};

const copy = (redated: number, cleared: number, kept: number): FixedCopy => ({ notes: [], redated, cleared, kept });

describe("copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileDatesStrings())).toEqual([]);
  });

  it("walks every pair, and none holds a banned word", () => {
    const pairs = fileDatesStrings();
    expect(pairs.map(([p]) => p)).toContain("fileDates.slips.year-digits");
    expect(pairs.map(([p]) => p)).toContain("fileDates.problems.after-today");
    for (const [path, p] of pairs) {
      expect(findBanned(p.en), path).toBeUndefined();
      expect(findBanned(p.fr), path).toBeUndefined();
    }
  });

  it("says the Unknown control removes the record, in both languages", () => {
    expect(C.unknown.en).toContain("removes");
    expect(C.unknown.fr).toContain("retire");
    expect(C.clear.en.startsWith("Remove")).toBe(true);
    expect(C.clear.fr.startsWith("Retirer")).toBe(true);
  });

  it("uses UNKNOWN in French, never “inconnu”", () => {
    for (const [, p] of fileDatesStrings()) expect(p.fr.toLowerCase()).not.toContain("inconnu");
    expect(C.unknown.fr).toContain("UNKNOWN");
  });

  it("has words for every slip, typed-date problem and file error", () => {
    for (const l of ["en", "fr"] as const) {
      for (const s of SLIP_KINDS) expect(slipText(s, l).length).toBeGreaterThan(0);
      for (const p of ["empty", "not-date", "after-today"] as const) expect(dateProblemText(p, l).length).toBeGreaterThan(0);
      for (const e of ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes"] as const) expect(datesErrorText(e, l).length).toBeGreaterThan(0);
    }
  });
});

describe("record lines", () => {
  it("names the place with its address, or the name alone", () => {
    expect(placeText(record("Library"))).toBe("Library, 100 King St W");
    expect(placeText(record("Kiosk"))).toBe("Kiosk");
  });

  it("gives the detail, value, source, licence and date", () => {
    expect(recordText(record("Library"), "en")).toBe("Elevator: Yes — Branch walk, CC-BY-4.0, dated 2062-03-01");
    const fr = recordText(record("Library"), "fr");
    expect(fr).toContain("\u00A0: Oui — Branch walk, CC-BY-4.0, datée du 2062-03-01");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("says which slip a suggestion undoes", () => {
    expect(suggestionLabel("2026-03-01", "year-digits", "en")).toBe("Use 2026-03-01 (the last two digits of the year swapped)");
    expect(suggestionLabel("2026-05-12", "day-month", "fr")).toBe("Utiliser 2026-05-12 (jour et mois inversés)");
  });
});

describe("summaries", () => {
  it("counts places, records and those dated after today", () => {
    expect(datesSummary(report(), "en")).toBe("2 places, 2 records: 2 are dated after today, 1 with a suggested date.");
    const fr = datesSummary(report(), "fr");
    expect(fr).toBe("2 lieux, 2 données\u00A0: 2 sont datées d’après aujourd’hui, dont 1 avec une date proposée.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("uses the singular for one", () => {
    const one: DatesReport = { places: 1, records: 1, future: [record("Library")] };
    expect(datesSummary(one, "en")).toBe("1 place, 1 record: 1 is dated after today, 1 with a suggested date.");
    expect(datesSummary(one, "fr")).toBe("1 lieu, 1 donnée\u00A0: 1 est datée d’après aujourd’hui, dont 1 avec une date proposée.");
    // French treats 0 as singular.
    expect(datesSummary({ places: 1, records: 0, future: [] }, "fr")).toBe("1 lieu, 0 donnée\u00A0: 0 est datée d’après aujourd’hui, dont 0 avec une date proposée.");
  });

  it("tells what the copy changed", () => {
    expect(copySummary(copy(2, 1, 1), "en")).toBe("2 records were given another date, 1 set back to Unknown, 1 kept with its date after today.");
    expect(copySummary(copy(1, 0, 3), "en")).toBe("1 record was given another date, 0 set back to Unknown, 3 kept with their date after today.");
    expect(copySummary(copy(2, 1, 1), "fr")).toBe("2 données ont reçu une autre date, 1 est remise à UNKNOWN, 1 garde sa date d’après aujourd’hui.");
    expect(copySummary(copy(1, 2, 3), "fr")).toBe("1 donnée a reçu une autre date, 2 sont remises à UNKNOWN, 3 gardent leur date d’après aujourd’hui.");
  });
});

describe("sources", () => {
  const src = (records: number, suggested: number, dm: number) => ({ source: "Spring survey", records, suggested, slips: { "year-digits": 0, "day-month": dm, "year-high": 0 } });

  it("names the source, its count and the slip that could explain several", () => {
    expect(sourceLine(src(3, 2, 2), "en")).toBe("Spring survey: 3 records, 2 with a suggested date. The same slip could explain 2: day and month swapped.");
    const fr = sourceLine(src(3, 2, 2), "fr");
    expect(fr).toBe("Spring survey\u00A0: 3 données, dont 2 avec une date proposée. La même erreur pourrait en expliquer 2\u00A0: jour et mois inversés.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("leaves the slip out when none explains more than one", () => {
    expect(sourceLine(src(1, 1, 1), "en")).toBe("Spring survey: 1 record, 1 with a suggested date.");
    expect(sourceLine(src(1, 0, 0), "fr")).toBe("Spring survey\u00A0: 1 donnée, dont 0 avec une date proposée.");
  });

  it("matches what bySource gives for a real file", () => {
    expect(bySource(report()).map((s) => sourceLine(s, "en"))).toEqual([
      "Branch walk: 1 record, 1 with a suggested date.",
      "City survey: 1 record, 0 with a suggested date.",
    ]);
  });
});

describe("the text list", () => {
  it("lists each record with its suggestions, then the sources, ending with one newline", () => {
    const text = datesText(report(), TODAY, "en");
    expect(text).toBe(
      [
        "Records dated after today",
        "2026-11-21",
        "",
        C.textIntro.en,
        "2 places, 2 records: 2 are dated after today, 1 with a suggested date.",
        "",
        "1. Kiosk",
        "    Automatic door: No — City survey, CC0-1.0, dated 2099-01-01",
        "    No plain typing slip gives a date on or before today.",
        "",
        "2. Library, 100 King St W",
        "    Elevator: Yes — Branch walk, CC-BY-4.0, dated 2062-03-01",
        "    Suggested: 2026-03-01 (the last two digits of the year swapped)",
        "",
        "Where these records come from",
        "- Branch walk: 1 record, 1 with a suggested date.",
        "- City survey: 1 record, 0 with a suggested date.",
        "",
      ].join("\n"),
    );
  });

  it("is in French with French spacing", () => {
    const text = datesText(report(), TODAY, "fr");
    expect(text).toContain("    Proposé\u00A0: 2026-03-01 (les deux derniers chiffres de l’année inversés)");
    expect(text.startsWith("Données datées d’après aujourd’hui\n2026-11-21\n")).toBe(true);
    for (const line of text.split("\n")) expect(frenchTypographyIssues(line), line).toEqual([]);
  });

  it("has only the heading lines when nothing is dated after today", () => {
    expect(datesText({ places: 1, records: 0, future: [] }, TODAY, "en").split("\n")).toHaveLength(6);
  });
});

describe("changes", () => {
  it("shows the old and new date, or that the detail is back to Unknown", () => {
    const lib = record("Library");
    expect(changeText({ record: lib, to: "2026-03-01" }, "en")).toBe("Library, 100 King St W — Elevator: 2062-03-01 → 2026-03-01");
    expect(changeText({ record: record("Kiosk"), to: "unknown" }, "en")).toBe("Kiosk — Automatic door: set back to Unknown");
    const fr = changeText({ record: lib, to: "unknown" }, "fr");
    expect(fr).toBe("Library, 100 King St W — Ascenseur\u00A0: remis à UNKNOWN");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });
});

describe("file names", () => {
  it("dates the copy and the list, in each language, without accents", () => {
    expect(datesFilename("copy", TODAY, "en")).toBe("notes-dates-fixed-2026-11-21.json");
    expect(datesFilename("csv", TODAY, "en")).toBe("records-dated-after-today-2026-11-21.csv");
    expect(datesFilename("copy", TODAY, "fr")).toBe("notes-dates-corrigees-2026-11-21.json");
    expect(datesFilename("csv", TODAY, "fr")).toBe("donnees-datees-apres-aujourdhui-2026-11-21.csv");
    expect(datesFilename("text", TODAY, "en")).toBe("records-dated-after-today-2026-11-21.txt");
    expect(datesFilename("text", TODAY, "fr")).toBe("donnees-datees-apres-aujourdhui-2026-11-21.txt");
    for (const k of ["copy", "csv", "text"] as const) for (const l of ["en", "fr"] as const) expect(datesFilename(k, TODAY, l)).toMatch(/^[a-z0-9.-]+$/);
  });
});
