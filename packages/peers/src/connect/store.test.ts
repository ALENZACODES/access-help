import { describe, expect, it } from "vitest";
import { PeerRequestStore } from "../store.js";
import type { KeyValueStorage } from "../store.js";
import { submitRequest } from "../submit.js";
import { createConnectionRequest, withdrawRequestConsent } from "./request.js";
import type { ConnectionRequest } from "./request.js";
import { RECORDED_ROUTING_TABLE } from "./routing.js";
import { ConnectionRequestStore, PEER_STORAGE_KEYS, deleteAllPeerData } from "./store.js";

const KEY = "access.peers.connection-requests.v1";

function memory(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

function made(id: string, now = "2026-11-16T10:00:00.000Z"): ConnectionRequest {
  const result = createConnectionRequest(
    {
      forWhom: "myself",
      contexts: ["work"],
      language: "en",
      ageConfirmed16Plus: true,
      consent: { prepare_summary: true, include_contexts: true },
    },
    { now, id, table: RECORDED_ROUTING_TABLE },
  );
  if (result.kind !== "accepted") throw new Error("expected accepted");
  return result.request;
}

describe("ConnectionRequestStore", () => {
  it("saves, lists newest first, replaces by id, gets and removes", () => {
    const store = new ConnectionRequestStore(memory());
    expect(store.list()).toEqual([]);
    expect(store.save(made("a", "2026-11-16T10:00:00.000Z"))).toBe(true);
    expect(store.save(made("b", "2026-11-16T12:00:00.000Z"))).toBe(true);
    expect(store.save(made("c", "2026-11-16T11:00:00.000Z"))).toBe(true);
    expect(store.list().map((request) => request.id)).toEqual(["b", "c", "a"]);

    const withdrawn = withdrawRequestConsent(made("a"), "2026-11-16T13:00:00.000Z");
    if (!withdrawn.ok) throw new Error("expected ok");
    store.save(withdrawn.request);
    expect(store.list()).toHaveLength(3);
    expect(store.get("a")?.moderation.state).toBe("closed");
    expect(store.get("a")?.moderation.audit).toHaveLength(2);

    store.remove("b");
    expect(store.list().map((request) => request.id)).toEqual(["c", "a"]);
    expect(store.get("b")).toBeUndefined();
  });

  it("removes the storage key itself when the last request is removed or everything is cleared", () => {
    const storage = memory();
    const store = new ConnectionRequestStore(storage);
    store.save(made("a"));
    store.remove("a");
    expect(storage.data.has(KEY)).toBe(false);
    store.save(made("a"));
    store.save(made("b"));
    store.clear();
    expect(storage.data.size).toBe(0);
    expect(store.list()).toEqual([]);
  });

  it("refuses to save an invalid request", () => {
    const storage = memory();
    const store = new ConnectionRequestStore(storage);
    expect(store.save({ ...made("a"), sentByApp: true } as never)).toBe(false);
    expect(store.save({ ...made("a"), diagnosis: "x" } as never)).toBe(false);
    expect(storage.data.size).toBe(0);
  });

  it("treats unreadable storage as empty and never returns a damaged entry", () => {
    const storage = memory();
    const store = new ConnectionRequestStore(storage);
    storage.setItem(KEY, "{not json");
    expect(store.list()).toEqual([]);
    storage.setItem(KEY, "{}");
    expect(store.list()).toEqual([]);
    const good = made("good");
    const tampered = { ...made("bad"), moderation: { ...good.moderation, state: "routed" } };
    storage.setItem(KEY, JSON.stringify([good, tampered, { id: "junk" }, null]));
    expect(store.list().map((request) => request.id)).toEqual(["good"]);
  });

  it("writes nothing but its own key", () => {
    const storage = memory();
    new ConnectionRequestStore(storage).save(made("a"));
    expect([...storage.data.keys()]).toEqual([KEY]);
  });
});

describe("deleteAllPeerData", () => {
  it("removes every key the package writes and leaves other keys alone", () => {
    const storage = memory();
    new ConnectionRequestStore(storage).save(made("a"));
    const older = submitRequest(
      { topic: "travel", language: "en", ageConfirmed16Plus: true },
      { now: "2026-11-15T12:00:00.000Z", id: "old" },
    );
    if (older.kind !== "accepted") throw new Error("expected accepted");
    new PeerRequestStore(storage).save(older.request);
    storage.setItem("another.package.key", "kept");
    expect([...storage.data.keys()].sort()).toEqual([...PEER_STORAGE_KEYS, "another.package.key"].sort());

    deleteAllPeerData(storage);
    expect([...storage.data.keys()]).toEqual(["another.package.key"]);

    const store = new ConnectionRequestStore(storage);
    store.save(made("b"));
    new PeerRequestStore(storage).save(older.request);
    store.deleteEverything();
    expect([...storage.data.keys()]).toEqual(["another.package.key"]);
    expect(new ConnectionRequestStore(storage).list()).toEqual([]);
    expect(new PeerRequestStore(storage).list()).toEqual([]);
  });
});
