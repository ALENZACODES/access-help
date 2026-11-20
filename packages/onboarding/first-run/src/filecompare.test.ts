import { describe, expect, it } from "vitest";
import { exportNotes } from "./exchange";
import { FACT_KEYS } from "./facts";
import {
  DETAIL_STATUSES,
  MAX_MAYBE_SAME,
  compareFiles,
  compareNotes,
  detailStatus,
  filesAgree,
  maybeSamePairs,
  placesToShow,
  recordKey,
  sharedRecords,
  sideAnswer,
  type FileComparison,
  type SideAnswer,
} from "./filecompare";
import { groupPlaces, type Observation } from "./places";
import { testNote } from "./testnotes";

const file = (...notes: Parameters<typeof testNote>[]): string => exportNotes(notes.map((n) => testNote(...n)), "2026-11-20");

function ok(textA: string, textB: string): FileComparison {
  const r = compareFiles(textA, textB, "en");
  if (!r.ok) throw new Error(`expected a comparison, got ${JSON.stringify(r.errors)}`);
  return r.comparison;
}

const obs = (value: "yes" | "no", source = "City survey", on = "2026-10-01", licence = "CC0-1.0", noteId = "n"): Observation => ({
  noteId,
  value,
  provenance: { source, licence, recordedOn: on },
});

describe("detailStatus", () => {
  const cases: Array<[SideAnswer, SideAnswer, string]> = [
    ["unknown", "unknown", "both-unknown"],
    ["yes", "unknown", "only-a"],
    ["differ", "unknown", "only-a"],
    ["unknown", "no", "only-b"],
    ["yes", "yes", "same-answer"],
    ["no", "no", "same-answer"],
    ["yes", "no", "different-answers"],
    ["no", "yes", "different-answers"],
    ["differ", "differ", "different-answers"],
    ["differ", "yes", "different-answers"],
    ["no", "differ", "different-answers"],
  ];
  it.each(cases)("A %s and B %s is %s", (a, b, want) => {
    expect(detailStatus(a, b)).toBe(want);
  });

  it("never turns a missing record into a No", () => {
    expect(detailStatus("unknown", "no")).not.toBe("same-answer");
    expect(detailStatus("unknown", "no")).not.toBe("different-answers");
  });

  it("lists every status once, differences first", () => {
    expect(new Set(DETAIL_STATUSES).size).toBe(5);
    expect(DETAIL_STATUSES[0]).toBe("different-answers");
  });
});

describe("sideAnswer", () => {
  it("reads each kind of resolution", () => {
    expect(sideAnswer({ kind: "unknown" })).toBe("unknown");
    expect(sideAnswer({ kind: "agree", value: "no", observations: [obs("no")] })).toBe("no");
    expect(sideAnswer({ kind: "differ", observations: [obs("no"), obs("yes")] })).toBe("differ");
  });
});

describe("sharedRecords", () => {
  it("counts a record that is in both lists once", () => {
    expect(sharedRecords([obs("yes")], [obs("yes", "City survey", "2026-10-01", "CC0-1.0", "other-note")])).toBe(1);
  });

  it("needs the same answer, source, licence and date", () => {
    expect(sharedRecords([obs("yes")], [obs("no")])).toBe(0);
    expect(sharedRecords([obs("yes")], [obs("yes", "Other source")])).toBe(0);
    expect(sharedRecords([obs("yes")], [obs("yes", "City survey", "2026-10-02")])).toBe(0);
    expect(sharedRecords([obs("yes")], [obs("yes", "City survey", "2026-10-01", "CC-BY-4.0")])).toBe(0);
  });

  it("matches repeated copies one for one", () => {
    expect(sharedRecords([obs("yes"), obs("yes")], [obs("yes")])).toBe(1);
    expect(sharedRecords([obs("yes"), obs("yes")], [obs("yes"), obs("yes"), obs("yes")])).toBe(2);
  });

  it("keeps fields apart in the key, so joined text cannot collide", () => {
    expect(recordKey(obs("yes", "a b", "2026-10-01"))).not.toBe(recordKey(obs("yes", "a", "2026-10-01")));
  });
});

