import { describe, expect, it } from "vitest";
import { ALL_LISTS, PLACES, validateLists, validatePlaces } from "../src";

const ids = new Set(PLACES.map((p) => p.id));

const listAt = (index: number) => {
  const list = ALL_LISTS[index];
  if (!list) throw new Error(`missing list ${index}`);
  return list;
};
const placeAt = (index: number) => {
  const place = PLACES[index];
  if (!place) throw new Error(`missing place ${index}`);
  return place;
};

describe("outing lists", () => {
  it("seed lists and fixtures are valid", () => {
    expect(validateLists(ALL_LISTS, PLACES)).toEqual([]);
    expect(validatePlaces(PLACES)).toEqual([]);
  });

  it("every list place id exists in the fixture set", () => {
    for (const l of ALL_LISTS) for (const id of l.placeIds) expect(ids.has(id)).toBe(true);
  });

  it("rejects a list with a place id that is not in the fixture set", () => {
    const bad = { ...listAt(0), placeIds: [...listAt(0).placeIds, "synth-missing-999"] };
    expect(validateLists([bad], PLACES).join("\n")).toContain("synth-missing-999");
  });

  it("rejects a list whose place does not have the fact as a known yes", () => {
    const bad = { ...listAt(1), placeIds: ["synth-park-001"] }; // change table UNKNOWN
    expect(validateLists([bad], PLACES).join("\n")).toContain("adultChangeTable");
    const no = { ...listAt(0), placeIds: ["synth-park-004"] }; // step-free is a known no
    expect(validateLists([no], PLACES)).not.toEqual([]);
  });

  it("rejects schema violations and duplicate place ids", () => {
    expect(validateLists([{ ...listAt(0), licence: "Proprietary" } as never], PLACES)).not.toEqual([]);
    expect(validateLists([{ ...listAt(0), placeIds: ["synth-park-001", "synth-park-001"] }], PLACES)).not.toEqual([]);
  });

  it("rejects fixtures that self-assign tier 2 or 3", () => {
    const p = structuredClone(placeAt(0));
    const fact = p.facts.stepFreeEntrance;
    if (!fact) throw new Error("missing step-free fact");
    fact.tier = 2;
    expect(validatePlaces([p]).join("\n")).toContain("tier 2 or 3");
  });

  it("the pack-pinned list is empty until real ids are pinned", () => {
    expect(ALL_LISTS.find((l) => l.id === "pack-pinned-placeholder")?.placeIds).toEqual([]);
  });
});
