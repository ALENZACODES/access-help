import { describe, expect, it } from "vitest";
import { ONBOARDING_PATHS, getPath } from "../../src/paths";
import { hashToView, searchHelp, viewToHash } from "./index";

const pathHits = (q: string, l: "en" | "fr"): string[] => searchHelp(q, l).filter((h) => h.kind === "path").map((h) => h.id);

describe("finding the new paths with help search", () => {
  it("finds each path by words from its title or steps, in English", () => {
    expect(pathHits("must-haves", "en")).toContain("plan-a-visit");
    expect(pathHits("shortlist order", "en")).toContain("plan-a-visit");
    expect(pathHits("ask the place", "en")).toContain("ask-about-unknown");
    expect(pathHits("tidy notes", "en")).toContain("tidy-my-notes");
  });

  it("finds them in French, also when the French word for UNKNOWN is typed", () => {
    expect(pathHits("incontournables", "fr")).toContain("plan-a-visit");
    expect(pathHits("ranger mes notes", "fr")).toContain("tidy-my-notes");
    expect(pathHits("UNKNOWN", "fr")).toContain("ask-about-unknown");
    expect(pathHits("inconnu", "fr")).toContain("ask-about-unknown");
  });

  it("does not match a path from words that only appear in the other language", () => {
    expect(pathHits("incontournables", "en")).not.toContain("plan-a-visit");
    expect(pathHits("must-haves", "fr")).not.toContain("plan-a-visit");
  });
});

describe("addresses of the new paths", () => {
  it("open each step by number and refuse a step past the end", () => {
    for (const id of ["plan-a-visit", "ask-about-unknown", "tidy-my-notes"]) {
      const n = getPath(id)?.steps.length ?? 0;
      for (let i = 0; i < n; i++) {
        const hash = viewToHash({ kind: "path", id, step: i });
        expect(hash).toBe(`#/help/${id}/${i + 1}`);
        expect(hashToView(hash)).toEqual({ kind: "path", id, step: i });
      }
      expect(hashToView(`#/help/${id}/${n + 1}`), id).toBeUndefined();
      expect(hashToView(`#/help/${id}/0`), id).toBeUndefined();
    }
  });

  it("keep every path id distinct from the help pages that share the address space", () => {
    const ids = ONBOARDING_PATHS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const reserved of ["place-card", "next-steps", "device", "articles", "words", "names", "practice", "find"]) expect(ids).not.toContain(reserved);
  });
});
