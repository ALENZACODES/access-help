import { describe, expect, it } from "vitest";
import {
  EXPORT_FORMAT,
  EXPORT_VERSION,
  LIMITS,
  emptyForm,
  exportFilename,
  exportHref,
  exportNotes,
  importNotes,
  mergeNotes,
  noteFact,
  toNote,
  type Note,
} from "./index";

const TODAY = new Date(Date.UTC(2026, 10, 15));
function mk(id: string): Note {
  const f = emptyForm(TODAY);
  return toNote({ ...f, placeName: `Place ${id}`, licence: "CC-BY-4.0", details: { ...f.details, "automatic-door": "no" } }, TODAY, () => id);
}

describe("export and import", () => {
  it("round-trips notes exactly, including provenance and unknowns", () => {
    const notes = [mk("a"), mk("b")];
    const r = importNotes(exportNotes(notes, "2026-11-15"));
    expect(r.error).toBeUndefined();
    expect(r.rejected).toBe(0);
    expect(r.notes).toEqual(notes);
    expect(noteFact(r.notes[0] as Note, "elevator").value).toBe("unknown");
  });

  it("writes a labelled, versioned, dated file", () => {
    const o = JSON.parse(exportNotes([], "2026-11-15"));
    expect(o).toEqual({ format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedOn: "2026-11-15", notes: [] });
    expect(exportFilename("2026-11-15")).toBe("notes-2026-11-15.json");
    const href = exportHref('{"a":"é"}');
    expect(href.startsWith("data:application/json;charset=utf-8,")).toBe(true);
    expect(decodeURIComponent(href.split(",").slice(1).join(","))).toBe('{"a":"é"}');
  });

  it("reports each kind of bad input", () => {
    expect(importNotes("   ").error).toBe("empty");
    expect(importNotes("x".repeat(LIMITS.importChars + 1)).error).toBe("too-large");
    expect(importNotes("not json").error).toBe("not-json");
    expect(importNotes("[]").error).toBe("wrong-format");
    expect(importNotes("5").error).toBe("wrong-format");
    expect(importNotes(JSON.stringify({ format: "other", version: 1, notes: [] })).error).toBe("wrong-format");
    expect(importNotes(JSON.stringify({ format: EXPORT_FORMAT, version: 2, notes: [] })).error).toBe("wrong-version");
  });

  it("keeps valid notes and counts rejected and duplicate entries", () => {
    const a = mk("a");
    const text = JSON.stringify({ format: EXPORT_FORMAT, version: 1, notes: [a, { id: "x" }, a, "no"] });
    const r = importNotes(text);
    expect(r.notes.map((n) => n.id)).toEqual(["a"]);
    expect(r.rejected).toBe(3);
  });

  it("downgrades imported yes/no details that lack provenance", () => {
    const a = JSON.parse(exportNotes([mk("a")], "2026-11-15")) as { notes: Array<{ facts: Array<Record<string, unknown>> }> };
    for (const f of a.notes[0]?.facts ?? []) delete f["provenance"];
    const r = importNotes(JSON.stringify(a));
    expect(noteFact(r.notes[0] as Note, "automatic-door").value).toBe("unknown");
  });
});

describe("mergeNotes", () => {
  it("keeps existing notes, appends new ones and skips duplicates", () => {
    const m = mergeNotes([mk("a"), mk("b")], [mk("b"), mk("c")]);
    expect(m.notes.map((n) => n.id)).toEqual(["a", "b", "c"]);
    expect(m.added).toBe(1);
    expect(m.skipped).toBe(1);
  });

  it("stops at the limit", () => {
    const existing = Array.from({ length: LIMITS.notes - 1 }, (_, i) => mk(`e${i}`));
    const m = mergeNotes(existing, [mk("n1"), mk("n2")]);
    expect(m.notes.length).toBe(LIMITS.notes);
    expect(m.added).toBe(1);
    expect(m.skipped).toBe(1);
  });
});
