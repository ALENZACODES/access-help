import {
  SCAN_INTERVALS_MS,
  type Locale,
  type MoveMode,
  type ScanMs,
} from "../../switch-first/src/index";
import { isLocale } from "./locale";

/**
 * Local-only preferences. Three fields are stored on this device and
 * nowhere else: language, movement mode and highlight interval. Nothing is sent
 * over the network. A missing or invalid field stays undefined (unknown).
 */
export interface Prefs {
  readonly locale: Locale | undefined;
  readonly mode: MoveMode | undefined;
  readonly scanMs: ScanMs | undefined;
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const PREFS_KEY = "app.onboarding.prefs.v1";
export const EMPTY_PREFS: Prefs = { locale: undefined, mode: undefined, scanMs: undefined };

const MODES: readonly string[] = ["keyboard", "switch", "pointer"];

export function parsePrefs(raw: string | null | undefined): Prefs {
  if (!raw) return EMPTY_PREFS;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return EMPTY_PREFS;
  }
  if (!data || typeof data !== "object") return EMPTY_PREFS;
  const o = data as Record<string, unknown>;
  const locale = isLocale(o["locale"]) ? o["locale"] : undefined;
  const mode =
    typeof o["mode"] === "string" && MODES.includes(o["mode"])
      ? (o["mode"] as MoveMode)
      : undefined;
  const scan = SCAN_INTERVALS_MS.find((ms) => ms === o["scanMs"]);
  // A highlight interval only makes sense for single-switch use.
  const scanMs = mode === "switch" ? scan : undefined;
  return { locale, mode, scanMs };
}

export function serializePrefs(p: Prefs): string {
  const out: Record<string, string | number> = {};
  if (p.locale) out["locale"] = p.locale;
  if (p.mode) out["mode"] = p.mode;
  if (p.mode === "switch" && p.scanMs) out["scanMs"] = p.scanMs;
  return JSON.stringify(out);
}

export function loadPrefs(store: KeyValueStore | undefined): Prefs {
  if (!store) return EMPTY_PREFS;
  try {
    return parsePrefs(store.getItem(PREFS_KEY));
  } catch {
    return EMPTY_PREFS;
  }
}

export type SaveResult = "saved" | "unavailable";

export function savePrefs(store: KeyValueStore | undefined, p: Prefs): SaveResult {
  if (!store) return "unavailable";
  try {
    store.setItem(PREFS_KEY, serializePrefs(p));
    return "saved";
  } catch {
    return "unavailable";
  }
}

export function clearPrefs(store: KeyValueStore | undefined): void {
  try {
    store?.removeItem(PREFS_KEY);
  } catch {
    /* nothing to clear */
  }
}

/** localStorage when the browser allows it, otherwise undefined. */
export function safeLocalStorage(win: { localStorage: KeyValueStore }): KeyValueStore | undefined {
  try {
    return win.localStorage;
  } catch {
    return undefined;
  }
}

export function memoryStore(): KeyValueStore {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}
