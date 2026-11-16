import { TERMS, type GlossaryTerm, type Lang } from './plainTerms';
import { tokenise } from './text';

/**
 * A small search index that can be cached (localStorage, a service-worker cache)
 * so the glossary works with no network. A checksum detects edits and staleness.
 */

export interface IndexEntry {
  readonly id: string;
  readonly term: string;
  readonly plain: string;
  readonly name: readonly string[];
  readonly body: readonly string[];
}

export interface OfflineIndex {
  readonly version: 1;
  readonly lang: Lang;
  readonly checksum: string;
  readonly entries: readonly IndexEntry[];
}

export interface SearchHit {
  readonly id: string;
  readonly term: string;
  readonly plain: string;
  readonly score: number;
}

/** Minimal Storage-like interface (window.localStorage satisfies it). */
export interface IndexStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** FNV-1a, 32 bit, as 8 hex digits. Detects accidents, not tampering. */
export function checksum(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function sign(lang: Lang, entries: readonly IndexEntry[]): string {
  return checksum(`${lang}\n${JSON.stringify(entries)}`);
}

export function buildIndex(lang: Lang, terms: readonly GlossaryTerm[] = TERMS): OfflineIndex {
  const entries = terms.map((t): IndexEntry => ({
    id: t.id,
    term: t[lang].term,
    plain: t[lang].plain,
    name: tokenise(t[lang].term),
    body: tokenise(t[lang].plain),
  }));
  return { version: 1, lang, checksum: sign(lang, entries), entries };
}

export function serialiseIndex(index: OfflineIndex): string {
  return JSON.stringify(index);
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((v) => typeof v === 'string');
}

function isEntry(x: unknown): x is IndexEntry {
  return (
    isRecord(x) &&
    typeof x['id'] === 'string' &&
    typeof x['term'] === 'string' &&
    typeof x['plain'] === 'string' &&
    isStringArray(x['name']) &&
    isStringArray(x['body'])
  );
}

/** Null for anything that is not a well-formed, untouched index. */
export function parseIndex(json: string): OfflineIndex | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isRecord(raw) || raw['version'] !== 1) return null;
  const lang = raw['lang'];
  const entries = raw['entries'];
  if ((lang !== 'en' && lang !== 'fr') || typeof raw['checksum'] !== 'string') return null;
  if (!Array.isArray(entries) || !entries.every(isEntry)) return null;
  if (sign(lang, entries) !== raw['checksum']) return null;
  return { version: 1, lang, checksum: raw['checksum'], entries };
}

/** False when the cached index no longer matches the glossary data. */
export function isIndexCurrent(
  index: OfflineIndex,
  lang: Lang,
  terms: readonly GlossaryTerm[] = TERMS,
): boolean {
  return index.lang === lang && index.checksum === buildIndex(lang, terms).checksum;
}

function toHit(e: IndexEntry, score: number): SearchHit {
  return { id: e.id, term: e.term, plain: e.plain, score };
}

/** All entries, sorted by display name. */
export function listFromIndex(index: OfflineIndex): readonly SearchHit[] {
  return index.entries
    .map((e) => toHit(e, 0))
    .sort((a, b) => a.term.localeCompare(b.term, index.lang));
}

function tokenScore(entry: IndexEntry, q: string): number {
  if (entry.name.includes(q)) return 10;
  if (entry.name.some((t) => t.startsWith(q))) return 6;
  if (entry.body.includes(q)) return 3;
  if (entry.body.some((t) => t.startsWith(q))) return 2;
  return 0;
}

/** Every query word must match. Name matches rank above description matches. */
export function searchIndex(index: OfflineIndex, query: string, limit = 20): readonly SearchHit[] {
  const tokens = tokenise(query);
  if (tokens.length === 0) return [];
  const hits: SearchHit[] = [];
  for (const entry of index.entries) {
    let total = 0;
    let ok = true;
    for (const q of tokens) {
      const s = tokenScore(entry, q);
      if (s === 0) {
        ok = false;
        break;
      }
      total += s;
    }
    if (ok) hits.push(toHit(entry, total));
  }
  hits.sort((a, b) => b.score - a.score || a.term.localeCompare(b.term, index.lang));
  return hits.slice(0, Math.max(0, limit));
}

export interface LoadedIndex {
  readonly index: OfflineIndex;
  readonly source: 'cache' | 'built';
}

/** Uses a valid, current cached index when there is one; otherwise builds and caches. */
export function loadOrBuildIndex(
  lang: Lang,
  store?: IndexStore,
  key = `glossary-index-${lang}`,
): LoadedIndex {
  try {
    const cached = store?.getItem(key);
    if (typeof cached === 'string') {
      const parsed = parseIndex(cached);
      if (parsed !== null && isIndexCurrent(parsed, lang)) return { index: parsed, source: 'cache' };
    }
  } catch {
    // Storage can throw (private mode, disabled). Fall through and rebuild.
  }
  const index = buildIndex(lang);
  try {
    store?.setItem(key, serialiseIndex(index));
  } catch {
    // Quota or blocked storage: the in-memory index still works.
  }
  return { index, source: 'built' };
}
