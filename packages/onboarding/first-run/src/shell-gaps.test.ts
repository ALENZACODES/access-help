// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { COPY, NEEDS_KEY, QUESTIONS, decodeTextExportHref, detailGaps, findBanned, gapsToText, groupPlaces, placeId, type Note } from "./index";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));
let h: Harness;

const NOTES = (): Note[] => [
  testNote("l1", "Library", [
    { key: "step-free-entry", value: "yes" },
    { key: "accessible-washroom", value: "no" },
    { key: "automatic-door", value: "yes" },
    { key: "elevator", value: "yes" },
  ]),
  testNote("b1", "Bakery", [{ key: "step-free-entry", value: "no" }], "2 Main St"),
  testNote("a1", "Arena", [], null),
];

const ARENA_ID = placeId({ placeName: "Arena", address: undefined });
const places = () => groupPlaces(NOTES(), "en");

function open(): void {
  h.click(act("view", "notes"));
  h.click(act("view", "places"));
  h.click(act("view", "gaps"));
}

const section = (key: string): Element | null => h.root.querySelector(`section.gap-detail[data-key="${key}"]`);
const listed = (key: string): string[] => Array.from(section(key)?.querySelectorAll("li [data-user-content]:first-child") ?? []).map((x) => x.textContent ?? "");

beforeEach(() => {
  h = createHarness(TODAY);
});

afterEach(() => {
  h.destroy();
});

describe("the details with no record page", () => {
  it("is offered on the places screen and has its own address", () => {
    h.seed(NOTES());
    h.mount();
    open();
    expect(h.shell?.getView()).toEqual({ kind: "gaps" });
    expect(h.root.querySelector("#view-title")?.textContent).toBe("Details with no record");
  });

  it("lists, for each detail, the places with no record, by name", () => {
    h.seed(NOTES());
    h.mount();
    open();
    expect(Array.from(h.root.querySelectorAll("section.gap-detail")).map((s) => s.getAttribute("data-key"))).toEqual([
      "step-free-entry",
      "accessible-washroom",
      "automatic-door",
      "elevator",
    ]);
    expect(listed("step-free-entry")).toEqual(["Arena"]);
    expect(listed("elevator")).toEqual(["Arena", "Bakery"]);
    expect(section("elevator")?.querySelector("[data-gap-count]")?.textContent).toBe("(2 places)");
  });

  it("never lists a place whose detail is recorded as No", () => {
    h.seed(NOTES());
    h.mount();
    open();
    expect(listed("step-free-entry")).not.toContain("Bakery");
    expect(listed("accessible-washroom")).not.toContain("Library");
  });

  it("shows the question to ask for each detail with places", () => {
    h.seed(NOTES());
    h.mount();
    open();
    expect(section("elevator")?.querySelector("p")?.textContent).toBe(`Ask the place: ${QUESTIONS.elevator.en}`);
  });

  it("shows the totals, and they match the lists", () => {
    h.seed(NOTES());
    h.mount();
    open();
    expect(h.root.querySelector("[data-gaps-places]")?.textContent).toBe("2");
    expect(h.root.querySelector("[data-gaps-of]")?.textContent).toBe("3");
    const pairs = Array.from(h.root.querySelectorAll("section.gap-detail li")).length;
    expect(pairs).toBe(detailGaps(places()).reduce((n, g) => n + g.places.length, 0));
  });

  it("says Unknown is not No, in both languages", () => {
    h.seed(NOTES());
    for (const locale of ["en", "fr"] as const) {
      h.mount(locale);
      open();
      expect(h.root.querySelector('main [role="note"]')?.textContent).toBe(COPY.gaps.notNo[locale]);
    }
  });

  it("uses the UNKNOWN token in French and never the French word for it", () => {
    h.seed(NOTES());
    h.mount("fr");
    open();
    const main = h.root.querySelector("main")?.textContent ?? "";
    expect(h.root.querySelector("#view-title")?.textContent).toBe("Détails UNKNOWN (sans donnée)");
    expect(main).toContain("Lieux avec au moins un détail UNKNOWN\u00A0: 2 / 3");
    expect(main).not.toMatch(/\binconnu/i);
    expect(section("elevator")?.querySelector("[data-gap-count]")?.textContent).toBe("(2 lieux)");
  });

  it("says when a detail is recorded for every place", () => {
    h.seed(NOTES().slice(0, 1));
    h.mount();
    open();
    expect(h.root.querySelector("[data-gaps-none]")?.textContent).toBe(COPY.gaps.none.en);
    for (const s of Array.from(h.root.querySelectorAll("section.gap-detail"))) {
      expect(s.querySelector("[data-gap-none]")?.textContent).toBe(COPY.gaps.allRecorded.en);
      expect(s.querySelector("ul")).toBeNull();
    }
  });

  it("says there are no places yet, with no download", () => {
    h.mount();
    open();
    expect(h.root.querySelector("[data-gaps-empty]")?.textContent).toBe(COPY.gaps.noPlaces.en);
    expect(h.root.querySelector("main a[download]:not([data-call-list])")).toBeNull();
  });

  it("opens a place, and ties each button to the place name", () => {
    h.seed(NOTES());
    h.mount();
    open();
    for (const b of Array.from(h.root.querySelectorAll("section.gap-detail li button"))) {
      const id = b.getAttribute("aria-describedby") ?? "";
      expect(h.root.querySelector(`#${id}`)?.closest("li")).toBe(b.closest("li"));
    }
    h.click(`section.gap-detail[data-key="step-free-entry"] ${act("open-place", ARENA_ID)}`);
    expect(h.shell?.getView()).toEqual({ kind: "place", id: ARENA_ID });
  });

  it("offers the list as text", () => {
    h.seed(NOTES());
    h.mount();
    open();
    const link = h.root.querySelector<HTMLAnchorElement>("main a[download]:not([data-call-list])");
    expect(link?.getAttribute("download")).toBe("details-with-no-record-2026-11-19-en.txt");
    expect(decodeTextExportHref(link?.getAttribute("href") ?? "")).toBe(gapsToText(detailGaps(places()), 3, "en", TODAY));
  });

  it("goes back to the places screen", () => {
    h.seed(NOTES());
    h.mount();
    open();
    h.click(`main ${act("view", "places")}`);
    expect(h.shell?.getView()).toEqual({ kind: "places" });
  });
});

