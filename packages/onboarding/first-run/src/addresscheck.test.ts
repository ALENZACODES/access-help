import { describe, expect, it } from "vitest";
import {
  ADDRESS_CSV_COLUMNS,
  NO_FIXES,
  addressCsv,
  applyFixes,
  checkAddresses,
  checkPostal,
  countIssues,
  fixedAddress,
  fixedFile,
  isIntersection,
  namesAtOneAddress,
  placeIssues,
  postalOutliers,
  streetSpellings,
  validPostalCode,
} from "./addresscheck";
import { exportNotes, importNotes } from "./exchange";
import { readStreetFile, type StreetFile } from "./filestreets";
import { groupPlaces } from "./places";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function file(): StreetFile {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("a", "Library", [{ key: "elevator", value: "yes" }], "100 King St W, Toronto ON M5H 2N2"),
        testNote("b", "Bank", [], "40 King Street West, Toronto ON M5H 1A1"),
        testNote("c", "Café", [], "12 King St W, Toronto ON m5h2n3"),
        testNote("d", "Deli", [], "7 Queen St E, Toronto ON M5C 2NO"),
        testNote("e", "Shop", [], "9 Queen St E, Toronto ON D5H 2N2"),
        testNote("k", "Kiosk", [], "Market Square, Toronto"),
        testNote("n", "Cart", [], null),
      ],
      "2026-11-01",
    ),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const issueFor = (name: string) => {
  const p = file().places.find((x) => x.name === name);
  if (!p) throw new Error(name);
  return placeIssues(p);
};

describe("postal codes", () => {
  it("knows a valid Canadian postal code by its letters", () => {
    expect(validPostalCode("M5H 2N2")).toBe(true);
    expect(validPostalCode("K1A 0B1")).toBe(true);
    for (const c of ["D5H 2N2", "W1A 1A1", "M5O 2N2", "M5H 2U2", "M5H2N2", "m5h 2n2"]) expect(validPostalCode(c), c).toBe(false);
  });

  it("leaves a code written the usual way alone, and says when it is written another way", () => {
    expect(checkPostal("1 A St, M5H 2N2")).toEqual({ kind: "ok", found: "M5H 2N2" });
    expect(checkPostal("1 A St, m5h2n2")).toEqual({ kind: "postal-format", found: "m5h2n2", suggestion: "M5H 2N2" });
    expect(checkPostal("1 A St, M5H-2N2")).toEqual({ kind: "postal-format", found: "M5H-2N2", suggestion: "M5H 2N2" });
  });

  it("suggests a code only when reading O as zero or I as one makes it valid", () => {
    expect(checkPostal("7 Queen St E, M5C 2NO")).toEqual({ kind: "postal-mistyped", found: "M5C 2NO", suggestion: "M5C 2N0" });
    expect(checkPostal("1 A St, KIA OB1")).toEqual({ kind: "postal-mistyped", found: "KIA OB1", suggestion: "K1A 0B1" });
    expect(checkPostal("9 Queen St E, D5H 2N2")).toEqual({ kind: "postal-invalid", found: "D5H 2N2" });
  });

  it("finds no postal code in an address without one, and does not read one inside a longer word", () => {
    expect(checkPostal("12 King St W, Toronto")).toBeUndefined();
    expect(checkPostal("1 A St, XM5H 2N2")).toBeUndefined();
  });
});

describe("placeIssues", () => {
  it("names each issue of a place", () => {
    expect(issueFor("Cart").map((i) => i.kind)).toEqual(["no-address"]);
    expect(issueFor("Kiosk").map((i) => i.kind)).toEqual(["no-street"]);
    expect(issueFor("Deli").map((i) => [i.kind, i.found, i.suggestion])).toEqual([["postal-mistyped", "M5C 2NO", "M5C 2N0"]]);
    expect(issueFor("Shop").map((i) => [i.kind, i.suggestion])).toEqual([["postal-invalid", undefined]]);
    expect(issueFor("Café").map((i) => i.kind)).toEqual(["postal-format"]);
    expect(issueFor("Library")).toEqual([]);
  });
});

