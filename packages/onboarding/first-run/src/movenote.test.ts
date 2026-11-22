import { describe, expect, it } from "vitest";
import { exportNotes } from "./exchange";
import { parseNote, type Note } from "./model";
import {
  MOVE_FOUND_MAX,
  applyMove,
  checkMoves,
  existingPlace,
  findPlaces,
  moveProblems,
  movedFile,
  noteNameOf,
  placeOfNote,
  placesOf,
  recordCount,
  targetName,
  type MoveChange,
  type MoveTarget,
} from "./movenote";
import type { Place } from "./places";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const NOTES: Note[] = [
  testNote("a1", "Café A", [{ key: "elevator", value: "yes" }], "10 King St W"),
  testNote("a2", "Café A", [{ key: "automatic-door", value: "no" }], "10 King St W"),
  testNote("b1", "Bakery", [], "20 King St W"),
  testNote("k1", "Kiosk", [], null),
];

const all = (notes: readonly Note[] = NOTES): Place[] => placesOf(notes, "en");
const placeOf = (name: string, notes: readonly Note[] = NOTES): Place => {
  const p = all(notes).find((x) => x.name === name);
  if (!p) throw new Error(`no place ${name}`);
  return p;
};
const noteOf = (id: string, notes: readonly Note[] = NOTES): Note => {
  const n = notes.find((x) => x.id === id);
  if (!n) throw new Error(`no note ${id}`);
  return n;
};
const toPlace = (name: string): MoveTarget => ({ kind: "place", placeId: placeOf(name).id });

function move(id: string, t: MoveTarget, notes: readonly Note[] = NOTES): { notes: Note[]; change: MoveChange } {
  const r = applyMove(notes, all(notes), id, t);
  if (!r.ok) throw new Error("move failed");
  return r;
}

describe("finding places and notes", () => {
  it("lists places by name, and finds them by every word", () => {
    expect(findPlaces(all(), "", "en").places.map((p) => p.name)).toEqual(["Bakery", "Café A", "Kiosk"]);
    expect(findPlaces(all(), "king cafe", "en").places.map((p) => p.name)).toEqual(["Café A"]);
    expect(findPlaces(all(), "pizza", "en")).toEqual({ places: [], total: 0 });
    expect(findPlaces(all(), "", "en", 1)).toEqual({ places: [placeOf("Bakery")], total: 3 });
    expect(MOVE_FOUND_MAX).toBe(30);
  });

  it("finds the place a note is under", () => {
    expect(placeOfNote(all(), noteOf("a2"))?.name).toBe("Café A");
    expect(placeOfNote(all(), noteOf("k1"))?.address).toBeUndefined();
  });

  it("counts the records in a note", () => {
    expect(recordCount(noteOf("a1"))).toBe(1);
    expect(recordCount(noteOf("b1"))).toBe(0);
  });
});

describe("targetName and existingPlace", () => {
  it("gives a place's name and address as the App shows them, or the trimmed new ones", () => {
    expect(targetName(all(), toPlace("Kiosk"))).toEqual({ name: "Kiosk", address: "" });
    expect(targetName(all(), { kind: "new", name: " Deli ", address: " 5 Elm St " })).toEqual({ name: "Deli", address: "5 Elm St" });
    expect(targetName(all(), { kind: "place", placeId: "nowhere-0" })).toBeUndefined();
  });

  it("finds a place in the file by name and address, ignoring case and punctuation", () => {
    expect(existingPlace(all(), { name: "bakery", address: "20 King St. W" })?.name).toBe("Bakery");
    expect(existingPlace(all(), { name: "Bakery", address: "21 King St W" })).toBeUndefined();
  });
});

describe("moveProblems", () => {
  it("needs a target", () => {
    expect(moveProblems(all(), noteOf("a1"), undefined)).toEqual(["no-target"]);
    expect(moveProblems(all(), noteOf("a1"), { kind: "place", placeId: "nowhere-0" })).toEqual(["no-target"]);
  });

  it("refuses the place the note is under already", () => {
    expect(moveProblems(all(), noteOf("a1"), toPlace("Café A"))).toEqual(["same-place"]);
    expect(moveProblems(all(), noteOf("a1"), { kind: "new", name: "cafe a", address: "10 King St W." })).toEqual(["same-place"]);
  });

  it("checks a new place's name and address, giving both problems at once", () => {
    const n = noteOf("b1");
    expect(moveProblems(all(), n, { kind: "new", name: " ", address: "" })).toEqual(["name-empty"]);
    expect(moveProblems(all(), n, { kind: "new", name: "x".repeat(121), address: "" })).toEqual(["name-long"]);
    expect(moveProblems(all(), n, { kind: "new", name: "a\tb", address: "y".repeat(201) })).toEqual(["name-control", "address-long"]);
    expect(moveProblems(all(), n, { kind: "new", name: "Deli", address: "1\n2" })).toEqual(["address-control"]);
  });

  it("asks for a new place that is already in the file to be chosen from the list", () => {
    expect(moveProblems(all(), noteOf("b1"), { kind: "new", name: "Kiosk", address: "" })).toEqual(["exists"]);
  });

  it("has no problem with a place in the file or a new place", () => {
    expect(moveProblems(all(), noteOf("a2"), toPlace("Bakery"))).toEqual([]);
    expect(moveProblems(all(), noteOf("a2"), { kind: "new", name: "Café B", address: "12 King St W" })).toEqual([]);
  });
});

