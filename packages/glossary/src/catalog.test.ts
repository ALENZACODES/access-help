import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { lintCatalogs, parseCatalog } from "./catalog.js";
import { TERMS } from "./terms.js";

const fixtures = (name: string) => parseCatalog(readFileSync(fileURLToPath(new URL(`../fixtures/${name}.json`, import.meta.url)), "utf8"));

describe("glossary", () => {
  it("defines 40+ distinct stable IDs and notes", () => {
    expect(TERMS.length).toBeGreaterThanOrEqual(40);
    expect(new Set(TERMS.map((term) => term.id)).size).toBe(TERMS.length);
    expect(TERMS.every((term) => term.en && term.fr && term.role && term.note && term.noteFr)).toBe(true);
  });
  it("accepts the bilingual passing fixture", () => {
    expect(lintCatalogs(fixtures("pass.en"), fixtures("pass.fr"))).toEqual([]);
  });
  it("reports the major failure classes on fixtures", () => {
    const defects = lintCatalogs(fixtures("fail.en"), fixtures("fail.fr"));
    for (const rule of ["missing-en", "missing-fr", "empty", "typography", "english-leak", "banned", "glossary", "tier-evidence"]) {
      expect(defects.map((finding) => finding.rule), rule).toContain(rule);
    }
    expect(defects).toContainEqual(expect.objectContaining({ rule: "typography", key: "labels.prompt", language: "fr" }));
  });
  it.each(["Bonjour : ici", "Bonjour; ici", "Pourquoi ?", "Attention !", "«texte\u00a0»", "«\u00a0texte»"])("requires non-breaking spacing: %s", (value) => {
    expect(lintCatalogs({ text: "Hello" }, { text: value }).map((finding) => finding.rule)).toContain("typography");
  });
  it("accepts U+00A0 before ':' and U+202F before ';', '!', and '?'", () => {
    expect(lintCatalogs({ text: "An example" }, { text: "«\u00a0Exemple\u00a0: oui\u202f!\u00a0»" })).toEqual([]);
    expect(lintCatalogs({ text: "Ask" }, { text: "Pourquoi\u202f?" })).toEqual([]);
    expect(lintCatalogs({ text: "Wait" }, { text: "Attention\u202f!" })).toEqual([]);
    expect(lintCatalogs({ text: "List" }, { text: "Un\u202f; deux" })).toEqual([]);
  });
  it("rejects the wrong non-breaking space before French punctuation", () => {
    expect(lintCatalogs({ text: "Ask" }, { text: "Pourquoi\u00a0?" }).map((finding) => finding.rule)).toContain("typography");
    expect(lintCatalogs({ text: "Wait" }, { text: "Attention\u00a0!" }).map((finding) => finding.rule)).toContain("typography");
    expect(lintCatalogs({ text: "List" }, { text: "Un\u00a0; deux" }).map((finding) => finding.rule)).toContain("typography");
    expect(lintCatalogs({ text: "Label" }, { text: "Source\u202f: non" }).map((finding) => finding.rule)).toContain("typography");
    expect(lintCatalogs({ text: "An example" }, { text: "«\u202fExemple\u202f: oui\u202f!\u202f»" }).map((finding) => finding.rule)).toContain("typography");
    expect(lintCatalogs({ text: "An example" }, { text: "«\u00a0Exemple\u00a0: oui\u00a0!\u00a0»" }).map((finding) => finding.rule)).toContain("typography");
  });
  it("keeps a French usage note on every term, distinct from the English note", () => {
    expect(TERMS.every((term) => term.noteFr.trim() && term.noteFr !== term.note)).toBe(true);
    for (const term of TERMS) {
      expect(lintCatalogs({ note: term.note }, { note: term.noteFr }), term.id).toEqual([]);
    }
  });
  it("takes the status token UNKNOWN in French, and still flags the English word in other forms", () => {
    expect(lintCatalogs({ note: "Presence is unknown without evidence." }, { note: "La présence est UNKNOWN en l’absence de preuve." })).toEqual([]);
    const rules = (fr: string) => lintCatalogs({ note: "Presence is unknown without evidence." }, { note: fr }).map((item) => item.rule);
    expect(rules("La présence est unknown en l’absence de preuve.")).toContain("glossary");
    expect(rules("La présence est Unknown en l’absence de preuve.")).toContain("glossary");
  });
  it("checks nested keys and rejects non-string leaves", () => {
    expect(lintCatalogs({ nested: { a: "A" } }, { nested: { b: "B" } }).map((item) => item.rule)).toEqual(["missing-fr", "missing-en"]);
    expect(lintCatalogs({ a: ["wrong"] }, { a: "ok" }).map((item) => item.rule)).toContain("schema");
    expect(() => parseCatalog('{"a":2}')).toThrow();
  });
  it("does not reject identical approved vocabulary across languages", () => {
    expect(lintCatalogs({ source: "Source", licence: "Licence" }, { source: "Source", licence: "Licence" })).toEqual([]);
  });
  it("rejects prohibited clinical claims and untranslated terminology", () => {
    expect(lintCatalogs({ title: "The App" }, { title: "the App" }).map((item) => item.rule)).toContain("glossary");
    expect(lintCatalogs({ notice: "Notice" }, { notice: "Take 10 mg now" }).map((item) => item.rule)).toContain("banned");
  });
});
