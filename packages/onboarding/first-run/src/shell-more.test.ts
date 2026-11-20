// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CHECKLIST_KEY, NEEDS_KEY, QUESTIONS, decodeTextExportHref, placeId, type Note } from "./index";
import { OLD_PLACES_COPY } from "./oldplaces";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));
let h: Harness;

const NOTES = (): Note[] => [
  testNote("l1", "Library", [{ key: "step-free-entry", value: "yes" }]),
  testNote("o1", "Old Hall", [{ key: "elevator", value: "yes", on: "2023-02-02" }], "5 Main St"),
];
const LIBRARY = placeId({ placeName: "Library", address: "1 Main St" });
const OLD = placeId({ placeName: "Old Hall", address: "5 Main St" });

beforeEach(() => {
  h = createHarness(TODAY);
});

afterEach(() => {
  h.destroy();
});

function places(locale = "en"): void {
  h.seed(NOTES());
  h.store.setItem(NEEDS_KEY, JSON.stringify({ elevator: "yes", "step-free-entry": "yes" }));
  h.mount(locale);
  h.click(act("view", "notes"));
  h.click(act("view", "places"));
}

describe("call script on the visit plan", () => {
  it("holds the plan's questions not yet ticked, and leaves when all are ticked", () => {
    places();
    h.click(act("open-plan", LIBRARY));
    const link = h.root.querySelector<HTMLAnchorElement>("main a[data-call-script]");
    expect(link?.getAttribute("aria-describedby")).toBe("view-title");
    const text = decodeTextExportHref(link?.getAttribute("href") ?? "") ?? "";
    expect(text).toContain(`1. ${QUESTIONS.elevator.en}`);
    h.destroy();
    h = createHarness(TODAY);
    h.store.setItem(CHECKLIST_KEY, JSON.stringify({ [LIBRARY]: { elevator: { asked: true, answer: "" } } }));
    places();
    h.click(act("open-plan", LIBRARY));
    expect(h.root.querySelector("main a[data-call-script]")).toBeNull();
  });
});

describe("how much is recorded, on each place card", () => {
  it("shows a count line on every card", () => {
    places();
    expect(Array.from(h.root.querySelectorAll("article.card [data-coverage]")).map((x) => x.textContent).sort()).toEqual(["1 of 4 details recorded", "1 of 4 details recorded"]);
  });
});

describe("old places on the record ages page", () => {
  it("lists places whose newest record is 2 years old or more, and opens their history", () => {
    places();
    h.click(act("view", "ages"));
    const section = h.root.querySelector("section.old-places");
    expect(section?.querySelector("h3")?.textContent).toBe(OLD_PLACES_COPY.title.en);
    expect(Array.from(section?.querySelectorAll("li") ?? []).map((li) => li.getAttribute("data-place"))).toEqual([OLD]);
    h.click(`section.old-places ${act("open-history", OLD)}`);
    expect(h.shell?.getView()).toEqual({ kind: "history", id: OLD });
  });
});

describe("accessibility", () => {
  it.each(["en", "fr"] as const)("passes axe and the App's own audit on the plan, places and ages pages (%s)", async (locale) => {
    for (const go of [() => h.click(act("open-plan", LIBRARY)), () => undefined, () => h.click(act("view", "ages"))]) {
      h.destroy();
      h = createHarness(TODAY);
      places(locale);
      go();
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => `${v.id}: ${v.help}`), locale).toEqual([]);
      expect(h.auditLines(), locale).toEqual([]);
      expect(h.root.querySelector("main")?.textContent ?? "").not.toMatch(/\binconnu/i);
    }
  });
});

describe("the place page", () => {
  it("shows how much is recorded and offers a call script for details not agreed", () => {
    places();
    h.click(act("open-place", LIBRARY));
    expect(h.root.querySelector("main [data-coverage]")?.textContent).toBe("1 of 4 details recorded");
    const link = h.root.querySelector<HTMLAnchorElement>("main a[data-call-script]");
    const text = decodeTextExportHref(link?.getAttribute("href") ?? "") ?? "";
    expect(text).toContain("Call script: Library");
    expect(text).toContain(QUESTIONS.elevator.en);
    expect(text).not.toContain(QUESTIONS["step-free-entry"].en);
  });

  it("passes axe and the audit in French", async () => {
    places("fr");
    h.click(act("open-place", OLD));
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    expect(h.auditLines()).toEqual([]);
    expect(h.root.querySelector("main [data-coverage]")?.textContent).toBe("1 détail sur 4 enregistré");
  });
});

describe("text files carry the new sections", () => {
  const fileText = (prefix: string): string => {
    const a = Array.from(h.root.querySelectorAll<HTMLAnchorElement>("main a[download]")).find((x) => (x.getAttribute("download") ?? "").startsWith(prefix));
    return decodeTextExportHref(a?.getAttribute("href") ?? "") ?? "";
  };

  it("puts how much is recorded in the summary file", () => {
    places();
    h.click(act("view", "summary"));
    const text = fileText("summary-");
    expect(text).toContain("How much is recorded\n");
    expect(text).toContain("- 1 of 4 details recorded: 2 places");
  });

  it("puts the old places in the record ages file", () => {
    places("fr");
    h.click(act("view", "ages"));
    const text = fileText(h.root.querySelector<HTMLAnchorElement>("main a[download]:not([data-call-list]):not([data-call-script])")?.getAttribute("download")?.slice(0, 4) ?? "");
    expect(text).toContain(OLD_PLACES_COPY.title.fr);
    expect(text).toContain("- Old Hall (5 Main St) · Donnée la plus récente\u00A0: 2023-02-02");
  });
});
