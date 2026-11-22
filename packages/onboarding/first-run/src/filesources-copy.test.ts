import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import { exportNotes } from "./exchange";
import { FACT_KEYS } from "./facts";
import {
  FILE_SOURCES_COPY as C,
  aloneLine,
  aloneTitle,
  daysText,
  fileSourcesStrings,
  orderText,
  overlapLine,
  overlapSummary,
  reportSummary,
  showAloneLabel,
  sourceLabel,
  sourcesErrorText,
  sourcesFilename,
  sourcesText,
} from "./filesources-copy";
import { readStreetFile } from "./filestreets";
import { DEFAULT_SOURCES, SOURCE_ORDERS, aloneAnswers, sourceOverlap, sourceReport, type SourceReport, type SourceRow } from "./sourcecover";
import { testNote } from "./testnotes";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const file = () => {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("a", "Café", [{ key: "elevator", value: "yes", on: "2026-01-05" }, { key: "automatic-door", value: "no", on: "2026-03-01" }], "1 A St"),
        testNote("b", "Café", [{ key: "elevator", value: "yes", source: "Contributor report", on: "2026-09-01" }], "1 A St"),
        testNote("c", "Kiosk", [{ key: "elevator", value: "yes" }, { key: "step-free-entry", value: "no", on: "2026-02-01" }], null),
        testNote("d", "Kiosk", [{ key: "step-free-entry", value: "yes", source: "Contributor report", on: "2026-09-02" }], null),
      ],
      "2026-11-01",
    ),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return r.file;
};
const report = (keys = DEFAULT_SOURCES.keys): SourceReport => sourceReport(file(), { ...DEFAULT_SOURCES, keys }, "en");
const city = (): SourceRow => report().rows[0] as SourceRow;
const contributor = (): SourceRow => report().rows[1] as SourceRow;

describe("copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileSourcesStrings())).toEqual([]);
  });

  it("has French typography, the token UNKNOWN and no banned words in every string", () => {
    for (const [path, pair] of fileSourcesStrings()) {
      expect(frenchTypographyIssues(pair.fr), path).toEqual([]);
      expect(findBanned(pair.en), path).toBeUndefined();
      expect(findBanned(pair.fr), path).toBeUndefined();
      expect(pair.fr, path).not.toMatch(/inconnu/i);
    }
    expect(C.intro.fr).toContain("UNKNOWN");
  });

  it("says it counts, never ranks", () => {
    expect(C.rule.en).toContain("does not say that a source is better or worse");
    expect(C.clear.en).toMatch(/^Remove/);
    expect(C.clear.fr).toMatch(/^Retirer/);
  });

  it("has words for every order and file error", () => {
    for (const l of ["en", "fr"] as const) {
      for (const o of SOURCE_ORDERS) expect(orderText(o, l).length).toBeGreaterThan(0);
      for (const e of ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes"] as const) expect(sourcesErrorText(e, l).length).toBeGreaterThan(0);
    }
  });
});

