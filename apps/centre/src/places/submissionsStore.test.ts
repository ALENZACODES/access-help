import { describe, expect, it } from "vitest";
import { SUBMISSIONS_KEY, createSubmissionsStore, parseStoredLedger } from "./submissionsStore.js";
import { clearPlacesData, createDraftStore, DRAFTS_KEY, type KeyValueStorage } from "./store.js";
import { sampleRecords } from "./testing.js";

const TODAY = "2026-11-15";
const rec = { id: "s1", observedOn: "2026-11-01" };
const input = { markedOn: "2026-11-10", changeset: "", note: "" };

function memory(initial: Record<string, string> = {}): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const quota: KeyValueStorage = {
  getItem: () => null,
  setItem: () => {
    throw new DOMException("full", "QuotaExceededError");
  },
  removeItem: () => undefined,
};

describe("parseStoredLedger", () => {
  it("is empty for nothing, damaged JSON and the wrong shape", () => {
    for (const raw of [null, "{", "[]", "3", "null"]) expect(parseStoredLedger(raw)).toEqual({ version: 1, entries: [] });
  });
  it("keeps well-formed entries only", () => {
    const raw = JSON.stringify({ version: 1, entries: [{ recordId: "a", markedOn: "2026-11-01", changeset: null, note: "", lookedAgainOn: null }, { recordId: "b", markedOn: "bad" }] });
    expect(parseStoredLedger(raw).entries.map((e) => e.recordId)).toEqual(["a"]);
  });
});

describe("submissions store", () => {
  it("reads an empty ledger from empty storage", () => {
    expect(createSubmissionsStore(memory()).read()).toEqual({ version: 1, entries: [] });
  });
  it("marks an observation and keeps it", () => {
    const storage = memory();
    const store = createSubmissionsStore(storage);
    expect(store.mark(rec, { ...input, changeset: "#99" }, TODAY)).toEqual({ ok: true });
    expect(store.read().entries[0]).toMatchObject({ recordId: "s1", changeset: "99" });
    expect(JSON.parse(storage.data.get(SUBMISSIONS_KEY) ?? "{}").version).toBe(1);
  });
  it("returns the issues and writes nothing when a field is wrong", () => {
    const storage = memory();
    const result = createSubmissionsStore(storage).mark(rec, { ...input, markedOn: "2999-01-01" }, TODAY);
    expect(result).toMatchObject({ ok: false, kind: "issues" });
    expect(storage.data.has(SUBMISSIONS_KEY)).toBe(false);
  });
  it("notes a second look and removes a mark", () => {
    const store = createSubmissionsStore(memory());
    store.mark(rec, input, TODAY);
    expect(store.lookAgain("s1", "2026-11-14", TODAY)).toEqual({ ok: true });
    expect(store.read().entries[0]?.lookedAgainOn).toBe("2026-11-14");
    expect(store.lookAgain("s1", "2026-11-01", TODAY)).toMatchObject({ ok: false, kind: "issues" });
    expect(store.unmark("s1")).toEqual({ ok: true });
    expect(store.read().entries).toEqual([]);
  });
  it("reports a full device instead of throwing", () => {
    expect(createSubmissionsStore(quota).mark(rec, input, TODAY)).toEqual({ ok: false, kind: "save", reason: "storage-full" });
  });
  it("reads empty when storage throws", () => {
    const broken: KeyValueStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    expect(createSubmissionsStore(broken).read().entries).toEqual([]);
  });
  it("replaces the whole ledger for a restore", () => {
    const store = createSubmissionsStore(memory());
    store.mark(rec, input, TODAY);
    expect(store.replace({ version: 1, entries: [] })).toEqual({ ok: true });
    expect(store.read().entries).toEqual([]);
  });
  it("prunes marks for observations that are no longer saved, and writes nothing otherwise", () => {
    const storage = memory();
    const store = createSubmissionsStore(storage);
    store.mark(rec, input, TODAY);
    store.mark({ id: "s2", observedOn: "2026-11-01" }, input, TODAY);
    store.prune(["s2"]);
    expect(store.read().entries.map((e) => e.recordId)).toEqual(["s2"]);
    const before = storage.data.get(SUBMISSIONS_KEY);
    store.prune(["s2", "s9"]);
    expect(storage.data.get(SUBMISSIONS_KEY)).toBe(before);
  });
  it("clears its own key and nothing else", () => {
    const storage = memory({ other: "keep" });
    const store = createSubmissionsStore(storage);
    store.mark(rec, input, TODAY);
    store.clear();
    expect(storage.data.has(SUBMISSIONS_KEY)).toBe(false);
    expect(storage.data.get("other")).toBe("keep");
  });
  it("is removed when the person clears their places data", () => {
    const storage = memory();
    createDraftStore(storage).add(sampleRecords()[0]!);
    createSubmissionsStore(storage).mark(rec, input, TODAY);
    clearPlacesData(storage);
    expect(storage.data.has(SUBMISSIONS_KEY)).toBe(false);
    expect(storage.data.has(DRAFTS_KEY)).toBe(false);
  });
});
