import { describe, expect, it } from "vitest";
import { MORE_STRINGS } from "../../../apps/centre/src/places/moreStrings.js";
import { PLACES_STRINGS } from "../../../apps/centre/src/places/strings.js";
import { SETTINGS_STRINGS } from "../../../apps/centre/src/settings/strings.js";
import { auditStringTables, type StringTable } from "./i18n.js";

const table = (en: Record<string, string>, fr: Record<string, string>): StringTable => ({ name: "t", en, fr });
const problems = (en: Record<string, string>, fr: Record<string, string>) => auditStringTables([table(en, fr)]).map((f) => f.problem);

describe("string-table audit: the checker fails on each kind of violation", () => {
  it("passes a clean pair", () => {
    expect(problems({ a: "Saved {count}" }, { a: "Enregistrés {count}" })).toEqual([]);
  });
  it("reports a missing, an extra, and an empty French string", () => {
    expect(problems({ a: "One" }, {})).toEqual(["missing-fr"]);
    expect(problems({ a: "One" }, { a: "Un", b: "Deux" })).toEqual(["extra-fr"]);
    expect(problems({ a: "One" }, { a: "  " })).toEqual(["empty-fr"]);
    expect(problems({ a: "" }, { a: "Un" })).toEqual(["empty-en"]);
  });
  it("reports a placeholder that differs between languages", () => {
    expect(problems({ a: "{count} places" }, { a: "{nombre} lieux" })).toEqual(["placeholder-mismatch"]);
    expect(problems({ a: "{a} {b}" }, { a: "{a}" })).toEqual(["placeholder-mismatch"]);
  });
  it("reports a straight apostrophe and bad French spacing", () => {
    expect(problems({ a: "It is" }, { a: "C'est" })).toContain("straight-apostrophe");
    expect(problems({ a: "Note: x" }, { a: "Note : x" })).toContain("french-punctuation");
    expect(problems({ a: "Note: x" }, { a: "Note : x" })).toEqual([]);
    expect(problems({ a: "Really?" }, { a: "Vraiment?" })).toContain("french-punctuation");
  });
  it("reports long French text that is just the English text, but allows a short one or a listed one", () => {
    expect(problems({ a: "This sentence was never translated." }, { a: "This sentence was never translated." })).toEqual(["untranslated"]);
    expect(problems({ a: "JSON file" }, { a: "JSON file" })).toEqual([]);
    const same = "This sentence was never translated.";
    expect(auditStringTables([table({ a: same }, { a: same })], new Set(["t.a"]))).toEqual([]);
  });
  it("reports a French string that drops UNKNOWN or renames the status", () => {
    expect(problems({ a: "Status: UNKNOWN." }, { a: "Statut : absent." })).toEqual(["unknown-token-lost"]);
    expect(problems({ a: "Status: UNKNOWN." }, { a: "Statut : UNKNOWN (inconnu)." })).toEqual(["inconnu-for-status"]);
  });
  it("names the table, the key, and the problem", () => {
    const [finding] = auditStringTables([{ name: "places", en: { k: "One" }, fr: {} }]);
    expect(finding).toEqual({ table: "places", key: "k", problem: "missing-fr", detail: "no French text" });
  });
});

describe("string-table audit: the App's own tables", () => {
  it("has no finding in the places, place-detail, or settings strings", () => {
    const findings = auditStringTables([
      { name: "places", en: PLACES_STRINGS.en, fr: PLACES_STRINGS.fr },
      { name: "places-more", en: MORE_STRINGS.en, fr: MORE_STRINGS.fr },
      { name: "settings", en: SETTINGS_STRINGS.en, fr: SETTINGS_STRINGS.fr },
    ]);
    expect(findings, JSON.stringify(findings, null, 2)).toEqual([]);
  });
});
