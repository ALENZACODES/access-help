export type OfflineStatus = "pending" | "registered" | "unsupported" | "failed";

export interface ServiceWorkerHost {
  readonly serviceWorker?: { register(url: string): Promise<unknown> } | undefined;
}

/**
 * Registers the service worker. "registered" means the browser accepted the
 * registration, not that every page is already cached, and the copy says so.
 */
export async function registerOffline(
  nav: ServiceWorkerHost,
  url: string,
): Promise<OfflineStatus> {
  if (!nav.serviceWorker) return "unsupported";
  try {
    await nav.serviceWorker.register(url);
    return "registered";
  } catch {
    return "failed";
  }
}
