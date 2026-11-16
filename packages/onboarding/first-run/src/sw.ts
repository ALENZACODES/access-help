/**
 * Service worker entry. Bundle this file to sw.js next to index.html.
 * All decisions live in sw-logic.ts.
 */
import {
  precache,
  pruneOldCaches,
  respond,
  type CacheStorageLike,
  type RequestLike,
  type ResponseLike,
} from "./sw-logic";

/** Bump when the shell changes so old caches are removed. */
export const SW_VERSION = "1";

interface ExtendableEventLike {
  waitUntil(p: Promise<unknown>): void;
}
interface FetchEventLike {
  readonly request: RequestLike;
  respondWith(p: Promise<unknown>): void;
}
interface WorkerScope {
  readonly location: { readonly origin: string };
  readonly caches: CacheStorageLike;
  readonly clients: { claim(): Promise<void> };
  skipWaiting(): Promise<void>;
  fetch(req: RequestLike): Promise<ResponseLike & Response>;
  addEventListener(type: "install" | "activate", l: (e: ExtendableEventLike) => void): void;
  addEventListener(type: "fetch", l: (e: FetchEventLike) => void): void;
}

const scope = self as unknown as WorkerScope;

scope.addEventListener("install", (e) => {
  e.waitUntil(precache(scope.caches, SW_VERSION).then(() => scope.skipWaiting()));
});

scope.addEventListener("activate", (e) => {
  e.waitUntil(pruneOldCaches(scope.caches, SW_VERSION).then(() => scope.clients.claim()));
});

scope.addEventListener("fetch", (e) => {
  e.respondWith(
    respond(e.request, {
      storage: scope.caches,
      version: SW_VERSION,
      origin: scope.location.origin,
      fetchFn: (r) => scope.fetch(r),
    }),
  );
});
