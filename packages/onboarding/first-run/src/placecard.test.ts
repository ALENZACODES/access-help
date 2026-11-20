// @vitest-environment jsdom
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { CONTRIBUTOR_SOURCE, FACT_KEYS, QUESTIONS, auditCopy, auditDom, groupPlaces, type Locale, type Place } from "./index";
import { CARD_COPY, cardCss, cardHtml, cardStrings, cardsDocument, cardsFilename, cardsHref, cardsHtml, cardNeedsLines } from "./placecard";
import { describeFact } from "./facts";
import { AXE_OPTIONS } from "./shelltest";
import { makeRng, randomNotes } from "./testkit";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 20));

const PLACES = (l: Locale = "en"): Place[] =>
  groupPlaces(
    [
      testNote("a", "Library", [{ key: "elevator", value: "yes", source: CONTRIBUTOR_SOURCE }, { key: "step-free-entry", value: "yes" }]),
      testNote("b", "Library", [{ key: "step-free-entry", value: "no" }]),
      testNote("c", "<b>Café</b>", [{ key: "automatic-door", value: "no" }], "5 King St"),
    ],
    l,
  );
const lib = (l: Locale = "en"): Place => PLACES(l).find((p) => p.name === "Library") as Place;

function mount(html: string, l: Locale): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<div id="r"><a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main" lang="${l}"><h1>The App</h1><section aria-labelledby="t"><h2 id="t">Cards</h2>${html}</section></main></div>`;
  return document.getElementById("r") as HTMLElement;
}

