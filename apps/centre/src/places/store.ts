/**
 * On-device storage for the saved pack and the person's draft observations.
 * Nothing here leaves the device. Reads re-validate, so edited or damaged
 * storage cannot put an unchecked status on screen.
 */
import { clearAskData } from "./askStore.js";
import { clearCardsData } from "./cardsStore.js";
import { clearDayNotesData } from "./dayNotesStore.js";
import { clearLicenceTicksData } from "./licenceTicksStore.js";
import { clearMatchData } from "./matchStore.js";
import { clearMeasuresData } from "./measuresStore.js";
import { buildExport, buildPackManifest, serializePack } from "./docs-bridge.js";
import { parsePack } from "./pack.js";
import { clearReviewData } from "./reviewStore.js";
import { createPresetStore } from "./presets.js";
import { createSavedStore } from "./saved.js";
import { clearSittingData } from "./sittingStore.js";
import { clearSubmissionsData } from "./submissionsStore.js";
import type { ParsedPack, PlaceRecord } from "./types.js";

export type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const PACK_KEY = "the-app-places-pack";
export const DRAFTS_KEY = "the-app-place-drafts";
export const MAX_DRAFTS = 200;

export type SaveResult = { ok: true } | { ok: false; reason: "storage-full" | "storage-unavailable" };

function trySet(storage: KeyValueStorage, key: string, value: string): SaveResult {
  try {
    storage.setItem(key, value);
    return { ok: true };
  } catch (error) {
    const quota = error instanceof DOMException && (error.name === "QuotaExceededError" || error.code === 22);
    return { ok: false, reason: quota ? "storage-full" : "storage-unavailable" };
  }
}

export const LIBRARY_KEY = "the-app-places-packs";
export const MAX_PACKS = 8;

export interface PackLibrary {
  /** Packs in the order they were saved. */
  list(): ParsedPack[];
  /** Saving a pack with the id of a saved pack replaces it. */
  save(pack: ParsedPack): SaveResult | { ok: false; reason: "too-many-packs" };
  remove(packId: string): void;
  clear(): void;
}

/**
 * Keeps up to MAX_PACKS packs. A pack saved by the first version under PACK_KEY is
 * read as a one-pack library and moved to the new key on the next save.
 */
export function createPackLibrary(storage: KeyValueStorage): PackLibrary {
  function readTexts(): string[] {
    try {
      const raw = storage.getItem(LIBRARY_KEY);
      if (raw === null) {
        const legacy = storage.getItem(PACK_KEY);
        return legacy === null ? [] : [legacy];
      }
      const value: unknown = JSON.parse(raw);
      const packs = (value as { packs?: unknown } | null)?.packs;
      return Array.isArray(packs) ? packs.filter((item): item is string => typeof item === "string") : [];
    } catch {
      return [];
    }
  }
  function list(): ParsedPack[] {
    const packs: ParsedPack[] = [];
    for (const text of readTexts()) {
      const parsed = parsePack(text);
      // Re-checked on every read, so edited storage cannot put an unchecked status on screen.
      if (parsed.ok) packs.push(parsed.pack);
    }
    return packs.slice(0, MAX_PACKS);
  }
  function write(packs: readonly ParsedPack[]): SaveResult {
    const texts = packs.map((pack) => serializePack(pack.records, pack.manifest));
    const result = trySet(storage, LIBRARY_KEY, JSON.stringify({ v: 1, packs: texts }));
    if (result.ok) {
      try {
        storage.removeItem(PACK_KEY);
      } catch {
        /* nothing to remove */
      }
    }
    return result;
  }
  return {
    list,
    save(pack) {
      const current = list();
      const others = current.filter((item) => item.manifest.packId !== pack.manifest.packId);
      if (others.length >= MAX_PACKS) return { ok: false, reason: "too-many-packs" };
      return write([...others, pack]);
    },
    remove(packId) {
      write(list().filter((item) => item.manifest.packId !== packId));
    },
    clear() {
      try {
        storage.removeItem(LIBRARY_KEY);
        storage.removeItem(PACK_KEY);
      } catch {
        /* storage unavailable: nothing to clear */
      }
    },
  };
}

/** Removes every places record this App keeps on the device: packs, drafts, saved places, and saved searches. */
export function clearPlacesData(storage: KeyValueStorage): void {
  createPackLibrary(storage).clear();
  createDraftStore(storage).clear();
  clearReviewData(storage);
  createSavedStore(storage).clear();
  createPresetStore(storage).clear();
  clearSubmissionsData(storage);
  clearDayNotesData(storage);
  clearLicenceTicksData(storage);
  clearSittingData(storage);
  clearMeasuresData(storage);
  clearAskData(storage);
  clearMatchData(storage);
  clearCardsData(storage);
}

export interface DraftStore {
  list(): PlaceRecord[];
  add(record: PlaceRecord): SaveResult | { ok: false; reason: "too-many" };
  remove(id: string): void;
  clear(): void;
}

export function createDraftStore(storage: KeyValueStorage): DraftStore {
  function read(): PlaceRecord[] {
    try {
      const raw = storage.getItem(DRAFTS_KEY);
      if (raw === null) return [];
      const value: unknown = JSON.parse(raw);
      if (!Array.isArray(value)) return [];
      // Re-run the export rules on every read.
      return buildExport(value as never[]).records.slice(0, MAX_DRAFTS);
    } catch {
      return [];
    }
  }
  function write(records: readonly PlaceRecord[]): SaveResult {
    return trySet(storage, DRAFTS_KEY, JSON.stringify(records));
  }
  return {
    list: read,
    add(record) {
      const current = read();
      if (current.length >= MAX_DRAFTS) return { ok: false, reason: "too-many" };
      return write([...current.filter((item) => item.id !== record.id), record]);
    },
    remove(id) {
      write(read().filter((item) => item.id !== id));
    },
    clear() {
      try {
        storage.removeItem(DRAFTS_KEY);
      } catch {
        /* nothing to clear */
      }
    },
  };
}

/** Pack built from the person's own drafts, ready to download or to keep on this device. */
export function draftsAsPack(records: readonly PlaceRecord[], today: string): ParsedPack {
  return { manifest: buildPackManifest("my-observations", records, today), records: [...records], warnings: [] };
}
