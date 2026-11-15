import { describe, expect, it } from "vitest";
import { PeerRequestStore } from "./store.js";
import type { KeyValueStorage } from "./store.js";
import { submitRequest } from "./submit.js";

function memory(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

function made(id: string) {
  const result = submitRequest(
    { topic: "travel", language: "en", ageConfirmed16Plus: true },
    { now: "2026-11-15T12:00:00.000Z", id },
  );
  if (result.kind !== "accepted") throw new Error("expected accepted");
  return result.request;
}

describe("PeerRequestStore", () => {
  it("saves, lists, replaces by id, removes and clears", () => {
    const store = new PeerRequestStore(memory());
    expect(store.list()).toEqual([]);
    store.save(made("a"));
    store.save(made("b"));
    store.save(made("a"));
    expect(store.list().map((request) => request.id)).toEqual(["b", "a"]);
    store.remove("b");
    expect(store.list().map((request) => request.id)).toEqual(["a"]);
    store.clear();
    expect(store.list()).toEqual([]);
  });

  it("treats unreadable storage as empty", () => {
    const storage = memory();
    storage.setItem("access.peers.requests.v1", "{not json");
    expect(new PeerRequestStore(storage).list()).toEqual([]);
    storage.setItem("access.peers.requests.v1", "{}");
    expect(new PeerRequestStore(storage).list()).toEqual([]);
  });
});
