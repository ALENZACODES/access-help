import { describe, expect, it } from "vitest";
import { ONBOARDING_PATHS, frenchTypographyIssues } from "../../src/paths";
import {
  ARTICLES,
  FIND_QUESTIONS,
  NODE_ID,
  START_NODE,
  chooserStrings,
  depthOf,
  findBanned,
  findScannerClaim,
  getQuestion,
  isLeaf,
  parentOf,
  plainIssues,
  reachableLeaves,
  validateTree,
} from "./index";

describe("the question tree", () => {
  it("is sound: every choice points somewhere and every question can be reached", () => {
    expect(validateTree()).toEqual([]);
  });

  it("starts at one question with a readable id", () => {
    expect(getQuestion(START_NODE)).toBeDefined();
    for (const q of FIND_QUESTIONS) expect(q.id, q.id).toMatch(NODE_ID);
    expect(new Set(FIND_QUESTIONS.map((q) => q.id)).size).toBe(FIND_QUESTIONS.length);
  });

  it("keeps every answer within three questions, so nobody has to go far", () => {
    for (const q of FIND_QUESTIONS) {
      expect(depthOf(q.id), q.id).toBeGreaterThanOrEqual(1);
      expect(depthOf(q.id), q.id).toBeLessThanOrEqual(3);
    }
  });

  it("offers two to six choices on a screen", () => {
    for (const q of FIND_QUESTIONS) {
      expect(q.choices.length, q.id).toBeGreaterThanOrEqual(2);
      expect(q.choices.length, q.id).toBeLessThanOrEqual(6);
    }
  });

  it("names each choice differently on its screen, in both languages", () => {
    for (const q of FIND_QUESTIONS) {
      for (const lang of ["en", "fr"] as const) {
        const names = q.choices.map((c) => c.label[lang].toLowerCase());
        expect(new Set(names).size, `${q.id} ${lang}`).toBe(names.length);
      }
    }
  });

  it("reaches every article, so no help page is only findable by name", () => {
    const leaves = reachableLeaves();
    for (const a of ARTICLES) expect(leaves.some((l) => l.kind === "article" && l.id === a.id), a.id).toBe(true);
  });

  it("reaches the keyboard, switch and voice short guides", () => {
    const leaves = reachableLeaves();
    for (const id of ["move-with-keyboard", "move-with-switch", "use-voice-control"]) {
      expect(leaves.some((l) => l.kind === "path" && l.id === id), id).toBe(true);
    }
    for (const l of leaves.filter((x) => x.kind === "path")) expect(ONBOARDING_PATHS.some((p) => p.id === l.id)).toBe(true);
  });

  it("gives every question except the first one parent, and that parent really links to it", () => {
    expect(parentOf(START_NODE)).toBeUndefined();
    for (const q of FIND_QUESTIONS.filter((x) => x.id !== START_NODE)) {
      const parent = parentOf(q.id);
      expect(parent, q.id).toBeDefined();
      const links = getQuestion(parent as string)?.choices.some((c) => !isLeaf(c.to) && c.to.node === q.id);
      expect(links, q.id).toBe(true);
    }
  });

  it("walks back to the start from anywhere without looping", () => {
    for (const q of FIND_QUESTIONS) {
      let cur: string | undefined = q.id;
      const seen = new Set<string>();
      while (cur !== undefined && cur !== START_NODE) {
        expect(seen.has(cur), `${q.id} loops at ${cur}`).toBe(false);
        seen.add(cur);
        cur = parentOf(cur);
      }
      expect(cur, q.id).toBe(START_NODE);
    }
  });

  it("returns 0 for a question that does not exist", () => {
    expect(depthOf("nope")).toBe(0);
    expect(parentOf("nope")).toBeUndefined();
    expect(getQuestion("nope")).toBeUndefined();
  });
});

describe("question wording", () => {
  const strings = chooserStrings();

  it("has English and French for every prompt and choice", () => {
    expect(strings.length).toBe(FIND_QUESTIONS.reduce((n, q) => n + 1 + q.choices.length, 0));
    for (const [label, l] of strings) {
      expect(l.en.trim(), `${label} en`).not.toBe("");
      expect(l.fr.trim(), `${label} fr`).not.toBe("");
      expect(l.fr, `${label} differs`).not.toBe(l.en);
    }
  });

  it("follows French typography, including the narrow space before a question mark", () => {
    for (const [label, l] of strings) expect(frenchTypographyIssues(l.fr), label).toEqual([]);
    const prompts = FIND_QUESTIONS.filter((q) => q.prompt.fr.endsWith("?"));
    expect(prompts.length).toBeGreaterThan(0);
    for (const q of prompts) expect(q.prompt.fr.endsWith("\u202F?"), q.id).toBe(true);
  });

  it("has no banned wording and no scanner claim", () => {
    for (const [label, l] of strings) {
      for (const lang of ["en", "fr"] as const) {
        expect(findBanned(l[lang]), `${label} ${lang}`).toBeUndefined();
        expect(findScannerClaim(l[lang]), `${label} ${lang}`).toBeUndefined();
      }
    }
  });

  it("uses short sentences, and asks questions in the first person only where it helps", () => {
    for (const [label, l] of strings) {
      for (const lang of ["en", "fr"] as const) expect(plainIssues(l[lang], lang), `${label} ${lang}`).toEqual([]);
    }
  });

  it("does not ask for anything about the person's body or condition", () => {
    const re = /\b(injur\w*|diagnos\w*|condition|disab\w*|paraly\w*|blessure|handicap\w*|diagnostic)\b/i;
    for (const [label, l] of strings) {
      expect(re.test(l.en), `${label} en`).toBe(false);
      expect(re.test(l.fr), `${label} fr`).toBe(false);
    }
  });
});
