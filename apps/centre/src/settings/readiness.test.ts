import { describe, expect, it } from "vitest";
import {
  LOW_SPACE_PERCENT,
  collectReadiness,
  evaluateReadiness,
  requestPersistence,
  type BrowserLike,
  type CacheStorageLike,
  type ReadinessInput,
} from "./readiness.js";

const base: ReadinessInput = {
  online: true,
  serviceWorker: "controlled",
  cachedEntries: 12,
  packCount: 2,
  storage: { usage: 10, quota: 100 },
  persisted: true,
};

const byId = (input: ReadinessInput) => Object.fromEntries(evaluateReadiness(input).map((item) => [item.id, item]));

describe("evaluateReadiness", () => {
  it("is ready only when each part says so", () => {
    const items = evaluateReadiness(base);
    expect(items.map((i) => [i.id, i.state])).toEqual([
      ["connection", "ready"],
      ["shell", "ready"],
      ["pack", "ready"],
      ["storage", "ready"],
      ["persistence", "ready"],
    ]);
  });

  it("does not call the App saved when no service worker serves the page, or the cache is empty", () => {
    expect(byId({ ...base, serviceWorker: "none" }).shell).toMatchObject({ state: "attention", variant: "inactive" });
    expect(byId({ ...base, serviceWorker: "registered" }).shell).toMatchObject({ state: "attention", variant: "inactive" });
    expect(byId({ ...base, cachedEntries: 0 }).shell).toMatchObject({ state: "attention", variant: "inactive" });
    expect(byId({ ...base, serviceWorker: "unsupported" }).shell).toMatchObject({ state: "attention", variant: "unsupported" });
  });

  it("keeps unknown answers as unknown instead of guessing", () => {
    const items = byId({ ...base, serviceWorker: "unknown", cachedEntries: null, storage: null, persisted: null });
    expect(items.shell?.state).toBe("unknown");
    expect(items.storage?.state).toBe("unknown");
    expect(items.persistence?.state).toBe("unknown");
    expect(byId({ ...base, cachedEntries: null }).shell?.state).toBe("unknown");
  });

  it("flags low space at the threshold and reports the percent", () => {
    expect(byId({ ...base, storage: { usage: LOW_SPACE_PERCENT - 1, quota: 100 } }).storage).toMatchObject({ state: "ready", percent: LOW_SPACE_PERCENT - 1 });
    expect(byId({ ...base, storage: { usage: LOW_SPACE_PERCENT, quota: 100 } }).storage).toMatchObject({ state: "attention", variant: "low" });
    expect(byId({ ...base, storage: { usage: 500, quota: 100 } }).storage?.percent).toBe(100);
    expect(byId({ ...base, storage: { usage: 1, quota: 0 } }).storage?.state).toBe("unknown");
  });

  it("asks for attention when offline, with no pack, or not protected", () => {
    expect(byId({ ...base, online: false }).connection).toMatchObject({ state: "attention", variant: "offline" });
    expect(byId({ ...base, packCount: 0 }).pack).toMatchObject({ state: "attention", variant: "none" });
    expect(byId({ ...base, persisted: false }).persistence).toMatchObject({ state: "attention", variant: "no" });
  });
});

describe("collectReadiness", () => {
  const caches: CacheStorageLike = {
    keys: async () => ["a", "b"],
    open: async (name) => ({ keys: async () => (name === "a" ? [1, 2, 3] : [4]) }),
  };

  it("reads each answer from the browser", async () => {
    const browser: BrowserLike = {
      onLine: false,
      serviceWorker: { controller: {}, getRegistration: async () => ({}) },
      storage: { estimate: async () => ({ usage: 5, quota: 50 }), persisted: async () => false },
    };
    expect(await collectReadiness(browser, caches, 3)).toEqual({
      online: false,
      serviceWorker: "controlled",
      cachedEntries: 4,
      packCount: 3,
      storage: { usage: 5, quota: 50 },
      persisted: false,
    });
  });

  it("separates a registered worker that is not serving the page from none and from unsupported", async () => {
    const worker = (registration: unknown): BrowserLike => ({ onLine: true, serviceWorker: { controller: null, getRegistration: async () => registration } });
    expect((await collectReadiness(worker({}), undefined, 0)).serviceWorker).toBe("registered");
    expect((await collectReadiness(worker(undefined), undefined, 0)).serviceWorker).toBe("none");
    expect((await collectReadiness({ onLine: true }, undefined, 0)).serviceWorker).toBe("unsupported");
  });

  it("answers UNKNOWN-shaped values when the browser throws or has no such API", async () => {
    const browser: BrowserLike = {
      onLine: true,
      serviceWorker: { controller: null, getRegistration: async () => { throw new Error("no"); } },
      storage: { estimate: async () => { throw new Error("no"); }, persisted: async () => { throw new Error("no"); } },
    };
    const broken: CacheStorageLike = { keys: async () => { throw new Error("no"); }, open: async () => { throw new Error("no"); } };
    expect(await collectReadiness(browser, broken, 0)).toMatchObject({ serviceWorker: "unknown", cachedEntries: null, storage: null, persisted: null });
    expect(await collectReadiness({ onLine: true }, undefined, 0)).toMatchObject({ cachedEntries: null, storage: null, persisted: null });
    expect(await collectReadiness({ onLine: true, storage: { estimate: async () => ({ usage: 1 }) } }, undefined, 0)).toMatchObject({ storage: null });
  });
});

describe("requestPersistence", () => {
  it("returns the browser's answer, and null when it cannot answer", async () => {
    expect(await requestPersistence({ onLine: true, storage: { persist: async () => true } })).toBe(true);
    expect(await requestPersistence({ onLine: true, storage: { persist: async () => false } })).toBe(false);
    expect(await requestPersistence({ onLine: true })).toBeNull();
    expect(await requestPersistence({ onLine: true, storage: { persist: async () => { throw new Error("no"); } } })).toBeNull();
  });
});
