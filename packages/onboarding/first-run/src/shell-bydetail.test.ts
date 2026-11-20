// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { COPY, CONTRIBUTOR_SOURCE, FACT_KEYS, QUESTIONS, byDetailToText, decodeTextExportHref, findBanned, groupPlaces, placeId, type Note } from "./index";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));
let h: Harness;

const NOTES = (): Note[] => [
  testNote("l1", "Library", [{ key: "elevator", value: "yes", on: "2025-02-02" }]),
  testNote("l2", "Library", [{ key: "elevator", value: "yes", on: "2026-08-08", source: CONTRIBUTOR_SOURCE }]),
  testNote("b1", "Bakery", [{ key: "elevator", value: "no", on: "2026-01-01" }], "2 Main St"),
  testNote("c1", "Cafe", [{ key: "elevator", value: "yes", on: "2026-03-03" }], "3 Main St"),
  testNote("c2", "Cafe", [{ key: "elevator", value: "no", on: "2026-04-04" }], "3 Main St"),
  testNote("a1", "Arena", [], null),
];

const LIBRARY_ID = placeId({ placeName: "Library", address: "1 Main St" });
const CAFE_ID = placeId({ placeName: "Cafe", address: "3 Main St" });

function openChooser(): void {
  h.click(act("view", "notes"));
  h.click(act("view", "places"));
  h.click(act("view", "bydetail"));
}

function openElevator(): void {
  openChooser();
  h.click(act("view-detail", "elevator"));
}

const group = (g: string): Element | null => h.root.querySelector(`section.bydetail-group[data-group="${g}"]`);
const listed = (g: string): string[] => Array.from(group(g)?.querySelectorAll("li strong[data-user-content]") ?? []).map((x) => x.textContent ?? "");

beforeEach(() => {
  h = createHarness(TODAY);
});

afterEach(() => {
  h.destroy();
});

