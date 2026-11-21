// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes } from "./exchange";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { PAGE_SIZE } from "./filereader";
import { FILE_READER_COPY as C, foundText, readerErrorText } from "./filereader-copy";
import { mountFileReader, type FileReaderHandle } from "./filereader-mount";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { decodeTextExportHref } from "./textexport";
import { SEARCH_ID, mustHaveId } from "./views-filereader";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const FILE = exportNotes(
  [
    testNote("a1", "Central Library", [{ key: "elevator", value: "yes" }], "1 King St W"),
    testNote("b1", "Pool", [{ key: "elevator", value: "no", source: "Owner" }], "9 Lake Rd"),
    testNote("c1", "Café Rivière", [], "12 King St E"),
  ],
  "2026-11-01",
);

let root: HTMLElement;
let handle: FileReaderHandle | undefined;
let audits: Violation[][];

beforeEach(() => {
  document.documentElement.lang = "en";
  document.body.innerHTML =
    '<a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main"><h1>The App</h1><div id="host"></div></main>';
  root = document.getElementById("host") as HTMLElement;
  audits = [];
  window.localStorage.clear();
});

afterEach(() => {
  handle?.destroy();
  handle = undefined;
});

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileReaderHandle {
  document.documentElement.lang = locale;
  handle = mountFileReader(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
  return handle;
}

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => {
  const el = root.querySelector<T>(sel);
  expect(el, sel).not.toBeNull();
  return el as T;
};

const status = async (): Promise<string> => {
  await Promise.resolve();
  return document.querySelector('[role="status"][aria-live]')?.textContent ?? "";
};

const lastAudit = (): string[] => (audits.at(-1) ?? []).map((v) => `${v.rule}: ${v.detail}`);
const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function read(text = FILE): void {
  $<HTMLTextAreaElement>("#fr-text").value = text;
  $<HTMLFormElement>("#fr-file-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

function find(query: string, must: Partial<Record<string, "yes" | "no" | "">> = {}): void {
  $<HTMLInputElement>(`#${SEARCH_ID}`).value = query;
  for (const [k, v] of Object.entries(must)) $<HTMLSelectElement>(`#${mustHaveId(k as "elevator")}`).value = v ?? "";
  $<HTMLFormElement>("#fr-find-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

const shown = (group = "match"): string[] => Array.from(root.querySelectorAll(`ul[data-group="${group}"] h4`)).map((h) => h.textContent ?? "");

describe("reading a file", () => {
  it("lists every place in name order and announces the count", async () => {
    mount();
    read();
    expect(document.activeElement?.id).toBe("fr-summary");
    expect($("#fr-summary").textContent).toContain("3 places from 3 notes, 0 entries left out. The file says it was exported on 2026-11-01.");
    expect(shown()).toEqual(["Café Rivière", "Central Library", "Pool"]);
    expect(await status()).toBe(foundText([3, 0, 0], false, "en"));
    expect(lastAudit()).toEqual([]);
  });

  it("names the problem when the text is not an export", () => {
    mount();
    read("nope");
    expect(document.activeElement?.id).toBe("fr-errors");
    expect($("#fr-errors").textContent).toContain(readerErrorText("not-json", "en"));
    expect($("#fr-text").getAttribute("aria-invalid")).toBe("true");
    root.querySelector<HTMLAnchorElement>("#fr-errors a")?.click();
    expect(document.activeElement?.id).toBe("fr-text");
    expect(lastAudit()).toEqual([]);
  });
});

describe("search and must-haves", () => {
  it("filters by words and moves focus to the results", () => {
    mount();
    read();
    find("king");
    expect(shown()).toEqual(["Café Rivière", "Central Library"]);
    expect(document.activeElement?.id).toBe("fr-group-match");
  });

  it("sorts places into three groups, with Unknown on its own", async () => {
    const h = mount();
    read();
    find("", { elevator: "yes" });
    expect(shown("match")).toEqual(["Central Library"]);
    expect(shown("unknown")).toEqual(["Café Rivière"]);
    expect(shown("excluded")).toEqual(["Pool"]);
    expect($("#fr-group-unknown").textContent).toBe(`${C.groups.unknown.en} (1)`);
    expect(h.view().req).toEqual({ elevator: "yes" });
    expect(await status()).toBe(foundText([1, 1, 1], true, "en"));
    expect(lastAudit()).toEqual([]);
  });

  it("removes the search and every must-have", () => {
    const h = mount();
    read();
    find("king", { elevator: "no" });
    $('[data-action="fr-reset"]').click();
    expect(h.view().query).toBe("");
    expect(h.view().req).toEqual({});
    expect(shown()).toHaveLength(3);
    expect(document.activeElement?.id).toBe(SEARCH_ID);
  });
});

describe("place details", () => {
  it("shows a place's details with source, licence, date and tier, and keeps focus on its button", () => {
    mount();
    read();
    const btn = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-action="fr-toggle"]')).find((b) => b.textContent?.endsWith("Central Library"));
    expect(btn?.getAttribute("aria-expanded")).toBe("false");
    btn?.click();
    const open = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-action="fr-toggle"]')).find((b) => b.textContent?.endsWith("Central Library"));
    expect(open?.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(open);
    const details = $(`#${open?.getAttribute("aria-controls") ?? ""}`);
    expect(details.hidden).toBe(false);
    expect(details.textContent).toMatch(/Elevator.*Yes.*Source: City survey.*Licence: CC0-1\.0.*Recorded on 2026-10-01/);
    expect(details.textContent).toContain("Tier 0, not reviewed");
    expect(lastAudit()).toEqual([]);
  });

  it("keeps an unapplied search while opening a place", () => {
    mount();
    read();
    $<HTMLInputElement>(`#${SEARCH_ID}`).value = "lake";
    root.querySelector<HTMLButtonElement>('[data-action="fr-toggle"]')?.click();
    expect($<HTMLInputElement>(`#${SEARCH_ID}`).value).toBe("lake");
  });
});

describe("paging", () => {
  it("shows PAGE_SIZE places a page, with buttons that name the group", async () => {
    mount();
    const many = Array.from({ length: PAGE_SIZE + 5 }, (_, i) => testNote(`n${i}`, `Place ${String(i).padStart(2, "0")}`, [], `${i} Main St`));
    read(exportNotes(many, "2026-11-01"));
    expect(shown()).toHaveLength(PAGE_SIZE);
    const next = $('[data-action="fr-page"]');
    expect(next.textContent).toBe(`${C.next.en} (${C.groups.all.en})`);
    next.click();
    expect(shown()).toHaveLength(5);
    expect(document.activeElement?.id).toBe("fr-group-match");
    expect(await status()).toBe(C.updated.en);
    expect($('[data-action="fr-page"]').textContent).toBe(`${C.previous.en} (${C.groups.all.en})`);
  });
});

describe("downloads, files, language", () => {
  it("downloads every shown place as text, across pages", () => {
    mount();
    read();
    find("king");
    const href = root.querySelector<HTMLAnchorElement>("a.linkbtn[download]")?.getAttribute("href") ?? "";
    const text = decodeTextExportHref(href) ?? "";
    expect(text).toContain("Central Library");
    expect(text).toContain("Café Rivière");
    expect(text).not.toContain("Pool");
  });

  it("opens a file into the box", async () => {
    const h = mount("en", () => Promise.resolve(FILE));
    const input = $<HTMLInputElement>("#fr-open");
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($<HTMLTextAreaElement>("#fr-text").value).toBe(FILE);
    expect(h.file()).toBeUndefined();
    expect(await status()).toBe(C.opened.en);
  });

  it("refuses a file that is too large before reading it", async () => {
    let reads = 0;
    mount("en", () => {
      reads++;
      return Promise.resolve("");
    });
    const big = new File(["x"], "big.json");
    Object.defineProperty(big, "size", { value: MAX_FILE_BYTES + 1 });
    const input = $<HTMLInputElement>("#fr-open");
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(reads).toBe(0);
    expect($("#fr-errors").textContent).toContain(readerErrorText("too-large", "en"));
  });

  it("switches to French, shows UNKNOWN and keeps the view", () => {
    const h = mount();
    read();
    find("", { elevator: "yes" });
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#fr-title").textContent).toBe(C.title.fr);
    expect($("#fr-group-unknown").textContent).toBe(`${C.groups.unknown.fr} (1)`);
    expect(h.view().req).toEqual({ elevator: "yes" });
    expect(lastAudit()).toEqual([]);
  });

  it("removes the file, saves nothing, and removes its live region on destroy", async () => {
    const h = mount();
    read();
    $('[data-action="fr-clear"]').click();
    expect(h.file()).toBeUndefined();
    expect(document.activeElement?.id).toBe("fr-text");
    expect(await status()).toBe(C.cleared.en);
    expect(window.localStorage.length).toBe(0);
    h.destroy();
    handle = undefined;
    expect(root.innerHTML).toBe("");
    expect(document.querySelectorAll('[role="status"][aria-live]')).toHaveLength(0);
  });
});

// One axe run per language and screen.
describe("axe", () => {
  it.each(["en", "fr"] as const)("passes on the empty form (%s)", async (l) => {
    mount(l);
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with an error (%s)", async (l) => {
    mount(l);
    read("nope");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with groups and an open place (%s)", async (l) => {
    mount(l);
    read();
    find("", { elevator: "yes" });
    root.querySelector<HTMLButtonElement>('[data-action="fr-toggle"]')?.click();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});
