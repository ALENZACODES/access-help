import { describe, expect, it } from "vitest";
import {
  COPY,
  FACT_KEYS,
  QUESTIONS,
  detailGaps,
  gapQuestion,
  gapTotal,
  gapsFilename,
  gapsOfPlace,
  gapsToText,
  groupPlaces,
  hasNoRecord,
  needKeys,
  placeCount,
  placesWithGaps,
  type Note,
} from "./index";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));

const NOTES = (): Note[] => [
  // Library: every detail recorded across two notes, one detail with reports that differ.
  testNote("l1", "Library", [
    { key: "step-free-entry", value: "yes" },
    { key: "accessible-washroom", value: "yes" },
    { key: "automatic-door", value: "no" },
  ]),
  testNote("l2", "Library", [{ key: "elevator", value: "yes" }, { key: "automatic-door", value: "yes" }]),
  // Bakery: one detail recorded.
  testNote("b1", "Bakery", [{ key: "step-free-entry", value: "no" }], "2 Main St"),
  // Arena: nothing recorded, no address.
  testNote("a1", "Arena", [], null),
];

const places = () => groupPlaces(NOTES(), "en");
const names = (key: (typeof FACT_KEYS)[number]) => detailGaps(places()).find((g) => g.key === key)?.places.map((p) => p.name);

describe("detailGaps", () => {
  it("lists one entry for every detail, in the App's detail order", () => {
    expect(detailGaps(places()).map((g) => g.key)).toEqual([...FACT_KEYS]);
    expect(detailGaps([]).map((g) => g.places.length)).toEqual(FACT_KEYS.map(() => 0));
  });

  it("lists the places with no record for a detail, by name", () => {
    expect(names("step-free-entry")).toEqual(["Arena"]);
    expect(names("accessible-washroom")).toEqual(["Arena", "Bakery"]);
    expect(names("elevator")).toEqual(["Arena", "Bakery"]);
  });

  it("does not count a detail whose reports differ as having no record", () => {
    const library = places().find((p) => p.name === "Library");
    expect(library?.resolutions["automatic-door"].kind).toBe("differ");
    expect(names("automatic-door")).toEqual(["Arena", "Bakery"]);
    expect(library && hasNoRecord(library, "automatic-door")).toBe(false);
  });

  it("does not count a recorded No as no record", () => {
    const bakery = places().find((p) => p.name === "Bakery");
    expect(bakery && hasNoRecord(bakery, "step-free-entry")).toBe(false);
  });

  it("breaks a tie on the name with the place id, so the order never changes", () => {
    const twins = groupPlaces([testNote("x", "Hall", [], "9 King St"), testNote("y", "Hall", [], "1 King St")], "en");
    const ids = detailGaps(twins)[0]?.places.map((p) => p.id) ?? [];
    expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b)));
    expect(detailGaps([...twins].reverse())[0]?.places.map((p) => p.id)).toEqual(ids);
  });

  it("does not change the places it is given", () => {
    const list = places();
    const before = JSON.stringify(list);
    detailGaps(list);
    expect(JSON.stringify(list)).toBe(before);
  });
});

describe("counts", () => {
  it("adds up the pairs and counts each place once", () => {
    const list = detailGaps(places());
    // Arena misses 4, Bakery misses 3, Library misses 0.
    expect(gapTotal(list)).toBe(7);
    expect(placesWithGaps(list)).toBe(2);
  });

  it("are zero when every detail is recorded everywhere", () => {
    const list = detailGaps(groupPlaces([NOTES()[0] as Note, NOTES()[1] as Note], "en"));
    expect(gapTotal(list)).toBe(0);
    expect(placesWithGaps(list)).toBe(0);
  });

  it("lists the gaps of one place in the App's detail order", () => {
    const arena = places().find((p) => p.name === "Arena");
    const bakery = places().find((p) => p.name === "Bakery");
    expect(arena && gapsOfPlace(arena)).toEqual([...FACT_KEYS]);
    expect(bakery && gapsOfPlace(bakery)).toEqual(FACT_KEYS.filter((k) => k !== "step-free-entry"));
  });

  it("names a count of places in both languages", () => {
    expect([0, 1, 2].map((n) => placeCount(n, "en"))).toEqual(["0 places", "1 place", "2 places"]);
    expect([0, 1, 2].map((n) => placeCount(n, "fr"))).toEqual(["0 lieu", "1 lieu", "2 lieux"]);
  });

  it("asks the same question as the visit plan", () => {
    for (const key of FACT_KEYS) {
      for (const l of ["en", "fr"] as const) expect(gapQuestion(key, l)).toBe(QUESTIONS[key][l]);
    }
  });
});

