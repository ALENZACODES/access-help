import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * "Compare two note files" is a separate entry point. These checks keep it out
 * of everything the App loads on a first visit: the package's main entry, the
 * first-run entry and shell, and the help centre's own source. A host reaches
 * it only through a dynamic import() of `@access/onboarding/file-compare`.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, "..", "..");
const read = (p: string): string => readFileSync(p, "utf8");

/** Static imports and re-exports of a module path (not dynamic import()). */
function staticRefs(source: string, needle: string): string[] {
  const re = /^\s*(?:import|export)\b[^;]*?from\s+["']([^"']+)["']/gm;
  const out: string[] = [];
  for (const m of source.matchAll(re)) if (m[1]?.includes(needle)) out.push(m[1]);
  return out;
}

describe("the file-compare entry point", () => {
  it("is listed in the package's exports and points at a file that exists", () => {
    const pkg = JSON.parse(read(join(PKG, "package.json"))) as { exports: Record<string, string> };
    const target = pkg.exports["./file-compare"];
    expect(target).toBe("./first-run/src/filecompare-entry.ts");
    expect(existsSync(join(PKG, target ?? ""))).toBe(true);
  });

  it("loads on demand and gives a host everything it needs to mount the comparison", async () => {
    const mod = await import("./filecompare-entry");
    expect(typeof mod.mountFileCompare).toBe("function");
    expect(typeof mod.compareFiles).toBe("function");
    expect(typeof mod.comparisonText).toBe("function");
    expect(typeof mod.readFileText).toBe("function");
    expect(mod.FILE_COMPARE_COPY.title.en).toBe("Compare two note files");
    expect(mod.fileCompareStrings().length).toBeGreaterThan(0);
  });

  it("is not pulled in by the package's main entry, the first-run entry or the shell", () => {
    for (const f of [join(PKG, "src", "index.ts"), join(HERE, "index.ts"), join(HERE, "shell.ts"), join(HERE, "main.ts")]) {
      if (!existsSync(f)) continue;
      const src = read(f);
      expect(staticRefs(src, "filecompare"), f).toEqual([]);
      expect(staticRefs(src, "views-filecompare"), f).toEqual([]);
    }
  });

  it("is not imported statically by the help centre, so its install payload does not grow", () => {
    const centre = join(PKG, "..", "..", "apps", "centre", "src");
    if (!existsSync(centre)) return;
    const files = ["App.tsx", "FirstRunPage.tsx", "OnboardingPage.tsx", "main.tsx"].map((f) => join(centre, f)).filter(existsSync);
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) expect(staticRefs(read(f), "file-compare"), f).toEqual([]);
  });

  it("finds static imports and ignores dynamic ones", () => {
    expect(staticRefs('import { a } from "./filecompare";\nexport * from "./x";', "filecompare")).toEqual(["./filecompare"]);
    expect(staticRefs('const m = await import("@access/onboarding/file-compare");', "file-compare")).toEqual([]);
  });
});
