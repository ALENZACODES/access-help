import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import { BACKINGS, SINGLE_MODES, fileSingle, type BackedDetail, type SingleReport, type SourcePair } from "./corroboration";
import { exportNotes } from "./exchange";
import { CONTRIBUTOR_SOURCE } from "./facts";
import { FILE_ROUND_COPY } from "./fileround-copy";
import {
  FILE_SINGLE_COPY,
  backingText,
  detailText,
  differHeading,
  differenceText,
  keysText,
  pairLine,
  sourceLine,
  fileSingleStrings,
  modeText,
  singleErrorText,
  singleFilename,
  singleSummary,
  singleText,
} from "./filesingle-copy";
import { readStreetFile } from "./filestreets";
import { testNote } from "./testnotes";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const NB = "\u00A0";
const NN = "\u202F";

function report(mode: "report" | "source" = "report"): SingleReport {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("a1", "Library", [
          { key: "elevator", value: "yes", on: "2026-01-10" },
          { key: "accessible-washroom", value: "no", on: "2025-05-01" },
        ], "100 King St W"),
        testNote("a2", "Library", [{ key: "accessible-washroom", value: "no", on: "2026-03-01" }], "100 King St W"),
        testNote("b", "Bank", [{ key: "elevator", value: "yes", source: "Visit" }], null),
      ],
      "2026-11-01",
    ),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return fileSingle(r.file, mode, "");
}

