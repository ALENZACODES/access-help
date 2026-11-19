// @vitest-environment jsdom
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { COPY as SWITCH_COPY } from "../../switch-first/src/copy";
import { COPY, auditCopy, auditDom, collectAllCopy, frenchRenamesUnknown, getWord, searchHelp, searchWords, type Locale } from "./index";

/**
 * The status of a detail with no record is the token UNKNOWN. French copy
 * keeps the token instead of renaming it "inconnu", so a French reader sees
 * the same status word as the rest of the App, its packs and its exports.
 */
const HERE = dirname(fileURLToPath(import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" ? [] : sourceFiles(p);
    return e.name.endsWith(".ts") && !e.name.endsWith(".test.ts") ? [p] : [];
  });
}

function audit(inner: string, locale: Locale): string[] {
  document.documentElement.lang = locale;
  document.body.innerHTML = `<div id="r"><a class="skip-link" href="#main">Skip</a><main id="main"><h1>Titre</h1>${inner}</main></div>`;
  return auditDom(document.getElementById("r") as HTMLElement, { locale }).filter((v) => v.rule === "unknown-token").map((v) => v.detail);
}

describe("frenchRenamesUnknown", () => {
  it("finds every form of the French word, in any case", () => {
    for (const w of ["inconnu", "inconnue", "inconnus", "inconnues", "Inconnu", "INCONNUES"]) {
      expect(frenchRenamesUnknown(`Le détail est ${w}.`), w).toBe(w);
    }
  });

  it("leaves the token and other words alone", () => {
    for (const text of ["Le détail est UNKNOWN.", "Lieux UNKNOWN (sans donnée)", "connu", "méconnu", "inconnuable"]) {
      expect(frenchRenamesUnknown(text), text).toBeUndefined();
    }
  });
});

describe("the copy audit", () => {
  it("flags French copy that renames UNKNOWN", () => {
    const v = auditCopy([["COPY.x", { en: "Places with no record", fr: "Lieux inconnus" }]]);
    expect(v.map((x) => x.rule)).toEqual(["unknown-token"]);
    expect(v[0]?.detail).toBe('COPY.x: "inconnus" instead of UNKNOWN');
  });

  it("passes every string the package ships", () => {
    expect(auditCopy(collectAllCopy()).filter((v) => v.rule === "unknown-token")).toEqual([]);
  });
});

describe("the page audit", () => {
  it("flags the French word on a French page", () => {
    expect(audit("<p>Chaque détail reste inconnu.</p>", "fr")).toEqual(['"inconnu" instead of UNKNOWN in "Chaque détail reste inconnu."']);
    expect(audit('<button type="button" aria-label="Lieux inconnus" style="min-width:44px;min-height:44px">Lieux inconnus</button>', "fr").length).toBeGreaterThan(0);
  });

  it("does not check a place name or address a person typed", () => {
    expect(audit("<p><span data-user-content>Café Inconnu</span></p>", "fr")).toEqual([]);
  });

  it("does not check an English page", () => {
    expect(audit("<p>Inconnu is a French word.</p>", "en")).toEqual([]);
  });
});

describe("the strings the QA review named", () => {
  it("count places with no record with the token", () => {
    expect(COPY.ages.noRecord.fr).toBe("Lieux UNKNOWN (sans donnée)");
    expect(COPY.ages.noRecord.en).toBe("Places with no record");
  });

  it("give the status value as the token", () => {
    expect(COPY.values.unknown.fr).toBe("UNKNOWN");
    expect(COPY.plan.unknown.fr).toBe("UNKNOWN");
    expect(SWITCH_COPY.finish.unknown.fr).toBe("UNKNOWN");
  });

  it("use the token in every French empty state that speaks of missing details", () => {
    const empty = [
      COPY.sources.empty,
      COPY.history.noRecords,
      COPY.review.whyUnknown,
      COPY.textExport.placeIntro,
      COPY.textExport.compareIntro,
      COPY.gaps.intro,
      COPY.gaps.notNo,
    ];
    for (const p of empty) {
      expect(p.fr, p.en).toContain("UNKNOWN");
      expect(p.fr, p.en).not.toMatch(/\binconnu/i);
    }
  });

  it("keep the glossary term as the token", () => {
    expect(getWord("unknown")?.term.fr).toBe("UNKNOWN");
  });
});

describe("search", () => {
  it("turns the French word into the token, only in French", () => {
    expect(searchWords("Inconnue filtre", "fr")).toEqual(["unknown", "filtre"]);
    expect(searchWords("inconnu", "en")).toEqual(["inconnu"]);
  });

  it("still finds the article about UNKNOWN when a person types the French word", () => {
    for (const q of ["inconnu", "inconnus", "Inconnue", "UNKNOWN"]) {
      expect(searchHelp(q, "fr").map((x) => `${x.kind}:${x.id}`), q).toContain("article:unknown");
    }
  });
});

describe("source files", () => {
  // Only the audit (which looks for the word) and search (which maps it to the token) may hold it.
  const ALLOWED = ["audit.ts", "search.ts"];

  it("hold no French word for UNKNOWN in copy", () => {
    const files = [...sourceFiles(join(HERE)), ...sourceFiles(join(HERE, "../../src")), ...sourceFiles(join(HERE, "../../switch-first/src"))];
    expect(files.length).toBeGreaterThan(50);
    const found = files.filter((f) => /\binconnu(?:es|e|s)?\b/i.test(readFileSync(f, "utf8"))).map((f) => f.slice(HERE.length + 1));
    expect(found.sort()).toEqual(ALLOWED);
  });
});
