import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BANNED_TERMS, countsByFile, findBannedCopy } from "./copy.js";

const root = fileURLToPath(new URL("../../..", import.meta.url));

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

const userCopyFile = (path: string) => /\.(ts|tsx|css|md)$/.test(path) && !/\.(test|spec)\.tsx?$/.test(path) && !path.endsWith("/testing.ts");

function scan(dirs: readonly string[]) {
  const files = dirs.flatMap((dir) => walk(join(root, dir))).filter(userCopyFile);
  return files.flatMap((file) => findBannedCopy(readFileSync(file, "utf8"), relative(root, file)));
}

/**
 * New screens and the docs written with them must not use the banned words at all.
 * Older shell copy is held at a baseline that may only go down.
 */
const STRICT_DIRS = ["apps/centre/src/places", "apps/centre/src/settings", "docs/offline-packs", "docs/data-status", "docs/mapping-day"];
const STRICT_FILES = ["docs/places.md"];

const RATCHET_BASELINE: Record<string, number> = {
  "apps/centre/src/App.tsx": 2,
};

describe("banned wording audit: the matcher", () => {
  const hit = (text: string) => findBannedCopy(text, "x").map((f) => f.term);

  it("catches each banned word in English and French, in any case", () => {
    expect(hit("Verified by staff")).toEqual(["verified"]);
    expect(hit("Non vérifié")).toEqual(["verified"]);
    expect(hit("Données vérifiées")).toEqual(["verified"]);
    expect(hit("PROTOTYPE-UNVERIFIED")).toEqual([]);
    expect(hit("unverified")).toEqual(["verified"]);
    expect(hit("Real-time status")).toEqual(["real-time"]);
    expect(hit("real time updates")).toEqual(["real-time"]);
    expect(hit("État en temps réel")).toEqual(["real-time"]);
    expect(hit("In partnership with")).toEqual(["partnership"]);
    expect(hit("Un partenariat avec")).toEqual(["partnership"]);
    expect(hit("We guarantee it")).toEqual(["guarantee"]);
    expect(hit("Guaranteed access")).toEqual(["guarantee"]);
    expect(hit("Accès garanti")).toEqual(["guarantee"]);
    expect(hit("Une garantie de qualité")).toEqual(["guarantee"]);
  });

  it("reports the line and can report several words on one line", () => {
    const found = findBannedCopy("fine\nreal-time and verified\nfine", "f.md");
    expect(found.map((f) => [f.line, f.term])).toEqual([[2, "verified"], [2, "real-time"]]);
    expect(found[0]?.file).toBe("f.md");
  });

  it("does not count the same word twice: verified is one finding, verify is another", () => {
    expect(hit("verified")).toEqual(["verified"]);
    expect(hit("verify")).toEqual(["verify"]);
    expect(hit("vérifié")).toEqual(["verified"]);
  });

  it("leaves unrelated words alone", () => {
    for (const text of ["checked on site", "reported", "partly accessible", "garage", "partner-free", "UNKNOWN", "time of day"]) {
      expect(hit(text), text).toEqual([]);
    }
  });

  it("has a pattern for each word the brief bans", () => {
    expect(BANNED_TERMS.map((t) => t.id).sort()).toEqual(["guarantee", "partnership", "real-time", "verified", "verify"]);
  });
});

describe("banned wording audit: the repository", () => {
  it("finds nothing in the new screens, settings, or the docs written with them", () => {
    const findings = [...scan(STRICT_DIRS), ...STRICT_FILES.flatMap((file) => findBannedCopy(readFileSync(join(root, file), "utf8"), file))];
    expect(findings, JSON.stringify(findings, null, 2)).toEqual([]);
  });

  it("holds the older shell copy at its baseline: it may go down but never up", () => {
    const shell = scan(["apps/centre/src"]).filter((f) => !STRICT_DIRS.some((dir) => f.file.startsWith(dir)));
    expect(countsByFile(shell)).toEqual(RATCHET_BASELINE);
  });
});
