/**
 * Saved searches: a name, the words, the access filter, the age limit, and a distance limit.
 * A saved search never keeps where the person is. The distance limit only applies when the
 * person asks for distance sorting again, and the App asks the device for the location again each time.
 */
import type { AccessFilter } from "./filter.js";
import type { KeyValueStorage, SaveResult } from "./store.js";

export const PRESETS_KEY = "the-app-search-presets";
export const MAX_PRESETS = 12;
export const MAX_LABEL = 40;
export const MAX_TEXT = 100;
export const AGE_LIMITS = [365, 730] as const;
export const RADIUS_KM = [1, 5, 25] as const;

export interface SearchPreset {
  id: string;
  label: string;
  text: string;
  access: AccessFilter;
  maxAgeDays: (typeof AGE_LIMITS)[number] | null;
  radiusKm: (typeof RADIUS_KM)[number] | null;
}

const ACCESS: readonly AccessFilter[] = ["any", "yes", "yes-or-limited"];

function oneLine(value: unknown, limit: number): string {
  return typeof value === "string" ? value.replace(/[\p{Cc}\p{Zl}\p{Zp}]+/gu, " ").replace(/\s{2,}/g, " ").trim().slice(0, limit) : "";
}

export function cleanPresets(value: unknown): SearchPreset[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: SearchPreset[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const entry = item as Record<string, unknown>;
    const id = oneLine(entry.id, 60);
    const label = oneLine(entry.label, MAX_LABEL);
    if (id === "" || label === "" || seen.has(id)) continue;
    const access = (ACCESS as readonly unknown[]).includes(entry.access) ? (entry.access as AccessFilter) : "any";
    const maxAgeDays = (AGE_LIMITS as readonly unknown[]).includes(entry.maxAgeDays) ? (entry.maxAgeDays as SearchPreset["maxAgeDays"]) : null;
    const radiusKm = (RADIUS_KM as readonly unknown[]).includes(entry.radiusKm) ? (entry.radiusKm as SearchPreset["radiusKm"]) : null;
    seen.add(id);
    out.push({ id, label, text: oneLine(entry.text, MAX_TEXT), access, maxAgeDays, radiusKm });
    if (out.length >= MAX_PRESETS) break;
  }
  return out;
}

export function newPresetId(nowMs: number, random: () => number): string {
  return `search-${nowMs.toString(36)}-${Math.floor(random() * 36 ** 3).toString(36).padStart(3, "0")}`;
}

export type AddPresetResult = SaveResult | { ok: false; reason: "too-many" | "label-required" };

export interface PresetStore {
  list(): SearchPreset[];
  add(preset: SearchPreset): AddPresetResult;
  remove(id: string): void;
  clear(): void;
}

export function createPresetStore(storage: KeyValueStorage): PresetStore {
  function read(): SearchPreset[] {
    try {
      const raw = storage.getItem(PRESETS_KEY);
      return raw === null ? [] : cleanPresets(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  function write(presets: readonly SearchPreset[]): SaveResult {
    try {
      storage.setItem(PRESETS_KEY, JSON.stringify(presets));
      return { ok: true };
    } catch (error) {
      const quota = error instanceof DOMException && (error.name === "QuotaExceededError" || error.code === 22);
      return { ok: false, reason: quota ? "storage-full" : "storage-unavailable" };
    }
  }
  return {
    list: read,
    add(preset) {
      const [clean] = cleanPresets([preset]);
      if (clean === undefined) return { ok: false, reason: "label-required" };
      const current = read().filter((item) => item.id !== clean.id);
      if (current.length >= MAX_PRESETS) return { ok: false, reason: "too-many" };
      return write([...current, clean]);
    },
    remove(id) {
      write(read().filter((item) => item.id !== id));
    },
    clear() {
      try {
        storage.removeItem(PRESETS_KEY);
      } catch {
        /* nothing to clear */
      }
    },
  };
}
