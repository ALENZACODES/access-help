import { describe, expect, it } from "vitest";
import { NEEDS_KEY, hasNeeds, loadNeeds, memoryStore, parseNeeds, saveNeeds } from "./index";

describe("must-haves", () => {
  it("round-trips valid requirements", () => {
    const s = memoryStore();
    expect(saveNeeds(s, { "step-free-entry": "yes", elevator: "no" })).toBe("saved");
    expect(loadNeeds(s)).toEqual({ "step-free-entry": "yes", elevator: "no" });
  });

  it("keeps only known details with yes or no", () => {
    expect(parseNeeds('{"elevator":"yes","bogus":"yes","automatic-door":"maybe","step-free-entry":1}')).toEqual({ elevator: "yes" });
  });

  it("returns nothing for missing, corrupt or wrong-shaped data", () => {
    expect(parseNeeds(null)).toEqual({});
    expect(parseNeeds("nope")).toEqual({});
    expect(parseNeeds("[1]")).toEqual({});
    expect(parseNeeds("5")).toEqual({});
  });

  it("removes the stored value when saving an empty set", () => {
    const s = memoryStore();
    saveNeeds(s, { elevator: "yes" });
    expect(s.getItem(NEEDS_KEY)).not.toBeNull();
    saveNeeds(s, {});
    expect(s.getItem(NEEDS_KEY)).toBeNull();
  });

  it("reports unavailable storage without throwing", () => {
    const broken = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); }, removeItem: () => { throw new Error("x"); } };
    expect(saveNeeds(broken, { elevator: "yes" })).toBe("unavailable");
    expect(saveNeeds(undefined, {})).toBe("unavailable");
    expect(loadNeeds(broken)).toEqual({});
  });

  it("detects whether any must-have is set", () => {
    expect(hasNeeds({})).toBe(false);
    expect(hasNeeds({ elevator: "no" })).toBe(true);
  });
});
