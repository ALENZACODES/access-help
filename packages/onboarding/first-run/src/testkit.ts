/** Seeded random data for property-style tests. Not part of the package API. */
import { FACT_KEYS, OPEN_LICENCES, type FactKey, type Tri } from "./facts";
import type { Requirement } from "./filter";
import { parseNote, type Note } from "./model";

export type Rng = () => number;

/** mulberry32: small, fast, repeatable. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: Rng, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)] as T;
}

const NAMES = ["Archive", "archive", "Éclair Café", "Eclair Cafe", "Bakery", "Cinema", "Town Hall", "Library"];
const ADDRESSES = [undefined, "1 Main St", "1 main st.", "2 Side Rd", "  "];
const SOURCES = ["Contributor report", "Example survey", "City open data"];

function isoDay(rng: Rng): string {
  const day = 1 + Math.floor(rng() * 28);
  const month = 1 + Math.floor(rng() * 12);
  return `${2025 + Math.floor(rng() * 2)}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function randomNote(rng: Rng, i: number): Note {
  const licence = pick(rng, OPEN_LICENCES);
  const facts = FACT_KEYS.map((key) => {
    const value: Tri = pick(rng, ["yes", "no", "unknown", "unknown"] as const);
    return value === "unknown"
      ? { key, value }
      : { key, value, provenance: { source: pick(rng, SOURCES), licence, recordedOn: isoDay(rng) } };
  });
  const note = parseNote({
    id: `n${i}`,
    placeName: pick(rng, NAMES),
    address: pick(rng, ADDRESSES),
    createdOn: isoDay(rng),
    licence,
    facts,
  });
  if (!note) throw new Error("testkit produced an invalid note");
  return note;
}

export function randomNotes(rng: Rng, n: number): Note[] {
  return Array.from({ length: n }, (_, i) => randomNote(rng, i));
}

export function randomRequirement(rng: Rng): Requirement {
  const out: Partial<Record<FactKey, "yes" | "no">> = {};
  for (const k of FACT_KEYS) {
    const r = rng();
    if (r < 0.3) out[k] = "yes";
    else if (r < 0.4) out[k] = "no";
  }
  return out;
}
