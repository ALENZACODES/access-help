import { describe, expect, it } from "vitest";
import { FACT_KEYS, auditCopy, memoryStore } from "./index";
import {
  ASKED_COPY,
  ASKED_KEY,
  ASK_WAYS,
  MAX_ASKED,
  aboutLine,
  askedFilename,
  askedLine,
  askedToText,
  askedStrings,
  closedLine,
  daysSince,
  findAsk,
  isAskWay,
  loadAsked,
  markNoReply,
  markReplied,
  markWaiting,
  parseAsked,
  recordAsk,
  removeAsk,
  saveAsked,
  splitAsked,
  waitingCount,
  type AskRecord,
} from "./asked";
import { makeRng } from "./testkit";

const TODAY = new Date(Date.UTC(2026, 10, 19));
const day = (iso: string): Date => new Date(`${iso}T12:00:00Z`);
const LIB = { id: "library-1a2b3c4d", name: "Library", address: "1 Main St" };
const CAFE = { id: "cafe-5e6f7a8b", name: "Cafe", address: undefined };

function ok(r: AskRecord[] | "full"): AskRecord[] {
  if (r === "full") throw new Error("full");
  return r;
}

describe("recordAsk", () => {
  it("adds a waiting record with the details in the App's order", () => {
    const list = ok(recordAsk([], LIB, ["elevator", "step-free-entry", "elevator"], "email", TODAY));
    expect(list).toEqual([
      { id: LIB.id, placeName: "Library", address: "1 Main St", keys: ["step-free-entry", "elevator"], way: "email", askedOn: "2026-11-19", state: "waiting", closedOn: undefined },
    ]);
  });

  it("keeps one record per place: asking again updates it and puts it back to waiting", () => {
    let list = ok(recordAsk([], LIB, ["elevator"], "email", day("2026-11-01")));
    list = ok(recordAsk(list, CAFE, ["elevator"], "phone", day("2026-11-02")));
    list = markReplied(list, LIB.id, day("2026-11-05"));
    list = ok(recordAsk(list, LIB, ["automatic-door"], "in-person", TODAY));
    expect(list.map((r) => [r.id, r.way, r.askedOn, r.state, r.closedOn])).toEqual([
      [LIB.id, "in-person", "2026-11-19", "waiting", undefined],
      [CAFE.id, "phone", "2026-11-02", "waiting", undefined],
    ]);
  });

  it("holds at most 100 places, but can always update one already there", () => {
    let list: AskRecord[] = [];
    for (let i = 0; i < MAX_ASKED; i++) list = ok(recordAsk(list, { id: `p${i}-00000000`, name: `P${i}`, address: undefined }, ["elevator"], "other", TODAY));
    expect(recordAsk(list, CAFE, ["elevator"], "email", TODAY)).toBe("full");
    expect(ok(recordAsk(list, { id: "p5-00000000", name: "P5", address: undefined }, ["elevator"], "email", TODAY))).toHaveLength(MAX_ASKED);
  });
});

describe("marking and removing", () => {
  const base = (): AskRecord[] => ok(recordAsk(ok(recordAsk([], LIB, ["elevator"], "email", day("2026-11-01"))), CAFE, ["elevator"], "phone", day("2026-11-03")));

  it("marks replied or no reply with the day, and back to waiting without one", () => {
    const replied = markReplied(base(), LIB.id, TODAY);
    expect(findAsk(replied, LIB.id)).toMatchObject({ state: "replied", closedOn: "2026-11-19" });
    expect(findAsk(markNoReply(base(), CAFE.id, TODAY), CAFE.id)).toMatchObject({ state: "no-reply", closedOn: "2026-11-19" });
    expect(findAsk(markWaiting(replied, LIB.id, TODAY), LIB.id)).toMatchObject({ state: "waiting", closedOn: undefined });
    expect(markReplied(base(), "nowhere", TODAY)).toEqual(base());
  });

  it("removes one place and counts those still waiting", () => {
    expect(removeAsk(base(), LIB.id).map((r) => r.id)).toEqual([CAFE.id]);
    expect(waitingCount(base())).toBe(2);
    expect(waitingCount(markNoReply(base(), CAFE.id, TODAY))).toBe(1);
  });

  it("lists the longest wait first, then the most recently closed", () => {
    let list = base();
    list = ok(recordAsk(list, { id: "arena-11111111", name: "Arena", address: undefined }, ["elevator"], "email", day("2026-10-20")));
    list = markReplied(list, CAFE.id, day("2026-11-10"));
    list = ok(recordAsk(list, { id: "pool-22222222", name: "Pool", address: undefined }, ["elevator"], "email", day("2026-10-01")));
    list = markNoReply(list, "pool-22222222", day("2026-11-15"));
    const { waiting, closed } = splitAsked(list);
    expect(waiting.map((r) => r.placeName)).toEqual(["Arena", "Library"]);
    expect(closed.map((r) => r.placeName)).toEqual(["Pool", "Cafe"]);
  });
});

