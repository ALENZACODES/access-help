import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * "Compare two note files", "Check a notes file" and "Combine note files" are
 * separate entry points. These checks keep it out
 * of everything the App loads on a first visit: the package's main entry, the
 * first-run entry and shell, and the help centre's own source. A host reaches
 * them only through a dynamic import() of `@access/onboarding/file-compare`,
 * `@access/onboarding/file-check` or `@access/onboarding/file-merge`.
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

  it("lists the file-check entry too, pointing at a file that exists", () => {
    const pkg = JSON.parse(read(join(PKG, "package.json"))) as { exports: Record<string, string> };
    const target = pkg.exports["./file-check"];
    expect(target).toBe("./first-run/src/filecheck-entry.ts");
    expect(existsSync(join(PKG, target ?? ""))).toBe(true);
  });

  it("loads the file check on demand, with what a host needs", async () => {
    const mod = await import("./filecheck-entry");
    expect(typeof mod.mountFileCheck).toBe("function");
    expect(typeof mod.checkFile).toBe("function");
    expect(typeof mod.cleanedCopy).toBe("function");
    expect(mod.FILE_CHECK_COPY.title.en).toBe("Check a notes file");
  });

  it("lists the file-merge entry, pointing at a file that exists", () => {
    const pkg = JSON.parse(read(join(PKG, "package.json"))) as { exports: Record<string, string> };
    const target = pkg.exports["./file-merge"];
    expect(target).toBe("./first-run/src/filemerge-entry.ts");
    expect(existsSync(join(PKG, target ?? ""))).toBe(true);
  });

  it("loads the file merge on demand, with what a host needs", async () => {
    const mod = await import("./filemerge-entry");
    expect(typeof mod.mountFileMerge).toBe("function");
    expect(typeof mod.planMerge).toBe("function");
    expect(typeof mod.applyChoices).toBe("function");
    expect(mod.FILE_MERGE_COPY.title.en).toBe("Combine note files");
  });

  it.each([
    ["./file-split", "./first-run/src/filesplit-entry.ts"],
    ["./file-tools", "./first-run/src/filetools-entry.ts"],
    ["./file-reader", "./first-run/src/filereader-entry.ts"],
  ])("lists the %s entry, pointing at a file that exists", (key, target) => {
    const pkg = JSON.parse(read(join(PKG, "package.json"))) as { exports: Record<string, string> };
    expect(pkg.exports[key]).toBe(target);
    expect(existsSync(join(PKG, target))).toBe(true);
  });

  it("loads the split tool and the note files page on demand", async () => {
    const split = await import("./filesplit-entry");
    expect(typeof split.mountFileSplit).toBe("function");
    expect(split.FILE_SPLIT_COPY.title.en).toBe("Split a notes file");
    const tools = await import("./filetools-entry");
    expect(typeof tools.mountFileTools).toBe("function");
    expect(tools.TOOL_IDS).toEqual(["read", "check", "compare", "merge", "split"]);
  });

  it("loads each tool from the note files page with a dynamic import, never a static one", () => {
    const src = read(join(HERE, "filetools.ts"));
    for (const entry of ["filereader-entry", "filecheck-entry", "filecompare-entry", "filemerge-entry", "filesplit-entry"]) {
      expect(src).toContain(`import("./${entry}")`);
      expect(staticRefs(src, entry)).toEqual([]);
    }
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
      expect(staticRefs(src, "filecheck"), f).toEqual([]);
      expect(staticRefs(src, "filemerge"), f).toEqual([]);
      expect(staticRefs(src, "filesplit"), f).toEqual([]);
      expect(staticRefs(src, "filetools"), f).toEqual([]);
      expect(staticRefs(src, "filereader"), f).toEqual([]);
    }
  });

  it("is not imported statically by the help centre, so its install payload does not grow", () => {
    const centre = join(PKG, "..", "..", "apps", "centre", "src");
    if (!existsSync(centre)) return;
    const files = ["App.tsx", "FirstRunPage.tsx", "OnboardingPage.tsx", "main.tsx"].map((f) => join(centre, f)).filter(existsSync);
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      expect(staticRefs(read(f), "file-compare"), f).toEqual([]);
      expect(staticRefs(read(f), "file-check"), f).toEqual([]);
      expect(staticRefs(read(f), "file-merge"), f).toEqual([]);
      expect(staticRefs(read(f), "file-split"), f).toEqual([]);
      expect(staticRefs(read(f), "file-tools"), f).toEqual([]);
      expect(staticRefs(read(f), "file-reader"), f).toEqual([]);
    }
  });

  it("finds static imports and ignores dynamic ones", () => {
    expect(staticRefs('import { a } from "./filecompare";\nexport * from "./x";', "filecompare")).toEqual(["./filecompare"]);
    expect(staticRefs('const m = await import("@access/onboarding/file-compare");', "file-compare")).toEqual([]);
  });
});
