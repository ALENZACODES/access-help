import { useMemo, useState } from "react";
import { mergePacks, type MergeResult } from "./packs.js";
import { createPackLibrary, type KeyValueStorage, type PackLibrary } from "./store.js";
import type { ParsedPack } from "./types.js";

export interface PlacesData {
  library: PackLibrary;
  packs: ParsedPack[];
  merged: MergeResult;
}

/** Reads the packs saved on this device once, and merges them. Every screen that shows a status uses this. */
export function usePlaces(storage: KeyValueStorage): PlacesData {
  const library = useMemo(() => createPackLibrary(storage), [storage]);
  const [packs] = useState<ParsedPack[]>(() => library.list());
  const merged = useMemo(() => mergePacks(packs), [packs]);
  return { library, packs, merged };
}
