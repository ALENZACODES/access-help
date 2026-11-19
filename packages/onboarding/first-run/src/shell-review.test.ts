// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  COPY,
  FACT_KEYS,
  REVIEW_PAGE,
  buildReview,
  decodeTextExportHref,
  findBanned,
  groupPlaces,
  placeId,
  reviewCounts,
  reviewToText,
  totalItems,
  type Note,
} from "./index";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote, type TestRecord } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 15));
let h: Harness;

const ALL = (value: "yes" | "no"): TestRecord[] => FACT_KEYS.map((key) => ({ key, value }));

const NOTES = (): Note[] => [
  testNote("a1", "Archive", ALL("yes")),
  testNote("b1", "Bakery", [{ key: "elevator", value: "no", on: "2025-01-01" }], "2 Main St"),
  testNote("c1", "Cinema", [{ key: "elevator", value: "yes", on: "2026-05-05" }, { key: "automatic-door", value: "yes" }], "3 Main St"),
  testNote("c2", "Cinema", [{ key: "elevator", value: "no", on: "2026-08-08" }], "3 Main St"),
  testNote("d1", "Dojo", [], "4 Main St"),
];

/** Many places with nothing recorded, named so their order is easy to read. */
const MANY = (n: number): Note[] =>
  Array.from({ length: n }, (_, i) => testNote(`m${i}`, `Place ${String(i + 1).padStart(2, "0")}`, [], `${i + 1} Side St`));

const CINEMA_ID = placeId({ placeName: "Cinema", address: "3 Main St" });

function openReview(): void {
  h.click(act("view", "notes"));
  h.click(act("view", "places"));
  h.click(act("view", "review"));
}

const placeNames = (): string[] => Array.from(h.root.querySelectorAll("article.review-place h3")).map((x) => x.textContent ?? "");
const itemsOf = (name: string): string[] => {
  const card = Array.from(h.root.querySelectorAll("article.review-place")).find((a) => a.querySelector("h3")?.textContent === name);
  if (!card) throw new Error(`no card for ${name}`);
  return Array.from(card.querySelectorAll("li")).map((li) => `${li.getAttribute("data-key")}:${li.getAttribute("data-reason")}`);
};
const pressed = (): string[] =>
  Array.from(h.root.querySelectorAll('[data-action="review-filter"][aria-pressed="true"]')).map((b) => b.getAttribute("data-value") ?? "");
const flush = (): Promise<void> => Promise.resolve();

beforeEach(() => {
  h = createHarness(TODAY);
});

afterEach(() => {
  h.destroy();
});

describe("opening the list", () => {
  it("is offered on the places screen in both languages", () => {
    h.seed(NOTES());
    for (const [locale, label] of [["en", "Details to ask about again"], ["fr", "Détails à redemander"]] as const) {
      h.mount(locale);
      h.click(act("view", "notes"));
      h.click(act("view", "places"));
      expect(h.root.querySelector(act("view", "review"))?.textContent).toBe(label);
      h.click(act("view", "review"));
      expect(h.heading()).toBe(label);
    }
  });

  it("moves focus to the heading and keeps Notes current in the navigation", () => {
    h.seed(NOTES());
    h.mount();
    openReview();
    expect(document.activeElement).toBe(h.root.querySelector("h2"));
    expect(h.root.querySelector('nav [aria-current="page"]')?.textContent).toBe("Notes");
    expect(h.shell?.getView()).toEqual({ kind: "review" });
  });

  it("has its own address and opens from it", () => {
    h.seed(NOTES());
    h.mount("en", true);
    openReview();
    expect(window.location.hash).toBe("#/places/ask-again");
    h.click(act("view", "places"));
    window.location.hash = "#/places/ask-again";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(h.heading()).toBe("Details to ask about again");
  });

  it("says there are no places when there are no notes, and offers no filter or download", () => {
    h.mount();
    openReview();
    expect(h.text()).toContain(COPY.review.noPlaces.en);
    expect(h.root.querySelector('[data-action="review-filter"]')).toBeNull();
    expect(h.root.querySelector("a[download]")).toBeNull();
    expect(h.root.querySelector(act("view", "places"))).not.toBeNull();
  });

  it("says it is only a list of questions", () => {
    h.seed(NOTES());
    h.mount();
    openReview();
    expect(h.root.querySelector('main [role="note"]')?.textContent).toBe(COPY.review.notWrong.en);
  });
});

