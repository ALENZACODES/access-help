import { describe, expect, it } from "vitest";
import {
  emptyForm,
  evaluatePlace,
  findPlace,
  groupPlaces,
  groupPlacesByVerdict,
  placeId,
  placeKey,
  reportCount,
  resolve,
  toNote,
  type FactKey,
  type Note,
  type Observation,
  type Tri,
} from "./index";

const TODAY = new Date(Date.UTC(2026, 10, 15));

function mk(id: string, name: string, details: Partial<Record<FactKey, Tri>>, opts: { address?: string; on?: string } = {}): Note {
  const f = emptyForm(TODAY);
  const on = opts.on ?? "2026-11-01";
  // The note is created on the day it was observed, so newer notes sort first.
  return toNote(
    { ...f, placeName: name, address: opts.address ?? "", observedOn: on, licence: "CC0-1.0", details: { ...f.details, "automatic-door": "yes", ...details } },
    new Date(`${on}T00:00:00Z`),
    () => id,
  );
}

const obs = (noteId: string, value: "yes" | "no", on: string): Observation => ({
  noteId,
  value,
  provenance: { source: "Contributor report", licence: "CC0-1.0", recordedOn: on },
});

describe("placeKey and placeId", () => {
  it("ignores case, accents, spacing and punctuation", () => {
    expect(placeKey({ placeName: "Éclair  Café!", address: "1 Main St." })).toBe(placeKey({ placeName: "eclair cafe", address: "1 main st" }));
  });

  it("keeps different addresses apart, and no address apart from an address", () => {
    expect(placeKey({ placeName: "Hall", address: "1 A St" })).not.toBe(placeKey({ placeName: "Hall", address: "2 A St" }));
    expect(placeKey({ placeName: "Hall", address: undefined })).not.toBe(placeKey({ placeName: "Hall", address: "1 A St" }));
  });

  it("makes URL-safe ids that are stable", () => {
    const id = placeId({ placeName: "Éclair Café", address: undefined });
    expect(id).toMatch(/^[a-z0-9-]{1,80}$/);
    expect(id).toBe(placeId({ placeName: "eclair cafe", address: undefined }));
    expect(placeId({ placeName: "???", address: undefined })).toMatch(/^place-[0-9a-f]{8}$/);
  });
});

describe("resolve", () => {
  it("is unknown with no reports", () => {
    expect(resolve([])).toEqual({ kind: "unknown" });
    expect(reportCount({ kind: "unknown" })).toBe(0);
  });

  it("agrees when every report says the same, newest first", () => {
    const r = resolve([obs("a", "yes", "2026-01-01"), obs("b", "yes", "2026-06-01")]);
    expect(r.kind).toBe("agree");
    if (r.kind === "agree") {
      expect(r.value).toBe("yes");
      expect(r.observations.map((o) => o.noteId)).toEqual(["b", "a"]);
    }
    expect(reportCount(r)).toBe(2);
  });

  it("says reports differ instead of choosing the newest", () => {
    const r = resolve([obs("old", "yes", "2026-01-01"), obs("new", "no", "2026-06-01")]);
    expect(r.kind).toBe("differ");
    expect(reportCount(r)).toBe(2);
  });

  it("orders same-day reports by note id so results are repeatable", () => {
    const r = resolve([obs("b", "yes", "2026-01-01"), obs("a", "yes", "2026-01-01")]);
    if (r.kind !== "agree") throw new Error("expected agree");
    expect(r.observations.map((o) => o.noteId)).toEqual(["a", "b"]);
  });
});

describe("groupPlaces", () => {
  const notes = [
    mk("a", "Archive", { "step-free-entry": "yes" }, { on: "2026-03-01" }),
    mk("b", "archive", { "step-free-entry": "yes" }, { on: "2026-09-01" }),
    mk("c", "Archive", { elevator: "no" }, { address: "9 Other Rd" }),
    mk("d", "Cinema", { "step-free-entry": "yes" }),
    mk("e", "Cinema", { "step-free-entry": "no" }, { on: "2026-10-01" }),
  ];
  const places = groupPlaces(notes, "en");

  it("combines notes about the same place and keeps different addresses separate", () => {
    expect(places.length).toBe(3);
    const archive = places.find((p) => p.notes.some((n) => n.id === "a"));
    expect(archive?.notes.map((n) => n.id)).toEqual(["b", "a"]);
    expect(archive?.name).toBe("archive");
  });

  it("every note belongs to exactly one place", () => {
    expect(places.flatMap((p) => p.notes.map((n) => n.id)).sort()).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("resolves details: agree, differ, unknown", () => {
    const archive = places.find((p) => p.notes.some((n) => n.id === "a"));
    const cinema = places.find((p) => p.name === "Cinema");
    expect(archive?.resolutions["step-free-entry"].kind).toBe("agree");
    expect(reportCount(archive?.resolutions["step-free-entry"] ?? { kind: "unknown" })).toBe(2);
    expect(cinema?.resolutions["step-free-entry"].kind).toBe("differ");
    expect(cinema?.resolutions["accessible-washroom"].kind).toBe("unknown");
  });

  it("sorts by name for the language and finds by id", () => {
    expect(places.map((p) => p.name.toLowerCase())).toEqual(["archive", "archive", "cinema"]);
    const first = places[0];
    expect(findPlace(places, first?.id ?? "")).toBe(first);
    expect(findPlace(places, "nope")).toBeUndefined();
  });
});

describe("evaluatePlace and groupPlacesByVerdict", () => {
  const places = groupPlaces(
    [
      mk("a", "Agree Yes", { "step-free-entry": "yes" }),
      mk("b", "Agree No", { "step-free-entry": "no" }),
      mk("c", "Silent", {}),
      mk("d", "Split", { "step-free-entry": "yes" }),
      mk("e", "Split", { "step-free-entry": "no" }, { on: "2026-11-05" }),
    ],
    "en",
  );
  const named = (n: string) => places.find((p) => p.name === n)!;

  it("matches only when every report agrees with the request", () => {
    expect(evaluatePlace(named("Agree Yes"), { "step-free-entry": "yes" })).toBe("match");
    expect(evaluatePlace(named("Agree No"), { "step-free-entry": "yes" })).toBe("excluded");
  });

  it("keeps places with no reports or differing reports out of matches and out of excluded", () => {
    expect(evaluatePlace(named("Silent"), { "step-free-entry": "yes" })).toBe("unknown");
    expect(evaluatePlace(named("Split"), { "step-free-entry": "yes" })).toBe("unknown");
    expect(evaluatePlace(named("Split"), { "step-free-entry": "no" })).toBe("unknown");
  });

  it("a recorded opposite beats unknown on another detail", () => {
    expect(evaluatePlace(named("Agree No"), { "step-free-entry": "yes", elevator: "yes" })).toBe("excluded");
  });

  it("with no request every place matches", () => {
    for (const p of places) expect(evaluatePlace(p, {})).toBe("match");
  });

  it("groups and searches", () => {
    const g = groupPlacesByVerdict(places, { "step-free-entry": "yes" }, "");
    expect(g.matches.map((p) => p.name)).toEqual(["Agree Yes"]);
    expect(g.unknown.map((p) => p.name).sort()).toEqual(["Silent", "Split"]);
    expect(g.excluded.map((p) => p.name)).toEqual(["Agree No"]);
    expect(groupPlacesByVerdict(places, {}, "spl").matches.map((p) => p.name)).toEqual(["Split"]);
  });
});
