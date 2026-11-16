import type { Lang } from './plainTerms';

/**
 * Pure planning helpers for a service worker and an offline banner. The worker
 * itself stays small: it asks these functions what to do. Only same-origin
 * paths can be cached, so third-party tile servers and APIs are never stored.
 */

export interface CacheManifest {
  readonly version: string;
  readonly paths: readonly string[];
}

export type ManifestProblem = 'bad-version' | `bad-path:${string}`;

export interface ManifestResult {
  readonly manifest: CacheManifest | null;
  readonly problems: readonly ManifestProblem[];
}

const VERSION = /^[A-Za-z0-9._-]{1,64}$/;

function isLocalPath(p: string): boolean {
  return p.startsWith('/') && !p.startsWith('//') && !/\s|\.\.|[?#\\]/.test(p);
}

/** Sorted, de-duplicated, same-origin paths only. Any bad entry means no manifest. */
export function buildManifest(version: string, paths: readonly string[]): ManifestResult {
  const problems: ManifestProblem[] = [];
  if (!VERSION.test(version)) problems.push('bad-version');
  for (const p of paths) if (!isLocalPath(p)) problems.push(`bad-path:${p}`);
  if (problems.length > 0) return { manifest: null, problems };
  return { manifest: { version, paths: [...new Set(paths)].sort() }, problems };
}

export function cacheName(prefix: string, version: string): string {
  return `${prefix}-${version}`;
}

export interface CachePlan {
  readonly name: string;
  readonly needsPrecache: boolean;
  /** Old caches with this prefix to delete. Other apps' caches are never listed. */
  readonly remove: readonly string[];
}

export function planCacheUpdate(
  existing: readonly string[],
  manifest: CacheManifest,
  prefix: string,
): CachePlan {
  const name = cacheName(prefix, manifest.version);
  return {
    name,
    needsPrecache: !existing.includes(name),
    remove: existing.filter((n) => n.startsWith(`${prefix}-`) && n !== name),
  };
}

export type Strategy = 'cache-first' | 'network-first' | 'bypass';

export interface RequestInfo {
  readonly url: string;
  readonly method: string;
  readonly mode?: string;
}

function split(url: string, origin: string): { host: string; path: string } | null {
  const abs = /^(?:https?:)?\/\/([^/?#]+)([^?#]*)/i.exec(url);
  if (abs !== null) return { host: (abs[1] ?? '').toLowerCase(), path: abs[2] || '/' };
  if (!url.startsWith('/')) return null;
  const o = /^(?:https?:)?\/\/([^/?#]+)/i.exec(origin);
  return o === null ? null : { host: (o[1] ?? '').toLowerCase(), path: url.split(/[?#]/)[0] ?? '/' };
}

/**
 * Listed files come from the cache. Pages try the network first and fall back to the
 * cache. Non-GET and cross-origin requests are left alone.
 */
export function decideStrategy(req: RequestInfo, manifest: CacheManifest, origin: string): Strategy {
  if (req.method.toUpperCase() !== 'GET') return 'bypass';
  const target = split(req.url, origin);
  const self = split('/', origin);
  if (target === null || self === null || target.host !== self.host) return 'bypass';
  if (manifest.paths.includes(target.path)) return 'cache-first';
  return 'network-first';
}

const CONNECTION: Readonly<Record<Lang, string>> = {
  en: 'You are offline. Showing saved information.',
  fr: 'Vous êtes hors ligne. Affichage des données enregistrées.',
};

/** Banner text when offline, null when online. */
export function connectionText(online: boolean, lang: Lang): string | null {
  return online ? null : CONNECTION[lang];
}

export const CONNECTION_STRINGS = CONNECTION;
