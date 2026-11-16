import { ARTICLES } from "./articles";
import type { KeyValueStore } from "./store";

/**
 * Two small help choices kept on this device only: whether articles are read
 * whole or one section at a time, and which articles were opened last. Neither
 * is sent anywhere, and both can be cleared. A missing or invalid value stays
 * unknown rather than being guessed.
 */
export type ReadingMode = "whole" | "steps";

export interface HelpState {
  /** undefined until the person chooses. The page reads as "whole" meanwhile. */
  readonly reading: ReadingMode | undefined;
  /** Article ids, most recent first. */
  readonly recent: readonly string[];
}

export const HELP_KEY = "app.onboarding.help.v1";
export const MAX_RECENT = 5;
export const EMPTY_HELP: HelpState = { reading: undefined, recent: [] };

const known = (id: string): boolean => ARTICLES.some((a) => a.id === id);

export function isReadingMode(v: unknown): v is ReadingMode {
  return v === "whole" || v === "steps";
}

export function parseHelpState(raw: string | null | undefined): HelpState {
  if (!raw) return EMPTY_HELP;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return EMPTY_HELP;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return EMPTY_HELP;
  const o = data as Record<string, unknown>;
  const reading = isReadingMode(o["reading"]) ? o["reading"] : undefined;
  const recent: string[] = [];
  if (Array.isArray(o["recent"])) {
    for (const id of o["recent"]) {
      if (typeof id === "string" && known(id) && !recent.includes(id)) recent.push(id);
      if (recent.length === MAX_RECENT) break;
    }
  }
  return { reading, recent };
}

export function serializeHelpState(s: HelpState): string {
  const out: Record<string, unknown> = {};
  if (s.reading) out["reading"] = s.reading;
  if (s.recent.length > 0) out["recent"] = s.recent.slice(0, MAX_RECENT);
  return JSON.stringify(out);
}

/** Puts an article first, drops repeats and keeps the list short. Ids that are not articles are ignored. */
export function recordRecent(s: HelpState, id: string): HelpState {
  if (!known(id)) return s;
  return { ...s, recent: [id, ...s.recent.filter((r) => r !== id)].slice(0, MAX_RECENT) };
}

export function clearRecent(s: HelpState): HelpState {
  return { ...s, recent: [] };
}

export function setReading(s: HelpState, mode: ReadingMode): HelpState {
  return { ...s, reading: mode };
}

export function loadHelpState(store: KeyValueStore | undefined): HelpState {
  if (!store) return EMPTY_HELP;
  try {
    return parseHelpState(store.getItem(HELP_KEY));
  } catch {
    return EMPTY_HELP;
  }
}

export type HelpSaveResult = "saved" | "unavailable";

export function saveHelpState(store: KeyValueStore | undefined, s: HelpState): HelpSaveResult {
  if (!store) return "unavailable";
  try {
    const text = serializeHelpState(s);
    // Nothing to remember: leave no key behind.
    if (text === "{}") store.removeItem(HELP_KEY);
    else store.setItem(HELP_KEY, text);
    return "saved";
  } catch {
    return "unavailable";
  }
}

/** Everything in this file, in the order the data article describes it. */
export function describeHelpState(s: HelpState): { readonly reading: ReadingMode | "unknown"; readonly recentCount: number } {
  return { reading: s.reading ?? "unknown", recentCount: s.recent.length };
}