describe("applyMove", () => {
  it("gives the note the place's name and address and changes nothing else", () => {
    const r = move("a2", toPlace("Bakery"));
    expect(r.change).toEqual({ noteId: "a2", createdOn: "2026-10-01", from: { name: "Café A", address: "10 King St W" }, to: { name: "Bakery", address: "20 King St W" }, existing: true });
    const moved = noteOf("a2", r.notes);
    expect(noteNameOf(moved)).toEqual({ name: "Bakery", address: "20 King St W" });
    expect(moved.facts).toEqual(noteOf("a2").facts);
    for (const n of r.notes) if (n.id !== "a2") expect(n).toBe(noteOf(n.id));
    expect(r.notes.map((n) => n.id)).toEqual(NOTES.map((n) => n.id));
  });

  it("is read under the place it went to", () => {
    const r = move("a2", toPlace("Bakery"));
    expect(placeOf("Bakery", r.notes).notes.map((n) => n.id).sort()).toEqual(["a2", "b1"]);
    expect(placeOf("Café A", r.notes).notes.map((n) => n.id)).toEqual(["a1"]);
  });

  it("can go to a place not in the file, or to a place with no address", () => {
    const r = move("b1", { kind: "new", name: "Bread Shop", address: "" });
    expect(r.change.existing).toBe(false);
    expect(noteOf("b1", r.notes).address).toBeUndefined();
    expect(all(r.notes).map((p) => p.name)).toEqual(["Bread Shop", "Café A", "Kiosk"]);
    expect(noteNameOf(noteOf("a1", move("a1", toPlace("Kiosk")).notes))).toEqual({ name: "Kiosk", address: "" });
  });

  it("takes away a place when its last note moves out", () => {
    expect(all(move("k1", toPlace("Bakery")).notes).map((p) => p.name)).toEqual(["Bakery", "Café A"]);
  });

  it("refuses a name the App's note reader would not keep, and a note not in the file", () => {
    expect(applyMove(NOTES, all(), "b1", { kind: "new", name: "a\u0007b", address: "" }).ok).toBe(false);
    expect(applyMove(NOTES, all(), "zz", toPlace("Bakery")).ok).toBe(false);
  });
});

describe("checkMoves", () => {
  it("reads back a copy with every note, the moved ones changed only in name and address", () => {
    const r = move("a2", toPlace("Bakery"));
    expect(checkMoves(movedFile(r.notes, TODAY), NOTES, [r.change], "en")).toEqual({ ok: true, notes: 4, places: 3 });
    expect(JSON.parse(movedFile(r.notes, TODAY)).exportedOn).toBe("2026-11-21");
  });

  it("follows a note moved twice to where it went last", () => {
    const first = move("b1", { kind: "new", name: "Bread Shop", address: "" });
    const second = move("b1", { kind: "place", placeId: placeOf("Kiosk", first.notes).id }, first.notes);
    expect(checkMoves(movedFile(second.notes, TODAY), NOTES, [first.change, second.change], "en")).toEqual({ ok: true, notes: 4, places: 2 });
  });

  it("refuses a copy the App cannot read, or one with a note missing", () => {
    const r = move("a2", toPlace("Bakery"));
    expect(checkMoves("{", NOTES, [r.change], "en")).toEqual({ ok: false, reason: "unreadable" });
    expect(checkMoves(exportNotes(r.notes.slice(1), "2026-11-21"), NOTES, [r.change], "en")).toEqual({ ok: false, reason: "count" });
    const swapped = r.notes.map((n) => (n.id === "k1" ? { ...n, id: "k9" } : n));
    expect(checkMoves(exportNotes(swapped, "2026-11-21"), NOTES, [r.change], "en")).toEqual({ ok: false, reason: "count" });
  });

  it("refuses a copy where a note not moved changed", () => {
    const r = move("a2", toPlace("Bakery"));
    const changed = r.notes.map((n) => (n.id === "k1" ? { ...n, note: "changed" } : n));
    expect(checkMoves(exportNotes(changed, "2026-11-21"), NOTES, [r.change], "en")).toEqual({ ok: false, reason: "untouched" });
  });

  it("refuses a copy where the moved note changed in anything else, or did not move", () => {
    const r = move("a2", toPlace("Bakery"));
    const other = r.notes.map((n) => (n.id === "a2" ? (parseNote({ ...n, licence: "CC-BY-4.0" }) as Note) : n));
    expect(checkMoves(exportNotes(other, "2026-11-21"), NOTES, [r.change], "en")).toEqual({ ok: false, reason: "moved" });
    expect(checkMoves(exportNotes(NOTES, "2026-11-21"), NOTES, [r.change], "en")).toEqual({ ok: false, reason: "moved" });
  });
});
