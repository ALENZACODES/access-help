import { describe, expect, it } from "vitest";
import type { AskRecord } from "./asked";
import {
  COMBINE_COPY,
  RENAME_COPY,
  SPLIT_COPY,
  addressOptions,
  checkSplit,
  checkTarget,
  combinePlaces,
  combineStrings,
  combineWithLabel,
  defaultChoice,
  isValidChoice,
  maybeSame,
  mergeChecklist,
  nameOptions,
  placeAt,
  renamePlace,
  splitPlace,
  summaryLines,
  targetOf,
  type CombineData,
} from "./combine";
import { FACT_KEYS, auditCopy, groupPlaces, placeId, type Note, type Place } from "./index";
import { makeRng, randomNotes } from "./testkit";
import { testNote } from "./testnotes";
import type { Visit } from "./visits";

const notes: Note[] = [
  testNote("a1", "Library", [{ key: "elevator", value: "yes" }], "1 Main St"),
  testNote("a2", "Library", [{ key: "automatic-door", value: "no" }], "1 Main St"),
  testNote("b1", "Library", [{ key: "elevator", value: "no" }], "1 Main Street"),
  testNote("c1", "Pool", [], "2 Side Rd"),
];
const places = groupPlaces(notes, "en");
const find = (name: string, address: string): Place => {
  const p = places.find((x) => x.id === placeId({ placeName: name, address }));
  if (!p) throw new Error(`no ${name}`);
  return p;
};
const A = find("Library", "1 Main St");
const B = find("Library", "1 Main Street");
const POOL = find("Pool", "2 Side Rd");

const ask = (p: Place, askedOn: string): AskRecord => ({ id: p.id, placeName: p.name, address: p.address ?? "", keys: ["elevator"], way: "email", askedOn, state: "waiting", closedOn: undefined });
const visit = (p: Place, id: string): Visit => ({ id, placeId: p.id, placeName: p.name, address: p.address, visitedOn: "2026-11-01", found: { elevator: "yes" }, words: "", writtenOn: "2026-11-01" });

const data = (more: Partial<CombineData> = {}): CombineData => ({
  notes,
  shortlist: [POOL.id, B.id, A.id],
  checklist: {},
  asked: [],
  visits: [],
  dismissed: [],
  ...more,
});

describe("what can be kept", () => {
  it("offers each different name and address once, and no address when either has none", () => {
    expect(nameOptions(A, B)).toEqual(["Library"]);
    expect(addressOptions(A, B)).toEqual(["1 Main St", "1 Main Street"]);
    const noAddress = groupPlaces([testNote("x", "Gym", [], null)], "en")[0] as Place;
    expect(addressOptions(POOL, noAddress)).toEqual(["2 Side Rd", ""]);
    expect(nameOptions(POOL, noAddress)).toEqual(["Pool", "Gym"]);
  });

  it("starts with the first name and a real address, and checks a choice is one of those offered", () => {
    const noAddress = groupPlaces([testNote("x", "Gym", [], null)], "en")[0] as Place;
    expect(defaultChoice(noAddress, POOL)).toEqual({ name: "Gym", address: "2 Side Rd" });
    expect(isValidChoice(A, B, { name: "Library", address: "1 Main Street" })).toBe(true);
    expect(isValidChoice(A, B, { name: "Library", address: "" })).toBe(false);
    expect(isValidChoice(A, B, { name: "Libr", address: "1 Main St" })).toBe(false);
  });
});

