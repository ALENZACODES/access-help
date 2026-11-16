import { describe, expect, it } from "vitest";
import {
  FACT_KEYS,
  MAX_SUGGESTIONS,
  editDistance,
  findSimilar,
  groupPlaces,
  hiddenCount,
  nameTolerance,
  pairKey,
  parseNote,
  similarReason,
  squash,
  withoutAddress,
  type Note,
  type Place,
} from "./index";
import { makeRng, pick } from "./testkit";

function note(id: string, name: string, address?: string): Note {
  const n = parseNote({ id, placeName: name, address, createdOn: "2026-10-01", licence: "CC0-1.0", facts: FACT_KEYS.map((key) => ({ key, value: "unknown" })) });
  if (!n) throw new Error(`bad note ${id}`);
  return n;
}

const places = (...notes: Note[]): Place[] => groupPlaces(notes, "en");
const one = (name: string, address?: string): Place => places(note("x", name, address))[0] as Place;

/** The textbook table, for checking the faster version against. */
function naive(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length]![b.length]!;
}

describe("editDistance", () => {
  it("counts single-letter changes", () => {
    expect(editDistance("", "")).toBe(0);
    expect(editDistance("cafe", "cafe")).toBe(0);
    expect(editDistance("cafe", "cafes")).toBe(1);
    expect(editDistance("cafe", "caf")).toBe(1);
    expect(editDistance("cafe", "cave")).toBe(1);
    expect(editDistance("kitten", "sitting")).toBe(3);
    expect(editDistance("", "abc")).toBe(3);
    expect(editDistance("abc", "")).toBe(3);
  });

  it("gives the same answer as the textbook table for random strings", () => {
    const rng = makeRng(7);
    const word = (): string => Array.from({ length: Math.floor(rng() * 9) }, () => pick(rng, ["a", "b", "c", "d"])).join("");
    for (let i = 0; i < 300; i++) {
      const [a, b] = [word(), word()];
      expect(editDistance(a, b), `${a}|${b}`).toBe(naive(a, b));
      expect(editDistance(a, b)).toBe(editDistance(b, a));
    }
  });

  it("stops early but never says a pair is closer than it is", () => {
    const rng = makeRng(11);
    const word = (): string => Array.from({ length: 2 + Math.floor(rng() * 8) }, () => pick(rng, ["a", "b", "c"])).join("");
    for (let i = 0; i < 300; i++) {
      const [a, b] = [word(), word()];
      const full = naive(a, b);
      for (const limit of [0, 1, 2, 3]) {
        const d = editDistance(a, b, limit);
        if (full <= limit) expect(d, `${a}|${b}|${limit}`).toBe(full);
        else expect(d, `${a}|${b}|${limit}`).toBeGreaterThan(limit);
      }
    }
  });

  it("is quick to say two very different lengths are far apart", () => {
    expect(editDistance("a", "abcdefghij", 2)).toBe(3);
  });
});

describe("squash and tolerance", () => {
  it("ignores case, accents and punctuation", () => {
    expect(squash("  Éclair  Café! ")).toBe("eclair cafe");
    expect(squash("St. Mary's")).toBe("st mary s");
    expect(squash(undefined)).toBe("");
    expect(squash("---")).toBe("");
  });

  it("allows one change in short names and two in long ones", () => {
    expect(nameTolerance("cafe")).toBe(1);
    expect(nameTolerance("1234567")).toBe(1);
    expect(nameTolerance("12345678")).toBe(2);
  });

  it("writes a pair the same way round whichever place is first", () => {
    expect(pairKey("b-2", "a-1")).toBe("a-1|b-2");
    expect(pairKey("a-1", "b-2")).toBe(pairKey("b-2", "a-1"));
  });
});

