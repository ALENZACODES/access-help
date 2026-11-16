import { describe, expect, it } from "vitest";
import {
  FACT_KEYS,
  MAX_COMPARE,
  canCompare,
  compareIdsToPath,
  compareRows,
  emptyForm,
  groupPlaces,
  pathToCompareIds,
  pruneCompare,
  toNote,
  toggleCompare,
  type FactKey,
  type Note,
  type Tri,
} from "./index";

const TODAY = new Date(Date.UTC(2026, 10, 15));
const mk = (id: string, name: string, details: Partial<Record<FactKey, Tri>>, on = "2026-11-01"): Note => {
  const f = emptyForm(TODAY);
  return toNote({ ...f, placeName: name, observedOn: on, licence: "CC0-1.0", details: { ...f.details, "automatic-door": "yes", ...details } }, new Date(`${on}T00:00:00Z`), () => id);
};
const places = groupPlaces(
  [mk("a", "Archive", { elevator: "yes" }), mk("b", "Bakery", {}), mk("c", "Cinema", { elevator: "yes" }), mk("d", "Cinema", { elevator: "no" }, "2026-11-05")],
  "en",
);

describe("compareRows", () => {
  it("shows every detail when nothing is requested, with no status", () => {
    const rows = compareRows(places, {});
    expect(rows.map((r) => r.key)).toEqual(FACT_KEYS);
    for (const r of rows) for (const c of r.cells) expect(c.status).toBeUndefined();
  });

  it("shows only requested details, with a status for each cell", () => {
    const rows = compareRows(places, { elevator: "yes" });
    expect(rows).toHaveLength(1);
    const byPlace = Object.fromEntries(rows[0]!.cells.map((c, i) => [places[i]!.name, c.status]));
    expect(byPlace).toEqual({ Archive: "matches", Bakery: "unknown", Cinema: "differ" });
  });

  it("keeps one cell per place in the order given", () => {
    const rows = compareRows([...places].reverse(), { elevator: "no" });
    expect(rows[0]!.cells.map((c) => c.placeId)).toEqual([...places].reverse().map((p) => p.id));
  });
});

describe("selection", () => {
  it("adds, removes and stops at three", () => {
    let ids: string[] = [];
    for (const id of ["a", "b", "c"]) ids = toggleCompare(ids, id).ids;
    expect(ids).toEqual(["a", "b", "c"]);
    expect(toggleCompare(ids, "d")).toEqual({ ids, result: "full" });
    expect(toggleCompare(ids, "b")).toEqual({ ids: ["a", "c"], result: "removed" });
    expect(MAX_COMPARE).toBe(3);
  });

  it("needs two or three places", () => {
    expect([[], ["a"], ["a", "b"], ["a", "b", "c"], ["a", "b", "c", "d"]].map((l) => canCompare(l))).toEqual([false, false, true, true, false]);
  });

  it("forgets places that are gone", () => {
    expect(pruneCompare([places[0]!.id, "gone-00000000"], places)).toEqual([places[0]!.id]);
  });
});

describe("address form", () => {
  it("round-trips two or three ids", () => {
    expect(pathToCompareIds(compareIdsToPath(["a-1", "b-2"]))).toEqual(["a-1", "b-2"]);
    expect(pathToCompareIds("a-1,b-2,c-3")).toEqual(["a-1", "b-2", "c-3"]);
  });

  it("rejects one id, four ids, repeats and bad characters", () => {
    for (const p of ["a-1", "a-1,b-2,c-3,d-4", "a-1,a-1", "a-1,B", "a-1,,b-2", ",", "a-1,b 2"]) expect(pathToCompareIds(p), p).toBeUndefined();
  });
});
