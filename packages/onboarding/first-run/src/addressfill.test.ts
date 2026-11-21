import { describe, expect, it } from "vitest";
import {
  ADDRESSES_CSV_COLUMNS,
  MAX_SUGGESTIONS,
  addressChanges,
  addressProblem,
  addressRows,
  addressedFile,
  addressesCsv,
  applyAddresses,
  copyPlaces,
  hasPostal,
  readsStreet,
} from "./addressfill";
import { exportNotes, importNotes } from "./exchange";
import { readStreetFile, type StreetFile } from "./filestreets";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function read(text: string): StreetFile {
  const r = readStreetFile(text, TODAY, "en");
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const FILE = exportNotes(
  [
    testNote("c1", "Café", [{ key: "elevator", value: "yes" }], null),
    testNote("c2", "café", [], null),
    testNote("c3", "Café", [], "12 King St W"),
    testNote("c4", "CAFE", [], "40 Queen St E"),
    testNote("k1", "Kiosk", [], "Main Street"),
    testNote("l1", "Library", [], "100 King St W"),
    testNote("p1", "Park", [], null),
  ],
  "2026-11-01",
);

const addr = (notes: readonly { id: string; address?: string | undefined }[], id: string) => notes.find((n) => n.id === id)?.address;

describe("readsStreet", () => {
  it("is true only when the App can read a house number and street", () => {
    expect(readsStreet("12 King St W")).toBe(true);
    expect(readsStreet("12-345 King St W, Toronto")).toBe(true);
    expect(readsStreet("Main Street")).toBe(false);
    expect(readsStreet("Toronto")).toBe(false);
    expect(readsStreet(undefined)).toBe(false);
    expect(readsStreet("")).toBe(false);
  });
});

describe("addressRows", () => {
  const r = addressRows(read(FILE));

  it("lists places with no address, then those with no readable street", () => {
    expect(r.places).toBe(6);
    expect(r.rows.map((x) => [x.place.name, x.issue, x.place.notes.length])).toEqual([
      ["Café", "none", 2],
      ["Park", "none", 1],
      ["Kiosk", "no-street", 1],
    ]);
  });

  it("offers the readable addresses other places with the same name have, by address", () => {
    expect(r.rows[0]?.suggestions).toEqual(["12 King St W", "40 Queen St E"]);
    expect(r.rows[1]?.suggestions).toEqual([]);
    expect(r.rows[2]?.suggestions).toEqual([]);
  });

  it("finds nothing when every place has a readable address", () => {
    const f = read(exportNotes([testNote("x", "X", [], "1 Main St")], "2026-11-01"));
    expect(addressRows(f)).toEqual({ places: 1, rows: [] });
  });

  it("offers at most a few addresses", () => {
    const notes = [testNote("n", "Shop", [], null), ...Array.from({ length: 8 }, (_, i) => testNote(`s${i}`, "Shop", [], `${i + 1} Main St`))];
    const row = addressRows(read(exportNotes(notes, "2026-11-01"))).rows[0];
    expect(row?.suggestions).toHaveLength(MAX_SUGGESTIONS);
    expect(row?.suggestions[0]).toBe("1 Main St");
  });

  it("does not offer an address with no readable street, nor the place's own address", () => {
    const f = read(exportNotes([testNote("a", "Kiosk", [], "Main Street"), testNote("b", "Kiosk", [], "Queen Street")], "2026-11-01"));
    expect(addressRows(f).rows.map((x) => x.suggestions)).toEqual([[], []]);
  });
});

describe("places with no postal code", () => {
  const POSTAL = exportNotes(
    [
      testNote("a", "Bank", [], "345 King St W"),
      testNote("b", "Bakery", [], "345 King Street West, Toronto ON M5V 1J5"),
      testNote("c", "Shop", [], "12 Queen St E"),
      testNote("d", "Gym", [], "12 Queen St E, M5C 1R6"),
      testNote("e", "Deli", [], "99 Bay St"),
      testNote("f", "Bar", [], null),
    ],
    "2026-11-01",
  );

  it("reads a postal code only where the App can", () => {
    expect(hasPostal("345 King St W, Toronto ON M5V 1J5")).toBe(true);
    expect(hasPostal("345 King St W M5V1J5")).toBe(true);
    expect(hasPostal("345 King St W")).toBe(false);
    expect(hasPostal(undefined)).toBe(false);
  });

  it("is left out unless asked for", () => {
    expect(addressRows(read(POSTAL)).rows.map((r) => r.issue)).toEqual(["none"]);
  });

  it("lists them after the others, offering the address another place at the same house number and street has", () => {
    const rows = addressRows(read(POSTAL), { postal: true }).rows;
    expect(rows.map((r) => [r.place.name, r.issue, r.suggestions])).toEqual([
      ["Bar", "none", []],
      ["Bank", "no-postal", ["345 King Street West, Toronto ON M5V 1J5"]],
      ["Deli", "no-postal", []],
      ["Shop", "no-postal", ["12 Queen St E, M5C 1R6"]],
    ]);
  });

  it("reports a change that adds the postal code", () => {
    const file = read(POSTAL);
    const r = addressRows(file, { postal: true });
    const bank = r.rows[1]!;
    const changes = addressChanges(r, applyAddresses(file, r, new Map([[bank.id, bank.suggestions[0]!]])));
    expect(changes.map((c) => [c.row.place.name, c.readable, c.postal])).toEqual([["Bank", true, true]]);
  });
});

describe("addressProblem", () => {
  it("names what is wrong with a typed address", () => {
    expect(addressProblem("")).toBe("empty");
    expect(addressProblem("   ")).toBe("empty");
    expect(addressProblem("x".repeat(201))).toBe("too-long");
    expect(addressProblem(` ${"x".repeat(200)} `)).toBeUndefined();
    expect(addressProblem("12 King St W\nToronto")).toBe("control");
    expect(addressProblem("Near the station")).toBeUndefined();
  });
});

describe("applyAddresses", () => {
  const file = read(FILE);
  const r = addressRows(file);
  const cafe = r.rows[0]!;
  const kiosk = r.rows[2]!;

  it("gives every note of a place its new address, and leaves the rest alone", () => {
    const c = applyAddresses(file, r, new Map([[cafe.id, "12 King St W"]]));
    expect(c).toMatchObject({ places: 1, changed: 2, readable: 1 });
    expect(addr(c.notes, "c1")).toBe("12 King St W");
    expect(addr(c.notes, "c2")).toBe("12 King St W");
    expect(addr(c.notes, "p1")).toBeUndefined();
    expect(addr(c.notes, "k1")).toBe("Main Street");
    expect(c.notes).toHaveLength(7);
    // The rest of each note is unchanged.
    const before = file.places.flatMap((p) => p.notes).find((n) => n.id === "c1");
    expect({ ...c.notes.find((n) => n.id === "c1"), address: undefined }).toEqual({ ...before, address: undefined });
  });

  it("trims a typed address and counts one the App cannot read a street from as not readable", () => {
    const c = applyAddresses(file, r, new Map([[kiosk.id, "  Kiosk by the north gate  "]]));
    expect(c).toMatchObject({ places: 1, changed: 1, readable: 0 });
    expect(addr(c.notes, "k1")).toBe("Kiosk by the north gate");
  });

  it("changes nothing for an address with a problem or the same as now", () => {
    const c = applyAddresses(file, r, new Map([[cafe.id, ""], [kiosk.id, "Main Street"], ["no such place", "1 Main St"]]));
    expect(c).toMatchObject({ places: 0, changed: 0, readable: 0 });
    expect(c.notes).toEqual(file.places.flatMap((p) => p.notes));
  });

  it("handles several places at once", () => {
    const c = applyAddresses(file, r, new Map([[cafe.id, "40 Queen St E"], [kiosk.id, "7 Main St"], [r.rows[1]!.id, "1 Park Rd"]]));
    expect(c).toMatchObject({ places: 3, changed: 4, readable: 3 });
  });
});

describe("addressChanges", () => {
  const file = read(FILE);
  const r = addressRows(file);

  it("lists each place whose notes all carry a new address, in the list's order", () => {
    const c = applyAddresses(file, r, new Map([[r.rows[2]!.id, "Kiosk by the gate"], [r.rows[0]!.id, "12 King St W"]]));
    expect(addressChanges(r, c).map((x) => [x.row.place.name, x.to, x.readable])).toEqual([
      ["Café", "12 King St W", true],
      ["Kiosk", "Kiosk by the gate", false],
    ]);
  });

  it("says which places now join one already at that name and address, given the file", () => {
    const c = applyAddresses(file, r, new Map([[r.rows[0]!.id, "12 King St W"], [r.rows[1]!.id, "1 Park Rd"]]));
    expect(addressChanges(r, c, file).map((x) => [x.row.place.name, x.joins])).toEqual([
      ["Café", true],
      ["Park", false],
    ]);
    // A different name at the same address is a different place.
    const lib = applyAddresses(file, r, new Map([[r.rows[1]!.id, "100 King St W"]]));
    expect(addressChanges(r, lib, file).map((x) => x.joins)).toEqual([false]);
    // Without the file, nothing is said to join.
    expect(addressChanges(r, c).map((x) => x.joins)).toEqual([false, false]);
  });

  it("leaves out a place only some of whose notes changed", () => {
    const c = applyAddresses(file, r, new Map([[r.rows[0]!.id, "12 King St W"]]));
    const partial = { ...c, notes: c.notes.map((n) => (n.id === "c2" ? { ...n, address: undefined } : n)) };
    expect(addressChanges(r, partial)).toEqual([]);
  });

  it("is empty when nothing changed", () => {
    expect(addressChanges(r, applyAddresses(file, r, new Map()))).toEqual([]);
  });
});

describe("copyPlaces", () => {
  it("counts the places in the copy the way the App groups them", () => {
    const file = read(FILE);
    const r = addressRows(file);
    expect(copyPlaces(applyAddresses(file, r, new Map()), "en")).toBe(6);
    // Café joins the Café at 12 King St W.
    expect(copyPlaces(applyAddresses(file, r, new Map([[r.rows[0]!.id, "12 King St W"]])), "en")).toBe(5);
    expect(copyPlaces(applyAddresses(file, r, new Map([[r.rows[0]!.id, "9 Elm St"]])), "en")).toBe(6);
  });
});

describe("addressedFile", () => {
  it("is a notes export the App reads back, in which the place now joins the one with that address", () => {
    const file = read(FILE);
    const r = addressRows(file);
    const text = addressedFile(applyAddresses(file, r, new Map([[r.rows[0]!.id, "12 King St W"]])), TODAY);
    expect(JSON.parse(text)).toMatchObject({ exportedOn: "2026-11-21" });
    const back = importNotes(text);
    expect(back.error).toBeUndefined();
    expect(back.rejected).toBe(0);
    const again = read(text);
    expect(again.places.find((p) => p.address === "12 King St W")?.notes.map((n) => n.id).sort()).toEqual(["c1", "c2", "c3"]);
    expect(addressRows(again).rows.map((x) => x.place.name)).toEqual(["Park", "Kiosk"]);
  });
});

describe("addressesCsv", () => {
  it("has a header, one row per place with the addresses offered, a BOM and CRLF", () => {
    const csv = addressesCsv(addressRows(read(FILE)));
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
    const lines = csv.slice(1).trimEnd().split("\r\n");
    expect(lines).toEqual([ADDRESSES_CSV_COLUMNS.join(","), "Café,,none,2,12 King St W | 40 Queen St E", "Park,,none,1,", "Kiosk,Main Street,no-street,1,"]);
  });

  it("guards a place name a spreadsheet would run as a formula", () => {
    const csv = addressesCsv(addressRows(read(exportNotes([testNote("x", "=SUM(1)", [], null)], "2026-11-01"))));
    expect(csv).toContain("'=SUM(1)");
  });
});
