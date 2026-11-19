import { describe, expect, it } from "vitest";
import {
  CONTRIBUTOR_SOURCE,
  COPY,
  OPEN_LICENCES,
  RECORD_KINDS,
  RECORD_TIER,
  findBanned,
  frenchTypographyIssues,
  hasAllParts,
  kindLabel,
  recordKind,
  recordLine,
  recordParts,
  recordTier,
  shownSource,
  tierLabel,
  type Provenance,
} from "./index";

const person: Provenance = { source: CONTRIBUTOR_SOURCE, licence: "CC0-1.0", recordedOn: "2026-10-01" };
const survey: Provenance = { source: "City survey", licence: "OGL-Canada-2.0", recordedOn: "2025-02-03" };

describe("record tier", () => {
  it("is 0 for every record on this device, whatever the source, licence or date", () => {
    expect(RECORD_TIER).toBe(0);
    for (const licence of OPEN_LICENCES) {
      for (const source of [CONTRIBUTOR_SOURCE, "City survey", "Town open data", "x"]) {
        for (const recordedOn of ["2001-01-01", "2026-11-15"]) {
          expect(recordTier({ source, licence, recordedOn })).toBe(0);
        }
      }
    }
  });

  it("says the tier and what it means in both languages", () => {
    expect(tierLabel("en")).toBe("Tier 0, not reviewed");
    expect(tierLabel("fr")).toBe("Niveau 0, non examiné");
    expect(tierLabel("en")).toMatch(/^Tier 0\b/);
    expect(tierLabel("fr")).toMatch(/^Niveau 0\b/);
    expect(COPY.tier.explain.en).toContain("Tier 0");
    expect(COPY.tier.explain.fr).toContain("niveau 0");
  });

  it("never uses wording that claims a review took place", () => {
    for (const pair of Object.values(COPY.tier)) {
      expect(findBanned(pair.en), pair.en).toBeUndefined();
      expect(findBanned(pair.fr), pair.fr).toBeUndefined();
      expect(frenchTypographyIssues(pair.fr), pair.fr).toEqual([]);
    }
  });
});

describe("record kind", () => {
  it("is a person's report only for the contributor source, exactly", () => {
    expect(recordKind(person)).toBe("person");
    expect(recordKind(survey)).toBe("named-source");
    for (const source of ["contributor report", "Contributor report ", "Contributor reports", ""]) {
      expect(recordKind({ source }), `"${source}"`).toBe("named-source");
    }
  });

  it("has a label for every kind in both languages, and the labels differ", () => {
    for (const l of ["en", "fr"] as const) {
      const labels = RECORD_KINDS.map((k) => kindLabel(k, l));
      expect(new Set(labels).size).toBe(RECORD_KINDS.length);
      for (const label of labels) expect(label.length).toBeGreaterThan(3);
    }
    expect(kindLabel("person", "en")).toBe("Report by a person");
    expect(kindLabel("named-source", "fr")).toBe("Source nommée");
  });
});

describe("what a record shows", () => {
  it("translates the contributor source and leaves any other source as recorded", () => {
    expect(shownSource(CONTRIBUTOR_SOURCE, "en")).toBe("Contributor report");
    expect(shownSource(CONTRIBUTOR_SOURCE, "fr")).toBe("Rapport d’un contributeur");
    expect(shownSource("City survey", "fr")).toBe("City survey");
    expect(shownSource("Données ouvertes", "en")).toBe("Données ouvertes");
  });

  it("gives source, licence, date and tier for every record", () => {
    expect(recordParts(survey, "en")).toEqual({
      source: "City survey",
      licence: "OGL-Canada-2.0",
      date: "2025-02-03",
      tier: "Tier 0, not reviewed",
      kind: "Named source",
    });
    expect(recordParts(person, "fr")).toEqual({
      source: "Rapport d’un contributeur",
      licence: "CC0-1.0",
      date: "2026-10-01",
      tier: "Niveau 0, non examiné",
      kind: "Rapport d’une personne",
    });
  });

  it("writes the four parts on one line, in a fixed order", () => {
    expect(recordLine(survey, "en")).toBe("City survey · OGL-Canada-2.0 · 2025-02-03 · Tier 0, not reviewed");
    expect(recordLine(person, "fr")).toBe("Rapport d’un contributeur · CC0-1.0 · 2026-10-01 · Niveau 0, non examiné");
  });

  it("can tell when a line is missing a part", () => {
    for (const l of ["en", "fr"] as const) {
      for (const p of [person, survey]) {
        const line = recordLine(p, l);
        expect(hasAllParts(line, p, l)).toBe(true);
        const parts = recordParts(p, l);
        for (const part of [parts.source, parts.licence, parts.date, parts.tier]) {
          expect(hasAllParts(line.replace(part, ""), p, l), part).toBe(false);
        }
      }
    }
    expect(hasAllParts(recordLine(person, "en"), person, "fr")).toBe(false);
  });
});
