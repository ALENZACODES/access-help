import { describe, expect, it } from "vitest";
import {
  CONTRIBUTOR_SOURCE,
  FACT_KEYS,
  collectSources,
  detailSlots,
  findBanned,
  onlySource,
  parseNote,
  rangeText,
  sourceName,
  sourceNames,
  sourcesToText,
  type FactKey,
  type Note,
} from "./index";
import { makeRng, randomNotes } from "./testkit";

const TODAY = new Date(Date.UTC(2026, 10, 15));

interface Rec {
  readonly key: FactKey;
  readonly value: "yes" | "no";
  readonly source?: string;
  readonly on?: string;
  readonly licence?: string;
}

/** A saved note with only the given details recorded; everything else stays Unknown. */
function note(id: string, name: string, recs: readonly Rec[] = []): Note {
  const facts = FACT_KEYS.map((key) => {
    const r = recs.find((x) => x.key === key);
    return r
      ? { key, value: r.value, provenance: { source: r.source ?? "City survey", licence: r.licence ?? "CC0-1.0", recordedOn: r.on ?? "2026-10-01" } }
      : { key, value: "unknown" };
  });
  const n = parseNote({ id, placeName: name, createdOn: "2026-10-01", licence: "CC0-1.0", facts });
  if (!n) throw new Error(`bad test note ${id}`);
  return n;
}

describe("collectSources", () => {
  it("reports nothing for no notes", () => {
    const r = collectSources([], TODAY);
    expect(r).toEqual({ rows: [], recorded: 0, unknown: 0, notes: 0, licences: [], oldest: undefined, newest: undefined });
  });

  it("counts only the details that have a record, and leaves Unknown without a source", () => {
    const r = collectSources([note("a", "Archive")], TODAY);
    expect(r.rows).toEqual([]);
    expect(r.recorded).toBe(0);
    expect(r.unknown).toBe(FACT_KEYS.length);
  });

  it("adds Yes and No details up for each source", () => {
    const r = collectSources(
      [
        note("a", "Archive", [
          { key: "elevator", value: "yes" },
          { key: "automatic-door", value: "no" },
        ]),
        note("b", "Bakery", [{ key: "elevator", value: "yes", source: "Town data" }]),
      ],
      TODAY,
    );
    const survey = r.rows.find((x) => x.source === "City survey");
    expect(survey).toMatchObject({ details: 2, yes: 1, no: 1, notes: 1 });
    const town = r.rows.find((x) => x.source === "Town data");
    expect(town).toMatchObject({ details: 1, yes: 1, no: 0, notes: 1 });
    expect(r.recorded).toBe(3);
    expect(r.unknown).toBe(2 * FACT_KEYS.length - 3);
  });

  it("counts a note once per source however many details it records", () => {
    const r = collectSources(
      [
        note("a", "Archive", [
          { key: "elevator", value: "yes" },
          { key: "automatic-door", value: "yes" },
          { key: "step-free-entry", value: "no" },
        ]),
      ],
      TODAY,
    );
    expect(r.rows[0]?.notes).toBe(1);
    expect(r.rows[0]?.details).toBe(3);
  });

  it("lists the source with the most details first, then by name", () => {
    const r = collectSources(
      [
        note("a", "A", [{ key: "elevator", value: "yes", source: "Zeta" }]),
        note("b", "B", [{ key: "elevator", value: "yes", source: "Alpha" }]),
        note("c", "C", [
          { key: "elevator", value: "yes", source: "Mid" },
          { key: "automatic-door", value: "yes", source: "Mid" },
        ]),
      ],
      TODAY,
    );
    expect(sourceNames(r)).toEqual(["Mid", "Alpha", "Zeta"]);
  });

  it("keeps the oldest and newest date for each source and overall", () => {
    const r = collectSources(
      [
        note("a", "A", [{ key: "elevator", value: "yes", on: "2026-03-01" }]),
        note("b", "B", [{ key: "elevator", value: "no", on: "2025-01-31" }]),
        note("c", "C", [{ key: "elevator", value: "yes", on: "2026-09-09", source: "Other" }]),
      ],
      TODAY,
    );
    expect(r.rows.find((x) => x.source === "City survey")).toMatchObject({ oldest: "2025-01-31", newest: "2026-03-01" });
    expect(r.oldest).toBe("2025-01-31");
    expect(r.newest).toBe("2026-09-09");
  });

  it("flags records a year old or older, and no others", () => {
    const r = collectSources(
      [
        note("a", "A", [
          { key: "elevator", value: "yes", on: "2025-11-15" },
          { key: "automatic-door", value: "yes", on: "2025-11-16" },
          { key: "step-free-entry", value: "no", on: "2024-01-01" },
        ]),
      ],
      TODAY,
    );
    expect(r.rows[0]?.old).toBe(2);
  });

  it("lists each licence once, in order", () => {
    const r = collectSources(
      [
        note("a", "A", [{ key: "elevator", value: "yes", licence: "CC-BY-4.0" }]),
        note("b", "B", [{ key: "elevator", value: "yes", licence: "CC0-1.0" }]),
        note("c", "C", [{ key: "elevator", value: "yes", licence: "CC0-1.0" }]),
      ],
      TODAY,
    );
    expect(r.licences).toEqual(["CC-BY-4.0", "CC0-1.0"]);
    expect(r.rows[0]?.licences).toEqual(["CC-BY-4.0", "CC0-1.0"]);
  });

  it("does not change the notes it is given", () => {
    const notes = [note("a", "A", [{ key: "elevator", value: "yes" }])];
    const before = JSON.stringify(notes);
    collectSources(notes, TODAY);
    expect(JSON.stringify(notes)).toBe(before);
  });

  it("accounts for every detail slot, for many random sets of notes", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const notes = randomNotes(makeRng(seed), 1 + (seed % 9));
      const r = collectSources(notes, TODAY);
      expect(r.recorded + r.unknown, `seed ${seed}`).toBe(detailSlots(notes));
      expect(r.rows.reduce((n, x) => n + x.details, 0)).toBe(r.recorded);
      for (const row of r.rows) {
        expect(row.yes + row.no).toBe(row.details);
        expect(row.oldest <= row.newest).toBe(true);
        expect(row.old).toBeLessThanOrEqual(row.details);
        expect(row.licences.length).toBeGreaterThan(0);
        expect(row.notes).toBeGreaterThan(0);
      }
    }
  });
});