describe("what is listed", () => {
  it("lists places with something to ask, differing reports first, and leaves out settled places", () => {
    h.seed(NOTES());
    h.mount();
    openReview();
    expect(placeNames()).toEqual(["Cinema", "Bakery", "Dojo"]);
    expect(h.text()).not.toContain("Archive");
  });

  it("shows each detail with its reason, in the usual detail order", () => {
    h.seed(NOTES());
    h.mount();
    openReview();
    expect(itemsOf("Cinema")).toEqual(["step-free-entry:unknown", "accessible-washroom:unknown", "elevator:differ"]);
    expect(itemsOf("Bakery")).toEqual(["step-free-entry:unknown", "accessible-washroom:unknown", "automatic-door:unknown", "elevator:old"]);
    expect(itemsOf("Dojo")).toEqual(FACT_KEYS.map((k) => `${k}:unknown`));
  });

  it("writes why each detail is listed and what to ask", () => {
    h.seed(NOTES());
    h.mount();
    openReview();
    const cinema = h.root.querySelector(`article[data-place="${CINEMA_ID}"]`)?.textContent ?? "";
    expect(cinema).toContain("Elevator: Reports differ. 2 reports do not say the same thing. The newest is from 2026-08-08.");
    expect(cinema).toContain("Ask: Is there an elevator, and is it working today?");
    expect(cinema).toContain("Step-free entrance: No record. Nothing is recorded, so it stays Unknown.");
    expect(h.text()).toContain("Elevator: Record a year old or more. The newest record is from 2025-01-01, 22 months ago.");
    expect(h.text()).toContain("Ask: Is this still the case: Elevator?");
  });

  it("says the same in French", () => {
    h.seed(NOTES());
    h.mount("fr");
    openReview();
    expect(h.text()).toContain("Ascenseur\u00A0: Rapports divergents. 2 rapports ne disent pas la même chose. Le plus récent date du 2026-08-08.");
    expect(h.text()).toContain("À demander\u00A0: Est-ce toujours le cas\u00A0: Ascenseur\u202F?");
    expect(h.text()).toContain(COPY.review.notWrong.fr);
  });

  it("carries the number of items on the page, and it matches the list", () => {
    h.seed(NOTES());
    h.mount();
    openReview();
    const list = buildReview(groupPlaces(NOTES(), "en"), TODAY);
    expect(h.root.querySelector("section[data-review-items]")?.getAttribute("data-review-items")).toBe(String(totalItems(list)));
    expect(h.root.querySelectorAll("article.review-place li")).toHaveLength(totalItems(list));
  });

  it("changes no note", () => {
    h.seed(NOTES());
    h.mount();
    const before = JSON.stringify(h.shell?.getNotes());
    openReview();
    h.click(act("review-filter", "old"));
    h.click(act("review-filter", ""));
    expect(JSON.stringify(h.shell?.getNotes())).toBe(before);
  });
});

