import { describe, expect, it } from "vitest";
import { auditCopy } from "./audit";
import { DISPLAY_KEY } from "./display";
import { ITEMS, getItem } from "./inventory";
import { addNote } from "./outbox";
import { STEPS, getStep, stepReports, stepsStrings, summariseSteps } from "./steps";
import { PREFS_KEY, memoryStore, type KeyValueStore } from "./store";
import { makeRng, randomNotes } from "./testkit";

const states = (store: KeyValueStore | undefined): Record<string, string> => Object.fromEntries(stepReports(store).map((r) => [r.id, r.state]));
const key = (id: string): string => getItem(id)?.key ?? "";

describe("the steps", () => {
  it("are six, with unique ids, each tied to something the App really saves", () => {
    expect(STEPS.map((s) => s.id)).toEqual(["moving", "display", "first-note", "must-haves", "shortlist", "plan"]);
    expect(new Set(STEPS.map((s) => s.id)).size).toBe(STEPS.length);
    for (const s of STEPS) expect(ITEMS.some((i) => i.id === s.item), s.id).toBe(true);
  });

  it("send the person to screens that exist", () => {
    for (const s of STEPS) expect(["setup", "display", "form", "notes", "places"]).toContain(s.goes.kind);
  });

  it("pass the copy audit and say nothing is required", () => {
    expect(auditCopy(stepsStrings())).toEqual([]);
    expect(getStep("plan")?.title.en).toBe("Write plan notes for a visit");
    expect(getStep("nope")).toBeUndefined();
  });
});

describe("stepReports", () => {
  it("says not yet for everything on a fresh device", () => {
    expect(Object.values(states(memoryStore()))).toEqual(Array(6).fill("not-yet"));
  });

  it("says saved only for what is really saved", () => {
    const store = memoryStore();
    for (const n of randomNotes(makeRng(1), 2)) addNote(store, n);
    store.setItem(DISPLAY_KEY, JSON.stringify({ scale: "150", spacing: "normal", contrast: "auto", motion: "auto" }));
    const s = states(store);
    expect(s["first-note"]).toBe("saved");
    expect(s["display"]).toBe("saved");
    expect(s["must-haves"]).toBe("not-yet");
    expect(s["shortlist"]).toBe("not-yet");
    expect(s["plan"]).toBe("not-yet");
    expect(s["moving"]).toBe("not-yet");
  });

  it("counts a saved language or way of moving for the first step, and nothing else in that item", () => {
    const store = memoryStore();
    store.setItem(PREFS_KEY, JSON.stringify({ locale: "fr" }));
    expect(states(store)["moving"]).toBe("saved");
    store.setItem(PREFS_KEY, JSON.stringify({ mode: "switch", scanMs: 2000 }));
    expect(states(store)["moving"]).toBe("saved");
    store.setItem(PREFS_KEY, JSON.stringify({ locale: "xx", mode: "telepathy" }));
    expect(states(store)["moving"]).toBe("not-yet");
  });

  it("says unknown when saved text cannot be read, and never counts it as saved", () => {
    const store = memoryStore();
    store.setItem(key("notes"), "{broken");
    expect(states(store)["first-note"]).toBe("unknown");
    store.setItem(key("shortlist"), JSON.stringify(["NOT VALID"]));
    expect(states(store)["shortlist"]).toBe("unknown");
  });

  it("says unknown for every step when the browser will not let the App look, or there is no store", () => {
    const blocked: KeyValueStore = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    for (const s of [blocked, undefined]) expect(Object.values(states(s))).toEqual(Array(6).fill("unknown"));
  });
});

describe("summariseSteps", () => {
  it("counts what is saved and suggests the first step with nothing saved", () => {
    const store = memoryStore();
    store.setItem(DISPLAY_KEY, JSON.stringify({ scale: "125", spacing: "normal", contrast: "auto", motion: "auto" }));
    const sum = summariseSteps(stepReports(store));
    expect(sum).toEqual({ saved: 1, total: 6, unknown: 0, next: "moving" });
  });

  it("suggests nothing when every step is saved or unknown", () => {
    expect(summariseSteps([{ id: "moving", state: "saved" }, { id: "display", state: "unknown" }]).next).toBeUndefined();
    expect(summariseSteps([]).total).toBe(0);
  });

  it("skips over a step that is unknown when it suggests the next one", () => {
    const sum = summariseSteps([
      { id: "moving", state: "unknown" },
      { id: "display", state: "not-yet" },
    ]);
    expect(sum.next).toBe("display");
    expect(sum.unknown).toBe(1);
  });
});