describe("combining", () => {
  it("names every note of both places the same, leaving their details and other places alone", () => {
    const r = combinePlaces(A, B, { name: "Library", address: "1 Main St" }, data());
    expect(r.summary.targetId).toBe(A.id);
    expect(r.summary.renamed).toEqual([{ noteId: "b1", changes: [{ part: "address", from: "1 Main Street", to: "1 Main St" }] }]);
    expect(r.summary.notesTotal).toBe(3);
    expect(r.data.notes.map((n) => [n.id, n.placeName, n.address])).toEqual([
      ["a1", "Library", "1 Main St"],
      ["a2", "Library", "1 Main St"],
      ["b1", "Library", "1 Main St"],
      ["c1", "Pool", "2 Side Rd"],
    ]);
    expect(r.data.notes.map((n) => n.facts)).toEqual(notes.map((n) => n.facts));
    // The combined place now shows the two notes that disagree on the elevator as differing.
    const after = groupPlaces([...r.data.notes], "en").find((p) => p.id === r.summary.targetId);
    expect(after?.resolutions.elevator.kind).toBe("differ");
  });

  it("can name a new place from both, which every note then takes", () => {
    const r = combinePlaces(A, B, { name: "Library", address: "1 Main Street" }, data());
    expect(r.summary.targetId).toBe(B.id);
    expect(r.summary.renamed.map((x) => x.noteId)).toEqual(["a1", "a2"]);
  });

  it("keeps the shortlist's order, with the combined place once where the first of the two was", () => {
    const r = combinePlaces(A, B, { name: "Library", address: "1 Main St" }, data());
    expect(r.data.shortlist).toEqual([POOL.id, A.id]);
    expect(r.summary.shortlisted).toBe(true);
    expect(combinePlaces(A, B, defaultChoice(A, B), data({ shortlist: [POOL.id] })).summary.shortlisted).toBe(false);
  });

  it("moves the visit plan's answers, the kept place's first, and says which answers clash", () => {
    const checklist = {
      [A.id]: { elevator: { asked: true, answer: "Yes, at the back" }, "automatic-door": { asked: true, answer: "" } },
      [B.id]: { elevator: { asked: true, answer: "No" }, "automatic-door": { asked: false, answer: "Push button" }, "step-free-entry": { asked: true, answer: "" } },
      [POOL.id]: { elevator: { asked: true, answer: "" } },
    };
    const r = combinePlaces(A, B, { name: "Library", address: "1 Main St" }, data({ checklist }));
    expect(r.data.checklist).toEqual({
      [POOL.id]: { elevator: { asked: true, answer: "" } },
      [A.id]: { "step-free-entry": { asked: true, answer: "" }, "automatic-door": { asked: true, answer: "Push button" }, elevator: { asked: true, answer: "Yes, at the back" } },
    });
    expect(r.summary.answerConflicts).toEqual(["elevator"]);
    expect(r.summary.answersMoved).toBe(2);
  });

  it("keeps one record in “Questions you sent”, the kept place's when both have one, renamed", () => {
    const one = combinePlaces(A, B, { name: "Library", address: "1 Main St" }, data({ asked: [ask(B, "2026-11-01")] }));
    expect(one.data.asked).toEqual([{ ...ask(B, "2026-11-01"), id: A.id, address: "1 Main St" }]);
    expect([one.summary.askedMoved, one.summary.askedDropped]).toEqual([true, false]);
    const both = combinePlaces(A, B, { name: "Library", address: "1 Main St" }, data({ asked: [ask(A, "2026-10-01"), ask(B, "2026-11-01")] }));
    expect(both.data.asked.map((x) => x.askedOn)).toEqual(["2026-10-01"]);
    expect(both.summary.askedDropped).toBe(true);
  });

  it("moves visits and remaps the pairs marked not the same, dropping the pair that is now one place", () => {
    const pk = (x: string, y: string): string => (x < y ? `${x}|${y}` : `${y}|${x}`);
    const r = combinePlaces(A, B, { name: "Library", address: "1 Main St" }, data({ visits: [visit(B, "v-b1"), visit(POOL, "v-p1")], dismissed: [pk(A.id, B.id), pk(B.id, POOL.id), pk(A.id, POOL.id)] }));
    expect(r.data.visits.map((v) => [v.id, v.placeId, v.address])).toEqual([
      ["v-b1", A.id, "1 Main St"],
      ["v-p1", POOL.id, "2 Side Rd"],
    ]);
    expect(r.summary.visitsMoved).toBe(1);
    expect(r.data.dismissed).toEqual([pk(A.id, POOL.id)]);
  });
});

