import { describe, expect, it } from "vitest";
import { focusAfter, groupPlaces, moveInShortlist, positionText, removeFromShortlist, shortlistRows, type Note } from "./index";
import { makeRng } from "./testkit";
import { testNote } from "./testnotes";

const L = ["a-11111111", "b-22222222", "c-33333333"];

describe("moveInShortlist", () => {
  it("swaps a place with its neighbour", () => {
    expect(moveInShortlist(L, "b-22222222", "up")).toEqual({ list: ["b-22222222", "a-11111111", "c-33333333"], result: "moved" });
    expect(moveInShortlist(L, "b-22222222", "down")).toEqual({ list: ["a-11111111", "c-33333333", "b-22222222"], result: "moved" });
  });

  it("does nothing at the edges or for an id that is not there", () => {
    expect(moveInShortlist(L, "a-11111111", "up")).toEqual({ list: L, result: "at-edge" });
    expect(moveInShortlist(L, "c-33333333", "down")).toEqual({ list: L, result: "at-edge" });
    expect(moveInShortlist(L, "z-99999999", "up")).toEqual({ list: L, result: "not-found" });
    expect(moveInShortlist([], "a-11111111", "down").result).toBe("not-found");
  });

  it("never changes the input, never loses or adds an id, and up then down is a no-op", () => {
    const rng = makeRng(7);
    let list = [...L, "d-44444444", "e-55555555"];
    for (let i = 0; i < 300; i++) {
      const id = list[Math.floor(rng() * list.length)] as string;
      const dir = rng() < 0.5 ? "up" : "down";
      const before = [...list];
      const r = moveInShortlist(list, id, dir);
      expect(list).toEqual(before);
      expect([...r.list].sort()).toEqual([...before].sort());
      if (r.result === "moved") expect(moveInShortlist(r.list, id, dir === "up" ? "down" : "up").list).toEqual(before);
      list = r.list;
    }
  });
});

describe("removeFromShortlist", () => {
  it("removes one id and says whether it was there", () => {
    expect(removeFromShortlist(L, "b-22222222")).toEqual({ list: ["a-11111111", "c-33333333"], removed: true });
    expect(removeFromShortlist(L, "z-99999999")).toEqual({ list: L, removed: false });
  });
});

describe("focusAfter", () => {
  it("stays on the same place when it is still there", () => {
    expect(focusAfter(L, ["b-22222222", "a-11111111", "c-33333333"], "a-11111111")).toBe("a-11111111");
  });

  it("goes to the place that took the removed one's spot, or the new last one", () => {
    expect(focusAfter(L, ["a-11111111", "c-33333333"], "b-22222222")).toBe("c-33333333");
    expect(focusAfter(L, ["a-11111111", "b-22222222"], "c-33333333")).toBe("b-22222222");
    expect(focusAfter(L, ["b-22222222", "c-33333333"], "a-11111111")).toBe("b-22222222");
  });

  it("gives nothing when the list is empty or the id was never there", () => {
    expect(focusAfter(["a-11111111"], [], "a-11111111")).toBeUndefined();
    expect(focusAfter(L, ["a-11111111"], "z-99999999")).toBeUndefined();
  });
});

describe("focusAfter on random removals", () => {
  it("always lands on an id still in the list, or nothing only when the list is empty", () => {
    const rng = makeRng(11);
    for (let round = 0; round < 200; round++) {
      const before = Array.from({ length: 1 + Math.floor(rng() * 6) }, (_, i) => `p${i}-0000000${i}`);
      const id = before[Math.floor(rng() * before.length)] as string;
      const after = removeFromShortlist(before, id).list;
      const next = focusAfter(before, after, id);
      if (after.length === 0) expect(next).toBeUndefined();
      else expect(after).toContain(next);
    }
  });
});

describe("shortlistRows", () => {
  const notes: Note[] = [testNote("l1", "Library", []), testNote("c1", "Cafe", [], "3 Main St")];
  const places = groupPlaces(notes, "en");
  const lib = places.find((p) => p.name === "Library")?.id ?? "";
  const cafe = places.find((p) => p.name === "Cafe")?.id ?? "";

  it("keeps the person's order and numbers the rows from 1", () => {
    expect(shortlistRows([cafe, lib], places).map((r) => [r.place.name, r.position])).toEqual([
      ["Cafe", 1],
      ["Library", 2],
    ]);
  });

  it("skips ids with no place and bad ids, so positions count shown rows", () => {
    expect(shortlistRows(["gone-0a1b2c3d", lib, "Not An Id", cafe], places).map((r) => [r.id, r.position])).toEqual([
      [lib, 1],
      [cafe, 2],
    ]);
  });
});

describe("positionText", () => {
  it("says a position in both languages", () => {
    expect(positionText(2, 5, "en")).toBe("2 of 5");
    expect(positionText(2, 5, "fr")).toBe("2 sur 5");
  });
});
