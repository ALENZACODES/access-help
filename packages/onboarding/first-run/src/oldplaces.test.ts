import { describe, expect, it } from "vitest";
import { COPY, auditCopy, findBanned, groupPlaces, type Note, type Place } from "./index";
import { agesReport, agesToText } from "./ages";
import { OLD_PLACE_MONTHS, monthsText, newestRecord, oldPlaces, oldPlacesLines, oldPlacesStrings, renderOldPlaces } from "./oldplaces";
import { makeRng, randomNotes } from "./testkit";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));
const NOTES = (): Note[] => [
  testNote("o1", "Old Hall", [{ key: "elevator", value: "yes", on: "2023-02-02" }, { key: "automatic-door", value: "no", on: "2024-01-01" }]),
  testNote("e1", "Edge", [{ key: "elevator", value: "yes", on: "2024-11-19" }], "2 Main St"),
  testNote("n1", "New Cafe", [{ key: "elevator", value: "yes", on: "2024-11-20" }], "3 Main St"),
  testNote("x1", "Empty", [], "4 Main St"),
];
const places = (): Place[] => groupPlaces(NOTES(), "en");
const OLD_PLACES_COPY_TITLE_EN = "Places whose newest record is 2 years old or more";

describe("newestRecord", () => {
  it("is the latest date across every record, or undefined with no record", () => {
    const by = (name: string) => places().find((p) => p.name === name) as Place;
    expect(newestRecord(by("Old Hall"))).toBe("2024-01-01");
    expect(newestRecord(by("Empty"))).toBeUndefined();
  });
});

describe("oldPlaces", () => {
  it("keeps places whose newest record is 2 years old or more, oldest first", () => {
    expect(OLD_PLACE_MONTHS).toBe(24);
    expect(oldPlaces(places(), TODAY).map((o) => [o.place.name, o.newest])).toEqual([
      ["Old Hall", "2024-01-01"],
      ["Edge", "2024-11-19"],
    ]);
  });

  it("leaves out places with no record, which stay UNKNOWN elsewhere", () => {
    expect(oldPlaces(places(), TODAY).map((o) => o.place.name)).not.toContain("Empty");
  });

  it("only ever lists places that have a record that old, on random notes", () => {
    for (let seed = 1; seed <= 30; seed++) {
      for (const o of oldPlaces(groupPlaces(randomNotes(makeRng(seed), 12), "en"), TODAY)) {
        expect(o.months, String(seed)).toBeGreaterThanOrEqual(OLD_PLACE_MONTHS);
        expect(newestRecord(o.place), String(seed)).toBe(o.newest);
      }
    }
  });
});

describe("renderOldPlaces", () => {
  it("lists places with a history button tied to each name", () => {
    const html = renderOldPlaces(places(), "en", TODAY);
    expect(html).toContain('aria-describedby="old-place-0"');
    expect(html).toContain(COPY.places.viewHistory.en);
  });

  it("says when no place is that old", () => {
    expect(renderOldPlaces(places().filter((p) => p.name === "New Cafe"), "en", TODAY)).toContain("data-old-none");
  });

  it("strings pass the App's copy audit", () => {
    expect(auditCopy(oldPlacesStrings()).map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
  });
});

describe("oldPlacesLines", () => {
  it("lists each old place with address, newest date and age, oldest first", () => {
    const lines = oldPlacesLines(places(), "en", TODAY);
    expect(lines[0]).toBe(OLD_PLACES_COPY_TITLE_EN);
    expect(lines.filter((x) => x.startsWith("- "))).toEqual([
      "- Old Hall (1 Main St) · Newest record: 2024-01-01 · 34 months ago",
      "- Edge (2 Main St) · Newest record: 2024-11-19 · 24 months ago",
    ]);
    expect(lines.at(-1)).toBe("");
  });

  it("says when there is none, and uses French typography", () => {
    const fresh = groupPlaces([testNote("n", "New Cafe", [{ key: "elevator", value: "yes", on: "2026-06-01" }])], "fr");
    const lines = oldPlacesLines(fresh, "fr", TODAY);
    expect(lines).toContain("Chaque lieu avec une donnée en a une de moins de 2 ans.");
    const fr = oldPlacesLines(groupPlaces(NOTES(), "fr"), "fr", TODAY).join("\n");
    expect(fr).toContain("Donnée la plus récente\u00A0: 2024-01-01 · il y a 34 mois");
    expect(fr).not.toMatch(/[^\u00A0]:/);
    expect(findBanned(fr)).toBeUndefined();
  });

  it("says month in the singular for one", () => {
    expect(monthsText(1, "en")).toBe("1 month ago");
    expect(monthsText(30, "en")).toBe("30 months ago");
    expect(monthsText(1, "fr")).toBe("il y a 1 mois");
  });

  it("goes into the record ages file, before the made-on line", () => {
    const text = agesToText(agesReport(places(), TODAY), "en", TODAY, oldPlacesLines(places(), "en", TODAY));
    const at = text.indexOf(OLD_PLACES_COPY_TITLE_EN);
    expect(at).toBeGreaterThan(0);
    expect(at).toBeLessThan(text.indexOf(COPY.textExport.madeOn.en));
    expect(agesToText(agesReport(places(), TODAY), "en", TODAY)).not.toContain(OLD_PLACES_COPY_TITLE_EN);
  });
});
