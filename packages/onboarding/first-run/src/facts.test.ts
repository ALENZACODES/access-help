import { describe, expect, it } from "vitest";
import {
  COPY,
  EXAMPLE_PROVENANCE,
  FACT_KEYS,
  OPEN_LICENCES,
  STALE_AFTER_MONTHS,
  ageText,
  describeFact,
  exampleFacts,
  frenchTypographyIssues,
  isIsoDate,
  monthsSince,
  normalizeFact,
  parseProvenance,
  summarize,
  type FactKey,
} from "./index";

const P = { source: "Example source", licence: "CC-BY-4.0", recordedOn: "2026-01-15" };
const TODAY = new Date(Date.UTC(2026, 10, 15));

describe("normalizeFact never infers", () => {
  it("keeps yes/no only with full provenance", () => {
    expect(normalizeFact("elevator", { value: "yes", provenance: P }).fact.value).toBe("yes");
    expect(normalizeFact("elevator", { value: "no", provenance: P }).fact.value).toBe("no");
  });

  it("downgrades a yes or no without provenance to unknown and says so", () => {
    const r = normalizeFact("elevator", { value: "yes" });
    expect(r.fact.value).toBe("unknown");
    expect(r.fact.provenance).toBeUndefined();
    expect(r.coerced).toBe(true);
  });

  it("rejects non-open licences, empty sources and bad dates", () => {
    expect(parseProvenance({ ...P, licence: "All rights reserved" })).toBeUndefined();
    expect(parseProvenance({ ...P, source: "  " })).toBeUndefined();
    expect(parseProvenance({ ...P, recordedOn: "2026-02-30" })).toBeUndefined();
    expect(parseProvenance({ ...P, recordedOn: "15/01/2026" })).toBeUndefined();
    expect(parseProvenance(null)).toBeUndefined();
    for (const l of OPEN_LICENCES) expect(parseProvenance({ ...P, licence: l })).toBeDefined();
  });

  it("treats everything else as unknown without calling it a coercion", () => {
    for (const raw of [undefined, null, 5, "yes", {}, { value: "maybe", provenance: P }, { value: true }]) {
      const r = normalizeFact("automatic-door", raw);
      expect(r.fact.value).toBe("unknown");
      expect(r.coerced).toBe(false);
    }
  });

  it("validates ISO dates", () => {
    expect(isIsoDate("2024-02-29")).toBe(true);
    expect(isIsoDate("2025-02-29")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
  });
});

describe("dates", () => {
  it("counts whole months and never goes negative", () => {
    expect(monthsSince("2026-01-15", TODAY)).toBe(10);
    expect(monthsSince("2026-01-16", TODAY)).toBe(9);
    expect(monthsSince("2027-01-01", TODAY)).toBe(0);
  });

  it("words ages in both languages", () => {
    expect(ageText(0, "en")).toBe("this month");
    expect(ageText(1, "en")).toBe("1 month ago");
    expect(ageText(5, "en")).toBe("5 months ago");
    expect(ageText(0, "fr")).toBe("ce mois-ci");
    expect(ageText(5, "fr")).toBe("il y a 5 mois");
  });
});

describe("describeFact", () => {
  it("shows source, licence and date for recorded details", () => {
    const f = normalizeFact("step-free-entry", { value: "yes", provenance: P }).fact;
    const en = describeFact(f, "en", TODAY);
    expect(en.value).toBe("Yes");
    expect(en.detail).toContain("Source: Example source.");
    expect(en.detail).toContain("Licence: CC-BY-4.0.");
    expect(en.detail).toContain("Recorded on 2026-01-15 (10 months ago).");
    const fr = describeFact(f, "fr", TODAY);
    expect(fr.value).toBe("Oui");
    expect(fr.detail).toContain("Source\u00A0: Example source.");
    expect(fr.detail).toContain("Saisi le 2026-01-15 (il y a 10 mois).");
  });

  it("flags old details as possibly out of date", () => {
    const f = normalizeFact("elevator", { value: "no", provenance: { ...P, recordedOn: "2025-01-01" } }).fact;
    expect(monthsSince("2025-01-01", TODAY)).toBeGreaterThanOrEqual(STALE_AFTER_MONTHS);
    expect(describeFact(f, "en", TODAY).detail).toContain("May be out of date.");
    expect(describeFact(f, "fr", TODAY).detail).toContain("Peut être périmé.");
  });

  it("says unknown and no record for unknown, never no", () => {
    const f = normalizeFact("elevator", undefined).fact;
    const v = describeFact(f, "en", TODAY);
    expect(v.value).toBe("Unknown");
    expect(v.value).not.toBe("No");
    expect(v.detail).toBe("No record.");
    expect(describeFact(f, "fr", TODAY).value).toBe("UNKNOWN");
  });

  it("uses clean French typography and never claims verification or real time", () => {
    const facts = [
      normalizeFact("elevator", { value: "yes", provenance: P }).fact,
      normalizeFact("elevator", { value: "no", provenance: { ...P, recordedOn: "2024-01-01" } }).fact,
      normalizeFact("elevator", undefined).fact,
    ];
    for (const f of facts) {
      const v = describeFact(f, "fr", TODAY);
      for (const s of [v.label, v.value, v.detail]) expect(frenchTypographyIssues(s), s).toEqual([]);
      const all = JSON.stringify(describeFact(f, "en", TODAY)) + JSON.stringify(v);
      expect(all).not.toMatch(/verified|real-?time|vérifi|temps réel/i);
    }
  });

  it("has a label for every key", () => {
    for (const k of FACT_KEYS) {
      const key: FactKey = k;
      expect(COPY.facts[key].en).not.toBe("");
      expect(COPY.facts[key].fr).not.toBe("");
    }
  });
});

describe("example and summary", () => {
  it("example facts mix yes, no and two unknowns and are labelled as illustrative", () => {
    const facts = exampleFacts();
    expect(summarize(facts)).toEqual({ yes: 1, no: 1, unknown: 2 });
    expect(EXAMPLE_PROVENANCE.source).toMatch(/Illustrative example/);
    expect(EXAMPLE_PROVENANCE.licence).toBe("CC0-1.0");
  });

  it("summarize keeps unknown separate from no", () => {
    expect(summarize([])).toEqual({ yes: 0, no: 0, unknown: 0 });
  });
});
