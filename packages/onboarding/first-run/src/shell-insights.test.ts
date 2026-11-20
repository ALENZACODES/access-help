// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CONTRIBUTOR_SOURCE, NEEDS_KEY, QUESTIONS, SHORTLIST_KEY, decodeTextExportHref, findBanned, placeId, type Note } from "./index";
import { CALL_COPY } from "./callscript";
import { COVERAGE_COPY } from "./coverage";
import { BEHIND_COPY } from "./compare-records";
import { SOURCE_COVERAGE_COPY } from "./source-coverage";
import { WHO_COPY } from "./who-recorded";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));
let h: Harness;

const NOTES = (): Note[] => [
  testNote("l1", "Library", [{ key: "step-free-entry", value: "yes" }, { key: "elevator", value: "yes", source: CONTRIBUTOR_SOURCE }]),
  testNote("b1", "Bakery", [{ key: "step-free-entry", value: "no" }], "2 Main St"),
  testNote("d1", "Deli", [{ key: "elevator", value: "yes" }], "4 Main St"),
  testNote("d2", "Deli", [{ key: "elevator", value: "no", on: "2022-02-02" }], "4 Main St"),
  testNote("e1", "Empty Hall", [], null),
];

const LIBRARY = placeId({ placeName: "Library", address: "1 Main St" });
const BAKERY = placeId({ placeName: "Bakery", address: "2 Main St" });
const DELI = placeId({ placeName: "Deli", address: "4 Main St" });

function start(locale = "en", needs: Record<string, string> | undefined = { "step-free-entry": "yes", elevator: "yes" }, shortlist: string[] = [LIBRARY, DELI]): void {
  h.seed(NOTES());
  if (needs) h.store.setItem(NEEDS_KEY, JSON.stringify(needs));
  h.store.setItem(SHORTLIST_KEY, JSON.stringify(shortlist));
  h.mount(locale);
  h.click(act("view", "notes"));
}

const page = (value: string): void => {
  h.click(act("view", "places"));
  h.click(act("view", value));
};

beforeEach(() => {
  h = createHarness(TODAY);
});

afterEach(() => {
  h.destroy();
});

describe("why a place is in its must-haves group", () => {
  it("names what does not match and what to ask about, under each place", () => {
    start();
    page("musthaves");
    const why = (id: string): string[] => Array.from(h.root.querySelectorAll(`section.stand-group li`)).filter((li) => li.querySelector(`[data-value="${id}"]`)).flatMap((li) => Array.from(li.querySelectorAll("[data-why]")).map((x) => x.textContent ?? ""));
    expect(why(BAKERY)).toEqual(["Does not match: Step-free entrance", "To ask about: Elevator (Unknown)"]);
    expect(why(DELI)).toEqual(["To ask about: Step-free entrance (Unknown), Elevator (reports differ)"]);
    expect(why(LIBRARY)).toEqual([]);
  });
});

describe("call script on the round-up", () => {
  it("gives a script with the questions not yet ticked, and a download tied to the place", () => {
    start();
    page("roundup");
    const card = h.root.querySelector(`article.roundup-place[data-place="${DELI}"]`);
    const script = card?.querySelector("section.call-script");
    expect(script?.querySelector("h4")?.textContent).toBe(CALL_COPY.title.en);
    expect(script?.querySelector("p")?.textContent).toBe("Hello. I am planning a visit to Deli and have a few questions about access.");
    expect(Array.from(script?.querySelectorAll("ol li") ?? []).map((x) => x.textContent)).toEqual([QUESTIONS["step-free-entry"].en, QUESTIONS.elevator.en]);
    const link = script?.querySelector<HTMLAnchorElement>("a[download]");
    expect(link?.getAttribute("aria-describedby")).toBe(card?.querySelector("h3")?.id);
    expect(decodeTextExportHref(link?.getAttribute("href") ?? "")).toContain("Call script: Deli");
  });

  it("drops the script once every question for the place is ticked", () => {
    start();
    page("roundup");
    // Each tick draws the page again, so find the next unticked box each time.
    for (let guard = 0; guard < 10; guard++) {
      const next = h.root.querySelector<HTMLInputElement>(`input[data-action="asked"][data-value="${DELI}"]:not(:checked)`);
      if (!next) break;
      next.click();
    }
    expect(h.root.querySelector(`article.roundup-place[data-place="${DELI}"] section.call-script`)).toBeNull();
  });
});

