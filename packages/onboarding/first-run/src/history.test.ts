import { describe, expect, it } from "vitest";
import {
  CONTRIBUTOR_SOURCE,
  COPY,
  FACT_KEYS,
  changeLabel,
  chronological,
  detailHistory,
  distinctRecords,
  entryAge,
  findBanned,
  frenchTypographyIssues,
  groupPlaces,
  hasAllParts,
  historyFilename,
  historyToText,
  placeHistory,
  recordCount,
  timeline,
  type Note,
  type Observation,
  type Place,
} from "./index";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 15));

function onePlace(notes: readonly Note[]): Place {
  const places = groupPlaces(notes, "en");
  expect(places).toHaveLength(1);
  return places[0] as Place;
}

const obs = (noteId: string, value: "yes" | "no", on: string, source = "City survey"): Observation => ({
  noteId,
  value,
  provenance: { source, licence: "CC0-1.0", recordedOn: on },
});

const LIBRARY = (): Note[] => [
  testNote("n1", "Library", [{ key: "elevator", value: "yes", on: "2024-01-10" }]),
  testNote("n2", "Library", [{ key: "elevator", value: "no", on: "2025-06-01", source: CONTRIBUTOR_SOURCE }]),
  testNote("n3", "Library", [
    { key: "elevator", value: "no", on: "2026-09-09" },
    { key: "automatic-door", value: "yes", on: "2026-09-09", source: "Town open data", licence: "OGL-Canada-2.0" },
  ]),
];

describe("chronological order", () => {
  it("puts the oldest record first and does not change the list it was given", () => {
    const input = [obs("b", "yes", "2026-01-01"), obs("a", "no", "2024-01-01"), obs("c", "yes", "2025-01-01")];
    const copy = [...input];
    expect(chronological(input).map((o) => o.noteId)).toEqual(["a", "c", "b"]);
    expect(input).toEqual(copy);
  });

  it("orders records from the same day by note id, whatever order they arrive in", () => {
    const a = obs("a", "yes", "2026-01-01");
    const b = obs("b", "no", "2026-01-01");
    expect(chronological([b, a]).map((o) => o.noteId)).toEqual(["a", "b"]);
    expect(chronological([a, b]).map((o) => o.noteId)).toEqual(["a", "b"]);
  });
});

describe("history of one detail", () => {
  it("is empty for a detail with no record", () => {
    expect(detailHistory("elevator", [])).toEqual({ key: "elevator", entries: [], changes: 0, oldest: undefined, newest: undefined });
  });

  it("marks the oldest record as the first and lists newest first", () => {
    const d = detailHistory("elevator", [obs("a", "yes", "2024-01-01"), obs("b", "yes", "2025-01-01")]);
    expect(d.entries.map((e) => [e.noteId, e.change])).toEqual([
      ["b", "same"],
      ["a", "first"],
    ]);
    expect(d.changes).toBe(0);
    expect(d.oldest).toBe("2024-01-01");
    expect(d.newest).toBe("2025-01-01");
  });

  it("marks a record that says something different from the one before it", () => {
    const d = detailHistory("elevator", [obs("a", "yes", "2024-01-01"), obs("b", "no", "2025-01-01"), obs("c", "no", "2025-06-01"), obs("d", "yes", "2026-01-01")]);
    expect(d.entries.map((e) => e.change)).toEqual(["different", "same", "different", "first"]);
    expect(d.changes).toBe(2);
  });

  it("gives the same result whatever order the records are stored in", () => {
    const list = [obs("a", "yes", "2024-01-01"), obs("b", "no", "2025-01-01"), obs("c", "no", "2025-01-01"), obs("d", "yes", "2026-01-01")];
    const want = detailHistory("elevator", list);
    for (let shift = 1; shift < list.length; shift++) {
      const rotated = [...list.slice(shift), ...list.slice(0, shift)];
      expect(detailHistory("elevator", rotated)).toEqual(want);
      expect(detailHistory("elevator", [...rotated].reverse())).toEqual(want);
    }
  });

  it("keeps the source, licence and date of every record and never invents one", () => {
    const d = detailHistory("elevator", [obs("a", "yes", "2024-01-01", CONTRIBUTOR_SOURCE), obs("b", "no", "2025-01-01")]);
    expect(d.entries.map((e) => e.provenance)).toEqual([
      { source: "City survey", licence: "CC0-1.0", recordedOn: "2025-01-01" },
      { source: CONTRIBUTOR_SOURCE, licence: "CC0-1.0", recordedOn: "2024-01-01" },
    ]);
    expect(d.entries.map((e) => e.kind)).toEqual(["named-source", "person"]);
  });

  it("has exactly one first record whenever there is any record", () => {
    for (let n = 1; n <= 6; n++) {
      const list = Array.from({ length: n }, (_, i) => obs(`n${i}`, i % 3 === 0 ? "yes" : "no", `2025-0${(i % 6) + 1}-01`));
      const d = detailHistory("elevator", list);
      expect(d.entries.filter((e) => e.change === "first")).toHaveLength(1);
      expect(d.entries[d.entries.length - 1]?.change).toBe("first");
      expect(d.changes).toBe(d.entries.filter((e) => e.change === "different").length);
    }
  });
});

