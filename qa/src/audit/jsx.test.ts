import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { auditJsx, extractTags } from "./jsx.js";

const root = fileURLToPath(new URL("../../..", import.meta.url));

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

const problems = (source: string) => auditJsx(source, "x.tsx").map((f) => f.problem);

describe("extractTags", () => {
  it("reads a tag that spans lines and holds an arrow function", () => {
    const tags = extractTags(`<button\n  type="button"\n  onClick={() => go(a > b ? 1 : 2)}\n>Go</button>`);
    expect(tags).toHaveLength(1);
    expect(tags[0]?.name).toBe("button");
    expect(tags[0]?.text).toContain("a > b");
  });
  it("reports the line of each tag", () => {
    const tags = extractTags("<div>\n<p>x</p>\n</div>");
    expect(tags.map((t) => [t.name, t.line])).toEqual([["div", 1], ["p", 2]]);
  });
  it("is not fooled by a greater-than sign in a string", () => {
    expect(extractTags(`<a href="x" title="a > b">t</a>`)[0]?.text).toBe(`<a href="x" title="a > b">`);
  });
});

describe("markup audit: the checker fails on each kind of violation", () => {
  it("passes ordinary markup", () => {
    expect(problems(`<button type="button" onClick={go}>Go</button><a href="/x">x</a><img src="a.png" alt="" />`)).toEqual([]);
  });
  it("reports a click handler on a non-interactive element", () => {
    expect(problems(`<div onClick={go}>x</div>`)).toEqual(["click-on-static-element"]);
    expect(problems(`<li\n onClick={() => go()}\n>x</li>`)).toEqual(["click-on-static-element"]);
  });
  it("reports an image with no alt attribute, but not an empty one", () => {
    expect(problems(`<img src="a.png" />`)).toEqual(["image-without-alt"]);
    expect(problems(`<img src="a.png" alt="" />`)).toEqual([]);
  });
  it("reports a tabindex above zero", () => {
    expect(problems(`<div tabIndex={3}>x</div>`)).toEqual(["positive-tabindex"]);
    expect(problems(`<div tabIndex={-1}>x</div>`)).toEqual([]);
  });
  it("reports a new-tab link without noopener", () => {
    expect(problems(`<a href="/x" target="_blank">x</a>`)).toEqual(["new-tab-without-noopener"]);
    expect(problems(`<a href="/x" target="_blank" rel="noopener noreferrer">x</a>`)).toEqual([]);
  });
  it("reports HTML injection in markup and in code", () => {
    expect(problems(`<p dangerouslySetInnerHTML={{ __html: x }} />`)).toContain("html-injection");
    expect(problems(`el.innerHTML = value;`)).toEqual(["html-injection"]);
  });
  it("reports a link that goes nowhere", () => {
    expect(problems(`<a href="#">x</a>`)).toEqual(["dead-link"]);
    expect(problems(`<a href="javascript:void(0)">x</a>`)).toEqual(["dead-link"]);
    expect(problems(`<a href="#f-lat">x</a>`)).toEqual([]);
  });
  it("reports a button with no type, which would submit a form", () => {
    expect(problems(`<button onClick={go}>x</button>`)).toEqual(["button-without-type"]);
  });
  it("gives the file, the line, and the tag", () => {
    const [finding] = auditJsx("<p>\n<img src='x' />\n</p>", "f.tsx");
    expect(finding).toMatchObject({ file: "f.tsx", line: 2, problem: "image-without-alt" });
  });
});

describe("markup audit: the places and settings screens", () => {
  const files = [...walk(join(root, "apps/centre/src/places")), ...walk(join(root, "apps/centre/src/settings"))].filter(
    (path) => path.endsWith(".tsx") && !/\.(test|spec)\.tsx$/.test(path),
  );
  it("reads a useful number of components", () => {
    expect(files.length).toBeGreaterThanOrEqual(10);
  });
  it("has no finding", () => {
    const findings = files.flatMap((file) => auditJsx(readFileSync(file, "utf8"), relative(root, file)));
    expect(findings, JSON.stringify(findings, null, 2)).toEqual([]);
  });
});