describe("notes in Recently removed", () => {
  const removed = (id: string, place: string, address: string | null): { note: Note; removedOn: string } => ({ note: testNote(id, place, [{ key: "elevator", value: "no" }], address), removedOn: "2026-11-15" });

  it("take the combined name too, so putting one back does not bring the old place back", () => {
    const bin = [removed("r1", "Library", "1 Main Street"), removed("r2", "Pool", "2 Side Rd")];
    const r = combinePlaces(A, B, { name: "Library", address: "1 Main St" }, data({ bin }));
    expect(r.data.bin?.map((e) => [e.note.id, e.note.address, e.removedOn])).toEqual([
      ["r1", "1 Main St", "2026-11-15"],
      ["r2", "2 Side Rd", "2026-11-15"],
    ]);
    expect(r.summary.binRenamed).toBe(1);
    expect(summaryLines(r.summary, "en")).toContain("1 note in “Recently removed” will take this name too.");
    expect(summaryLines(r.summary, "fr")).toContain("1 note de «\u202FRetirées récemment\u202F» prendra aussi ce nom.");
  });

  it("follow a split only for the notes chosen, and are left alone when not given", () => {
    const bin = [removed("r1", "Library", "1 Main St")];
    expect(splitPlace(A, new Set(["r1"]), { placeName: "Annex", address: undefined }, data({ bin }), places).data.bin?.[0]?.note.placeName).toBe("Annex");
    expect(splitPlace(A, new Set(["a1"]), { placeName: "Annex", address: undefined }, data({ bin }), places).data.bin?.[0]?.note.placeName).toBe("Library");
    expect(combinePlaces(A, B, defaultChoice(A, B), data()).data.bin).toBeUndefined();
  });
});

describe("merging one question's answers", () => {
  it("keeps the kept place's answer, fills from the other, and leaves out empty entries", () => {
    expect(mergeChecklist(undefined, undefined)).toEqual({ merged: {}, moved: 0, conflicts: [] });
    expect(mergeChecklist({ elevator: { asked: false, answer: "" } }, { elevator: { asked: true, answer: "" } })).toEqual({ merged: { elevator: { asked: true, answer: "" } }, moved: 1, conflicts: [] });
    expect(mergeChecklist({ elevator: { asked: true, answer: "A" } }, { elevator: { asked: true, answer: " A " } }).conflicts).toEqual([]);
  });
});

describe("places that may be this one", () => {
  it("lists the other places with a reason, leaving out pairs marked not the same, with buttons that name them", () => {
    const lib = groupPlaces([testNote("x", "Library", [], "1 Main St"), testNote("y", "Library", [], null), testNote("z", "Libary", [], null), testNote("w", "Arena", [], null)], "en");
    const main = lib.find((p) => p.address === "1 Main St") as Place;
    const noAddress = lib.find((p) => p.name === "Library" && !p.address) as Place;
    expect(maybeSame(noAddress, lib, []).map((x) => [x.other.name, x.reason])).toEqual([
      ["Libary", "similar-name"],
      ["Library", "same-name"],
    ]);
    const key = maybeSame(noAddress, lib, []).find((x) => x.other.id === main.id)?.key ?? "";
    expect(maybeSame(noAddress, lib, [key]).map((x) => x.other.name)).toEqual(["Libary"]);
    expect(combineWithLabel(main, "en")).toBe("Combine with Library, 1 Main St");
    expect(combineWithLabel(noAddress, "fr")).toBe("Réunir avec Library");
  });
});

describe("renaming a place", () => {
  it("gives every note the new name and address, and the lists follow", () => {
    const r = renamePlace(POOL, { placeName: "Pool", address: "2 Side Road" }, data({ shortlist: [POOL.id], visits: [visit(POOL, "v-p1")] }), places);
    expect(r.joins).toBeUndefined();
    expect(r.summary.renamed).toEqual([{ noteId: "c1", changes: [{ part: "address", from: "2 Side Rd", to: "2 Side Road" }] }]);
    expect(r.data.shortlist).toEqual([placeId({ placeName: "Pool", address: "2 Side Road" })]);
    expect(r.data.visits[0]?.address).toBe("2 Side Road");
  });

  it("joins the place already there under the new name and address, the renamed place's things kept first", () => {
    const r = renamePlace(B, { placeName: "Library", address: "1 Main St" }, data({ asked: [ask(A, "2026-10-01"), ask(B, "2026-11-01")] }), places);
    expect(r.joins?.id).toBe(A.id);
    expect(r.summary.notesTotal).toBe(3);
    expect(r.data.asked.map((x) => x.askedOn)).toEqual(["2026-11-01"]);
    expect(r.summary.askedDropped).toBe(true);
  });
});

