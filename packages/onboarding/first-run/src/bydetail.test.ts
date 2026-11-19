import { describe, expect, it } from "vitest";
import {
  COPY,
  CONTRIBUTOR_SOURCE,
  DETAIL_GROUPS,
  FACT_KEYS,
  QUESTIONS,
  bucketCounts,
  byDetailFilename,
  byDetailToText,
  detailBuckets,
  entryLine,
  findBanned,
  groupLabel,
  groupOf,
  groupPlaces,
  hasAllParts,
  isFactKey,
  reportCountText,
  type Note,
  type Place,
} from "./index";
import { makeRng, randomNotes } from "./testkit";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));

const NOTES = (): Note[] => [
  // Library: elevator Yes twice, newest from a contributor.
  testNote("l1", "Library", [{ key: "elevator", value: "yes", on: "2025-02-02" }]),
  testNote("l2", "Library", [{ key: "elevator", value: "yes", on: "2026-08-08", source: CONTRIBUTOR_SOURCE }]),
  // Bakery: elevator No.
  testNote("b1", "Bakery", [{ key: "elevator", value: "no", on: "2026-01-01", source: "Town open data", licence: "OGL-Canada-2.0" }], "2 Main St"),
  // Cafe: reports differ.
  testNote("c1", "Cafe", [{ key: "elevator", value: "yes", on: "2026-03-03" }], "3 Main St"),
  testNote("c2", "Cafe", [{ key: "elevator", value: "no", on: "2026-04-04" }], "3 Main St"),
  // Arena: nothing.
  testNote("a1", "Arena", [], null),
];

const places = (): Place[] => groupPlaces(NOTES(), "en");
const names = (list: readonly { place: Place }[]): string[] => list.map((e) => e.place.name);

describe("isFactKey", () => {
  it("accepts the App's details only", () => {
    for (const k of FACT_KEYS) expect(isFactKey(k)).toBe(true);
    for (const v of [undefined, "", "lift", "Elevator", "elevator "]) expect(isFactKey(v), String(v)).toBe(false);
  });
});

describe("detailBuckets", () => {
  it("puts each place in the group its notes give", () => {
    const b = detailBuckets(places(), "elevator");
    expect(names(b.yes)).toEqual(["Library"]);
    expect(names(b.no)).toEqual(["Bakery"]);
    expect(names(b.differ)).toEqual(["Cafe"]);
    expect(names(b.unknown)).toEqual(["Arena"]);
  });

  it("keeps the newest record for a Yes or a No, and none for the others", () => {
    const b = detailBuckets(places(), "elevator");
    expect(b.yes[0]?.reports).toBe(2);
    expect(b.yes[0]?.newest).toEqual({ source: CONTRIBUTOR_SOURCE, licence: "CC0-1.0", recordedOn: "2026-08-08" });
    expect(b.no[0]?.newest?.licence).toBe("OGL-Canada-2.0");
    expect(b.differ[0]?.newest).toBeUndefined();
    expect(b.differ[0]?.reports).toBe(2);
    expect(b.unknown[0]).toMatchObject({ reports: 0, newest: undefined });
  });

  it("puts every place in exactly one group, for every detail, on random notes", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const list = groupPlaces(randomNotes(makeRng(seed), 12), "en");
      for (const key of FACT_KEYS) {
        const b = detailBuckets(list, key);
        const all = DETAIL_GROUPS.flatMap((g) => b[g].map((e) => e.place.id));
        expect(all.length, `${seed} ${key}`).toBe(list.length);
        expect(new Set(all).size, `${seed} ${key}`).toBe(list.length);
        for (const g of DETAIL_GROUPS) {
          for (const e of b[g]) expect(groupOf(e.place, key), `${seed} ${key}`).toBe(g);
          const sorted = [...b[g]].sort((x, y) => x.place.name.localeCompare(y.place.name) || x.place.id.localeCompare(y.place.id));
          expect(names(b[g]), `${seed} ${key} ${g}`).toEqual(names(sorted));
        }
      }
    }
  });

  it("counts the groups", () => {
    expect(bucketCounts(detailBuckets(places(), "elevator"))).toEqual({ yes: 1, no: 1, differ: 1, unknown: 1 });
    expect(bucketCounts(detailBuckets(places(), "automatic-door"))).toEqual({ yes: 0, no: 0, differ: 0, unknown: 4 });
    expect(bucketCounts(detailBuckets([], "elevator"))).toEqual({ yes: 0, no: 0, differ: 0, unknown: 0 });
  });
});

