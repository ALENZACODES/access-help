import { describe, expect, it } from "vitest";
import { documentTitle, shouldMoveFocus } from "./titles.js";

describe("documentTitle", () => {
  it("puts the page heading first, in each language", () => {
    expect(documentTitle("Saved places", "en")).toBe("Saved places — the App");
    expect(documentTitle("Lieux enregistrés", "fr")).toBe("Lieux enregistrés — l’application");
  });
  it("collapses spaces and line breaks, and cuts a very long heading", () => {
    expect(documentTitle("  Saved \n  places ", "en")).toBe("Saved places — the App");
    expect(documentTitle("x".repeat(300), "en").length).toBeLessThanOrEqual(80 + " — the App".length);
  });
  it("falls back to the app name when there is no heading", () => {
    expect(documentTitle(null, "en")).toBe("the App");
    expect(documentTitle("   ", "fr")).toBe("l’application");
  });
  it("uses the French apostrophe, never a straight one", () => {
    expect(documentTitle("x", "fr")).not.toContain("'");
  });
});

describe("shouldMoveFocus", () => {
  it("does not move on the first load", () => {
    expect(shouldMoveFocus({ previousPath: null, path: "/places", hash: "" })).toBe(false);
  });
  it("moves when the path changes", () => {
    expect(shouldMoveFocus({ previousPath: "/", path: "/places", hash: "" })).toBe(true);
  });
  it("does not move when the same page re-renders, such as on a language change", () => {
    expect(shouldMoveFocus({ previousPath: "/places", path: "/places", hash: "" })).toBe(false);
  });
  it("leaves a link to a place inside the page alone", () => {
    expect(shouldMoveFocus({ previousPath: "/places", path: "/places/contribute", hash: "#f-lat" })).toBe(false);
  });
});