describe("moving some notes", () => {
  it("moves only the chosen notes and leaves everything kept by place where it was", () => {
    const lib = groupPlaces(notes, "en").find((p) => p.id === A.id) as Place;
    const checklist = { [A.id]: { elevator: { asked: true, answer: "Yes" } } };
    const r = splitPlace(lib, new Set(["a2"]), { placeName: "Library annex", address: "1 Main St" }, data({ checklist, visits: [visit(A, "v-a1")] }), places);
    expect(r.joins).toBeUndefined();
    expect(r.data.notes.map((n) => [n.id, n.placeName])).toEqual([
      ["a1", "Library"],
      ["a2", "Library annex"],
      ["b1", "Library"],
      ["c1", "Pool"],
    ]);
    expect([r.data.shortlist, r.data.checklist, r.data.visits]).toEqual([data().shortlist, checklist, [visit(A, "v-a1")]]);
    expect(r.summary.notesTotal).toBe(1);
  });

  it("says when the notes join a place already there", () => {
    const r = splitPlace(A, new Set(["a2"]), { placeName: "Library", address: "1 Main Street" }, data(), places);
    expect(r.joins?.id).toBe(B.id);
  });

  it("needs some notes chosen, but not all", () => {
    expect(checkSplit(0, 3)).toBe("none-chosen");
    expect(checkSplit(3, 3)).toBe("all-chosen");
    expect(checkSplit(2, 3)).toBeUndefined();
  });
});

describe("the typed name and address", () => {
  it("follow the note form's rules, and must change something", () => {
    expect(checkTarget("Pool", "2 Side Road", { placeName: "Pool", address: "2 Side Rd" })).toEqual([]);
    expect(checkTarget("  ", "", undefined)).toEqual(["name-required"]);
    expect(checkTarget("x".repeat(121), "y".repeat(201))).toEqual(["name-too-long", "address-too-long"]);
    expect(checkTarget("Pool\u0007", "")).toEqual(["control-chars"]);
    expect(checkTarget("me@example.com", "")).toEqual(["personal-email"]);
    expect(checkTarget("Call 416 555 0199", "")).toEqual(["personal-phone"]);
    expect(checkTarget(" Pool ", " 2 Side Rd ", { placeName: "Pool", address: "2 Side Rd" })).toEqual(["unchanged"]);
    expect(targetOf(" Gym ", "  ")).toEqual({ placeName: "Gym", address: undefined });
    expect(placeAt({ placeName: "library", address: "1 main st" }, places, [])?.id).toBe(A.id);
    expect(placeAt({ placeName: "Library", address: "1 Main St" }, places, [A.id])).toBeUndefined();
  });
});

describe("random notes", () => {
  it("never loses a note or a record, and leaves the two places as one", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const rng = makeRng(seed);
      const ns = randomNotes(rng, 14);
      const ps = groupPlaces(ns, "en");
      if (ps.length < 2) continue;
      const [x, y] = [ps[Math.floor(rng() * ps.length)] as Place, ps[Math.floor(rng() * ps.length)] as Place];
      if (x.id === y.id) continue;
      const choice = { name: nameOptions(x, y)[Math.floor(rng() * nameOptions(x, y).length)] as string, address: addressOptions(x, y)[Math.floor(rng() * addressOptions(x, y).length)] as string };
      const r = combinePlaces(x, y, choice, { notes: ns, shortlist: ps.map((p) => p.id).slice(0, 5), checklist: {}, asked: [], visits: [], dismissed: [] });
      expect(r.data.notes.map((n) => [n.id, n.facts]), `seed ${seed}`).toEqual(ns.map((n) => [n.id, n.facts]));
      const after = groupPlaces([...r.data.notes], "en");
      const ids = new Set(after.map((p) => p.id));
      expect(ids.has(r.summary.targetId), `seed ${seed}`).toBe(true);
      if (r.summary.targetId !== x.id) expect(ids.has(x.id), `seed ${seed}`).toBe(false);
      if (r.summary.targetId !== y.id) expect(ids.has(y.id), `seed ${seed}`).toBe(false);
      expect(new Set(r.data.shortlist).size, `seed ${seed}`).toBe(r.data.shortlist.length);
      for (const id of r.data.shortlist) expect(ids.has(id) || !ps.some((p) => p.id === id), `seed ${seed}`).toBe(true);
      const records = (list: readonly Note[]): number => list.reduce((s, n) => s + n.facts.filter((f) => FACT_KEYS.includes(f.key) && f.value !== "unknown").length, 0);
      expect(records(r.data.notes), `seed ${seed}`).toBe(records(ns));
    }
  });
});

