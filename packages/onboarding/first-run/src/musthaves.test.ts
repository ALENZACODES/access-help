import { describe, expect, it } from "vitest";
import {
  COPY,
  FACT_KEYS,
  NEED_CHOICES,
  STAND_GROUPS,
  choiceOf,
  findBanned,
  groupPlaces,
  isNeedChoice,
  needsFilename,
  needsLines,
  needsStanding,
  needsToText,
  setNeed,
  standLabel,
  standOf,
  type Note,
  type Place,
  type Requirement,
} from "./index";
import { makeRng, randomNotes } from "./testkit";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));

const NOTES = (): Note[] => [
  testNote("l1", "Library", [{ key: "step-free-entry", value: "yes" }, { key: "elevator", value: "yes" }]),
  testNote("b1", "Bakery", [{ key: "step-free-entry", value: "no" }, { key: "elevator", value: "yes" }], "2 Main St"),
  testNote("c1", "Cafe", [{ key: "step-free-entry", value: "yes" }], "3 Main St"),
  testNote("d1", "Deli", [{ key: "step-free-entry", value: "yes" }, { key: "elevator", value: "no" }], "4 Main St"),
  testNote("d2", "Deli", [{ key: "elevator", value: "yes" }], "4 Main St"),
];

const places = (): Place[] => groupPlaces(NOTES(), "en");
const NEEDS: Requirement = { "step-free-entry": "yes", elevator: "yes" };
const byName = (name: string): Place => {
  const p = places().find((x) => x.name === name);
  if (!p) throw new Error(name);
  return p;
};

describe("choices", () => {
  it("knows the three choices and nothing else", () => {
    for (const c of NEED_CHOICES) expect(isNeedChoice(c)).toBe(true);
    for (const v of [undefined, "", "maybe", "Yes", "unknown"]) expect(isNeedChoice(v), String(v)).toBe(false);
  });

  it("reads the current choice for each detail", () => {
    expect(FACT_KEYS.map((k) => choiceOf(NEEDS, k))).toEqual(["yes", "none", "none", "yes"]);
    expect(choiceOf({ elevator: "no" }, "elevator")).toBe("no");
  });

  it("sets and removes one detail without touching the others or the input", () => {
    const before = JSON.stringify(NEEDS);
    expect(setNeed(NEEDS, "automatic-door", "no")).toEqual({ "step-free-entry": "yes", "automatic-door": "no", elevator: "yes" });
    expect(setNeed(NEEDS, "elevator", "none")).toEqual({ "step-free-entry": "yes" });
    expect(setNeed(NEEDS, "elevator", "no")).toEqual({ "step-free-entry": "yes", elevator: "no" });
    expect(setNeed({}, "elevator", "none")).toEqual({});
    expect(JSON.stringify(NEEDS)).toBe(before);
  });

  it("writes the must-haves in the App's detail order", () => {
    expect(needsLines({ elevator: "no", "step-free-entry": "yes" }, "en")).toEqual(["Step-free entrance: Yes", "Elevator: No"]);
    expect(needsLines({ elevator: "no" }, "fr")).toEqual(["Ascenseur\u00A0: Non"]);
    expect(needsLines({}, "en")).toEqual([]);
  });
});

describe("standing", () => {
  it("puts a place in the first group that applies", () => {
    expect(standOf(byName("Library"), NEEDS)).toBe("allMatch");
    expect(standOf(byName("Bakery"), NEEDS)).toBe("notMet");
    expect(standOf(byName("Cafe"), NEEDS)).toBe("open");
    // Deli has reports that differ on the elevator: something to ask about, not a No.
    expect(standOf(byName("Deli"), NEEDS)).toBe("open");
  });

  it("says nothing about a place when no must-have is saved", () => {
    expect(standOf(byName("Library"), {})).toBeUndefined();
    const s = needsStanding(places(), {});
    expect(STAND_GROUPS.map((g) => s.groups[g].length)).toEqual([0, 0, 0]);
  });

  it("lists the groups by name", () => {
    const s = needsStanding(places(), NEEDS);
    expect(s.groups.allMatch.map((p) => p.name)).toEqual(["Library"]);
    expect(s.groups.open.map((p) => p.name)).toEqual(["Cafe", "Deli"]);
    expect(s.groups.notMet.map((p) => p.name)).toEqual(["Bakery"]);
    expect(s.places).toBe(4);
  });

  it("puts every place in exactly one group on random notes", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const rng = makeRng(seed);
      const list = groupPlaces(randomNotes(rng, 12), "en");
      let needs: Requirement = {};
      for (const k of FACT_KEYS) needs = setNeed(needs, k, NEED_CHOICES[Math.floor(rng() * 3)] ?? "none");
      const s = needsStanding(list, needs);
      const ids = STAND_GROUPS.flatMap((g) => s.groups[g].map((p) => p.id));
      expect(new Set(ids).size, String(seed)).toBe(ids.length);
      expect(ids.length, String(seed)).toBe(Object.keys(needs).length === 0 ? 0 : list.length);
      for (const g of STAND_GROUPS) for (const p of s.groups[g]) expect(standOf(p, needs), String(seed)).toBe(g);
    }
  });

  it("names the groups in both languages", () => {
    expect(STAND_GROUPS.map((g) => standLabel(g, "en"))).toEqual(["Every must-have matches", "Some must-haves to ask about", "A must-have does not match"]);
    for (const g of STAND_GROUPS) expect(standLabel(g, "fr")).not.toBe(standLabel(g, "en"));
  });
});

describe("needsToText", () => {
  it("writes the must-haves and the three groups with their places", () => {
    const text = needsToText(places(), NEEDS, "en", TODAY);
    expect(text.startsWith("My must-haves\n=============\n\n")).toBe(true);
    expect(text).toContain("Your must-haves:\n- Step-free entrance: Yes\n- Elevator: Yes\n");
    expect(text).toContain("Every must-have matches (1)\n---------------------------\n- Library, 1 Main St\n");
    expect(text).toContain("- Cafe, 3 Main St\n- Deli, 4 Main St\n");
    expect(text).toContain("A must-have does not match (1)\n");
    expect(text.endsWith("Made on 2026-11-19.\n")).toBe(true);
  });

  it("says when no must-have is saved, and when there are no places", () => {
    const none = needsToText(places(), {}, "en", TODAY);
    expect(none).toContain(COPY.mustHaves.none.en);
    expect(none).not.toContain("Every must-have matches");
    expect(needsToText([], NEEDS, "en", TODAY)).toContain(COPY.mustHaves.noPlaces.en);
  });

  it("keeps French typography, never says inconnu and never ranks", () => {
    const fr = needsToText(places(), NEEDS, "fr", TODAY);
    expect(fr).toContain("Vos incontournables\u00A0:\n- Entrée sans marche\u00A0: Oui\n");
    expect(fr).not.toMatch(/[^\u00A0\u202F](?=[:;?!])/u);
    expect(fr).not.toMatch(/\binconnu/i);
    for (const l of ["en", "fr"] as const) {
      const text = needsToText(places(), NEEDS, l, TODAY);
      expect(findBanned(text), l).toBeUndefined();
      expect(text, l).not.toMatch(/\b(best|worst|score|ranked|meilleur|pire|classement|diagnos|eligib|admissib)/i);
    }
  });

  it("names the file by date and language", () => {
    expect(needsFilename(TODAY, "en")).toBe("my-must-haves-2026-11-19-en.txt");
    expect(needsFilename(TODAY, "fr")).toBe("mes-incontournables-2026-11-19-fr.txt");
  });
});
