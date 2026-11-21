import { describe, expect, it } from "vitest";
import {
  FOUND_MAX,
  LIST_MAX,
  chosenInOrder,
  findPlaces,
  listLines,
  listTooLong,
  matchList,
  placeMatches,
  readBack,
  reasonProblem,
  removalFiles,
  removePlaces,
  searchWords,
  type Removal,
} from "./dropplaces";
import { exportNotes, importNotes } from "./exchange";
import { readStreetFile, type StreetFile } from "./filestreets";
import type { Note } from "./model";
import { placeId } from "./places";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const NOTES = [
  testNote("a1", "Café A", [{ key: "elevator", value: "yes" }], "10 King St W"),
  testNote("a2", "Café A", [{ key: "automatic-door", value: "no" }], "10 King St W"),
  testNote("b", "Bakery", [], "20 King St W"),
  testNote("c", "Côte Deli", [{ key: "step-free-entry", value: "yes" }], "5 Rue Saint-Denis"),
  testNote("k", "Kiosk", [], null),
  testNote("d", "Diner", [], "30 Queen St E"),
];

function read(notes: readonly Note[] = NOTES, l: "en" | "fr" = "en"): StreetFile {
  const r = readStreetFile(exportNotes(notes, "2026-11-01"), TODAY, l);
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const id = (name: string, address: string | null): string => placeId({ placeName: name, address: address ?? undefined });
const CAFE = id("Café A", "10 King St W");
const KIOSK = id("Kiosk", null);
const names = (ps: readonly { name: string }[]): string[] => ps.map((p) => p.name);

describe("searchWords", () => {
  it("folds case and accents and splits on anything but letters and numbers", () => {
    expect(searchWords("  Café, KING!  st-w ")).toEqual(["cafe", "king", "st", "w"]);
    expect(searchWords("")).toEqual([]);
    expect(searchWords("—")).toEqual([]);
  });
});

describe("findPlaces", () => {
  it("lists every place, by name, for an empty search", () => {
    const f = findPlaces(read(), "", "en");
    expect(names(f.places)).toEqual(["Bakery", "Café A", "Côte Deli", "Diner", "Kiosk"]);
    expect(f.total).toBe(5);
  });

  it("needs every word in the name or the address", () => {
    expect(names(findPlaces(read(), "king", "en").places)).toEqual(["Bakery", "Café A"]);
    expect(names(findPlaces(read(), "KING cafe", "en").places)).toEqual(["Café A"]);
    expect(names(findPlaces(read(), "queen", "en").places)).toEqual(["Diner"]);
    expect(names(findPlaces(read(), "cote saint", "en").places)).toEqual(["Côte Deli"]);
    expect(findPlaces(read(), "king pizza", "en").total).toBe(0);
  });

  it("matches parts of words but not across punctuation", () => {
    expect(names(findPlaces(read(), "bak", "en").places)).toEqual(["Bakery"]);
    expect(names(findPlaces(read(), "saint-denis", "en").places)).toEqual(["Côte Deli"]);
  });

  it("lists only the first places, and says how many match", () => {
    const f = findPlaces(read(), "", "en", 2);
    expect(names(f.places)).toEqual(["Bakery", "Café A"]);
    expect(f.total).toBe(5);
    expect(FOUND_MAX).toBe(30);
  });

  it("orders by the person's language", () => {
    const f = read([testNote("e", "Éclair", [], "1 A St"), testNote("z", "Zebra", [], "2 A St"), testNote("d", "Dôme", [], "3 A St")], "fr");
    expect(names(findPlaces(f, "", "fr").places)).toEqual(["Dôme", "Éclair", "Zebra"]);
  });

  it("matches a place with no address by its name only", () => {
    const k = read().places.find((p) => p.name === "Kiosk");
    if (!k) throw new Error("no place");
    expect(placeMatches(k, ["kiosk"])).toBe(true);
    expect(placeMatches(k, ["address"])).toBe(false);
    expect(placeMatches(k, [])).toBe(true);
  });
});

describe("reasonProblem", () => {
  it("takes no reason, or one line up to 500 characters", () => {
    expect(reasonProblem("")).toBeUndefined();
    expect(reasonProblem("Closed in October")).toBeUndefined();
    expect(reasonProblem("a".repeat(500))).toBeUndefined();
    expect(reasonProblem("a".repeat(501))).toBe("too-long");
    expect(reasonProblem("closed\nmoved")).toBe("control");
    expect(reasonProblem("closed\tmoved")).toBe("control");
  });
});

describe("removePlaces", () => {
  it("takes the chosen places out with every note about them, in the file's order", () => {
    const r = removePlaces(read(), [KIOSK, CAFE]);
    expect(names(r.removed)).toEqual(["Café A", "Kiosk"]);
    expect(r.removedNotes.map((n) => n.id).sort()).toEqual(["a1", "a2", "k"]);
    expect(r.kept.map((n) => n.id).sort()).toEqual(["b", "c", "d"]);
    expect(r.keptPlaces).toBe(3);
  });

  it("keeps every other note exactly as it was", () => {
    const r = removePlaces(read(), [CAFE]);
    for (const n of r.kept) expect(n).toEqual(NOTES.find((x) => x.id === n.id));
  });

  it("ignores ids not in the file, and takes out nothing for no ids", () => {
    expect(removePlaces(read(), ["nowhere-00000000"]).removed).toEqual([]);
    const none = removePlaces(read(), []);
    expect(none.kept).toHaveLength(NOTES.length);
    expect(none.keptPlaces).toBe(5);
  });

  it("can take out every place", () => {
    const f = read();
    const r = removePlaces(f, f.places.map((p) => p.id));
    expect(r.kept).toEqual([]);
    expect(r.keptPlaces).toBe(0);
    expect(r.removedNotes).toHaveLength(NOTES.length);
  });
});

describe("removalFiles and readBack", () => {
  const removal = (): Removal => removePlaces(read(), [CAFE, KIOSK]);

  it("makes a copy the App reads back with every kept note and none taken out", () => {
    const r = removal();
    const files = removalFiles(r, TODAY);
    expect(readBack(files.copy, r)).toEqual({ ok: true, notes: 3, places: 3 });
    const back = importNotes(files.removed);
    expect(back.notes.map((n) => n.id).sort()).toEqual(["a1", "a2", "k"]);
    expect(JSON.parse(files.copy).exportedOn).toBe("2026-11-21");
  });

  it("reads back an empty copy when every place is taken out", () => {
    const f = read();
    const r = removePlaces(f, f.places.map((p) => p.id));
    expect(readBack(removalFiles(r, TODAY).copy, r)).toEqual({ ok: true, notes: 0, places: 0 });
  });

  it("refuses a copy the App cannot read", () => {
    expect(readBack("{", removal())).toEqual({ ok: false, reason: "unreadable" });
    expect(readBack("", removal())).toEqual({ ok: false, reason: "unreadable" });
  });

  it("refuses a copy with notes missing or added", () => {
    const r = removal();
    expect(readBack(exportNotes(r.kept.slice(1), "2026-11-21"), r)).toEqual({ ok: false, reason: "count" });
  });

  it("refuses a copy that still holds a note about a place taken out", () => {
    const r = removal();
    const removedNote = r.removedNotes[0];
    if (!removedNote) throw new Error("no note");
    expect(readBack(exportNotes([...r.kept.slice(1), removedNote], "2026-11-21"), r)).toEqual({ ok: false, reason: "left-in" });
  });

  it("refuses a copy where a kept note changed", () => {
    const r = removal();
    const [first, ...rest] = r.kept;
    if (!first) throw new Error("no note");
    expect(readBack(exportNotes([{ ...first, note: "changed" }, ...rest], "2026-11-21"), r)).toEqual({ ok: false, reason: "changed" });
  });

  it("refuses a copy with a note the App turns away", () => {
    const r = removal();
    const text = JSON.stringify({ ...JSON.parse(removalFiles(r, TODAY).copy), notes: [...r.kept, { id: "bad" }] });
    expect(readBack(text, r)).toEqual({ ok: false, reason: "unreadable" });
  });
});

describe("matchList", () => {
  const twoCafes = (): StreetFile =>
    read([...NOTES, testNote("a3", "Café A", [], "99 Bloor St W"), testNote("s", "Smith, Jones Law", [], "1 Bay St")]);

  it("ticks places named one per line, ignoring case, accents and punctuation", () => {
    const m = matchList(read(), "kiosk\n  BAKERY \r\n\ncote deli\n");
    expect(m.ids).toEqual(chosenInOrder(read(), [id("Bakery", "20 King St W"), id("Côte Deli", "5 Rue Saint-Denis"), KIOSK]));
    expect(m.matched).toBe(3);
    expect(m.unmatched).toEqual([]);
    expect(m.ambiguous).toEqual([]);
  });

  it("keeps the lines that name no place as written", () => {
    const m = matchList(read(), "Pizza Place\nDiner\nCafé Z");
    expect(m.unmatched).toEqual(["Pizza Place", "Café Z"]);
    expect(m.matched).toBe(1);
  });

  it("ticks none of the places that share a name, and says how many there are", () => {
    const m = matchList(twoCafes(), "Café A");
    expect(m.ids).toEqual([]);
    expect(m.ambiguous).toEqual([{ line: "Café A", places: 2 }]);
  });

  it("tells places that share a name apart by their address after a comma", () => {
    const m = matchList(twoCafes(), "cafe a, 99 bloor st. w.");
    expect(m.ids).toEqual([id("Café A", "99 Bloor St W")]);
    expect(m.ambiguous).toEqual([]);
  });

  it("reads a name that holds a comma when no place has that name and address", () => {
    expect(matchList(twoCafes(), "Smith, Jones Law").ids).toEqual([id("Smith, Jones Law", "1 Bay St")]);
    expect(matchList(twoCafes(), "Smith, Jones Law, 1 Bay St").ids).toEqual([]);
  });

  it("ticks each place once, whatever the lines", () => {
    const m = matchList(read(), "Kiosk\nkiosk");
    expect(m.ids).toEqual([KIOSK]);
    expect(m.matched).toBe(2);
  });

  it("reads at most 200 lines", () => {
    const many = Array.from({ length: LIST_MAX + 5 }, (_, i) => `Place ${i}`).join("\n");
    expect(listTooLong(many)).toBe(true);
    expect(listTooLong("a\n\n\nb")).toBe(false);
    expect(matchList(read(), many).unmatched).toHaveLength(LIST_MAX);
    expect(listLines(" a \n\n b\r\nc\r")).toEqual(["a", "b", "c"]);
  });
});

describe("chosenInOrder", () => {
  it("puts ids in the file's order without repeats or unknown ids", () => {
    const f = read();
    const bakery = id("Bakery", "20 King St W");
    expect(chosenInOrder(f, [KIOSK, CAFE, bakery, CAFE, "nowhere-0"])).toEqual([bakery, CAFE, KIOSK]);
    expect(chosenInOrder(f, [])).toEqual([]);
  });
});