describe("one detail across places", () => {
  it("is offered on the places screen and asks which detail to show", () => {
    h.seed(NOTES());
    h.mount();
    openChooser();
    expect(h.shell?.getView()).toEqual({ kind: "bydetail", key: undefined });
    expect(h.heading()).toBe("One detail across places");
    expect(Array.from(h.root.querySelectorAll(".bydetail-choose button")).map((b) => b.textContent)).toEqual(FACT_KEYS.map((k) => COPY.facts[k].en));
  });

  it("shows the four groups for the chosen detail, with totals that match", () => {
    h.seed(NOTES());
    h.mount();
    openElevator();
    expect(h.shell?.getView()).toEqual({ kind: "bydetail", key: "elevator" });
    expect(h.heading()).toBe("One detail across places: Elevator");
    expect([listed("yes"), listed("no"), listed("differ"), listed("unknown")]).toEqual([["Library"], ["Bakery"], ["Cafe"], ["Arena"]]);
    for (const g of ["yes", "no", "differ", "unknown"]) {
      expect(h.root.querySelector(`[data-count="${g}"]`)?.textContent, g).toBe(String(listed(g).length));
    }
  });

  it("shows the newest record for a Yes, in full", () => {
    h.seed(NOTES());
    h.mount();
    openElevator();
    const li = group("yes")?.querySelector("li");
    expect((li?.textContent ?? "").replace(/\s+/g, " ")).toBe(
      "Library 1 Main St. 2 reports. Newest record: Contributor report · CC0-1.0 · 2026-08-08 · Tier 0, not reviewed. Open the place",
    );
  });

  it("asks the question for UNKNOWN, and sends differing reports to the record history", () => {
    h.seed(NOTES());
    h.mount();
    openElevator();
    expect(group("unknown")?.textContent).toContain(QUESTIONS.elevator.en);
    expect(group("unknown")?.textContent).not.toMatch(/Source|CC0|Tier/);
    expect(group("differ")?.textContent).toContain(COPY.byDetail.differNote.en);
    h.click(`section[data-group="differ"] ${act("open-history", CAFE_ID)}`);
    expect(h.shell?.getView()).toEqual({ kind: "history", id: CAFE_ID });
  });

  it("opens a place, and ties each button to the place name", () => {
    h.seed(NOTES());
    h.mount();
    openElevator();
    for (const b of Array.from(h.root.querySelectorAll("section.bydetail-group li button"))) {
      expect(h.root.querySelector(`#${b.getAttribute("aria-describedby") ?? "x"}`)?.closest("li")).toBe(b.closest("li"));
    }
    h.click(`section[data-group="yes"] ${act("open-place", LIBRARY_ID)}`);
    expect(h.shell?.getView()).toEqual({ kind: "place", id: LIBRARY_ID });
  });

  it("says when a group is empty, and goes back to the chooser", () => {
    h.seed(NOTES());
    h.mount();
    openChooser();
    h.click(act("view-detail", "automatic-door"));
    expect(group("yes")?.textContent).toContain(COPY.byDetail.emptyGroup.en);
    expect(listed("unknown")).toEqual(["Arena", "Bakery", "Cafe", "Library"]);
    h.click(`main ${act("view", "bydetail")}`);
    expect(h.shell?.getView()).toEqual({ kind: "bydetail", key: undefined });
  });

  it("says there are no places yet, with no download", () => {
    h.mount();
    openElevator();
    expect(h.root.querySelector("[data-bydetail-empty]")?.textContent).toBe(COPY.byDetail.noPlaces.en);
    expect(h.root.querySelector("main a[download]:not([data-call-list]):not([data-call-script])")).toBeNull();
  });

  it("offers the detail as text", () => {
    h.seed(NOTES());
    h.mount();
    openElevator();
    const link = h.root.querySelector<HTMLAnchorElement>("main a[download]:not([data-call-list]):not([data-call-script])");
    expect(link?.getAttribute("download")).toBe("one-detail-elevator-2026-11-19-en.txt");
    expect(decodeTextExportHref(link?.getAttribute("href") ?? "")).toBe(byDetailToText(groupPlaces(NOTES(), "en"), "elevator", "en", TODAY));
  });

  it("opens straight from its address", () => {
    h.seed(NOTES());
    window.location.hash = "#/places/by-detail/elevator";
    h.mount("en", true);
    expect(h.shell?.getView()).toEqual({ kind: "bydetail", key: "elevator" });
    expect(listed("yes")).toEqual(["Library"]);
  });
});

describe("accessibility and wording", () => {
  it.each(["en", "fr"] as const)("passes axe and the App's own audit on the chooser and a detail (%s)", async (locale) => {
    h.seed(NOTES());
    h.mount(locale);
    openChooser();
    let r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => `${v.id}: ${v.help}`), "chooser").toEqual([]);
    h.click(act("view-detail", "elevator"));
    r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => `${v.id}: ${v.help}`), "detail").toEqual([]);
    expect(h.auditLines(), locale).toEqual([]);
    const ids = Array.from(h.root.querySelectorAll("[id]")).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const el of Array.from(h.root.querySelectorAll<HTMLElement>("main button, main a.linkbtn"))) expect(el.style.minHeight, el.textContent ?? "").toBe("44px");
  });

  it("passes the audit with no notes in both languages", () => {
    for (const locale of ["en", "fr"]) {
      h.mount(locale);
      openElevator();
      expect(h.auditLines(), locale).toEqual([]);
    }
  });

  it("uses no banned wording and never ranks", () => {
    h.seed(NOTES());
    for (const locale of ["en", "fr"] as const) {
      h.mount(locale);
      openElevator();
      const main = (h.root.querySelector("main")?.textContent ?? "").replace(COPY.byDetail.noRank[locale], "");
      expect(findBanned(main), locale).toBeUndefined();
      expect(main, locale).not.toMatch(/\b(best|worst|score|ranked|meilleur|pire|classement)\b/i);
      expect(main, locale).not.toMatch(/\binconnu/i);
    }
  });
});
