// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  DEFAULT_DISPLAY,
  DISPLAY_KEY,
  SPACINGS,
  TEXT_SCALES,
  applyDisplay,
  loadDisplay,
  memoryStore,
  parseDisplay,
  saveDisplay,
  updateDisplay,
} from "./index";

describe("display settings", () => {
  it("defaults to normal size, spacing, automatic contrast and motion", () => {
    expect(parseDisplay(null)).toEqual(DEFAULT_DISPLAY);
    expect(DEFAULT_DISPLAY).toEqual({ scale: "100", spacing: "normal", contrast: "auto", motion: "auto" });
  });

  it("offers text sizes up to 200% (WCAG 1.4.4)", () => {
    expect(TEXT_SCALES[TEXT_SCALES.length - 1]).toBe("200");
    expect(SPACINGS).toContain("wide");
  });

  it("validates each field and falls back field by field", () => {
    expect(parseDisplay('{"scale":"150","spacing":"huge","contrast":"more","motion":5}')).toEqual({
      scale: "150", spacing: "normal", contrast: "more", motion: "auto",
    });
    expect(parseDisplay("nope")).toEqual(DEFAULT_DISPLAY);
    expect(parseDisplay("[1]")).toEqual(DEFAULT_DISPLAY);
  });

  it("saves, loads and survives broken storage", () => {
    const s = memoryStore();
    const d = { scale: "200", spacing: "wide", contrast: "more", motion: "reduce" } as const;
    expect(saveDisplay(s, d)).toBe("saved");
    expect(loadDisplay(s)).toEqual(d);
    expect(saveDisplay(undefined, d)).toBe("unavailable");
    const broken = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); }, removeItem: () => undefined };
    expect(saveDisplay(broken, d)).toBe("unavailable");
    expect(loadDisplay(broken)).toEqual(DEFAULT_DISPLAY);
    expect(s.getItem(DISPLAY_KEY)).not.toBeNull();
  });

  it("updates one field and ignores invalid values", () => {
    expect(updateDisplay(DEFAULT_DISPLAY, "scale", "125").scale).toBe("125");
    expect(updateDisplay(DEFAULT_DISPLAY, "scale", "999").scale).toBe("100");
    expect(updateDisplay(DEFAULT_DISPLAY, "motion", "reduce").motion).toBe("reduce");
    expect(updateDisplay(DEFAULT_DISPLAY, "contrast", "more").contrast).toBe("more");
    expect(updateDisplay(DEFAULT_DISPLAY, "spacing", "wide").spacing).toBe("wide");
  });

  it("applies data attributes to the page", () => {
    applyDisplay(document, { scale: "150", spacing: "wide", contrast: "more", motion: "reduce" });
    const ds = document.documentElement.dataset;
    expect([ds["textScale"], ds["spacing"], ds["contrast"], ds["motion"]]).toEqual(["150", "wide", "more", "reduce"]);
  });
});
