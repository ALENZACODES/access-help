import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { ALL_LISTS, OutingsApp, PLACES, factView, strings } from "../src";

const COMPETITORS = /outeasily|wheelmap|accessnow|euan|tripadvisor|yelp|google/i;
const BANNED = [
  /\bAI\b/, /\bIA\b/, /artificial intelligence|intelligence artificielle/i, /\b(claude|gpt|gemini|llm)\b/i,
  /you should|you are eligible|vous devriez|vous \u00eates admissible/i,
  /\b(score|rating|stars?|reviews?)\b/i, /\b(\u00e9toiles?|cote)\b/i,
];

function userCopy(): string[] {
  const out: string[] = [];
  for (const lang of ["en", "fr"] as const) {
    for (const v of Object.values(strings[lang])) out.push(typeof v === "function" ? v(2) : v);
  }
  for (const l of ALL_LISTS) out.push(l.titleEn, l.titleFr, l.summaryEn, l.summaryFr, ...l.sources.map((s) => s.name));
  for (const p of PLACES) out.push(p.name, p.municipality);
  return out;
}

describe("copy", () => {
  it("has no competitor names, banned terms or advice wording", () => {
    for (const s of userCopy()) {
      expect(s).not.toMatch(COMPETITORS);
      for (const re of BANNED) expect(s).not.toMatch(re);
    }
  });

  it("EN and FR string tables have the same keys", () => {
    expect(Object.keys(strings.fr).sort()).toEqual(Object.keys(strings.en).sort());
  });

  it("list summaries never assert accessibility", () => {
    for (const l of ALL_LISTS) expect(`${l.summaryEn} ${l.summaryFr}`).not.toMatch(/accessible/i);
  });

  it("UNKNOWN, missing and tier-0 facts render as Unknown, never No", () => {
    const name = (id: string) => id;
    const first = PLACES[0];
    if (!first) throw new Error("missing fixture place");
    const base = first.facts.stepFreeEntrance;
    if (!base) throw new Error("missing step-free fact");
    for (const lang of ["en", "fr"] as const) {
      const unknown = strings[lang].unknown;
      expect(factView({ ...base, value: "UNKNOWN" }, lang, name).text).toBe(unknown);
      expect(factView(undefined, lang, name).text).toBe(unknown);
      expect(factView({ ...base, tier: 0 }, lang, name).text).toBe(unknown);
      expect(factView({ ...base, value: false }, lang, name).text).toBe(strings[lang].no);
    }
  });

  it("detail page shows Unknown for missing facts, with source, licence, date and tier", () => {
    const firstList = ALL_LISTS[0];
    if (!firstList) throw new Error("missing first list");
    const html = renderToStaticMarkup(createElement(OutingsApp, { lang: "en", initialListId: firstList.id }));
    expect(html).toContain("Adult change table");
    expect(html).toContain("<strong>Unknown</strong>");
    expect(html).toContain("Source: Synthetic test fixture");
    expect(html).toContain("Licence: CC0");
    expect(html).toContain("Last fetched: 2026-11-15");
    expect(html).toContain("Tier 1");
    expect(html).toContain("/places/synth-park-001");
    expect(html).not.toMatch(/not accessible|inaccessible/i);
    const fr = renderToStaticMarkup(createElement(OutingsApp, { lang: "fr", initialListId: firstList.id }));
    expect(fr).toContain("<strong>Inconnu</strong>");
  });

  it("index shows real counts", () => {
    const html = renderToStaticMarkup(createElement(OutingsApp, { lang: "en" }));
    expect(html).toContain("3 places");
    expect(html).toContain("0 places");
  });
});