describe("words", () => {
  const r = (): AskRecord => ok(recordAsk([], LIB, ["elevator", "automatic-door"], "email", day("2026-11-10")))[0] as AskRecord;

  it("counts whole days, never below zero", () => {
    expect(daysSince("2026-11-10", TODAY)).toBe(9);
    expect(daysSince("2026-11-19", TODAY)).toBe(0);
    expect(daysSince("2026-11-25", TODAY)).toBe(0);
    expect(daysSince("not a date", TODAY)).toBe(0);
    expect(daysSince("2025-11-19", TODAY)).toBe(365);
  });

  it("says how and when the place was asked", () => {
    expect(askedLine(r(), "en", TODAY)).toBe("Asked by email on 2026-11-10, 9 days ago.");
    expect(askedLine(r(), "fr", TODAY)).toBe("Demandé par courriel le 2026-11-10, il y a 9 jours.");
    expect(askedLine({ ...r(), askedOn: "2026-11-18" }, "en", TODAY)).toBe("Asked by email on 2026-11-18, 1 day ago.");
    expect(askedLine({ ...r(), askedOn: "2026-11-19", way: "in-person" }, "fr", TODAY)).toBe("Demandé en personne le 2026-11-19, aujourd’hui.");
  });

  it("says what was asked about and how it ended", () => {
    expect(aboutLine(r(), "en")).toBe("About: Automatic door, Elevator");
    expect(aboutLine(r(), "fr")).toBe("Sujet\u00A0: Porte automatique, Ascenseur");
    expect(closedLine(markReplied([r()], LIB.id, TODAY)[0] as AskRecord, "en")).toBe("They replied, noted on 2026-11-19.");
    expect(closedLine(markNoReply([r()], LIB.id, TODAY)[0] as AskRecord, "fr")).toBe("Pas de réponse, noté le 2026-11-19.");
    expect(closedLine(r(), "en")).toBe("");
  });

  it("passes the App's copy audit", () => {
    expect(auditCopy(askedStrings())).toEqual([]);
    expect(ASKED_COPY.sentTitle.fr.endsWith("\u202F?")).toBe(true);
  });

  it("knows its ways of asking", () => {
    expect(ASK_WAYS.every(isAskWay)).toBe(true);
    expect(isAskWay("fax")).toBe(false);
    expect(isAskWay(undefined)).toBe(false);
  });
});