describe("one card", () => {
  it("shows every detail with where it came from, and UNKNOWN with nothing", () => {
    const root = mount(cardHtml(lib(), 0, { needs: {}, locale: "en", today: TODAY }), "en");
    const dds = Array.from(root.querySelectorAll("dl.facts dd")).map((d) => d.textContent ?? "");
    expect(dds).toHaveLength(FACT_KEYS.length);
    expect(dds[3]).toContain("Source: Contributor report");
    // The data says UNKNOWN; the card shows whatever the App's own words for it are, with no source.
    expect(lib().resolutions["accessible-washroom"].kind).toBe("unknown");
    const unknown = describeFact({ key: "accessible-washroom", value: "unknown", provenance: undefined }, "en", TODAY);
    expect(dds[1]).toBe(`${unknown.value}. ${unknown.detail}`);
    expect(dds[1]).not.toContain("Source");
    expect(dds[0]).toContain("Reports differ");
  });

  it("lists the questions still open there, and says when there are none", () => {
    const root = mount(cardHtml(lib(), 0, { needs: {}, locale: "en", today: TODAY }), "en");
    expect(Array.from(root.querySelectorAll(".card-questions li")).map((li) => li.textContent)).toEqual([
      QUESTIONS["step-free-entry"].en,
      QUESTIONS["accessible-washroom"].en,
      QUESTIONS["automatic-door"].en,
    ]);
    const settled = groupPlaces([testNote("s", "Done", FACT_KEYS.map((key) => ({ key, value: "yes" as const })))], "en")[0] as Place;
    expect(mount(cardHtml(settled, 0, { needs: {}, locale: "en", today: TODAY }), "en").textContent).toContain(CARD_COPY.noQuestions.en);
  });

  it("says how the place stands against the must-haves, only when there are some", () => {
    expect(cardNeedsLines(lib(), {}, "en")).toEqual([]);
    expect(cardNeedsLines(lib(), { elevator: "yes" }, "en")).toEqual([CARD_COPY.needsMet.en]);
    expect(cardNeedsLines(lib(), { "automatic-door": "yes", "step-free-entry": "yes" }, "fr").join(" ")).toContain("UNKNOWN");
    const root = mount(cardHtml(lib(), 0, { needs: { elevator: "yes" }, locale: "en", today: TODAY }), "en");
    expect(root.querySelector(".card-needs li")?.textContent).toBe(CARD_COPY.needsMet.en);
  });

  it("dates the card, and shows the place's own words as text", () => {
    const cafe = PLACES().find((p) => p.address === "5 King St") as Place;
    const root = mount(cardHtml(cafe, 2, { needs: {}, locale: "fr", today: TODAY }), "fr");
    expect(root.querySelector("b")).toBeNull();
    expect(root.querySelector("#card-2")?.textContent).toBe("<b>Café</b>");
    expect(root.querySelector(".card-made")?.textContent).toBe(`Fiche créée le 2026-11-20. ${CARD_COPY.fromNotes.fr}`);
  });

  it.each(["en", "fr"] as const)("passes axe and the App's audit (%s)", async (l) => {
    const root = mount(cardsHtml(PLACES(l), { needs: { elevator: "yes" }, locale: l, today: TODAY }), l);
    expect(auditDom(root, { locale: l }).map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

describe("the page to download", () => {
  const parse = (html: string): Document => new DOMParser().parseFromString(html, "text/html");

  it("is a whole page with its language, title and print styles, and nothing that runs", () => {
    const html = cardsDocument([lib("fr")], { needs: {}, locale: "fr", today: TODAY }, true);
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    const d = parse(html);
    expect(d.documentElement.lang).toBe("fr");
    expect(d.title).toBe(`${CARD_COPY.title.fr} – Library`);
    expect(d.querySelector("style")?.textContent).toContain("@media print");
    expect(d.querySelector("style")?.textContent).toContain("font-size:150%");
    expect(d.querySelectorAll("script")).toHaveLength(0);
    expect(html).not.toMatch(/\son[a-z]+=/i);
    expect(d.querySelectorAll("article.place-card")).toHaveLength(1);
    // Under the page's h1, each card's name is an h2 and its parts h3.
    expect(d.querySelector("article.place-card h2")?.textContent).toBe("Library");
    expect(d.querySelectorAll("article.place-card h3").length).toBeGreaterThan(0);
  });

  it.each(["en", "fr"] as const)("passes axe on its own (%s)", async (l) => {
    const d = parse(cardsDocument(PLACES(l), { needs: {}, locale: l, today: TODAY }, false));
    document.documentElement.lang = d.documentElement.lang;
    document.title = d.title;
    document.body.innerHTML = d.body.innerHTML;
    const r = await axe.run(document.body, { ...AXE_OPTIONS, rules: { ...(AXE_OPTIONS.rules ?? {}), region: { enabled: false } } });
    expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  it("says when there is nothing to print, and has a name and a data address", () => {
    expect(parse(cardsDocument([], { needs: {}, locale: "en", today: TODAY }, false)).body.textContent).toContain(CARD_COPY.none.en);
    expect(cardsFilename([lib()], TODAY)).toBe(`cards-${lib().id}-2026-11-20.html`);
    expect(cardsFilename(PLACES(), TODAY)).toBe("cards-shortlist-2026-11-20.html");
    expect(decodeURIComponent(cardsHref("<p>a&b</p>").slice("data:text/html;charset=utf-8,".length))).toBe("<p>a&b</p>");
    expect(cardCss(false)).not.toContain("150%");
  });

  it("passes the App's copy audit", () => {
    expect(auditCopy(cardStrings())).toEqual([]);
  });
});

describe("random places", () => {
  it("always show a source on a Yes or No and none on UNKNOWN, with one question per open detail", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const places = groupPlaces(randomNotes(makeRng(seed), 8), "en");
      const root = mount(cardsHtml(places, { needs: {}, locale: "en", today: TODAY }), "en");
      const cards = Array.from(root.querySelectorAll("article.place-card"));
      expect(cards).toHaveLength(places.length);
      cards.forEach((card, i) => {
        const p = places[i] as Place;
        const open = FACT_KEYS.filter((k) => p.resolutions[k].kind !== "agree").length;
        expect(card.querySelectorAll(".card-questions li").length, `seed ${seed}`).toBe(open);
        Array.from(card.querySelectorAll("dl.facts dd")).forEach((dd, k) => {
          const kind = p.resolutions[FACT_KEYS[k] as (typeof FACT_KEYS)[number]].kind;
          if (kind === "unknown") expect(dd.textContent, `seed ${seed}`).not.toContain("Source");
          else expect(dd.textContent, `seed ${seed}`).toContain("Source");
        });
      });
      expect(auditDom(root, { locale: "en" }).map((v) => v.rule), `seed ${seed}`).toEqual([]);
    }
  });
});