describe("accessibility and wording", () => {
  it.each(["en", "fr"] as const)("passes axe and the App's own audit (%s)", async (locale) => {
    h.seed(NOTES());
    h.mount(locale);
    open();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    expect(h.auditLines(), locale).toEqual([]);
  });

  it("passes the audit with no notes, and with every detail recorded, in both languages", () => {
    for (const notes of [[], NOTES().slice(0, 1)]) {
      h.seed(notes);
      for (const locale of ["en", "fr"]) {
        h.mount(locale);
        open();
        expect(h.auditLines(), `${notes.length} ${locale}`).toEqual([]);
      }
    }
  });

  it("makes every control at least 44 pixels and gives every id once", () => {
    h.seed(NOTES());
    h.mount();
    open();
    for (const el of Array.from(h.root.querySelectorAll<HTMLElement>("main button, main a.linkbtn"))) expect(el.style.minHeight, el.textContent ?? "").toBe("44px");
    const ids = Array.from(h.root.querySelectorAll("[id]")).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses no banned wording and never ranks or scores", () => {
    h.seed(NOTES());
    for (const locale of ["en", "fr"]) {
      h.mount(locale);
      open();
      const main = h.root.querySelector("main")?.textContent ?? "";
      expect(findBanned(main), locale).toBeUndefined();
      expect(main, locale).not.toMatch(/\b(best|worst|score|rank|meilleur|pire|classement|reliable|fiable)\b/i);
    }
  });
});

describe("only my must-haves", () => {
  const saveNeeds = (needs: Record<string, "yes" | "no">): void => h.store.setItem(NEEDS_KEY, JSON.stringify(needs));
  const keys = (): string[] => Array.from(h.root.querySelectorAll("section.gap-detail")).map((x) => x.getAttribute("data-key") ?? "");
  const pressed = (): string[] => Array.from(h.root.querySelectorAll(".gaps-filter button")).map((b) => `${b.getAttribute("data-value")}=${b.getAttribute("aria-pressed")}`);

  it("is not offered when no must-have is saved", () => {
    h.seed(NOTES());
    h.mount();
    open();
    expect(h.root.querySelector(".gaps-filter")).toBeNull();
    expect(keys()).toHaveLength(4);
  });

  it("shows only the must-have details, with totals for them, and can go back to every detail", async () => {
    h.seed(NOTES());
    saveNeeds({ elevator: "yes", "step-free-entry": "yes" });
    h.mount();
    open();
    expect(pressed()).toEqual(["all=true", "needs=false"]);
    h.click(act("gaps-only", "needs"));
    expect(pressed()).toEqual(["all=false", "needs=true"]);
    expect(keys()).toEqual(["step-free-entry", "elevator"]);
    expect(h.root.querySelector("[data-gaps-showing-needs]")?.textContent).toBe(COPY.gaps.showingNeeds.en);
    expect(h.root.querySelector("[data-gaps-places]")?.textContent).toBe("2");
    expect(document.activeElement?.getAttribute("data-value")).toBe("needs");
    await Promise.resolve();
    expect(h.status()).toBe("Only my must-haves. Places with at least one detail Unknown: 2");
    h.click(act("gaps-only", "all"));
    expect(keys()).toHaveLength(4);
    expect(h.root.querySelector("[data-gaps-showing-needs]")).toBeNull();
  });

  it("downloads only what is shown", () => {
    h.seed(NOTES());
    saveNeeds({ elevator: "no" });
    h.mount();
    open();
    h.click(act("gaps-only", "needs"));
    const link = h.root.querySelector<HTMLAnchorElement>("main a[download]:not([data-call-list])");
    expect(decodeTextExportHref(link?.getAttribute("href") ?? "")).toBe(gapsToText(detailGaps(places(), ["elevator"]), 3, "en", TODAY, true));
  });

  it("goes back to every detail after leaving the page", () => {
    h.seed(NOTES());
    saveNeeds({ elevator: "yes" });
    h.mount();
    open();
    h.click(act("gaps-only", "needs"));
    h.click(`main ${act("view", "places")}`);
    h.click(act("view", "gaps"));
    expect(pressed()).toEqual(["all=true", "needs=false"]);
    expect(keys()).toHaveLength(4);
  });

  it.each(["en", "fr"] as const)("passes axe and the App's own audit with the filter on (%s)", async (locale) => {
    h.seed(NOTES());
    saveNeeds({ elevator: "yes" });
    h.mount(locale);
    open();
    h.click(act("gaps-only", "needs"));
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    expect(h.auditLines(), locale).toEqual([]);
    for (const b of Array.from(h.root.querySelectorAll<HTMLElement>(".gaps-filter button"))) expect(b.style.minHeight).toBe("44px");
  });
});
