import { describe, expect, it } from "vitest";
import { DEMONSTRATION_PEERS } from "./candidates.js";
import { PARTNER_ROUTE } from "./partner.js";
import { CATALOG, fill } from "./strings.js";

function flatten(value: unknown, prefix = ""): Array<[string, string]> {
  if (typeof value === "string") return [[prefix, value]];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) =>
    flatten(item, prefix ? `${prefix}.${key}` : key),
  );
}

const en = flatten(CATALOG.en);
const fr = flatten(CATALOG.fr);

describe("string catalogs", () => {
  it("has the same keys in English and French, none empty", () => {
    expect(fr.map(([key]) => key)).toEqual(en.map(([key]) => key));
    for (const [key, text] of [...en, ...fr]) expect(text.trim(), key).not.toBe("");
  });

  it("uses U+00A0 before : ; ? ! and inside guillemets in French", () => {
    for (const [key, text] of fr) {
      expect(text, key).not.toMatch(/[^  ][:;?!]/);
      expect(text, key).not.toMatch(/«(?! )/);
      expect(text, key).not.toMatch(/[^ ]»/);
    }
    expect(CATALOG.fr.cityHelp).toContain("« Aucune ville »");
    expect(CATALOG.fr.provenance).toContain("Source :");
  });

  it("names no organisation and never mentions AI", () => {
    const forbiddenOrg = new RegExp(["\\bsc", "io\\b|sci\\s?", "ontario"].join(""), "i");
    const everything = [...en, ...fr].map(([, text]) => text).concat(
      JSON.stringify(PARTNER_ROUTE),
      JSON.stringify(DEMONSTRATION_PEERS),
    );
    for (const text of everything) {
      expect(text).not.toMatch(forbiddenOrg);
      expect(text).not.toMatch(/\b(AI|IA)\b/);
      expect(text).not.toMatch(/artificial intelligence|intelligence artificielle/i);
    }
  });

  it("names the crisis services in words only, with no clinical advice", () => {
    const crisis = Object.values(CATALOG.en.crisisContacts).join(" ");
    expect(crisis).toContain("911");
    expect(crisis).toContain("9-8-8");
    expect(crisis).toContain("ConnexOntario");
    expect(crisis).not.toMatch(/https?:|\d{3}[-. ]\d{4}/);
  });

  it("says the partner route is a link, not a referral or endorsement", () => {
    expect(CATALOG.en.partnerBody).toMatch(/link only/i);
    expect(CATALOG.en.partnerNoReferral).toMatch(/not a referral/i);
    expect(CATALOG.fr.partnerBody).toMatch(/lien seulement/i);
  });

  it("fills placeholders and leaves unknown ones alone", () => {
    expect(fill("a {x} b {y}", { x: 1 })).toBe("a 1 b {y}");
  });
});
