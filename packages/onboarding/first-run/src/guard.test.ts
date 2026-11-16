import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { TERM_LIST_FILES, scanSource, type GuardIssue } from "./index";

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|html)$/.test(name) && !/\.test\.ts$/.test(name)) out.push(p);
  }
  return out;
}

describe("scanSource rules", () => {
  const rules = (text: string): string[] => scanSource("x.ts", text).map((i) => i.rule.split(":")[0] ?? "");

  it("flags literal special spaces", () => {
    expect(rules("a\u00A0b")).toContain("literal-nbsp");
    expect(rules("a\u202Fb")).toContain("literal-nnbsp");
    expect(rules("a\\u00A0b")).toEqual([]);
  });

  it("flags zoom-blocking viewports and positive tabindex", () => {
    expect(rules('<meta name="viewport" content="width=device-width, user-scalable=no">')).toContain("zoom-blocked");
    expect(rules('<meta content="maximum-scale=1">')).toContain("zoom-blocked");
    expect(rules('<meta content="width=device-width, initial-scale=1">')).toEqual([]);
    expect(rules('<div tabindex="2">')).toContain("positive-tabindex");
    expect(rules('<h2 tabindex="-1">')).toEqual([]);
  });

  it("flags third-party tile servers, schedulers and secret-like literals", () => {
    expect(rules("https://tile.openstreetmap.org/{z}/{x}/{y}.png")).toContain("tile-server");
    expect(rules("on:\n  schedule:\n")).toContain("scheduler");
    expect(rules('const apiKey = "abcdef123456"')).toContain("secret-like literal");
    expect(rules("const key = process.env.KEY")).toEqual([]);
  });

  it("flags overclaims, AI mentions and AAA claims in copy", () => {
    expect(rules('"Verified accessible"')).toContain("overclaim");
    expect(rules('"Updated in real-time"')).toContain("overclaim");
    expect(rules('"Our partnership with"')).toContain("overclaim");
    expect(rules('"Powered by AI"')).toContain("ai-wording");
    expect(rules('"AAA conformant"')).toContain("aaa-claim");
  });

  it("lets marked files define wording lists", () => {
    expect(scanSource("g.ts", "// guard:allow-terms\nconst x = /verified/;")).toEqual([]);
    expect(scanSource("g.ts", "// guard:allow-terms\nconst x = '\u00A0';").length).toBe(1);
  });
});

describe("real source files under packages/onboarding", () => {
  const files = walk(PKG_ROOT);

  it("finds the packages from this and the earlier lanes", () => {
    const rel = files.map((f) => relative(PKG_ROOT, f).split("\\").join("/"));
    expect(rel).toContain("src/paths.ts");
    expect(rel).toContain("switch-first/src/index.ts");
    expect(rel).toContain("first-run/src/shell.ts");
    expect(rel).toContain("first-run/index.html");
  });

  it("passes every rule", () => {
    const issues: GuardIssue[] = [];
    for (const f of files) {
      const rel = relative(PKG_ROOT, f).split("\\").join("/");
      const base = rel.split("/").pop() ?? rel;
      let text = readFileSync(f, "utf8");
      // Earlier-lane files that hold wording lists are checked for everything else.
      if (TERM_LIST_FILES.includes(base) && !text.includes("guard:allow-terms")) {
        text = `// guard:allow-terms\n${text}`;
      }
      issues.push(...scanSource(rel, text));
    }
    expect(issues.map((i) => `${i.file}:${i.line} ${i.rule}`)).toEqual([]);
  });
});
