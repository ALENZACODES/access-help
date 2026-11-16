/**
 * A backup file of everything this App keeps on the device: packs, the
 * person's own observations, saved places with notes, and display settings.
 * It is made and read on the device. Nothing is sent.
 *
 * Restoring adds to what is already here and removes nothing. Every part of a
 * backup file goes through the same checks as a fresh load: packs are parsed
 * again, so an unrecognised status becomes UNKNOWN; observations go through the
 * export rules, so one without a source or an open licence is left out; saved
 * places are cleaned. If any write fails, everything is put back as it was.
 */
import { cleanPrefs, PREFS_KEY, savePrefs, type Prefs } from "../settings/prefs.js";
import { buildExport, serializePack } from "./docs-bridge.js";
import { parsePack } from "./pack.js";
import { cleanPresets, createPresetStore, PRESETS_KEY, type SearchPreset } from "./presets.js";
import { cleanSaved, createSavedStore, SAVED_KEY, type SavedPlace } from "./saved.js";
import {
  createDraftStore,
  createPackLibrary,
  DRAFTS_KEY,
  LIBRARY_KEY,
  MAX_DRAFTS,
  MAX_PACKS,
  PACK_KEY,
  type KeyValueStorage,
} from "./store.js";
import type { ParsedPack, PlaceRecord } from "./types.js";

export const BACKUP_APP = "the-app-device-backup";
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_CHARACTERS = 6_000_000;

export interface BackupFile {
  app: typeof BACKUP_APP;
  v: typeof BACKUP_VERSION;
  createdOn: string;
  /** Each entry is a pack file, as written by serializePack. */
  packs: string[];
  drafts: PlaceRecord[];
  saved: SavedPlace[];
  /** Saved searches. A backup made before saved searches existed has none. */
  presets: SearchPreset[];
  prefs: Prefs | null;
}

function readPrefs(storage: KeyValueStorage): Prefs | null {
  try {
    const raw = storage.getItem(PREFS_KEY);
    return raw === null ? null : cleanPrefs(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function createBackup(storage: KeyValueStorage, today: string): string {
  const file: BackupFile = {
    app: BACKUP_APP,
    v: BACKUP_VERSION,
    createdOn: today,
    packs: createPackLibrary(storage)
      .list()
      .map((pack) => serializePack(pack.records, pack.manifest)),
    drafts: createDraftStore(storage).list(),
    saved: createSavedStore(storage).list(),
    presets: createPresetStore(storage).list(),
    prefs: readPrefs(storage),
  };
  return JSON.stringify(file, null, 2);
}

export type RestoreFailure = "too-large" | "not-json" | "not-a-backup" | "unsupported-version" | "empty" | "storage-failed";

export interface RestoreSummary {
  packs: number;
  drafts: number;
  saved: number;
  presets: number;
  prefsRestored: boolean;
  /** Packs, observations, or saved places in the file that could not be read or did not fit. */
  skipped: number;
}

export type RestoreResult = { ok: true; summary: RestoreSummary; prefs: Prefs | null } | { ok: false; code: RestoreFailure };

const KEYS = [LIBRARY_KEY, PACK_KEY, DRAFTS_KEY, SAVED_KEY, PRESETS_KEY, PREFS_KEY] as const;

function snapshot(storage: KeyValueStorage): Map<string, string | null> {
  return new Map(KEYS.map((key) => [key, storage.getItem(key)]));
}

function rollback(storage: KeyValueStorage, before: ReadonlyMap<string, string | null>): void {
  for (const [key, value] of before) {
    try {
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, value);
    } catch {
      /* the device refuses writes; nothing more can be done */
    }
  }
}

export function restoreBackup(text: string, storage: KeyValueStorage): RestoreResult {
  if (text.length > MAX_BACKUP_CHARACTERS) return { ok: false, code: "too-large" };
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, code: "not-json" };
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return { ok: false, code: "not-a-backup" };
  const file = value as Record<string, unknown>;
  if (file.app !== BACKUP_APP) return { ok: false, code: "not-a-backup" };
  if (file.v !== BACKUP_VERSION) return { ok: false, code: "unsupported-version" };

  let skipped = 0;

  const packs: ParsedPack[] = [];
  const packTexts = Array.isArray(file.packs) ? file.packs : [];
  for (const item of packTexts) {
    const parsed = typeof item === "string" ? parsePack(item) : null;
    if (parsed?.ok) packs.push(parsed.pack);
    else skipped += 1;
  }

  const draftInput = Array.isArray(file.drafts) ? (file.drafts as never[]) : [];
  const built = buildExport(draftInput);
  skipped += built.rejected.length + (draftInput.length - built.records.length - built.rejected.length);

  const savedInput = Array.isArray(file.saved) ? file.saved : [];
  const saved = cleanSaved(savedInput);
  skipped += savedInput.length - saved.length;

  const presetInput = Array.isArray(file.presets) ? file.presets : [];
  const presets = cleanPresets(presetInput);
  skipped += presetInput.length - presets.length;

  const prefs = file.prefs === null || file.prefs === undefined ? null : cleanPrefs(file.prefs);

  if (packs.length === 0 && built.records.length === 0 && saved.length === 0 && presets.length === 0 && prefs === null) {
    return { ok: false, code: "empty" };
  }

  const before = snapshot(storage);
  const library = createPackLibrary(storage);
  const drafts = createDraftStore(storage);
  const savedStore = createSavedStore(storage);
  const presetStore = createPresetStore(storage);
  let presetsAdded = 0;
  let packsAdded = 0;
  let draftsAdded = 0;
  let savedAdded = 0;
  try {
    for (const pack of packs) {
      const result = library.save(pack);
      if (result.ok) packsAdded += 1;
      else if (result.reason === "too-many-packs") skipped += 1;
      else throw new Error(result.reason);
    }
    const knownDrafts = new Set(drafts.list().map((record) => record.id));
    for (const record of built.records) {
      if (knownDrafts.has(record.id)) continue;
      const result = drafts.add(record);
      if (result.ok) draftsAdded += 1;
      else if (result.reason === "too-many") skipped += 1;
      else throw new Error(result.reason);
    }
    const knownSaved = new Set(savedStore.list().map((entry) => entry.id));
    for (const entry of saved) {
      if (knownSaved.has(entry.id)) continue;
      const result = savedStore.add(entry);
      if (result.ok) savedAdded += 1;
      else if (result.reason === "too-many") skipped += 1;
      else throw new Error(result.reason);
    }
    const knownPresets = new Set(presetStore.list().map((entry) => entry.id));
    for (const entry of presets) {
      if (knownPresets.has(entry.id)) continue;
      const result = presetStore.add(entry);
      if (result.ok) presetsAdded += 1;
      else if (result.reason === "too-many") skipped += 1;
      else throw new Error(result.reason);
    }
    if (prefs !== null && !savePrefs(storage, prefs)) throw new Error("prefs");
  } catch {
    rollback(storage, before);
    return { ok: false, code: "storage-failed" };
  }

  return {
    ok: true,
    prefs,
    summary: { packs: packsAdded, drafts: draftsAdded, saved: savedAdded, presets: presetsAdded, prefsRestored: prefs !== null, skipped },
  };
}

export { MAX_DRAFTS, MAX_PACKS };
