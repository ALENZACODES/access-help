import { openDB, type IDBPDatabase } from "idb";
import type { HelpCache, HelpPack } from "./types.js";

const DB_NAME = "the-app-help";
const STORE = "packs";
const PACK_KEY = "current";

interface MemoryRecord {
  pack: HelpPack | null;
}

/** Test and non-browser cache. Nothing leaves the process. */
export function memoryHelpCache(seed?: HelpPack | null): HelpCache & { peek(): HelpPack | null } {
  const record: MemoryRecord = { pack: seed ?? null };
  return {
    async load() {
      return record.pack;
    },
    async save(pack) {
      record.pack = pack;
    },
    async clear() {
      record.pack = null;
    },
    peek() {
      return record.pack;
    },
  };
}

let database: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  if (!database) {
    database = openDB(DB_NAME, 1, {
      upgrade(upgradeDb) {
        upgradeDb.createObjectStore(STORE);
      },
    });
  }
  return database;
}

/**
 * IndexedDB cache for the help pack. Used in the browser.
 * The pack is the App's own articles, not a third-party page.
 */
export function indexedDbHelpCache(): HelpCache {
  return {
    async load() {
      const databaseHandle = await db();
      const pack = await databaseHandle.get(STORE, PACK_KEY);
      return (pack as HelpPack | undefined) ?? null;
    },
    async save(pack) {
      const databaseHandle = await db();
      await databaseHandle.put(STORE, pack, PACK_KEY);
    },
    async clear() {
      const databaseHandle = await db();
      await databaseHandle.delete(STORE, PACK_KEY);
    },
  };
}

export function browserHelpCache(): HelpCache {
  if (typeof indexedDB === "undefined") {
    return memoryHelpCache();
  }
  return indexedDbHelpCache();
}
