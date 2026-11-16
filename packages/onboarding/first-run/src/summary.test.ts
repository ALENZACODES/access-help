import { describe, expect, it } from "vitest";
import {
  FACT_KEYS,
  groupPlaces,
  isConsistent,
  newestRecord,
  onlySource,
  parseNote,
  rowTotal,
  summarisePlaces,
  summaryToText,
  collectSources,
  differingPlaces,
  sourceNames,
  type FactKey,
  type Note,
  type Place,
} from "./index";
import { makeRng, randomNotes } from "./testkit";

const TODAY = new Date(Date.UTC(2026, 10, 15));

interface Rec {
  readonly key: FactKey;
  readonly value: "yes" | "no";
  readonly on?: string;
  readonly source?: string;
}

function note(id: string, name: string, recs: readonly Rec[] = [], address?: string): Note {
  const facts = FACT_KEYS.map((key) => {
    const r = recs.find((x) => x.key === key);
    return r
      ? { key, value: r.value, provenance: { source: r.source ?? "City survey", licence: "CC0-1.0", recordedOn: r.on ?? "2026-10-01" } }
      : { key, value: "unknown" };
  });
  const n = parseNote({ id, placeName: name, address, createdOn: "2026-10-01", licence: "CC0-1.0", facts });
  if (!n) throw new Error(`bad test note ${id}`);
  return n;
}

const places = (notes: Note[]): Place[] => groupPlaces(notes, "en");
const row = (s: ReturnType<typeof summarisePlaces>, key: FactKey) => s.rows.find((r) => r.key === key)!;

describe("summarisePlaces", () => {
  it("has a row for every detail, even with no places", () => {
    const s = summarisePlaces([], TODAY);
    expect(s.places).toBe(0);
    expect(s.rows.map((r) => r.key)).toEqual([...FACT_KEYS]);
    expect(s.rows.every((r) => rowTotal(r) === 0)).toBe(true);
    expect(s.old).toEqual([]);
  });

  it("counts Yes, No, differing and Unknown places apart", () => {
    const s = summarisePlaces(
      places([
        note("a", "Archive", [{ key: "elevator", value: "yes" }]),
        note("b", "Bakery", [{ key: "elevator", value: "no" }]),
        note("c", "Cinema", [{ key: "elevator", value: "yes" }]),
        note("d", "Cinema", [{ key: "elevator", value: "no" }]),
        note("e", "Dojo"),
      ]),
      TODAY,
    );
    expect(row(s, "elevator")).toEqual({ key: "elevator", yes: 1, no: 1, differ: 1, unknown: 1 });
    expect(s.places).toBe(4);
  });

  it("never counts Unknown as No", () => {
    const s = summarisePlaces(places([note("a", "A"), note("b", "B")]), TODAY);
    for (const r of s.rows) expect(r).toMatchObject({ yes: 0, no: 0, differ: 0, unknown: 2 });
  });

  it("counts agreeing reports as one place, not one per report", () => {
    const s = summarisePlaces(
      places([note("a", "Archive", [{ key: "elevator", value: "yes" }]), note("b", "Archive", [{ key: "elevator", value: "yes" }])]),
      TODAY,
    );
    expect(row(s, "elevator")).toMatchObject({ yes: 1, differ: 0 });
    expect(s.places).toBe(1);
  });

  it("makes every row add up to the number of places", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s = summarisePlaces(places(randomNotes(makeRng(seed), 2 + (seed % 12))), TODAY);
      expect(isConsistent(s), `seed ${seed}`).toBe(true);
      for (const r of s.rows) expect(rowTotal(r)).toBe(s.places);
    }
  });

  it("is not consistent when a row is wrong, so the page cannot hide a miscount", () => {
    const s = summarisePlaces(places([note("a", "A")]), TODAY);
    const broken = { ...s, rows: [{ ...s.rows[0]!, yes: 5 }, ...s.rows.slice(1)] };
    expect(isConsistent(broken)).toBe(false);
  });
});

describe("old records", () => {
  it("lists places whose newest record is a year old or more", () => {
    const s = summarisePlaces(
      places([
        note("a", "Archive", [{ key: "elevator", value: "yes", on: "2024-01-01" }]),
        note("b", "Bakery", [{ key: "elevator", value: "yes", on: "2026-10-01" }]),
        note("c", "Cinema", [{ key: "elevator", value: "yes", on: "2024-01-01" }, { key: "automatic-door", value: "no", on: "2025-11-15" }]),
      ]),
      TODAY,
    );
    expect(s.old.map((o) => o.place.name)).toEqual(["Cinema", "Archive"]);
    // Details keep the App's own order, not the order the notes were written in.
    expect(s.old[0]?.keys).toEqual(FACT_KEYS.filter((k) => k === "elevator" || k === "automatic-door"));
  });

  it("uses the newest of several reports, so a fresh report clears the flag", () => {
    const s = summarisePlaces(
      places([note("a", "Archive", [{ key: "elevator", value: "yes", on: "2023-01-01" }]), note("b", "Archive", [{ key: "elevator", value: "yes", on: "2026-09-01" }])]),
      TODAY,
    );
    expect(s.old).toEqual([]);
  });

  it("ignores Unknown details", () => {
    expect(summarisePlaces(places([note("a", "A")]), TODAY).old).toEqual([]);
  });

  it("orders by how many details are old, then by name", () => {
    const s = summarisePlaces(
      places([
        note("a", "Zed", [{ key: "elevator", value: "yes", on: "2020-01-01" }]),
        note("b", "Abe", [{ key: "elevator", value: "yes", on: "2020-01-01" }]),
        note("c", "Mid", [{ key: "elevator", value: "yes", on: "2020-01-01" }, { key: "automatic-door", value: "yes", on: "2020-01-01" }]),
      ]),
      TODAY,
    );
    expect(s.old.map((o) => o.place.name)).toEqual(["Mid", "Abe", "Zed"]);
  });

  it("finds the newest record behind a resolution", () => {
    const p = places([note("a", "A", [{ key: "elevator", value: "yes", on: "2025-02-02" }]), note("b", "A", [{ key: "elevator", value: "no", on: "2026-02-02" }])])[0]!;
    expect(newestRecord(p.resolutions.elevator)).toBe("2026-02-02");
    expect(newestRecord(p.resolutions["automatic-door"])).toBeUndefined();
  });
});

