import { describe, expect, it } from "vitest";
import { DEFAULT_WORDS, NO_FIXED, setupProblems } from "./filesheet";
import { SETUP_FORMAT, applySetup, columnKey, parseSetup, setupFilename, setupToJson } from "./filesheet-setup";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const FIXED = { source: "Mapping day", licence: "CC-BY-4.0", recordedOn: "2026-11-14" };

describe("columnKey", () => {
  it("ignores case, accents and spaces at either end", () => {
    expect(columnKey("  Élévateur  ")).toBe(columnKey("elevateur"));
    expect(columnKey("Ramp  ?")).toBe("ramp ?");
  });
});

describe("setupToJson and parseSetup", () => {
  it("saves only the used columns, by name, with the typed values and words, and reads them back", () => {
    const json = setupToJson(["Nom", "Notes", "Ascenseur", ""], ["place_name", "", "elevator", "address"], FIXED, DEFAULT_WORDS);
    const data = JSON.parse(json);
    expect(data.format).toBe(SETUP_FORMAT);
    expect(data.columns).toEqual({ Nom: "place_name", Ascenseur: "elevator" });
    const r = parseSetup(json);
    expect(r.ok && r.setup).toEqual({ columns: { Nom: "place_name", Ascenseur: "elevator" }, fixed: FIXED, words: DEFAULT_WORDS });
  });

  it("refuses files that are not choices files", () => {
    expect(parseSetup(" ")).toEqual({ ok: false, error: "empty" });
    expect(parseSetup("{")).toEqual({ ok: false, error: "not-json" });
    expect(parseSetup("[]")).toEqual({ ok: false, error: "wrong-format" });
    expect(parseSetup(JSON.stringify({ format: "app-notes" }))).toEqual({ ok: false, error: "wrong-format" });
    expect(parseSetup(JSON.stringify({ format: SETUP_FORMAT, version: 2 }))).toEqual({ ok: false, error: "wrong-version" });
    expect(parseSetup("x".repeat(100_001))).toEqual({ ok: false, error: "too-large" });
  });

  it("drops parts it cannot use instead of guessing", () => {
    const r = parseSetup(JSON.stringify({ format: SETUP_FORMAT, version: 1, columns: { Nom: "place_name", X: "parking", Y: 3, " ": "address" }, fixed: { source: 5, licence: "CC0-1.0" }, words: "yes" }));
    expect(r.ok && r.setup).toEqual({ columns: { Nom: "place_name" }, fixed: { source: "", licence: "CC0-1.0", recordedOn: "" }, words: { yes: "", no: "", unknown: "" } });
  });

  it("keeps saved text short", () => {
    const r = parseSetup(JSON.stringify({ format: SETUP_FORMAT, version: 1, columns: {}, fixed: { source: "x".repeat(1000) }, words: {} }));
    expect(r.ok && r.setup.fixed.source.length).toBe(300);
  });
});

describe("applySetup", () => {
  const saved = { columns: { Nom: "place_name" as const, Ascenseur: "elevator" as const, Adresse: "address" as const }, fixed: FIXED, words: { yes: "si", no: "", unknown: "" } };

  it("matches columns by name in any order and lists saved columns this spreadsheet lacks", () => {
    const a = applySetup(saved, ["ASCENSEUR", "Couleur", " nom "], DEFAULT_WORDS);
    expect(a.mapping).toEqual(["elevator", "", "place_name"]);
    expect(a.missing).toEqual(["Adresse"]);
    expect(a.fixed).toEqual(FIXED);
  });

  it("keeps the current word lists where the file has none", () => {
    const a = applySetup(saved, ["Nom"], DEFAULT_WORDS);
    expect(a.words).toEqual({ yes: "si", no: DEFAULT_WORDS.no, unknown: DEFAULT_WORDS.unknown });
  });

  it("gives a target to one column only", () => {
    const a = applySetup({ ...saved, columns: { Nom: "place_name", Name: "place_name" } }, ["Name", "Nom"], DEFAULT_WORDS);
    expect(a.mapping).toEqual(["place_name", ""]);
    expect(a.missing).toEqual(["Nom"]);
  });

  it("never makes the typed values pass checks they would fail", () => {
    const a = applySetup({ ...saved, fixed: { source: "", licence: "Proprietary", recordedOn: "soon" } }, ["Nom", "Ascenseur"], DEFAULT_WORDS);
    const codes = setupProblems(a.mapping, a.fixed, a.words, TODAY).map((p) => p.code);
    expect(codes).toEqual(["no-source", "bad-licence", "bad-date"]);
  });

  it("round-trips: saved choices fill in the same mapping on the same spreadsheet", () => {
    const header = ["Nom", "Adresse", "Ascenseur", "Ramp?"];
    const mapping = ["place_name", "address", "elevator", "step-free-entry"] as const;
    const r = parseSetup(setupToJson(header, mapping, FIXED, DEFAULT_WORDS));
    if (!r.ok) throw new Error(r.error);
    const a = applySetup(r.setup, header, { yes: "", no: "", unknown: "" });
    expect(a.mapping).toEqual([...mapping]);
    expect(a.words).toEqual(DEFAULT_WORDS);
    expect(a.missing).toEqual([]);
    expect(setupProblems(a.mapping, a.fixed, a.words, TODAY)).toEqual([]);
  });

  it("works with no saved typed values", () => {
    const a = applySetup({ columns: {}, fixed: NO_FIXED, words: { yes: "", no: "", unknown: "" } }, ["A"], DEFAULT_WORDS);
    expect(a.mapping).toEqual([""]);
    expect(a.fixed).toEqual(NO_FIXED);
  });
});

describe("setupFilename", () => {
  it("is ASCII with the date", () => {
    expect(setupFilename(TODAY, "en")).toBe("spreadsheet-choices-2026-11-20.json");
    expect(setupFilename(TODAY, "fr")).toBe("choix-du-tableur-2026-11-20.json");
  });
});
