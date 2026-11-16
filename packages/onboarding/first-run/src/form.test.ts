import { describe, expect, it } from "vitest";
import {
  DRAFT_KEY,
  FACT_KEYS,
  FIELD_IDS,
  LIMITS,
  clearDraft,
  emptyForm,
  errorMessage,
  fieldLabelText,
  frenchTypographyIssues,
  isoDate,
  loadDraft,
  looksLikeEmail,
  looksLikePhone,
  memoryStore,
  saveDraft,
  toNote,
  validateForm,
  CONTRIBUTOR_SOURCE,
  findBanned,
  type ErrorCode,
  type FormValues,
} from "./index";

const TODAY = new Date(Date.UTC(2026, 10, 15));

function valid(over: Partial<FormValues> = {}): FormValues {
  const base = emptyForm(TODAY);
  return {
    ...base,
    placeName: "Example Library",
    details: { ...base.details, "step-free-entry": "yes" },
    licence: "CC0-1.0",
    ...over,
  };
}

const codes = (v: FormValues): string[] => validateForm(v, TODAY).map((e) => `${e.field}:${e.code}`);

describe("emptyForm", () => {
  it("starts with every detail unknown, no licence chosen, and today's date", () => {
    const f = emptyForm(TODAY);
    for (const k of FACT_KEYS) expect(f.details[k]).toBe("unknown");
    expect(f.licence).toBe("");
    expect(f.observedOn).toBe("2026-11-15");
    expect(isoDate(TODAY)).toBe("2026-11-15");
  });

  it("is invalid until the person fills it in", () => {
    expect(codes(emptyForm(TODAY))).toEqual([
      "placeName:required",
      "details:needs-one-detail",
      "licence:licence-required",
    ]);
  });
});

describe("validateForm", () => {
  it("accepts a complete form", () => {
    expect(codes(valid())).toEqual([]);
  });

  it("requires at least one recorded detail: all-unknown is not enough", () => {
    expect(codes(valid({ details: emptyForm(TODAY).details }))).toEqual(["details:needs-one-detail"]);
  });

  it("checks name and address length", () => {
    expect(codes(valid({ placeName: "x".repeat(LIMITS.placeName + 1) }))).toContain("placeName:too-long");
    expect(codes(valid({ address: "x".repeat(LIMITS.address + 1) }))).toContain("address:too-long");
  });

  it("checks the date format and rejects the future", () => {
    expect(codes(valid({ observedOn: "15/11/2026" }))).toContain("observedOn:bad-date");
    expect(codes(valid({ observedOn: "2026-11-16" }))).toContain("observedOn:future-date");
    expect(codes(valid({ observedOn: "2026-11-15" }))).toEqual([]);
  });

  it("requires a licence from the open list", () => {
    expect(codes(valid({ licence: "" }))).toContain("licence:licence-required");
    expect(codes(valid({ licence: "All rights reserved" }))).toContain("licence:licence-invalid");
    for (const l of ["CC0-1.0", "CC-BY-4.0", "ODbL-1.0"]) expect(codes(valid({ licence: l }))).toEqual([]);
  });

  it("keeps personal details out of the note and address", () => {
    expect(codes(valid({ note: "call me at 416-555-0123" }))).toContain("note:personal-phone");
    expect(codes(valid({ note: "mail jo@example.com" }))).toContain("note:personal-email");
    expect(codes(valid({ address: "jo@example.com" }))).toContain("address:personal-email");
    expect(codes(valid({ address: "+1 (416) 555 0123" }))).toContain("address:personal-phone");
    expect(codes(valid({ address: "205 Example Blvd", note: "Opened 2026-11-15, 3 steps" }))).toEqual([]);
  });

  it("rejects control characters", () => {
    expect(codes(valid({ placeName: "a\u0007b" }))).toContain("placeName:control-chars");
  });

  it("detects emails and phone numbers directly", () => {
    expect(looksLikeEmail("a@b.co")).toBe(true);
    expect(looksLikeEmail("a@b")).toBe(false);
    expect(looksLikePhone("4165550123")).toBe(true);
    expect(looksLikePhone("2026-11-15")).toBe(false);
    expect(looksLikePhone("12345")).toBe(false);
  });
});