describe("filtering by reason", () => {
  it("shows a count on each choice that matches the list", () => {
    h.seed(NOTES());
    h.mount();
    openReview();
    const counts = reviewCounts(groupPlaces(NOTES(), "en"), TODAY);
    const labels = Array.from(h.root.querySelectorAll('[data-action="review-filter"]')).map((b) => b.textContent);
    expect(labels).toEqual([
      `Everything (${counts.differ + counts.old + counts.unknown})`,
      `Reports differ (${counts.differ})`,
      `Record a year old or more (${counts.old})`,
      `No record (${counts.unknown})`,
    ]);
  });

  it("starts on everything, and marks the chosen filter as pressed", () => {
    h.seed(NOTES());
    h.mount();
    openReview();
    expect(pressed()).toEqual([""]);
    h.click(act("review-filter", "differ"));
    expect(pressed()).toEqual(["differ"]);
    h.click(act("review-filter", ""));
    expect(pressed()).toEqual([""]);
  });

  it("shows only the places and details with that reason", () => {
    h.seed(NOTES());
    h.mount();
    openReview();
    h.click(act("review-filter", "differ"));
    expect(placeNames()).toEqual(["Cinema"]);
    expect(itemsOf("Cinema")).toEqual(["elevator:differ"]);
    h.click(act("review-filter", "old"));
    expect(placeNames()).toEqual(["Bakery"]);
    expect(itemsOf("Bakery")).toEqual(["elevator:old"]);
    h.click(act("review-filter", "unknown"));
    expect(placeNames()).toEqual(["Bakery", "Cinema", "Dojo"]);
  });

  it("keeps focus on the filter that was chosen and announces the result", async () => {
    h.seed(NOTES());
    h.mount();
    openReview();
    h.click(act("review-filter", "old"));
    expect(document.activeElement).toBe(h.root.querySelector(act("review-filter", "old")));
    await flush();
    expect(h.status()).toBe("Record a year old or more. 1 place shown, out of 1.");
    h.click(act("review-filter", ""));
    await flush();
    expect(h.status()).toBe("Everything. 3 places shown, out of 3.");
  });

  it("says nothing is left when a filter matches nothing", () => {
    h.seed([testNote("d1", "Dojo", [], "4 Main St")]);
    h.mount();
    openReview();
    h.click(act("review-filter", "differ"));
    expect(h.root.querySelector("[data-review-none]")?.textContent).toBe("Nothing to ask about.");
    expect(h.root.querySelector("article.review-place")).toBeNull();
    expect(h.root.querySelector(act("review-filter", ""))).not.toBeNull();
  });

  it("ignores a filter value it does not know and shows everything", () => {
    h.seed(NOTES());
    h.mount();
    openReview();
    const b = h.root.querySelector<HTMLElement>(act("review-filter", "old"));
    b?.setAttribute("data-value", "nonsense");
    b?.click();
    expect(pressed()).toEqual([""]);
    expect(placeNames()).toEqual(["Cinema", "Bakery", "Dojo"]);
  });

  it("forgets the filter after leaving the page", () => {
    h.seed(NOTES());
    h.mount();
    openReview();
    h.click(act("review-filter", "old"));
    h.click(act("view", "places"));
    h.click(act("view", "review"));
    expect(pressed()).toEqual([""]);
  });
});

describe("long lists", () => {
  it("shows one page of places first and says how many there are", () => {
    h.seed(MANY(REVIEW_PAGE * 2 + 3));
    h.mount();
    openReview();
    expect(placeNames()).toHaveLength(REVIEW_PAGE);
    expect(placeNames()[0]).toBe("Place 01");
    expect(h.root.querySelector("[data-review-shown]")?.textContent).toBe(`${REVIEW_PAGE} places shown, out of ${REVIEW_PAGE * 2 + 3}.`);
    expect(h.root.querySelector(act("review-more"))?.textContent).toBe("Show more places");
  });

  it("adds a page at a time, moves focus to the first new place and announces the count", async () => {
    h.seed(MANY(REVIEW_PAGE * 2 + 3));
    h.mount();
    openReview();
    h.click(act("review-more"));
    expect(placeNames()).toHaveLength(REVIEW_PAGE * 2);
    expect(document.activeElement?.textContent).toBe(`Place ${REVIEW_PAGE + 1}`);
    expect(document.activeElement?.getAttribute("tabindex")).toBe("-1");
    await flush();
    expect(h.status()).toBe(`${REVIEW_PAGE * 2} places shown, out of ${REVIEW_PAGE * 2 + 3}.`);
    h.click(act("review-more"));
    expect(placeNames()).toHaveLength(REVIEW_PAGE * 2 + 3);
    expect(h.root.querySelector(act("review-more"))).toBeNull();
  });

  it("has no button for more when everything fits", () => {
    h.seed(MANY(REVIEW_PAGE));
    h.mount();
    openReview();
    expect(placeNames()).toHaveLength(REVIEW_PAGE);
    expect(h.root.querySelector(act("review-more"))).toBeNull();
  });

  it("goes back to one page when the filter changes or the page is left", () => {
    h.seed(MANY(REVIEW_PAGE + 5));
    h.mount();
    openReview();
    h.click(act("review-more"));
    expect(placeNames()).toHaveLength(REVIEW_PAGE + 5);
    h.click(act("review-filter", "unknown"));
    expect(placeNames()).toHaveLength(REVIEW_PAGE);
    h.click(act("review-more"));
    h.click(act("view", "places"));
    h.click(act("view", "review"));
    expect(placeNames()).toHaveLength(REVIEW_PAGE);
  });

  it("puts every place in the download, not only the ones on screen", () => {
    h.seed(MANY(REVIEW_PAGE + 5));
    h.mount();
    openReview();
    const text = decodeTextExportHref(h.root.querySelector("a[download]")?.getAttribute("href") ?? "") ?? "";
    expect(text).toContain(`Place ${REVIEW_PAGE + 5}`);
    expect(text.split("\n").filter((x) => x.startsWith("- "))).toHaveLength((REVIEW_PAGE + 5) * FACT_KEYS.length);
  });
});

