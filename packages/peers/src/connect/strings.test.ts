import { describe, expect, it } from "vitest";
import { CATALOG } from "../strings.js";
import { SAMPLE_ROUTING_TABLE } from "../testing/routing-fixture.js";
import { RECORDED_ROUTING_TABLE } from "./routing.js";
import { CONNECT_CATALOG } from "./strings.js";

function flatten(value: unknown, prefix = ""): Array<[string, string]> {
  if (typeof value === "string") return [[prefix, value]];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) =>
    flatten(item, prefix ? `${prefix}.${key}` : key),
  );
}

const en = flatten(CONNECT_CATALOG.en);
const fr = flatten(CONNECT_CATALOG.fr);
const NBSP = " ";

describe("connection-flow string catalogues", () => {
  it("has the same keys in English and French, none empty", () => {
    expect(fr.map(([key]) => key)).toEqual(en.map(([key]) => key));
    for (const [key, text] of [...en, ...fr]) expect(text.trim(), key).not.toBe("");
  });

  it("keeps the same placeholders in both languages", () => {
    const holes = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();
    for (const [index, [key, text]] of en.entries()) {
      expect(holes(fr[index]![1]), key).toEqual(holes(text));
    }
  });

  it("uses U+00A0 before : ; ? ! and inside guillemets in French", () => {
    for (const [key, text] of fr) {
      expect(text, key).not.toMatch(new RegExp(`[^${NBSP}][:;?!]`));
      expect(text, key).not.toMatch(new RegExp(`«(?!${NBSP})`));
      expect(text, key).not.toMatch(new RegExp(`[^${NBSP}]»`));
    }
    expect(CONNECT_CATALOG.fr.forWhomLegend).toContain(`demande${NBSP}?`);
  });

  it("names no organisation, no phone number or address, and never mentions AI", () => {
    const forbiddenOrg = new RegExp(["\\bsc", "io\\b|sci\\s?", "ontario"].join(""), "i");
    const everything = [...en, ...fr]
      .map(([, text]) => text)
      .concat(JSON.stringify(RECORDED_ROUTING_TABLE), JSON.stringify(SAMPLE_ROUTING_TABLE));
    for (const text of everything) {
      expect(text).not.toMatch(forbiddenOrg);
      expect(text).not.toMatch(/\b(AI|IA)\b/);
      expect(text).not.toMatch(/artificial intelligence|intelligence artificielle/i);
      expect(text).not.toMatch(/https?:|www\.|@|\d{3}[-. ]\d{3}[-. ]\d{4}|\b1[-. ]8\d\d\b/);
    }
  });

  it("says a partner organisation's peer programme, and that the App sends nothing", () => {
    expect(CONNECT_CATALOG.en.intro).toContain("a partner organisation's peer programme");
    expect(CONNECT_CATALOG.en.summaryHelp).toContain("a partner organisation's peer programme");
    expect(CONNECT_CATALOG.en.notSentBanner).toMatch(/^The App sends nothing\./);
    expect(CONNECT_CATALOG.fr.notSentBanner).toMatch(/^L'application n'envoie rien\./);
    expect(CONNECT_CATALOG.fr.intro).toContain("programme de pairs d'un organisme partenaire");
  });

  it("promises no reply and no reply time anywhere", () => {
    expect(CONNECT_CATALOG.en.noPromise).toMatch(/cannot promise that a peer will reply/);
    const others = [...en, ...fr].filter(([key]) => key !== "noPromise" && key !== "summary.notReferral");
    for (const [key, text] of others) {
      expect(text, key).not.toMatch(/will (reply|respond|contact you|call you|be in touch)|within \d|\b\d+ (hours?|days?|heures?|jours?)\b/i);
      expect(text, key).not.toMatch(/vous (répondra|contactera|appellera)/i);
    }
  });

  it("states crisis signposting as signposting, not counselling, with only the published contacts", () => {
    expect(CONNECT_CATALOG.en.crisisSignpostOnly).toMatch(/only points to them/);
    expect(CONNECT_CATALOG.en.crisisSignpostOnly).toMatch(/does not offer counselling/);
    expect(CONNECT_CATALOG.fr.crisisSignpostOnly).toMatch(/n'offre pas de counseling/);
    expect(Object.keys(CATALOG.en.crisisContacts)).toEqual(["emergency_911", "crisis_988", "connexontario"]);
    const digits = [...en, ...fr]
      .map(([, text]) => text.replace(/\{\w+\}/g, ""))
      .join(" ")
      .match(/\d[\d-]*/g);
    expect([...new Set(digits)].sort()).toEqual(["16", "911"]);
  });

  it("never asks for a diagnosis or an injury level, and says so", () => {
    expect(CONNECT_CATALOG.en.contextsHelp).toMatch(/does not ask for a diagnosis or an injury level/);
    for (const label of [...Object.values(CONNECT_CATALOG.en.contexts), ...Object.values(CONNECT_CATALOG.fr.contexts)]) {
      expect(label).not.toMatch(/pl[eé]gi|paraly|spinal|médull|diagnos|level|niveau|complete|complète/i);
    }
  });

  it("gives an Unknown wording for every routing reason", () => {
    expect(CONNECT_CATALOG.en.streamUnknown).toBe("Unknown");
    expect(CONNECT_CATALOG.en.unknownReasons.no_stream_for_region).toBe("No programme stream is recorded for this region.");
  });
});
