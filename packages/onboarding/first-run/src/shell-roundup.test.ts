// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ARTICLES,
  CHECKLIST_KEY,
  COPY,
  NEEDS_KEY,
  QUESTIONS,
  SHORTLIST_KEY,
  buildRoundup,
  decodeTextExportHref,
  findBanned,
  groupPlaces,
  loadChecklist,
  placeId,
  roundupToText,
  type Note,
} from "./index";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));
let h: Harness;

const NOTES = (): Note[] => [
  testNote("l1", "Library", [{ key: "step-free-entry", value: "yes", on: "2026-09-09" }]),
  testNote("c1", "Cafe", [
    { key: "step-free-entry", value: "yes", on: "2026-10-10" },
    { key: "elevator", value: "yes", on: "2026-10-10" },
  ], "3 Main St"),
  testNote("b1", "Bakery", [], "2 Main St"),
];

const LIBRARY = placeId({ placeName: "Library", address: "1 Main St" });
const CAFE = placeId({ placeName: "Cafe", address: "3 Main St" });

function save(shortlist: readonly string[], needs: Record<string, "yes" | "no"> = { "step-free-entry": "yes", elevator: "yes" }): void {
  h.store.setItem(SHORTLIST_KEY, JSON.stringify(shortlist));
  h.store.setItem(NEEDS_KEY, JSON.stringify(needs));
}

function open(): void {
  h.click(act("view", "notes"));
  h.click(act("view", "places"));
  h.click(act("view", "roundup"));
}

const cards = (): HTMLElement[] => Array.from(h.root.querySelectorAll<HTMLElement>("article.roundup-place"));

beforeEach(() => {
  h = createHarness(TODAY);
});

afterEach(() => {
  h.destroy();
});

describe("the shortlist round-up page", () => {
  it("is offered on the places screen and has its own address", () => {
    h.seed(NOTES());
    save([CAFE, LIBRARY]);
    h.mount();
    open();
    expect(h.shell?.getView()).toEqual({ kind: "roundup" });
    expect(h.heading()).toBe("Shortlist round-up");
  });

  it("lists shortlisted places in the order they were added, and only those", () => {
    h.seed(NOTES());
    save([CAFE, LIBRARY]);
    h.mount();
    open();
    expect(cards().map((c) => c.getAttribute("data-place"))).toEqual([CAFE, LIBRARY]);
    expect(cards().map((c) => c.querySelector("h3")?.textContent)).toEqual(["1. Cafe", "2. Library"]);
  });

  it("shows each must-have with its status, and a source only for recorded answers", () => {
    h.seed(NOTES());
    save([LIBRARY]);
    h.mount();
    open();
    const dds = Array.from(cards()[0]?.querySelectorAll("dl.plan dd") ?? []);
    expect(dds.map((d) => d.getAttribute("data-status"))).toEqual(["matches", "unknown"]);
    expect(dds[0]?.textContent).toContain("Source: City survey");
    expect(dds[1]?.textContent).toBe("Unknown. No record.");
  });

  it("lists the questions with what was asked and what the place said", () => {
    h.seed(NOTES());
    save([LIBRARY]);
    h.store.setItem(CHECKLIST_KEY, JSON.stringify({ [LIBRARY]: { elevator: { asked: true, answer: "Yes, at the back" } } }));
    h.mount();
    open();
    const li = cards()[0]?.querySelector('ol li[data-key="elevator"]');
    expect(li?.getAttribute("data-asked")).toBe("true");
    expect(li?.textContent).toBe(`${QUESTIONS.elevator.en}I asked thisWhat the place said: Yes, at the back`);
    expect(li?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true);
    expect(cards()[0]?.querySelector("[data-roundup-asked]")?.textContent).toBe("Asked 1 of 1");
    expect(h.root.querySelector("[data-roundup-progress]")?.textContent).toBe("Asked 1 of 1");
    expect(h.root.querySelector("[data-roundup-allasked]")?.textContent).toBe("1");
  });

  it("says when there is nothing to ask for a place", () => {
    h.seed(NOTES());
    save([CAFE]);
    h.mount();
    open();
    expect(cards()[0]?.querySelector("[data-roundup-noquestions]")?.textContent).toBe(COPY.roundup.noQuestions.en);
    expect(cards()[0]?.querySelector("ol")).toBeNull();
  });

  it("asks for a shortlist, then for must-haves, before listing anything", () => {
    h.seed(NOTES());
    h.mount();
    open();
    expect(h.root.querySelector("[data-roundup-empty]")?.textContent).toBe(COPY.roundup.empty.en);
    h.destroy();
    save([LIBRARY], {});
    h.mount();
    open();
    expect(h.root.querySelector("[data-roundup-noneeds]")?.textContent).toBe(COPY.roundup.noNeeds.en);
    expect(cards()).toHaveLength(0);
    expect(h.root.querySelector("main a[download]")).toBeNull();
  });

  it("opens the visit plan of a place, tied to its name", () => {
    h.seed(NOTES());
    save([CAFE, LIBRARY]);
    h.mount();
    open();
    const b = cards()[1]?.querySelector("button");
    expect(b?.getAttribute("aria-describedby")).toBe(cards()[1]?.querySelector("h3")?.id);
    h.click(`article.roundup-place ${act("open-plan", LIBRARY)}`);
    expect(h.shell?.getView()).toEqual({ kind: "plan", id: LIBRARY });
  });

  it("offers the round-up as text, matching the page", () => {
    h.seed(NOTES());
    save([CAFE, LIBRARY]);
    h.mount();
    open();
    const link = h.root.querySelector<HTMLAnchorElement>("main a[download]");
    expect(link?.getAttribute("download")).toBe("shortlist-round-up-2026-11-19-en.txt");
    const r = buildRoundup(groupPlaces(NOTES(), "en"), [CAFE, LIBRARY], { "step-free-entry": "yes", elevator: "yes" }, loadChecklist(h.store), "en", TODAY);
    expect(decodeTextExportHref(link?.getAttribute("href") ?? "")).toBe(roundupToText(r, true, "en", TODAY));
  });

  it("does not change the checklist or the shortlist", () => {
    h.seed(NOTES());
    save([CAFE, LIBRARY]);
    const before = [h.store.getItem(SHORTLIST_KEY), h.store.getItem(CHECKLIST_KEY)];
    h.mount();
    open();
    expect([h.store.getItem(SHORTLIST_KEY), h.store.getItem(CHECKLIST_KEY)]).toEqual(before);
  });
});

