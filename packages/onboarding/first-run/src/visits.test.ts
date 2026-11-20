import { describe, expect, it } from "vitest";
import { auditCopy, groupPlaces, memoryStore, placeId, validateForm } from "./index";
import { testNote } from "./testnotes";
import { makeRng } from "./testkit";
import {
  MAX_VISITS,
  MAX_WORDS,
  VISITS_KEY,
  canStartNote,
  compareVisit,
  comparisonLine,
  draftFromVisit,
  emptyVisitDraft,
  NO_FILTER,
  filterVisits,
  followUps,
  formFromVisit,
  hasFollowUp,
  visitedPlaces,
  visitsShownText,
  foundLines,
  loadVisits,
  makeVisit,
  parseVisit,
  parseVisits,
  removeVisit,
  saveVisits,
  sortVisits,
  upsertVisit,
  validateVisit,
  visitCountText,
  visitAskLabel,
  visitEditLabel,
  visitNoteLabel,
  visitRemoveLabel,
  visitStrings,
  visitsFor,
  visitsFilename,
  visitsText,
  type Visit,
  type VisitDraft,
} from "./visits";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const LIB = { placeName: "Library", address: "1 Main St" };
const LIB_ID = placeId(LIB);
const places = groupPlaces(
  [
    testNote("a", "Library", [
      { key: "elevator", value: "yes" },
      { key: "automatic-door", value: "no" },
    ]),
    testNote("b", "Library", [{ key: "step-free-entry", value: "yes" }]),
    testNote("c", "Library", [{ key: "step-free-entry", value: "no" }]),
  ],
  "en",
);
const library = places[0];
if (!library) throw new Error("no place");

const visit = (more: Partial<Visit> = {}): Visit => ({
  id: "v-one",
  placeId: LIB_ID,
  placeName: "Library",
  address: "1 Main St",
  visitedOn: "2026-11-18",
  found: { elevator: "no", "automatic-door": "no", "accessible-washroom": "yes", "step-free-entry": "yes" },
  words: "Lift was being repaired.",
  writtenOn: "2026-11-19",
  ...more,
});

const draft = (more: Partial<VisitDraft> = {}): VisitDraft => ({ ...emptyVisitDraft(TODAY, LIB_ID), found: { ...emptyVisitDraft(TODAY).found, elevator: "yes" }, ...more });

describe("checks", () => {
  it("accepts a visit to a place in the notes, today or earlier", () => {
    expect(validateVisit(draft(), places, TODAY)).toEqual([]);
    expect(validateVisit(draft({ visitedOn: "2000-01-01" }), places, TODAY)).toEqual([]);
  });

  it("wants a place from the notes, a real day not after today, and something said", () => {
    expect(validateVisit(draft({ placeId: "" }), places, TODAY)).toEqual([{ field: "place", code: "no-place" }]);
    expect(validateVisit(draft({ placeId: "elsewhere-00000000" }), places, TODAY)).toEqual([{ field: "place", code: "no-place" }]);
    expect(validateVisit(draft({ visitedOn: "2026-02-30" }), places, TODAY)).toEqual([{ field: "date", code: "date-format" }]);
    expect(validateVisit(draft({ visitedOn: "18/11/2026" }), places, TODAY)).toEqual([{ field: "date", code: "date-format" }]);
    expect(validateVisit(draft({ visitedOn: "2026-11-21" }), places, TODAY)).toEqual([{ field: "date", code: "date-future" }]);
    expect(validateVisit(draft({ visitedOn: "1999-12-31" }), places, TODAY)).toEqual([{ field: "date", code: "date-too-old" }]);
    expect(validateVisit({ ...emptyVisitDraft(TODAY, LIB_ID) }, places, TODAY)).toEqual([{ field: "found", code: "empty" }]);
    expect(validateVisit({ ...emptyVisitDraft(TODAY, LIB_ID), words: "  " }, places, TODAY)).toEqual([{ field: "found", code: "empty" }]);
    expect(validateVisit({ ...emptyVisitDraft(TODAY, LIB_ID), words: "Quiet" }, places, TODAY)).toEqual([]);
  });

  it("keeps the words to a length and to characters that can be kept, new lines allowed", () => {
    expect(validateVisit(draft({ words: "x".repeat(MAX_WORDS + 1) }), places, TODAY)).toEqual([{ field: "words", code: "too-long" }]);
    expect(validateVisit(draft({ words: "bell\u0007" }), places, TODAY)).toEqual([{ field: "words", code: "control-chars" }]);
    expect(validateVisit(draft({ words: "line one\nline two" }), places, TODAY)).toEqual([]);
  });

  it("lets a visit keep its place when that place has left the notes", () => {
    expect(validateVisit(draft({ placeId: "gone-00000000" }), places, TODAY, "gone-00000000")).toEqual([]);
  });
});

