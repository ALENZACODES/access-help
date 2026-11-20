// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SHORTLIST_KEY, decodeTextExportHref, placeId, type Note } from "./index";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));
let h: Harness;

const NOTES = (): Note[] => [
  testNote("l1", "Library", [{ key: "step-free-entry", value: "yes" }, { key: "elevator", value: "yes", on: "2026-01-01" }]),
  testNote("l2", "Libary", [{ key: "elevator", value: "no", on: "2022-01-01" }], null),
  testNote("c1", "Cafe", [], "3 Main St"),
];
const LIBRARY = placeId({ placeName: "Library", address: "1 Main St" });
const CAFE = placeId({ placeName: "Cafe", address: "3 Main St" });

function open(view: string, locale = "en"): void {
  h.seed(NOTES());
  h.store.setItem(SHORTLIST_KEY, JSON.stringify([CAFE, LIBRARY]));
  h.mount(locale);
  h.click(act("view", "notes"));
  h.click(act("view", "places"));
  h.click(act("view", view));
}

beforeEach(() => {
  h = createHarness(TODAY);
});

afterEach(() => {
  h.destroy();
});

describe("call lists", () => {
  it("are offered for each detail with places on the no-record page", () => {
    open("gaps");
    const links = Array.from(h.root.querySelectorAll<HTMLAnchorElement>("a[data-call-list]"));
    expect(links.map((a) => a.getAttribute("data-call-list"))).toEqual(["step-free-entry", "accessible-washroom", "automatic-door", "elevator"]);
    expect(decodeTextExportHref(links[0]?.getAttribute("href") ?? "")).toContain("1. Cafe, 3 Main St");
  });

  it("are offered once on a detail page, for places with no record or reports that differ", () => {
    open("bydetail");
    h.click(act("view-detail", "elevator"));
    const links = h.root.querySelectorAll("a[data-call-list]");
    expect(links).toHaveLength(1);
    const text = decodeTextExportHref(links[0]?.getAttribute("href") ?? "") ?? "";
    expect(text).toContain("Cafe");
    expect(text).not.toContain("Library");
  });
});

describe("call scripts on the ask-again page", () => {
  it("are offered for each place, tied to its heading, with that place's questions", () => {
    open("review");
    const link = h.root.querySelector<HTMLAnchorElement>(`article.review-place[data-place="${CAFE}"] a[data-call-script]`);
    const heading = h.root.querySelector(`article.review-place[data-place="${CAFE}"] h3`);
    expect(link?.getAttribute("aria-describedby")).toBe(heading?.id);
    expect(decodeTextExportHref(link?.getAttribute("href") ?? "")).toContain("Call script: Cafe");
  });
});

describe("small additions on the shortlist and possible matches pages", () => {
  it("shows how many details are recorded on each shortlist row", () => {
    open("shortlistpage");
    expect(Array.from(h.root.querySelectorAll("[data-coverage]")).map((x) => x.textContent)).toEqual(["0 of 4 details recorded", "2 of 4 details recorded"]);
  });

  it("shows what stands behind each side of a possible match", () => {
    open("similar");
    const lines = Array.from(h.root.querySelectorAll("[data-behind-summary]")).map((x) => x.textContent);
    expect(lines).toEqual(expect.arrayContaining(["2 records, 1 source, 2026-01-01 – 2026-10-01", "1 record, 1 source, 2022-01-01"]));
  });
});

describe("accessibility", () => {
  it.each(["en", "fr"] as const)("passes axe and the App's own audit on each page with the new links (%s)", async (locale) => {
    for (const view of ["gaps", "review", "shortlistpage", "similar"]) {
      h.destroy();
      h = createHarness(TODAY);
      open(view, locale);
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => `${v.id}: ${v.help}`), `${view} ${locale}`).toEqual([]);
      expect(h.auditLines(), `${view} ${locale}`).toEqual([]);
      for (const a of Array.from(h.root.querySelectorAll<HTMLElement>("a[data-call-list], a[data-call-script]"))) expect(a.style.minHeight).toBe("44px");
      expect(h.root.querySelector("main")?.textContent ?? "").not.toMatch(/\binconnu/i);
    }
  });
});
