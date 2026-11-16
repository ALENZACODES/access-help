import { describe, expect, it } from "vitest";
import {
  MAX_SHORTLIST,
  SHORTLIST_KEY,
  emptyForm,
  groupPlaces,
  loadShortlist,
  memoryStore,
  onlyShortlisted,
  parseShortlist,
  pruneShortlist,
  saveShortlist,
  toNote,
  toggleShortlist,
} from "./index";

const TODAY = new Date(Date.UTC(2026, 10, 15));
const note = (id: string, name: string) =>
  toNote({ ...emptyForm(TODAY), placeName: name, licence: "CC0-1.0", details: { ...emptyForm(TODAY).details, elevator: "yes" } }, TODAY, () => id);

describe("shortlist storage", () => {
  it("keeps only well-formed, unique ids", () => {
    expect(parseShortlist('["a-1","a-1","B","a b",5,null,"x-2"]')).toEqual(["a-1", "x-2"]);
  });

  it("caps the list", () => {
    const many = Array.from({ length: MAX_SHORTLIST + 5 }, (_, i) => `p-${i}`);
    expect(parseShortlist(JSON.stringify(many))).toHaveLength(MAX_SHORTLIST);
  });

  it("returns nothing for missing or broken data", () => {
    for (const raw of [null, undefined, "", "{", "{}", "5", '"x"']) expect(parseShortlist(raw), String(raw)).toEqual([]);
  });

  it("round-trips and removes the key when empty", () => {
    const s = memoryStore();
    expect(saveShortlist(s, ["a-1", "b-2"])).toBe("saved");
    expect(loadShortlist(s)).toEqual(["a-1", "b-2"]);
    saveShortlist(s, []);
    expect(s.getItem(SHORTLIST_KEY)).toBeNull();
  });

  it("reports unavailable storage without throwing", () => {
    const broken = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); }, removeItem: () => { throw new Error("x"); } };
    expect(saveShortlist(broken, ["a-1"])).toBe("unavailable");
    expect(saveShortlist(undefined, [])).toBe("unavailable");
    expect(loadShortlist(broken)).toEqual([]);
  });
});

describe("toggle and prune", () => {
  it("adds, removes, refuses a full list and refuses bad ids", () => {
    expect(toggleShortlist([], "a-1")).toEqual({ list: ["a-1"], result: "added" });
    expect(toggleShortlist(["a-1"], "a-1")).toEqual({ list: [], result: "removed" });
    const full = Array.from({ length: MAX_SHORTLIST }, (_, i) => `p-${i}`);
    expect(toggleShortlist(full, "new-1").result).toBe("full");
    expect(toggleShortlist(full, "new-1").list).toEqual(full);
    expect(toggleShortlist(full, "p-3").result).toBe("removed");
    expect(toggleShortlist(["a-1"], "Bad Id").result).toBe("invalid");
  });

  it("drops ids with no place and filters places to the shortlist", () => {
    const places = groupPlaces([note("a", "Archive"), note("b", "Bakery")], "en");
    const [first, second] = places;
    expect(pruneShortlist([first!.id, "gone-00000000"], places)).toEqual([first!.id]);
    expect(onlyShortlisted(places, [second!.id]).map((p) => p.name)).toEqual(["Bakery"]);
    expect(onlyShortlisted(places, [])).toEqual([]);
  });
});
