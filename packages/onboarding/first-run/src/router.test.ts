import { describe, expect, it } from "vitest";
import { ONBOARDING_PATHS } from "../../src/paths";
import { ARTICLES, FIND_QUESTIONS, GLOSSARY, hashToView, isRouteHash, placeId, viewToHash, type View } from "./index";

describe("routes", () => {
  const views: View[] = [
    { kind: "setup" },
    { kind: "notes" },
    { kind: "form" },
    { kind: "display" },
    { kind: "help" },
    ...ARTICLES.map((a): View => ({ kind: "article", id: a.id })),
    ...FIND_QUESTIONS.map((q): View => ({ kind: "find", node: q.id })),
    { kind: "card" },
    { kind: "practice" },
    { kind: "names", section: "notes" },
    { kind: "names", section: "display" },
    { kind: "words", term: undefined },
    { kind: "words", term: "scanning" },
    { kind: "device" },
    { kind: "steps" },
    { kind: "places" },
    { kind: "sources" },
    { kind: "summary" },
    { kind: "similar" },
    { kind: "place", id: "archive-0a1b2c3d" },
    { kind: "plan", id: "archive-0a1b2c3d" },
    { kind: "history", id: "archive-0a1b2c3d" },
    { kind: "review" },
    { kind: "latest" },
    { kind: "ages" },
    { kind: "repeats" },
    { kind: "gaps" },
    { kind: "compare", ids: ["a-1", "b-2"] },
    { kind: "compare", ids: ["a-1", "b-2", "c-3"] },
    ...ONBOARDING_PATHS.flatMap((p) => p.steps.map((_, i): View => ({ kind: "path", id: p.id, step: i }))),
  ];

  it("round-trips every screen through its address", () => {
    for (const v of views) expect(hashToView(viewToHash(v)), viewToHash(v)).toEqual(v);
  });

  it("uses readable, 1-based addresses", () => {
    expect(viewToHash({ kind: "path", id: "get-help", step: 0 })).toBe("#/help/get-help/1");
    expect(viewToHash({ kind: "form" })).toBe("#/notes/new");
    expect(viewToHash({ kind: "plan", id: "x-1" })).toBe("#/places/x-1/plan");
    expect(viewToHash({ kind: "compare", ids: ["a-1", "b-2"] })).toBe("#/compare/a-1,b-2");
  });

  it("opens a path at its first step when no step is given", () => {
    expect(hashToView("#/help/get-help")).toEqual({ kind: "path", id: "get-help", step: 0 });
  });

  it("only treats #/ hashes as routes, so skip links and field links are left alone", () => {
    expect(isRouteHash("#/notes")).toBe(true);
    for (const h of ["", "#", "#main", "#f-placeName", "notes"]) {
      expect(isRouteHash(h), h).toBe(false);
      expect(hashToView(h), h).toBeUndefined();
    }
  });

  it("rejects unknown, malformed and out-of-range routes", () => {
    for (const h of [
      "#/", "#/nope", "#/setup/extra", "#/notes/old", "#/notes/new/x", "#/help/nope", "#/help/get-help/0",
      "#/help/get-help/9", "#/help/get-help/x", "#/help/place-card/1", "#/places/UPPER", "#/places/a b",
      "#/places/x/other", "#/compare", "#/compare/a-1", "#/compare/a-1,a-1", "#/compare/a-1,b-2,c-3,d-4", "#/compare/A,b", "#/compare/a-1,b-2/x", `#/compare/${"a".repeat(300)},b`, "#/places/x/plan/y", "#/a/b/c/d", `#/places/${"a".repeat(81)}`,
    ]) {
      expect(hashToView(h), h).toBeUndefined();
    }
  });
});