describe("ticking a question on the round-up", () => {
  const box = (id: string, key: string): HTMLInputElement | null => h.root.querySelector<HTMLInputElement>(`input[data-action="asked"][data-value="${id}"][data-key="${key}"]`);

  it("saves the same tick the visit plan uses, updates the counts and keeps focus", async () => {
    h.seed(NOTES());
    save([LIBRARY]);
    h.mount();
    open();
    expect(h.root.querySelector("[data-roundup-progress]")?.textContent).toBe("Asked 0 of 1");
    const el = box(LIBRARY, "elevator");
    if (!el) throw new Error("no checkbox");
    el.click();
    expect(loadChecklist(h.store)[LIBRARY]?.elevator?.asked).toBe(true);
    expect(h.root.querySelector("[data-roundup-progress]")?.textContent).toBe("Asked 1 of 1");
    expect(box(LIBRARY, "elevator")?.checked).toBe(true);
    expect(document.activeElement).toBe(box(LIBRARY, "elevator"));
    await Promise.resolve();
    expect(h.status()).toBe("Questions for this place: Asked 1 of 1");
    box(LIBRARY, "elevator")?.click();
    expect(loadChecklist(h.store)[LIBRARY]?.elevator).toBeUndefined();
    expect(h.root.querySelector("[data-roundup-progress]")?.textContent).toBe("Asked 0 of 1");
  });

  it("shows the tick on the visit plan too", () => {
    h.seed(NOTES());
    save([LIBRARY]);
    h.mount();
    open();
    box(LIBRARY, "elevator")?.click();
    h.click(`article.roundup-place ${act("open-plan", LIBRARY)}`);
    expect(box(LIBRARY, "elevator")?.checked).toBe(true);
  });

  it("names each checkbox by its label and describes it by its question", () => {
    h.seed(NOTES());
    save([LIBRARY]);
    h.mount("fr");
    open();
    const el = box(LIBRARY, "elevator");
    expect(el?.closest("label")?.textContent).toBe(COPY.checklist.asked.fr);
    expect(h.root.querySelector(`#${el?.getAttribute("aria-describedby") ?? "x"}`)?.textContent).toBe(QUESTIONS.elevator.fr);
  });
});

