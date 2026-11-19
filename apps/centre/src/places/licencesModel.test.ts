import { describe, expect, it } from "vitest";
import { parsePack } from "./pack.js";
import { LICENCE_SCOPES, buildLicencesView, isLicenceScope, licencesFile, partFile, recordsFor, startScope } from "./licencesModel.js";
import { SAMPLE_TODAY } from "./testing.js";
import type { PlaceRecord } from "./types.js";

function place(over: Partial<PlaceRecord> = {}): PlaceRecord {
  return { id: "a1", lat: 43.85, lon: -79.43, name: "Sample Library", wheelchair: "yes", source: "own visit", licence: "CC0-1.0", observedOn: "2026-11-10", ...over };
}

const MINE: PlaceRecord[] = [place(), place({ id: "a2", name: null, wheelchair: "UNKNOWN", observedOn: "2026-10-01" })];
const PACKS: PlaceRecord[] = [
  place({ id: "p1", name: "Sample Arena", wheelchair: "no", source: "Sample open pack", licence: "ODbL-1.0", observedOn: "2026-09-15" }),
  place({ id: "p2", name: "Sample Café", wheelchair: "limited", source: "Sample open pack", licence: "ODbL-1.0", observedOn: "2026-09-20" }),
];

const view = (scope: "mine" | "packs" | "both", mine = MINE, packs = PACKS) => buildLicencesView(mine, packs, scope, "short", [], "en");

describe("licence screen scopes", () => {
  it("knows its scopes", () => {
    expect(LICENCE_SCOPES).toEqual(["mine", "packs", "both"]);
    expect(isLicenceScope("both")).toBe(true);
    expect(isLicenceScope("all")).toBe(false);
  });
  it("gives the records of each scope", () => {
    expect(recordsFor("mine", MINE, PACKS).map((r) => r.id)).toEqual(["a1", "a2"]);
    expect(recordsFor("packs", MINE, PACKS).map((r) => r.id)).toEqual(["p1", "p2"]);
    expect(recordsFor("both", MINE, PACKS).map((r) => r.id)).toEqual(["a1", "a2", "p1", "p2"]);
  });
  it("does not count a record twice when a pack holds the same id", () => {
    const both = recordsFor("both", MINE, [...PACKS, place({ id: "a1", source: "copy", licence: "ODbL-1.0" })]);
    expect(both.map((r) => r.id)).toEqual(["a1", "a2", "p1", "p2"]);
    expect(both[0]?.source).toBe("own visit");
  });
  it("returns copies, so the saved lists cannot be changed through them", () => {
    const got = recordsFor("mine", MINE, PACKS);
    got.pop();
    expect(MINE).toHaveLength(2);
  });
  it("opens on a person’s own observations unless only packs exist", () => {
    expect(startScope(MINE, PACKS)).toBe("mine");
    expect(startScope([], PACKS)).toBe("packs");
    expect(startScope([], [])).toBe("mine");
  });
});

describe("licence screen view", () => {
  it("counts the records of every scope whatever scope is shown", () => {
    expect(view("mine").scopeCounts).toEqual({ mine: "2 records", packs: "2 records", both: "4 records" });
    expect(buildLicencesView([place()], [], "mine", "short", [], "fr").scopeCounts).toEqual({ mine: "1 fiche", packs: "0 fiche", both: "1 fiche" });
  });
  it("asks nothing for a person’s own CC0-1.0 observations", () => {
    const v = view("mine");
    expect(v.guide.mix.kind).toBe("cc0-only");
    expect(v.guide.duties).toEqual([]);
    expect(v.splitLabel).toBe("One file is enough");
    expect(v.plan.checklist.map((i) => i.id)).toEqual(["read-licence", "own-eyes-map"]);
  });
  it("shows the duties and two files for both scopes together", () => {
    const v = view("both");
    expect(v.guide.mix.kind).toBe("cc0-and-odbl");
    expect(v.guide.duties).toHaveLength(3);
    expect(v.splitLabel).toBe("Two files keep the duties apart");
    expect(v.parts.map((p) => p.heading)).toEqual(["CC0-1.0 file: 2 records", "ODbL-1.0 file: 2 records"]);
    expect(v.parts[0]?.duties).toEqual(["Sharing this file asks for nothing."]);
  });
  it("builds a table row per source with status counts that keep UNKNOWN", () => {
    const v = view("both");
    expect(v.rows.map((r) => [r.source, r.licence, r.count, r.credit])).toEqual([
      ["Sample open pack", "ODbL-1.0", 2, "Asked"],
      ["own visit", "CC0-1.0", 2, "Not required"],
    ]);
    expect(v.rows[1]?.statuses).toBe("yes: 1; limited: 0; no: 0; UNKNOWN: 1");
    expect(v.rows[1]?.seen).toBe("2026-10-01 to 2026-11-10");
    expect(v.rows[0]?.sentence).toMatch(/Tier: UNKNOWN\.$/);
  });
  it("gives every row its own key", () => {
    const v = view("both", MINE, [...PACKS, place({ id: "p3", source: "own visit", licence: "ODbL-1.0" })]);
    expect(new Set(v.rows.map((r) => r.key)).size).toBe(v.rows.length);
  });
  it("flags a licence the App does not take and leaves it out of every file", () => {
    const v = view("mine", [...MINE, place({ id: "a3", source: "Other list", licence: "CC-BY-4.0" as PlaceRecord["licence"] })]);
    expect(v.guide.mix.kind).toBe("has-other");
    expect(v.rows.find((r) => !r.accepted)?.credit).toBe("Cannot be said");
    expect(v.leftOut).toEqual(["Left out, licence the App does not take: 1."]);
    expect(v.parts.map((p) => p.licence)).toEqual(["CC0-1.0"]);
  });
  it("keeps only the ticks that are on the list for this scope", () => {
    const v = buildLicencesView(MINE, PACKS, "mine", "short", ["read-licence", "credit-placed"], "en");
    expect(v.ticks).toEqual(["read-licence"]);
    expect(v.progress).toMatch(/^Ticked: 1\. Not ticked: 1\./);
  });
  it("changes the notice with the form", () => {
    expect(buildLicencesView(MINE, PACKS, "both", "short", [], "en").plan.notice.text).toMatch(/^Contains data from Sample open pack, under ODbL-1\.0\./);
    expect(buildLicencesView(MINE, PACKS, "both", "full", [], "en").plan.notice.text).toMatch(/^This contains data under ODbL-1\.0 from:/);
  });
  it("is calm when there is nothing at all", () => {
    const v = view("mine", [], []);
    expect(v.records).toEqual([]);
    expect(v.rows).toEqual([]);
    expect(v.parts).toEqual([]);
    expect(v.guide.facts).toHaveLength(2);
    expect(v.guide.questions.length).toBeGreaterThan(3);
  });
  it("writes French for the same view", () => {
    const v = buildLicencesView(MINE, PACKS, "both", "short", [], "fr");
    expect(v.splitLabel).toBe("Deux fichiers gardent les obligations séparées");
    expect(v.rows[0]?.credit).toBe("Demandée");
    expect(v.guide.notAdvice).toMatch(/pas un avis juridique/);
  });
});

