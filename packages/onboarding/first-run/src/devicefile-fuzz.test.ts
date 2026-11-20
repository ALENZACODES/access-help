import { describe, expect, it } from "vitest";
import { CONTRIBUTOR_SOURCE, FACT_KEYS, LIMITS, type Note } from "./index";
import { markReplied, recordAsk, type AskRecord } from "./asked";
import { addToBin, type BinEntry } from "./bin";
import { PARTS, exportDevice, importDevice, mergeDevice, partCount, type DeviceData, type Part } from "./devicefile";
import { logCorrection, type Correction } from "./noteedit";
import { emptyPassport } from "./passport";
import { makeRng, randomNotes, type Rng } from "./testkit";
import { sortVisits, type Visit } from "./visits";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const pick = <T>(rng: Rng, list: readonly T[]): T => list[Math.floor(rng() * list.length)] as T;

/** A random device: notes from a shared pool of ids so two devices overlap, plus the other parts. */
function randomDevice(rng: Rng, pool: readonly Note[]): DeviceData {
  const notes = pool.filter(() => rng() < 0.5).map((n) => (rng() < 0.2 ? { ...n, placeName: `${n.placeName} (edited)` } : n));
  let asked: AskRecord[] = [];
  for (const n of pool.filter(() => rng() < 0.3)) {
    const day = new Date(Date.UTC(2026, 10, 1 + Math.floor(rng() * 19)));
    const r = recordAsk(asked, { id: `${n.id.toLowerCase()}-00000000`.replace(/[^a-z0-9-]/g, "x"), name: n.placeName, address: undefined }, ["elevator"], "email", day);
    if (r !== "full") asked = rng() < 0.3 ? markReplied(r, r[0]?.id ?? "", TODAY) : r;
  }
  let corrections: Correction[] = [];
  for (const n of notes.filter(() => rng() < 0.3)) corrections = logCorrection(corrections, n.id, [{ part: pick(rng, FACT_KEYS), from: "yes", to: "no" }], new Date(Date.UTC(2026, 10, 1 + Math.floor(rng() * 19))));
  let bin: BinEntry[] = [];
  for (const n of pool.filter((x) => !notes.some((m) => m.id === x.id) && rng() < 0.3)) bin = addToBin(bin, n, TODAY);
  return {
    notes,
    lists: { needs: rng() < 0.5 ? { elevator: "yes" } : {}, shortlist: rng() < 0.5 ? ["library-1a2b3c4d"] : [], checklist: {} },
    asked,
    corrections,
    bin,
    survey: undefined,
    // Visit ids come from a small shared set, so two devices hold some of the same visits, sometimes in two versions.
    visits: sortVisits(
      Array.from({ length: 12 }, (_, i): Visit => ({
        id: `v-${i}`,
        placeId: `place-${i % 5}`,
        placeName: `Place ${i % 5}`,
        address: undefined,
        visitedOn: `2026-11-${String(1 + (i % 19)).padStart(2, "0")}`,
        found: rng() < 0.5 ? { elevator: "yes" } : { elevator: "no" },
        words: rng() < 0.3 ? "Busy" : "",
        writtenOn: "2026-11-19",
      })).filter(() => rng() < 0.4),
    ),
    passport: rng() < 0.5 ? { ...emptyPassport(TODAY), device: "walker", helps: rng() < 0.5 ? "Slow doors" : "" } : undefined,
  };
}

function pool(rng: Rng): Note[] {
  return randomNotes(rng, 30).map((n) => ({ ...n, facts: n.facts.map((f) => (f.provenance ? { ...f, provenance: { ...f.provenance, source: CONTRIBUTOR_SOURCE } } : f)) }));
}

