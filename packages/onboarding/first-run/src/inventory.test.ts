import { describe, expect, it } from "vitest";
import { auditCopy } from "./audit";
import { addNote } from "./outbox";
import { DEFAULT_DISPLAY } from "./display";
import { ITEMS, clearAll, clearItem, formatKb, getItem, hasAnything, inspectAll, inspectItem, inventoryStrings, totalBytes } from "./inventory";
import { memoryStore, type KeyValueStore } from "./store";
import { makeRng, randomNotes } from "./testkit";

const item = (id: string) => getItem(id) as NonNullable<ReturnType<typeof getItem>>;

function withNotes(n: number): KeyValueStore {
  const store = memoryStore();
  for (const note of randomNotes(makeRng(7), n)) addNote(store, note);
  return store;
}

describe("the list of items", () => {
  it("has one item for each key the App saves, with unique ids and keys", () => {
    expect(ITEMS.map((i) => i.id)).toEqual(["notes", "shortlist", "needs", "checklist", "draft", "survey", "asked", "bin", "corrections", "passport", "need-sets", "visits", "display", "prefs"]);
    expect(new Set(ITEMS.map((i) => i.key)).size).toBe(ITEMS.length);
    for (const i of ITEMS) expect(i.key).toMatch(/^app\.onboarding\.[a-z]+\.v1$/);
  });

  it("passes the copy audit in both languages", () => {
    expect(auditCopy(inventoryStrings())).toEqual([]);
  });

  it("finds an item by id and nothing else", () => {
    expect(getItem("notes")?.title.en).toBe("My notes");
    expect(getItem("nope")).toBeUndefined();
    expect(getItem(undefined)).toBeUndefined();
  });
});

describe("inspectItem", () => {
  it("says empty when nothing is saved", () => {
    const store = memoryStore();
    for (const r of inspectAll(store)) expect(r, r.id).toEqual({ id: r.id, state: "empty", count: undefined, bytes: 0 });
    expect(hasAnything(inspectAll(store))).toBe(false);
  });

  it("counts the notes it can read, and sizes them", () => {
    const store = withNotes(3);
    const r = inspectItem(store, item("notes"));
    expect(r.state).toBe("saved");
    expect(r.count).toBe(3);
    expect(r.bytes).toBeGreaterThan(100);
  });

  it("counts a shortlist and a checklist", () => {
    const store = memoryStore();
    store.setItem(item("shortlist").key, JSON.stringify(["a-1", "b-2", "a-1", "BAD ID"]));
    expect(inspectItem(store, item("shortlist")).count).toBe(2);
    store.setItem(item("checklist").key, JSON.stringify({ "a-1": { "step-free-entry": { asked: true, answer: "" } }, "b-2": { "step-free-entry": { asked: false, answer: "Ask staff" } } }));
    expect(inspectItem(store, item("checklist")).count).toBe(2);
  });

  it("does not make up a count for items that are not lists", () => {
    const store = memoryStore();
    store.setItem(item("display").key, JSON.stringify({ ...DEFAULT_DISPLAY, scale: "150" }));
    store.setItem(item("prefs").key, JSON.stringify({ locale: "fr" }));
    store.setItem(item("draft").key, JSON.stringify({ placeName: "x" }));
    for (const id of ["display", "prefs", "draft"]) {
      const r = inspectItem(store, item(id));
      expect(r.state, id).toBe("saved");
      expect(r.count, id).toBeUndefined();
    }
  });

  it("reports text that is not JSON as unreadable, not empty", () => {
    const store = memoryStore();
    store.setItem(item("notes").key, "{not json");
    const r = inspectItem(store, item("notes"));
    expect(r.state).toBe("unreadable");
    expect(r.bytes).toBe(9);
    expect(hasAnything([r])).toBe(true);
  });

  it("reports a list whose entries are all invalid as unreadable", () => {
    const store = memoryStore();
    store.setItem(item("notes").key, JSON.stringify([{ nope: 1 }, 5]));
    expect(inspectItem(store, item("notes")).state).toBe("unreadable");
    store.setItem(item("shortlist").key, JSON.stringify(["NOT VALID"]));
    expect(inspectItem(store, item("shortlist")).state).toBe("unreadable");
  });

  it("treats an empty list or object as nothing saved", () => {
    const store = memoryStore();
    store.setItem(item("notes").key, "[]");
    store.setItem(item("needs").key, "{}");
    expect(inspectItem(store, item("notes")).state).toBe("empty");
    expect(inspectItem(store, item("needs")).state).toBe("empty");
  });

  it("says unavailable when the browser will not let the App look, and when there is no store", () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    expect(inspectItem(broken, item("notes")).state).toBe("unavailable");
    expect(inspectItem(undefined, item("notes")).state).toBe("unavailable");
  });

  it("counts bytes as UTF-8, so accented text is not undercounted", () => {
    const store = memoryStore();
    store.setItem(item("draft").key, JSON.stringify({ placeName: "éééé" }));
    expect(inspectItem(store, item("draft")).bytes).toBe(new TextEncoder().encode('{"placeName":"éééé"}').length);
  });

  it("adds sizes up", () => {
    const store = withNotes(2);
    store.setItem(item("prefs").key, '{"locale":"en"}');
    const reports = inspectAll(store);
    expect(totalBytes(reports)).toBe(reports.reduce((n, r) => n + r.bytes, 0));
    expect(totalBytes([])).toBe(0);
  });
});