describe("history of a place", () => {
  it("has one entry for each detail in the usual order, including details with no record", () => {
    const h = placeHistory(onePlace(LIBRARY()));
    expect(h.details.map((d) => d.key)).toEqual([...FACT_KEYS]);
    expect(h.unknown).toEqual(["step-free-entry", "accessible-washroom"]);
    expect(h.records).toBe(4);
  });

  it("counts every record, also when reports differ", () => {
    const h = placeHistory(onePlace(LIBRARY()));
    const elevator = h.details.find((d) => d.key === "elevator");
    expect(elevator?.entries.map((e) => [e.provenance.recordedOn, e.value, e.change])).toEqual([
      ["2026-09-09", "no", "same"],
      ["2025-06-01", "no", "different"],
      ["2024-01-10", "yes", "first"],
    ]);
    expect(elevator?.changes).toBe(1);
  });

  it("lists each source once, sorted", () => {
    expect(placeHistory(onePlace(LIBRARY())).sources).toEqual(["City survey", CONTRIBUTOR_SOURCE, "Town open data"].sort((a, b) => a.localeCompare(b)));
  });

  it("is all unknown for a place with no recorded detail", () => {
    const h = placeHistory(onePlace([testNote("x", "Dojo")]));
    expect(h.records).toBe(0);
    expect(h.unknown).toEqual([...FACT_KEYS]);
    expect(h.sources).toEqual([]);
    expect(timeline(h)).toEqual([]);
  });

  it("matches the number of records the place holds", () => {
    const place = onePlace(LIBRARY());
    const fromNotes = place.notes.reduce((n, note) => n + note.facts.filter((f) => f.value !== "unknown").length, 0);
    expect(placeHistory(place).records).toBe(fromNotes);
  });

  it("does not depend on the language used to group places", () => {
    const en = placeHistory(onePlace(LIBRARY()));
    const fr = placeHistory(groupPlaces(LIBRARY(), "fr")[0] as Place);
    expect(fr).toEqual(en);
  });
});

describe("timeline", () => {
  it("merges every detail, newest first, and keeps the detail order inside one day", () => {
    const t = timeline(placeHistory(onePlace(LIBRARY())));
    expect(t.map((e) => [e.provenance.recordedOn, e.key])).toEqual([
      ["2026-09-09", "automatic-door"],
      ["2026-09-09", "elevator"],
      ["2025-06-01", "elevator"],
      ["2024-01-10", "elevator"],
    ]);
  });

  it("holds every record exactly once", () => {
    const h = placeHistory(onePlace(LIBRARY()));
    const t = timeline(h);
    expect(t).toHaveLength(h.records);
    expect(new Set(t.map((e) => `${e.key}|${e.noteId}`)).size).toBe(h.records);
  });
});

describe("labels", () => {
  it("names each change in both languages", () => {
    expect(changeLabel("first", "en")).toBe("First record");
    expect(changeLabel("same", "en")).toBe("Same answer");
    expect(changeLabel("different", "en")).toBe("Different answer");
    expect(changeLabel("first", "fr")).toBe("Première donnée");
    expect(changeLabel("different", "fr")).toBe("Réponse différente");
  });

  it("counts records with the right plural", () => {
    expect(recordCount(1, "en")).toBe("1 record");
    expect(recordCount(2, "en")).toBe("2 records");
    expect(recordCount(0, "en")).toBe("0 records");
    expect(recordCount(1, "fr")).toBe("1 donnée");
    expect(recordCount(0, "fr")).toBe("0 donnée");
    expect(recordCount(3, "fr")).toBe("3 données");
  });

  it("gives the age of a record in whole months", () => {
    const d = detailHistory("elevator", [obs("a", "yes", "2025-11-15"), obs("b", "yes", "2026-10-15")]);
    expect(d.entries.map((e) => entryAge(e, TODAY))).toEqual([1, 12]);
  });

  it("never says a record is right, wrong or reviewed", () => {
    for (const pair of Object.values(COPY.history)) {
      for (const text of [pair.en, pair.fr]) {
        expect(findBanned(text), text).toBeUndefined();
        expect(text).not.toMatch(/\b(correct|incorrect|wrong|faux|fausse|trusted|fiable)\b/i);
      }
      expect(frenchTypographyIssues(pair.fr), pair.fr).toEqual([]);
    }
  });
});