describe("article routes", () => {
  it("uses a readable address under the help centre", () => {
    expect(viewToHash({ kind: "article", id: "keyboard" })).toBe("#/help/articles/keyboard");
    expect(hashToView("#/help/articles/keyboard")).toEqual({ kind: "article", id: "keyboard" });
  });

  it("sends the bare articles address to the help list", () => {
    expect(hashToView("#/help/articles")).toEqual({ kind: "help" });
  });

  it("does not open an article that does not exist, or an address that is not an id", () => {
    for (const h of ["#/help/articles/nope", "#/help/articles/KEYBOARD", "#/help/articles/../x", "#/help/articles/keyboard/extra"]) {
      expect(hashToView(h), h).toBeUndefined();
    }
  });

  it("keeps article ids from colliding with path ids", () => {
    const paths = new Set(ONBOARDING_PATHS.map((p) => p.id));
    for (const a of ARTICLES) expect(paths.has(a.id), a.id).toBe(false);
  });
});

describe("names and words routes", () => {
  it("round trips every names screen, with Notes as the plain address", () => {
    expect(viewToHash({ kind: "names", section: "notes" })).toBe("#/help/names");
    expect(hashToView("#/help/names")).toEqual({ kind: "names", section: "notes" });
    for (const s of ["setup", "help", "display"] as const) {
      expect(viewToHash({ kind: "names", section: s })).toBe(`#/help/names/${s}`);
      expect(hashToView(`#/help/names/${s}`)).toEqual({ kind: "names", section: s });
    }
    for (const h of ["#/help/names/places", "#/help/names/Notes", "#/help/names/help/x", "#/help/names/"]) {
      const v = hashToView(h);
      if (h === "#/help/names/") expect(v).toEqual({ kind: "names", section: "notes" });
      else expect(v, h).toBeUndefined();
    }
  });

  it("round trips every word and rejects ones that are not in the list", () => {
    expect(viewToHash({ kind: "words", term: undefined })).toBe("#/help/words");
    expect(hashToView("#/help/words")).toEqual({ kind: "words", term: undefined });
    for (const w of GLOSSARY) {
      expect(viewToHash({ kind: "words", term: w.id })).toBe(`#/help/words/${w.id}`);
      expect(hashToView(`#/help/words/${w.id}`)).toEqual({ kind: "words", term: w.id });
    }
    for (const h of ["#/help/words/nope", "#/help/words/FOCUS", "#/help/words/focus/x", "#/help/words/../x"]) expect(hashToView(h), h).toBeUndefined();
  });

  it("does not let a short guide hide these addresses", () => {
    for (const id of ["names", "words", "practice", "find"]) expect(ONBOARDING_PATHS.some((p) => p.id === id), id).toBe(false);
  });
});

describe("practice route", () => {
  it("round trips and rejects extra parts", () => {
    expect(viewToHash({ kind: "practice" })).toBe("#/help/practice");
    expect(hashToView("#/help/practice")).toEqual({ kind: "practice" });
    for (const h of ["#/help/practice/x", "#/help/Practice", "#/help/practice/"]) {
      const v = hashToView(h);
      if (h === "#/help/practice/") expect(v).toEqual({ kind: "practice" });
      else expect(v, h).toBeUndefined();
    }
  });
});

describe("find-help routes", () => {
  it("gives the first question the short address and the others their own", () => {
    expect(viewToHash({ kind: "find", node: "start" })).toBe("#/help/find");
    expect(viewToHash({ kind: "find", node: "move" })).toBe("#/help/find/move");
    expect(hashToView("#/help/find")).toEqual({ kind: "find", node: "start" });
    expect(hashToView("#/help/find/move")).toEqual({ kind: "find", node: "move" });
  });

  it("opens a question by address, and nothing for one that does not exist or is not an id", () => {
    for (const h of ["#/help/find/nope", "#/help/find/MOVE", "#/help/find/../x", "#/help/find/move/extra", "#/help/find/"]) {
      const v = hashToView(h);
      if (h === "#/help/find/") expect(v, h).toEqual({ kind: "find", node: "start" });
      else expect(v, h).toBeUndefined();
    }
  });

  it("does not let a short guide hide the find address", () => {
    expect(ONBOARDING_PATHS.some((p) => p.id === "find")).toBe(false);
  });
});

