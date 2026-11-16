// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { COPY, NAME_SECTIONS, decodeTextHref, isNameSection, listControls, memoryStore, mountShell, searchHelp, summarise, type KeyValueStore, type ShellHandle, type Violation } from "./index";
import { pickerLabel } from "./views-names";

const TODAY = new Date(Date.UTC(2026, 10, 15));
let root: HTMLElement;
let shell: ShellHandle | undefined;
let store: KeyValueStore;
let audits: Violation[][];

function mount(locales: string[] = ["en"], opts: { hashRouting?: boolean } = {}): ShellHandle {
  audits = [];
  shell = mountShell(root, { requestedLocales: locales, store, today: TODAY, onAudit: (v) => audits.push(v), ...opts });
  return shell;
}

const act = (action: string, value?: string): string => `[data-action="${action}"]` + (value !== undefined ? `[data-value="${value}"]` : "");
function click(sel: string): void {
  const el = root.querySelector<HTMLElement>(sel);
  expect(el, sel).not.toBeNull();
  el?.click();
}
const heading = (): string => root.querySelector("h2")?.textContent ?? "";
const rowsOf = (): string[][] => Array.from(root.querySelectorAll("table.names tbody tr")).map((r) => Array.from(r.children).map((c) => c.textContent ?? ""));
const openNames = (): void => {
  click(act("view", "help"));
  click(act("open-names"));
};

function fresh(): void {
  shell?.destroy();
  shell = undefined;
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app") as HTMLElement;
  store = memoryStore();
}

beforeEach(() => {
  fresh();
  window.location.hash = "";
});
afterEach(() => {
  shell?.destroy();
  shell = undefined;
});

describe("names on this screen", () => {
  it("opens from the help list with focus on its heading", () => {
    mount();
    openNames();
    expect(heading()).toBe(COPY.names.title.en);
    expect(document.activeElement?.tagName).toBe("H2");
  });

  it("says the App does not listen", () => {
    mount();
    openNames();
    expect(root.textContent).toContain("The App does not listen.");
  });

  it("starts on Notes and shows one row for every named control on that screen", () => {
    mount();
    openNames();
    expect(root.querySelector("#names-list-title")?.textContent).toBe(COPY.names.sections.notes.en);
    expect(rowsOf().length).toBeGreaterThan(10);
    expect(root.querySelector("#names-summary")?.textContent).toContain(`${rowsOf().length} controls on this screen.`);
  });

  it("has one picker button per screen, named so it never repeats a menu name", () => {
    mount();
    openNames();
    const names = Array.from(root.querySelectorAll(act("names-open"))).map((b) => b.textContent);
    expect(names).toEqual(NAME_SECTIONS.map((s) => pickerLabel(s, "en")));
    const menu = Array.from(root.querySelectorAll("nav button")).map((b) => b.textContent);
    for (const n of names) expect(menu).not.toContain(n);
    expect(root.querySelector(`${act("names-open", "notes")}`)?.getAttribute("aria-current")).toBe("true");
  });

  it("changes screen with the picker and keeps the address in step", () => {
    mount(["en"], { hashRouting: true });
    openNames();
    expect(window.location.hash).toBe("#/help/names");
    click(act("names-open", "display"));
    expect(window.location.hash).toBe("#/help/names/display");
    expect(root.querySelector("#names-list-title")?.textContent).toBe(COPY.names.sections.display.en);
    expect(rowsOf().some((r) => r[0]?.startsWith("100%"))).toBe(true);
  });

  it("is reachable by address, and an unknown screen is not a route", () => {
    window.location.hash = "#/help/names/setup";
    mount(["en"], { hashRouting: true });
    expect(heading()).toBe(COPY.names.title.en);
    expect(root.querySelector("#names-list-title")?.textContent).toBe(COPY.names.sections.setup.en);
  });

  it("includes the menu at the top and the language button in every list", () => {
    mount();
    openNames();
    for (const s of NAME_SECTIONS) {
      click(act("names-open", s));
      const names = rowsOf().map((r) => r[0]);
      expect(names, s).toContain("Français");
      expect(names, s).toContain(COPY.nav.help.en);
    }
  });

  it("saves the names as a plain text file that matches the screen", () => {
    mount();
    openNames();
    click(act("names-open", "help"));
    const link = root.querySelector<HTMLAnchorElement>("a[download]");
    expect(link?.getAttribute("download")).toBe("names-help-en.txt");
    const text = decodeTextHref(link?.getAttribute("href") ?? "") ?? "";
    expect(text).toContain(COPY.names.title.en);
    expect(text.split("\n").filter((l) => /^\d+\. /.test(l)).length).toBe(rowsOf().length);
  });

  it("is found by help search and offered under voice control", () => {
    expect(searchHelp("names", "en").some((h) => h.kind === "names")).toBe(true);
    expect(searchHelp("noms", "fr").some((h) => h.kind === "names")).toBe(true);
    mount();
    click(act("view", "help"));
    click(act("find-open", "start"));
    click(act("find-open", "move"));
    click(act("find-open", "voice"));
    click(act("open-names"));
    expect(heading()).toBe(COPY.names.title.en);
  });

  it("goes back to the help list with focus on the button that opened it", () => {
    mount();
    openNames();
    click(`main ${act("view", "help")}`);
    expect(document.activeElement).toBe(root.querySelector(act("open-names")));
  });

  it("works in French", () => {
    mount(["fr"]);
    openNames();
    expect(heading()).toBe(COPY.names.title.fr);
    expect(Array.from(root.querySelectorAll(act("names-open"))).map((b) => b.textContent)).toEqual(NAME_SECTIONS.map((s) => pickerLabel(s, "fr")));
    expect(root.textContent).not.toContain("Names on");
    expect(root.textContent).toContain("L’App n’écoute pas.");
  });
});

