import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import { ADD_PROBLEMS, applyAdds, planAdds, type AddOptions, type Outcome } from "./bulkadd";
import { exportNotes } from "./exchange";
import { CONTRIBUTOR_SOURCE } from "./facts";
import {
  FILE_ADD_COPY as C,
  addErrorText,
  addFilename,
  addProblemText,
  copySummary,
  fileAddStrings,
  listSummary,
  outcomeText,
  placeName,
  plannedText,
  readingText,
  recordText,
} from "./fileadd-copy";
import { readStreetFile, type StreetFile } from "./filestreets";
import { testNote } from "./testnotes";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const RECORD: AddOptions = { key: "elevator", value: "yes", who: "source", source: "City transit list", licence: "OGL-Canada-2.0", recordedOn: "2026-11-01" };

function file(): StreetFile {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("a", "Bay Station", [], "1 Bay St"),
        testNote("b", "King Station", [{ key: "elevator", value: "yes" }], "2 King St W"),
        testNote("c", "Queen Station", [{ key: "elevator", value: "no" }], null),
      ],
      "2026-11-01",
    ),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const plan = () => planAdds(file().places, RECORD, TODAY);

describe("copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileAddStrings())).toEqual([]);
  });

  it("holds no banned word or “inconnu”", () => {
    for (const [path, p] of fileAddStrings()) {
      expect(findBanned(p.en), path).toBeUndefined();
      expect(findBanned(p.fr), path).toBeUndefined();
      expect(p.fr.toLowerCase(), path).not.toContain("inconnu");
    }
  });

  it("names its remove control as one, and says nothing is filled in", () => {
    expect(C.clear.en.startsWith("Remove")).toBe(true);
    expect(C.clear.fr.startsWith("Retirer")).toBe(true);
    expect(C.rule.en).toContain("Nothing is filled in for you");
    expect(C.licenceHint.en).toContain("There is no default");
  });

  it("has words for every problem, outcome and file error", () => {
    for (const l of ["en", "fr"] as const) {
      for (const p of ADD_PROBLEMS) expect(addProblemText(p, l).length).toBeGreaterThan(0);
      for (const o of ["new", "same", "differs", "already-differ", "repeat"] as Outcome[]) expect(outcomeText(o, l).length).toBeGreaterThan(0);
      for (const e of ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes"] as const) expect(addErrorText(e, l).length).toBeGreaterThan(0);
    }
  });
});

describe("lines", () => {
  it("states the record in full", () => {
    expect(recordText("elevator", "yes", "City transit list", "OGL-Canada-2.0", "2026-11-01", "en")).toBe("Elevator: Yes — City transit list, OGL-Canada-2.0, dated 2026-11-01");
    const fr = recordText("elevator", "no", CONTRIBUTOR_SOURCE, "CC0-1.0", "2026-11-01", "fr");
    expect(fr).toBe("Ascenseur\u00A0: Non — Rapport d’un contributeur, CC0-1.0, datée du 2026-11-01");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("names a place, saying when it has no address", () => {
    const [bay, , queen] = file().places;
    expect(placeName(bay!, "en")).toBe("Bay Station, 1 Bay St");
    expect(placeName(queen!, "en")).toBe("Queen Station, no address");
    expect(placeName(queen!, "fr")).toBe("Queen Station, sans adresse");
  });

  it("reads a place's answer, with UNKNOWN in French", () => {
    const [bay, king] = plan();
    expect(readingText(bay!.before, "en")).toBe("Unknown");
    expect(readingText(bay!.before, "fr")).toBe("UNKNOWN");
    expect(readingText(king!.before, "en")).toBe("Yes");
    expect(readingText(plan()[2]!.after, "en")).toBe("reports differ");
  });

  it("says what the record would do at each place", () => {
    expect(plan().map((a) => plannedText(a, "en"))).toEqual([
      "Bay Station, 1 Bay St — now Unknown; first record for this detail",
      "King Station, 2 King St W — now Yes; agrees with what is there",
      "Queen Station, no address — now No; reports would differ",
    ]);
    const fr = plannedText(plan()[2]!, "fr");
    expect(fr).toBe("Queen Station, sans adresse — maintenant\u00A0: Non\u202F; les rapports divergeraient");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });
});

describe("repeats", () => {
  it("says a place already holds the record, and counts such places", () => {
    const f = readStreetFile(
      exportNotes([testNote("x", "Bay Station", [{ key: "elevator", value: "yes", source: "City transit list", licence: "OGL-Canada-2.0", on: "2026-11-01" }], "1 Bay St")], "2026-11-01"),
      TODAY,
      "en",
    );
    if (!f.ok) throw new Error(f.error);
    const p = planAdds(f.file.places, RECORD, TODAY);
    expect(plannedText(p[0]!, "en")).toBe("Bay Station, 1 Bay St — now Yes; already holds this exact record, so it is not added again");
    expect(listSummary(p, "en")).toBe("1 place shown: 0 with no record, 0 that agree, 0 where reports would differ, 0 where they already differ; 1 already holds this record.");
    const fr = listSummary(p, "fr");
    expect(fr).toBe("1 lieu affiché\u00A0: 0 sans donnée, 0 en accord, 0 où les rapports divergeraient, 0 où ils divergent déjà\u202F; 1 contient déjà cette donnée.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });
});

describe("summaries", () => {
  it("counts the places shown by what the record would do", () => {
    expect(listSummary(plan(), "en")).toBe("3 places shown: 1 with no record, 1 that agree, 1 where reports would differ, 0 where they already differ.");
    const fr = listSummary(plan(), "fr");
    expect(fr).toBe("3 lieux affichés\u00A0: 1 sans donnée, 1 en accord, 1 où les rapports divergeraient, 0 où ils divergent déjà.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("tells what the copy holds, and where reports now differ", () => {
    const f = file();
    const c = applyAdds(f, f.places, RECORD, TODAY);
    expect(copySummary(c, 1, "en")).toBe("Record added to 3 places, in 3 new notes; reports now differ at 1 place.");
    const one = applyAdds(f, f.places.slice(0, 1), RECORD, TODAY);
    expect(copySummary(one, 0, "en")).toBe("Record added to 1 place, in 1 new note.");
    const fr = copySummary(c, 2, "fr");
    expect(fr).toBe("Donnée ajoutée à 3 lieux, dans 3 nouvelles notes\u202F; les rapports divergent maintenant à 2 lieux.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
    expect(copySummary(one, 0, "fr")).toBe("Donnée ajoutée à 1 lieu, dans 1 nouvelle note.");
  });
});

describe("file names", () => {
  it("dates the copy and the list, in each language, without accents", () => {
    expect(addFilename("copy", TODAY, "en")).toBe("notes-record-added-2026-11-21.json");
    expect(addFilename("csv", TODAY, "en")).toBe("records-added-2026-11-21.csv");
    expect(addFilename("copy", TODAY, "fr")).toBe("notes-donnee-ajoutee-2026-11-21.json");
    expect(addFilename("csv", TODAY, "fr")).toBe("donnees-ajoutees-2026-11-21.csv");
    for (const k of ["copy", "csv"] as const) for (const l of ["en", "fr"] as const) expect(addFilename(k, TODAY, l)).toMatch(/^[a-z0-9.-]+$/);
  });
});
