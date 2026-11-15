import type { PeerRequest } from "./types.js";

/** The subset of the Web Storage API used here. A Map-backed shim satisfies it in tests. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const KEY = "access.peers.requests.v1";

/** On-device storage for peer requests. Nothing leaves the device. */
export class PeerRequestStore {
  constructor(private readonly storage: KeyValueStorage) {}

  list(): PeerRequest[] {
    const raw = this.storage.getItem(KEY);
    if (!raw) {
      return [];
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as PeerRequest[]) : [];
    } catch {
      return [];
    }
  }

  save(request: PeerRequest): void {
    const others = this.list().filter((existing) => existing.id !== request.id);
    this.storage.setItem(KEY, JSON.stringify([...others, request]));
  }

  remove(id: string): void {
    this.storage.setItem(KEY, JSON.stringify(this.list().filter((request) => request.id !== id)));
  }

  clear(): void {
    this.storage.removeItem(KEY);
  }
}
