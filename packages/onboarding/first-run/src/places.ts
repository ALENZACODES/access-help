import type { Locale } from "../../switch-first/src/index";
import { FACT_KEYS, type FactKey, type Provenance } from "./facts";
import { foldText, type Requirement, type Verdict } from "./filter";
import { noteFact, type Note } from "./model";

/**
 * Several notes can describe the same place. Reports are combined without
 * guessing: when they agree the answer is shown with how many reports back it;
 * when they disagree the App says so and lists every report. It never picks a
 * winner, and a place with no recorded answer stays Unknown.
 */
export interface Observation {
  readonly noteId: string;
  readonly value: "yes" | "no";
  readonly provenance: Provenance;
}

export type Resolution =
  | { readonly kind: "unknown" }
  | { readonly kind: "agree"; readonly value: "yes" | "no"; readonly observations: readonly Observation[] }
  | { readonly kind: "differ"; readonly observations: readonly Observation[] };

export interface Place {
  readonly id: string;
  readonly name: string;
  readonly address: string | undefined;
  /** Newest first. */
  readonly notes: readonly Note[];
  readonly resolutions: Readonly<Record<FactKey, Resolution>>;
}

/** Same-place key: name and address, ignoring case, accents and punctuation. */
export function placeKey(n: Pick<Note, "placeName" | "address">): string {
  const squash = (s: string): string => foldText(s).replace(/[^a-z0-9]+/g, " ").trim();
  return `${squash(n.placeName)}|${squash(n.address ?? "")}`;
}

function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** URL-safe id: a readable slug plus a hash of the full key. */
export function placeId(n: Pick<Note, "placeName" | "address">): string {
  const key = placeKey(n);
  const slug = (key.split("|")[0] ?? "").replace(/ /g, "-").slice(0, 40).replace(/-+$/g, "");
  return `${slug === "" ? "place" : slug}-${fnv1a(key)}`;
}

export function resolve(observations: readonly Observation[]): Resolution {
  if (observations.length === 0) return { kind: "unknown" };
  const sorted = [...observations].sort((a, b) =>
    a.provenance.recordedOn === b.provenance.recordedOn
      ? a.noteId.localeCompare(b.noteId)
      : a.provenance.recordedOn < b.provenance.recordedOn ? 1 : -1,
  );
  const first = sorted[0] as Observation;
  const same = sorted.every((o) => o.value === first.value);
  return same ? { kind: "agree", value: first.value, observations: sorted } : { kind: "differ", observations: sorted };
}

function newestFirst(a: Note, b: Note): number {
  return a.createdOn === b.createdOn ? a.id.localeCompare(b.id) : a.createdOn < b.createdOn ? 1 : -1;
}

export function groupPlaces(notes: readonly Note[], locale: Locale): Place[] {
  const byId = new Map<string, Note[]>();
  for (const n of notes) {
    const id = placeId(n);
    const list = byId.get(id);
    if (list) list.push(n);
    else byId.set(id, [n]);
  }
  const places: Place[] = [];
  for (const [id, list] of byId) {
    const sorted = [...list].sort(newestFirst);
    const latest = sorted[0] as Note;
    const resolutions = {} as Record<FactKey, Resolution>;
    for (const key of FACT_KEYS) {
      const obs: Observation[] = [];
      for (const n of sorted) {
        const f = noteFact(n, key);
        if ((f.value === "yes" || f.value === "no") && f.provenance) {
          obs.push({ noteId: n.id, value: f.value, provenance: f.provenance });
        }
      }
      resolutions[key] = resolve(obs);
    }
    places.push({ id, name: latest.placeName, address: latest.address, notes: sorted, resolutions });
  }
  const collator = new Intl.Collator(locale, { sensitivity: "base" });
  return places.sort((a, b) => collator.compare(a.name, b.name) || a.id.localeCompare(b.id));
}

/**
 * Same three-way rule as for single notes. A place only matches when every
 * requested detail has agreeing reports with the wanted value. Missing reports
 * or reports that differ keep it out of the matches without ruling it out.
 */
export function evaluatePlace(place: Place, req: Requirement): Verdict {
  let open = false;
  for (const key of FACT_KEYS) {
    const wanted = req[key];
    if (!wanted) continue;
    const r = place.resolutions[key];
    if (r.kind === "unknown" || r.kind === "differ") open = true;
    else if (r.value !== wanted) return "excluded";
  }
  return open ? "unknown" : "match";
}

export interface GroupedPlaces {
  readonly matches: Place[];
  readonly unknown: Place[];
  readonly excluded: Place[];
}

export function groupPlacesByVerdict(places: readonly Place[], req: Requirement, query: string): GroupedPlaces {
  const q = foldText(query.trim());
  const out: GroupedPlaces = { matches: [], unknown: [], excluded: [] };
  for (const p of places) {
    if (q !== "" && !foldText(p.name).includes(q)) continue;
    const v = evaluatePlace(p, req);
    (v === "match" ? out.matches : v === "unknown" ? out.unknown : out.excluded).push(p);
  }
  return out;
}

export function findPlace(places: readonly Place[], id: string): Place | undefined {
  return places.find((p) => p.id === id);
}

/** How many reports back a resolution. */
export function reportCount(r: Resolution): number {
  return r.kind === "unknown" ? 0 : r.observations.length;
}
