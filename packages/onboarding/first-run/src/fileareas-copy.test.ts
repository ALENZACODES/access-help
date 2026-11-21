import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { AREA_BYS, AREA_ORDERS, DEFAULT_AREA, areaReport, findArea, placeGaps, type AreaReport, type AreaRow, type DetailCount } from "./areacover";
import { auditCopy } from "./audit";
import { exportNotes } from "./exchange";
import { FACT_KEYS } from "./facts";
import {
  FILE_AREAS_COPY as C,
  areaLinkLabel,
  areaName,
  areasErrorText,
  areasFilename,
  areasText,
  byText,
  cellText,
  fileAreasStrings,
  hiddenText,
  orderText,
  placeGapLines,
  placesTitle,
  reportSummary,
  showPlacesLabel,
} from "./fileareas-copy";
import { readStreetFile } from "./filestreets";
import { testNote } from "./testnotes";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function report(l: "en" | "fr" = "en", keys = DEFAULT_AREA.keys): AreaReport {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("a", "Café A", [{ key: "elevator", value: "yes" }], "10 King St W, Toronto ON M5V 1A1"),
        testNote("b", "Bakery", [], "20 King St W, Toronto ON M5V 2B2"),
        testNote("d1", "Diner", [{ key: "elevator", value: "yes" }], "30 Queen St E, M5C 1A1"),
        testNote("d2", "Diner", [{ key: "elevator", value: "no" }], "30 Queen St E, M5C 1A1"),
        testNote("k", "Kiosk", [], null),
      ],
      "2026-11-01",
    ),
    TODAY,
    l,
  );
  if (!r.ok) throw new Error(r.error);
  return areaReport(r.file, { ...DEFAULT_AREA, keys }, l);
}

const row = (over: Partial<AreaRow> = {}): AreaRow => {
  const c: DetailCount = { answered: 0, differ: 0, unknown: 1 };
  return { key: "M5V", label: "M5V", places: [], counts: { "step-free-entry": c, "accessible-washroom": c, "automatic-door": c, elevator: c }, gaps: 4, ...over };
};

describe("copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileAreasStrings())).toEqual([]);
  });

  it("has French typography and no banned words in every string", () => {
    for (const [path, pair] of fileAreasStrings()) {
      expect(frenchTypographyIssues(pair.fr), path).toEqual([]);
      expect(findBanned(pair.en), path).toBeUndefined();
      expect(findBanned(pair.fr), path).toBeUndefined();
      expect(pair.fr, path).not.toMatch(/inconnu/i);
    }
  });

  it("says that a control removes the file", () => {
    expect(C.clear.en).toMatch(/^Remove/);
    expect(C.clear.fr).toMatch(/^Retirer/);
  });

  it("says it counts, never ranks, and keeps Unknown", () => {
    expect(C.rule.en).toContain("does not say that an area or a place is better or worse");
    expect(C.rule.en).toContain("Unknown");
    expect(C.rule.fr).toContain("UNKNOWN");
  });

  it("has words for every grouping, order and file error", () => {
    for (const l of ["en", "fr"] as const) {
      for (const b of AREA_BYS) expect(byText(b, l).length).toBeGreaterThan(0);
      for (const o of AREA_ORDERS) expect(orderText(o, l).length).toBeGreaterThan(0);
      for (const e of ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes"] as const) expect(areasErrorText(e, l).length).toBeGreaterThan(0);
    }
  });
});

describe("cellText", () => {
  it("gives places with a record out of the area's places", () => {
    expect(cellText({ answered: 2, differ: 0, unknown: 3 }, "en")).toBe("2 of 5");
    expect(cellText({ answered: 0, differ: 0, unknown: 1 }, "fr")).toBe("0 sur 1");
  });

  it("says how many of them have reports that differ", () => {
    expect(cellText({ answered: 1, differ: 2, unknown: 0 }, "en")).toBe("3 of 3 (2 with reports that differ)");
    const fr = cellText({ answered: 1, differ: 1, unknown: 1 }, "fr");
    expect(fr).toBe("2 sur 3 (1 avec rapports divergents)");
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });
});