describe("only places with questions left", () => {
  const pressed = (): string[] => Array.from(h.root.querySelectorAll(".roundup-filter button")).map((b) => `${b.getAttribute("data-value")}=${b.getAttribute("aria-pressed")}`);

  it("hides places with nothing left to ask, and can show every place again", async () => {
    h.seed(NOTES());
    save([CAFE, LIBRARY]);
    h.mount();
    open();
    expect(pressed()).toEqual(["all=true", "left=false"]);
    h.click(act("roundup-left", "left"));
    expect(pressed()).toEqual(["all=false", "left=true"]);
    expect(cards().map((c) => c.getAttribute("data-place"))).toEqual([LIBRARY]);
    expect(h.root.querySelector("[data-roundup-showing-left]")?.textContent).toBe(COPY.roundup.showingLeft.en);
    expect(h.root.querySelector("[data-roundup-allasked]")).toBeNull();
    expect(document.activeElement?.getAttribute("data-value")).toBe("left");
    await Promise.resolve();
    expect(h.status()).toBe("Only places with questions left. Places on the shortlist: 1");
    h.click(act("roundup-left", "all"));
    expect(cards()).toHaveLength(2);
  });

  it("drops a place once its last question is ticked, and says when none are left", () => {
    h.seed(NOTES());
    save([CAFE, LIBRARY]);
    h.mount();
    open();
    h.click(act("roundup-left", "left"));
    h.root.querySelector<HTMLInputElement>(`input[data-action="asked"][data-value="${LIBRARY}"]`)?.click();
    expect(cards()).toHaveLength(0);
    expect(h.root.querySelector("[data-roundup-none-left]")?.textContent).toBe(COPY.roundup.noneLeft.en);
    expect(document.activeElement?.tagName).toBe("H2");
  });

  it("downloads only the places shown, and resets after leaving the page", () => {
    h.seed(NOTES());
    save([CAFE, LIBRARY]);
    h.mount();
    open();
    h.click(act("roundup-left", "left"));
    const text = decodeTextExportHref(h.root.querySelector("main a[download]")?.getAttribute("href") ?? "");
    expect(text).toContain(COPY.roundup.showingLeft.en);
    expect(text).not.toContain("Cafe");
    h.click(`main ${act("view", "places")}`);
    h.click(act("view", "roundup"));
    expect(pressed()).toEqual(["all=true", "left=false"]);
  });
});

describe("the help article", () => {
  it("names the pages with the same words as their buttons", () => {
    const plan = ARTICLES.find((a) => a.id === "plan");
    const headings = (plan?.sections ?? []).map((s) => s.heading);
    for (const l of ["en", "fr"] as const) {
      const names = headings.map((x) => x[l]);
      expect(names, l).toContain(COPY.places.viewRoundup[l]);
      expect(names, l).toContain(COPY.places.viewByDetail[l]);
    }
  });
});

describe("accessibility and wording", () => {
  it.each(["en", "fr"] as const)("passes axe and the App's own audit (%s)", async (locale) => {
    h.seed(NOTES());
    save([CAFE, LIBRARY]);
    h.store.setItem(CHECKLIST_KEY, JSON.stringify({ [LIBRARY]: { elevator: { asked: true, answer: "Oui" } } }));
    h.mount(locale);
    open();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    h.click(act("roundup-left", "left"));
    const r2 = await axe.run(document.body, AXE_OPTIONS);
    expect(r2.violations.map((v) => `${v.id}: ${v.help}`), "filtered").toEqual([]);
    expect(h.auditLines(), locale).toEqual([]);
    const ids = Array.from(h.root.querySelectorAll("[id]")).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const el of Array.from(h.root.querySelectorAll<HTMLElement>("main button, main a.linkbtn"))) expect(el.style.minHeight, el.textContent ?? "").toBe("44px");
  });

  it("passes the audit on the empty and no-must-have pages in both languages", () => {
    for (const locale of ["en", "fr"]) {
      h.mount(locale);
      open();
      expect(h.auditLines(), `empty ${locale}`).toEqual([]);
    }
    h.seed(NOTES());
    save([LIBRARY], {});
    for (const locale of ["en", "fr"]) {
      h.mount(locale);
      open();
      expect(h.auditLines(), `no needs ${locale}`).toEqual([]);
    }
  });

  it("uses no banned wording, never ranks and never says inconnu", () => {
    h.seed(NOTES());
    save([CAFE, LIBRARY]);
    for (const locale of ["en", "fr"] as const) {
      h.mount(locale);
      open();
      const main = (h.root.querySelector("main")?.textContent ?? "").replace(COPY.shortlist.intro[locale], "");
      expect(findBanned(main), locale).toBeUndefined();
      expect(main, locale).not.toMatch(/\b(best|worst|score|ranked|meilleur|pire|classement)\b/i);
      expect(main, locale).not.toMatch(/\binconnu/i);
    }
  });
});