describe("compareFiles", () => {
  it("sorts places into both files, file A only and file B only", () => {
    const c = ok(
      file(["a1", "Library", [{ key: "elevator", value: "yes" }]], ["a2", "Arena", []]),
      file(["b1", "Library", [{ key: "elevator", value: "yes" }]], ["b2", "Pool", [], "9 Lake Rd"]),
    );
    expect(c.both.map((p) => p.nameA)).toEqual(["Library"]);
    expect(c.onlyA.map((o) => o.place.name)).toEqual(["Arena"]);
    expect(c.onlyB.map((o) => o.place.name)).toEqual(["Pool"]);
  });

  it("matches places by name and address, ignoring case and accents, not by note id", () => {
    const c = ok(file(["x", "Café Central", [], "1 Main St"]), file(["y", "CAFE central", [], "1 main st."]));
    expect(c.both).toHaveLength(1);
    expect(c.both[0]?.nameA).toBe("Café Central");
    expect(c.both[0]?.nameB).toBe("CAFE central");
  });

  it("gives each detail its status and both files' records", () => {
    const c = ok(
      file(["a", "Library", [{ key: "step-free-entry", value: "yes" }, { key: "elevator", value: "yes" }, { key: "automatic-door", value: "no" }]]),
      file(["b", "Library", [{ key: "step-free-entry", value: "yes" }, { key: "elevator", value: "no", source: "Owner", on: "2026-11-01" }, { key: "accessible-washroom", value: "yes" }]]),
    );
    const p = c.both[0];
    expect(p?.details.map((d) => [d.key, d.status])).toEqual([
      ["step-free-entry", "same-answer"],
      ["accessible-washroom", "only-b"],
      ["automatic-door", "only-a"],
      ["elevator", "different-answers"],
    ]);
    const elevator = p?.details.find((d) => d.key === "elevator");
    expect(elevator?.recordsA.map((o) => o.provenance.source)).toEqual(["City survey"]);
    expect(elevator?.recordsB.map((o) => [o.value, o.provenance.source, o.provenance.recordedOn])).toEqual([["no", "Owner", "2026-11-01"]]);
    expect(p?.details.find((d) => d.key === "step-free-entry")?.shared).toBe(1);
    expect(p?.differs).toBe(true);
  });

  it("adds every detail of every shared place to the totals", () => {
    const c = ok(file(["a", "Library", [{ key: "elevator", value: "yes" }]], ["c", "Arena", []]), file(["b", "Library", [{ key: "elevator", value: "no" }]], ["d", "Arena", []]));
    expect(c.totals["different-answers"]).toBe(1);
    expect(c.totals["both-unknown"]).toBe(FACT_KEYS.length * 2 - 1);
    const sum = DETAIL_STATUSES.reduce((n, s) => n + c.totals[s], 0);
    expect(sum).toBe(c.both.length * FACT_KEYS.length);
  });

  it("counts notes, places, records and left-out entries for each file", () => {
    const notes = [testNote("a", "Library", [{ key: "elevator", value: "yes" }]), testNote("a2", "Library", [{ key: "elevator", value: "no" }, { key: "automatic-door", value: "yes" }])];
    const text = JSON.stringify({ format: "app-notes", version: 1, exportedOn: "2026-11-20", notes: [...notes, { id: "bad" }] });
    const c = ok(text, file(["b", "Arena"]));
    expect(c.summaryA).toEqual({ notes: 2, places: 1, rejected: 1, records: 3 });
    expect(c.summaryB).toEqual({ notes: 1, places: 1, rejected: 0, records: 0 });
  });

  it("shows reports that differ inside one file as differing, never as a winner", () => {
    const c = ok(
      file(["a1", "Library", [{ key: "elevator", value: "yes" }]], ["a2", "Library", [{ key: "elevator", value: "no", on: "2026-11-02" }]]),
      file(["b1", "Library", [{ key: "elevator", value: "no", on: "2026-11-02" }]]),
    );
    const d = c.both[0]?.details.find((x) => x.key === "elevator");
    expect(d?.a).toBe("differ");
    expect(d?.b).toBe("no");
    expect(d?.status).toBe("different-answers");
    expect(d?.recordsA).toHaveLength(2);
    expect(d?.shared).toBe(1);
  });

  it("refuses empty boxes, text that is not an export and files with no usable note", () => {
    const r = compareFiles("  ", "not json", "en");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toEqual([{ side: "a", code: "empty" }, { side: "b", code: "not-json" }]);
    const none = compareFiles(exportNotes([], "2026-11-20"), JSON.stringify({ format: "other", notes: [] }), "en");
    expect(none.ok).toBe(false);
    if (!none.ok) expect(none.errors).toEqual([{ side: "a", code: "no-notes" }, { side: "b", code: "wrong-format" }]);
  });

  it("refuses an export from another version", () => {
    const r = compareFiles(file(["a", "Library"]), JSON.stringify({ format: "app-notes", version: 2, notes: [] }), "en");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toEqual([{ side: "b", code: "wrong-version" }]);
  });

  it("refuses the same text twice", () => {
    const text = file(["a", "Library"]);
    const r = compareFiles(text, `\n${text}\n`, "en");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toEqual([{ side: "b", code: "same-text" }]);
  });

  it("drops a yes or no that has no source, licence or date, so it stays UNKNOWN", () => {
    const bare = JSON.stringify({
      format: "app-notes",
      version: 1,
      notes: [{ id: "x", placeName: "Library", address: "1 Main St", createdOn: "2026-10-01", licence: "CC0-1.0", facts: [{ key: "elevator", value: "yes" }] }],
    });
    const c = ok(bare, file(["b", "Library", [{ key: "elevator", value: "no" }]]));
    const d = c.both[0]?.details.find((x) => x.key === "elevator");
    expect(d?.a).toBe("unknown");
    expect(d?.status).toBe("only-b");
    expect(c.summaryA.records).toBe(0);
  });
});

