// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JOURNAL_COPY } from "./journal";
import { placeId } from "./places";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";
import { VISITS_KEY } from "./visits";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const LIB = placeId({ placeName: "Library", address: "1 Main St" });
const POOL = placeId({ placeName: "Pool", address: "2 Side Rd" });
let h: Harness;

beforeEach(() => {
  h = createHarness(TODAY);
  h.seed([testNote("n1", "Library", [{ key: "elevator", value: "yes" }]), { ...testNote("n2", "Pool", [], "2 Side Rd"), createdOn: "2026-09-05" }]);
  h.store.setItem(VISITS_KEY, JSON.stringify([{ id: "v-1", placeId: LIB, placeName: "Library", address: "1 Main St", visitedOn: "2026-11-02", found: { elevator: "no" }, words: "Lift « closed » ; sad!", writtenOn: "2026-11-02" }]));
});

afterEach(() => h.destroy());

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => {
  const el = h.root.querySelector<T>(sel);
  expect(el, sel).not.toBeNull();
  return el as T;
};

const said = async (): Promise<string> => {
  await Promise.resolve();
  return h.status();
};

const headings = (): string[] => Array.from(h.root.querySelectorAll(".journal-entry strong")).map((s) => s.textContent ?? "");

function open(locale = "en"): void {
  h.mount(locale);
  h.click(act("view", "notes"));
  h.click(act("view", "journal"));
}

describe("What I did", () => {
  it("opens from My notes with every step, by month, newest first", () => {
    open();
    expect(h.heading()).toBe(JOURNAL_COPY.title.en);
    expect(Array.from(h.root.querySelectorAll(".journal-page h3")).map((x) => x.textContent)).toEqual(["November 2026", "October 2026", "September 2026"]);
    expect(headings()).toEqual(["Visit, 2026-11-02: Library, 1 Main St", "Note added, 2026-10-01: Library, 1 Main St", "Note added, 2026-09-05: Pool, 2 Side Rd"]);
    expect($(".journal-entry > p:not([id]) [data-user-content]").textContent).toBe("Lift « closed » ; sad!");
    expect($("#journal-count").textContent).toBe("3 of 3 entries.");
  });

  it("shows a newly added visit and a removed note without being asked to", () => {
    open();
    h.click(act("view", "notes"));
    h.click(act("remove-note", "n2"));
    const confirm = h.root.querySelector(act("confirm-remove", "n2"));
    if (confirm) h.click(act("confirm-remove", "n2"));
    h.click(act("view", "journal"));
    expect(headings()[0]).toBe("Note removed, 2026-11-20: Pool, 2 Side Rd");
  });

  it("hides and shows kinds, keeping focus on the box and saying how many are shown", async () => {
    open();
    h.click('[data-action="journal-kind"][data-value="note"]');
    expect(document.activeElement?.getAttribute("data-value")).toBe("note");
    expect(headings()).toEqual(["Visit, 2026-11-02: Library, 1 Main St"]);
    expect(await said()).toBe("1 of 3 entries.");
    h.click('[data-action="journal-kind"][data-value="visit"]');
    expect(h.text()).toContain(JOURNAL_COPY.noneShown.en);
    h.click('[data-action="journal-kind"][data-value="note"]');
    expect(headings()).toHaveLength(2);
  });

  it("shows one place, from the list or from the place's own page", async () => {
    open();
    const select = $<HTMLSelectElement>("#journal-place");
    select.value = POOL;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    expect(document.activeElement?.id).toBe("journal-place");
    expect(headings()).toEqual(["Note added, 2026-09-05: Pool, 2 Side Rd"]);
    expect(await said()).toBe("1 of 3 entries.");
    h.click(act("view", "notes"));
    h.click(act("view", "places"));
    h.click(act("open-place", LIB));
    h.click(act("open-journal", LIB));
    expect(h.heading()).toBe(JOURNAL_COPY.title.en);
    expect($<HTMLSelectElement>("#journal-place").value).toBe(LIB);
    expect(headings()).toHaveLength(2);
    h.click(act("view", "notes"));
    h.click(act("view", "journal"));
    expect($<HTMLSelectElement>("#journal-place").value).toBe("");
  });

  it("shows only steps since a day, says when the day cannot be read, and goes back to every day", async () => {
    open();
    const since = (v: string): void => {
      $<HTMLInputElement>("#journal-since").value = v;
      $("#journal-since").dispatchEvent(new Event("change", { bubbles: true }));
    };
    since("2026-10-01");
    expect(headings()).toEqual(["Visit, 2026-11-02: Library, 1 Main St", "Note added, 2026-10-01: Library, 1 Main St"]);
    expect(document.activeElement?.id).toBe("journal-since");
    expect(await said()).toBe("2 of 3 entries.");
    since("01/10/2026");
    expect($("#journal-since").getAttribute("aria-invalid")).toBe("true");
    expect($("#journal-since-error").textContent).toBe(JOURNAL_COPY.sinceError.en);
    expect($<HTMLInputElement>("#journal-since").value).toBe("01/10/2026");
    expect(headings()).toHaveLength(2);
    since("");
    expect(headings()).toHaveLength(3);
    expect(h.root.querySelector("#journal-since-error")).toBeNull();
  });

  it("offers the list shown as text", () => {
    open();
    h.click('[data-action="journal-kind"][data-value="visit"]');
    const link = $<HTMLAnchorElement>("[data-journal-download]");
    expect(link.getAttribute("download")).toBe("what-i-did-2026-11-20.txt");
    const text = decodeURIComponent((link.getAttribute("href") ?? "").split(",").slice(1).join(","));
    expect(text).toContain("Note added, 2026-09-05: Pool, 2 Side Rd");
    expect(text).not.toContain("Visit, 2026-11-02");
  });

  it("says there is nothing yet on a fresh device, and has its own address", () => {
    h.destroy();
    h = createHarness(TODAY);
    window.location.hash = "#/notes/what-i-did";
    h.mount("fr", true);
    expect(h.heading()).toBe(JOURNAL_COPY.title.fr);
    expect(h.text()).toContain(JOURNAL_COPY.none.fr);
    expect(h.root.querySelector("#journal-place")).toBeNull();
  });

  it.each(["en", "fr"] as const)("passes axe and the App's audit (%s)", async (l) => {
    open(l);
    for (const step of [() => undefined, () => h.click('[data-action="journal-kind"][data-value="visit"]'), () => h.click('[data-action="journal-kind"][data-value="note"]')]) {
      step();
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
      expect(h.auditLines()).toEqual([]);
    }
  });
});
