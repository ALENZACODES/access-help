// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CONTRIBUTOR_SOURCE, placeId, type Note } from "./index";
import { CHANGE_COPY } from "./changes";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));
let h: Harness;

const NOTES = (): Note[] => [
  testNote("n1", "Library", [{ key: "elevator", value: "yes", on: "2024-01-10" }]),
  testNote("n2", "Library", [{ key: "elevator", value: "no", on: "2025-06-01", source: CONTRIBUTOR_SOURCE }]),
  testNote("n3", "Library", [{ key: "automatic-door", value: "yes", on: "2026-03-03" }]),
  testNote("n4", "Library", [{ key: "automatic-door", value: "no", on: "2026-03-03" }]),
  testNote("s1", "Studio", [{ key: "elevator", value: "yes" }], "5 Main St"),
  testNote("d1", "Dojo", [], "4 Main St"),
];

const ID = (name: string, address = "1 Main St"): string => placeId({ placeName: name, address });

function openHistory(id: string): void {
  h.click(act("view", "notes"));
  h.click(act("view", "places"));
  h.click(act("open-place", id));
  h.click(act("open-history", id));
}

const section = (): Element | null => h.root.querySelector("section.changes");

beforeEach(() => {
  h = createHarness(TODAY);
});

afterEach(() => {
  h.destroy();
});

describe("when the answer changed, on the record history page", () => {
  it("lists each change, oldest first, with both records", () => {
    h.seed(NOTES());
    h.mount();
    openHistory(ID("Library"));
    const items = Array.from(section()?.querySelectorAll("ol.changes-list > li") ?? []);
    expect(items.map((li) => li.querySelector("p strong")?.textContent)).toEqual(["Elevator: Yes, then No.", "Automatic door: Yes, then No."]);
    expect(section()?.querySelector("[data-changes-count]")?.textContent).toBe("2");
    const sides = Array.from(items[0]?.querySelectorAll("ul li") ?? []).map((li) => (li.textContent ?? "").replace(/\s+/g, " "));
    expect(sides).toEqual(["Before: Yes. City survey · CC0-1.0 · 2024-01-10 · Tier 0, not reviewed.", "After: No. Contributor report · CC0-1.0 · 2025-06-01 · Tier 0, not reviewed."]);
  });

  it("says when two records of the same day differ, only for that change", () => {
    h.seed(NOTES());
    h.mount();
    openHistory(ID("Library"));
    const items = Array.from(section()?.querySelectorAll("ol.changes-list > li") ?? []);
    expect(items.map((li) => li.getAttribute("data-same-day"))).toEqual(["false", "true"]);
    expect(items[0]?.querySelector(".hint")).toBeNull();
    expect(items[1]?.querySelector(".hint")?.textContent).toBe(CHANGE_COPY.sameDay.en);
  });

  it("says a newer record is not a correction, in both languages", () => {
    h.seed(NOTES());
    for (const l of ["en", "fr"] as const) {
      h.mount(l);
      openHistory(ID("Library"));
      expect(section()?.querySelector("[data-changes-note]")?.textContent).toBe(CHANGE_COPY.notCorrection[l]);
    }
  });

  it("says no answer changed when none did", () => {
    h.seed(NOTES());
    h.mount();
    openHistory(ID("Studio", "5 Main St"));
    expect(section()?.querySelector("[data-changes-none]")?.textContent).toBe(CHANGE_COPY.none.en);
    expect(section()?.querySelector("ol")).toBeNull();
  });

  it("is left out for a place with no record", () => {
    h.seed(NOTES());
    h.mount();
    openHistory(ID("Dojo", "4 Main St"));
    expect(section()).toBeNull();
  });

  it.each(["en", "fr"] as const)("passes axe and the App's own audit (%s)", async (locale) => {
    h.seed(NOTES());
    h.mount(locale);
    openHistory(ID("Library"));
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    expect(h.auditLines(), locale).toEqual([]);
    const ids = Array.from(h.root.querySelectorAll("[id]")).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