describe("how much is recorded, on the summary page", () => {
  it("counts places by how many details are recorded", () => {
    start();
    page("summary");
    const section = h.root.querySelector("section.coverage");
    expect(section?.querySelector("h3")?.textContent).toBe(COVERAGE_COPY.title.en);
    const count = (n: number): string => section?.querySelector(`[data-coverage-count="${n}"]`)?.textContent ?? "";
    expect([count(0), count(1), count(2)]).toEqual(["1", "2", "1"]);
  });
});

describe("behind each column, on the compare page", () => {
  it("shows records, sources and dates for each compared place, and how they stand", () => {
    h.seed(NOTES());
    h.store.setItem(NEEDS_KEY, JSON.stringify({ elevator: "yes" }));
    window.location.hash = `#/compare/${[LIBRARY, DELI].join(",")}`;
    h.mount("en", true);
    const section = h.root.querySelector("section.behind");
    expect(section?.querySelector("h3")?.textContent).toBe(BEHIND_COPY.title.en);
    const items = Array.from(section?.querySelectorAll("ul.behind-list > li") ?? []);
    expect(items.map((li) => li.getAttribute("data-place"))).toEqual([LIBRARY, DELI]);
    expect(items[0]?.querySelector('[data-behind="sources"]')?.textContent).toBe("2");
    expect(items[1]?.querySelector('[data-behind="dates"]')?.textContent).toBe("2022-02-02 – 2026-10-01");
  });
});

describe("who recorded the place, on the record history page", () => {
  it("lists each source with its details, licences and dates", () => {
    start();
    h.click(act("view", "places"));
    h.click(act("open-place", LIBRARY));
    h.click(act("open-history", LIBRARY));
    const section = h.root.querySelector("section.who-recorded");
    expect(section?.querySelector("h3")?.textContent).toBe(WHO_COPY.title.en);
    expect(Array.from(section?.querySelectorAll("ul.who-list > li > strong") ?? []).map((x) => x.textContent)).toEqual(["City survey", "Contributor report"]);
  });
});

describe("what each source recorded, on the sources page", () => {
  it("lists records per detail for each source", () => {
    start();
    page("sources");
    const section = h.root.querySelector("section.source-coverage");
    expect(section?.querySelector("h3")?.textContent).toBe(SOURCE_COVERAGE_COPY.title.en);
    expect(section?.querySelector("li")?.textContent).toBe("City survey: Step-free entrance 2, Elevator 2");
  });
});

describe("flags on My notes", () => {
  it("shows a note's flags on the note and how many notes to check", () => {
    start();
    expect(h.root.querySelector("[data-notes-flagged]")?.textContent).toBe("Notes to check: 2");
    const flags = Array.from(h.root.querySelectorAll("[data-note-flags]")).map((x) => x.textContent);
    expect(flags).toContain("No Yes or No recorded · No address");
    expect(flags).toContain("Every record is 2 years old or more");
  });
});

describe("accessibility and wording on every page touched", () => {
  it.each(["en", "fr"] as const)("passes axe and the App's own audit (%s)", async (locale) => {
    start(locale);
    const visit = async (label: string, open: () => void): Promise<void> => {
      open();
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => `${v.id}: ${v.help}`), `${label} ${locale}`).toEqual([]);
      expect(h.auditLines(), `${label} ${locale}`).toEqual([]);
      const main = h.root.querySelector("main")?.textContent ?? "";
      expect(main, label).not.toMatch(/\binconnu/i);
      expect(findBanned(main.replace(COVERAGE_COPY.notRank[locale], "").replace(BEHIND_COPY.noScore[locale], "").replace(WHO_COPY.intro[locale], "")), label).toBeUndefined();
    };
    await visit("notes", () => undefined);
    await visit("musthaves", () => page("musthaves"));
    await visit("roundup", () => page("roundup"));
    await visit("summary", () => page("summary"));
    await visit("sources", () => page("sources"));
    await visit("history", () => {
      h.click(act("view", "places"));
      h.click(act("open-place", DELI));
      h.click(act("open-history", DELI));
    });
  });

  it("speaks French with no-break spaces on the new lines", () => {
    start("fr");
    expect(h.root.querySelector("[data-notes-flagged]")?.textContent).toBe("Notes à revoir\u00A0: 2");
    page("roundup");
    expect(h.root.querySelector("section.call-script p")?.textContent).toMatch(/^Bonjour\. Je prépare une visite à /);
  });
});