describe("history as text", () => {
  it("lists every record with its answer, source, licence, date and tier", () => {
    const place = onePlace(LIBRARY());
    const h = placeHistory(place);
    for (const l of ["en", "fr"] as const) {
      const text = historyToText(place, h, l, TODAY);
      const lines = text.split("\n").filter((x) => x.startsWith("- "));
      expect(lines).toHaveLength(h.records);
      const entries = h.details.flatMap((d) => d.entries);
      entries.forEach((e, i) => {
        expect(hasAllParts(lines[i] ?? "", e.provenance, l), lines[i]).toBe(true);
        expect(lines[i]).toContain(changeLabel(e.change, l));
      });
    }
  });

  it("says Unknown for a detail with no record and shows no source for it", () => {
    const place = onePlace(LIBRARY());
    const text = historyToText(place, placeHistory(place), "en", TODAY);
    const at = text.indexOf("Accessible washroom");
    const block = text.slice(at, text.indexOf("\n\n", at));
    expect(block).toContain("Unknown. Nothing has been recorded for this detail.");
    expect(block).not.toMatch(/CC0|Tier|survey/);
  });

  it("starts with the place, says it does not pick an answer, and ends with the day it was made", () => {
    const place = onePlace(LIBRARY());
    const en = historyToText(place, placeHistory(place), "en", TODAY);
    expect(en.startsWith("Record history: Library\n=======")).toBe(true);
    expect(en).toContain("1 Main St");
    expect(en).toContain(COPY.history.noPick.en);
    expect(en.endsWith("Made on 2026-11-15.\n")).toBe(true);
    const fr = historyToText(place, placeHistory(place), "fr", TODAY);
    expect(fr.startsWith("Historique des données\u00A0: Library\n")).toBe(true);
    expect(fr).toContain(COPY.history.noPick.fr);
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("gives the number of records and of different records, as the page does", () => {
    const place = onePlace(LIBRARY());
    const text = historyToText(place, placeHistory(place), "en", TODAY);
    expect(text).toContain("Records for this place: 4\nDifferent records: 4\n");
    const twice = onePlace([
      testNote("r1", "Hall", [{ key: "elevator", value: "yes", on: "2026-05-05" }]),
      testNote("r2", "Hall", [{ key: "elevator", value: "yes", on: "2026-05-05" }]),
      testNote("r3", "Hall", [{ key: "automatic-door", value: "yes", on: "2026-05-05" }]),
    ]);
    const h = placeHistory(twice);
    expect(historyToText(twice, h, "en", TODAY)).toContain("Records for this place: 3\nDifferent records: 2\n");
    expect(historyToText(twice, h, "fr", TODAY)).toContain("Données pour ce lieu\u00A0: 3\nDonnées différentes\u00A0: 2\n");
    expect(FACT_KEYS.reduce((n, k) => n + distinctRecords(twice, k), 0)).toBe(2);
  });

  it("keeps French and English lines in step", () => {
    const place = onePlace(LIBRARY());
    const h = placeHistory(place);
    expect(historyToText(place, h, "fr", TODAY).split("\n")).toHaveLength(historyToText(place, h, "en", TODAY).split("\n").length);
  });

  it("works for a place with no address and no record", () => {
    const place = onePlace([testNote("x", "Dojo", [], null)]);
    const text = historyToText(place, placeHistory(place), "en", TODAY);
    expect(text.split("\n")[2]).toBe("");
    expect(text).toContain("Records for this place: 0\nDifferent records: 0\n");
    expect(text.match(/Unknown\. Nothing has been recorded/g)).toHaveLength(FACT_KEYS.length);
    expect(text).not.toContain("- ");
  });

  it("names the file after the place and the language", () => {
    const place = onePlace(LIBRARY());
    expect(historyFilename(place, "en")).toBe(`history-${place.id}-en.txt`);
    expect(historyFilename(place, "fr")).toBe(`historique-${place.id}-fr.txt`);
    expect(historyFilename(place, "en")).toMatch(/^[a-z0-9.-]+$/);
  });
});