describe("messages", () => {
  const all: ErrorCode[] = [
    "required", "too-long", "control-chars", "bad-date", "future-date",
    "licence-required", "licence-invalid", "personal-email", "personal-phone", "needs-one-detail",
  ];

  it("exist in both languages for every code and field with clean French", () => {
    for (const field of FIELD_IDS) {
      for (const code of all) {
        const en = errorMessage({ field, code }, "en");
        const fr = errorMessage({ field, code }, "fr");
        expect(en.length, `${field} ${code}`).toBeGreaterThan(5);
        expect(frenchTypographyIssues(fr), `${field} ${code} ${fr}`).toEqual([]);
        expect(findBanned(en + fr)).toBeUndefined();
      }
      expect(frenchTypographyIssues(fieldLabelText(field, "fr")), field).toEqual([]);
      expect(fieldLabelText(field, "en")).not.toBe("");
    }
  });

  it("names the field in the sentence", () => {
    expect(errorMessage({ field: "placeName", code: "required" }, "en")).toBe("Enter the place name.");
    expect(errorMessage({ field: "placeName", code: "required" }, "fr")).toBe("Saisissez le nom du lieu.");
  });
});

describe("toNote", () => {
  it("records provenance only for answered details and keeps unknown without any", () => {
    const n = toNote(valid({ details: { ...emptyForm(TODAY).details, "step-free-entry": "yes", elevator: "no" } }), TODAY, () => "id-1");
    expect(n.id).toBe("id-1");
    const byKey = Object.fromEntries(n.facts.map((f) => [f.key, f]));
    expect(byKey["step-free-entry"]?.provenance).toEqual({ source: CONTRIBUTOR_SOURCE, licence: "CC0-1.0", recordedOn: "2026-11-15" });
    expect(byKey["elevator"]?.value).toBe("no");
    expect(byKey["automatic-door"]?.value).toBe("unknown");
    expect(byKey["automatic-door"]?.provenance).toBeUndefined();
  });

  it("trims text and drops empty optional fields", () => {
    const n = toNote(valid({ placeName: "  Hall ", address: "  ", note: "" }), TODAY, () => "x");
    expect(n.placeName).toBe("Hall");
    expect(n.address).toBeUndefined();
    expect(n.note).toBeUndefined();
  });

  it("throws on an invalid form", () => {
    expect(() => toNote(emptyForm(TODAY), TODAY)).toThrow(/not valid/);
  });
});

describe("draft autosave", () => {
  it("round-trips and clears", () => {
    const s = memoryStore();
    const v = valid({ note: "half written" });
    saveDraft(s, v);
    expect(loadDraft(s, TODAY)).toEqual(v);
    clearDraft(s);
    expect(s.getItem(DRAFT_KEY)).toBeNull();
    expect(loadDraft(s, TODAY)).toBeUndefined();
  });

  it("ignores an untouched form, corrupt data and bad fields", () => {
    const s = memoryStore();
    saveDraft(s, emptyForm(TODAY));
    expect(loadDraft(s, TODAY)).toBeUndefined();
    s.setItem(DRAFT_KEY, "nope");
    expect(loadDraft(s, TODAY)).toBeUndefined();
    s.setItem(DRAFT_KEY, JSON.stringify({ placeName: "A", licence: "x", observedOn: "bad", details: { elevator: "maybe" } }));
    const d = loadDraft(s, TODAY);
    expect(d?.licence).toBe("");
    expect(d?.observedOn).toBe("2026-11-15");
    expect(d?.details.elevator).toBe("unknown");
  });

  it("survives broken storage", () => {
    const broken = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); }, removeItem: () => { throw new Error("x"); } };
    expect(() => saveDraft(broken, valid())).not.toThrow();
    expect(() => clearDraft(broken)).not.toThrow();
    expect(loadDraft(broken, TODAY)).toBeUndefined();
    expect(loadDraft(undefined, TODAY)).toBeUndefined();
  });
});
