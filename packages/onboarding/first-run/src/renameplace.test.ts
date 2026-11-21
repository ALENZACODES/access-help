import { describe, expect, it } from "vitest";
import { exportNotes, importNotes } from "./exchange";
import type { Note } from "./model";
import { placeId, type Place } from "./places";
import {
  RENAME_FOUND_MAX,
  applyRename,
  checkCopy,
  cleanName,
  joinsWith,
  mixedPlaces,
  placeNameOf,
  placesOf,
  renameProblems,
  renamedFile,
  searchPlaces,
  spellingsOf,
  type RenameChange,
} from "./renameplace";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const NOTES: Note[] = [
  // The same place spelled two ways; the App shows the newest note's spelling (a1 on a tie).
  testNote("a1", "Café A", [{ key: "elevator", value: "yes", source: "City survey", on: "2026-01-05" }], "10 King St W"),
  testNote("a2", "Cafe A", [{ key: "automatic-door", value: "no" }], "10 King St. W."),
  testNote("b", "Bakery", [], "20 King St W"),
  testNote("k", "Kiosk", [], null),
  testNote("d", "Diner", [{ key: "step-free-entry", value: "yes" }], "30 Queen St E"),
];

const all = (notes: readonly Note[] = NOTES): Place[] => placesOf(notes, "en");
const place = (name: string, notes: readonly Note[] = NOTES): Place => {
  const p = all(notes).find((x) => x.name === name);
  if (!p) throw new Error(`no place ${name}`);
  return p;
};

function rename(name: string, to: { name: string; address: string }, notes: readonly Note[] = NOTES): { notes: Note[]; change: RenameChange } {
  const r = applyRename(notes, all(notes), place(name, notes), to);
  if (!r.ok) throw new Error("rename failed");
  return r;
}

describe("placesOf and searchPlaces", () => {
  it("reads notes that spell a place two ways as one place", () => {
    expect(all().map((p) => [p.name, p.notes.length])).toEqual([
      ["Bakery", 1],
      ["Café A", 2],
      ["Diner", 1],
      ["Kiosk", 1],
    ]);
  });

  it("finds places by every word of the search, ignoring case and accents", () => {
    expect(searchPlaces(all(), "", "en").places.map((p) => p.name)).toEqual(["Bakery", "Café A", "Diner", "Kiosk"]);
    expect(searchPlaces(all(), "KING cafe", "en").places.map((p) => p.name)).toEqual(["Café A"]);
    expect(searchPlaces(all(), "queen", "en").places.map((p) => p.name)).toEqual(["Diner"]);
    expect(searchPlaces(all(), "pizza", "en")).toEqual({ places: [], total: 0 });
  });

  it("lists only the first places, and says how many match", () => {
    const r = searchPlaces(all(), "", "en", 2);
    expect(r.places).toHaveLength(2);
    expect(r.total).toBe(4);
    expect(RENAME_FOUND_MAX).toBe(30);
  });
});

describe("spellingsOf and mixedPlaces", () => {
  it("lists each way the notes write a place, most used first", () => {
    const notes = [...NOTES, testNote("a3", "Cafe A", [], "10 King St. W.")];
    expect(spellingsOf(place("Café A", notes))).toEqual([
      { name: "Cafe A", address: "10 King St. W.", notes: 2 },
      { name: "Café A", address: "10 King St W", notes: 1 },
    ]);
  });

  it("keeps the notes' order between spellings used as often", () => {
    expect(spellingsOf(place("Café A")).map((s) => s.name)).toEqual(["Café A", "Cafe A"]);
  });

  it("gives one spelling for a place always written the same way, with no address as empty", () => {
    expect(spellingsOf(place("Kiosk"))).toEqual([{ name: "Kiosk", address: "", notes: 1 }]);
  });

  it("lists only the places written more than one way", () => {
    expect(mixedPlaces(all()).map((p) => p.name)).toEqual(["Café A"]);
    const r = rename("Café A", { name: "Café A", address: "10 King St W" });
    expect(mixedPlaces(all(r.notes))).toEqual([]);
  });

  it("counts a difference in case or spacing as another way", () => {
    const notes = [testNote("x1", "Diner", [], "1 A St"), testNote("x2", "DINER", [], "1 A St")];
    expect(spellingsOf(place("Diner", notes)).map((s) => s.name)).toEqual(["Diner", "DINER"]);
  });
});

