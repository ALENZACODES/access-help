import { describe, expect, it } from "vitest";
import type { AskRecord } from "./asked";
import { auditCopy, placeId, type Note } from "./index";
import {
  ALL_KINDS,
  JOURNAL_KINDS,
  buildJournal,
  byMonth,
  entryCountText,
  entryHeading,
  filterJournal,
  isJournalKind,
  isSinceDay,
  journalFilename,
  journalKindCounts,
  journalPlaces,
  journalStrings,
  journalText,
  type JournalSources,
} from "./journal";
import { makeRng, randomNotes } from "./testkit";
import { testNote } from "./testnotes";
import type { Visit } from "./visits";

const LIB = placeId({ placeName: "Library", address: "1 Main St" });
const lib = testNote("n1", "Library", [{ key: "elevator", value: "yes" }]);
const pool: Note = { ...testNote("n2", "Pool", [], "2 Side Rd"), createdOn: "2026-09-05", note: "Busy on Saturdays" };
const removed: Note = { ...testNote("n3", "Library", [{ key: "automatic-door", value: "no" }]), createdOn: "2026-08-01" };
const visit: Visit = { id: "v-1", placeId: LIB, placeName: "Library", address: "1 Main St", visitedOn: "2026-11-02", found: { elevator: "no" }, words: "Lift closed", writtenOn: "2026-11-02" };
const ask: AskRecord = { id: LIB, placeName: "Library", address: "1 Main St", keys: ["elevator"], way: "email", askedOn: "2026-11-03", state: "replied", closedOn: "2026-11-10" };

const sources = (more: Partial<JournalSources> = {}): JournalSources => ({
  notes: [lib, pool],
  corrections: [{ noteId: "n1", on: "2026-11-04", parts: ["elevator"], changes: [{ part: "elevator", from: "no", to: "yes" }] }],
  bin: [{ note: removed, removedOn: "2026-11-01" }],
  visits: [visit],
  asked: [ask],
  ...more,
});

describe("the list", () => {
  it("gathers every step from what is kept, newest first, with the App's words for each", () => {
    const list = buildJournal(sources(), "en");
    expect(list.map((e) => [e.on, e.kind, e.placeName])).toEqual([
      ["2026-11-10", "closed", "Library"],
      ["2026-11-04", "correction", "Library"],
      ["2026-11-03", "asked", "Library"],
      ["2026-11-02", "visit", "Library"],
      ["2026-11-01", "removed", "Library"],
      ["2026-10-01", "note", "Library"],
      ["2026-09-05", "note", "Pool"],
      ["2026-08-01", "note", "Library"],
    ]);
    const by = (kind: string): string[] => list.find((e) => e.kind === kind)?.lines.slice() ?? [];
    expect(by("correction")).toEqual(["Elevator: No → Yes"]);
    expect(by("asked")).toEqual(["By email", "About: Elevator"]);
    expect(by("closed")).toEqual(["They replied."]);
    expect(by("visit")).toEqual(["Elevator: No."]);
    expect(by("removed")).toEqual(["Moved to “Recently removed”."]);
  });

  it("keeps the person's own words apart, and leaves out a note with no Yes or No line", () => {
    const list = buildJournal(sources(), "en");
    expect(list.find((e) => e.kind === "visit")?.own).toBe("Lift closed");
    const p = list.find((e) => e.placeName === "Pool");
    expect([p?.lines, p?.own]).toEqual([[], "Busy on Saturdays"]);
  });

  it("leaves out corrections of notes that are gone, and a question still waiting has no answer line", () => {
    const list = buildJournal(sources({ corrections: [{ noteId: "gone", on: "2026-11-05", parts: ["address"] }], asked: [{ ...ask, state: "waiting", closedOn: undefined }] }), "en");
    expect(list.filter((e) => e.kind === "correction")).toEqual([]);
    expect(list.filter((e) => e.kind === "closed")).toEqual([]);
  });

  it("says it in French with French typography", () => {
    const list = buildJournal(sources(), "fr");
    expect(list[0]?.lines).toEqual(["Le lieu a répondu."]);
    expect(list.find((e) => e.kind === "removed")?.lines).toEqual(["Mise dans «\u202FRetirées récemment\u202F»."]);
    expect(entryHeading(list[0] as (typeof list)[number], "fr")).toBe("Réponse notée, 2026-11-10\u00A0: Library, 1 Main St");
  });

  it("gives every entry its own key", () => {
    const list = buildJournal(sources({ corrections: [...sources().corrections, ...sources().corrections] }), "en");
    expect(new Set(list.map((e) => e.key)).size).toBe(list.length);
  });
});