describe("making and keeping visits", () => {
  it("keeps only the details looked at, trimmed words, and the place's name and address", () => {
    const v = makeVisit({ ...draft({ words: "  Busy  " }) }, library, TODAY, "v-abc");
    expect(v).toEqual({ id: "v-abc", placeId: LIB_ID, placeName: "Library", address: "1 Main St", visitedOn: "2026-11-20", found: { elevator: "yes" }, words: "Busy", writtenOn: "2026-11-20" });
    expect(draftFromVisit(v)).toEqual({ placeId: LIB_ID, visitedOn: "2026-11-20", found: { "step-free-entry": "", "accessible-washroom": "", "automatic-door": "", elevator: "yes" }, words: "Busy" });
  });

  it("orders visits newest first, then by the day written", () => {
    const list = [visit({ id: "v-a", visitedOn: "2026-10-01" }), visit({ id: "v-b", visitedOn: "2026-11-01", writtenOn: "2026-11-01" }), visit({ id: "v-c", visitedOn: "2026-11-01", writtenOn: "2026-11-05" })];
    expect(sortVisits(list).map((v) => v.id)).toEqual(["v-c", "v-b", "v-a"]);
  });

  it("adds, replaces, refuses a new one when full, and removes", () => {
    const one = upsertVisit([], visit());
    expect(one).toEqual({ ok: true, visits: [visit()] });
    const changed = upsertVisit([visit()], visit({ words: "Fixed now" }));
    expect(changed.ok && changed.visits.map((v) => v.words)).toEqual(["Fixed now"]);
    const full = Array.from({ length: MAX_VISITS }, (_, i) => visit({ id: `v-${i}` }));
    expect(upsertVisit(full, visit({ id: "v-new" }))).toEqual({ ok: false, reason: "full" });
    expect(upsertVisit(full, visit({ id: "v-3", words: "still fits" })).ok).toBe(true);
    expect(removeVisit([visit(), visit({ id: "v-two" })], "v-one").map((v) => v.id)).toEqual(["v-two"]);
    expect(visitsFor([visit(), visit({ id: "v-two", placeId: "other-1" })], LIB_ID).map((v) => v.id)).toEqual(["v-one"]);
  });
});

describe("compared with the notes", () => {
  it("says, for each detail looked at, whether the notes agree, disagree, differ already or say nothing", () => {
    expect(compareVisit(visit(), library).map((c) => [c.key, c.found, c.verdict])).toEqual([
      ["step-free-entry", "yes", "differ-already"],
      ["accessible-washroom", "yes", "unknown"],
      ["automatic-door", "no", "same"],
      ["elevator", "no", "differs"],
    ]);
  });

  it("treats every detail as UNKNOWN to the notes when the place has left them", () => {
    expect(compareVisit(visit(), undefined).every((c) => c.verdict === "unknown")).toBe(true);
    expect(compareVisit(visit({ found: {} }), library)).toEqual([]);
  });

  it("reads as a sentence in both languages, keeping UNKNOWN as UNKNOWN", () => {
    const cs = compareVisit(visit(), library);
    expect(cs.map((c) => comparisonLine(c, "en"))).toEqual([
      "Step-free entrance: Yes, your notes already differ on this.",
      "Accessible washroom: Yes, your notes have nothing on this (UNKNOWN).",
      "Automatic door: No, same as your notes.",
      "Elevator: No, not what your notes say.",
    ]);
    expect(comparisonLine(cs[1] as (typeof cs)[number], "fr")).toBe("Toilettes accessibles\u00A0: Oui, vos notes n’en disent rien (UNKNOWN).");
    expect(foundLines(visit({ found: { elevator: "yes" } }), "fr")).toEqual(["Ascenseur\u00A0: Oui."]);
  });
});