describe("renameProblems", () => {
  it("needs a name, within the App's limits and on one line", () => {
    const p = place("Bakery");
    expect(renameProblems(all(), p, { name: "  ", address: "" }, false)).toEqual(["name-empty"]);
    expect(renameProblems(all(), p, { name: "x".repeat(121), address: "" }, false)).toEqual(["name-long"]);
    expect(renameProblems(all(), p, { name: "a\tb", address: "" }, false)).toEqual(["name-control"]);
    expect(renameProblems(all(), p, { name: "x".repeat(120), address: "" }, false)).toEqual([]);
  });

  it("checks the address too, and gives both problems at once", () => {
    const p = place("Bakery");
    expect(renameProblems(all(), p, { name: "Bakery", address: "y".repeat(201) }, false)).toEqual(["address-long"]);
    expect(renameProblems(all(), p, { name: "", address: "1\n2" }, false)).toEqual(["name-empty", "address-control"]);
  });

  it("says when nothing would change, ignoring spaces at the ends", () => {
    expect(renameProblems(all(), place("Bakery"), { name: " Bakery ", address: "20 King St W " }, false)).toEqual(["unchanged"]);
    expect(renameProblems(all(), place("Kiosk"), { name: "Kiosk", address: "" }, false)).toEqual(["unchanged"]);
  });

  it("counts writing one spelling into every note about a place as a change", () => {
    expect(renameProblems(all(), place("Café A"), { name: "Café A", address: "10 King St W" }, false)).toEqual([]);
  });

  it("asks before reading two places as one", () => {
    const to = { name: "bakery", address: "20 King St. W" };
    expect(joinsWith(all(), place("Diner"), to)?.name).toBe("Bakery");
    expect(renameProblems(all(), place("Diner"), to, false)).toEqual(["joins"]);
    expect(renameProblems(all(), place("Diner"), to, true)).toEqual([]);
    expect(joinsWith(all(), place("Diner"), { name: "Diner", address: "31 Queen St E" })).toBeUndefined();
  });

  it("does not count the place itself as another place", () => {
    expect(joinsWith(all(), place("Café A"), { name: "Café A", address: "10 King St W" })).toBeUndefined();
  });
});

describe("applyRename", () => {
  it("writes the new name and address into every note about the place and nothing else", () => {
    const r = rename("Café A", { name: " Café Ardoise ", address: "10 King St W" });
    expect(r.change.from).toEqual({ name: "Café A", address: "10 King St W" });
    expect(r.change.to).toEqual({ name: "Café Ardoise", address: "10 King St W" });
    expect([...r.change.noteIds].sort()).toEqual(["a1", "a2"]);
    expect(r.change.joined).toBeUndefined();
    for (const n of r.notes) {
      const before = NOTES.find((x) => x.id === n.id);
      if (n.id === "a1" || n.id === "a2") {
        expect(n.placeName).toBe("Café Ardoise");
        expect(n.address).toBe("10 King St W");
        expect(n.facts).toEqual(before?.facts);
        expect(n.createdOn).toBe(before?.createdOn);
        expect(n.licence).toBe(before?.licence);
      } else expect(n).toBe(before);
    }
    expect(r.notes.map((n) => n.id)).toEqual(NOTES.map((n) => n.id));
  });

  it("takes an address away when it is left empty, and gives one to a place with none", () => {
    expect(rename("Bakery", { name: "Bakery", address: "" }).notes.find((n) => n.id === "b")?.address).toBeUndefined();
    expect(rename("Kiosk", { name: "Kiosk", address: "Union Station" }).notes.find((n) => n.id === "k")?.address).toBe("Union Station");
  });

  it("says which place the renamed one is now read as one with", () => {
    const r = rename("Diner", { name: "Bakery", address: "20 King St W" });
    expect(r.change.joined).toEqual({ name: "Bakery", address: "20 King St W" });
    expect(all(r.notes).map((p) => [p.name, p.notes.length])).toEqual([
      ["Bakery", 2],
      ["Café A", 2],
      ["Kiosk", 1],
    ]);
  });

  it("refuses a name the App's note reader would not keep as written", () => {
    expect(applyRename(NOTES, all(), place("Bakery"), { name: "a\u0007b", address: "" }).ok).toBe(false);
    expect(applyRename(NOTES, all(), place("Bakery"), { name: "x".repeat(121), address: "" }).ok).toBe(false);
  });

  it("chains: a renamed place can be renamed again", () => {
    const first = rename("Bakery", { name: "Bread Shop", address: "20 King St W" });
    const second = rename("Bread Shop", { name: "Bread & Co", address: "20 King St W" }, first.notes);
    expect(second.notes.find((n) => n.id === "b")?.placeName).toBe("Bread & Co");
    expect(second.change.from.name).toBe("Bread Shop");
  });
});