describe("kept on this device", () => {
  it("saves and reads back the same list, and removes the key when empty", () => {
    const store = memoryStore();
    const list = markReplied(ok(recordAsk(ok(recordAsk([], LIB, ["elevator"], "email", TODAY)), CAFE, FACT_KEYS, "phone", TODAY)), LIB.id, TODAY);
    expect(saveAsked(store, list)).toBe("saved");
    expect(loadAsked(store)).toEqual(list);
    expect(saveAsked(store, [])).toBe("saved");
    expect(store.getItem(ASKED_KEY)).toBeNull();
  });

  it("says when the device will not keep it, and reads nothing from a broken store", () => {
    expect(saveAsked(undefined, [])).toBe("unavailable");
    expect(saveAsked({ getItem: () => null, setItem: () => { throw new Error("quota"); }, removeItem: () => undefined }, ok(recordAsk([], LIB, ["elevator"], "email", TODAY)))).toBe("unavailable");
    expect(loadAsked({ getItem: () => { throw new Error("no"); }, setItem: () => undefined, removeItem: () => undefined })).toEqual([]);
  });

  it("drops anything it cannot read honestly", () => {
    const good = { id: LIB.id, placeName: "Library", address: "", keys: ["elevator"], way: "email", askedOn: "2026-11-01", state: "replied", closedOn: "2026-11-02" };
    const raw = JSON.stringify([
      good,
      { ...good, id: "Bad Id" },
      { ...good, id: "x-1", placeName: "" },
      { ...good, id: "x-2", keys: ["nothing"] },
      { ...good, id: "x-3", way: "fax" },
      { ...good, id: "x-4", askedOn: "2026-02-30" },
      { ...good, id: "x-5", state: "replied", closedOn: undefined },
      { ...good, id: "x-6", placeName: "Bad\u0007name" },
      { ...good },
      "junk",
    ]);
    const list = parseAsked(raw);
    expect(list.map((r) => [r.id, r.state])).toEqual([
      [LIB.id, "replied"],
      // Closed with no date it closed: shown as waiting, not as a made-up answer.
      ["x-5", "waiting"],
    ]);
    expect(parseAsked("{not json")).toEqual([]);
    expect(parseAsked('{"a":1}')).toEqual([]);
    expect(parseAsked(null)).toEqual([]);
  });

  it("reads random lists without error and never keeps more than 100", () => {
    const rng = makeRng(7);
    const ways = [...ASK_WAYS, "fax", 3];
    for (let n = 0; n < 30; n++) {
      const raw = JSON.stringify(
        Array.from({ length: Math.floor(rng() * 160) }, (_, i) => ({
          id: rng() < 0.9 ? `p${i}-00000000` : "BAD",
          placeName: rng() < 0.9 ? `Place ${i}` : 42,
          keys: rng() < 0.9 ? ["elevator"] : [],
          way: ways[Math.floor(rng() * ways.length)],
          askedOn: rng() < 0.9 ? "2026-11-01" : "never",
          state: ["waiting", "replied", "no-reply", "lost"][Math.floor(rng() * 4)],
          closedOn: rng() < 0.5 ? "2026-11-02" : undefined,
        })),
      );
      const list = parseAsked(raw);
      expect(list.length).toBeLessThanOrEqual(MAX_ASKED);
      for (const r of list) expect(r.state === "waiting" || r.closedOn !== undefined).toBe(true);
    }
  });
});

describe("the text file", () => {
  it("lists waiting places first, then the rest, with how and when they were asked", () => {
    let list = ok(recordAsk([], LIB, ["elevator"], "email", day("2026-11-10")));
    list = ok(recordAsk(list, CAFE, ["automatic-door"], "phone", day("2026-11-12")));
    list = markReplied(list, CAFE.id, TODAY);
    expect(askedToText(list, "en", TODAY).split("\n")).toEqual([
      "Questions you sent",
      "==================",
      "",
      "Waiting for an answer (1)",
      "---------------------",
      "* Library (1 Main St)",
      "  Asked by email on 2026-11-10, 9 days ago.",
      "  About: Elevator",
      "",
      "Done (1)",
      "----",
      "* Cafe",
      "  Asked by phone on 2026-11-12, 7 days ago.",
      "  About: Automatic door",
      "  They replied, noted on 2026-11-19.",
      "",
      "Made on 2026-11-19.",
      "",
    ]);
  });

  it("says when nothing is waiting, in French with French typography", () => {
    const list = markNoReply(ok(recordAsk([], LIB, ["elevator"], "in-person", day("2026-11-18"))), LIB.id, TODAY);
    const text = askedToText(list, "fr", TODAY);
    expect(text).toContain(`En attente de réponse (0)\n${"-".repeat(21)}\n${ASKED_COPY.noneWaiting.fr}`);
    expect(text).toContain("Sujet\u00A0: Ascenseur");
    expect(text).toContain("Pas de réponse, noté le 2026-11-19.");
    expect(text).not.toMatch(/inconnu/i);
  });

  it("is named for the day and the language", () => {
    expect(askedFilename(TODAY, "en")).toBe("questions-sent-2026-11-19-en.txt");
    expect(askedFilename(TODAY, "fr")).toBe("questions-envoyees-2026-11-19-fr.txt");
  });
});