describe("streetSpellings", () => {
  it("groups the ways one street is written, most places first", () => {
    expect(streetSpellings(file(), "en")).toEqual([
      { key: expect.any(String), forms: [{ text: "King St W", places: 2 }, { text: "King Street West", places: 1 }] },
    ]);
  });

  it("finds nothing when every street is written one way", () => {
    const r = readStreetFile(exportNotes([testNote("a", "A", [], "1 Oak St"), testNote("b", "B", [], "2 Oak St")], "2026-11-01"), TODAY, "en");
    if (!r.ok) throw new Error(r.error);
    expect(streetSpellings(r.file, "en")).toEqual([]);
  });
});

describe("checkAddresses", () => {
  it("lists the issues in a fixed order and counts them", () => {
    const r = checkAddresses(file(), "en");
    expect(r.issues.map((i) => i.kind)).toEqual(["no-address", "no-street", "postal-mistyped", "postal-invalid", "postal-format"]);
    expect(countIssues(r)).toEqual({ "no-address": 1, intersection: 0, "no-street": 1, "postal-mistyped": 1, "postal-invalid": 1, "postal-other-area": 0, "postal-format": 1 });
    expect(r.places).toBe(7);
  });
});

describe("fixes", () => {
  const f = file();
  const r = checkAddresses(f, "en");
  const id = (name: string): string => f.places.find((p) => p.name === name)?.id ?? "";

  it("writes the suggested postal code and the picked street form, and nothing else", () => {
    const deli = f.places.find((p) => p.name === "Deli");
    const bank = f.places.find((p) => p.name === "Bank");
    if (!deli || !bank) throw new Error("bad fixture");
    expect(fixedAddress(deli, r.issues, r.streets, { postal: [id("Deli")], streets: {}, names: {} })).toBe("7 Queen St E, Toronto ON M5C 2N0");
    const key = r.streets[0]?.key ?? "";
    expect(fixedAddress(bank, r.issues, r.streets, { postal: [], streets: { [key]: "King St W" }, names: {} })).toBe("40 King St W, Toronto ON M5H 1A1");
    expect(fixedAddress(bank, r.issues, r.streets, NO_FIXES)).toBe(bank.address);
  });

  it("applies a postal fix and a street form to the same address together", () => {
    const r2 = readStreetFile(exportNotes([testNote("a", "A", [], "1 Oak Street, m5h2n2"), testNote("b", "B", [], "2 Oak St"), testNote("c", "C", [], "3 Oak St")], "2026-11-01"), TODAY, "en");
    if (!r2.ok) throw new Error(r2.error);
    const rep = checkAddresses(r2.file, "en");
    const a = r2.file.places.find((p) => p.name === "A");
    if (!a) throw new Error("no place");
    expect(fixedAddress(a, rep.issues, rep.streets, { postal: [a.id], streets: { [rep.streets[0]?.key ?? ""]: "Oak St" }, names: {} })).toBe("1 Oak St, M5H 2N2");
  });

  it("never writes a street in a form that is not one of its own, and never fixes a code with no suggestion", () => {
    const bank = f.places.find((p) => p.name === "Bank");
    const shop = f.places.find((p) => p.name === "Shop");
    if (!bank || !shop) throw new Error("bad fixture");
    const key = r.streets[0]?.key ?? "";
    expect(fixedAddress(bank, r.issues, r.streets, { postal: [], streets: { [key]: "Queen St E" }, names: {} })).toBe(bank.address);
    expect(fixedAddress(shop, r.issues, r.streets, { postal: [id("Shop")], streets: {}, names: {} })).toBe(shop.address);
  });

  it("makes a copy where only the chosen addresses change, and the App reads it back", () => {
    const c = applyFixes(f, r, { postal: [id("Deli"), id("Café")], streets: {}, names: {} });
    expect([c.changedPlaces, c.changedNotes, c.joined]).toEqual([2, 2, 0]);
    const back = importNotes(fixedFile(c, TODAY));
    expect(back.error).toBeUndefined();
    expect(back.notes.find((n) => n.placeName === "Café")?.address).toBe("12 King St W, Toronto ON M5H 2N3");
    const lib = back.notes.find((n) => n.id === "a");
    expect(lib).toEqual(f.places.find((p) => p.name === "Library")?.notes[0]);
  });

  it("keeps the old address of a note when the new one would be longer than the App keeps", () => {
    const tail = `, ${"x".repeat(200 - "1 Oak St, ".length)}`;
    const long = `1 Oak St${tail}`;
    expect(long).toHaveLength(200);
    const r2 = readStreetFile(exportNotes([testNote("a", "A", [], long), testNote("b", "B", [], "2 Oak Street")], "2026-11-01"), TODAY, "en");
    if (!r2.ok) throw new Error(r2.error);
    const rep = checkAddresses(r2.file, "en");
    const key = rep.streets[0]?.key ?? "";
    const c = applyFixes(r2.file, rep, { postal: [], streets: { [key]: "Oak Street" }, names: {} });
    expect(c.notes.find((n) => n.id === "a")?.address).toBe(long);
    // Nothing was changed, so nothing is counted as changed.
    expect([c.changedPlaces, c.changedNotes]).toEqual([0, 0]);
  });

  it("says when a fix makes two places one", () => {
    const r2 = readStreetFile(exportNotes([testNote("x", "Shop", [{ key: "elevator", value: "yes" }], "1 Oak St"), testNote("y", "Shop", [{ key: "elevator", value: "no" }], "1 Oak Street")], "2026-11-01"), TODAY, "en");
    if (!r2.ok) throw new Error(r2.error);
    const rep = checkAddresses(r2.file, "en");
    const key = rep.streets[0]?.key ?? "";
    const c = applyFixes(r2.file, rep, { postal: [], streets: { [key]: "Oak St" }, names: {} });
    expect(c.joined).toBe(1);
    expect(groupPlaces([...c.notes], "en")).toHaveLength(1);
    expect(groupPlaces([...c.notes], "en")[0]?.resolutions.elevator.kind).toBe("differ");
  });
});