describe("licence screen files", () => {
  it("makes no file when there are no records", () => {
    const v = view("mine", [], []);
    for (const kind of ["guide", "plan", "sources", "notice"] as const) expect(licencesFile(kind, v, SAMPLE_TODAY, "en")).toBeNull();
  });
  it("makes the summary, the plan and the sources file", () => {
    const v = view("both");
    expect(licencesFile("guide", v, SAMPLE_TODAY, "en")).toMatchObject({ filename: `licences-${SAMPLE_TODAY}.txt`, mime: "text/plain" });
    const plan = licencesFile("plan", v, SAMPLE_TODAY, "en");
    expect(plan?.filename).toBe(`sharing-plan-${SAMPLE_TODAY}.txt`);
    expect(plan?.content).toContain("Two files keep the duties apart");
    const sources = licencesFile("sources", v, SAMPLE_TODAY, "en");
    expect(sources?.mime).toBe("text/csv");
    expect(sources?.content.split("\r\n")[1]).toBe("Sample open pack,ODbL-1.0,yes,yes,2,2026-09-15,2026-09-20,0,1,1,0");
  });
  it("puts the person’s ticks in the plan file", () => {
    const v = buildLicencesView(MINE, PACKS, "both", "short", ["read-licence"], "en");
    expect(licencesFile("plan", v, SAMPLE_TODAY, "en")?.content).toContain("[x] I read the licence text");
  });
  it("names the notice file by its form", () => {
    expect(licencesFile("notice", view("both"), SAMPLE_TODAY, "en")?.filename).toBe(`notice-short-${SAMPLE_TODAY}.txt`);
    const full = buildLicencesView(MINE, PACKS, "both", "full", [], "en");
    expect(licencesFile("notice", full, SAMPLE_TODAY, "en")?.filename).toBe(`notice-full-${SAMPLE_TODAY}.txt`);
  });
  it("makes no notice file when there is no source to name", () => {
    const v = view("mine", [place({ source: "x", licence: "CC-BY-4.0" as PlaceRecord["licence"] })], []);
    expect(licencesFile("notice", v, SAMPLE_TODAY, "en")).toBeNull();
  });
  it("makes a pack file per licence that the App can read back", () => {
    const v = view("both");
    const file = partFile("ODbL-1.0", v, SAMPLE_TODAY);
    expect(file?.filename).toBe(`records-odbl-1.0-${SAMPLE_TODAY}.json`);
    const parsed = parsePack(file?.content ?? "");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.pack.records.map((r) => r.id)).toEqual(["p1", "p2"]);
      expect(parsed.pack.manifest.licences).toEqual(["ODbL-1.0"]);
      expect(parsed.pack.records.every((r) => r.source === "Sample open pack" && r.observedOn !== "")).toBe(true);
    }
  });
  it("keeps the other licence out of a part file", () => {
    const file = partFile("CC0-1.0", view("both"), SAMPLE_TODAY);
    expect(file?.content).not.toContain("ODbL-1.0");
    expect(file?.content).toContain("\"wheelchair\": \"UNKNOWN\"");
  });
  it("makes no part file for a licence with no part", () => {
    expect(partFile("ODbL-1.0", view("mine"), SAMPLE_TODAY)).toBeNull();
    expect(partFile("CC-BY-4.0", view("both"), SAMPLE_TODAY)).toBeNull();
  });
});
