import { describe, expect, it } from "vitest";
import { importNotes, mergeNotes, type Note } from "./index";
import { filterNotes, pick, placesCount, sharedNotes, shareText } from "./share";
import { makeRng, randomNotes } from "./testkit";

const TODAY = new Date(Date.UTC(2026, 10, 20));

describe("random shares", () => {
  it("give the other person exactly the picked notes, with no extra text unless asked", () => {
    for (let seed = 1; seed <= 150; seed++) {
      const rng = makeRng(seed);
      const notes: Note[] = randomNotes(rng, 12).map((n, i) => (rng() < 0.5 ? { ...n, note: `private text ${i}` } : n));
      const picked = pick([], notes.filter(() => rng() < 0.4).map((n) => n.id), true, notes);
      const withText = rng() < 0.5;
      const text = shareText(notes, picked, withText, TODAY);
      const r = importNotes(text);
      expect(r.error, `seed ${seed}`).toBeUndefined();
      expect(r.notes.map((n) => n.id), `seed ${seed}`).toEqual(picked);
      expect(r.notes, `seed ${seed}`).toEqual(sharedNotes(notes, picked, withText));
      if (!withText) expect(text).not.toContain("private text");
      // Every Yes or No keeps its source, licence and date.
      for (const n of r.notes) for (const f of n.facts) if (f.value !== "unknown") expect(f.provenance, `seed ${seed}`).toBeDefined();
      // The other person merging it twice gains nothing the second time.
      const once = mergeNotes([], r.notes);
      expect(mergeNotes(once.notes, r.notes).added).toBe(0);
      expect(placesCount(notes, picked)).toBeLessThanOrEqual(picked.length);
    }
  });

  it("filter to a subset of the notes, in their order", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const rng = makeRng(seed * 3);
      const notes = randomNotes(rng, 10);
      const q = (notes[Math.floor(rng() * notes.length)]?.placeName ?? "").slice(0, 3);
      const shown = filterNotes(notes, q);
      expect(shown.every((n) => notes.includes(n))).toBe(true);
      expect(shown.map((n) => notes.indexOf(n))).toEqual([...shown.map((n) => notes.indexOf(n))].sort((a, b) => a - b));
      if (notes.length > 0 && q !== "") expect(shown.length).toBeGreaterThan(0);
    }
  });
});
