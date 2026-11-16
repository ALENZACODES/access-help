import { describe, expect, it } from "vitest";
import { FACT_KEYS, buildPlan, evaluate, groupNotes, groupPlaces, groupPlacesByVerdict, reportCount } from "./index";
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
