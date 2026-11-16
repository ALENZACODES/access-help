import { describe, expect, it } from "vitest";
import {
  ANSWER_MAX,
  CHECKLIST_KEY,
  MAX_CHECKLIST_PLACES,
  checkAnswer,
  clearPlaceChecklist,
  emptyForm,
  entryFor,
  groupPlaces,
  hasChecklist,
  loadChecklist,
  memoryStore,
  parseChecklist,
  pruneChecklist,
  saveChecklist,
  setAnswer,
  setAsked,
  toNote,
} from "./index";

describe("checkAnswer", () => {
  it("accepts ordinary text and empty text", () => {
    expect(checkAnswer("")).toBeUndefined();
    expect(checkAnswer("Ramp is at the side door, left of the main one.")).toBeUndefined();
  });

  it("rejects contact details, control characters and long text", () => {
    expect(checkAnswer("write to me@example.com")).toBe("personal-email");
    expect(checkAnswer("call 416 555 0100 now")).toBe("personal-phone");
    expect(checkAnswer("a\u0007b")).toBe("control-chars");
    expect(checkAnswer("x".repeat(ANSWER_MAX + 1))).toBe("too-long");
    expect(checkAnswer("x".repeat(ANSWER_MAX))).toBeUndefined();
  });
});

describe("setAsked and setAnswer", () => {
  it("keeps ticking and typing separate", () => {
    let l = setAsked({}, "p-1", "elevator", true);
    expect(entryFor(l, "p-1", "elevator")).toEqual({ asked: true, answer: "" });
    const r = setAnswer(l, "p-1", "elevator", "  Works today  ");
    expect(r.ok).toBe(true);
    if (r.ok) l = r.list;
    expect(entryFor(l, "p-1", "elevator")).toEqual({ asked: true, answer: "Works today" });
  });

  it("an answer without a tick stays unticked", () => {
    const r = setAnswer({}, "p-1", "elevator", "Yes");
    if (!r.ok) throw new Error("expected ok");
    expect(entryFor(r.list, "p-1", "elevator").asked).toBe(false);
  });

  it("removes an entry that is empty again", () => {
    let l = setAsked({}, "p-1", "elevator", true);
    l = setAsked(l, "p-1", "elevator", false);
    expect(l).toEqual({});
    expect(hasChecklist(l, "p-1")).toBe(false);
  });

  it("returns the error and leaves the list alone for a bad answer", () => {
    const start = setAsked({}, "p-1", "elevator", true);
    const r = setAnswer(start, "p-1", "elevator", "me@example.com");
    expect(r).toEqual({ ok: false, error: "personal-email" });
  });

  it("ignores bad place ids and stops at the place limit", () => {
    expect(setAsked({}, "Bad Id", "elevator", true)).toEqual({});
    let l = {};
    for (let i = 0; i < MAX_CHECKLIST_PLACES; i++) l = setAsked(l, `p-${i}`, "elevator", true);
    expect(Object.keys(setAsked(l, "extra-1", "elevator", true))).toHaveLength(MAX_CHECKLIST_PLACES);
    expect(entryFor(setAsked(l, "p-1", "elevator", false), "p-1", "elevator").asked).toBe(false);
  });

  it("clears one place", () => {
    let l = setAsked({}, "p-1", "elevator", true);
    l = setAsked(l, "p-2", "elevator", true);
    expect(Object.keys(clearPlaceChecklist(l, "p-1"))).toEqual(["p-2"]);
  });
});

describe("storage", () => {
  it("round-trips and drops invalid entries", () => {
    const s = memoryStore();
    s.setItem(
      CHECKLIST_KEY,
      JSON.stringify({
        "p-1": { elevator: { asked: true, answer: "ok" }, "step-free-entry": { asked: false, answer: "me@x.com" }, bogus: { asked: true, answer: "x" } },
        "Bad Id": { elevator: { asked: true, answer: "" } },
        "p-2": "nope",
      }),
    );
    expect(loadChecklist(s)).toEqual({ "p-1": { elevator: { asked: true, answer: "ok" } } });
  });

  it("returns nothing for broken data and stores nothing when empty", () => {
    for (const raw of [null, "", "{", "[]", "5"]) expect(parseChecklist(raw), String(raw)).toEqual({});
    const s = memoryStore();
    saveChecklist(s, { "p-1": { elevator: { asked: true, answer: "" } } });
    expect(s.getItem(CHECKLIST_KEY)).not.toBeNull();
    saveChecklist(s, {});
    expect(s.getItem(CHECKLIST_KEY)).toBeNull();
  });

  it("reports unavailable storage", () => {
    const broken = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); }, removeItem: () => { throw new Error("x"); } };
    expect(saveChecklist(broken, { "p-1": { elevator: { asked: true, answer: "" } } })).toBe("unavailable");
    expect(saveChecklist(undefined, {})).toBe("unavailable");
    expect(loadChecklist(broken)).toEqual({});
  });

  it("prunes places that are gone", () => {
    const today = new Date(Date.UTC(2026, 10, 15));
    const f = emptyForm(today);
    const places = groupPlaces([toNote({ ...f, placeName: "Archive", licence: "CC0-1.0", details: { ...f.details, elevator: "yes" } }, today, () => "a")], "en");
    const id = places[0]!.id;
    const l = { [id]: { elevator: { asked: true, answer: "" } }, "gone-00000000": { elevator: { asked: true, answer: "" } } };
    expect(Object.keys(pruneChecklist(l, places))).toEqual([id]);
  });
});