describe("detailSlots", () => {
  it("is one slot per detail per note", () => {
    expect(detailSlots([])).toBe(0);
    expect(detailSlots([note("a", "A"), note("b", "B")])).toBe(2 * FACT_KEYS.length);
  });
});

describe("sourceName", () => {
  it("translates only the App's own source label", () => {
    expect(sourceName(CONTRIBUTOR_SOURCE, "fr")).toBe("Rapport d’un contributeur");
    expect(sourceName(CONTRIBUTOR_SOURCE, "en")).toBe(CONTRIBUTOR_SOURCE);
    expect(sourceName("City survey", "fr")).toBe("City survey");
  });
});

describe("rangeText", () => {
  it("shows one date when both are the same", () => {
    expect(rangeText("2026-01-01", "2026-01-01")).toBe("2026-01-01");
    expect(rangeText("2025-01-01", "2026-01-01")).toBe("2025-01-01 – 2026-01-01");
  });
});

describe("onlySource", () => {
  const notes = [
    note("a", "A", [
      { key: "elevator", value: "yes", source: "One" },
      { key: "automatic-door", value: "no", source: "Two" },
    ]),
    note("b", "B", [{ key: "elevator", value: "no", source: "Two" }]),
  ];

  it("keeps details from the chosen source and makes the rest Unknown", () => {
    const only = onlySource(notes, "One");
    const a = only[0] as Note;
    expect(a.facts.find((f) => f.key === "elevator")?.value).toBe("yes");
    expect(a.facts.find((f) => f.key === "automatic-door")).toEqual({ key: "automatic-door", value: "unknown", provenance: undefined });
    expect((only[1] as Note).facts.every((f) => f.value === "unknown")).toBe(true);
  });

  it("never invents a record: recorded details only go down", () => {
    for (const s of ["One", "Two", "Nobody"]) {
      const before = collectSources(notes, TODAY).recorded;
      const after = collectSources(onlySource(notes, s), TODAY).recorded;
      expect(after).toBeLessThanOrEqual(before);
    }
    expect(collectSources(onlySource(notes, "Nobody"), TODAY).recorded).toBe(0);
  });

  it("keeps every note and every detail slot, and the originals as they were", () => {
    const before = JSON.stringify(notes);
    const only = onlySource(notes, "Two");
    expect(only).toHaveLength(notes.length);
    expect(detailSlots(only)).toBe(detailSlots(notes));
    expect(JSON.stringify(notes)).toBe(before);
  });

  it("is the same when applied twice", () => {
    expect(onlySource(onlySource(notes, "Two"), "Two")).toEqual(onlySource(notes, "Two"));
  });

  it("turns the split of recorded details into a partition across sources", () => {
    for (let seed = 1; seed <= 15; seed++) {
      const random = randomNotes(makeRng(seed + 100), 6);
      const all = collectSources(random, TODAY);
      const parts = sourceNames(all).reduce((n, s) => n + collectSources(onlySource(random, s), TODAY).recorded, 0);
      expect(parts, `seed ${seed}`).toBe(all.recorded);
    }
  });
});

describe("sourcesToText", () => {
  const notes = [
    note("a", "A", [
      { key: "elevator", value: "yes", source: CONTRIBUTOR_SOURCE, on: "2024-05-05" },
      { key: "automatic-door", value: "no", source: CONTRIBUTOR_SOURCE, on: "2026-05-05" },
    ]),
    note("b", "B", [{ key: "elevator", value: "yes", source: "Town data", licence: "CC-BY-4.0" }]),
  ];

  it("lists each source with its counts, licences and dates in English", () => {
    const text = sourcesToText(collectSources(notes, TODAY), "en");
    expect(text).toContain("Where details come from");
    expect(text).toContain("It does not say that any source is right.");
    expect(text).toContain("Details with a record: 3");
    expect(text).toContain(`${CONTRIBUTOR_SOURCE}\n  Details: 2 (Yes 1, No 1)`);
    expect(text).toContain("Dates recorded: 2024-05-05 – 2026-05-05");
    expect(text).toContain("Over a year old: 1");
    expect(text).toContain("Town data");
  });

  it("puts a no-break space before each colon in French and translates the label", () => {
    const text = sourcesToText(collectSources(notes, TODAY), "fr");
    expect(text).toContain("Détails avec donnée\u00A0: 3");
    expect(text).toContain("Rapport d’un contributeur");
    expect(text).not.toMatch(/[^\u00A0]:/);
  });

  it("only mentions old records for a source that has some", () => {
    const text = sourcesToText(collectSources(notes, TODAY), "en");
    const town = text.slice(text.indexOf("Town data"));
    expect(town).not.toContain("Over a year old");
  });

  it("says nothing that vouches for a source", () => {
    for (const l of ["en", "fr"] as const) expect(findBanned(sourcesToText(collectSources(notes, TODAY), l))).toBeUndefined();
  });

  it("handles no notes without a table of sources", () => {
    const text = sourcesToText(collectSources([], TODAY), "en");
    expect(text).toContain("Details with a record: 0");
    expect(text).not.toContain("Licences:");
  });
});