describe("follow-ups", () => {
  const pool = groupPlaces([testNote("p", "Pool", [{ key: "elevator", value: "yes" }])], "en")[0];
  if (!pool) throw new Error("no pool");

  it("takes the newest visit to each place still in the notes, and leaves out what matches", () => {
    const list = [
      visit({ id: "v-new", visitedOn: "2026-11-19", found: { elevator: "yes", "automatic-door": "yes" } }),
      visit({ id: "v-old", visitedOn: "2026-11-01", found: { elevator: "no" } }),
      visit({ id: "v-pool", placeId: pool.id, placeName: "Pool", visitedOn: "2026-11-15", found: { elevator: "yes" } }),
      visit({ id: "v-gone", placeId: "gone-1", placeName: "Arena", visitedOn: "2026-11-20", found: { elevator: "no" } }),
    ];
    const f = followUps(list, [library, pool]);
    expect(f.map((x) => [x.visit.id, x.items.map((c) => `${c.key}:${c.verdict}`)])).toEqual([["v-new", ["automatic-door:differs"]]]);
  });

  it("is empty with no visits, and for a visit that only matches", () => {
    expect(followUps([], [library])).toEqual([]);
    expect(followUps([visit({ found: { elevator: "yes" } })], [library])).toEqual([]);
  });

  it("names the place in its buttons", () => {
    expect(visitNoteLabel(visit(), "en")).toBe("Start a note from the visit to Library on 2026-11-18");
    expect(visitAskLabel(visit(), "fr")).toBe("Poser la question à Library sur ces détails");
  });
});

describe("choosing which visits to show", () => {
  const list = [
    visit({ id: "v-a", visitedOn: "2026-11-19", found: { elevator: "yes" } }),
    visit({ id: "v-b", visitedOn: "2026-11-02", found: { elevator: "no" } }),
    visit({ id: "v-c", placeId: "pool-1", placeName: "Pool", visitedOn: "2026-11-10", found: {}, words: "Closed" }),
  ];

  it("shows every visit by default, one place's, or only those with something to follow up", () => {
    expect(filterVisits(list, places, NO_FILTER).map((v) => v.id)).toEqual(["v-a", "v-c", "v-b"]);
    expect(filterVisits(list, places, { placeId: LIB_ID, onlyFollow: false }).map((v) => v.id)).toEqual(["v-a", "v-b"]);
    expect(filterVisits(list, places, { placeId: "", onlyFollow: true }).map((v) => v.id)).toEqual(["v-b"]);
    expect(filterVisits(list, places, { placeId: "pool-1", onlyFollow: true })).toEqual([]);
    expect(hasFollowUp(list[0] as Visit, places)).toBe(false);
  });

  it("lists each visited place once, by name", () => {
    expect(visitedPlaces(list)).toEqual([
      { id: LIB_ID, name: "Library" },
      { id: "pool-1", name: "Pool" },
    ]);
  });

  it("says how many are shown", () => {
    expect(visitsShownText(2, 5, "en")).toBe("Showing 2 of 5 visits.");
    expect(visitsShownText(1, 1, "en")).toBe("Showing 1 of 1 visit.");
    expect(visitsShownText(0, 3, "fr")).toBe("0 visite affichée sur 3.");
    expect(visitsShownText(2, 3, "fr")).toBe("2 visites affichées sur 3.");
  });
});

describe("starting a note from a visit", () => {
  it("fills the place, the day and what was found, leaves the licence to the person and copies no words", () => {
    const f = formFromVisit(visit({ found: { elevator: "no" } }), TODAY);
    expect(f).toEqual({
      placeName: "Library",
      address: "1 Main St",
      details: { "step-free-entry": "unknown", "accessible-washroom": "unknown", "automatic-door": "unknown", elevator: "no" },
      observedOn: "2026-11-18",
      licence: "",
      note: "",
    });
    expect(validateForm(f, TODAY).map((e) => e.code)).toEqual(["licence-required"]);
    expect(validateForm({ ...f, licence: "CC0-1.0" }, TODAY)).toEqual([]);
  });

  it("is offered only when something was looked at", () => {
    expect(canStartNote(visit())).toBe(true);
    expect(canStartNote(visit({ found: {} }))).toBe(false);
  });
});

describe("labels and text", () => {
  it("names the visit each button acts on", () => {
    expect(visitRemoveLabel(visit(), "en")).toBe("Remove the visit to Library on 2026-11-18");
    expect(visitRemoveLabel(visit(), "fr")).toBe("Retirer la visite à Library du 2026-11-18");
    expect(visitEditLabel(visit(), "en")).toBe("Change the visit to Library on 2026-11-18");
    expect([visitCountText(1, "en"), visitCountText(2, "en"), visitCountText(1, "fr"), visitCountText(3, "fr")]).toEqual(["1 visit", "2 visits", "1 visite", "3 visites"]);
  });

  it("writes every visit as text, newest first, and says when there are none", () => {
    expect(visitsText([visit({ id: "v-old", visitedOn: "2026-01-02", found: {}, words: "Closed" }), visit()], "en").split("\n")).toEqual([
      "My visits",
      "=========",
      "",
      "Library, 2026-11-18",
      "1 Main St",
      "Step-free entrance: Yes.",
      "Accessible washroom: Yes.",
      "Automatic door: No.",
      "Elevator: No.",
      "In my own words: Lift was being repaired.",
      "",
      "Library, 2026-01-02",
      "1 Main St",
      "In my own words: Closed",
      "",
    ]);
    expect(visitsText([], "fr")).toBe("Mes visites\n===========\n\nAucune visite notée pour l’instant.\n");
    expect([visitsFilename("en"), visitsFilename("fr")]).toEqual(["my-visits.txt", "mes-visites.txt"]);
  });
});

