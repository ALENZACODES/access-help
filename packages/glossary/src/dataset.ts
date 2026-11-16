import type { ImportOptions, ImportResult } from './csvImport';
import { importClaims } from './csvImport';
import { checksum } from './offlineIndex';
import type { IndexStore } from './offlineIndex';
import type { Place } from './places';
import { formatProvenance, validateProvenance, type Provenance, type ProvenanceIssue } from './provenance';
import { effectiveStatus, type FeatureClaim } from './status';
import { TERMS, type Lang } from './terms';

/** A set of places plus where it came from. Stored whole so it can be used offline. */
export interface PlaceDataset {
  readonly version: 1;
  readonly provenance: Provenance;
  readonly places: readonly Place[];
  readonly checksum: string;
}

export type DatasetProblem =
  | ProvenanceIssue
  | 'duplicate-place-id'
  | 'empty-place-id'
  | 'empty-place-name'
  | `unknown-term:${string}`
  | `unsourced-claim:${string}:${string}`;

export const DEFAULT_DATASET_KEY = 'glossary-places';

/** Everything wrong with a set of places. Empty means it can be stored and shown. */
export function datasetProblems(
  places: readonly Place[],
  provenance: Provenance,
  today?: string,
): readonly DatasetProblem[] {
  const problems: DatasetProblem[] = [...validateProvenance(provenance, today)];
  const known = new Set(TERMS.map((t) => t.id));
  const seen = new Set<string>();
  for (const p of places) {
    if (p.id.trim() === '') problems.push('empty-place-id');
    if (p.name.trim() === '') problems.push('empty-place-name');
    if (seen.has(p.id)) problems.push('duplicate-place-id');
    seen.add(p.id);
    for (const c of p.claims) {
      if (!known.has(c.termId)) problems.push(`unknown-term:${c.termId}`);
      if (c.status !== 'unknown' && effectiveStatus(c) === 'unknown') {
        problems.push(`unsourced-claim:${p.id}:${c.termId}`);
      }
    }
  }
  return problems;
}

function sign(provenance: Provenance, places: readonly Place[]): string {
  return checksum(JSON.stringify([provenance, places]));
}

export interface BuiltDataset {
  readonly dataset: PlaceDataset | null;
  readonly problems: readonly DatasetProblem[];
}

export function buildDataset(places: readonly Place[], provenance: Provenance, today?: string): BuiltDataset {
  const problems = datasetProblems(places, provenance, today);
  if (problems.length > 0) return { dataset: null, problems };
  return { dataset: { version: 1, provenance, places, checksum: sign(provenance, places) }, problems };
}

export function serialiseDataset(dataset: PlaceDataset): string {
  return JSON.stringify(dataset);
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isProvenance(x: unknown): x is Provenance {
  return (
    isRecord(x) &&
    typeof x['source'] === 'string' &&
    typeof x['licence'] === 'string' &&
    typeof x['date'] === 'string' &&
    (x['url'] === undefined || typeof x['url'] === 'string')
  );
}

function isClaim(x: unknown): x is FeatureClaim {
  return (
    isRecord(x) &&
    typeof x['termId'] === 'string' &&
    (x['status'] === 'present' || x['status'] === 'absent' || x['status'] === 'unknown') &&
    (x['provenance'] === undefined || isProvenance(x['provenance']))
  );
}

function isPlace(x: unknown): x is Place {
  return (
    isRecord(x) &&
    typeof x['id'] === 'string' &&
    typeof x['name'] === 'string' &&
    Array.isArray(x['claims']) &&
    x['claims'].every(isClaim)
  );
}

/** Null for anything malformed, edited, or missing sources. */
export function parseDataset(json: string): PlaceDataset | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isRecord(raw) || raw['version'] !== 1) return null;
  const { provenance, places } = raw;
  if (!isProvenance(provenance) || !Array.isArray(places) || !places.every(isPlace)) return null;
  if (typeof raw['checksum'] !== 'string' || sign(provenance, places) !== raw['checksum']) return null;
  if (datasetProblems(places, provenance).length > 0) return null;
  return { version: 1, provenance, places, checksum: raw['checksum'] };
}

export function loadDataset(store: IndexStore, key = DEFAULT_DATASET_KEY): PlaceDataset | null {
  try {
    const raw = store.getItem(key);
    return raw === null ? null : parseDataset(raw);
  } catch {
    return null;
  }
}

/** False when storage refuses (quota, private mode). The in-memory dataset still works. */
export function saveDataset(store: IndexStore, dataset: PlaceDataset, key = DEFAULT_DATASET_KEY): boolean {
  try {
    store.setItem(key, serialiseDataset(dataset));
    return true;
  } catch {
    return false;
  }
}

export interface CsvDataset {
  readonly result: ImportResult;
  readonly dataset: PlaceDataset | null;
  readonly problems: readonly DatasetProblem[];
}

/** CSV in, dataset out. Any import or dataset problem means no dataset. */
export function datasetFromCsv(csv: string, options: ImportOptions): CsvDataset {
  const result = importClaims(csv, options);
  if (result.problems.length > 0) return { result, dataset: null, problems: [] };
  const built = buildDataset(result.places, options.provenance, options.today);
  return { result, dataset: built.dataset, problems: built.problems };
}

export function attribution(dataset: PlaceDataset, lang: Lang): string {
  return formatProvenance(dataset.provenance, lang);
}