describe("names and summaries", () => {
  it("names the group of places with no area", () => {
    expect(areaName(row(), "en")).toBe("M5V");
    expect(areaName(row({ key: "", label: "" }), "en")).toBe("No area in the address");
    expect(areaName(row({ key: "", label: "" }), "fr")).toBe("Aucun secteur dans l’adresse");
  });

  it("counts areas, places and details with no record, not counting the group with no area as an area", () => {
    expect(reportSummary(report(), "en")).toBe("2 areas, 4 places: 14 details with no record.");
    const fr = reportSummary(report("fr"), "fr");
    expect(fr).toBe("2 secteurs, 4 lieux\u00A0: 14 détails sans donnée.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
    expect(reportSummary(report("en", ["elevator"]), "en")).toBe("2 areas, 4 places: 2 details with no record.");
  });

  it("uses the singular for one, and French singular for zero", () => {
    const one: AreaReport = { by: "postal", keys: ["elevator"], rows: [row({ gaps: 1 })], hidden: 0, places: 1, gaps: 1 };
    expect(reportSummary(one, "en")).toBe("1 area, 1 place: 1 detail with no record.");
    const none: AreaReport = { ...one, rows: [row({ gaps: 0 })], gaps: 0 };
    expect(reportSummary(none, "en")).toBe("1 area, 1 place: 0 details with no record.");
    expect(reportSummary(none, "fr")).toBe("1 secteur, 1 lieu\u00A0: 0 détail sans donnée.");
  });

  it("names the area and its places in each download link", () => {
    const r = report();
    const m5v = r.rows[0];
    if (!m5v) throw new Error("no area");
    expect(areaLinkLabel(m5v, "en")).toBe("Download notes for M5V (2 places)");
    expect(areaLinkLabel(m5v, "fr")).toBe("Télécharger les notes de M5V (2 lieux)");
    const none = r.rows.at(-1);
    if (!none) throw new Error("no group");
    expect(areaLinkLabel(none, "en")).toBe("Download notes for the places with no area (1 place)");
    expect(areaLinkLabel(none, "fr")).toBe("Télécharger les notes des lieux sans secteur (1 lieu)");
    expect(areaLinkLabel(row({ key: "avenue", label: "Avenue Road" }), "fr")).toBe("Télécharger les notes d’Avenue Road (0 lieu)");
    // Each link is named differently, so a list of links reads clearly.
    expect(new Set(r.rows.map((a) => areaLinkLabel(a, "en"))).size).toBe(r.rows.length);
  });
});

describe("areas left out", () => {
  it("says how many areas are left out, in both languages", () => {
    expect(hiddenText(1, "en")).toBe("1 area where every chosen detail has a record is left out.");
    expect(hiddenText(3, "en")).toBe("3 areas where every chosen detail has a record are left out.");
    expect(hiddenText(1, "fr")).toBe("1 secteur où chaque détail choisi a une donnée est omis.");
    expect(hiddenText(2, "fr")).toBe("2 secteurs où chaque détail choisi a une donnée sont omis.");
    for (const n of [1, 2]) expect(findBanned(hiddenText(n, "fr"))).toBeUndefined();
  });

  it("adds it to the summary only when an area is left out", () => {
    const r: AreaReport = { ...report(), hidden: 2 };
    expect(reportSummary(r, "en")).toBe("2 areas, 4 places: 14 details with no record. 2 areas where every chosen detail has a record are left out.");
    const fr = reportSummary({ ...report("fr"), hidden: 1 }, "fr");
    expect(fr).toBe("2 secteurs, 4 lieux\u00A0: 14 détails sans donnée. 1 secteur où chaque détail choisi a une donnée est omis.");
    expect(frenchTypographyIssues(fr)).toEqual([]);
    expect(reportSummary(report(), "en")).not.toContain("left out");
  });
});

describe("the places in an area", () => {
  it("names the area in the button and the heading", () => {
    const m5v = report().rows[0];
    if (!m5v) throw new Error("no area");
    expect(showPlacesLabel(m5v, "en")).toBe("Show the places in M5V");
    expect(showPlacesLabel(m5v, "fr")).toBe("Afficher les lieux de M5V");
    expect(placesTitle(m5v, "en")).toBe("Places in M5V (2)");
    expect(placesTitle(m5v, "fr")).toBe("Lieux de M5V (2)");
    expect(placesTitle(row({ key: "", label: "" }), "en")).toBe("Places with no area in the address (0)");
    expect(placesTitle(row({ key: "", label: "" }), "fr")).toBe("Lieux sans secteur dans l’adresse (0)");
    expect(showPlacesLabel(row({ key: "", label: "" }), "en")).toBe("Show the places with no area");
    expect(showPlacesLabel(row({ key: "", label: "" }), "fr")).toBe("Afficher les lieux sans secteur");
    expect(showPlacesLabel(row({ key: "eglinton", label: "Eglinton Avenue East" }), "fr")).toBe("Afficher les lieux d’Eglinton Avenue East");
    expect(placesTitle(row({ key: "x", label: "Rue Ontario", places: [] }), "fr")).toBe("Lieux de Rue Ontario (0)");
  });

  it("lists the details with no record, then those whose reports differ", () => {
    const m5c = findArea(report(), "M5C");
    if (!m5c) throw new Error("no area");
    const g = placeGaps(m5c, ["elevator", "automatic-door"])[0];
    if (!g) throw new Error("no place");
    expect(placeGapLines(g, "en")).toEqual(["No record (Unknown): Automatic door", "Reports differ: Elevator"]);
    const fr = placeGapLines(g, "fr");
    expect(fr).toEqual(["Aucune donnée (UNKNOWN)\u00A0: Porte automatique", "Rapports divergents\u00A0: Ascenseur"]);
    for (const line of fr) expect(frenchTypographyIssues(line), line).toEqual([]);
  });

  it("says when every chosen detail has a record", () => {
    const m5c = findArea(report(), "M5C");
    if (!m5c) throw new Error("no area");
    const g = placeGaps(m5c, [])[0];
    if (!g) throw new Error("no place");
    expect(placeGapLines(g, "en")).toEqual([C.allRecorded.en]);
    expect(placeGapLines(g, "fr")).toEqual([C.allRecorded.fr]);
  });
});

describe("areasText", () => {
  it("prints each area, its gaps and each chosen detail", () => {
    const text = areasText(report("en", ["elevator", "automatic-door"]), TODAY, "en");
    expect(text.startsWith("Where records are missing\nPostal area (first three characters of the postal code) — 2026-11-21\n\n")).toBe(true);
    expect(text).toContain(C.rule.en);
    expect(text).toContain("M5V — 2 places, 3 details with no record\n    Elevator: 1 of 2\n    Automatic door: 0 of 2\n");
    expect(text).toContain("M5C — 1 place, 1 detail with no record\n    Elevator: 1 of 1 (1 with reports that differ)\n");
    expect(text).toContain("No area in the address — 1 place, 2 details with no record\n");
    expect(text.endsWith("0 of 1\n")).toBe(true);
  });

  it("prints French with its spacing", () => {
    const text = areasText(report("fr", ["elevator"]), TODAY, "fr");
    expect(text).toContain("M5C — 1 lieu, 0 détail sans donnée\n    Ascenseur\u00A0: 1 sur 1 (1 avec rapports divergents)\n");
    for (const line of text.split("\n")) expect(frenchTypographyIssues(line), line).toEqual([]);
    expect(text).not.toMatch(/inconnu/i);
  });
});

describe("areasFilename", () => {
  it("names the table and the text by day", () => {
    expect(areasFilename("csv", TODAY, "en")).toBe("areas-2026-11-21.csv");
    expect(areasFilename("text", TODAY, "fr")).toBe("secteurs-2026-11-21.txt");
  });

  it("names an area's notes from its label, without accents or spaces", () => {
    expect(areasFilename("notes", TODAY, "en", row())).toBe("notes-area-m5v-2026-11-21.json");
    expect(areasFilename("notes", TODAY, "fr", row({ key: "cote", label: "Chemin de la Côte-des-Neiges" }))).toBe("notes-secteur-chemin-de-la-cote-des-neiges-2026-11-21.json");
    expect(areasFilename("notes", TODAY, "en", row({ key: "", label: "" }))).toBe("notes-area-no-area-2026-11-21.json");
    expect(areasFilename("notes", TODAY, "fr", row({ key: "", label: "" }))).toBe("notes-secteur-sans-secteur-2026-11-21.json");
    expect(areasFilename("notes", TODAY, "en", row({ key: "x", label: "東京" }))).toBe("notes-area-area-2026-11-21.json");
    expect(areasFilename("notes", TODAY, "en", row({ key: "x", label: "A".repeat(80) })).length).toBeLessThan(80);
  });
});