describe("addressCsv", () => {
  it("has a row per issue and per street spelling, guarded", () => {
    const lines = addressCsv(checkAddresses(file(), "en")).replace(/^\uFEFF/, "").trimEnd().split("\r\n");
    expect(lines[0]).toBe(ADDRESS_CSV_COLUMNS.join(","));
    expect(lines).toContain('Deli,"7 Queen St E, Toronto ON M5C 2NO",postal-mistyped,M5C 2NO,M5C 2N0');
    expect(lines).toContain(",,street-spelling,King Street West,King St W");
    expect(lines).toHaveLength(1 + 5 + 2);
    const evil = readStreetFile(exportNotes([testNote("z", "=Evil", [], null)], "2026-11-01"), TODAY, "en");
    if (!evil.ok) throw new Error(evil.error);
    expect(addressCsv(checkAddresses(evil.file, "en"))).toContain("'=Evil");
  });
});

describe("postal areas unlike the rest of their street", () => {
  const street = (codes: readonly string[]): StreetFile => {
    const r = readStreetFile(exportNotes(codes.map((c, i) => testNote(`p${i}`, `Place ${i}`, [], `${i + 1} Oak St, ${c}`)), "2026-11-01"), TODAY, "en");
    if (!r.ok) throw new Error(r.error);
    return r.file;
  };

  it("flags a place whose area differs from most of its street", () => {
    const out = postalOutliers(street(["M5H 2N2", "M5H 2N3", "M5H 2N4", "K7L 3N6"]));
    expect(out.map((i) => [i.place.name, i.kind, i.found])).toEqual([["Place 3", "postal-other-area", "K7L"]]);
    expect(out[0]?.suggestion).toBeUndefined();
  });

  it("says nothing with fewer than three codes on a street or with no clear majority", () => {
    expect(postalOutliers(street(["M5H 2N2", "K7L 3N6"]))).toEqual([]);
    expect(postalOutliers(street(["M5H 2N2", "M5H 2N3", "K7L 3N6", "K7L 3N7"]))).toEqual([]);
  });

  it("is listed among the issues, with no fix offered", () => {
    const r = checkAddresses(street(["M5H 2N2", "M5H 2N3", "M5H 2N4", "K7L 3N6"]), "en");
    expect(countIssues(r)["postal-other-area"]).toBe(1);
  });
});

