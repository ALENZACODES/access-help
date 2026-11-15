import { describe, expect, it } from "vitest";
import { CRISIS_REDIRECT, submitRequest } from "./submit.js";
import type { RequestDraft } from "./submit.js";
import { validatePeerRequest } from "./validate.js";

const context = { now: "2026-11-15T12:00:00.000Z", id: "req-1" };
const base: RequestDraft = { topic: "public_transit", language: "en", ageConfirmed16Plus: true };

describe("submitRequest", () => {
  it("accepts a valid request and records provenance", () => {
    const result = submitRequest({ ...base, city: "toronto", note: "Winter bus routes." }, context);
    expect(result.kind).toBe("accepted");
    if (result.kind !== "accepted") return;
    expect(result.request).toMatchObject({
      id: "req-1",
      topic: "public_transit",
      language: "en",
      city: "toronto",
      tier: 0,
      prototypeLabel: "PROTOTYPE-UNVERIFIED",
      demonstration: true,
      recordDate: "2026-11-15",
    });
    expect(validatePeerRequest(result.request).valid).toBe(true);
  });

  it("omits an empty city and note", () => {
    const result = submitRequest({ ...base, city: "", note: "   " }, context);
    expect(result.kind).toBe("accepted");
    if (result.kind !== "accepted") return;
    expect("city" in result.request).toBe(false);
    expect("note" in result.request).toBe(false);
  });

  it("rejects anyone who has not confirmed they are 16 or older", () => {
    expect(submitRequest({ ...base, ageConfirmed16Plus: false }, context)).toEqual({
      kind: "rejected_input",
      code: "age_out_of_scope",
    });
  });

  it("refuses request text that is medical advice and stores nothing", () => {
    const result = submitRequest({ ...base, note: "What medication dose is right for spasms?" }, context);
    expect(result).toEqual({ kind: "refused", codes: ["medical_advice"] });
    expect(JSON.stringify(result)).not.toContain("medication");
  });

  it("refuses contact details", () => {
    expect(submitRequest({ ...base, note: "email me at a@b.co" }, context)).toEqual({
      kind: "refused",
      codes: ["personal_data"],
    });
  });

  it("redirects crisis wording, stores nothing and echoes none of the text", () => {
    const result = submitRequest({ ...base, note: "I want to die" }, context);
    expect(result).toEqual(CRISIS_REDIRECT);
    expect(result).toMatchObject({ kind: "crisis", stored: false });
    expect(JSON.stringify(result)).not.toContain("want to die");
    expect(CRISIS_REDIRECT.contacts.map((contact) => contact.id)).toEqual([
      "emergency_911",
      "crisis_988",
      "connexontario",
    ]);
  });

  it("shows crisis contacts even when the age box is unchecked", () => {
    expect(submitRequest({ ...base, ageConfirmed16Plus: false, note: "I want to die" }, context).kind).toBe("crisis");
  });

  it("rejects values outside the fixed lists", () => {
    expect(submitRequest({ ...base, topic: "catheters" }, context)).toEqual({ kind: "rejected_input", code: "invalid_topic" });
    expect(submitRequest({ ...base, language: "de" }, context)).toEqual({ kind: "rejected_input", code: "invalid_language" });
    expect(submitRequest({ ...base, city: "12 Main Street" }, context)).toEqual({ kind: "rejected_input", code: "invalid_city" });
    expect(submitRequest({ ...base, note: "x".repeat(281) }, context)).toEqual({ kind: "rejected_input", code: "note_too_long" });
  });
});
