import { CENTRE_SCREENS } from "./model.js";

/**
 * Addresses the release run opens that are not screens of their own in the inventory:
 * one more help article, and the two addresses that must explain themselves when unknown.
 */
export const EXTRA_RELEASE_ROUTES = ["/help/offline", "/no-such-page", "/help/no-such-article"] as const;

/**
 * Every address the release run opens: each screen in the inventory, then the extras.
 * A screen added to the inventory is opened by the release run with no second list to edit.
 */
export function releaseRoutes(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const path of [...CENTRE_SCREENS.map((screen) => screen.path as string), ...EXTRA_RELEASE_ROUTES]) {
    if (seen.has(path)) continue;
    seen.add(path);
    out.push(path);
  }
  return out;
}

/**
 * How many full page loads one browser page makes before the run moves to a fresh page.
 * The development server refuses its live-reload socket after many loads on one page, and a
 * page left waiting for it never renders. Small batches keep every page far from that point.
 */
export const LOADS_PER_PAGE = 12;

/** Splits a list into consecutive batches of at most `size`. Nothing is dropped or repeated. */
export function inBatches<T>(items: readonly T[], size: number = LOADS_PER_PAGE): T[][] {
  const step = Math.max(1, Math.floor(size));
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += step) out.push(items.slice(index, index + step));
  return out;
}
