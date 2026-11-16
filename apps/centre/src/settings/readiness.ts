/**
 * Offline readiness: what this browser says it can keep and read without a
 * connection. Each answer comes from the browser. When the browser does not
 * say, the answer is UNKNOWN. This is not a test that the App works offline.
 */
export type ReadinessId = "connection" | "shell" | "pack" | "storage" | "persistence";
export type ReadinessState = "ready" | "attention" | "unknown";

export interface ReadinessInput {
  online: boolean;
  /** "controlled": a service worker is serving this page. */
  serviceWorker: "controlled" | "registered" | "none" | "unsupported" | "unknown";
  cachedEntries: number | null;
  packCount: number;
  storage: { usage: number; quota: number } | null;
  persisted: boolean | null;
}

export interface ReadinessItem {
  id: ReadinessId;
  state: ReadinessState;
  /** Selects the sentence. */
  variant: string;
  percent?: number;
}

export const LOW_SPACE_PERCENT = 80;

export function evaluateReadiness(input: ReadinessInput): ReadinessItem[] {
  const items: ReadinessItem[] = [];

  items.push({ id: "connection", state: input.online ? "ready" : "attention", variant: input.online ? "online" : "offline" });

  if (input.serviceWorker === "unsupported") {
    items.push({ id: "shell", state: "attention", variant: "unsupported" });
  } else if (input.serviceWorker === "unknown") {
    items.push({ id: "shell", state: "unknown", variant: "unknown" });
  } else if (input.serviceWorker === "controlled" && (input.cachedEntries ?? 0) > 0) {
    items.push({ id: "shell", state: "ready", variant: "ready" });
  } else if (input.serviceWorker === "controlled" && input.cachedEntries === null) {
    items.push({ id: "shell", state: "unknown", variant: "unknown" });
  } else {
    items.push({ id: "shell", state: "attention", variant: "inactive" });
  }

  items.push({ id: "pack", state: input.packCount > 0 ? "ready" : "attention", variant: input.packCount > 0 ? "some" : "none" });

  if (input.storage === null || !(input.storage.quota > 0)) {
    items.push({ id: "storage", state: "unknown", variant: "unknown" });
  } else {
    const percent = Math.min(100, Math.round((input.storage.usage / input.storage.quota) * 100));
    items.push({ id: "storage", state: percent >= LOW_SPACE_PERCENT ? "attention" : "ready", variant: percent >= LOW_SPACE_PERCENT ? "low" : "ok", percent });
  }

  items.push(
    input.persisted === null
      ? { id: "persistence", state: "unknown", variant: "unknown" }
      : { id: "persistence", state: input.persisted ? "ready" : "attention", variant: input.persisted ? "yes" : "no" },
  );
  return items;
}

export interface CacheStorageLike {
  keys(): Promise<string[]>;
  open(name: string): Promise<{ keys(): Promise<readonly unknown[]> }>;
}

export interface BrowserLike {
  onLine: boolean;
  serviceWorker?: { controller: unknown; getRegistration(): Promise<unknown> };
  storage?: {
    estimate?(): Promise<{ usage?: number; quota?: number }>;
    persisted?(): Promise<boolean>;
    persist?(): Promise<boolean>;
  };
}

async function swState(browser: BrowserLike): Promise<ReadinessInput["serviceWorker"]> {
  if (!browser.serviceWorker) return "unsupported";
  try {
    if (browser.serviceWorker.controller) return "controlled";
    return (await browser.serviceWorker.getRegistration()) ? "registered" : "none";
  } catch {
    return "unknown";
  }
}

async function countCached(caches: CacheStorageLike | undefined): Promise<number | null> {
  if (!caches) return null;
  try {
    let total = 0;
    for (const name of await caches.keys()) total += (await (await caches.open(name)).keys()).length;
    return total;
  } catch {
    return null;
  }
}

export async function collectReadiness(browser: BrowserLike, caches: CacheStorageLike | undefined, packCount: number): Promise<ReadinessInput> {
  let storage: ReadinessInput["storage"] = null;
  try {
    const estimate = await browser.storage?.estimate?.();
    if (estimate && typeof estimate.usage === "number" && typeof estimate.quota === "number") {
      storage = { usage: estimate.usage, quota: estimate.quota };
    }
  } catch {
    storage = null;
  }
  let persisted: boolean | null = null;
  try {
    const answer = await browser.storage?.persisted?.();
    persisted = typeof answer === "boolean" ? answer : null;
  } catch {
    persisted = null;
  }
  return {
    online: browser.onLine,
    serviceWorker: await swState(browser),
    cachedEntries: await countCached(caches),
    packCount,
    storage,
    persisted,
  };
}

/** Asks the browser to keep saved data. The browser decides, and may say no. */
export async function requestPersistence(browser: BrowserLike): Promise<boolean | null> {
  try {
    const answer = await browser.storage?.persist?.();
    return typeof answer === "boolean" ? answer : null;
  } catch {
    return null;
  }
}
