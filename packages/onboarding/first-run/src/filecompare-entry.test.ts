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
    ["./file-summary", "./first-run/src/filesummary-entry.ts"],
    ["./file-ask", "./first-run/src/fileask-entry.ts"],
    ["./file-sheet", "./first-run/src/filesheet-entry.ts"],
    ["./file-streets", "./first-run/src/filestreets-entry.ts"],
    ["./file-visits", "./first-run/src/filevisits-entry.ts"],
    ["./file-round", "./first-run/src/fileround-entry.ts"],
    ["./file-first", "./first-run/src/filefirst-entry.ts"],
    ["./file-address", "./first-run/src/fileaddress-entry.ts"],
    ["./file-contacts", "./first-run/src/filecontacts-entry.ts"],
    ["./file-replace", "./first-run/src/filereplace-entry.ts"],
    ["./file-add", "./first-run/src/fileadd-entry.ts"],
    ["./file-asof", "./first-run/src/fileasof-entry.ts"],
    ["./file-areas", "./first-run/src/fileareas-entry.ts"],
    ["./file-drop", "./first-run/src/filedrop-entry.ts"],
    ["./file-rename", "./first-run/src/filerename-entry.ts"],
    ["./file-repeats", "./first-run/src/filerepeat-entry.ts"],
    ["./file-move", "./first-run/src/filemove-entry.ts"],
    ["./file-sources", "./first-run/src/filesources-entry.ts"],
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
    expect(tools.TOOL_IDS).toEqual(["read", "summary", "ask", "streets", "visits", "round", "first", "address", "contacts", "replace", "add", "asof", "areas", "drop", "rename", "repeats", "move", "sources", "check", "compare", "merge", "split", "sheet"]);
  });

  it("loads each tool from the note files page with a dynamic import, never a static one", () => {
    const src = read(join(HERE, "filetools.ts"));
    for (const entry of ["filereader-entry", "filesummary-entry", "fileask-entry", "filecheck-entry", "filecompare-entry", "filemerge-entry", "filesplit-entry", "filesheet-entry", "filestreets-entry", "filevisits-entry", "fileround-entry", "filefirst-entry", "fileaddress-entry", "filecontacts-entry", "filereplace-entry", "fileadd-entry", "fileasof-entry", "fileareas-entry", "filedrop-entry", "filerename-entry", "filerepeat-entry", "filemove-entry", "filesources-entry"]) {
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
      expect(staticRefs(src, "filesummary"), f).toEqual([]);
      expect(staticRefs(src, "fileask"), f).toEqual([]);
      expect(staticRefs(src, "filesheet"), f).toEqual([]);
      expect(staticRefs(src, "filestreets"), f).toEqual([]);
      expect(staticRefs(src, "filevisits"), f).toEqual([]);
      expect(staticRefs(src, "visitplan"), f).toEqual([]);
      expect(staticRefs(src, "fileround"), f).toEqual([]);
      expect(staticRefs(src, "visitrecord"), f).toEqual([]);
      expect(staticRefs(src, "filefirst"), f).toEqual([]);
      expect(staticRefs(src, "fileadd"), f).toEqual([]);
      expect(staticRefs(src, "bulkadd"), f).toEqual([]);
      expect(staticRefs(src, "fileaddress"), f).toEqual([]);
      expect(staticRefs(src, "addressfill"), f).toEqual([]);
      expect(staticRefs(src, "filecontacts"), f).toEqual([]);
      expect(staticRefs(src, "contactdetails"), f).toEqual([]);
      expect(staticRefs(src, "filereplace"), f).toEqual([]);
      expect(staticRefs(src, "textreplace"), f).toEqual([]);
      expect(staticRefs(src, "fileasof"), f).toEqual([]);
      expect(staticRefs(src, "/asof"), f).toEqual([]);
      expect(staticRefs(src, "fileareas"), f).toEqual([]);
      expect(staticRefs(src, "areacover"), f).toEqual([]);
      expect(staticRefs(src, "filedrop"), f).toEqual([]);
      expect(staticRefs(src, "dropplaces"), f).toEqual([]);
      expect(staticRefs(src, "filerename"), f).toEqual([]);
      expect(staticRefs(src, "renameplace"), f).toEqual([]);
      expect(staticRefs(src, "filerepeat"), f).toEqual([]);
      expect(staticRefs(src, "repeatnotes"), f).toEqual([]);
      expect(staticRefs(src, "filemove"), f).toEqual([]);
      expect(staticRefs(src, "movenote"), f).toEqual([]);
      expect(staticRefs(src, "filesources"), f).toEqual([]);
      expect(staticRefs(src, "sourcecover"), f).toEqual([]);
      expect(staticRefs(src, "lookfirst"), f).toEqual([]);
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
      expect(staticRefs(read(f), "file-summary"), f).toEqual([]);
      expect(staticRefs(read(f), "file-ask"), f).toEqual([]);
      expect(staticRefs(read(f), "file-sheet"), f).toEqual([]);
      expect(staticRefs(read(f), "file-streets"), f).toEqual([]);
      expect(staticRefs(read(f), "file-visits"), f).toEqual([]);
      expect(staticRefs(read(f), "file-round"), f).toEqual([]);
      expect(staticRefs(read(f), "file-first"), f).toEqual([]);
      expect(staticRefs(read(f), "file-add"), f).toEqual([]);
      expect(staticRefs(read(f), "file-address"), f).toEqual([]);
      expect(staticRefs(read(f), "file-contacts"), f).toEqual([]);
      expect(staticRefs(read(f), "file-replace"), f).toEqual([]);
      expect(staticRefs(read(f), "file-asof"), f).toEqual([]);
      expect(staticRefs(read(f), "file-areas"), f).toEqual([]);
      expect(staticRefs(read(f), "file-drop"), f).toEqual([]);
      expect(staticRefs(read(f), "file-rename"), f).toEqual([]);
      expect(staticRefs(read(f), "file-repeats"), f).toEqual([]);
      expect(staticRefs(read(f), "file-move"), f).toEqual([]);
      expect(staticRefs(read(f), "file-sources"), f).toEqual([]);
    }
  });

  it("finds static imports and ignores dynamic ones", () => {
    expect(staticRefs('import { a } from "./filecompare";\nexport * from "./x";', "filecompare")).toEqual(["./filecompare"]);
    expect(staticRefs('const m = await import("@access/onboarding/file-compare");', "file-compare")).toEqual([]);
  });
});
