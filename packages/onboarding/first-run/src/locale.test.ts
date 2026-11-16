// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { applyLocale, isLocale, nativeName, negotiateLocale, otherLocale } from "./index";

describe("negotiateLocale", () => {
  it("prefers a stored choice", () => {
    expect(negotiateLocale(["fr-CA"], "en")).toBe("en");
    expect(negotiateLocale(["en-US"], "fr")).toBe("fr");
  });

  it("ignores an invalid stored choice", () => {
    expect(negotiateLocale(["fr"], "de")).toBe("fr");
  });

  it("takes the first supported language and handles regions and case", () => {
    expect(negotiateLocale(["de-DE", "FR-ca", "en"])).toBe("fr");
    expect(negotiateLocale(["es", "en_GB"])).toBe("en");
  });

  it("falls back when nothing matches", () => {
    expect(negotiateLocale([])).toBe("en");
    expect(negotiateLocale(["ja"], undefined, "fr")).toBe("fr");
  });
});

describe("locale helpers", () => {
  it("validates and switches", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("EN")).toBe(false);
    expect(otherLocale("en")).toBe("fr");
    expect(nativeName("fr")).toBe("Français");
  });

  it("sets the document language", () => {
    applyLocale(document, "fr");
    expect(document.documentElement.lang).toBe("fr");
  });
});
