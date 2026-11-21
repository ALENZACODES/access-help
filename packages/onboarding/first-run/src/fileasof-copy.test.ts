import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { compare, snapshot, type Comparison, type Snapshot } from "./asof";
import { auditCopy } from "./audit";
import { exportNotes } from "./exchange";
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
  fileAsofStrings,
  nowLabel,
  placeLine,
  quickLabel,
  readingText,
  resultsTitle,
  snapshotSummary,
  sourceSinceLine,
  toProblemText,
} from "./fileasof-copy";
import { readStreetFile } from "./filestreets";
import { parseNote, type Note } from "./model";
import { testNote } from "./testnotes";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function madeOn(n: Note, day: string): Note {
  const out = parseNote({ ...n, createdOn: day });
  if (!out) throw new Error("bad note");
  return out;
}

function both(day = "2026-03-31"): { s: Snapshot; c: Comparison } {
  const r = readStreetFile(
    exportNotes(
      [
        madeOn(testNote("a", "Library", [{ key: "elevator", value: "yes", on: "2026-03-10" }], "1 King St W"), "2026-03-10"),
        madeOn(testNote("b", "Park", [{ key: "elevator", value: "no", on: "2026-08-01" }], null), "2026-08-01"),
      ],
      "2026-11-01",
    ),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  const s = snapshot(r.file, day);
  return { s, c: compare(r.file, s, "en") };
}

describe("copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileAsofStrings())).toEqual([]);
  });

  it("holds no banned word, and says UNKNOWN in French", () => {
    for (const [path, p] of fileAsofStrings()) {
      expect(findBanned(p.en), path).toBeUndefined();
      expect(findBanned(p.fr), path).toBeUndefined();
      expect(p.fr.toLowerCase(), path).not.toContain("inconnu");
    }
    expect(C.rule.fr).toContain("UNKNOWN");
  });

  it("names its remove control as one, and says what the dates can and cannot show", () => {
    expect(C.clear.en.startsWith("Remove")).toBe(true);
    expect(C.clear.fr.startsWith("Retirer")).toBe(true);
    expect(C.rule.en).toContain("cannot know when a note was changed");
  });

  it("has words for every problem and file error", () => {
    for (const l of ["en", "fr"] as const) {
      for (const p of ["empty", "bad", "future"] as const) expect(dayProblemText(p, l).length).toBeGreaterThan(0);
      for (const p of ["bad", "future", "not-after"] as const) expect(toProblemText(p, l).length).toBeGreaterThan(0);
      for (const r of ["yes", "no", "differ", "unknown", "absent"] as const) expect(readingText(r, l).length).toBeGreaterThan(0);
      for (const e of ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes"] as const) expect(asofErrorText(e, l).length).toBeGreaterThan(0);
    }
  });
});

