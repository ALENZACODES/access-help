/**
 * "Unknown stays Unknown" audit. CI- and test-only.
 *
 * It builds many random packs, with made-up statuses mixed in, and runs the App's own pack
 * reading, merging, searching, comparing, and saved-place code over them. Each rule below is
 * something the App promises: UNKNOWN is never promoted to a status, a status is never invented,
 * and a positive filter never counts UNKNOWN as a match. The checker returns every rule that was
 * broken. A test runs it on the real code, and on deliberately broken copies to prove it notices.
 */
import { diffPacks } from "../../../apps/centre/src/places/diff.js";
import { searchPlaces, type AccessFilter } from "../../../apps/centre/src/places/filter.js";
import { parsePack } from "../../../apps/centre/src/places/pack.js";
import { mergePacks } from "../../../apps/centre/src/places/packs.js";
import { resolveSaved } from "../../../apps/centre/src/places/saved.js";
import type { ParsedPack } from "../../../apps/centre/src/places/types.js";

export interface Implementation {
  mergePacks: typeof mergePacks;
  searchPlaces: typeof searchPlaces;
  diffPacks: typeof diffPacks;
  resolveSaved: typeof resolveSaved;
}

export const REAL: Implementation = { mergePacks, searchPlaces, diffPacks, resolveSaved };

export interface Violation {
  rule: string;
  detail: string;
}

export const VALID = ["yes", "limited", "no", "UNKNOWN"] as const;
const GARBAGE = ["definitely", "Yes", "true", "fully accessible", "", "N/A", "partial", "wheelchair=yes"];

/** A small, repeatable random number generator, so a failure can be reproduced from its seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(rand: () => number, list: readonly T[]): T => list[Math.floor(rand() * list.length)]!;

export interface RandomPack {
  pack: ParsedPack;
  /** How many places were written with a status the App does not recognise. */
  garbage: number;
}

export function randomPack(rand: () => number, packId: string, ids: readonly string[]): RandomPack | null {
  const chosen = ids.filter(() => rand() < 0.7);
  if (chosen.length === 0) return null;
  let garbage = 0;
  const features = chosen.map((id) => {
    const roll = rand();
    let wheelchair: string | undefined;
    if (roll < 0.15) {
      wheelchair = pick(rand, GARBAGE);
      if (wheelchair !== "") garbage += 1;
      else wheelchair = undefined;
    } else if (roll < 0.25) {
      wheelchair = undefined;
    } else {
      wheelchair = pick(rand, VALID);
    }
    const n = Number(id.slice(1));
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-79.4 + (n % 10) * 0.01, 43.6 + Math.floor(n / 10) * 0.01] },
      properties: {
        id,
        name: rand() < 0.8 ? `Place ${id}` : null,
        ...(wheelchair === undefined ? {} : { wheelchair }),
        source: "fuzz data",
        licence: "CC0-1.0",
        observedOn: `20${20 + Math.floor(rand() * 6)}-0${1 + Math.floor(rand() * 9)}-1${Math.floor(rand() * 9)}`,
      },
    };
  });
  const parsed = parsePack(JSON.stringify({ manifest: { packId, generatedOn: "2026-11-15", recordCount: features.length }, data: { type: "FeatureCollection", features } }));
  if (!parsed.ok) return null;
  return { pack: parsed.pack, garbage };
}

const ACCESS: readonly AccessFilter[] = ["any", "yes", "yes-or-limited"];

