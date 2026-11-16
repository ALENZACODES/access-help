/**
 * Offline caching rules, written against small interfaces so they can be
 * tested without a browser. Rules:
 *  - only same-origin GET requests are ever cached (no third-party hosts,
 *    so no tile servers or trackers end up in the cache);
 *  - cache first, then network; a successful network response is stored;
 *  - if the network fails for a page navigation, the cached shell page is
 *    served instead;
 *  - old caches from earlier versions are removed on activate.
 */
export const CACHE_PREFIX = "app-onboarding-";

/** Files the build must emit next to sw.js for the offline copy to work. */
export const PRECACHE_URLS: readonly string[] = ["./", "./index.html", "./main.js"];
export const FALLBACK_URL = "./index.html";

export interface ResponseLike {
  readonly ok: boolean;
  clone(): ResponseLike;
}

export interface RequestLike {
  readonly method: string;
  readonly url: string;
  readonly mode?: string;
}

export interface CacheLike {
  match(request: string): Promise<ResponseLike | undefined>;
  put(request: string, response: ResponseLike): Promise<void>;
  addAll(urls: string[]): Promise<void>;
}

export interface CacheStorageLike {
  open(name: string): Promise<CacheLike>;
  keys(): Promise<string[]>;
  delete(name: string): Promise<boolean>;
}

export function cacheName(version: string): string {
  return `${CACHE_PREFIX}${version}`;
}

export function isCacheable(req: RequestLike, origin: string): boolean {
  if (req.method.toUpperCase() !== "GET") return false;
  let u: URL;
  try {
    u = new URL(req.url);
  } catch {
    return false;
  }
  return (u.protocol === "https:" || u.protocol === "http:") && u.origin === origin;
}

export async function precache(
  storage: CacheStorageLike,
  version: string,
  urls: readonly string[] = PRECACHE_URLS,
): Promise<void> {
  const cache = await storage.open(cacheName(version));
  await cache.addAll([...urls]);
}

/** Deletes this app's caches from other versions. Returns the deleted names. */
export async function pruneOldCaches(storage: CacheStorageLike, version: string): Promise<string[]> {
  const keep = cacheName(version);
  const removed: string[] = [];
  for (const name of await storage.keys()) {
    if (name.startsWith(CACHE_PREFIX) && name !== keep) {
      if (await storage.delete(name)) removed.push(name);
    }
  }
  return removed;
}

export interface RespondDeps<R extends ResponseLike> {
  readonly storage: CacheStorageLike;
  readonly version: string;
  readonly origin: string;
  readonly fetchFn: (req: RequestLike) => Promise<R>;
}

export async function respond<R extends ResponseLike>(
  req: RequestLike,
  deps: RespondDeps<R>,
): Promise<ResponseLike> {
  if (!isCacheable(req, deps.origin)) return deps.fetchFn(req);
  const cache = await deps.storage.open(cacheName(deps.version));
  const hit = await cache.match(req.url);
  if (hit) return hit;
  try {
    const res = await deps.fetchFn(req);
    if (res.ok) await cache.put(req.url, res.clone());
    return res;
  } catch (err) {
    if (req.mode === "navigate") {
      const fallback = await cache.match(new URL(FALLBACK_URL, req.url).href);
      if (fallback) return fallback;
    }
    throw err;
  }
}
