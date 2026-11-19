// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { COPY, FACT_KEYS, NEEDS_KEY, SHORTLIST_KEY, decodeTextExportHref, findBanned, groupPlaces, loadNeeds, needsToText, placeId, type Note } from "./index";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));
let h: Harness;

const NOTES = (): Note[] => [
  testNote("l1", "Library", [{ key: "step-free-entry", value: "yes" }, { key: "elevator", value: "yes" }]),
  testNote("b1", "Bakery", [{ key: "step-free-entry", value: "no" }], "2 Main St"),
  testNote("c1", "Cafe", [{ key: "step-free-entry", value: "yes" }], "3 Main St"),
];

const LIBRARY = placeId({ placeName: "Library", address: "1 Main St" });

function open(): void {
  h.click(act("view", "notes"));
  h.click(act("view", "places"));
  h.click(act("view", "musthaves"));
}

const radio = (key: string, choice: string): HTMLInputElement | null =>
  h.root.querySelector<HTMLInputElement>(`input[data-action="need-choice"][data-key="${key}"][data-value="${choice}"]`);

function choose(key: string, choice: string): void {
  const el = radio(key, choice);
  if (!el) throw new Error(`no radio ${key} ${choice}`);
  el.checked = true;
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

const total = (g: string): string => h.root.querySelector(`[data-stand-total="${g}"]`)?.textContent ?? "";

beforeEach(() => {
  h = createHarness(TODAY);
});

afterEach(() => {
  h.destroy();
});

describe("the must-haves page", () => {
  it("is offered on the places screen, with one group of three choices per detail", () => {
    h.seed(NOTES());
    h.mount();
    open();
    expect(h.shell?.getView()).toEqual({ kind: "musthaves" });
    expect(h.heading()).toBe("My must-haves");
    const sets = Array.from(h.root.querySelectorAll("main fieldset"));
    expect(sets.map((f) => f.querySelector("legend")?.textContent)).toEqual(FACT_KEYS.map((k) => COPY.facts[k].en));
    for (const f of sets) {
      expect(Array.from(f.querySelectorAll("label")).map((x) => x.textContent)).toEqual(["Must be Yes", "Must be No", "Not a must-have"]);
      expect(f.querySelector<HTMLInputElement>('input[value="none"]')?.checked).toBe(true);
    }
    expect(h.root.querySelector("[data-musthaves-none]")?.textContent).toBe(COPY.mustHaves.none.en);
  });

  it("saves a choice at once, keeps focus on it and says so", async () => {
    h.seed(NOTES());
    h.mount();
    open();
    choose("step-free-entry", "yes");
    expect(loadNeeds(h.store)).toEqual({ "step-free-entry": "yes" });
    expect(radio("step-free-entry", "yes")?.checked).toBe(true);
    expect(document.activeElement).toBe(radio("step-free-entry", "yes"));
    await Promise.resolve();
    expect(h.status()).toBe("Saved. Step-free entrance: Must be Yes");
  });

  it("counts where the places stand, and updates the counts on each change", () => {
    h.seed(NOTES());
    h.mount();
    open();
    choose("step-free-entry", "yes");
    expect([total("allMatch"), total("open"), total("notMet")]).toEqual(["2", "0", "1"]);
    choose("elevator", "yes");
    expect([total("allMatch"), total("open"), total("notMet")]).toEqual(["1", "1", "1"]);
    const names = (g: string): string[] => Array.from(h.root.querySelectorAll(`section.stand-group[data-group="${g}"] li span[id]`)).map((x) => x.textContent ?? "");
    expect(names("allMatch")).toEqual(["Library"]);
    expect(names("open")).toEqual(["Cafe"]);
    expect(names("notMet")).toEqual(["Bakery"]);
    choose("elevator", "none");
    expect(loadNeeds(h.store)).toEqual({ "step-free-entry": "yes" });
  });

  it("shows saved must-haves when the page opens", () => {
    h.seed(NOTES());
    h.store.setItem(NEEDS_KEY, JSON.stringify({ elevator: "no" }));
    h.mount();
    open();
    expect(radio("elevator", "no")?.checked).toBe(true);
    expect(radio("step-free-entry", "none")?.checked).toBe(true);
  });

  it("clears every must-have and says so", () => {
    h.seed(NOTES());
    h.store.setItem(NEEDS_KEY, JSON.stringify({ elevator: "no" }));
    h.mount();
    open();
    h.click(`main ${act("clear-needs")}`);
    expect(loadNeeds(h.store)).toEqual({});
    expect(h.shell?.getView()).toEqual({ kind: "musthaves" });
    expect(h.root.querySelector('main [role="status"]')?.textContent).toBe(COPY.needs.cleared.en);
    expect(h.root.querySelector(`main ${act("clear-needs")}`)).toBeNull();
  });

  it("opens a place's visit plan from a group, tied to its name", () => {
    h.seed(NOTES());
    h.store.setItem(NEEDS_KEY, JSON.stringify({ "step-free-entry": "yes" }));
    h.mount();
    open();
    const b = h.root.querySelector(`section.stand-group ${act("open-plan", LIBRARY)}`);
    expect(h.root.querySelector(`#${b?.getAttribute("aria-describedby") ?? "x"}`)?.textContent).toBe("Library");
    h.click(`section.stand-group ${act("open-plan", LIBRARY)}`);
    expect(h.shell?.getView()).toEqual({ kind: "plan", id: LIBRARY });
  });

  it("links to the round-up and the gaps once a must-have is saved", () => {
    h.seed(NOTES());
    h.mount();
    open();
    expect(h.root.querySelector(`main ${act("view", "roundup")}`)).toBeNull();
    choose("elevator", "yes");
    h.click(`main ${act("view", "roundup")}`);
    expect(h.shell?.getView()).toEqual({ kind: "roundup" });
  });

  it("is reached from the round-up when no must-have is saved", () => {
    h.seed(NOTES());
    h.store.setItem(SHORTLIST_KEY, JSON.stringify([LIBRARY]));
    h.mount();
    h.click(act("view", "notes"));
    h.click(act("view", "places"));
    h.click(act("view", "roundup"));
    h.click(`main ${act("view", "musthaves")}`);
    expect(h.shell?.getView()).toEqual({ kind: "musthaves" });
  });

  it("offers the must-haves as text, matching the page", () => {
    h.seed(NOTES());
    h.store.setItem(NEEDS_KEY, JSON.stringify({ "step-free-entry": "yes" }));
    h.mount();
    open();
    const link = h.root.querySelector<HTMLAnchorElement>("main a[download]");
    expect(link?.getAttribute("download")).toBe("my-must-haves-2026-11-19-en.txt");
    expect(decodeTextExportHref(link?.getAttribute("href") ?? "")).toBe(needsToText(groupPlaces(NOTES(), "en"), { "step-free-entry": "yes" }, "en", TODAY));
  });

  it("works from its address", () => {
    h.seed(NOTES());
    window.location.hash = "#/places/must-haves";
    h.mount("en", true);
    expect(h.shell?.getView()).toEqual({ kind: "musthaves" });
  });
});

describe("accessibility and wording", () => {
  it.each(["en", "fr"] as const)("passes axe and the App's own audit, before and after a choice (%s)", async (locale) => {
    h.seed(NOTES());
    h.mount(locale);
    open();
    let r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => `${v.id}: ${v.help}`), "empty").toEqual([]);
    choose("step-free-entry", "yes");
    choose("elevator", "no");
    r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => `${v.id}: ${v.help}`), "chosen").toEqual([]);
    expect(h.auditLines(), locale).toEqual([]);
    const ids = Array.from(h.root.querySelectorAll("[id]")).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const el of Array.from(h.root.querySelectorAll<HTMLElement>("main button, main a.linkbtn, main label.choice"))) expect(el.style.minHeight, el.textContent ?? "").toBe("44px");
  });

  it("passes the audit with no notes in both languages", () => {
    for (const locale of ["en", "fr"]) {
      h.mount(locale);
      open();
      expect(h.auditLines(), locale).toEqual([]);
    }
  });

  it("asks nothing about the person, never ranks and never says inconnu", () => {
    h.seed(NOTES());
    h.store.setItem(NEEDS_KEY, JSON.stringify({ "step-free-entry": "yes" }));
    for (const locale of ["en", "fr"] as const) {
      h.mount(locale);
      open();
      const main = (h.root.querySelector("main")?.textContent ?? "").replace(COPY.mustHaves.standingIntro[locale], "").replace(COPY.mustHaves.notPeople[locale], "");
      expect(findBanned(main), locale).toBeUndefined();
      expect(main, locale).not.toMatch(/\b(best|worst|score|ranked|meilleur|pire|classement|diagnos|eligib|admissib|injury|blessure)/i);
      expect(main, locale).not.toMatch(/\binconnu/i);
    }
  });
});
