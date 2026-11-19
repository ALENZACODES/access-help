import { describe, expect, it } from "vitest";
import { buildTagsView, placeName, startId, tagOptions, tagsFile } from "./tagsModel.js";
import type { PlaceRecord } from "./types.js";

function place(over: Partial<PlaceRecord> = {}): PlaceRecord {
  return { id: "a1", lat: 43.85, lon: -79.43, name: "Sample Library", wheelchair: "yes", source: "own visit", licence: "CC0-1.0", observedOn: "2026-11-10", ...over };
}

const NOTES: PlaceRecord[] = [
  place(),
  place({ id: "a2", name: null, wheelchair: "UNKNOWN", observedOn: "2026-11-14" }),
  place({ id: "a3", name: "Sample Arena", wheelchair: "no", observedOn: "2026-11-12" }),
];
const MAP_TEXT = "name=Sample Public Library\namenity=library\nwheelchair=limited\ncheck_date:wheelchair=2026-11-15";

describe("tag page choices", () => {
  it("opens on the newest observation that has a status", () => {
    expect(startId(NOTES)).toBe("a3");
  });
  it("opens on the newest of all when none has a status", () => {
    expect(startId([place({ id: "u1", wheelchair: "UNKNOWN", observedOn: "2026-01-01" }), place({ id: "u2", wheelchair: "UNKNOWN", observedOn: "2026-02-01" })])).toBe("u2");
    expect(startId([])).toBeNull();
  });
  it("lists observations newest first with name, day and status", () => {
    expect(tagOptions(NOTES, "en")).toEqual([
      { id: "a2", label: "Place without a name, 2026-11-14, UNKNOWN" },
      { id: "a3", label: "Sample Arena, 2026-11-12, no" },
      { id: "a1", label: "Sample Library, 2026-11-10, yes" },
    ]);
  });
  it("keeps the status words as stored in French and translates the rest", () => {
    expect(tagOptions(NOTES, "fr")[0]?.label).toBe("Lieu sans nom, 2026-11-14, UNKNOWN");
  });
  it("names a blank name as a place without a name", () => {
    expect(placeName({ name: "  " }, "en")).toBe("Place without a name");
    expect(placeName({ name: " Sample Café " }, "en")).toBe("Sample Café");
  });
  it("does not change the order of the saved list", () => {
    const copy = NOTES.map((r) => r.id);
    tagOptions(NOTES, "en");
    startId(NOTES);
    expect(NOTES.map((r) => r.id)).toEqual(copy);
  });
});

describe("tag page view", () => {
  it("shows nothing when there is no observation or the id is not saved", () => {
    expect(buildTagsView([], null, "", "en").detail).toBeNull();
    const gone = buildTagsView(NOTES, "nope", "", "en");
    expect(gone.detail).toBeNull();
    expect(gone.chosenId).toBeNull();
    expect(gone.options).toHaveLength(3);
  });
  it("always carries the line saying the App adds nothing to the map", () => {
    expect(buildTagsView([], null, "", "en").neverUploads).toMatch(/^The App adds nothing to OpenStreetMap\./);
  });
  it("shows the tags, a copy text, the steps and the draft for an observation with a status", () => {
    const d = buildTagsView(NOTES, "a1", "", "en").detail;
    expect(d?.tags.map((t) => t.key)).toEqual(["name", "wheelchair", "check_date:wheelchair", "source"]);
    expect(d?.copyText).toBe("name=Sample Library\nwheelchair=yes\ncheck_date:wheelchair=2026-11-10\nsource=own visit");
    expect(d?.steps).toHaveLength(8);
    expect(d?.comment).toBe("Wheelchair access for 1 place, seen in person on 2026-11-10.");
    expect(d?.source).toBe("own visit");
    expect(d).toMatchObject({ heldBack: [], problems: [], compare: null, pasteNotes: [] });
  });
  it("gives the record line with source, licence, date and tier", () => {
    expect(buildTagsView(NOTES, "a1", "", "en").detail?.recordLine).toBe("Status: yes. Source: own visit. Licence: CC0-1.0. Seen on 2026-11-10. Tier: UNKNOWN. Spot: 43.85000, -79.43000.");
  });
  it("writes no wheelchair tag and no draft for UNKNOWN, and says why", () => {
    const d = buildTagsView(NOTES, "a2", "", "en").detail;
    expect(d?.tags).toEqual([{ key: "source", value: "own visit" }]);
    expect(d?.heldBack[0]).toContain("UNKNOWN is never turned into yes, limited or no.");
    expect(d?.steps).toHaveLength(1);
    expect(d?.comment).toBe("");
    expect(d?.changesetNotes.at(-1)).toBe("Observations left out because their status is UNKNOWN: 1.");
  });
  it("sets pasted tags beside the observation’s tags", () => {
    const d = buildTagsView(NOTES, "a1", MAP_TEXT, "en").detail;
    expect(d?.compare?.summary).toBe("Tags - to add: 1; the same: 0; different: 3; on the map only: 1.");
    expect(d?.compare?.rows.map((r) => [r.key, r.what])).toEqual([
      ["name", "Differs from the map"],
      ["wheelchair", "Differs from the map"],
      ["check_date:wheelchair", "Differs from the map"],
      ["source", "Would be added"],
      ["amenity", "On the map only: leave it"],
    ]);
    expect(d?.compare?.cautions).toHaveLength(3);
  });
  it("reports pasted lines it could not read and still compares the rest", () => {
    const d = buildTagsView(NOTES, "a1", "some words\nwheelchair=yes", "en").detail;
    expect(d?.pasteNotes).toEqual(["Lines the App could not read as key=value: 1."]);
    expect(d?.compare?.rows.find((r) => r.key === "wheelchair")?.kind).toBe("same");
  });
  it("does not compare when nothing readable was pasted", () => {
    const d = buildTagsView(NOTES, "a1", "some words", "en").detail;
    expect(d?.compare).toBeNull();
    expect(d?.pasteNotes).toHaveLength(1);
  });
  it("flags a date that is not a real day", () => {
    const d = buildTagsView([place({ observedOn: "2026-02-31" })], "a1", "", "en").detail;
    expect(d?.problems).toEqual(["check_date:wheelchair: the date is not a real day written as year-month-day."]);
  });
  it("writes French for the same view", () => {
    const d = buildTagsView(NOTES, "a1", MAP_TEXT, "fr").detail;
    expect(d?.compare?.rows[0]?.what).toBe("Diffère de la carte");
    expect(d?.comment).toBe("Accès en fauteuil roulant pour 1 lieu, vu sur place le 2026-11-10.");
    expect(d?.copyText).toContain("wheelchair=yes");
  });
});

describe("tag page file", () => {
  it("makes no file when nothing is shown", () => {
    expect(tagsFile(buildTagsView([], null, "", "en"), "en")).toBeNull();
  });
  it("makes a text sheet named by the observation id", () => {
    const file = tagsFile(buildTagsView(NOTES, "a1", MAP_TEXT, "en"), "en");
    expect(file).toMatchObject({ filename: "tags-a1.txt", mime: "text/plain" });
    expect(file?.content).toContain("Tags to type by hand: Sample Library");
    expect(file?.content).toContain("- wheelchair | yes | limited | Differs from the map");
  });
  it("keeps UNKNOWN out of the tags in the file", () => {
    const file = tagsFile(buildTagsView(NOTES, "a2", "", "en"), "en");
    expect(file?.content).not.toMatch(/^wheelchair=/m);
    expect(file?.content).toContain("Status: UNKNOWN.");
  });
});
