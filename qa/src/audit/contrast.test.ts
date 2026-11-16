import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  FOCUS_MIN,
  HIGH_PREFIX,
  TEXT_MIN,
  auditContrast,
  auditHighContrastCoverage,
  contrastRatio,
  parseCss,
  parseHex,
} from "./contrast.js";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const read = (path: string) => readFileSync(join(root, path), "utf8");

const STANDARD_SHEETS = ["apps/centre/src/shell.css", "apps/centre/src/places/places.css", "apps/centre/src/settings/a11y-prefs.css"];
const HIGH_SHEET = "apps/centre/src/settings/a11y-prefs.css";

describe("contrast maths", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#fff", "#fff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
    expect(contrastRatio("#ffffff", "#000000")).toBe(contrastRatio("#000000", "#ffffff"));
  });

  it("reads short and long hex and refuses anything else", () => {
    expect(parseHex("#0b3")).toEqual([0, 187, 51]);
    expect(parseHex("#0B3D91")).toEqual([11, 61, 145]);
    for (const bad of ["red", "rgb(0,0,0)", "#12", "#12345", "var(--x)", undefined]) expect(parseHex(bad as string | undefined)).toBeNull();
    expect(contrastRatio("red", "#fff")).toBeNaN();
  });
});

describe("css parser", () => {
  it("reads rules, joins selector lists, skips comments, and looks inside @media", () => {
    const rules = parseCss(`
      /* a { color: red } */
      a, button { color: #0b3d91; }
      @media (max-width: 40rem) { main { padding: 1px; color: #111; } }
      @keyframes x { from { color: #000 } }
    `);
    expect(rules.map((r) => r.selector)).toEqual(["a, button", "main"]);
    expect(rules[0]?.decls.color).toBe("#0b3d91");
    expect(rules[1]?.decls.padding).toBe("1px");
  });
});

describe("contrast audit: the checker fails on violations", () => {
  it("flags text that is just under 4.5:1 and passes text that is just over", () => {
    const bad = auditContrast(".x { color: #777777; background: #ffffff; }", "x.css");
    expect(bad.findings).toEqual([expect.objectContaining({ kind: "text", ratio: 4.48, required: TEXT_MIN })]);
    expect(auditContrast(".x { color: #767676; background: #ffffff; }", "x.css").findings).toEqual([]);
  });

  it("checks a lone text colour against the page and a lone background against the page text", () => {
    expect(auditContrast(".x { color: #aaaaaa; }", "x.css").findings).toHaveLength(1);
    expect(auditContrast(".x { background: #333333; }", "x.css").findings).toHaveLength(1);
    expect(auditContrast(".x { color: #0b3d91; }", "x.css").findings).toEqual([]);
  });

  it("uses the dark page for the high contrast theme", () => {
    const css = `${HIGH_PREFIX} .x { color: #333333; } ${HIGH_PREFIX} .y { color: #ffff00; }`;
    expect(auditContrast(css, "x.css").findings.map((f) => f.selector)).toEqual([`${HIGH_PREFIX} .x`]);
  });

  it("flags a focus outline under 3:1 and ignores outlines on other selectors", () => {
    expect(auditContrast("a:focus { outline: 3px solid #cccccc; }", "x.css").findings).toEqual([expect.objectContaining({ kind: "focus", required: FOCUS_MIN })]);
    expect(auditContrast("a:focus { outline: 3px solid #0b3d91; }", "x.css").findings).toEqual([]);
    expect(auditContrast(".x { outline: 3px solid #cccccc; }", "x.css").findings).toEqual([]);
  });

  it("ignores values it cannot read instead of guessing", () => {
    const result = auditContrast(".x { color: var(--c); background: linear-gradient(#fff, #000); } .y { color: inherit; }", "x.css");
    expect(result).toEqual({ findings: [], checked: 0 });
  });
});

describe("high contrast coverage: the checker fails on violations", () => {
  it("lists a colour rule with no override", () => {
    const findings = auditHighContrastCoverage(".a { color: #111; } .b { padding: 1px; }", `${HIGH_PREFIX} .z { color: #fff; }`, "x.css");
    expect(findings).toEqual([{ file: "x.css", selector: ".a", kind: "no-high-contrast-override" }]);
  });

  it("accepts an override written in a selector list, and :root via the page rule", () => {
    const standard = ":root { color: #111; background: #fff; } a, button { color: #00f; }";
    const high = `${HIGH_PREFIX} { color: #fff; } ${HIGH_PREFIX} a, ${HIGH_PREFIX} button { color: #9fd0ff; }`;
    expect(auditHighContrastCoverage(standard, high, "x.css")).toEqual([]);
  });

  it("counts border, outline, fill, and stroke colours too", () => {
    for (const decl of ["border: 2px solid #000", "border-color: #000", "outline: 3px solid #000", "fill: #000", "stroke: #000", "border-bottom: 1px solid #000"]) {
      expect(auditHighContrastCoverage(`.a { ${decl}; }`, "", "x.css"), decl).toHaveLength(1);
    }
  });
});

describe("contrast audit: the stylesheets", () => {
  it("every literal colour pair and focus outline meets WCAG 2.2 AA, in both themes", () => {
    let checked = 0;
    const findings = STANDARD_SHEETS.flatMap((file) => {
      const result = auditContrast(read(file), file);
      checked += result.checked;
      return result.findings;
    });
    expect(checked).toBeGreaterThan(30);
    expect(findings, JSON.stringify(findings, null, 2)).toEqual([]);
  });

  it("the high contrast theme covers every colour rule in the shell and the places screens", () => {
    const findings = ["apps/centre/src/shell.css", "apps/centre/src/places/places.css", HIGH_SHEET].flatMap((file) =>
      auditHighContrastCoverage(read(file), read(HIGH_SHEET), file),
    );
    expect(findings, JSON.stringify(findings, null, 2)).toEqual([]);
  });
});