describe("maybeSamePairs", () => {
  it("pairs a place in one file with a close name in the other, each place once", () => {
    const a = groupPlaces([testNote("a", "Central Library", [], null), testNote("b", "Arena", [], "5 Rink Rd")], "en");
    const b = groupPlaces([testNote("c", "Centrl Library", [], null), testNote("d", "Central Libary", [], null), testNote("e", "Rink", [], "5 Rink Rd")], "en");
    const pairs = maybeSamePairs(a, b);
    expect(pairs.map((p) => [p.a.name, p.b.name, p.reason])).toEqual([
      ["Arena", "Rink", "same-address"],
      ["Central Library", "Central Libary", "similar-name"],
    ]);
  });

  it("never pairs places at two different street addresses", () => {
    const a = groupPlaces([testNote("a", "Library", [], "1 Main St")], "en");
    const b = groupPlaces([testNote("b", "Library", [], "2 King St")], "en");
    expect(maybeSamePairs(a, b)).toEqual([]);
  });

  it("stops at the limit", () => {
    const a = groupPlaces(Array.from({ length: MAX_MAYBE_SAME + 5 }, (_, i) => testNote(`a${i}`, `Place number ${i}x`, [], null)), "en");
    const b = groupPlaces(Array.from({ length: MAX_MAYBE_SAME + 5 }, (_, i) => testNote(`b${i}`, `Place number ${i}y`, [], null)), "en");
    expect(maybeSamePairs(a, b).length).toBe(MAX_MAYBE_SAME);
  });

  it("is part of a comparison only for places that are not in both files", () => {
    const c = ok(file(["a", "Library", [], null], ["b", "Riverside Arena", [], null]), file(["c", "Library", [], null], ["d", "Riverside Arnea", [], null]));
    expect(c.both).toHaveLength(1);
    expect(c.maybeSame.map((m) => [m.a.name, m.b.name])).toEqual([["Riverside Arena", "Riverside Arnea"]]);
  });
});

describe("placesToShow and filesAgree", () => {
  const c = ok(
    file(["a1", "Arena", [{ key: "elevator", value: "yes" }]], ["a2", "Library", [{ key: "elevator", value: "yes" }]], ["a3", "Pool", []]),
    file(["b1", "Arena", [{ key: "elevator", value: "yes" }]], ["b2", "Library", [{ key: "elevator", value: "no" }]], ["b3", "Pool", []]),
  );

  it("puts places where the files differ first, then keeps name order", () => {
    expect(placesToShow(c, false).map((p) => p.nameA)).toEqual(["Library", "Arena", "Pool"]);
  });

  it("can show only places where the files differ", () => {
    expect(placesToShow(c, true).map((p) => p.nameA)).toEqual(["Library"]);
  });

  it("does not change the comparison it reads", () => {
    placesToShow(c, false);
    expect(c.both.map((p) => p.nameA)).toEqual(["Arena", "Library", "Pool"]);
  });

  it("says the files agree only when they share every place and every answer", () => {
    expect(filesAgree(c)).toBe(false);
    const same = ok(file(["a", "Arena", [{ key: "elevator", value: "yes" }]]), file(["b", "Arena", [{ key: "elevator", value: "yes" }]]));
    expect(filesAgree(same)).toBe(true);
    const extra = ok(file(["a", "Arena"]), file(["b", "Arena"], ["c", "Pool"]));
    expect(filesAgree(extra)).toBe(false);
  });

  it("does not count an answer in one file only as agreement", () => {
    const one = ok(file(["a", "Arena", [{ key: "elevator", value: "yes" }]]), file(["b", "Arena"]));
    expect(filesAgree(one)).toBe(false);
    expect(one.both[0]?.differs).toBe(true);
  });
});

describe("compareNotes", () => {
  it("orders places by the language's alphabet", () => {
    const notes = [testNote("a", "Éclair"), testNote("b", "Zoo"), testNote("c", "Eau")];
    const c = compareNotes(notes, notes, "fr");
    expect(c.both.map((p) => p.nameA)).toEqual(["Eau", "Éclair", "Zoo"]);
  });

  it("keeps the rejected counts it is given", () => {
    const c = compareNotes([testNote("a", "Arena")], [testNote("b", "Arena")], "en", { a: 3, b: 4 });
    expect([c.summaryA.rejected, c.summaryB.rejected]).toEqual([3, 4]);
  });
});
