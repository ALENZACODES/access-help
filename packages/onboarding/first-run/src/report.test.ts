import { describe, expect, it } from "vitest";
import { FACT_KEYS, formForPlace, validateForm } from "./index";

const TODAY = new Date(Date.UTC(2026, 10, 15));

describe("formForPlace", () => {
  it("fills in the name and address and leaves everything else unset", () => {
    const f = formForPlace({ name: "Archive", address: "1 Main St" }, TODAY);
    expect(f.placeName).toBe("Archive");
    expect(f.address).toBe("1 Main St");
    expect(f.observedOn).toBe("2026-11-15");
    expect(f.licence).toBe("");
    expect(f.note).toBe("");
    for (const k of FACT_KEYS) expect(f.details[k], k).toBe("unknown");
  });

  it("uses an empty address when the place has none", () => {
    expect(formForPlace({ name: "Archive", address: undefined }, TODAY).address).toBe("");
  });

  it("is not savable until a detail and a licence are chosen", () => {
    const codes = validateForm(formForPlace({ name: "Archive", address: undefined }, TODAY), TODAY).map((e) => e.code);
    expect(codes).toContain("needs-one-detail");
    expect(codes).toContain("licence-required");
  });
});