describe("words", () => {
  it("say what will change, the things only one place can keep first", () => {
    const r = combinePlaces(A, B, { name: "Library", address: "1 Main St" }, data({ asked: [ask(A, "2026-10-01"), ask(B, "2026-11-01")], visits: [visit(B, "v-b1")], checklist: { [A.id]: { elevator: { asked: true, answer: "x" } }, [B.id]: { elevator: { asked: true, answer: "y" } } } }));
    expect(summaryLines(r.summary, "en")).toEqual([
      "Both places have a different answer to a visit-plan question (Elevator): the answer of the place whose name you keep stays.",
      "Both places are in “Questions you sent”. The record of the place whose name you keep stays; the other one is removed.",
      "1 of 3 notes will be named “Library, 1 Main St”.",
      "The shortlist will hold the combined place once.",
      "1 visit will follow.",
    ]);
    expect(summaryLines(r.summary, "fr")[2]).toBe("1 note sur 3 prendra le nom «\u202FLibrary, 1 Main St\u202F».");
  });

  it("pass the App's copy audit", () => {
    expect(auditCopy(combineStrings())).toEqual([]);
  });
});

describe("the help article about tidy places", () => {
  it("names the buttons and pages by the words the App shows, in both languages", async () => {
    const { getArticle } = await import("./articles");
    const { COPY } = await import("./copy");
    const a = getArticle("tidy-places");
    expect(a).toBeDefined();
    const text = (l: "en" | "fr"): string => (a?.sections ?? []).flatMap((s) => [...(s.paragraphs ?? []), ...(s.steps ?? [])]).map((p) => p[l]).join(" ");
    for (const l of ["en", "fr"] as const) {
      for (const words of [COMBINE_COPY.open[l], RENAME_COPY.open[l], SPLIT_COPY.open[l], COPY.similar.title[l]]) expect(text(l), `${l}: ${words}`).toContain(words);
    }
  });
});

describe("preview sentences for random combinations", () => {
  it("pass the App's copy audit in both languages, whatever the counts", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const rng = makeRng(seed);
      const ns = randomNotes(rng, 10);
      const ps = groupPlaces(ns, "en");
      if (ps.length < 2) continue;
      const [x, y] = [ps[0] as Place, ps[1] as Place];
      const checklist = Object.fromEntries(
        [x, y].map((p) => [p.id, Object.fromEntries(FACT_KEYS.filter(() => rng() < 0.5).map((k) => [k, { asked: rng() < 0.5, answer: rng() < 0.5 ? `Answer ${p.id.slice(0, 3)}` : "" }]))]),
      );
      const asked = [x, y].filter(() => rng() < 0.5).map((p) => ask(p, "2026-10-01"));
      const visits = [x, y].filter(() => rng() < 0.5).map((p, i) => visit(p, `v-r${seed}x${i}`));
      const bin = rng() < 0.5 ? [{ note: { ...(ns[0] as Note), id: `bin${seed}`, placeName: y.name, address: y.address }, removedOn: "2026-11-01" }] : [];
      const r = combinePlaces(x, y, defaultChoice(x, y), { notes: ns, shortlist: [x.id, y.id], checklist, asked, visits, dismissed: [], bin });
      const lines = (["en", "fr"] as const).map((l) => summaryLines(r.summary, l));
      expect(lines[0]?.length, `seed ${seed}`).toBe(lines[1]?.length);
      const pairs = (lines[0] ?? []).map((en, i): [string, { en: string; fr: string }] => [`preview.${seed}.${i}`, { en, fr: lines[1]?.[i] ?? "" }]);
      expect(auditCopy(pairs), `seed ${seed}`).toEqual([]);
      for (const line of [...(lines[0] ?? []), ...(lines[1] ?? [])]) expect(line, `seed ${seed}`).not.toMatch(/undefined|NaN/);
    }
  });
});