export function checkInvariants(impl: Implementation, seeds: readonly number[]): Violation[] {
  const violations: Violation[] = [];
  const add = (rule: string, detail: string) => violations.push({ rule, detail });
  const ids = Array.from({ length: 24 }, (_, i) => `p${i}`);

  for (const seed of seeds) {
    const rand = mulberry32(seed);
    const made = [randomPack(rand, "a", ids), randomPack(rand, "b", ids), randomPack(rand, "c", ids)].filter((item): item is RandomPack => item !== null);
    const packs = made.map((item) => item.pack);
    const where = `seed ${seed}`;

    // Reading a pack: a status the App does not recognise is shown as UNKNOWN, and is counted.
    for (const item of made) {
      for (const record of item.pack.records) {
        if (!(VALID as readonly string[]).includes(record.wheelchair)) add("read.valid-status", `${where}: ${record.id} has ${String(record.wheelchair)}`);
      }
      const noted = item.pack.warnings.filter((warning) => warning.code === "unrecognised-status").length;
      if (noted !== item.garbage) add("read.garbage-counted", `${where}: ${item.garbage} made-up statuses, ${noted} notes`);
    }

    // Merging.
    const merged = impl.mergePacks(packs);
    for (const place of merged.places) {
      const reported = place.reports.map((report) => report.record.wheelchair);
      const known = reported.filter((status) => status !== "UNKNOWN");
      const distinct = new Set(known);
      const shown = place.record.wheelchair;
      if (!(VALID as readonly string[]).includes(shown)) add("merge.valid-status", `${where}: ${place.id} shows ${String(shown)}`);
      if (known.length === 0 && shown !== "UNKNOWN") add("merge.all-unknown", `${where}: ${place.id} shows ${shown} but every report is UNKNOWN`);
      if (distinct.size > 1 && (shown !== "UNKNOWN" || place.conflict === null)) add("merge.conflict-unknown", `${where}: ${place.id} shows ${shown} for ${[...distinct].join("/")}`);
      if (shown !== "UNKNOWN" && !reported.includes(shown)) add("merge.not-invented", `${where}: ${place.id} shows ${shown}, which no pack reports`);
      if (distinct.size === 1 && place.conflict === null && shown !== [...distinct][0]) add("merge.known-beats-unknown", `${where}: ${place.id} shows ${shown}, packs say ${[...distinct][0]}`);
    }
    if (new Set(merged.records.map((record) => record.id)).size !== merged.records.length) add("merge.one-per-id", `${where}: an id appears twice`);

    // Searching.
    const totalUnknown = merged.records.filter((record) => record.wheelchair === "UNKNOWN").length;
    for (const access of ACCESS) {
      const result = impl.searchPlaces(merged.records, { text: "", access, maxAgeDays: null, today: "2026-11-15" });
      if (access !== "any" && result.matches.some((record) => record.wheelchair === "UNKNOWN")) add("search.unknown-not-a-match", `${where}: ${access} matched an UNKNOWN place`);
      if (access === "yes" && result.matches.some((record) => record.wheelchair !== "yes")) add("search.yes-only-yes", `${where}: yes matched another status`);
      if (access === "yes-or-limited" && result.matches.some((record) => record.wheelchair !== "yes" && record.wheelchair !== "limited")) add("search.yes-or-limited", `${where}: matched another status`);
      if (access !== "any" && result.unknown.length !== totalUnknown) add("search.unknown-listed", `${where}: ${result.unknown.length} listed, ${totalUnknown} UNKNOWN`);
      if (result.matches.length + result.unknown.length + result.excluded !== merged.records.length) add("search.partition", `${where}: ${access} does not account for every place`);
    }

    // Comparing.
    const [first, second] = packs;
    if (first && second) {
      const diff = impl.diffPacks(first, second);
      if (diff.unchanged + diff.changed.length + diff.removed.length !== first.records.length) add("diff.older-adds-up", `${where}: older pack does not add up`);
      if (diff.unchanged + diff.changed.length + diff.added.length !== second.records.length) add("diff.newer-adds-up", `${where}: newer pack does not add up`);
      const statusChanges = diff.changed.filter((item) => item.kinds.includes("status")).length;
      if (diff.transitions.reduce((sum, item) => sum + item.count, 0) !== statusChanges) add("diff.transitions-add-up", `${where}: transitions do not match status changes`);
      if (JSON.stringify(diff).match(/improv|worse|better/i)) add("diff.no-judgement", `${where}: the comparison judges a change`);
    }

    // Saved places.
    const saved = ["p-not-here", ...ids.slice(0, 5)].map((id) => ({ id, name: null, note: "", labels: [], savedOn: "2026-11-15" }));
    for (const item of impl.resolveSaved(saved, merged.places)) {
      const place = merged.places.find((entry) => entry.id === item.saved.id);
      if (!place && (item.status !== "UNKNOWN" || item.place !== null)) add("saved.not-in-packs-unknown", `${where}: ${item.saved.id} is in no pack but reads ${item.status}`);
      if (place && item.status !== place.record.wheelchair) add("saved.matches-packs", `${where}: ${item.saved.id} reads ${item.status}, packs say ${place.record.wheelchair}`);
    }
  }
  return violations;
}