describe("summaries", () => {
  it("counts sources and answers, and how many rest on one source alone", () => {
    expect(reportSummary(report(), "en")).toBe("2 sources. 4 answers: 2 rest on one source alone, 2 on two sources or more.");
    const fr = reportSummary(report(), "fr");
    expect(fr).toBe("2 sources. 4 réponses\u00A0: 2 reposent sur une seule source, 2 sur deux sources ou plus.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
    expect(reportSummary(report(["accessible-washroom"]), "en")).toBe(C.noSources.en);
  });

  it("gives the days a source recorded", () => {
    expect(daysText(city(), "en")).toBe("2026-01-05 to 2026-10-01");
    expect(daysText(city(), "fr")).toBe("du 2026-01-05 au 2026-10-01");
    expect(daysText({ ...contributor(), first: "2026-09-01", last: "2026-09-01" }, "fr")).toBe("2026-09-01");
  });

  it("names a contributor's reports in the reader's language", () => {
    expect(sourceLabel("Contributor report", "fr")).toBe("Rapport d’un contributeur");
    expect(sourceLabel("Contributor report", "en")).toBe("Contributor report");
    expect(sourceLabel("City survey", "fr")).toBe("City survey");
  });
});

describe("answers resting on one source", () => {
  it("names the source and the count in the button and the heading", () => {
    expect(showAloneLabel(city(), "en")).toBe("Show the answers that rest on City survey alone (2)");
    expect(showAloneLabel(contributor(), "fr")).toBe("Afficher les réponses reposant sur Rapport d’un contributeur seule (0)");
    expect(aloneTitle("City survey", 3, "en")).toBe("Answers that rest on City survey alone (3)");
    expect(aloneTitle("City survey", 3, "fr")).toBe("Réponses reposant sur City survey seule (3)");
  });

  it("gives each answer as its detail and value, or says the reports differ", () => {
    expect(aloneAnswers(file(), "City survey", FACT_KEYS, "en").map((x) => [x.place.name, x.key])).toEqual([
      ["Café", "automatic-door"],
      ["Kiosk", "elevator"],
    ]);
    const a = aloneAnswers(file(), "City survey", FACT_KEYS, "en")[0];
    if (!a) throw new Error("no answer");
    expect(aloneLine(a, "en")).toBe("Automatic door: No");
    expect(aloneLine(a, "fr")).toBe("Porte automatique\u00A0: Non");
    expect(aloneLine({ ...a, value: "differ" }, "en")).toBe("Automatic door: Reports differ");
    expect(aloneLine({ ...a, value: "differ" }, "fr")).toBe("Porte automatique\u00A0: Rapports divergents");
  });
});

describe("comparing two sources", () => {
  it("says how many details both answer and how often their answers are the same", () => {
    const o = sourceOverlap(file(), "City survey", "Contributor report", FACT_KEYS, "en");
    expect(overlapSummary("City survey", "Contributor report", o, "en")).toBe("City survey and Contributor report both answer 2 details: the same answer for 1, different answers for 1.");
    const fr = overlapSummary("City survey", "Contributor report", o, "fr");
    expect(fr).toBe("City survey et Rapport d’un contributeur répondent tous deux à 2 détails\u00A0: la même réponse pour 1, des réponses différentes pour 1.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
    const none = { both: 0, same: 0, differ: [] };
    expect(overlapSummary("A", "B", none, "en")).toBe("A and B do not answer any detail in common.");
    expect(overlapSummary("A", "B", none, "fr")).toBe("A et B ne répondent à aucun détail en commun.");
  });

  it("gives each difference as the detail and each source's answer", () => {
    const d = sourceOverlap(file(), "City survey", "Contributor report", FACT_KEYS, "en").differ[0];
    if (!d) throw new Error("no difference");
    expect([d.place.name, d.key]).toEqual(["Kiosk", "step-free-entry"]);
    expect(overlapLine(d, "City survey", "Contributor report", "en")).toBe("Step-free entrance: City survey No, Contributor report Yes");
    expect(overlapLine(d, "City survey", "Contributor report", "fr")).toBe("Entrée sans marche\u00A0: City survey Non, Rapport d’un contributeur Oui");
  });
});

describe("sourcesText", () => {
  it("prints each source with its counts and each chosen detail", () => {
    const text = sourcesText(report(["elevator", "automatic-door"]), TODAY, "en");
    expect(text.startsWith(`Which sources the answers rest on\n2026-11-21\n\n${C.rule.en}\n`)).toBe(true);
    expect(text).toContain(
      "City survey\n    Records: 3\n    Places: 2\n    Answers shown from it: 2\n    Answers resting on it alone: 2\n    Days recorded: 2026-01-05 to 2026-10-01\n    Licences used: CC0-1.0\n    Elevator: 2 / 1\n    Automatic door: 1 / 1\n",
    );
    expect(text.endsWith("Automatic door: 0 / 0\n")).toBe(true);
  });

  it("prints French with its spacing", () => {
    const text = sourcesText(report(), TODAY, "fr");
    expect(text).toContain("Rapport d’un contributeur\n    Données\u00A0: 2\n");
    for (const line of text.split("\n")) expect(frenchTypographyIssues(line), line).toEqual([]);
  });
});

describe("sourcesFilename", () => {
  it("names the table and text by day, and the notes by source without accents", () => {
    expect(sourcesFilename("csv", TODAY, "en")).toBe("sources-2026-11-21.csv");
    expect(sourcesFilename("text", TODAY, "fr")).toBe("sources-2026-11-21.txt");
    expect(sourcesFilename("notes", TODAY, "en", "City survey")).toBe("notes-only-city-survey-2026-11-21.json");
    expect(sourcesFilename("notes", TODAY, "fr", "Relevé de la Ville")).toBe("notes-seulement-releve-de-la-ville-2026-11-21.json");
    expect(sourcesFilename("notes", TODAY, "en", "東京")).toBe("notes-only-source-2026-11-21.json");
  });
});
