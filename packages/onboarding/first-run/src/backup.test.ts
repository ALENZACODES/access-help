import { describe, expect, it } from "vitest";
import { BACKUP_FORMAT, MAX_SHORTLIST, exportLists, importLists, mergeLists, restoreDone, findBanned, type Lists } from "./index";

const lists: Lists = {
  needs: { elevator: "yes", "step-free-entry": "no" },
  shortlist: ["a-1", "b-2"],
  checklist: { "a-1": { elevator: { asked: true, answer: "Works today" } } },
};

describe("export and import", () => {
  it("round-trips", () => {
    const text = exportLists(lists, "2026-11-15");
    const r = importLists(text);
    expect(r.error).toBeUndefined();
    if (!r.error) expect(r.lists).toEqual(lists);
    expect(JSON.parse(text)).toMatchObject({ format: BACKUP_FORMAT, version: 1, exportedOn: "2026-11-15" });
  });

  it("reports why text could not be read", () => {
    expect(importLists("   ")).toEqual({ error: "empty" });
    expect(importLists("x".repeat(1_000_001))).toEqual({ error: "too-large" });
    expect(importLists("{nope")).toEqual({ error: "not-json" });
    expect(importLists("[]")).toEqual({ error: "wrong-format" });
    expect(importLists('{"format":"app-notes","version":1}')).toEqual({ error: "wrong-format" });
    expect(importLists(`{"format":"${BACKUP_FORMAT}","version":9}`)).toEqual({ error: "wrong-version" });
  });

  it("drops bad parts the same way stored data is checked", () => {
    const text = JSON.stringify({
      format: BACKUP_FORMAT,
      version: 1,
      needs: { elevator: "maybe", "automatic-door": "no", bogus: "yes" },
      shortlist: ["ok-1", "Bad Id", 7, "ok-1"],
      checklist: { "p-1": { elevator: { asked: true, answer: "me@example.com" } }, "p-2": { elevator: { asked: true, answer: "fine" } } },
    });
    const r = importLists(text);
    if (r.error) throw new Error(r.error);
    expect(r.lists.needs).toEqual({ "automatic-door": "no" });
    expect(r.lists.shortlist).toEqual(["ok-1"]);
    expect(r.lists.checklist).toEqual({ "p-2": { elevator: { asked: true, answer: "fine" } } });
  });

  it("accepts a backup with missing parts", () => {
    const r = importLists(`{"format":"${BACKUP_FORMAT}","version":1}`);
    if (r.error) throw new Error(r.error);
    expect(r.lists).toEqual({ needs: {}, shortlist: [], checklist: {} });
  });
});

describe("mergeLists", () => {
  it("keeps what is on the device and adds only what is missing", () => {
    const current: Lists = { needs: { elevator: "no" }, shortlist: ["a-1"], checklist: { "a-1": { elevator: { asked: false, answer: "mine" } } } };
    const incoming: Lists = {
      needs: { elevator: "yes", "automatic-door": "yes" },
      shortlist: ["a-1", "c-3"],
      checklist: { "a-1": { elevator: { asked: true, answer: "theirs" }, "step-free-entry": { asked: true, answer: "" } }, "c-3": { elevator: { asked: true, answer: "" } } },
    };
    const m = mergeLists(current, incoming);
    expect(m.lists.needs).toEqual({ elevator: "no" });
    expect(m.lists.shortlist).toEqual(["a-1", "c-3"]);
    expect(m.lists.checklist["a-1"]?.elevator?.answer).toBe("mine");
    expect(m.lists.checklist["a-1"]?.["step-free-entry"]).toEqual({ asked: true, answer: "" });
    expect(m.added).toEqual({ needs: 0, shortlist: 1, notes: 2 });
  });

  it("takes the backup's must-haves when none are saved", () => {
    const m = mergeLists({ needs: {}, shortlist: [], checklist: {} }, lists);
    expect(m.lists.needs).toEqual(lists.needs);
    expect(m.added.needs).toBe(2);
  });

  it("never goes over the shortlist limit", () => {
    const current: Lists = { needs: {}, shortlist: Array.from({ length: MAX_SHORTLIST - 1 }, (_, i) => `p-${i}`), checklist: {} };
    const m = mergeLists(current, { needs: {}, shortlist: ["x-1", "x-2", "x-3"], checklist: {} });
    expect(m.lists.shortlist).toHaveLength(MAX_SHORTLIST);
    expect(m.added.shortlist).toBe(1);
  });

  it("does not change what it was given", () => {
    const current: Lists = { needs: {}, shortlist: ["a-1"], checklist: { "a-1": { elevator: { asked: true, answer: "" } } } };
    const snapshot = JSON.stringify(current);
    mergeLists(current, lists);
    expect(JSON.stringify(current)).toBe(snapshot);
  });
});

describe("restoreDone", () => {
  it("states what was added in both languages without banned wording", () => {
    const a = { needs: 2, shortlist: 1, notes: 3 };
    expect(restoreDone(a, "en")).toBe("Restored: 2 must-have(s), 1 place(s) added to the shortlist, 3 note(s).");
    expect(restoreDone(a, "fr")).toContain("\u00A0:");
    for (const l of ["en", "fr"] as const) expect(findBanned(restoreDone(a, l))).toBeUndefined();
  });
});