describe("copy", () => {
  it("passes the App's copy audit, with no banned words", () => {
    expect(auditCopy(fileSingleStrings())).toEqual([]);
    for (const [k, p] of fileSingleStrings()) {
      expect(findBanned(p.en), k).toBeUndefined();
      expect(findBanned(p.fr), k).toBeUndefined();
    }
  });

  it("has a text for every file error, mode and backing", () => {
    for (const l of ["en", "fr"] as const) {
      for (const e of ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes"] as const) expect(singleErrorText(e, l).length).toBeGreaterThan(0);
      expect(new Set(SINGLE_MODES.map((m) => modeText(m, l))).size).toBe(2);
      expect(new Set(BACKINGS.map((b) => backingText(b, l))).size).toBe(3);
    }
  });

  it("says one report is not wrong and agreement proves nothing, and points to the round tool by its own title", () => {
    expect(FILE_SINGLE_COPY.meaning.en).toContain("A detail with one report is not wrong, and two sources that agree are not proved right");
    expect(FILE_SINGLE_COPY.notesHint.en).toContain(`“${FILE_ROUND_COPY.title.en}”`);
    expect(FILE_SINGLE_COPY.notesHint.fr).toContain(`«${NN}${FILE_ROUND_COPY.title.fr}${NN}»`);
  });
});

describe("detailText", () => {
  const d: BackedDetail = { key: "elevator", value: "yes", reports: 2, sources: ["City survey", "Visit"], newest: "2026-01-10", backing: "several" };

  it("gives the answer, reports, sources and newest date in each language", () => {
    expect(detailText(d, "en")).toBe("Elevator: Yes — 2 reports, City survey, Visit, newest 2026-01-10");
    const fr = detailText({ ...d, reports: 1, sources: ["Visit"], value: "no" }, "fr");
    expect(fr).toBe(`Ascenseur${NB}: Non — 1 rapport, Visit, le plus récent 2026-01-10`);
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("names the contributor source in French as the rest of the App does", () => {
    expect(detailText({ ...d, sources: [CONTRIBUTOR_SOURCE] }, "fr")).toContain("Rapport d’un contributeur");
  });
});

describe("singleSummary", () => {
  it("counts the backings and the details listed", () => {
    expect(singleSummary(report(), "en")).toBe(
      "2 places, 3 details whose reports agree: 2 with one report, 1 with several reports from one source, 0 with reports from several sources. 2 details listed at 2 places. Reports that differ: 0.",
    );
    const fr = singleSummary(report("source"), "fr");
    expect(fr).toBe(
      `2 lieux, 3 détails aux rapports concordants${NB}: 2 avec un seul rapport, 1 avec plusieurs rapports d’une seule source, 0 avec des rapports de plusieurs sources. 3 détails listés dans 2 lieux. Rapports divergents${NB}: 0.`,
    );
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });
});

describe("downloads", () => {
  it("prints the title, day, mode, area and each place with its details", () => {
    const text = singleText(report("source"), " king ", TODAY, "en");
    expect(text.split("\n").slice(0, 4)).toEqual(["Details with one report", "Made on 2026-11-21", "List the details: with reports from one source only", "Area: king"]);
    expect(text).toContain("Library, 100 King St W\n  - Accessible washroom: No — 2 reports, City survey, newest 2026-03-01\n  - Elevator: Yes — 1 report, City survey, newest 2026-01-10\n");
    expect(text).toContain("Bank\n  - Elevator: Yes — 1 report, Visit, newest 2026-10-01\n");
  });

  it("keeps French typography in the lines the App writes", () => {
    const text = singleText(report(), "", TODAY, "fr");
    expect(text).toContain(`Lister les détails${NB}: avec un seul rapport`);
    for (const line of text.split("\n")) expect(frenchTypographyIssues(line), line).toEqual([]);
  });

  it("names the files by mode, day and language", () => {
    expect(singleFilename("csv", "report", TODAY, "en")).toBe("details-with-one-report-2026-11-21.csv");
    expect(singleFilename("notes", "source", TODAY, "fr")).toBe("details-une-seule-source-2026-11-21-notes.json");
    expect(singleFilename("text", "source", TODAY, "en")).toBe("details-with-one-source-2026-11-21.txt");
  });
});

describe("where two sources differ", () => {
  const pair = (): SourcePair => {
    const r = readStreetFile(
      exportNotes(
        [
          testNote("x1", "Kiosk", [{ key: "elevator", value: "yes", on: "2026-01-01" }], "1 Elm St"),
          testNote("x2", "Kiosk", [{ key: "elevator", value: "no", on: "2026-02-02", source: CONTRIBUTOR_SOURCE }], "1 Elm St"),
        ],
        "2026-11-01",
      ),
      TODAY,
      "en",
    );
    if (!r.ok) throw new Error(r.error);
    const p = fileSingle(r.file, "report", "").pairs[0];
    if (!p) throw new Error("no pair");
    return p;
  };

  it("heads the list with both sources and the count, in the App's words for each source", () => {
    expect(differHeading(pair(), "en")).toBe("Where City survey and Contributor report differ (1)");
    expect(differHeading(pair(), "fr")).toBe("Là où City survey et Rapport d’un contributeur diffèrent (1)");
  });

  it("says each source's answer and date", () => {
    const p = pair();
    const d = p.differences[0];
    if (!d) throw new Error("no difference");
    expect(differenceText(d, p, "en")).toBe("Elevator: City survey Yes (2026-01-01), Contributor report No (2026-02-02)");
    const fr = differenceText(d, p, "fr");
    expect(fr).toBe(`Ascenseur${NB}: City survey Oui (2026-01-01), Rapport d’un contributeur Non (2026-02-02)`);
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });
});

describe("the details chosen", () => {
  it("names them, and prints them only when not all are chosen", () => {
    const r = readStreetFile(exportNotes([testNote("a", "Library", [{ key: "elevator", value: "yes" }], "1 Elm St")], "2026-11-01"), TODAY, "en");
    if (!r.ok) throw new Error(r.error);
    const some = fileSingle(r.file, "report", "", ["elevator", "step-free-entry"]);
    expect(keysText(some, "en")).toBe("Step-free entrance, Elevator");
    expect(singleText(some, "", TODAY, "en")).toContain("Details to look at: Step-free entrance, Elevator\n");
    expect(singleText(fileSingle(r.file, "report", ""), "", TODAY, "en")).not.toContain("Details to look at");
  });
});

describe("sources and pairs in print", () => {
  const full = (): SingleReport => {
    const r = readStreetFile(
      exportNotes(
        [
          testNote("x1", "Kiosk", [{ key: "elevator", value: "yes", on: "2026-01-01" }, { key: "automatic-door", value: "yes" }], "1 Elm St"),
          testNote("x2", "Kiosk", [{ key: "elevator", value: "no", on: "2026-02-02", source: "Visit" }, { key: "automatic-door", value: "yes", source: "Visit" }], "1 Elm St"),
        ],
        "2026-11-01",
      ),
      TODAY,
      "en",
    );
    if (!r.ok) throw new Error(r.error);
    return fileSingle(r.file, "report", "");
  };

  it("writes a line for each source and each pair", () => {
    const r = full();
    expect(r.bySource.map((s) => sourceLine(s, "en"))).toEqual(["City survey: only this source 0, details it reports 2", "Visit: only this source 0, details it reports 2"]);
    const pair = r.pairs[0];
    if (!pair) throw new Error("no pair");
    expect(pairLine(pair, "en")).toBe("City survey / Visit: details both report 2, same answer 1, different answer 1");
    const fr = pairLine(pair, "fr");
    expect(fr).toBe(`City survey / Visit${NB}: détails rapportés par les deux 2, même réponse 1, réponse différente 1`);
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("prints the sources, the pairs and every difference after the places", () => {
    const text = singleText(full(), "", TODAY, "en");
    expect(text).toContain("\nBy source\n---------\nCity survey: only this source 0, details it reports 2\n");
    expect(text).toContain(
      "\nWhen two sources report the same detail\n---------------------------------------\nCity survey / Visit: details both report 2, same answer 1, different answer 1\n  - Kiosk, 1 Elm St — Elevator: City survey Yes (2026-01-01), Visit No (2026-02-02)\n",
    );
  });

  it("names the download of where sources differ", () => {
    expect(singleFilename("differ", "report", TODAY, "en")).toBe("where-sources-differ-2026-11-21.csv");
    expect(singleFilename("differ", "source", TODAY, "fr")).toBe("divergences-entre-sources-2026-11-21.csv");
    expect(singleFilename("differ-notes", "report", TODAY, "fr")).toBe("lieux-ou-les-sources-divergent-2026-11-21-notes.json");
  });
});
