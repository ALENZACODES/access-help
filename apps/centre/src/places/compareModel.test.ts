import { describe, expect, it } from "vitest";
import { buildCompareView, cleanRadius, compareFile, rowsFor } from "./compareModel.js";
import { sampleRecords, SAMPLE_TODAY } from "./testing.js";
import type { PlaceRecord } from "./types.js";

const packPlaces = sampleRecords();
const s1 = packPlaces[0]!;
const note = (over: Partial<PlaceRecord>): PlaceRecord => ({ ...s1, id: "mine-1", source: "own visit", observedOn: "2026-11-12", ...over });

const mine: PlaceRecord[] = [
  note({ id: "agree" }),
  note({ id: "differ", name: "Sample Arena", lat: 43.7, lon: -79.4, wheelchair: "yes" }),
  note({ id: "fresh", name: "Sample Depot", lat: 44.9, lon: -78.1 }),
  note({ id: "fill", name: "Sample Clinic Annex", wheelchair: "limited", lat: 43.85, lon: -79.43 }),
];

describe("cleanRadius", () => {
  it("keeps an offered distance and replaces anything else with the default", () => {
    expect(cleanRadius(15)).toBe(15);
    expect(cleanRadius(60)).toBe(60);
    expect(cleanRadius(17)).toBe(30);
    expect(cleanRadius(Number.NaN)).toBe(30);
  });
});

describe("buildCompareView", () => {
  const view = buildCompareView(mine, packPlaces, 30, "en");
  it("has one row per note, with what needs a look first", () => {
    expect(view.rows).toHaveLength(mine.length);
    expect(view.rows[0]?.outcome).toBe("differs");
  });
  it("sets the pack place beside a note that matches", () => {
    const row = view.rows.find((r) => r.id === "differ");
    expect(row?.pack).toMatchObject({ id: "s3", name: "Sample Arena" });
    expect(row?.outcomeLabel).toBe("Your note and the pack differ");
    expect(row?.advice).toMatch(/does not say which is right/);
  });
  it("gives source, licence, date and tier for both sides", () => {
    const row = view.rows.find((r) => r.id === "differ");
    expect(row?.mineLine).toBe("Status: yes. Source: own visit. Licence: CC0-1.0. Seen on 2026-11-12. Tier: UNKNOWN.");
    expect(row?.pack?.line).toBe("Status: no. Source: sample data for tests. Licence: CC0-1.0. Seen on 2023-01-20. Tier: UNKNOWN.");
  });
  it("shows no pack place for a note with nothing nearby", () => {
    const row = view.rows.find((r) => r.id === "fresh");
    expect(row).toMatchObject({ outcome: "new", pack: null, flags: [], otherNearby: 0 });
  });
  it("treats a pack UNKNOWN as something a note may fill, not as a difference", () => {
    expect(view.rows.find((r) => r.id === "fill")?.outcome).toBe("fills-unknown");
  });
  it("counts other pack places within the distance", () => {
    expect(view.rows.find((r) => r.id === "agree")?.otherNearby).toBeGreaterThanOrEqual(1);
  });
  it("offers only the groups that have notes, with their counts", () => {
    expect(view.choices.map((c) => c.value)).toEqual(["differs", "fills-unknown", "new", "agrees"]);
    expect(view.choices.every((c) => c.count === 1)).toBe(true);
  });
  it("summarises in words and says a match is a suggestion", () => {
    expect(view.summary).toContain("Observations compared: 4.");
    expect(view.summary).toContain("A match is a suggestion.");
  });
  it("falls back to the default distance for one that is not offered", () => {
    expect(buildCompareView(mine, packPlaces, 999, "en").report.radius).toBe(30);
  });
  it("writes French when asked", () => {
    const fr = buildCompareView(mine, packPlaces, 30, "fr");
    expect(fr.rows[0]?.outcomeLabel).toBe("Votre note et le paquet diffèrent");
    expect(fr.rows[0]?.mineLine).toContain("Niveau : UNKNOWN.");
  });
  it("is calm with no notes or no packs", () => {
    expect(buildCompareView([], packPlaces, 30, "en").summary).toBe("You have no saved observations to compare.");
    expect(buildCompareView(mine, [], 30, "en").summary).toMatch(/^No pack is loaded/);
  });
  it("does not change its inputs", () => {
    const a = JSON.parse(JSON.stringify(mine));
    const b = JSON.parse(JSON.stringify(packPlaces));
    buildCompareView(mine, packPlaces, 30, "en");
    expect(mine).toEqual(a);
    expect(packPlaces).toEqual(b);
  });
});

describe("rowsFor", () => {
  const view = buildCompareView(mine, packPlaces, 30, "en");
  it("returns all rows as a copy", () => {
    expect(rowsFor(view, "all")).toEqual(view.rows);
    expect(rowsFor(view, "all")).not.toBe(view.rows);
  });
  it("returns one group", () => expect(rowsFor(view, "new").map((r) => r.id)).toEqual(["fresh"]));
  it("is empty for a group with no notes", () => expect(rowsFor(view, "unsure")).toEqual([]));
});

describe("compareFile", () => {
  const report = buildCompareView(mine, packPlaces, 30, "en").report;
  it("makes a text file named by day", () => {
    const f = compareFile("txt", report, SAMPLE_TODAY, "en");
    expect(f).toMatchObject({ filename: "my-notes-beside-packs-2026-11-15.txt", mime: "text/plain" });
    expect(f.content).toContain("My notes beside the packs, 2026-11-15");
  });
  it("makes a csv with a tier column that stays UNKNOWN", () => {
    const f = compareFile("csv", report, SAMPLE_TODAY, "en");
    expect(f.mime).toBe("text/csv");
    const lines = f.content.trimEnd().split("\r\n");
    expect(lines[0]?.endsWith(",tier")).toBe(true);
    expect(lines.slice(1).every((l) => l.endsWith(",UNKNOWN"))).toBe(true);
  });
});