describe("wording", () => {
  it("names the groups with the App's own words", () => {
    expect(DETAIL_GROUPS.map((g) => groupLabel(g, "en"))).toEqual(["Yes", "No", "Reports differ", COPY.values.unknown.en]);
    expect(DETAIL_GROUPS.map((g) => groupLabel(g, "fr"))).toEqual(["Oui", "Non", "Rapports divergents", COPY.values.unknown.fr]);
  });

  it("counts reports in both languages", () => {
    expect([1, 2].map((n) => reportCountText(n, "en"))).toEqual(["1 report", "2 reports"]);
    expect([1, 2].map((n) => reportCountText(n, "fr"))).toEqual(["1 rapport", "2 rapports"]);
  });

  it("writes a Yes line with the newest record in full", () => {
    const b = detailBuckets(places(), "elevator");
    const yes = b.yes[0];
    if (!yes?.newest) throw new Error("no newest");
    const line = entryLine(yes, "yes", "en");
    expect(line.startsWith("Library, 1 Main St. 2 reports. Newest record: ")).toBe(true);
    expect(hasAllParts(line, yes.newest, "en")).toBe(true);
  });

  it("writes no source for UNKNOWN and no single answer for reports that differ", () => {
    const b = detailBuckets(places(), "elevator");
    expect(entryLine(b.unknown[0] as never, "unknown", "en")).toBe("Arena");
    expect(entryLine(b.differ[0] as never, "differ", "en")).toBe("Cafe, 3 Main St. 2 reports.");
  });
});

describe("byDetailToText", () => {
  it("writes the four groups with their places, the question for UNKNOWN and the note for differing reports", () => {
    const text = byDetailToText(places(), "elevator", "en", TODAY);
    expect(text.startsWith("One detail across places: Elevator\n")).toBe(true);
    expect(text).toContain("Yes (1)\n-------\n- Library, 1 Main St. 2 reports. Newest record: ");
    expect(text).toContain("No (1)\n");
    expect(text).toContain(`Reports differ (1)\n------------------\n${COPY.byDetail.differNote.en}\n- Cafe, 3 Main St. 2 reports.\n`);
    expect(text).toContain(`${COPY.gaps.ask.en}: ${QUESTIONS.elevator.en}\n- Arena\n`);
    expect(text.endsWith("Made on 2026-11-19.\n")).toBe(true);
  });

  it("says when a group is empty, and when there are no places", () => {
    expect(byDetailToText(places(), "automatic-door", "en", TODAY)).toContain(`Yes (0)\n-------\n${COPY.byDetail.emptyGroup.en}\n`);
    const none = byDetailToText([], "elevator", "en", TODAY);
    expect(none).toContain(COPY.byDetail.noPlaces.en);
    expect(none).not.toContain("Yes (");
  });

  it("keeps French typography and never ranks", () => {
    const fr = byDetailToText(places(), "elevator", "fr", TODAY);
    expect(fr.startsWith("Un détail dans tous les lieux\u00A0: Ascenseur\n")).toBe(true);
    expect(fr).not.toMatch(/[^\u00A0\u202F](?=[:;?!])/u);
    expect(fr).not.toMatch(/\binconnu/i);
    for (const l of ["en", "fr"] as const) {
      const text = byDetailToText(places(), "elevator", l, TODAY).replace(COPY.byDetail.noRank[l], "");
      expect(findBanned(text), l).toBeUndefined();
      expect(text, l).not.toMatch(/\b(best|worst|score|ranked|top|meilleur|pire|classement)\b/i);
    }
  });

  it("names the file by detail, date and language", () => {
    expect(byDetailFilename("elevator", TODAY, "en")).toBe("one-detail-elevator-2026-11-19-en.txt");
    expect(byDetailFilename("step-free-entry", TODAY, "fr")).toBe("un-detail-step-free-entry-2026-11-19-fr.txt");
  });
});
