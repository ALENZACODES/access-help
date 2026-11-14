import { emptyRecord, type DemoRecord } from "./types.js";

export const STORAGE_KEY = "the-app-demo-record";

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** The record stays on this device. A damaged copy is not repaired silently. */
export function loadRecord(storage: KeyValueStore): { record: DemoRecord; damaged: boolean } {
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { record: emptyRecord(), damaged: false };
  }
  if (!raw) return { record: emptyRecord(), damaged: false };
  try {
    const parsed = JSON.parse(raw) as Partial<DemoRecord>;
    const base = emptyRecord();
    const arrays = ["roles", "sectionsShown", "questions", "tracker", "answers", "checks", "checkIns"] as const;
    if (typeof parsed !== "object" || parsed === null || arrays.some((key) => parsed[key] !== undefined && !Array.isArray(parsed[key]))) {
      return { record: base, damaged: true };
    }
    return { record: { ...base, ...parsed } as DemoRecord, damaged: false };
  } catch {
    return { record: emptyRecord(), damaged: true };
  }
}

export function saveRecord(storage: KeyValueStore, record: DemoRecord): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function clearRecord(storage: KeyValueStore): void {
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to remove.
  }
}
