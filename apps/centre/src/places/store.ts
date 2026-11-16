/**
 * On-device storage for the saved pack and the person's draft observations.
 * Nothing here leaves the device. Reads re-validate, so edited or damaged
 * storage cannot put an unchecked status on screen.
 */
import { buildExport, buildPackManifest, serializePack } from "./docs-bridge.js";
import { parsePack } from "./pack.js";
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

export interface PackStore {
  load(): ParsedPack | null;
  save(pack: ParsedPack): SaveResult;
  clear(): void;
}

export function createPackStore(storage: KeyValueStorage): PackStore {
  return {
    load() {
      try {
        const raw = storage.getItem(PACK_KEY);
        if (raw === null) return null;
        const parsed = parsePack(raw);
        return parsed.ok ? parsed.pack : null;
      } catch {
        return null;
      }
    },
    save(pack) {
      return trySet(storage, PACK_KEY, serializePack(pack.records, pack.manifest));
    },
    clear() {
      try {
        storage.removeItem(PACK_KEY);
      } catch {
        /* storage unavailable: nothing to clear */
      }
    },
  };
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
