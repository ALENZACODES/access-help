import { describe, expect, it } from "vitest";
import { REAL, VALID, checkInvariants, mulberry32, randomPack, type Implementation } from "./unknown.js";

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);
const rules = (impl: Implementation) => [...new Set(checkInvariants(impl, SEEDS.slice(0, 60)).map((v) => v.rule))].sort();

describe("random packs", () => {
  it("are repeatable from a seed and differ between seeds", () => {
    const ids = ["p1", "p2", "p3", "p4", "p5", "p6"];
    const text = (seed: number) => JSON.stringify(randomPack(mulberry32(seed), "a", ids)?.pack.records);
    expect(text(7)).toBe(text(7));
    expect(text(7)).not.toBe(text(8));
  });
  it("include made-up statuses, so the rules are really tested", () => {
    const ids = Array.from({ length: 24 }, (_, i) => `p${i}`);
    const total = SEEDS.reduce((sum, seed) => sum + (randomPack(mulberry32(seed), "a", ids)?.garbage ?? 0), 0);
    expect(total).toBeGreaterThan(100);
  });
  it("only ever hold the four statuses once read", () => {
    const ids = Array.from({ length: 24 }, (_, i) => `p${i}`);
    for (const seed of SEEDS) for (const r of randomPack(mulberry32(seed), "a", ids)?.pack.records ?? []) expect(VALID).toContain(r.wheelchair);
  });
});

describe("unknown stays unknown: the App's own code", () => {
  it("breaks no rule over 200 random sets of packs", () => {
    const violations = checkInvariants(REAL, SEEDS);
    expect(violations.slice(0, 5), JSON.stringify(violations.slice(0, 5), null, 2)).toEqual([]);
  });
});

describe("unknown stays unknown: the checker fails on a broken copy", () => {
  it("notices a merge that picks one side when packs disagree", () => {
    const broken: Implementation = {
      ...REAL,
      mergePacks: (packs) => {
        const result = REAL.mergePacks(packs);
        return { ...result, places: result.places.map((p) => (p.conflict ? { ...p, record: { ...p.record, wheelchair: p.reports[0]!.record.wheelchair }, conflict: null } : p)) };
      },
    };
    expect(rules(broken)).toContain("merge.conflict-unknown");
  });
  it("notices a merge that promotes UNKNOWN to a status", () => {
    const broken: Implementation = {
      ...REAL,
      mergePacks: (packs) => {
        const result = REAL.mergePacks(packs);
        return { ...result, places: result.places.map((p) => (p.record.wheelchair === "UNKNOWN" && !p.conflict ? { ...p, record: { ...p.record, wheelchair: "yes" as const } } : p)) };
      },
    };
    expect(rules(broken)).toEqual(expect.arrayContaining(["merge.all-unknown"]));
  });
  it("notices a merge that lets UNKNOWN erase a recorded status", () => {
    const broken: Implementation = {
      ...REAL,
      mergePacks: (packs) => {
        const result = REAL.mergePacks(packs);
        return { ...result, places: result.places.map((p) => (p.reports.some((r) => r.record.wheelchair === "UNKNOWN") && !p.conflict ? { ...p, record: { ...p.record, wheelchair: "UNKNOWN" as const } } : p)) };
      },
    };
    expect(rules(broken)).toContain("merge.known-beats-unknown");
  });
  it("notices a search that counts UNKNOWN as a match", () => {
    const broken: Implementation = {
      ...REAL,
      searchPlaces: (records, query) => {
        const result = REAL.searchPlaces(records, query);
        return query.access === "any" ? result : { ...result, matches: [...result.matches, ...result.unknown], unknown: [] };
      },
    };
    expect(rules(broken)).toEqual(expect.arrayContaining(["search.unknown-not-a-match"]));
  });
  it("notices a search that hides UNKNOWN places instead of listing them", () => {
    const broken: Implementation = { ...REAL, searchPlaces: (records, query) => ({ ...REAL.searchPlaces(records, query), unknown: [] }) };
    expect(rules(broken)).toContain("search.unknown-listed");
  });
  it("notices a comparison that loses added places", () => {
    const broken: Implementation = { ...REAL, diffPacks: (a, b) => ({ ...REAL.diffPacks(a, b), added: [] }) };
    expect(rules(broken)).toContain("diff.newer-adds-up");
  });
  it("notices a comparison that judges a change", () => {
    const broken: Implementation = { ...REAL, diffPacks: (a, b) => ({ ...REAL.diffPacks(a, b), transitions: REAL.diffPacks(a, b).transitions.map((t) => ({ ...t, note: "improved" })) as never }) };
    expect(rules(broken)).toContain("diff.no-judgement");
  });
  it("notices a saved place that reads a status when no pack has it", () => {
    const broken: Implementation = { ...REAL, resolveSaved: (saved, places) => REAL.resolveSaved(saved, places).map((item) => (item.place === null ? { ...item, status: "yes" as const } : item)) };
    expect(rules(broken)).toContain("saved.not-in-packs-unknown");
  });
  it("notices a saved place that reads a different status from the packs", () => {
    const broken: Implementation = { ...REAL, resolveSaved: (saved, places) => REAL.resolveSaved(saved, places).map((item) => (item.place ? { ...item, status: "no" as const } : item)) };
    expect(rules(broken)).toContain("saved.matches-packs");
  });
});