describe("steps not about one place", () => {
  const card = { device: "walker" as const, sizes: { width: "", length: "", seatHeight: "" }, needs: [], helps: "Slow doors", updatedOn: "2026-11-06" };
  const set = { id: "s-w", name: "With the walker", needs: { elevator: "yes" as const }, savedOn: "2026-11-07" };

  it("show the access card and saved sets with every place, with their own words apart", () => {
    const list = buildJournal(sources({ passport: card, sets: [set] }), "en");
    const c = list.find((e) => e.kind === "card");
    const s = list.find((e) => e.kind === "set");
    expect([c?.lines, c?.own, entryHeading(c as (typeof list)[number], "en")]).toEqual([["I use a walker."], "Slow doors", "Access card saved, 2026-11-06"]);
    expect([s?.lines, s?.own]).toEqual([["Elevator: Yes"], "With the walker"]);
  });

  it("are left out of one place's list and of the list of places", () => {
    const list = buildJournal(sources({ passport: card, sets: [set] }), "en");
    expect(filterJournal(list, { placeId: LIB, kinds: JOURNAL_KINDS }).some((e) => e.kind === "card" || e.kind === "set")).toBe(false);
    expect(journalPlaces(list).map((p) => p.id)).not.toContain("");
  });
});

describe("choosing what to show", () => {
  const list = buildJournal(sources(), "en");

  it("by place and by kind", () => {
    expect(filterJournal(list, ALL_KINDS)).toEqual(list);
    expect(filterJournal(list, { placeId: placeId(pool), kinds: JOURNAL_KINDS }).map((e) => e.kind)).toEqual(["note"]);
    expect(filterJournal(list, { placeId: "", kinds: ["visit", "asked"] }).map((e) => e.kind)).toEqual(["asked", "visit"]);
    expect(filterJournal(list, { placeId: "", kinds: [] })).toEqual([]);
    expect(isJournalKind("visit")).toBe(true);
    expect(isJournalKind("party")).toBe(false);
  });

  it("from a day on, when a day is given", () => {
    expect(filterJournal(list, { ...ALL_KINDS, since: "2026-11-03" }).map((e) => e.on)).toEqual(["2026-11-10", "2026-11-04", "2026-11-03"]);
    expect(filterJournal(list, { ...ALL_KINDS, since: "" })).toEqual(list);
    expect([isSinceDay(""), isSinceDay(" 2026-02-28 "), isSinceDay("2026-02-30"), isSinceDay("yesterday")]).toEqual([true, true, false, false]);
  });

  it("lists the places once each, by name", () => {
    expect(journalPlaces(list)).toEqual([
      { id: LIB, name: "Library, 1 Main St" },
      { id: placeId(pool), name: "Pool, 2 Side Rd" },
    ]);
  });

  it("counts each kind shown, in the order of the boxes, leaving out kinds with none", () => {
    expect(journalKindCounts(list, "en")).toEqual(["Notes added: 3", "Notes corrected: 1", "Notes removed: 1", "Visits: 1", "Questions sent: 1", "Answers noted: 1"]);
    expect(journalKindCounts(filterJournal(list, { ...ALL_KINDS, kinds: ["visit"] }), "fr")).toEqual(["Visites\u00A0: 1"]);
    expect(journalKindCounts([], "en")).toEqual([]);
  });

  it("says how many are shown", () => {
    expect([entryCountText(3, 8, "en"), entryCountText(1, 1, "en"), entryCountText(1, 8, "fr"), entryCountText(2, 8, "fr")]).toEqual(["3 of 8 entries.", "1 of 1 entry.", "1 entrée sur 8.", "2 entrées sur 8."]);
  });
});

describe("months and text", () => {
  it("groups by month, newest first, keeping the order inside", () => {
    const months = byMonth(buildJournal(sources(), "en"));
    expect(months.map((m) => [m.month, m.entries.length])).toEqual([
      ["2026-11", 5],
      ["2026-10", 1],
      ["2026-09", 1],
      ["2026-08", 1],
    ]);
  });

  it("writes the list as text with month headings, the steps and the person's words", () => {
    const text = journalText(buildJournal(sources({ notes: [lib], corrections: [], bin: [], asked: [] }), "en"), "en");
    expect(text.split("\n")).toEqual([
      "What I did",
      "==========",
      "",
      "November 2026",
      "-------------",
      "",
      "Visit, 2026-11-02: Library, 1 Main St",
      "  Elevator: No.",
      "  In my own words: Lift closed",
      "",
      "October 2026",
      "------------",
      "",
      "Note added, 2026-10-01: Library, 1 Main St",
      "  Elevator: Yes",
      "",
    ]);
    expect(journalText([], "fr")).toBe("Ce que j’ai fait\n================\n\nRien à montrer pour l’instant.\n");
    expect(journalFilename(new Date(Date.UTC(2026, 10, 20)), "fr")).toBe("ce-que-j-ai-fait-2026-11-20.txt");
  });
});

describe("random notes", () => {
  it("give one note entry per note, in date order, with nothing undefined", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const notes = randomNotes(makeRng(seed), 15);
      const list = buildJournal({ notes, corrections: [], bin: [], visits: [], asked: [] }, seed % 2 === 0 ? "fr" : "en");
      expect(list.filter((e) => e.kind === "note"), `seed ${seed}`).toHaveLength(notes.length);
      for (let i = 1; i < list.length; i++) expect((list[i - 1] as (typeof list)[number]).on >= (list[i] as (typeof list)[number]).on, `seed ${seed}`).toBe(true);
      expect(journalText(list, "en"), `seed ${seed}`).not.toMatch(/undefined|NaN/);
    }
  });
});

describe("copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(journalStrings())).toEqual([]);
  });
});