describe("with one source", () => {
  const notes = [
    note("a", "Archive", [{ key: "elevator", value: "yes", source: "One" }, { key: "automatic-door", value: "yes", source: "Two" }]),
    note("b", "Bakery", [{ key: "elevator", value: "no", source: "Two" }]),
  ];

  it("counts details from other sources as Unknown", () => {
    const s = summarisePlaces(places(onlySource(notes, "One")), TODAY);
    expect(row(s, "elevator")).toMatchObject({ yes: 1, no: 0, unknown: 1 });
    expect(row(s, "automatic-door")).toMatchObject({ yes: 0, unknown: 2 });
  });

  it("keeps the same number of places and rows that add up", () => {
    for (const name of sourceNames(collectSources(notes, TODAY))) {
      const s = summarisePlaces(places(onlySource(notes, name)), TODAY);
      expect(s.places).toBe(2);
      expect(isConsistent(s)).toBe(true);
    }
  });
});

describe("summaryToText", () => {
  const s = summarisePlaces(
    places([
      note("a", "Archive", [{ key: "elevator", value: "yes", on: "2020-01-01" }], "1 Main St"),
      note("b", "Bakery", [{ key: "elevator", value: "no" }]),
    ]),
    TODAY,
  );

  it("writes one line per detail in English", () => {
    const text = summaryToText(s, "en");
    expect(text).toContain("What your notes say");
    expect(text).toContain("Places: 2");
    expect(text).toContain("Yes 1; No 1; Reports differ 0; Unknown 0");
    expect(text.split("\n").filter((l) => /Yes \d+; No \d+;/.test(l))).toHaveLength(FACT_KEYS.length);
    expect(text).toContain("- Archive (1 Main St): ");
    expect(text.endsWith("\n")).toBe(true);
  });

  it("uses French words and a no-break space before colons", () => {
    const text = summaryToText(s, "fr");
    expect(text).toContain("Lieux\u00A0: 2");
    expect(text).toContain("Oui 1\u202F; Non 1\u202F; Rapports divergents 0\u202F; Inconnu 0");
    expect(text).not.toMatch(/[^\u202F];/);
    expect(text).toContain("Ce que disent vos notes");
  });

  it("leaves out the old-records list when there are none", () => {
    const fresh = summarisePlaces(places([note("a", "A", [{ key: "elevator", value: "yes" }])]), TODAY);
    expect(summaryToText(fresh, "en")).not.toContain("over a year old");
  });
});

describe("differingPlaces", () => {
  const notes = [
    note("a", "Archive", [{ key: "elevator", value: "yes" }, { key: "automatic-door", value: "yes" }]),
    note("b", "Archive", [{ key: "elevator", value: "no" }, { key: "automatic-door", value: "no" }]),
    note("c", "Bakery", [{ key: "elevator", value: "yes" }]),
    note("d", "Bakery", [{ key: "elevator", value: "no" }]),
    note("e", "Cinema", [{ key: "elevator", value: "yes" }]),
    note("f", "Cinema", [{ key: "elevator", value: "yes" }]),
  ];

  it("lists places whose reports disagree, with the details that disagree", () => {
    const d = differingPlaces(places(notes));
    expect(d.map((x) => x.place.name)).toEqual(["Archive", "Bakery"]);
    expect(d[0]?.keys).toEqual(FACT_KEYS.filter((k) => k === "elevator" || k === "automatic-door"));
    expect(d[1]?.keys).toEqual(["elevator"]);
  });

  it("does not list a place whose reports agree, or that has none", () => {
    expect(differingPlaces(places([note("a", "A"), note("b", "B", [{ key: "elevator", value: "yes" }])]))).toEqual([]);
    expect(differingPlaces([])).toEqual([]);
  });

  it("matches the count in the table", () => {
    const s = summarisePlaces(places(notes), TODAY);
    for (const k of FACT_KEYS) {
      expect(s.differing.filter((d) => d.keys.includes(k)).length, k).toBe(row(s, k).differ);
    }
  });

  it("is part of the summary and of its text", () => {
    const s = summarisePlaces(places(notes), TODAY);
    expect(s.differing).toHaveLength(2);
    const text = summaryToText(s, "en");
    expect(text).toContain("Places where reports differ");
    expect(text).toContain("- Archive: ");
    expect(summaryToText(s, "fr")).toContain("Lieux aux rapports divergents");
    expect(summaryToText(summarisePlaces(places([note("a", "A")]), TODAY), "en")).not.toContain("Places where reports differ");
  });

  it("orders by how many details disagree, then by name, for random notes", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const d = differingPlaces(places(randomNotes(makeRng(seed + 300), 10)));
      for (let i = 1; i < d.length; i++) {
        const [p, q] = [d[i - 1]!, d[i]!];
        expect(p.keys.length > q.keys.length || (p.keys.length === q.keys.length && p.place.name.localeCompare(q.place.name) <= 0), `seed ${seed}`).toBe(true);
      }
      for (const x of d) expect(x.keys.every((k) => x.place.resolutions[k].kind === "differ")).toBe(true);
    }
  });
});