describe("going on from the list", () => {
  it("opens the visit plan of the place", () => {
    h.seed(NOTES());
    h.mount();
    openReview();
    h.click(act("open-plan", CINEMA_ID));
    expect(h.shell?.getView()).toEqual({ kind: "plan", id: CINEMA_ID });
  });

  it("opens the record history of the place", () => {
    h.seed(NOTES());
    h.mount();
    openReview();
    h.click(act("open-history", CINEMA_ID));
    expect(h.shell?.getView()).toEqual({ kind: "history", id: CINEMA_ID });
    expect(h.heading()).toBe("Record history: Cinema");
  });

  it("ties each pair of buttons to its place, so two buttons with the same words can be told apart", () => {
    h.seed(NOTES());
    h.mount();
    openReview();
    for (const card of Array.from(h.root.querySelectorAll("article.review-place"))) {
      const title = card.querySelector("h3");
      for (const b of Array.from(card.querySelectorAll("button"))) expect(b.getAttribute("aria-describedby")).toBe(title?.id);
    }
    const ids = Array.from(h.root.querySelectorAll("[id]")).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("the list as a text file", () => {
  it("holds exactly the text built from the same list", () => {
    h.seed(NOTES());
    h.mount();
    openReview();
    const link = h.root.querySelector<HTMLAnchorElement>("a[download]");
    expect(link?.textContent).toBe("Download this list as text");
    expect(link?.getAttribute("download")).toBe("ask-again-2026-11-15-en.txt");
    const list = buildReview(groupPlaces(NOTES(), "en"), TODAY);
    expect(decodeTextExportHref(link?.getAttribute("href") ?? "")).toBe(reviewToText(list, "en", TODAY));
  });

  it("follows the filter, in the file and in its name", () => {
    h.seed(NOTES());
    h.mount("fr");
    openReview();
    h.click(act("review-filter", "old"));
    const link = h.root.querySelector<HTMLAnchorElement>("a[download]");
    expect(link?.getAttribute("download")).toBe("a-redemander-old-2026-11-15-fr.txt");
    const text = decodeTextExportHref(link?.getAttribute("href") ?? "") ?? "";
    expect(text).toContain("Affichage limité à\u00A0: Donnée d’un an ou plus");
    expect(text).toContain("Bakery");
    expect(text).not.toContain("Cinema");
  });
});

describe("accessibility and wording", () => {
  it.each(["en", "fr"] as const)("passes axe and the App's own audit (%s)", async (locale) => {
    h.seed([...NOTES(), ...MANY(REVIEW_PAGE)]);
    h.mount(locale);
    openReview();
    const run = async (label: string): Promise<void> => {
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => `${v.id}: ${v.help}`), `${label} ${locale}`).toEqual([]);
    };
    await run("everything");
    h.click(act("review-more"));
    await run("more");
    h.click(act("review-filter", "differ"));
    await run("differ");
    expect(h.auditLines(), locale).toEqual([]);
  });

  it("passes the audit with no notes in either language", () => {
    for (const locale of ["en", "fr"]) {
      h.mount(locale);
      openReview();
      expect(h.auditLines(), locale).toEqual([]);
    }
  });

  it("groups the filter choices under a visible label", () => {
    h.seed(NOTES());
    h.mount();
    openReview();
    const group = h.root.querySelector('main [role="group"]');
    expect(group?.getAttribute("aria-labelledby")).toBe("review-filter-label");
    expect(h.root.querySelector("#review-filter-label")?.textContent).toBe("Show");
  });

  it("makes every control at least 44 pixels", () => {
    h.seed(NOTES());
    h.mount();
    openReview();
    for (const el of Array.from(h.root.querySelectorAll<HTMLElement>("main button, main a.linkbtn"))) expect(el.style.minHeight, el.textContent ?? "").toBe("44px");
  });

  it("uses no banned wording and never ranks places", () => {
    h.seed(NOTES());
    for (const locale of ["en", "fr"]) {
      h.mount(locale);
      openReview();
      const main = h.root.querySelector("main")?.textContent ?? "";
      expect(findBanned(main), locale).toBeUndefined();
      expect(main).not.toMatch(/\b(best|worst|score|rank|meilleur|pire|classement)\b/i);
    }
  });
});