describe("random devices", () => {
  it("write a file that reads back the same", () => {
    for (let seed = 1; seed <= 80; seed++) {
      const rng = makeRng(seed);
      const d = randomDevice(rng, pool(rng));
      const r = importDevice(exportDevice(d, "2026-11-20"), TODAY);
      if (r.error) throw new Error(`seed ${seed}: ${r.error}`);
      expect(r.data, `seed ${seed}`).toEqual(d);
    }
  });

  it("never lose anything on this device, and add nothing the second time", () => {
    for (let seed = 1; seed <= 120; seed++) {
      const rng = makeRng(seed * 7);
      const p = pool(rng);
      const mine = randomDevice(rng, p);
      const theirs = randomDevice(rng, p);
      const chosen = new Set<Part>(PARTS.filter(() => rng() < 0.7));
      const { data, plans } = mergeDevice(mine, theirs, chosen);
      // Every note here stays, unchanged.
      for (const n of mine.notes) expect(data.notes.find((x) => x.id === n.id), `seed ${seed}`).toEqual(n);
      // Every question here stays (possibly as the newer record for the same place).
      for (const r of mine.asked) expect(data.asked.some((x) => x.id === r.id), `seed ${seed}`).toBe(true);
      // Notes never go past the limit, and each id appears once.
      expect(data.notes.length).toBeLessThanOrEqual(LIMITS.notes);
      expect(new Set(data.notes.map((n) => n.id)).size).toBe(data.notes.length);
      // Nothing is in both the notes and Recently removed because of the merge.
      for (const e of data.bin) if (!mine.bin.some((x) => x.note.id === e.note.id)) expect(data.notes.some((n) => n.id === e.note.id)).toBe(false);
      // Parts not chosen are exactly as they were.
      for (const part of PARTS.filter((x) => !chosen.has(x) && x !== "corrections")) expect(partCount(data, part), `seed ${seed} ${part}`).toBe(partCount(mine, part));
      // What a chosen part says it added is what it added.
      for (const pl of plans) if (chosen.has(pl.part) && pl.part !== "lists" && pl.part !== "corrections" && pl.part !== "asked") expect(partCount(data, pl.part) - partCount(mine, pl.part), `seed ${seed} ${pl.part}`).toBe(pl.add);
      // A second time adds nothing.
      const again = mergeDevice(data, theirs, chosen);
      expect(again.data, `seed ${seed}`).toEqual(data);
      for (const pl of again.plans) if (chosen.has(pl.part) && pl.part !== "survey") expect(pl.add, `seed ${seed} ${pl.part}`).toBe(0);
    }
  });
});

describe("damaged files", () => {
  it("never make the reader throw, and give only valid parts", () => {
    const rng = makeRng(99);
    const good = exportDevice(randomDevice(rng, pool(rng)), "2026-11-20");
    for (let n = 0; n < 300; n++) {
      const r2 = makeRng(n + 1);
      // Damage the file: cut it, swap characters, or change one value's type.
      const chars = [...good];
      const kind = n % 3;
      if (kind === 0) chars.length = Math.floor(r2() * chars.length);
      if (kind === 1) for (let i = 0; i < 5; i++) chars[Math.floor(r2() * chars.length)] = pick(r2, ["{", "}", "[", '"', ",", "1", "x"]);
      let text = chars.join("");
      if (kind === 2) {
        const o = JSON.parse(good) as Record<string, unknown>;
        const part = pick(r2, ["notes", "lists", "asked", "corrections", "bin", "survey"]);
        o[part] = pick(r2, [null, 3, "x", [], {}, [1, 2], { stops: 7 }]);
        text = JSON.stringify(o);
      }
      let r: ReturnType<typeof importDevice> | undefined;
      expect(() => {
        r = importDevice(text, TODAY);
      }, `damage ${n}`).not.toThrow();
      if (r && r.error === undefined) {
        // Whatever came through is itself a file that reads back the same.
        const again = importDevice(exportDevice(r.data, "2026-11-20"), TODAY);
        expect(again.error === undefined && again.data, `damage ${n}`).toEqual(r.data);
        expect(r.data.notes.length).toBeLessThanOrEqual(LIMITS.notes);
      }
    }
  });
});
