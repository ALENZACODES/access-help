import { describe, expect, it } from "vitest";
import {
  CACHE_PREFIX,
  FALLBACK_URL,
  PRECACHE_URLS,
  cacheName,
  isCacheable,
  precache,
  pruneOldCaches,
  registerOffline,
  respond,
  type CacheLike,
  type CacheStorageLike,
  type ResponseLike,
} from "./index";

class FakeResponse implements ResponseLike {
  constructor(
    readonly ok: boolean,
    readonly body: string,
  ) {}
  clone(): FakeResponse {
    return new FakeResponse(this.ok, this.body);
  }
}

class FakeCache implements CacheLike {
  readonly map = new Map<string, ResponseLike>();
  async match(r: string): Promise<ResponseLike | undefined> {
    return this.map.get(r);
  }
  async put(r: string, res: ResponseLike): Promise<void> {
    this.map.set(r, res);
  }
  async addAll(urls: string[]): Promise<void> {
    for (const u of urls) this.map.set(new URL(u, "https://app.test/").href, new FakeResponse(true, u));
  }
}

class FakeStorage implements CacheStorageLike {
  readonly caches = new Map<string, FakeCache>();
  async open(name: string): Promise<CacheLike> {
    let c = this.caches.get(name);
    if (!c) this.caches.set(name, (c = new FakeCache()));
    return c;
  }
  async keys(): Promise<string[]> {
    return [...this.caches.keys()];
  }
  async delete(name: string): Promise<boolean> {
    return this.caches.delete(name);
  }
}

const ORIGIN = "https://app.test";

describe("isCacheable", () => {
  it("allows same-origin GET only", () => {
    expect(isCacheable({ method: "GET", url: `${ORIGIN}/a.js` }, ORIGIN)).toBe(true);
    expect(isCacheable({ method: "get", url: `${ORIGIN}/a.js` }, ORIGIN)).toBe(true);
    expect(isCacheable({ method: "POST", url: `${ORIGIN}/a.js` }, ORIGIN)).toBe(false);
    expect(isCacheable({ method: "GET", url: "https://tiles.example.com/1/2/3.png" }, ORIGIN)).toBe(false);
    expect(isCacheable({ method: "GET", url: "chrome-extension://x/y" }, ORIGIN)).toBe(false);
    expect(isCacheable({ method: "GET", url: "not a url" }, ORIGIN)).toBe(false);
  });
});

describe("precache and prune", () => {
  it("precaches the shell and removes only older app caches", async () => {
    const s = new FakeStorage();
    await s.open(`${CACHE_PREFIX}0`);
    await s.open("someone-elses-cache");
    await precache(s, "1");
    const cache = s.caches.get(cacheName("1"));
    expect(cache?.map.size).toBe(PRECACHE_URLS.length);
    expect(await pruneOldCaches(s, "1")).toEqual([`${CACHE_PREFIX}0`]);
    expect([...s.caches.keys()].sort()).toEqual([cacheName("1"), "someone-elses-cache"]);
  });
});

describe("respond", () => {
  const mk = (storage: FakeStorage, fetchFn: (r: { url: string }) => Promise<FakeResponse>) => ({
    storage,
    version: "1",
    origin: ORIGIN,
    fetchFn,
  });

  it("serves from cache without touching the network", async () => {
    const s = new FakeStorage();
    await precache(s, "1");
    let calls = 0;
    const res = await respond({ method: "GET", url: `${ORIGIN}/index.html` }, mk(s, async () => {
      calls++;
      return new FakeResponse(true, "net");
    }));
    expect(calls).toBe(0);
    expect((res as FakeResponse).body).toBe("./index.html");
  });

  it("fetches on a miss and stores only successful responses", async () => {
    const s = new FakeStorage();
    const ok = await respond({ method: "GET", url: `${ORIGIN}/x.js` }, mk(s, async () => new FakeResponse(true, "x")));
    expect((ok as FakeResponse).body).toBe("x");
    const cache = s.caches.get(cacheName("1"));
    expect(cache?.map.has(`${ORIGIN}/x.js`)).toBe(true);
    await respond({ method: "GET", url: `${ORIGIN}/bad.js` }, mk(s, async () => new FakeResponse(false, "err")));
    expect(cache?.map.has(`${ORIGIN}/bad.js`)).toBe(false);
  });

  it("never caches cross-origin requests", async () => {
    const s = new FakeStorage();
    await respond({ method: "GET", url: "https://other.test/t.png" }, mk(s, async () => new FakeResponse(true, "t")));
    expect(s.caches.size).toBe(0);
  });

  it("serves the cached shell page when a navigation fails offline", async () => {
    const s = new FakeStorage();
    await precache(s, "1");
    const res = await respond(
      { method: "GET", url: `${ORIGIN}/somewhere`, mode: "navigate" },
      mk(s, async () => {
        throw new TypeError("offline");
      }),
    );
    expect((res as FakeResponse).body).toBe(FALLBACK_URL);
  });

  it("rethrows other offline failures", async () => {
    const s = new FakeStorage();
    await expect(
      respond({ method: "GET", url: `${ORIGIN}/data.json` }, mk(s, async () => {
        throw new TypeError("offline");
      })),
    ).rejects.toThrow("offline");
  });
});

describe("registerOffline", () => {
  it("reports unsupported, registered and failed", async () => {
    expect(await registerOffline({}, "./sw.js")).toBe("unsupported");
    expect(await registerOffline({ serviceWorker: { register: async () => ({}) } }, "./sw.js")).toBe("registered");
    expect(
      await registerOffline({ serviceWorker: { register: async () => Promise.reject(new Error("x")) } }, "./sw.js"),
    ).toBe("failed");
  });
});
