import { describe, expect, it } from "vitest";
import {
  AA_TEXT,
  AA_UI,
  PALETTE,
  contrastRatio,
  paletteReport,
  parseHex,
  relativeLuminance,
} from "./index";

describe("contrast maths", () => {
  it("matches known WCAG values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#767676", "#ffffff")).toBeGreaterThan(4.5);
    expect(contrastRatio("#777777", "#ffffff")).toBeLessThan(4.6);
    expect(relativeLuminance(parseHex("#ffffff"))).toBeCloseTo(1, 5);
  });

  it("is symmetric and rejects bad colours", () => {
    expect(contrastRatio("#123456", "#abcdef")).toBeCloseTo(contrastRatio("#abcdef", "#123456"), 10);
    expect(() => parseHex("red")).toThrow();
    expect(() => parseHex("#fff")).toThrow();
  });
});

describe("palette", () => {
  it("meets WCAG 2.2 AA for every pair in all three themes", () => {
    const report = paletteReport();
    expect(report.length).toBe(24);
    const failing = report.filter((r) => !r.ok).map((r) => `${r.theme} ${r.pair} ${r.ratio.toFixed(2)}`);
    expect(failing).toEqual([]);
  });

  it("uses the AA thresholds", () => {
    expect(AA_TEXT).toBe(4.5);
    expect(AA_UI).toBe(3);
    for (const r of paletteReport()) {
      expect(r.min).toBe(/text|muted/.test(r.pair) ? AA_TEXT : AA_UI);
    }
  });

  it("high contrast reaches at least 7:1 for body text (AAA is a floor here, not a claim)", () => {
    expect(contrastRatio(PALETTE.high.text, PALETTE.high.bg)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(PALETTE.high.buttonText, PALETTE.high.buttonBg)).toBeGreaterThanOrEqual(7);
  });

  it("defines every colour as 6-digit hex", () => {
    for (const theme of [PALETTE.light, PALETTE.dark, PALETTE.high]) {
      for (const v of Object.values(theme)) expect(v).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
