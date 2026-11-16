// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { PALETTE, STYLE_ID, buildCss, injectStyles } from "./index";

describe("stylesheet", () => {
  const css = buildCss();

  it("keeps 44px targets and a visible 3px focus ring", () => {
    expect(css).toContain("min-width:44px");
    expect(css).toContain("min-height:44px");
    expect(css).toMatch(/:focus-visible\{outline:3px solid var\(--focus\)/);
  });

  it("avoids fixed heights and clipped overflow in content", () => {
    const withoutSrOnly = css.replace(/\.sr-only\{[^}]*\}/, "");
    expect(withoutSrOnly).not.toMatch(/(^|[;{\s])height:/);
    expect(withoutSrOnly).not.toMatch(/overflow:\s*hidden/);
  });

  it("supports dark mode, forced colours, reduced motion and scroll padding", () => {
    expect(css).toContain("prefers-color-scheme: dark");
    expect(css).toContain("forced-colors: active");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("scroll-padding-top");
  });

  it("supports reader display settings: text size, spacing, contrast and motion", () => {
    expect(css).toContain('data-text-scale="200"');
    expect(css).toMatch(/data-spacing="wide"\] body\{line-height:1\.6;letter-spacing:\.12em;word-spacing:\.16em\}/);
    expect(css).toMatch(/margin-block-end:2em/);
    expect(css).toContain('data-contrast="more"');
    expect(css).toContain("prefers-contrast: more");
    expect(css).toContain('data-motion="reduce"');
    expect(css).toContain(PALETTE.high.buttonBg);
  });

  it("sizes form controls to 44px and shows errors with more than colour", () => {
    expect(css).toMatch(/label\.choice\{[^}]*min-height:44px/);
    expect(css).toMatch(/input\[type="text"\][^{]*\{[^}]*min-height:44px/);
    expect(css).toMatch(/\.error\{[^}]*font-weight:600/);
    expect(css).toMatch(/\[aria-invalid="true"\]\{border-color:var\(--error\)\}/);
  });

  it("uses the validated palette values", () => {
    expect(css).toContain(PALETTE.light.buttonBg);
    expect(css).toContain(PALETTE.dark.buttonBg);
  });

  it("injects once", () => {
    const a = injectStyles(document);
    const b = injectStyles(document);
    expect(a).toBe(b);
    expect(document.querySelectorAll(`#${STYLE_ID}`).length).toBe(1);
  });
});
