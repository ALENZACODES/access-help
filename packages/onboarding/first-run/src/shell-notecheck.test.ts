// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ARTICLES, COPY, checkNotes, decodeTextExportHref, findBanned, noteCheckToText, type Note } from "./index";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));
let h: Harness;

const NOTES = (): Note[] => [
  testNote("e1", "Arena", []),
  testNote("o1", "Bakery", [{ key: "elevator", value: "yes", on: "2023-01-01" }], "2 Main St"),
  testNote("m1", "Cafe", [{ key: "elevator", value: "yes" }], "3 Main St"),
  testNote("n1", "Deli", [{ key: "elevator", value: "yes" }], null),
];

function open(notes: readonly Note[] = NOTES(), locale = "en"): void {
  h.seed(notes);
  h.mount(locale);
  h.click(act("view", "notes"));
  h.click(act("view", "notecheck"));
}

const listed = (): string[] => Array.from(h.root.querySelectorAll("ul.note-check > li")).map((li) => li.getAttribute("data-note") ?? "");

beforeEach(() => {
  h = createHarness(TODAY);
});

afterEach(() => {
  h.destroy();
});

describe("notes to check", () => {
  it("is offered on My notes and has its own address", () => {
    open();
    expect(h.shell?.getView()).toEqual({ kind: "notecheck" });
    expect(h.heading()).toBe("Notes to check");
  });

  it("lists each flagged note once, with its flags, and counts them", () => {
    open();
    expect(listed()).toEqual(["e1", "o1", "n1"]);
    const flags = (id: string): string[] => Array.from(h.root.querySelectorAll(`li[data-note="${id}"] li[data-flag]`)).map((x) => x.getAttribute("data-flag") ?? "");
    expect(flags("e1")).toEqual(["empty"]);
    expect(flags("o1")).toEqual(["old"]);
    expect(flags("n1")).toEqual(["noAddress"]);
    expect(["empty", "old", "noAddress"].map((f) => h.root.querySelector(`[data-check-count="${f}"]`)?.textContent)).toEqual(["1", "1", "1"]);
  });

  it("asks twice before removing a note, and Keep changes nothing", () => {
    open();
    h.click(act("remove-note", "o1"));
    expect(document.activeElement?.getAttribute("data-action")).toBe("confirm-remove");
    h.click(act("cancel-remove", "o1"));
    expect(listed()).toEqual(["e1", "o1", "n1"]);
    expect(document.activeElement?.getAttribute("data-action")).toBe("remove-note");
    expect(document.activeElement?.getAttribute("data-value")).toBe("o1");
  });

  it("removes a note for good when confirmed, and stays on this page", async () => {
    open();
    h.click(act("remove-note", "e1"));
    h.click(act("confirm-remove", "e1"));
    expect(h.shell?.getView()).toEqual({ kind: "notecheck" });
    expect(listed()).toEqual(["o1", "n1"]);
    expect(h.root.querySelector('main [role="status"]')?.textContent).toBe(COPY.notes.removed.en);
    await Promise.resolve();
    expect(h.status()).toBe(COPY.notes.removed.en);
  });

  it("says when nothing needs checking, and when there are no notes", () => {
    open([NOTES()[2] as Note]);
    expect(h.root.querySelector("[data-check-none]")?.textContent).toBe(COPY.noteCheck.none.en);
    h.destroy();
    h = createHarness(TODAY);
    open([]);
    expect(h.root.querySelector("[data-check-nonotes]")?.textContent).toBe(COPY.noteCheck.noNotes.en);
  });

  it("offers the list as text, and goes back to My notes", () => {
    open();
    const link = h.root.querySelector<HTMLAnchorElement>("main a[download]");
    expect(link?.getAttribute("download")).toBe("notes-to-check-2026-11-19-en.txt");
    expect(decodeTextExportHref(link?.getAttribute("href") ?? "")).toBe(noteCheckToText(checkNotes(NOTES(), TODAY), "en", TODAY));
    h.click(`main ${act("view", "notes")}`);
    expect(h.shell?.getView()).toEqual({ kind: "notes" });
  });

  it("works from its address", () => {
    h.seed(NOTES());
    window.location.hash = "#/notes/check";
    h.mount("en", true);
    expect(h.shell?.getView()).toEqual({ kind: "notecheck" });
  });
});

describe("the help article", () => {
  it("names the new pages with the same words as their buttons, in both languages", () => {
    const headings = (ARTICLES.find((a) => a.id === "plan")?.sections ?? []).map((x) => x.heading);
    for (const l of ["en", "fr"] as const) {
      const names = headings.map((x) => x[l]);
      for (const label of [COPY.noteCheck.open, COPY.places.viewShortlist, COPY.places.viewMustHaves]) expect(names, l).toContain(label[l]);
    }
  });
});

describe("accessibility and wording", () => {
  it.each(["en", "fr"] as const)("passes axe and the App's own audit, also while confirming (%s)", async (locale) => {
    open(NOTES(), locale);
    let r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    h.click(act("remove-note", "o1"));
    r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => `${v.id}: ${v.help}`), "confirming").toEqual([]);
    expect(h.auditLines(), locale).toEqual([]);
    const ids = Array.from(h.root.querySelectorAll("[id]")).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const el of Array.from(h.root.querySelectorAll<HTMLElement>("main button, main a.linkbtn"))) expect(el.style.minHeight, el.textContent ?? "").toBe("44px");
  });

  it("passes the audit on the empty pages in both languages", () => {
    for (const notes of [[], [NOTES()[2] as Note]]) {
      for (const locale of ["en", "fr"]) {
        h.destroy();
        h = createHarness(TODAY);
        open(notes, locale);
        expect(h.auditLines(), `${notes.length} ${locale}`).toEqual([]);
      }
    }
  });

  it("never calls a note wrong and never says inconnu", () => {
    for (const locale of ["en", "fr"] as const) {
      h.destroy();
      h = createHarness(TODAY);
      open(NOTES(), locale);
      const main = (h.root.querySelector("main")?.textContent ?? "").replace(COPY.noteCheck.notFault[locale], "");
      expect(findBanned(main), locale).toBeUndefined();
      expect(main, locale).not.toMatch(/\b(wrong|invalid|error|faux|invalide|erreur)\b/i);
      expect(main, locale).not.toMatch(/\binconnu/i);
    }
  });
});
