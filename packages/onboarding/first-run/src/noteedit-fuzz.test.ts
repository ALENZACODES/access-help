import { describe, expect, it } from "vitest";
import { CONTRIBUTOR_SOURCE, FACT_KEYS, OPEN_LICENCES, parseNote, validateForm, type Note, type Tri } from "./index";
import { correctNote, correctionDetails, diffNotes, editable, formFromNote, logCorrection, parseCorrections, type NotePart } from "./noteedit";
import { makeRng, type Rng } from "./testkit";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));
const TRIS: readonly Tri[] = ["yes", "no", "unknown"];
const pick = <T>(rng: Rng, list: readonly T[]): T => list[Math.floor(rng() * list.length)] as T;

/** A random note the person made: one date and one licence, at least one Yes or No. */
function ownNote(rng: Rng, i: number): Note {
  const licence = pick(rng, OPEN_LICENCES);
  const on = `2026-${String(1 + Math.floor(rng() * 10)).padStart(2, "0")}-1${Math.floor(rng() * 9)}`;
  const records = FACT_KEYS.filter(() => rng() < 0.6).map((key) => ({ key, value: rng() < 0.5 ? ("yes" as const) : ("no" as const), source: CONTRIBUTOR_SOURCE, licence, on }));
  const first = records[0] ?? { key: "elevator" as const, value: "yes" as const, source: CONTRIBUTOR_SOURCE, licence, on };
  return testNote(`r${i}`, `Place ${i}`, records.length > 0 ? records : [first], rng() < 0.5 ? `${i} Main St` : null);
}

describe("random corrections", () => {
  it("open every own note in the form with values the form accepts", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const n = ownNote(makeRng(seed), seed);
      expect(editable(n), `seed ${seed}`).toBe("editable");
      const values = formFromNote(n);
      if (!values) throw new Error("not editable");
      expect(validateForm(values, TODAY), `seed ${seed}`).toEqual([]);
      // Saving the same values changes nothing.
      expect(diffNotes(n, correctNote(n, values, TODAY))).toEqual([]);
    }
  });

  it("log exactly what changed, and the log reads back the same", () => {
    let checked = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const rng = makeRng(seed * 13);
      const before = ownNote(rng, seed);
      const values = formFromNote(before);
      if (!values) throw new Error("not editable");
      const details = Object.fromEntries(FACT_KEYS.map((k) => [k, rng() < 0.3 ? pick(rng, TRIS) : values.details[k]])) as Record<(typeof FACT_KEYS)[number], Tri>;
      if (!FACT_KEYS.some((k) => details[k] !== "unknown")) details.elevator = "yes";
      const next = {
        ...values,
        details,
        placeName: rng() < 0.2 ? `${values.placeName} (main)` : values.placeName,
        address: rng() < 0.2 ? "" : values.address,
        note: rng() < 0.2 ? "Side door" : values.note,
      };
      const after = correctNote(before, next, TODAY);
      expect(after.id).toBe(before.id);
      expect(after.createdOn).toBe(before.createdOn);
      expect(parseNote(JSON.parse(JSON.stringify(after)))).toEqual(after);
      const changes = diffNotes(before, after);
      const expected: NotePart[] = [];
      if (next.placeName !== before.placeName) expected.push("placeName");
      if (next.address !== (before.address ?? "")) expected.push("address");
      for (const k of FACT_KEYS) if (details[k] !== (before.facts.find((f) => f.key === k)?.value ?? "unknown")) expected.push(k);
      if (next.note !== (before.note ?? "")) expected.push("note");
      // The note-level licence may differ from the details' (as in imported notes); only the details' counts.
      expect(changes.map((c) => c.part), `seed ${seed}`).toEqual(expected);
      const log = logCorrection([], before.id, changes, TODAY);
      expect(parseCorrections(JSON.stringify(log))).toEqual(log);
      if (log[0]) {
        expect(correctionDetails(log[0], "fr")).toHaveLength(changes.length);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(50);
  });
});
