// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { COPY, LATEST_PAGE, REVIEW_PAGE, groupPlaces, renderAges, renderHistory, renderLatest, renderRepeats, renderReview, type Locale, type Note } from "./index";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 15));
const NASTY = '<script>alert(1)</script> "quoted" & more';

const NOTES = (): Note[] => [
  testNote("n1", NASTY, [{ key: "elevator", value: "yes", source: NASTY, on: "2026-05-05" }], NASTY),
  testNote("n2", NASTY, [{ key: "elevator", value: "yes", source: NASTY, on: "2026-05-05" }], NASTY),
  testNote("n3", NASTY, [{ key: "elevator", value: "no", source: "City survey", on: "2024-01-01" }], NASTY),
];

function dom(html: string): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = html;
  return el;
}

const pages = (l: Locale, notes: Note[] = NOTES()): Array<[string, string]> => {
  const places = groupPlaces(notes, l);
  return [
    ["ages", renderAges(places, l, TODAY)],
    ["repeats", renderRepeats(places, l, TODAY)],
    ["latest", renderLatest({ places, only: undefined, shown: LATEST_PAGE, locale: l, today: TODAY })],
    ["review", renderReview({ places, only: undefined, shown: REVIEW_PAGE, locale: l, today: TODAY })],
    ["history", renderHistory(places[0], l, TODAY)],
  ];
};

describe("the record pages as markup", () => {
  it("never let a name, an address or a source become markup", () => {
    for (const l of ["en", "fr"] as const) {
      for (const [name, html] of pages(l)) {
        const el = dom(html);
        expect(el.querySelector("script"), `${name} ${l}`).toBeNull();
        expect(html, `${name} ${l}`).not.toContain("<script>");
        if (name !== "ages") expect(el.textContent, `${name} ${l}`).toContain(NASTY);
      }
    }
  });

  it("keep attribute values intact when a place id or file name is used in them", () => {
    for (const [name, html] of pages("en")) {
      const el = dom(html);
      for (const a of Array.from(el.querySelectorAll("a[download]"))) {
        expect(a.getAttribute("download"), name).toMatch(/^[a-z0-9.-]+\.txt$/);
        expect(a.getAttribute("href"), name).toMatch(/^data:text\/plain/);
      }
      for (const b of Array.from(el.querySelectorAll("button[data-value]"))) expect(b.getAttribute("data-value"), name).toMatch(/^[a-z0-9-]*$/);
    }
  });

  it("are one labelled section each, in the page language, with a single h2", () => {
    for (const l of ["en", "fr"] as const) {
      for (const [name, html] of pages(l)) {
        const el = dom(html);
        expect(el.children, `${name} ${l}`).toHaveLength(1);
        const section = el.firstElementChild;
        expect(section?.tagName).toBe("SECTION");
        expect(section?.getAttribute("lang")).toBe(l);
        expect(section?.getAttribute("aria-labelledby")).toBe("view-title");
        expect(el.querySelectorAll("h2")).toHaveLength(1);
        expect(el.querySelector("h2")?.id).toBe("view-title");
        expect(el.querySelector("h1, h4, h5")).toBeNull();
      }
    }
  });

  it("always offer a way back to all places", () => {
    for (const l of ["en", "fr"] as const) {
      for (const set of [NOTES(), []]) {
        for (const [name, html] of pages(l, set)) {
          const back = dom(html).querySelector('button[data-action="view"][data-value="places"]');
          expect(back?.textContent, `${name} ${l}`).toBe(COPY.places.back[l]);
        }
      }
    }
  });

  it("give every id once on each page", () => {
    for (const [name, html] of pages("en")) {
      const ids = Array.from(dom(html).querySelectorAll("[id]")).map((e) => e.id);
      expect(new Set(ids).size, name).toBe(ids.length);
    }
  });

  it("wrap text a person typed so the wording checks leave it alone", () => {
    for (const [name, html] of pages("en")) {
      if (name === "ages") continue;
      const el = dom(html);
      const marked = Array.from(el.querySelectorAll("[data-user-content]")).map((e) => e.textContent);
      expect(marked, name).toContain(NASTY);
    }
  });

  it("give the same markup for the same notes, whatever order they are stored in", () => {
    for (const l of ["en", "fr"] as const) {
      const a = pages(l).map(([, html]) => html);
      const b = pages(l, [...NOTES()].reverse()).map(([, html]) => html);
      expect(b).toEqual(a);
    }
  });

  it("show only whole pages of the long lists, and say how many there are", () => {
    const many = Array.from({ length: LATEST_PAGE + 4 }, (_, i) => testNote(`m${i}`, `Place ${i}`, [{ key: "elevator", value: "yes" }], `${i} Side St`));
    const places = groupPlaces(many, "en");
    const latest = dom(renderLatest({ places, only: undefined, shown: LATEST_PAGE, locale: "en", today: TODAY }));
    expect(latest.querySelectorAll("ul.latest li")).toHaveLength(LATEST_PAGE);
    expect(latest.querySelector("[data-latest-shown]")?.textContent).toBe(`${LATEST_PAGE} records shown, out of ${LATEST_PAGE + 4}.`);
    const review = dom(renderReview({ places, only: undefined, shown: REVIEW_PAGE, locale: "en", today: TODAY }));
    expect(review.querySelectorAll("article.review-place")).toHaveLength(REVIEW_PAGE);
    const silly = dom(renderLatest({ places, only: undefined, shown: -3, locale: "en", today: TODAY }));
    expect(silly.querySelectorAll("ul.latest li")).toHaveLength(LATEST_PAGE);
  });
});