describe("lines", () => {
  it("titles the results with the day", () => {
    expect(resultsTitle("2026-03-31", "en")).toBe("The file on 2026-03-31");
    expect(resultsTitle("2026-03-31", "fr")).toBe("Le fichier au 2026-03-31");
  });

  it("sums up what the file held on the day", () => {
    const { s, c } = both();
    expect(snapshotSummary(s, c, "en")).toBe("On 2026-03-31 the file held 1 of its 2 notes, 1 place of 2; 1 note was made later, and 0 records in the others were made later.");
    const fr = snapshotSummary(s, c, "fr");
    expect(fr).toBe("Au 2026-03-31, le fichier contenait 1 de ses 2 notes, soit 1 lieu sur 2\u202F; 1 note a été faite plus tard, et 0 donnée des autres a été saisie plus tard.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("counts a detail's readings, with UNKNOWN in French", () => {
    expect(countsText({ yes: 4, no: 2, differ: 1, unknown: 3 }, "en")).toBe("4 Yes, 2 No, 1 with reports that differ, 3 Unknown");
    expect(countsText({ yes: 4, no: 2, differ: 1, unknown: 3 }, "fr")).toBe("4 Oui, 2 Non, 1 avec rapports divergents, 3 UNKNOWN");
  });

  it("shows the change with a sign", () => {
    expect(changeText(2, 5)).toBe("+3");
    expect(changeText(5, 4)).toBe("−1");
    expect(changeText(3, 3)).toBe("0");
  });

  it("gives each detail's places with an answer then and now, and how many read differently", () => {
    const { c } = both();
    const elevator = c.details.find((d) => d.key === "elevator")!;
    expect(detailLine(elevator, "en")).toBe("Elevator: 1 place with an answer on the day, 2 now; 1 place reads differently now.");
    const fr = detailLine(elevator, "fr");
    expect(fr).toBe("Ascenseur\u00A0: 1 lieu avec une réponse à la date, 2 maintenant\u202F; 1 lieu se lit autrement maintenant.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("names a place with its address, or alone", () => {
    const { c } = both();
    const park = c.details.find((d) => d.key === "elevator")!.answered[0]!;
    expect(placeLine(park)).toBe("Park");
  });
});

describe("quick days", () => {
  it("labels each quick day with its date", () => {
    expect(quickLabel("quarter", "2026-09-30", "en")).toBe("End of last quarter (2026-09-30)");
    expect(quickLabel("year", "2025-12-31", "fr")).toBe("Fin de l’année dernière (2025-12-31)");
    expect(C.quickFilled.fr).toBe("Date remplie\u00A0:");
  });
});

describe("a second day", () => {
  it("titles, heads and words the results for two days", () => {
    expect(resultsTitle("2026-03-31", "en", "2026-06-30")).toBe("The file from 2026-03-31 to 2026-06-30");
    expect(resultsTitle("2026-03-31", "fr", "2026-06-30")).toBe("Le fichier du 2026-03-31 au 2026-06-30");
    expect(nowLabel(undefined, "en")).toBe("Now");
    expect(nowLabel("2026-06-30", "en")).toBe("On 2026-06-30");
    expect(nowLabel("2026-06-30", "fr")).toBe("Au 2026-06-30");
    const { c } = both();
    const elevator = c.details.find((d) => d.key === "elevator")!;
    expect(detailLine(elevator, "en", "2026-06-30")).toBe("Elevator: 1 place with an answer on the day, 2 on 2026-06-30; 1 place reads differently on 2026-06-30.");
    expect(detailLine(elevator, "fr", "2026-06-30")).toContain("2 au 2026-06-30\u202F; 1 lieu se lit autrement au 2026-06-30.");
  });

  it("names the files for both days", () => {
    expect(asofFilename("csv", "2026-03-31", "en", "2026-06-30")).toBe("comparison-2026-03-31-2026-06-30.csv");
    expect(asofFilename("text", "2026-03-31", "fr", "2026-06-30")).toBe("comparaison-2026-03-31-2026-06-30.txt");
    expect(asofFilename("copy", "2026-03-31", "en", "2026-06-30")).toBe("notes-as-of-2026-03-31.json");
    expect(asofFilename("changes", "2026-03-31", "en")).toBe("places-changed-2026-03-31.csv");
    expect(asofFilename("changes", "2026-03-31", "fr", "2026-06-30")).toBe("lieux-changes-2026-03-31-2026-06-30.csv");
  });
});

describe("changes and sources", () => {
  it("shows a place's reading then and now", () => {
    const { c } = both();
    const park = c.details.find((d) => d.key === "elevator")!.differently[0]!;
    expect(changedLine(park, "en")).toBe("Park: not in the file → No");
    const fr = changedLine(park, "fr");
    expect(fr).toBe("Park\u00A0: absent du fichier → Non");
    expect(frenchTypographyIssues(fr)).toEqual([]);
    expect(changedLine({ ...park, then: "unknown", now: "differ" }, "fr")).toBe("Park\u00A0: UNKNOWN → rapports divergents");
  });

  it("gives each source's records and places, with the App's label in French", () => {
    expect(sourceSinceLine({ source: "Walk", records: 2, places: 1 }, "en")).toBe("Walk: 2 records at 1 place");
    expect(sourceSinceLine({ source: "Contributor report", records: 1, places: 1 }, "fr")).toBe("Rapport d’un contributeur\u00A0: 1 donnée pour 1 lieu");
  });

  it("adds the sources to the text comparison", () => {
    const { s, c } = both();
    const text = comparisonText(s, c, TODAY, "en", [{ source: "Walk", records: 2, places: 1 }]);
    expect(text.endsWith("Records made since the day, by source:\n- Walk: 2 records at 1 place\n")).toBe(true);
  });
});

describe("the text comparison", () => {
  it("lists each detail with its counts and the places answered since", () => {
    const { s, c } = both();
    const text = comparisonText(s, c, TODAY, "en");
    expect(text.startsWith("A notes file as it was on a day\nThe file on 2026-03-31\n2026-11-21\n\n")).toBe(true);
    expect(text).toContain(
      "Elevator: 1 place with an answer on the day, 2 now; 1 place reads differently now.\n    On the day: 1 Yes, 0 No, 0 with reports that differ, 0 Unknown\n    Now: 1 Yes, 1 No, 0 with reports that differ, 0 Unknown\n    Places that read differently:\n      - Park: not in the file → No\n",
    );
    expect(text.endsWith("\n")).toBe(true);
    expect(text.endsWith("\n\n")).toBe(false);
  });

  it("is in French with French spacing", () => {
    const { s, c } = both();
    const text = comparisonText(s, c, TODAY, "fr");
    expect(text).toContain("    À la date\u00A0: 1 Oui, 0 Non, 0 avec rapports divergents, 0 UNKNOWN\n");
    for (const line of text.split("\n")) expect(frenchTypographyIssues(line), line).toEqual([]);
  });
});

describe("file names", () => {
  it("names the files by the day, in each language, without accents", () => {
    expect(asofFilename("copy", "2026-03-31", "en")).toBe("notes-as-of-2026-03-31.json");
    expect(asofFilename("csv", "2026-03-31", "en")).toBe("comparison-since-2026-03-31.csv");
    expect(asofFilename("text", "2026-03-31", "en")).toBe("comparison-since-2026-03-31.txt");
    expect(asofFilename("copy", "2026-03-31", "fr")).toBe("notes-au-2026-03-31.json");
    expect(asofFilename("csv", "2026-03-31", "fr")).toBe("comparaison-depuis-2026-03-31.csv");
    for (const k of ["copy", "csv", "text"] as const) for (const l of ["en", "fr"] as const) expect(asofFilename(k, "2026-03-31", l)).toMatch(/^[a-z0-9.-]+$/);
  });
});
