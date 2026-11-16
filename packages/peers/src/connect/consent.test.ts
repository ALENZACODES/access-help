import { describe, expect, it } from "vitest";
import {
  CONSENT_ITEMS,
  NO_CONSENT,
  REQUIRED_CONSENT_ITEMS,
  allows,
  grantConsent,
  isConsentActive,
  missingRequiredConsent,
  normaliseChoices,
  withdrawConsent,
} from "./consent.js";

const AT = "2026-11-16T10:00:00.000Z";

describe("itemised consent", () => {
  it("starts with nothing granted", () => {
    expect(Object.values(NO_CONSENT).every((value) => value === false)).toBe(true);
    expect(Object.keys(NO_CONSENT)).toEqual([...CONSENT_ITEMS]);
  });

  it("treats only a literal true as a grant", () => {
    const choices = normaliseChoices({
      prepare_summary: "yes",
      include_contexts: 1,
      include_region: true,
    } as never);
    expect(choices).toEqual({ ...NO_CONSENT, include_region: true });
    expect(normaliseChoices(undefined)).toEqual(NO_CONSENT);
  });

  it("refuses to grant without each required item", () => {
    expect(REQUIRED_CONSENT_ITEMS).toEqual(["prepare_summary", "include_contexts"]);
    expect(grantConsent(NO_CONSENT, AT)).toBeNull();
    expect(grantConsent({ ...NO_CONSENT, prepare_summary: true }, AT)).toBeNull();
    expect(missingRequiredConsent({ ...NO_CONSENT, prepare_summary: true })).toEqual(["include_contexts"]);
    expect(grantConsent({ ...NO_CONSENT, include_region: true, include_note: true }, AT)).toBeNull();
  });

  it("records each item separately", () => {
    const consent = grantConsent({ ...NO_CONSENT, prepare_summary: true, include_contexts: true, include_note: true }, AT);
    expect(consent).not.toBeNull();
    if (!consent) return;
    expect(consent.grantedAt).toBe(AT);
    expect(isConsentActive(consent)).toBe(true);
    expect(allows(consent, "include_note")).toBe(true);
    expect(allows(consent, "include_region")).toBe(false);
    expect(allows(consent, "include_language")).toBe(false);
  });

  it("can be withdrawn, after which no item is allowed", () => {
    const consent = grantConsent(
      { prepare_summary: true, include_contexts: true, include_region: true, include_language: true, include_note: true },
      AT,
    );
    if (!consent) throw new Error("expected consent");
    const withdrawn = withdrawConsent(consent, "2026-11-16T11:00:00.000Z");
    expect(withdrawn.revokedAt).toBe("2026-11-16T11:00:00.000Z");
    expect(isConsentActive(withdrawn)).toBe(false);
    for (const item of CONSENT_ITEMS) expect(allows(withdrawn, item)).toBe(false);
    expect(consent.revokedAt).toBeUndefined();
    expect(withdrawConsent(withdrawn, "2026-11-17T11:00:00.000Z").revokedAt).toBe("2026-11-16T11:00:00.000Z");
  });
});