describe("device route", () => {
  it("round trips and rejects extra parts", () => {
    expect(viewToHash({ kind: "device" })).toBe("#/help/device");
    expect(hashToView("#/help/device")).toEqual({ kind: "device" });
    for (const h of ["#/help/device/x", "#/help/Device", "#/device"]) expect(hashToView(h), h).toBeUndefined();
    expect(hashToView("#/help/device/")).toEqual({ kind: "device" });
  });

  it("is not hidden by a short guide", () => {
    expect(ONBOARDING_PATHS.some((p) => p.id === "device")).toBe(false);
  });
});

describe("next steps route", () => {
  it("round trips and rejects extra parts", () => {
    expect(viewToHash({ kind: "steps" })).toBe("#/help/next-steps");
    expect(hashToView("#/help/next-steps")).toEqual({ kind: "steps" });
    for (const h of ["#/help/next-steps/x", "#/help/Next-Steps", "#/next-steps"]) expect(hashToView(h), h).toBeUndefined();
  });

  it("is not hidden by a short guide", () => {
    expect(ONBOARDING_PATHS.some((p) => p.id === "next-steps")).toBe(false);
  });
});

describe("the sources and summary pages", () => {
  it("have their own readable addresses under places", () => {
    expect(viewToHash({ kind: "sources" })).toBe("#/places/sources");
    expect(viewToHash({ kind: "summary" })).toBe("#/places/summary");
    expect(hashToView("#/places/sources")).toEqual({ kind: "sources" });
    expect(hashToView("#/places/summary")).toEqual({ kind: "summary" });
  });

  it("do not take extra parts, and are not a place with a plan", () => {
    for (const h of ["#/places/sources/plan", "#/places/summary/plan", "#/places/sources/1", "#/places/summary/extra"]) {
      expect(hashToView(h), h).toBeUndefined();
    }
  });

  it("are exact: a similar name is a place id, and other cases are not routes", () => {
    expect(hashToView("#/places/sources-0a1b2c3d")).toEqual({ kind: "place", id: "sources-0a1b2c3d" });
    expect(hashToView("#/places/Sources")).toBeUndefined();
    expect(hashToView("#/places/summary-")).toEqual({ kind: "place", id: "summary-" });
  });

  it("cannot be taken by a place, because every place id ends in a hash", () => {
    for (const name of ["sources", "summary", "Sources", "SUMMARY", "Sources!", "", "  ", "é"]) {
      for (const address of [undefined, "", "1 Main St"]) {
        const id = placeId({ placeName: name, address });
        expect(id, `${name}|${address}`).toMatch(/-[0-9a-f]{8}$/);
        expect(id).not.toBe("sources");
        expect(id).not.toBe("summary");
        expect(hashToView(`#/places/${id}`), id).toEqual({ kind: "place", id });
      }
    }
  });
});

describe("the possible matches page", () => {
  it("has a readable address under places and takes no extra parts", () => {
    expect(viewToHash({ kind: "similar" })).toBe("#/places/similar");
    expect(hashToView("#/places/similar")).toEqual({ kind: "similar" });
    for (const h of ["#/places/similar/plan", "#/places/similar/1", "#/places/Similar"]) expect(hashToView(h), h).toBeUndefined();
  });

  it("is exact: a longer name is a place id, and no place can take the name", () => {
    expect(hashToView("#/places/similar-0a1b2c3d")).toEqual({ kind: "place", id: "similar-0a1b2c3d" });
    for (const name of ["similar", "Similar", "similar!", ""]) {
      const id = placeId({ placeName: name, address: undefined });
      expect(id).toMatch(/-[0-9a-f]{8}$/);
      expect(hashToView(`#/places/${id}`)).toEqual({ kind: "place", id });
    }
  });
});

