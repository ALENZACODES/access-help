import type { KeyValueStorage } from "../store.js";
import type { ConnectionRequest } from "./request.js";
import { validateConnectionRequest } from "./validate.js";

const KEY = "access.peers.connection-requests.v1";

/** Every storage key this package writes. "Delete everything" removes each of them. */
export const PEER_STORAGE_KEYS: readonly string[] = ["access.peers.requests.v1", KEY];

/**
 * On-device history of peer-connection requests. Nothing leaves the device.
 * A stored item that no longer passes validation is not returned and is dropped at the
 * next write, so a damaged or hand-edited entry can never be shown as a request.
 */
export class ConnectionRequestStore {
  constructor(private readonly storage: KeyValueStorage) {}

  /** Newest first. */
  list(): ConnectionRequest[] {
    const raw = this.storage.getItem(KEY);
    if (!raw) {
      return [];
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
    if (!Array.isArray(parsed)) {
      return [];
    }
    const valid = parsed.filter((item): item is ConnectionRequest => validateConnectionRequest(item).valid);
    return valid.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  }

  get(id: string): ConnectionRequest | undefined {
    return this.list().find((request) => request.id === id);
  }

  /** Add a request, or replace the one with the same id. Refuses an invalid request. */
  save(request: ConnectionRequest): boolean {
    if (!validateConnectionRequest(request).valid) {
      return false;
    }
    const others = this.list().filter((existing) => existing.id !== request.id);
    this.storage.setItem(KEY, JSON.stringify([...others, request]));
    return true;
  }

  remove(id: string): void {
    const remaining = this.list().filter((request) => request.id !== id);
    if (remaining.length === 0) {
      this.storage.removeItem(KEY);
    } else {
      this.storage.setItem(KEY, JSON.stringify(remaining));
    }
  }

  /** Remove every request and its audit trail. */
  clear(): void {
    this.storage.removeItem(KEY);
  }

  /** Remove everything this package keeps on the device, older request formats included. */
  deleteEverything(): void {
    deleteAllPeerData(this.storage);
  }
}

/** Remove everything this package keeps on the device, in every format it has used. */
export function deleteAllPeerData(storage: KeyValueStorage): void {
  for (const key of PEER_STORAGE_KEYS) {
    storage.removeItem(key);
  }
}
