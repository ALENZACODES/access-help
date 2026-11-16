import { describe, expect, it } from "vitest";
import {
  FACT_KEYS,
  MAX_SHORTLIST,
  changesNothing,
  exportLists,
  groupPlaces,
  importLists,
  mergeLists,
  parseNote,
  prepareRestore,
  pruneChecklist,
  pruneShortlist,
  type Lists,
  type Note,
} from "./index";

function note(id: string, name: string, address: string): Note {
  const n = parseNote({ id, placeName: name, address, createdOn: "2026-10-01", licence: "CC0-1.0", facts: FACT_KEYS.map((key) => ({ key, value: "unknown" })) });
  if (!n) throw new Error(`bad ${id}`);
  return n;
}

const NOTES = [note("a", "Library", "1 Main St"), note("b", "Bakery", "2 Side Rd"), note("c", "Cinema", "3 High St")];
const IDS = groupPlaces(NOTES, "en").map((p) => p.id);
const [BAKERY, CINEMA, LIBRARY] = IDS as [string, string, string];
const GONE = "gone-0a1b2c3d";

const EMPTY: Lists = { needs: {}, shortlist: [], checklist: {} };
const backup = (l: Partial<Lists>): string => exportLists({ ...EMPTY, ...l }, "2026-11-15");
const ask = (answer = "yes"): { asked: boolean; answer: string } => ({ asked: true, answer });

function ok(r: ReturnType<typeof prepareRestore>) {
  if (r.error !== undefined) throw new Error(`error ${r.error}`);
  return r;
}

describe("prepareRestore", () => {
  it("counts must-haves, shortlist places and notes that would be added", () => {
    const text = backup({ needs: { elevator: "yes", "automatic-door": "yes" }, shortlist: [LIBRARY, BAKERY], checklist: { [LIBRARY]: { elevator: ask() } } });
    const { preview } = ok(prepareRestore(EMPTY, NOTES, text, "en"));
    expect(preview).toMatchObject({ needsInFile: 2, needsTaken: 2, deviceHasNeeds: false, shortlistInFile: 2, shortlistAdded: 2, shortlistNoPlace: 0, notesInFile: 1, notesAdded: 1, notesNoPlace: 0 });
  });

  it("leaves out places that are not on this device, and says how many", () => {
    const text = backup({ shortlist: [LIBRARY, GONE], checklist: { [GONE]: { elevator: ask() }, [LIBRARY]: { elevator: ask() } } });
    const { preview } = ok(prepareRestore(EMPTY, NOTES, text, "en"));
    expect(preview).toMatchObject({ shortlistInFile: 2, shortlistNoPlace: 1, shortlistAdded: 1, notesInFile: 2, notesNoPlace: 1, notesAdded: 1 });
  });

  it("keeps must-haves already saved here and takes none from the backup", () => {
    const text = backup({ needs: { elevator: "yes" } });
    const { preview } = ok(prepareRestore({ ...EMPTY, needs: { "step-free-entry": "yes" } }, NOTES, text, "en"));
    expect(preview).toMatchObject({ needsInFile: 1, needsTaken: 0, deviceHasNeeds: true });
    expect(changesNothing(preview)).toBe(true);
  });

  it("does not count what is already on the device", () => {
    const current: Lists = { needs: {}, shortlist: [LIBRARY], checklist: { [LIBRARY]: { elevator: ask("mine") } } };
    const text = backup({ shortlist: [LIBRARY, CINEMA], checklist: { [LIBRARY]: { elevator: ask("theirs"), "automatic-door": ask() } } });
    const { preview, merged } = ok(prepareRestore(current, NOTES, text, "en"));
    expect(preview).toMatchObject({ shortlistAdded: 1, notesAdded: 1 });
    expect(merged.lists.checklist[LIBRARY]?.elevator?.answer).toBe("mine");
  });

  it("stops at the shortlist limit", () => {
    const many = Array.from({ length: MAX_SHORTLIST }, (_, i) => `x-${i}`);
    const { preview } = ok(prepareRestore({ ...EMPTY, shortlist: many }, NOTES, backup({ shortlist: [LIBRARY] }), "en"));
    expect(preview.shortlistAdded).toBe(0);
  });

  it("reports the errors the restore reports", () => {
    for (const bad of ["", "{", "[]", '{"format":"x"}', '{"format":"app-lists","version":9}']) {
      expect(prepareRestore(EMPTY, NOTES, bad, "en").error, bad).toBe(importLists(bad).error);
      expect(prepareRestore(EMPTY, NOTES, bad, "en").error).toBeDefined();
    }
  });

  it("gives the same result as restoring step by step", () => {
    const text = backup({ needs: { elevator: "yes" }, shortlist: [LIBRARY, GONE, CINEMA], checklist: { [LIBRARY]: { elevator: ask() }, [GONE]: { elevator: ask() } } });
    const r = importLists(text);
    if (r.error) throw new Error("x");
    const places = groupPlaces(NOTES, "en");
    const by = mergeLists(EMPTY, { ...r.lists, shortlist: pruneShortlist(r.lists.shortlist, places), checklist: pruneChecklist(r.lists.checklist, places) });
    const p = ok(prepareRestore(EMPTY, NOTES, text, "en"));
    expect(p.merged).toEqual(by);
    expect(p.preview.needsTaken).toBe(by.added.needs);
    expect(p.preview.shortlistAdded).toBe(by.added.shortlist);
    expect(p.preview.notesAdded).toBe(by.added.notes);
  });

  it("changes nothing in what it is given", () => {
    const current: Lists = { needs: { elevator: "yes" }, shortlist: [LIBRARY], checklist: {} };
    const before = JSON.stringify(current);
    prepareRestore(current, NOTES, backup({ shortlist: [CINEMA] }), "en");
    expect(JSON.stringify(current)).toBe(before);
  });

  it("adds up: what is in the file is what is added, kept or left out", () => {
    for (const shortlist of [[], [LIBRARY], [LIBRARY, GONE], [GONE], [LIBRARY, BAKERY, CINEMA, GONE]]) {
      const current: Lists = { ...EMPTY, shortlist: [BAKERY] };
      const { preview } = ok(prepareRestore(current, NOTES, backup({ shortlist }), "en"));
      const already = shortlist.filter((id) => id === BAKERY).length;
      expect(preview.shortlistAdded + preview.shortlistNoPlace + already, shortlist.join()).toBe(preview.shortlistInFile);
    }
  });
});

describe("changesNothing", () => {
  it("is true only when nothing would be added", () => {
    const base = ok(prepareRestore(EMPTY, NOTES, backup({}), "en")).preview;
    expect(changesNothing(base)).toBe(true);
    expect(changesNothing({ ...base, needsTaken: 1 })).toBe(false);
    expect(changesNothing({ ...base, shortlistAdded: 1 })).toBe(false);
    expect(changesNothing({ ...base, notesAdded: 1 })).toBe(false);
  });
});