describe("the ask-again and record history pages", () => {
  it("have readable addresses under places", () => {
    expect(viewToHash({ kind: "review" })).toBe("#/places/ask-again");
    expect(hashToView("#/places/ask-again")).toEqual({ kind: "review" });
    expect(viewToHash({ kind: "history", id: "cafe-0a1b2c3d" })).toBe("#/places/cafe-0a1b2c3d/history");
    expect(hashToView("#/places/cafe-0a1b2c3d/history")).toEqual({ kind: "history", id: "cafe-0a1b2c3d" });
  });

  it("take no extra parts and are exact about case", () => {
    for (const h of ["#/places/ask-again/plan", "#/places/ask-again/history", "#/places/Ask-Again", "#/places/cafe-0a1b2c3d/History", "#/places/cafe-0a1b2c3d/history/x"]) {
      expect(hashToView(h), h).toBeUndefined();
    }
    expect(hashToView("#/places/ask-again/")).toEqual({ kind: "review" });
  });

  it("keep the plan address working next to the history address", () => {
    expect(hashToView("#/places/cafe-0a1b2c3d/plan")).toEqual({ kind: "plan", id: "cafe-0a1b2c3d" });
    expect(hashToView("#/places/cafe-0a1b2c3d/other")).toBeUndefined();
  });

  it("cannot be taken by a place, because every place id ends in a hash", () => {
    for (const name of ["ask-again", "Ask again", "ask again!", "history"]) {
      for (const address of [undefined, "1 Main St"]) {
        const id = placeId({ placeName: name, address });
        expect(id).toMatch(/-[0-9a-f]{8}$/);
        expect(id).not.toBe("ask-again");
        expect(hashToView(`#/places/${id}`), id).toEqual({ kind: "place", id });
        expect(hashToView(`#/places/${id}/history`), id).toEqual({ kind: "history", id });
      }
    }
    expect(hashToView("#/places/ask-again-0a1b2c3d")).toEqual({ kind: "place", id: "ask-again-0a1b2c3d" });
  });

  it("does not let a short guide hide the address", () => {
    expect(ONBOARDING_PATHS.some((p) => p.id === "ask-again")).toBe(false);
  });
});

describe("the latest, record ages and repeated records pages", () => {
  const pages = [
    ["#/places/latest", { kind: "latest" }],
    ["#/places/record-ages", { kind: "ages" }],
    ["#/places/repeated-records", { kind: "repeats" }],
    ["#/places/no-record", { kind: "gaps" }],
  ] as const;

  it("have readable addresses under places", () => {
    for (const [hash, view] of pages) {
      expect(viewToHash(view)).toBe(hash);
      expect(hashToView(hash)).toEqual(view);
      expect(hashToView(`${hash}/`)).toEqual(view);
    }
  });

  it("take no extra parts and are exact about case", () => {
    for (const [hash] of pages) {
      for (const extra of ["/plan", "/history", "/1"]) expect(hashToView(hash + extra), hash + extra).toBeUndefined();
      expect(hashToView(hash.replace("places/", "places/X")), hash).toBeUndefined();
    }
    expect(hashToView("#/places/Latest")).toBeUndefined();
  });

  it("cannot be taken by a place, because every place id ends in a hash", () => {
    for (const name of ["latest", "record ages", "record-ages", "repeated records", "Latest"]) {
      const id = placeId({ placeName: name, address: undefined });
      expect(id).toMatch(/-[0-9a-f]{8}$/);
      expect(hashToView(`#/places/${id}`), id).toEqual({ kind: "place", id });
    }
    expect(hashToView("#/places/latest-0a1b2c3d")).toEqual({ kind: "place", id: "latest-0a1b2c3d" });
  });

  it("are not hidden by a short guide", () => {
    for (const id of ["latest", "record-ages", "repeated-records"]) expect(ONBOARDING_PATHS.some((p) => p.id === id), id).toBe(false);
  });
});
