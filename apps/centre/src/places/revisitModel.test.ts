import { describe, expect, it } from "vitest";
import { mergePacks } from "./packs.js";
import { parsePack } from "./pack.js";
import { buildRevisitView, DEFAULT_CHOICES, readLimit, readStart, readWithinKm, revisitFile, toggleReason } from "./revisitModel.js";
import { samplePackText, SAMPLE_TODAY } from "./testing.js";

const parsed = parsePack(samplePackText());
if (!parsed.ok) throw new Error("sample pack did not parse");
const places = mergePacks([parsed.pack]).places;

describe("readStart", () => {
  it("is none when both boxes are empty", () => expect(readStart("", " ")).toEqual({ kind: "none" }));
  it("reads a full pair, with a point or a comma", () => {
    expect(readStart("43.85", "-79.43")).toEqual({ kind: "ok", lat: 43.85, lon: -79.43 });
    expect(readStart("43,85", "-79,43")).toEqual({ kind: "ok", lat: 43.85, lon: -79.43 });
  });
  it("is invalid for half a pair, text or a number out of range", () => {
    expect(readStart("43.85", "")).toEqual({ kind: "invalid" });
    expect(readStart("north", "-79")).toEqual({ kind: "invalid" });
    expect(readStart("95", "-79")).toEqual({ kind: "invalid" });
  });
});

describe("readLimit and readWithinKm", () => {
  it("keeps an offered choice and falls back otherwise", () => {
    expect(readLimit("10")).toBe(10);
    expect(readLimit("7")).toBe(25);
    expect(readLimit("")).toBe(25);
    expect(readWithinKm("5")).toBe(5);
    expect(readWithinKm("")).toBeNull();
    expect(readWithinKm("3")).toBeNull();
  });
});

describe("toggleReason", () => {
  it("adds once and removes", () => {
    expect(toggleReason([], "old", true)).toEqual(["old"]);
    expect(toggleReason(["old"], "old", true)).toEqual(["old"]);
    expect(toggleReason(["old", "no-name"], "old", false)).toEqual(["no-name"]);
  });
});

describe("buildRevisitView", () => {
  const view = buildRevisitView(places, DEFAULT_CHOICES, SAMPLE_TODAY, "en");
  it("lists only places with a reason, numbered from one", () => {
    expect(view.stops.map((s) => s.order)).toEqual(view.stops.map((_, i) => i + 1));
    expect(view.stops.map((s) => s.id)).not.toContain("s1");
    expect(view.stops.length).toBe(view.list.items.length);
  });
  it("gives each stop its record line with source, licence, date and tier", () => {
    for (const stop of view.stops) {
      expect(stop.recordLine).toMatch(/^Status now: .+\. Source: .+\. Licence: (?:CC0-1\.0|ODbL-1\.0)\. Seen on \d{4}-\d{2}-\d{2}\. Tier: UNKNOWN\.$/);
    }
  });
  it("gives each stop at least one reason with a label and a sentence", () => {
    for (const stop of view.stops) {
      expect(stop.reasons.length).toBeGreaterThan(0);
      expect(stop.reasons[0]?.text.length).toBeGreaterThan(10);
    }
  });
  it("lists the UNKNOWN place with the reason that says UNKNOWN is not a no", () => {
    const stop = view.stops.find((s) => s.id === "s4");
    expect(stop?.reasons.map((r) => r.label)).toContain("Status is UNKNOWN");
    expect(stop?.reasons.map((r) => r.text).join(" ")).toContain("UNKNOWN is not a no.");
  });
  it("counts every reason on the device, whatever is ticked", () => {
    const ticked = buildRevisitView(places, { ...DEFAULT_CHOICES, reasons: ["no-name"] }, SAMPLE_TODAY, "en");
    expect(ticked.reasonChoices).toEqual(view.reasonChoices);
    expect(ticked.reasonChoices).toHaveLength(6);
    expect(ticked.stops.every((s) => s.reasons.every((r) => r.label === "No name recorded"))).toBe(true);
  });
  it("has no first leg and no start without coordinates", () => {
    expect(view.start).toEqual({ kind: "none" });
    expect(view.stops[0]?.leg).toBe("");
  });
  it("orders from a start and says straight line", () => {
    const from = buildRevisitView(places, { ...DEFAULT_CHOICES, startLat: "43.7", startLon: "-79.4" }, SAMPLE_TODAY, "en");
    expect(from.stops[0]?.id).toBe("s3");
    expect(from.stops[0]?.leg).toContain("in a straight line");
    expect(from.orderNote).toContain("knows nothing about kerbs");
  });
  it("narrows to places near the start", () => {
    const near = buildRevisitView(places, { ...DEFAULT_CHOICES, startLat: "43.7", startLon: "-79.4", withinKm: "1" }, SAMPLE_TODAY, "en");
    expect(near.stops.map((s) => s.id)).toEqual(["s3"]);
  });
  it("keeps the whole list and flags the start when it is not a pair of coordinates", () => {
    const bad = buildRevisitView(places, { ...DEFAULT_CHOICES, startLat: "x", startLon: "", withinKm: "1" }, SAMPLE_TODAY, "en");
    expect(bad.start).toEqual({ kind: "invalid" });
    expect(bad.stops.length).toBe(view.stops.length);
  });
  it("writes French when asked", () => {
    const fr = buildRevisitView(places, DEFAULT_CHOICES, SAMPLE_TODAY, "fr");
    expect(fr.summary).toContain("Lieux examinés : 5.");
    expect(fr.stops[0]?.recordLine).toContain("Niveau : UNKNOWN.");
  });
  it("is calm with no places", () => {
    const empty = buildRevisitView([], DEFAULT_CHOICES, SAMPLE_TODAY, "en");
    expect(empty.stops).toEqual([]);
    expect(empty.summary).toMatch(/^No pack is loaded/);
    expect(empty.orderNote).toBe("");
  });
  it("does not change the places", () => {
    const copy = JSON.parse(JSON.stringify(places));
    buildRevisitView(places, { ...DEFAULT_CHOICES, startLat: "43.7", startLon: "-79.4" }, SAMPLE_TODAY, "en");
    expect(places).toEqual(copy);
  });
});

describe("revisitFile", () => {
  const view = buildRevisitView(places, DEFAULT_CHOICES, SAMPLE_TODAY, "en");
  it("makes a field sheet named by day", () => {
    const f = revisitFile("txt", view, SAMPLE_TODAY, "en");
    expect(f).toMatchObject({ filename: "places-to-revisit-2026-11-15.txt", mime: "text/plain" });
    expect(f.content).toContain("Places to revisit, made 2026-11-15");
  });
  it("makes a fill-in sheet with one line per stop and nothing filled in", () => {
    const f = revisitFile("csv", view, SAMPLE_TODAY, "en");
    const lines = f.content.trimEnd().split("\r\n");
    expect(lines).toHaveLength(view.stops.length + 1);
    for (const line of lines.slice(1)) expect(line).toMatch(/^[^,]+,[^,]*,,-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?,,,,/);
  });
});
