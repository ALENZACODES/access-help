import { describe, expect, it } from "vitest";
import { COPY } from "./copy";
import { GLOSSARY, GLOSSARY_META, WORD_ID, getWord, glossaryFilename, glossaryStrings, glossaryToText, sortedGlossary, wordAnchor } from "./glossary";
import { auditCopy } from "./audit";
import { frenchTypographyIssues } from "../../switch-first/src/index";
import { findBanned, findScannerClaim } from "./wording";
import { plainIssues } from "./plain";

describe("glossary data", () => {
  it("has unique ids that are safe in an address and an anchor", () => {
    const ids = GLOSSARY.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(WORD_ID.test(id), id).toBe(true);
    expect(GLOSSARY.length).toBeGreaterThanOrEqual(20);
  });

  it("has a different term in each language where the words differ, and never an empty field", () => {
    for (const w of GLOSSARY) {
      for (const l of ["en", "fr"] as const) {
        expect(w.term[l].trim(), `${w.id} term ${l}`).not.toBe("");
        expect(w.meaning[l].trim(), `${w.id} meaning ${l}`).not.toBe("");
        expect(w.also[l].trim(), `${w.id} also ${l}`).not.toBe("");
      }
      expect(w.meaning.en).not.toBe(w.meaning.fr);
    }
  });

  it("has no two terms with the same name in one language", () => {
    for (const l of ["en", "fr"] as const) {
      const names = GLOSSARY.map((w) => w.term[l].toLowerCase());
      expect(new Set(names).size, l).toBe(names.length);
    }
  });

  it("records where the copy came from, its licence and its date", () => {
    expect(GLOSSARY_META).toEqual({ source: "Original copy written for the App", licence: "CC0-1.0", date: "2026-11-16" });
  });
});

describe("glossary wording", () => {
  it("passes the copy audit as a whole", () => {
    expect(auditCopy(glossaryStrings())).toEqual([]);
  });

  it("keeps every meaning plain: short sentences, in both languages", () => {
    for (const w of GLOSSARY) {
      for (const l of ["en", "fr"] as const) expect(plainIssues(w.meaning[l], l), `${w.id} ${l}`).toEqual([]);
    }
  });

  it("uses French typography and no banned wording", () => {
    for (const w of GLOSSARY) {
      expect(frenchTypographyIssues(w.meaning.fr), w.id).toEqual([]);
      expect(frenchTypographyIssues(w.term.fr), w.id).toEqual([]);
      for (const l of ["en", "fr"] as const) {
        expect(findBanned(w.meaning[l]), `${w.id} ${l}`).toBeUndefined();
        expect(findScannerClaim(w.meaning[l]), `${w.id} ${l}`).toBeUndefined();
      }
    }
  });

  it("says plainly that scanning and listening belong to the device, not the App", () => {
    expect(getWord("scanning")?.meaning.en).toContain("The App does not run a scanner.");
    expect(getWord("scanning")?.meaning.fr).toContain("L’App n’exécute aucun balayage.");
    expect(getWord("voice-control")?.meaning.en).toContain("The App does not listen.");
    expect(getWord("voice-control")?.meaning.fr).toContain("L’App n’écoute pas.");
    expect(getWord("switch")?.meaning.en).toContain("not to the App");
  });

  it("keeps Unknown separate from No", () => {
    expect(getWord("unknown")?.meaning.en).toContain("never turns Unknown into Yes or No");
    expect(getWord("unknown")?.meaning.fr).toContain("ne transforme jamais Inconnu");
  });

  it("only points at settings that the Display screen really has", () => {
    const display = { en: COPY.nav.display.en, fr: COPY.nav.display.fr };
    expect(getWord("text-spacing")?.meaning.en).toContain(`in ${display.en}`);
    expect(getWord("text-spacing")?.meaning.fr).toContain(`dans ${display.fr}`);
    expect(COPY.display.spacing.en).toBe("Text spacing");
    expect(getWord("contrast")?.meaning.en).toContain(`in ${display.en}`);
    expect(COPY.display.contrast.en).toBe("Contrast");
    expect(getWord("reduce-motion")?.meaning.en).toContain(`in ${display.en}`);
    expect(COPY.display.reduce.en).toBe(getWord("reduce-motion")?.term.en);
    expect(COPY.display.reduce.fr).toBe(getWord("reduce-motion")?.term.fr);
  });

  it("uses the same words for Any, Yes and No as the filter does", () => {
    const g = getWord("group")?.meaning;
    expect(g?.en).toContain(COPY.notes.any.en);
    expect(g?.fr).toContain(COPY.notes.any.fr);
    expect(g?.en).toContain(COPY.values.yes.en);
    expect(g?.fr).toContain(COPY.values.no.fr);
  });
});

describe("sortedGlossary", () => {
  it("is alphabetical in the language asked for, ignoring accents and case", () => {
    const en = sortedGlossary("en").map((w) => w.term.en);
    expect(en).toEqual([...en].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })));
    const fr = sortedGlossary("fr").map((w) => w.term.fr);
    expect(fr).toEqual([...fr].sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" })));
  });

  it("returns every word once and does not change the source list", () => {
    const before = GLOSSARY.map((w) => w.id);
    expect(sortedGlossary("en").length).toBe(GLOSSARY.length);
    expect(GLOSSARY.map((w) => w.id)).toEqual(before);
  });
});

describe("lookup and text", () => {
  it("finds a word by id and rejects anything else", () => {
    expect(getWord("focus")?.term.en).toBe("Focus");
    expect(getWord("nope")).toBeUndefined();
    expect(getWord(undefined)).toBeUndefined();
    expect(wordAnchor("focus")).toBe("word-focus");
  });

  it("writes a plain text file with one paragraph per word", () => {
    const text = glossaryToText("en", "What words mean", "Intro.");
    expect(text.startsWith("What words mean\n===============")).toBe(true);
    expect(text).toContain("Focus: The control you are on right now.");
    expect(text.split("\n\n").length).toBeGreaterThan(GLOSSARY.length);
    expect(glossaryFilename("fr")).toBe("words-fr.txt");
  });

  it("puts a no-break space before the colon in French", () => {
    const text = glossaryToText("fr", "Le sens des mots", "Intro.");
    expect(text).toContain("Contrôle\u00A0: Tout ce que vous pouvez utiliser");
    expect(text).not.toMatch(/[^\u00A0]: /);
  });
});
