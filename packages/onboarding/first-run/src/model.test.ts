import { describe, expect, it } from "vitest";
import { CONTRIBUTOR_SOURCE, LIMITS, findBanned, hasControlChars, noteFact, parseNote } from "./index";

const P = { source: CONTRIBUTOR_SOURCE, licence: "CC0-1.0", recordedOn: "2026-11-01" };
const good = {
  id: "abc-123",
  placeName: "  Example Library  ",
  address: "1 Example St",
  note: "Ramp on the left.",
  createdOn: "2026-11-15",
  licence: "CC0-1.0",
  facts: [
    { key: "step-free-entry", value: "yes", provenance: P },
    { key: "elevator", value: "yes" },
  ],
};

describe("parseNote", () => {
  it("accepts a valid note and trims text", () => {
    const n = parseNote(good);
    expect(n?.placeName).toBe("Example Library");
    expect(n?.facts.length).toBe(4);
  });

  it("downgrades a yes without provenance to unknown and fills missing keys with unknown", () => {
    const n = parseNote(good);
    if (!n) throw new Error("expected a note");
    expect(noteFact(n, "step-free-entry").value).toBe("yes");
    expect(noteFact(n, "elevator").value).toBe("unknown");
    expect(noteFact(n, "automatic-door").value).toBe("unknown");
    expect(noteFact(n, "accessible-washroom").provenance).toBeUndefined();
  });

  it("rejects bad ids, names, dates and licences", () => {
    expect(parseNote({ ...good, id: "has space" })).toBeUndefined();
    expect(parseNote({ ...good, id: "" })).toBeUndefined();
    expect(parseNote({ ...good, placeName: "   " })).toBeUndefined();
    expect(parseNote({ ...good, placeName: "x".repeat(LIMITS.placeName + 1) })).toBeUndefined();
    expect(parseNote({ ...good, createdOn: "2026-02-30" })).toBeUndefined();
    expect(parseNote({ ...good, licence: "Proprietary" })).toBeUndefined();
    expect(parseNote(null)).toBeUndefined();
    expect(parseNote("x")).toBeUndefined();
  });

  it("rejects control characters but allows newlines in the extra note", () => {
    expect(parseNote({ ...good, placeName: "a\u0000b" })).toBeUndefined();
    expect(parseNote({ ...good, note: "line one\nline two" })?.note).toBe("line one\nline two");
    expect(parseNote({ ...good, address: "a\nb" })).toBeUndefined();
    expect(hasControlChars("a\tb")).toBe(true);
    expect(hasControlChars("a\nb", true)).toBe(false);
  });

  it("treats blank optional text as absent and rejects wrong types", () => {
    expect(parseNote({ ...good, address: "  ", note: "" })?.address).toBeUndefined();
    expect(parseNote({ ...good, address: 5 })).toBeUndefined();
    expect(parseNote({ ...good, note: "x".repeat(LIMITS.note + 1) })).toBeUndefined();
  });
});

describe("findBanned", () => {
  it("finds words user copy must not use, in English and French", () => {
    for (const w of ["verified", "Real-time data", "real time".replace(" ", "-"), "guaranteed", "guarantee", "partnership", "vérifié", "vérifiées", "temps réel", "garantie", "partenariat", "verify", "Verify first", "verifies", "verification", "Vérifiez", "vérification", "Vérifions"]) {
      expect(findBanned(w), w).toBeDefined();
    }
  });

  it("does not flag ordinary wording", () => {
    for (const w of ["Check with the place before you go", "Recorded on 2026-01-15", "Renseignez-vous auprès du lieu", "Unknown"]) {
      expect(findBanned(w), w).toBeUndefined();
    }
  });
});