describe("clearItem and clearAll", () => {
  it("clears one item and leaves the others", () => {
    const store = withNotes(2);
    store.setItem(item("shortlist").key, JSON.stringify(["a-1"]));
    expect(clearItem(store, "notes")).toBe("cleared");
    expect(inspectItem(store, item("notes")).state).toBe("empty");
    expect(inspectItem(store, item("shortlist")).state).toBe("saved");
  });

  it("is fine to clear something that is not there", () => {
    expect(clearItem(memoryStore(), "draft")).toBe("cleared");
  });

  it("says unavailable when removal throws or does not take effect, or there is no store", () => {
    const throws: KeyValueStore = { getItem: () => "x", setItem: () => undefined, removeItem: () => { throw new Error("blocked"); } };
    const sticks: KeyValueStore = { getItem: () => "x", setItem: () => undefined, removeItem: () => undefined };
    expect(clearItem(throws, "notes")).toBe("unavailable");
    expect(clearItem(sticks, "notes")).toBe("unavailable");
    expect(clearItem(undefined, "notes")).toBe("unavailable");
  });

  it("clears every item that has something and reports what failed", () => {
    const store = withNotes(1);
    store.setItem(item("display").key, JSON.stringify(DEFAULT_DISPLAY));
    store.setItem(item("prefs").key, "garbage");
    const r = clearAll(store);
    expect(r.cleared.sort()).toEqual(["display", "notes", "prefs"]);
    expect(r.failed).toEqual([]);
    expect(hasAnything(inspectAll(store))).toBe(false);
  });

  it("reports the items that could not be cleared", () => {
    const inner = memoryStore();
    inner.setItem(item("notes").key, JSON.stringify([]) + " ");
    inner.setItem(item("draft").key, "{bad");
    const store: KeyValueStore = {
      getItem: (k) => inner.getItem(k),
      setItem: (k, v) => inner.setItem(k, v),
      removeItem: (k) => {
        if (k === item("draft").key) return;
        inner.removeItem(k);
      },
    };
    const r = clearAll(store);
    expect(r.failed).toEqual(["draft"]);
  });

  it("does not touch keys that are not the App's", () => {
    const store = withNotes(1);
    store.setItem("somebody.else", "keep me");
    clearAll(store);
    expect(store.getItem("somebody.else")).toBe("keep me");
  });
});

describe("formatKb", () => {
  it("never says zero for something that is saved, and uses a decimal comma in French", () => {
    expect(formatKb(0)).toBe("0");
    expect(formatKb(5)).toBe("0.1");
    expect(formatKb(1536)).toBe("1.5");
    expect(formatKb(1536, "fr")).toBe("1,5");
    expect(formatKb(20 * 1024)).toBe("20");
    expect(formatKb(10 * 1024 + 600)).toBe("11");
  });
});