describe("one address, several names", () => {
  const two = (): StreetFile => {
    const r = readStreetFile(
      exportNotes(
        [
          testNote("a", "Joe's Café", [{ key: "elevator", value: "yes" }], "5 Elm Ave"),
          testNote("a2", "Joe's Café", [], "5 Elm Ave"),
          testNote("b", "Joes Cafe and Bakery", [{ key: "elevator", value: "no" }], "5 Elm Avenue"),
          testNote("c", "Pharmacy", [], "9 Elm Ave"),
          testNote("k", "Stall", [], "Market Square"),
          testNote("k2", "Other stall", [], "market square."),
        ],
        "2026-11-01",
      ),
      TODAY,
      "en",
    );
    if (!r.ok) throw new Error(r.error);
    return r.file;
  };

  it("groups places with different names at the same house number and street, most notes first", () => {
    const g = namesAtOneAddress(two(), "en");
    expect(g.map((x) => x.places.map((p) => p.name))).toEqual([
      ["Joe's Café", "Joes Cafe and Bakery"],
      ["Other stall", "Stall"],
    ]);
  });

  it("joins them as one place in the copy only when the person picks a name to keep", () => {
    const f = two();
    const r = checkAddresses(f, "en");
    const group = r.names[0];
    const keep = group?.places[0];
    if (!group || !keep) throw new Error("no group");
    expect(applyFixes(f, r, NO_FIXES).joined).toBe(0);
    const c = applyFixes(f, r, { postal: [], streets: {}, names: { [group.key]: keep.id } });
    expect([c.changedPlaces, c.changedNotes, c.joined]).toEqual([1, 1, 1]);
    const joined = groupPlaces([...c.notes], "en").find((p) => p.name === "Joe's Café");
    expect(joined?.notes).toHaveLength(3);
    expect(joined?.address).toBe("5 Elm Ave");
    expect(joined?.resolutions.elevator.kind).toBe("differ");
  });

  it("ignores a pick that is not one of the group's places", () => {
    const f = two();
    const r = checkAddresses(f, "en");
    const key = r.names[0]?.key ?? "";
    const other = f.places.find((p) => p.name === "Pharmacy")?.id ?? "";
    expect(applyFixes(f, r, { postal: [], streets: {}, names: { [key]: other } }).changedPlaces).toBe(0);
  });

  it("lists the groups in the CSV", () => {
    expect(addressCsv(checkAddresses(two(), "en"))).toContain("Joes Cafe and Bakery,5 Elm Avenue,names-at-one-address,2,");
  });
});

describe("crossings of streets", () => {
  it("knows an address that names a corner", () => {
    for (const a of ["King St & Bay St", "Main and 1st", "corner of Elm and Oak", "Coin des rues Principale et Laurier", "Yonge / Bloor", "Queen @ Spadina", "intersection Main and Oak"]) expect(isIntersection(a), a).toBe(true);
  });

  it("does not take a house number, a plain place name or a name holding 'and' for a corner", () => {
    for (const a of ["12 King & Bay Plaza", "Market Square, Toronto", "Brandon", "Atlantic Ave"]) expect(isIntersection(a), a).toBe(false);
  });

  it("puts corners and postal areas unlike their street in the CSV", () => {
    const r = readStreetFile(
      exportNotes(
        [testNote("s", "Stand", [], "King St & Bay St"), ...["M5H 2N2", "M5H 2N3", "M5H 2N4", "K7L 3N6"].map((c, i) => testNote(`p${i}`, `P${i}`, [], `${i + 1} Oak St, ${c}`))],
        "2026-11-01",
      ),
      TODAY,
      "en",
    );
    if (!r.ok) throw new Error(r.error);
    const csv = addressCsv(checkAddresses(r.file, "en"));
    expect(csv).toContain("Stand,King St & Bay St,intersection,,");
    expect(csv).toContain('P3,"4 Oak St, K7L 3N6",postal-other-area,K7L,');
  });

  it("lists a corner apart from other addresses with no street", () => {
    const r = readStreetFile(exportNotes([testNote("a", "Stand", [], "King St & Bay St"), testNote("b", "Stall", [], "Market Square")], "2026-11-01"), TODAY, "en");
    if (!r.ok) throw new Error(r.error);
    expect(checkAddresses(r.file, "en").issues.map((i) => [i.place.name, i.kind])).toEqual([
      ["Stand", "intersection"],
      ["Stall", "no-street"],
    ]);
  });
});