describe("cleanName and placeNameOf", () => {
  it("trims and gives an empty address for none", () => {
    expect(cleanName({ name: " A ", address: "  " })).toEqual({ name: "A", address: "" });
    expect(placeNameOf(place("Kiosk"))).toEqual({ name: "Kiosk", address: "" });
  });
});

describe("checkCopy", () => {
  const one = (): { notes: Note[]; changes: RenameChange[] } => {
    const r = rename("Café A", { name: "Café Ardoise", address: "10 King St W" });
    return { notes: r.notes, changes: [r.change] };
  };

  it("reads back a copy with every note, the renamed ones changed only in name and address", () => {
    const { notes, changes } = one();
    expect(checkCopy(renamedFile(notes, TODAY), NOTES, changes, "en")).toEqual({ ok: true, notes: 5, places: 4 });
    expect(JSON.parse(renamedFile(notes, TODAY)).exportedOn).toBe("2026-11-21");
  });

  it("follows a chain of changes to the last name", () => {
    const first = rename("Bakery", { name: "Bread Shop", address: "20 King St W" });
    const second = rename("Bread Shop", { name: "Bread & Co", address: "" }, first.notes);
    expect(checkCopy(renamedFile(second.notes, TODAY), NOTES, [first.change, second.change], "en").ok).toBe(true);
  });

  it("counts places as the App reads them after two are read as one", () => {
    const r = rename("Diner", { name: "Bakery", address: "20 King St W" });
    expect(checkCopy(renamedFile(r.notes, TODAY), NOTES, [r.change], "en")).toEqual({ ok: true, notes: 5, places: 3 });
  });

  it("refuses a copy the App cannot read, or one that lost a note", () => {
    const { notes, changes } = one();
    expect(checkCopy("{", NOTES, changes, "en")).toEqual({ ok: false, reason: "unreadable" });
    expect(checkCopy(exportNotes(notes.slice(1), "2026-11-21"), NOTES, changes, "en")).toEqual({ ok: false, reason: "count" });
  });

  it("refuses a copy where a note not renamed changed", () => {
    const { notes, changes } = one();
    const tampered = notes.map((n) => (n.id === "d" ? { ...n, note: "changed" } : n));
    expect(checkCopy(exportNotes(tampered, "2026-11-21"), NOTES, changes, "en")).toEqual({ ok: false, reason: "untouched" });
  });

  it("refuses a copy where a renamed note changed in anything else, or kept its old name", () => {
    const { notes, changes } = one();
    const other = notes.map((n) => (n.id === "a1" ? { ...n, licence: "CC-BY-4.0" } : n));
    expect(checkCopy(exportNotes(other, "2026-11-21"), NOTES, changes, "en")).toEqual({ ok: false, reason: "changed" });
    expect(checkCopy(exportNotes(NOTES, "2026-11-21"), NOTES, changes, "en")).toEqual({ ok: false, reason: "changed" });
  });

  it("refuses a copy where a note was swapped for another with a new id", () => {
    const { notes, changes } = one();
    const swapped = notes.map((n) => (n.id === "k" ? { ...n, id: "k2" } : n));
    expect(checkCopy(exportNotes(swapped, "2026-11-21"), NOTES, changes, "en")).toEqual({ ok: false, reason: "count" });
  });

  it("keeps place ids stable for places not renamed", () => {
    const { notes } = one();
    const back = importNotes(renamedFile(notes, TODAY)).notes;
    expect(back.filter((n) => n.id === "d").map((n) => placeId(n))).toEqual([place("Diner").id]);
  });
});