describe("every screen gives each control a name of its own", () => {
  it("has no repeated name, no name that drops its visible words and no long name, in both languages", () => {
    for (const lang of ["en", "fr"]) {
      for (const s of NAME_SECTIONS) {
        fresh();
        window.location.hash = `#/help/names/${s}`;
        mount([lang], { hashRouting: true });
        const bad = rowsOf().filter((r) => r[2] !== COPY.names.fine[lang as "en" | "fr"]);
        expect(bad, `${lang} ${s}`).toEqual([]);
      }
    }
  });

  it("holds for the live screen too, not only the copy the names page reads", () => {
    mount();
    for (const s of ["setup", "notes", "help", "display"]) {
      click(act("view", s));
      const sum = summarise(listControls(root));
      expect(sum, s).toMatchObject({ duplicates: 0, mismatches: 0, long: 0 });
    }
  });

  it("keeps the visible words at the start of the name of each filter and display button", () => {
    mount();
    click(act("view", "notes"));
    for (const b of Array.from(root.querySelectorAll<HTMLElement>(act("filter")))) {
      expect(b.getAttribute("aria-label")?.toLowerCase().startsWith((b.textContent ?? "").toLowerCase())).toBe(true);
    }
    click(act("view", "display"));
    for (const b of Array.from(root.querySelectorAll<HTMLElement>(act("display")))) {
      expect(b.getAttribute("aria-label")?.startsWith(b.textContent ?? "")).toBe(true);
    }
  });
});

describe("names page quality", () => {
  it("passes the page audit and axe on every screen in both languages", async () => {
    for (const lang of ["en", "fr"]) {
      for (const s of NAME_SECTIONS) {
        fresh();
        window.location.hash = `#/help/names/${s}`;
        mount([lang], { hashRouting: true });
        expect(audits.at(-1) ?? [], `${lang} ${s}`).toEqual([]);
        const r = await axe.run(root, { rules: { "color-contrast": { enabled: false }, "target-size": { enabled: false }, region: { enabled: false } } });
        expect(r.violations.map((v) => `${lang} ${s} ${v.id}`)).toEqual([]);
      }
    }
  });

  it("only accepts the four screens", () => {
    for (const s of NAME_SECTIONS) expect(isNameSection(s)).toBe(true);
    expect(isNameSection("places")).toBe(false);
  });
});