describe("gapsToText", () => {
  it("writes each detail, its question and its places, with addresses when known", () => {
    const text = gapsToText(detailGaps(places()), 3, "en", TODAY);
    expect(text.startsWith(`${COPY.gaps.title.en}\n${"=".repeat(COPY.gaps.title.en.length)}\n`)).toBe(true);
    expect(text).toContain("Places with at least one detail Unknown: 2 / 3\n");
    expect(text).toContain(`Step-free entrance (1 place)\n`);
    expect(text).toContain(`Ask the place: ${QUESTIONS["step-free-entry"].en}\n- Arena\n`);
    expect(text).toContain("- Arena\n- Bakery, 2 Main St\n");
    expect(text.endsWith("Made on 2026-11-19.\n")).toBe(true);
  });

  it("says when every place has a record for a detail", () => {
    const one = groupPlaces([NOTES()[2] as Note], "en");
    const text = gapsToText(detailGaps(one), 1, "en", TODAY);
    expect(text).toContain(`Step-free entrance (0 places)\n------------------\n${COPY.gaps.allRecorded.en}\n`);
  });

  it("says there are no places when there are none", () => {
    const text = gapsToText([], 0, "en", TODAY);
    expect(text).toContain(`${COPY.gaps.noPlaces.en}\n`);
    expect(text).not.toContain("Ask the place:");
  });

  it("uses French words, the UNKNOWN token and a no-break space before colons", () => {
    const text = gapsToText(detailGaps(places()), 3, "fr", TODAY);
    expect(text).toContain("Lieux avec au moins un détail UNKNOWN : 2 / 3");
    expect(text).toContain("Question à poser au lieu : ");
    expect(text).toContain("Créé le 2026-11-19.");
    expect(text).not.toMatch(/\binconnu/i);
    expect(text).not.toMatch(/[^  ](?=[:;?!])/u);
  });

  it("never writes Yes or No for a place it lists", () => {
    for (const l of ["en", "fr"] as const) {
      const text = gapsToText(detailGaps(places()), 3, l, TODAY);
      const listed = text.split("\n").filter((line) => line.startsWith("- "));
      expect(listed.length).toBe(7);
      for (const line of listed) expect(line).not.toMatch(/\b(Yes|No|Oui|Non)\b/);
    }
  });
});

describe("gapsFilename", () => {
  it("names the file by date and language", () => {
    expect(gapsFilename(TODAY, "en")).toBe("details-with-no-record-2026-11-19-en.txt");
    expect(gapsFilename(TODAY, "fr")).toBe("details-sans-donnee-2026-11-19-fr.txt");
  });
});

describe("must-haves", () => {
  it("lists the must-have details in the App's detail order, whatever answer is wanted", () => {
    expect(needKeys({})).toEqual([]);
    expect(needKeys({ elevator: "yes", "step-free-entry": "no" })).toEqual(["step-free-entry", "elevator"]);
  });

  it("limits the gaps to the details asked for, keeping the detail order", () => {
    const list = detailGaps(places(), ["elevator", "step-free-entry"]);
    expect(list.map((g) => g.key)).toEqual(["step-free-entry", "elevator"]);
    expect(list.map((g) => g.places.map((p) => p.name))).toEqual([["Arena"], ["Arena", "Bakery"]]);
    expect(gapTotal(list)).toBe(3);
  });

  it("gives every detail when no keys are given, and none for an empty list", () => {
    expect(detailGaps(places()).map((g) => g.key)).toEqual([...FACT_KEYS]);
    expect(detailGaps(places(), [])).toEqual([]);
  });

  it("says in the text file that only must-haves are shown", () => {
    const only = gapsToText(detailGaps(places(), ["elevator"]), 3, "en", TODAY, true);
    expect(only).toContain(`${COPY.gaps.notNo.en}\n${COPY.gaps.showingNeeds.en}\n\n`);
    expect(only).not.toContain("Step-free entrance (");
    const all = gapsToText(detailGaps(places()), 3, "en", TODAY);
    expect(all).not.toContain(COPY.gaps.showingNeeds.en);
    expect(gapsToText(detailGaps(places(), ["elevator"]), 3, "fr", TODAY, true)).toContain(COPY.gaps.showingNeeds.fr);
  });
});