describe("similarReason", () => {
  const r = (a: Place, b: Place) => similarReason(a, b);

  it("sees the same address under another name", () => {
    expect(r(one("Corner Cafe", "1 Main St"), one("Main Street Cafe", "1 main st."))).toBe("same-address");
  });

  it("treats two different addresses as two places, even with the same name", () => {
    expect(r(one("Library", "1 Main St"), one("Library", "9 Side Rd"))).toBeUndefined();
    expect(r(one("Library", "1 Main St"), one("Libary", "9 Side Rd"))).toBeUndefined();
  });

  it("sees the same name when one place has no address", () => {
    expect(r(one("Library", "1 Main St"), one("library"))).toBe("same-name");
    expect(r(one("Library", "1 Main St"), one("LIBRARY!"))).toBe("same-name");
    // Two places with the same name and no address are one place, so there is nothing to suggest.
    expect(r(one("Library"), one("LIBRARY!"))).toBeUndefined();
  });

  it("sees names a letter or two apart when neither has an address", () => {
    expect(r(one("Library"), one("Libary"))).toBe("similar-name");
    expect(r(one("Town Hall Annex"), one("Town Hal Anex"))).toBe("similar-name");
    expect(r(one("Library", "1 Main St"), one("Libary"))).toBe("similar-name");
  });

  it("leaves short and clearly different names alone", () => {
    expect(r(one("Cafe"), one("Cafs"))).toBeUndefined();
    expect(r(one("Library"), one("Pharmacy"))).toBeUndefined();
    expect(r(one("Town Hall"), one("Town Hall Annex Building"))).toBeUndefined();
  });

  it("never pairs a place with itself", () => {
    const p = one("Library");
    expect(r(p, p)).toBeUndefined();
  });

  it("gives the same answer whichever place is first", () => {
    const rng = makeRng(3);
    const names = ["Library", "Libary", "Cafe Rio", "Cafe Rio!", "Town Hall", "Town Hal"];
    const adds = [undefined, "1 Main St", "9 Side Rd"];
    for (let i = 0; i < 100; i++) {
      const [a, b] = [one(pick(rng, names), pick(rng, adds)), places(note("y", pick(rng, names), pick(rng, adds)))[0] as Place];
      expect(r(a, b) === undefined, `${a.name}|${b.name}`).toBe(r(b, a) === undefined);
    }
  });
});

describe("findSimilar", () => {
  const set = places(
    note("a", "Library", "1 Main St"),
    note("b", "Libary"),
    note("c", "Corner Cafe", "5 High St"),
    note("d", "High Street Cafe", "5 high st"),
    note("e", "Bakery"),
    note("f", "bakery!", "2 Side Rd"),
    note("g", "Pharmacy", "3 Low St"),
  );

  it("lists same address first, then same name, then similar names", () => {
    expect(findSimilar(set).map((s) => s.reason)).toEqual(["same-address", "same-name", "similar-name"]);
  });

  it("names both places and a key that matches them", () => {
    for (const s of findSimilar(set)) expect(s.key).toBe(pairKey(s.a.id, s.b.id));
  });

  it("suggests each pair once", () => {
    const keys = findSimilar(set).map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("hides pairs that were marked as different places", () => {
    const first = findSimilar(set)[0]!;
    const rest = findSimilar(set, new Set([first.key]));
    expect(rest.map((s) => s.key)).not.toContain(first.key);
    expect(rest).toHaveLength(findSimilar(set).length - 1);
    expect(hiddenCount(set, new Set([first.key]))).toBe(1);
  });

  it("does not count a hidden pair that is no longer similar", () => {
    expect(hiddenCount(set, new Set([pairKey(set[0]!.id, set[6]!.id)]))).toBe(0);
    expect(hiddenCount(set, new Set())).toBe(0);
  });

  it("gives the same list whatever order the places are in", () => {
    const rng = makeRng(5);
    for (let i = 0; i < 20; i++) {
      const shuffled = [...set].sort(() => rng() - 0.5);
      expect(findSimilar(shuffled).map((s) => s.key)).toEqual(findSimilar(set).map((s) => s.key));
    }
  });

  it("finds nothing among no places or one", () => {
    expect(findSimilar([])).toEqual([]);
    expect(findSimilar(set.slice(0, 1))).toEqual([]);
  });

  it("shows at most the limit, however many pairs there are", () => {
    const names = Array.from({ length: 30 }, (_, i) => `Library ${String.fromCharCode(97 + (i % 26))}${i >= 26 ? "x" : ""}`);
    const many = places(...names.map((n, i) => note(`n${i}`, n)));
    const similar = findSimilar(many);
    // 30 near-identical names make hundreds of pairs; only the limit is shown.
    expect(similar).toHaveLength(MAX_SUGGESTIONS);
  });

  it("does not change the places", () => {
    const before = JSON.stringify(set);
    findSimilar(set);
    expect(JSON.stringify(set)).toBe(before);
  });
});

describe("withoutAddress", () => {
  it("lists places whose address is missing or only punctuation", () => {
    const list = withoutAddress(places(note("a", "A", "1 Main St"), note("b", "B"), note("c", "C", "  "), note("d", "D", "...")));
    expect(list.map((p) => p.name)).toEqual(["B", "C", "D"]);
  });
});
