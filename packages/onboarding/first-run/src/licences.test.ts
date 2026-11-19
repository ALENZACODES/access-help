import { describe, expect, it } from "vitest";
import { CONTRIBUTOR_SOURCE, OPEN_LICENCES, auditCopy, collectSources, findBanned, type Note } from "./index";
import { LICENCE_COPY, collectLicences, licenceRecords, licenceStrings, licencesFilename, licencesToText, sourceList } from "./licences";
import { makeRng, randomNotes } from "./testkit";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));

const NOTES = (): Note[] => [
  testNote("l1", "Library", [
    { key: "step-free-entry", value: "yes", licence: "ODbL-1.0", source: "Map survey", on: "2025-03-01" },
    { key: "elevator", value: "no", licence: "CC0-1.0", on: "2026-02-10" },
  ]),
  testNote("b1", "Bakery", [
    { key: "step-free-entry", value: "no", licence: "OGL-Canada-2.0", source: "Town open data", on: "2026-06-06" },
    { key: "automatic-door", value: "yes", licence: "CC0-1.0", source: CONTRIBUTOR_SOURCE, on: "2026-09-09" },
  ], "2 Main St"),
  testNote("a1", "Arena", [], null),
];

describe("collectLicences", () => {
  it("gives one row per licence used, in the App's licence order", () => {
    expect(collectLicences(NOTES()).map((r) => r.licence)).toEqual(["CC0-1.0", "ODbL-1.0", "OGL-Canada-2.0"]);
  });

  it("counts Yes and No, sources, notes and dates for each licence", () => {
    const cc0 = collectLicences(NOTES())[0];
    expect(cc0).toEqual({
      licence: "CC0-1.0",
      records: 2,
      yes: 1,
      no: 1,
      sources: ["City survey", CONTRIBUTOR_SOURCE].sort((a, b) => a.localeCompare(b)),
      notes: 2,
      oldest: "2026-02-10",
      newest: "2026-09-09",
    });
  });

  it("leaves out details with no record and licences no record uses", () => {
    const rows = collectLicences(NOTES());
    expect(licenceRecords(rows)).toBe(4);
    expect(rows.map((r) => r.licence)).not.toContain("CC-BY-4.0");
    expect(collectLicences([testNote("x", "Empty", [])])).toEqual([]);
  });

  it("does not depend on the order of the notes", () => {
    expect(collectLicences([...NOTES()].reverse())).toEqual(collectLicences(NOTES()));
  });

  it("agrees with the sources report on random notes", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const notes = randomNotes(makeRng(seed), 10);
      const rows = collectLicences(notes);
      const report = collectSources(notes, TODAY);
      expect(licenceRecords(rows), String(seed)).toBe(report.recorded);
      expect(rows.map((r) => r.licence).sort(), String(seed)).toEqual([...report.licences].sort());
      for (const r of rows) {
        expect(r.yes + r.no, String(seed)).toBe(r.records);
        expect(OPEN_LICENCES, String(seed)).toContain(r.licence);
        expect(r.oldest <= r.newest, String(seed)).toBe(true);
        expect(r.notes, String(seed)).toBeLessThanOrEqual(notes.length);
      }
      const positions = rows.map((r) => OPEN_LICENCES.indexOf(r.licence));
      expect(positions, String(seed)).toEqual([...positions].sort((a, b) => a - b));
    }
  });
});

describe("sourceList", () => {
  it("shows the App's own source name in French", () => {
    const cc0 = collectLicences(NOTES())[0];
    expect(cc0 && sourceList(cc0, "en")).toBe(`City survey, ${CONTRIBUTOR_SOURCE}`);
    expect(cc0 && sourceList(cc0, "fr")).toBe("City survey, Rapport d’un contributeur");
  });
});

describe("licencesToText", () => {
  it("writes each licence with its counts, sources, notes and dates", () => {
    const text = licencesToText(collectLicences(NOTES()), "en", TODAY);
    expect(text.startsWith("Records by licence\n==================\n\n")).toBe(true);
    expect(text).toContain("CC0-1.0\n  Records: 2 (Yes 1, No 1)\n  Sources used: City survey, Contributor report\n  Notes: 2\n  Dates recorded: 2026-02-10 – 2026-09-09\n");
    expect(text).toContain("ODbL-1.0\n  Records: 1 (Yes 1, No 0)\n  Sources used: Map survey\n  Notes: 1\n  Dates recorded: 2025-03-01\n");
    expect(text.endsWith("Made on 2026-11-19.\n")).toBe(true);
  });

  it("says no licence is used when there is no record", () => {
    const text = licencesToText([], "en", TODAY);
    expect(text).toContain(`${LICENCE_COPY.none.en}\n`);
    expect(text).not.toContain("CC0");
  });

  it("uses French words and a no-break space before colons", () => {
    const text = licencesToText(collectLicences(NOTES()), "fr", TODAY);
    expect(text).toContain("  Données : 2 (Oui 1, Non 1)");
    expect(text).toContain("  Sources utilisées : City survey, Rapport d’un contributeur");
    expect(text).toContain("Créé le 2026-11-19.");
    expect(text).not.toMatch(/[^  ](?=[:;?!])/u);
  });

  it("gives no legal advice and never ranks", () => {
    for (const l of ["en", "fr"] as const) {
      const text = licencesToText(collectLicences(NOTES()), l, TODAY);
      expect(findBanned(text), l).toBeUndefined();
      expect(text, l).not.toMatch(/\b(best|worst|score|rank|safe to|allowed|permitted|meilleur|pire|classement|autorisé|permis)\b/i);
      expect(text, l).toContain(LICENCE_COPY.noAdvice[l]);
    }
  });
});

describe("licencesFilename", () => {
  it("names the file by date and language", () => {
    expect(licencesFilename(TODAY, "en")).toBe("records-by-licence-2026-11-19-en.txt");
    expect(licencesFilename(TODAY, "fr")).toBe("donnees-par-licence-2026-11-19-fr.txt");
  });
});

describe("licence strings", () => {
  it("pass the App's copy audit in both languages", () => {
    expect(auditCopy(licenceStrings()).map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
  });

  it("are all listed for the audit, and none is empty", () => {
    expect(licenceStrings().length).toBe(Object.keys(LICENCE_COPY).length);
    for (const [path, p] of licenceStrings()) {
      expect(p.en.trim(), path).not.toBe("");
      expect(p.fr.trim(), path).not.toBe("");
    }
  });
});
