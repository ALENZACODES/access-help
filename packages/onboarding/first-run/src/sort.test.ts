import { describe, expect, it } from "vitest";
import { emptyForm, groupPlaces, isSortKey, newestNote, reportTotal, sortPlaces, toNote, type FactKey, type Note, type Tri } from "./index";

function mk(id: string, name: string, on: string, details: Partial<Record<FactKey, Tri>>): Note {
  const f = emptyForm(new Date(`${on}T00:00:00Z`));
  return toNote({ ...f, placeName: name, observedOn: on, licence: "CC0-1.0", details: { ...f.details, "automatic-door": "yes", ...details } }, new Date(`${on}T00:00:00Z`), () => id);
}

const places = groupPlaces(
  [
    mk("a", "Bakery", "2026-01-01", {}),
    mk("b", "Archive", "2026-05-01", { elevator: "yes", "step-free-entry": "yes" }),
    mk("c", "Cinema", "2026-09-01", { elevator: "no" }),
    mk("d", "Cinema", "2026-02-01", { elevator: "yes" }),
  ],
  "en",
);

describe("sortPlaces", () => {
  const names = (k: Parameters<typeof sortPlaces>[1]) => sortPlaces(places, k, "en").map((p) => p.name);

  it("sorts by name", () => expect(names("name")).toEqual(["Archive", "Bakery", "Cinema"]));
  it("sorts by newest note, newest first", () => expect(names("newest")).toEqual(["Cinema", "Archive", "Bakery"]));
  it("sorts by number of reports, then name", () => expect(names("reports")).toEqual(["Cinema", "Archive", "Bakery"]));

  it("counts reports and finds the newest note", () => {
    const cinema = places.find((p) => p.name === "Cinema")!;
    // Both of Cinema's notes count, even where they differ: 2 door + 2 elevator reports.
    expect(reportTotal(cinema)).toBe(4);
    expect(reportTotal(places.find((p) => p.name === "Archive")!)).toBe(3);
    expect(newestNote(cinema)).toBe("2026-09-01");
  });

  it("does not change the list it is given", () => {
    const before = places.map((p) => p.id);
    sortPlaces(places, "reports", "en");
    expect(places.map((p) => p.id)).toEqual(before);
  });

  it("recognises only real sort keys", () => {
    expect(isSortKey("name")).toBe(true);
    expect(isSortKey("best")).toBe(false);
    expect(isSortKey(undefined)).toBe(false);
  });
});
