import { describe, expect, it } from "vitest";
import {
  emptyForm,
  evaluate,
  foldText,
  groupNotes,
  hasRequirement,
  toNote,
  withRequirement,
  type FactKey,
  type Note,
  type Tri,
} from "./index";

const TODAY = new Date(Date.UTC(2026, 10, 15));
function mk(name: string, details: Partial<Record<FactKey, Tri>>, id = name): Note {
  const f = emptyForm(TODAY);
  return toNote({ ...f, placeName: name, licence: "CC0-1.0", details: { ...f.details, "automatic-door": "yes", ...details } }, TODAY, () => id);
}

describe("evaluate: unknown is neither a match nor ruled out", () => {
  const yes = mk("Y", { "step-free-entry": "yes" });
  const no = mk("N", { "step-free-entry": "no" });
  const unk = mk("U", {});

  it("matches only a recorded yes", () => {
    expect(evaluate(yes, { "step-free-entry": "yes" })).toBe("match");
    expect(evaluate(no, { "step-free-entry": "yes" })).toBe("excluded");
    expect(evaluate(unk, { "step-free-entry": "yes" })).toBe("unknown");
  });

  it("works the same way when asking for a recorded no", () => {
    expect(evaluate(no, { "step-free-entry": "no" })).toBe("match");
    expect(evaluate(yes, { "step-free-entry": "no" })).toBe("excluded");
    expect(evaluate(unk, { "step-free-entry": "no" })).toBe("unknown");
  });

  it("with no requirement everything matches, even all-unknown notes", () => {
    expect(evaluate(unk, {})).toBe("match");
  });

  it("a recorded opposite beats an unknown on another detail", () => {
    const n = mk("Z", { "step-free-entry": "no" });
    expect(evaluate(n, { "step-free-entry": "yes", elevator: "yes" })).toBe("excluded");
  });

  it("unknown on any requested detail keeps a note out of the matches", () => {
    const n = mk("W", { "step-free-entry": "yes" });
    expect(evaluate(n, { "step-free-entry": "yes", elevator: "yes" })).toBe("unknown");
  });
});

describe("groupNotes", () => {
  const notes = [
    mk("Éclair Café", { "step-free-entry": "yes" }),
    mk("Bakery", { "step-free-entry": "no" }),
    mk("Cinema", {}),
    mk("Archive", { "step-free-entry": "yes" }),
  ];

  it("splits into matches, unknown and excluded, sorted by name", () => {
    const g = groupNotes(notes, { "step-free-entry": "yes" }, "", "en");
    expect(g.matches.map((n) => n.placeName)).toEqual(["Archive", "Éclair Café"]);
    expect(g.unknown.map((n) => n.placeName)).toEqual(["Cinema"]);
    expect(g.excluded.map((n) => n.placeName)).toEqual(["Bakery"]);
  });

  it("every note lands in exactly one group", () => {
    const g = groupNotes(notes, { "step-free-entry": "yes" }, "", "fr");
    expect(g.matches.length + g.unknown.length + g.excluded.length).toBe(notes.length);
  });

  it("searches names ignoring case and accents", () => {
    expect(groupNotes(notes, {}, "eclair", "en").matches.map((n) => n.placeName)).toEqual(["Éclair Café"]);
    expect(groupNotes(notes, {}, "  CAFE ", "en").matches.length).toBe(1);
    expect(groupNotes(notes, {}, "zzz", "en").matches.length).toBe(0);
    expect(foldText("Éàü")).toBe("eau");
  });
});

describe("requirements", () => {
  it("sets and clears one detail without touching the others", () => {
    let r = withRequirement({}, "elevator", "yes");
    r = withRequirement(r, "step-free-entry", "no");
    expect(r).toEqual({ elevator: "yes", "step-free-entry": "no" });
    r = withRequirement(r, "elevator", "any");
    expect(r).toEqual({ "step-free-entry": "no" });
    expect(hasRequirement(r)).toBe(true);
    expect(hasRequirement({})).toBe(false);
  });

  it("does not mutate the input", () => {
    const base = Object.freeze({ elevator: "yes" as const });
    expect(withRequirement(base, "elevator", "no")).toEqual({ elevator: "no" });
    expect(base).toEqual({ elevator: "yes" });
  });
});
