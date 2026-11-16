import { describe, expect, it } from "vitest";
import { FACT_KEYS, MAX_COMPARE, buildPlan, compareRows, plannedQuestions, SORT_KEYS, sortPlaces, pruneShortlist, toggleCompare, toggleShortlist, MAX_SHORTLIST, evaluate, groupNotes, groupPlaces, groupPlacesByVerdict, reportCount } from "./index";
import { makeRng, randomNotes, randomRequirement } from "./testkit";

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);

describe("invariants over random data", () => {
  it("every note lands in exactly one place", () => {
    for (const seed of SEEDS) {
      const rng = makeRng(seed);
      const notes = randomNotes(rng, 1 + Math.floor(rng() * 25));
      const places = groupPlaces(notes, "en");
      expect(places.flatMap((p) => p.notes.map((n) => n.id)).sort(), `seed ${seed}`).toEqual(notes.map((n) => n.id).sort());
    }
  });

  it("reports are never lost or invented when combined", () => {
    for (const seed of SEEDS) {
      const rng = makeRng(seed);
      const places = groupPlaces(randomNotes(rng, 20), "fr");
      for (const p of places) {
        for (const k of FACT_KEYS) {
          const expected = p.notes.filter((n) => n.facts.some((f) => f.key === k && f.value !== "unknown" && f.provenance)).length;
          expect(reportCount(p.resolutions[k]), `seed ${seed} ${p.name} ${k}`).toBe(expected);
        }
      }
    }
  });

  it("unknown is never a match when something is required, and every place is in exactly one group", () => {
    for (const seed of SEEDS) {
      const rng = makeRng(seed);
      const places = groupPlaces(randomNotes(rng, 20), "en");
      const req = randomRequirement(rng);
      const g = groupPlacesByVerdict(places, req, "");
      expect(g.matches.length + g.unknown.length + g.excluded.length, `seed ${seed}`).toBe(places.length);
      for (const p of g.matches) {
        for (const [k, want] of Object.entries(req)) {
          const r = p.resolutions[k as keyof typeof p.resolutions];
          expect(r.kind === "agree" && r.value === want, `seed ${seed} ${p.name} ${k}`).toBe(true);
        }
      }
      for (const p of g.excluded) {
        const hit = Object.entries(req).some(([k, want]) => {
          const r = p.resolutions[k as keyof typeof p.resolutions];
          return r.kind === "agree" && r.value !== want;
        });
        expect(hit, `seed ${seed} ${p.name}`).toBe(true);
      }
    }
  });

  it("a plan never calls an unknown or differing detail met", () => {
    for (const seed of SEEDS) {
      const rng = makeRng(seed);
      const places = groupPlaces(randomNotes(rng, 15), "en");
      const req = randomRequirement(rng);
      for (const p of places) {
        for (const i of buildPlan(p, req).items) {
          const r = p.resolutions[i.key];
          if (r.kind !== "agree") expect(i.status).not.toBe("matches");
          if (r.kind === "unknown") expect(i.status).toBe("unknown");
          if (r.kind === "differ") expect(i.status).toBe("differ");
        }
      }
    }
  });

  it("note-level filtering keeps the same three-bucket guarantee", () => {
    for (const seed of SEEDS) {
      const rng = makeRng(seed);
      const notes = randomNotes(rng, 20);
      const req = randomRequirement(rng);
      const g = groupNotes(notes, req, "", "en");
      expect(g.matches.length + g.unknown.length + g.excluded.length).toBe(notes.length);
      for (const n of g.matches) expect(evaluate(n, req)).toBe("match");
    }
  });
});

describe("invariants for sort, compare, shortlist and questions", () => {
  const TODAY = new Date(Date.UTC(2027, 5, 1));

  it("every sort order is a permutation of the places and is repeatable", () => {
    for (const seed of SEEDS) {
      const rng = makeRng(seed);
      const places = groupPlaces(randomNotes(rng, 1 + Math.floor(rng() * 20)), "en");
      for (const k of SORT_KEYS) {
        const a = sortPlaces(places, k, "en").map((p) => p.id);
        expect(a.slice().sort(), `seed ${seed} ${k}`).toEqual(places.map((p) => p.id).sort());
        expect(sortPlaces([...places].reverse(), k, "en").map((p) => p.id), `seed ${seed} ${k} order independent`).toEqual(a);
      }
    }
  });

  it("a comparison has one cell per place per row and copies each place's own resolution", () => {
    for (const seed of SEEDS) {
      const rng = makeRng(seed);
      const places = groupPlaces(randomNotes(rng, 10), "fr").slice(0, 3);
      const req = randomRequirement(rng);
      for (const row of compareRows(places, req)) {
        expect(row.cells.length, `seed ${seed}`).toBe(places.length);
        row.cells.forEach((c, i) => {
          expect(c.placeId).toBe(places[i]?.id);
          expect(c.resolution).toBe(places[i]?.resolutions[row.key]);
          if (c.resolution.kind !== "agree") expect(c.status === "matches" || c.status === "not-met", `seed ${seed}`).toBe(false);
        });
      }
    }
  });

  it("selection lists never go over their limits and never hold repeats", () => {
    for (const seed of SEEDS) {
      const rng = makeRng(seed);
      let compare: string[] = [];
      let short: string[] = [];
      for (let i = 0; i < 80; i++) {
        const id = `p-${Math.floor(rng() * 30)}`;
        compare = toggleCompare(compare, id).ids;
        short = toggleShortlist(short, id).list;
        expect(compare.length).toBeLessThanOrEqual(MAX_COMPARE);
        expect(short.length).toBeLessThanOrEqual(MAX_SHORTLIST);
        expect(new Set(compare).size).toBe(compare.length);
        expect(new Set(short).size).toBe(short.length);
      }
      expect(pruneShortlist(short, [])).toEqual([]);
    }
  });

  it("questions are asked for every unknown or differing item and never for a clean recent one", () => {
    for (const seed of SEEDS) {
      const rng = makeRng(seed);
      const places = groupPlaces(randomNotes(rng, 12), "en");
      const req = randomRequirement(rng);
      for (const p of places) {
        const plan = buildPlan(p, req);
        const qs = plannedQuestions(plan, "en", TODAY);
        for (const i of plan.items) {
          const mine = qs.filter((q) => q.key === i.key);
          if (i.status === "unknown" || i.status === "differ") expect(mine.map((q) => q.reason), `seed ${seed} ${i.key}`).toEqual([i.status]);
          else expect(mine.every((q) => q.reason === "old"), `seed ${seed} ${i.key}`).toBe(true);
        }
      }
    }
  });
});
