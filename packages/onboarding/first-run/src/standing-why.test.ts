import { describe, expect, it } from "vitest";
import { COPY, FACT_KEYS, auditCopy, groupPlaces, type Note, type Place, type Requirement } from "./index";
import { WHY_COPY, whyLines, whyOf, whyStrings } from "./standing-why";
import { makeRng, randomNotes } from "./testkit";
import { testNote } from "./testnotes";

const NOTES = (): Note[] => [
  testNote("l1", "Library", [{ key: "step-free-entry", value: "yes" }, { key: "elevator", value: "yes" }]),
  testNote("b1", "Bakery", [{ key: "step-free-entry", value: "no" }, { key: "elevator", value: "no" }], "2 Main St"),
  testNote("d1", "Deli", [{ key: "elevator", value: "yes" }], "4 Main St"),
  testNote("d2", "Deli", [{ key: "elevator", value: "no" }], "4 Main St"),
];
const NEEDS: Requirement = { "step-free-entry": "yes", elevator: "yes" };
const place = (name: string): Place => {
  const p = groupPlaces(NOTES(), "en").find((x) => x.name === name);
  if (!p) throw new Error(name);
  return p;
};

describe("whyOf", () => {
  it("names nothing when every must-have matches", () => {
    expect(whyOf(place("Library"), NEEDS)).toEqual({ notMet: [], unknown: [], differ: [] });
    expect(whyLines(whyOf(place("Library"), NEEDS), "en")).toEqual([]);
  });

  it("names each must-have answered the other way, in the App's detail order", () => {
    expect(whyOf(place("Bakery"), NEEDS).notMet).toEqual(["step-free-entry", "elevator"]);
  });

  it("keeps Unknown and reports that differ apart", () => {
    expect(whyOf(place("Deli"), NEEDS)).toEqual({ notMet: [], unknown: ["step-free-entry"], differ: ["elevator"] });
  });

  it("names nothing at all when no must-have is saved", () => {
    expect(whyOf(place("Bakery"), {})).toEqual({ notMet: [], unknown: [], differ: [] });
  });

  it("lists each must-have exactly once on random notes and must-haves", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const rng = makeRng(seed);
      const needs: Requirement = Object.fromEntries(FACT_KEYS.filter(() => rng() < 0.6).map((k) => [k, rng() < 0.5 ? "yes" : "no"]));
      for (const p of groupPlaces(randomNotes(rng, 8), "en")) {
        const w = whyOf(p, needs);
        const named = [...w.notMet, ...w.unknown, ...w.differ];
        expect(new Set(named).size, String(seed)).toBe(named.length);
        for (const k of named) expect(needs[k], String(seed)).toBeDefined();
        for (const k of w.unknown) expect(p.resolutions[k].kind, String(seed)).toBe("unknown");
        for (const k of w.differ) expect(p.resolutions[k].kind, String(seed)).toBe("differ");
      }
    }
  });
});

describe("whyLines", () => {
  it("writes what does not match, then what to ask about", () => {
    expect(whyLines(whyOf(place("Bakery"), NEEDS), "en")).toEqual(["Does not match: Step-free entrance, Elevator"]);
    expect(whyLines(whyOf(place("Deli"), NEEDS), "en")).toEqual(["To ask about: Step-free entrance (Unknown), Elevator (reports differ)"]);
  });

  it("writes French with the UNKNOWN token and a no-break space", () => {
    expect(whyLines(whyOf(place("Deli"), NEEDS), "fr")).toEqual([`À demander\u00A0: Entrée sans marche (${COPY.plan.unknown.fr}), Ascenseur (rapports divergents)`]);
    expect(whyLines(whyOf(place("Bakery"), NEEDS), "fr")[0]).toMatch(/^Ne correspond pas\u00A0: /);
  });

  it("strings pass the App's copy audit", () => {
    expect(auditCopy(whyStrings()).map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
    expect(whyStrings()).toHaveLength(Object.keys(WHY_COPY).length);
  });
});

describe("wanting a No", () => {
  it("treats a recorded Yes as not matching when the must-have is No", () => {
    const w = whyOf(place("Library"), { elevator: "no" });
    expect(w.notMet).toEqual(["elevator"]);
    expect(whyLines(w, "en")).toEqual(["Does not match: Elevator"]);
  });

  it("treats a recorded No as matching when the must-have is No", () => {
    expect(whyOf(place("Bakery"), { elevator: "no" })).toEqual({ notMet: [], unknown: [], differ: [] });
  });
});