describe("kept on this device", () => {
  it("saves and reads back, and clears the key when the list is empty", () => {
    const store = memoryStore();
    expect(saveVisits(store, [visit()])).toBe("saved");
    expect(loadVisits(store, TODAY)).toEqual([visit()]);
    expect(saveVisits(store, [])).toBe("saved");
    expect(store.getItem(VISITS_KEY)).toBeNull();
    expect(saveVisits(undefined, [visit()])).toBe("unavailable");
    expect(saveVisits({ getItem: () => null, setItem: () => { throw new Error("quota"); }, removeItem: () => undefined }, [visit()])).toBe("unavailable");
    expect(loadVisits({ getItem: () => { throw new Error("blocked"); }, setItem: () => undefined, removeItem: () => undefined }, TODAY)).toEqual([]);
  });

  it("drops anything broken, repeated or out of range, and never throws", () => {
    expect(parseVisits(null, TODAY)).toEqual([]);
    expect(parseVisits("{", TODAY)).toEqual([]);
    expect(parseVisits("{}", TODAY)).toEqual([]);
    const raw = JSON.stringify([
      visit(),
      visit(),
      visit({ id: "BAD" }),
      visit({ id: "v-future", visitedOn: "2026-11-21" }),
      visit({ id: "v-old", visitedOn: "1999-01-01" }),
      visit({ id: "v-empty", found: {}, words: "" }),
      { ...visit({ id: "v-odd" }), found: { elevator: "maybe", nope: "yes", "automatic-door": "no" }, writtenOn: "never" },
      { ...visit({ id: "v-num" }), placeName: 7 },
      { ...visit({ id: "v-ctl" }), placeName: "Lib\u0000rary" },
      "text",
      null,
    ]);
    expect(parseVisits(raw, TODAY).map((v) => v.id)).toEqual(["v-one", "v-odd"]);
    expect(parseVisit({ ...visit({ id: "v-odd" }), found: { elevator: "maybe", "automatic-door": "no" }, writtenOn: "never" }, TODAY)).toMatchObject({ found: { "automatic-door": "no" }, writtenOn: "2026-11-18" });
    expect(parseVisit({ ...visit(), address: null }, TODAY)?.address).toBeUndefined();
    expect(parseVisit({ ...visit(), address: 5 }, TODAY)).toBeUndefined();
  });

  it("reads back every random list it saved, capped", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const rng = makeRng(seed);
      const list: Visit[] = [];
      const n = Math.floor(rng() * 30);
      for (let i = 0; i < n; i++) {
        const found: Visit["found"] = rng() < 0.5 ? { elevator: rng() < 0.5 ? "yes" : "no" } : {};
        list.push(visit({ id: `v-${seed}x${i}`, visitedOn: `2026-${String(1 + Math.floor(rng() * 10)).padStart(2, "0")}-1${Math.floor(rng() * 9)}`, found, words: Object.keys(found).length === 0 || rng() < 0.3 ? `Visit ${i}` : "" }));
      }
      const store = memoryStore();
      saveVisits(store, sortVisits(list));
      expect(loadVisits(store, TODAY), `seed ${seed}`).toEqual(sortVisits(list));
    }
    const many = Array.from({ length: MAX_VISITS + 20 }, (_, i) => visit({ id: `v-${i}` }));
    expect(parseVisits(JSON.stringify(many), TODAY)).toHaveLength(MAX_VISITS);
  });
});

describe("copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(visitStrings())).toEqual([]);
  });

  it("never says it checked anything, and keeps UNKNOWN in French", () => {
    const all = visitStrings().map(([, p]) => `${p.en} ${p.fr}`).join(" ");
    expect(all).not.toMatch(/v[ée]rifi/i);
    expect(all).not.toMatch(/inconnu/i);
  });
});
