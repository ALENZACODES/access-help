/**
 * Mapping days kept on this device. A mapping day is the person's own plan (area, date, cell
 * size) and their checklist ticks. Reads re-validate, so edited or damaged storage cannot put
 * an unchecked session on screen. Nothing here leaves the device.
 */
import { cleanTicks, parseSession, type MappingDay, type Ticks } from "./docs-bridge.js";
import type { KeyValueStorage } from "./store.js";

export const DAYS_KEY = "the-app-mapping-days";
export const MAX_DAYS = 12;

export interface SavedDay {
  session: MappingDay;
  ticks: Ticks;
}

export type DaySaveResult =
  | { ok: true }
  | { ok: false; reason: "storage-full" | "storage-unavailable" | "too-many" };

export interface DayStore {
  /** Saved days, soonest date first. A day that fails validation is left out, not repaired. */
  list(): SavedDay[];
  get(id: string): SavedDay | null;
  /** Saving a day with the id of a saved day replaces its session and keeps its ticks. */
  save(session: MappingDay): DaySaveResult;
  setTicks(id: string, ticks: Ticks): DaySaveResult;
  remove(id: string): void;
  clear(): void;
}

function readAll(storage: KeyValueStorage): SavedDay[] {
  let raw: string | null;
  try {
    raw = storage.getItem(DAYS_KEY);
  } catch {
    return [];
  }
  if (raw === null) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return [];
  }
  const items = (value as { days?: unknown } | null)?.days;
  if (!Array.isArray(items)) return [];
  const out: SavedDay[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const parsed = parseSession((item as { session?: unknown } | null)?.session);
    if (!parsed.ok || seen.has(parsed.session.id)) continue;
    seen.add(parsed.session.id);
    out.push({ session: parsed.session, ticks: cleanTicks((item as { ticks?: unknown }).ticks) });
  }
  return out.slice(0, MAX_DAYS);
}

function sorted(days: SavedDay[]): SavedDay[] {
  return [...days].sort((a, b) => a.session.date.localeCompare(b.session.date) || a.session.id.localeCompare(b.session.id));
}

function write(storage: KeyValueStorage, days: readonly SavedDay[]): DaySaveResult {
  try {
    storage.setItem(DAYS_KEY, JSON.stringify({ v: 1, days }));
    return { ok: true };
  } catch (error) {
    const quota = error instanceof DOMException && (error.name === "QuotaExceededError" || error.code === 22);
    return { ok: false, reason: quota ? "storage-full" : "storage-unavailable" };
  }
}

export function createDayStore(storage: KeyValueStorage): DayStore {
  return {
    list: () => sorted(readAll(storage)),
    get: (id) => readAll(storage).find((day) => day.session.id === id) ?? null,
    save(session) {
      const days = readAll(storage);
      const existing = days.find((day) => day.session.id === session.id);
      if (!existing && days.length >= MAX_DAYS) return { ok: false, reason: "too-many" };
      const next = existing ? days.map((day) => (day.session.id === session.id ? { session, ticks: day.ticks } : day)) : [...days, { session, ticks: {} }];
      return write(storage, next);
    },
    setTicks(id, ticks) {
      const days = readAll(storage);
      if (!days.some((day) => day.session.id === id)) return { ok: false, reason: "storage-unavailable" };
      return write(
        storage,
        days.map((day) => (day.session.id === id ? { session: day.session, ticks: cleanTicks(ticks) } : day)),
      );
    },
    remove(id) {
      write(
        storage,
        readAll(storage).filter((day) => day.session.id !== id),
      );
    },
    clear() {
      try {
        storage.removeItem(DAYS_KEY);
      } catch {
        /* storage unavailable: nothing to clear */
      }
    },
  };
}
