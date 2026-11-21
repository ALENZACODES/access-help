// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { FILE_DROP_COPY as C, dropErrorText, problemText } from "./filedrop-copy";
import { mountFileDrop, type FileDropHandle } from "./filedrop-mount";
import { placeId } from "./places";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { decodeTextExportHref } from "./textexport";
import { DROP_OPEN_ID, DROP_TEXT_ID, LIST_ID, REASON_ID, SEARCH_ID, keepId, pickId } from "./views-filedrop";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const NOTES = [
  testNote("a1", "Café A", [{ key: "elevator", value: "yes" }], "10 King St W"),
  testNote("a2", "Café A", [{ key: "automatic-door", value: "no" }], "10 King St W"),
  testNote("b", "Bakery", [], "20 King St W"),
  testNote("c", "Côte Deli", [], "5 Rue Saint-Denis"),
  testNote("k", "Kiosk", [], null),
];
const FILE = exportNotes(NOTES, "2026-11-01");
const CAFE = placeId({ placeName: "Café A", address: "10 King St W" });
const BAKERY = placeId({ placeName: "Bakery", address: "20 King St W" });
const KIOSK = placeId({ placeName: "Kiosk", address: undefined });

let root: HTMLElement;
let handle: FileDropHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileDropHandle {
  document.documentElement.lang = locale;
  handle = mountFileDrop(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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
const submit = (id: string): void => {
  $<HTMLFormElement>(`#${id}`).dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
};

function read(text = FILE): void {
  $<HTMLTextAreaElement>(`#${DROP_TEXT_ID}`).value = text;
  submit("fdp-file-form");
}

function search(q: string): void {
  $<HTMLInputElement>(`#${SEARCH_ID}`).value = q;
  submit("fdp-find-form");
}

function pick(id: string, on = true): void {
  const box = $<HTMLInputElement>(`#${pickId(id)}`);
  box.checked = on;
  box.dispatchEvent(new Event("change", { bubbles: true }));
}

const found = (): string[] => Array.from(root.querySelectorAll("#fdp-found-list label")).map((l) => l.textContent ?? "");
const chosenNames = (h: FileDropHandle): string[] => h.chosen().map((p) => p.name);
const href = (sel: string): string => decodeURIComponent((root.querySelector(sel)?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, ""));

describe("reading and finding", () => {
  it("lists every place once the file is read, focuses the search and announces the count", async () => {
    const h = mount();
    read();
    expect(h.file()?.places).toHaveLength(4);
    expect(found()).toEqual(["Bakery, 20 King St W", "Café A, 10 King St W", "Côte Deli, 5 Rue Saint-Denis", "Kiosk, No address"]);
    expect(document.activeElement?.id).toBe("fdp-find");
    expect(await status()).toBe("4 places found.");
    expect(lastAudit()).toEqual([]);
  });

  it("finds places by every word of the search, ignoring case and accents", async () => {
    mount();
    read();
    search("COTE denis");
    expect(found()).toEqual(["Côte Deli, 5 Rue Saint-Denis"]);
    expect(document.activeElement?.id).toBe("fdp-found");
    expect(await status()).toBe("1 place found.");
    search("pizza");
    expect(root.querySelector("#fdp-found-list")).toBeNull();
    expect($("#fdp-found").textContent).toBe(C.noneFound.en);
    expect($<HTMLInputElement>(`#${SEARCH_ID}`).value).toBe("pizza");
  });

  it("names the problem when the text is not an export, and links to the box", () => {
    const h = mount();
    read("nope");
    expect(document.activeElement?.id).toBe("fdp-errors");
    expect($("#fdp-errors a").textContent).toBe(dropErrorText("not-json", "en"));
    expect(h.file()).toBeUndefined();
    $<HTMLAnchorElement>("#fdp-errors a").click();
    expect(document.activeElement?.id).toBe(DROP_TEXT_ID);
    expect(lastAudit()).toEqual([]);
  });
});

describe("choosing", () => {
  it("keeps the tick box focused and the choice in the file's order across searches", async () => {
    const h = mount();
    read();
    pick(KIOSK);
    expect(document.activeElement?.id).toBe(pickId(KIOSK));
    expect(await status()).toBe("Places to remove (1)");
    search("king");
    pick(CAFE);
    expect(chosenNames(h)).toEqual(["Café A", "Kiosk"]);
    expect($("#fdp-chosen-title").textContent).toBe("Places to remove (2)");
    // Searching again shows the ticked place still ticked.
    search("kiosk");
    expect($<HTMLInputElement>(`#${pickId(KIOSK)}`).checked).toBe(true);
    expect(lastAudit()).toEqual([]);
  });

  it("unticks a place with its box", () => {
    const h = mount();
    read();
    pick(CAFE);
    pick(CAFE, false);
    expect(h.chosen()).toEqual([]);
    expect($("#fdp-none-chosen").textContent).toBe(C.noneChosen.en);
  });

  it("unticks a place with its button and moves focus to the next one, then the heading", () => {
    const h = mount();
    read();
    pick(BAKERY);
    pick(CAFE);
    pick(KIOSK);
    $(`#${keepId(CAFE)}`).click();
    expect(chosenNames(h)).toEqual(["Bakery", "Kiosk"]);
    expect(document.activeElement?.id).toBe(keepId(KIOSK));
    expect($<HTMLInputElement>(`#${pickId(CAFE)}`).checked).toBe(false);
    $(`#${keepId(KIOSK)}`).click();
    expect(document.activeElement?.id).toBe(keepId(BAKERY));
    $(`#${keepId(BAKERY)}`).click();
    expect(document.activeElement?.id).toBe("fdp-chosen-title");
    expect(lastAudit()).toEqual([]);
  });
});

describe("ticking from a list", () => {
  function tickList(text: string): void {
    $<HTMLTextAreaElement>(`#${LIST_ID}`).value = text;
    submit("fdp-list-form");
  }

  it("ticks the places the list names, keeps those already ticked, and says what it did", async () => {
    const h = mount();
    read();
    pick(BAKERY);
    tickList("kiosk\ncafe a\nPizza Place");
    expect(chosenNames(h)).toEqual(["Bakery", "Café A", "Kiosk"]);
    expect(document.activeElement?.id).toBe("fdp-list-result");
    expect($("#fdp-list-result").textContent).toBe("2 lines ticked a place. 1 line names no place in the file: “Pizza Place”.");
    expect(await status()).toBe("2 lines ticked a place. 1 line names no place in the file: “Pizza Place”. Places to remove (3)");
    expect($<HTMLTextAreaElement>(`#${LIST_ID}`).value).toBe("kiosk\ncafe a\nPizza Place");
    expect($<HTMLInputElement>(`#${pickId(CAFE)}`).checked).toBe(true);
    expect(lastAudit()).toEqual([]);
  });

  it("names the problem when the list is empty or too long, and links to it", () => {
    const h = mount();
    read();
    tickList("  \n ");
    expect(document.activeElement?.id).toBe("fdp-errors");
    expect($("#fdp-errors li").textContent).toBe(problemText("list-empty", "en"));
    $<HTMLAnchorElement>("#fdp-errors a").click();
    expect(document.activeElement?.id).toBe(LIST_ID);
    tickList(Array.from({ length: 201 }, (_, i) => `P${i}`).join("\n"));
    expect($("#fdp-errors li").textContent).toBe(problemText("list-long", "en"));
    expect(h.chosen()).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it("puts the copy away only when the list ticks a new place", () => {
    const h = mount();
    read();
    pick(KIOSK);
    submit("fdp-remove-form");
    tickList("Kiosk");
    expect(h.outcome()).toBeDefined();
    tickList("Bakery");
    expect(h.outcome()).toBeUndefined();
    expect($("#fdp-status").textContent).toBe(C.changed.en);
  });

  it("says it in French", () => {
    mount("fr");
    read();
    tickList("Pizza");
    expect($("#fdp-list-result").textContent).toBe("Aucune ligne n’a coché de lieu. 1 ligne ne nomme aucun lieu du fichier\u00A0: «\u202FPizza\u202F».");
    expect(lastAudit()).toEqual([]);
  });
});

describe("removing", () => {
  it("makes a copy without the places, reads it back, focuses it and announces it", async () => {
    const h = mount();
    read();
    pick(CAFE);
    pick(KIOSK);
    $<HTMLInputElement>(`#${REASON_ID}`).value = "Closed";
    submit("fdp-remove-form");
    expect(h.outcome()?.check.ok).toBe(true);
    expect(document.activeElement?.id).toBe("fdp-result");
    expect(await status()).toBe(`2 places and 3 notes taken out; 2 places and 2 notes kept. ${C.readBackOk.en}`);
    expect(importNotes(href('a[download="notes-without-2-places-2026-11-21.json"]')).notes.map((n) => n.id).sort()).toEqual(["b", "c"]);
    expect(importNotes(href('a[download="notes-taken-out-2-places-2026-11-21.json"]')).notes.map((n) => n.id).sort()).toEqual(["a1", "a2", "k"]);
    const text = decodeTextExportHref(root.querySelector('a[download="places-taken-out-2-places-2026-11-21.txt"]')?.getAttribute("href") ?? "") ?? "";
    expect(text).toContain("Why: Closed\n\n- Café A, 10 King St W (2 notes)\n- Kiosk, No address (1 note)\n");
    expect(lastAudit()).toEqual([]);
  });

  it("does not change the person's text", () => {
    mount();
    read();
    pick(CAFE);
    submit("fdp-remove-form");
    expect($<HTMLTextAreaElement>(`#${DROP_TEXT_ID}`).value).toBe(FILE);
  });

  it("names the problem when no place is ticked, and links to the search", () => {
    const h = mount();
    read();
    submit("fdp-remove-form");
    expect(document.activeElement?.id).toBe("fdp-errors");
    expect($("#fdp-errors li").textContent).toBe(problemText("none", "en"));
    expect(h.outcome()).toBeUndefined();
    $<HTMLAnchorElement>("#fdp-errors a").click();
    expect(document.activeElement?.id).toBe(SEARCH_ID);
    // Ticking a place clears the problem.
    pick(KIOSK);
    expect(root.querySelector("#fdp-errors")).toBeNull();
  });

  it("names a reason with a tab, keeps it, and links to it", () => {
    mount();
    read();
    pick(KIOSK);
    $<HTMLInputElement>(`#${REASON_ID}`).value = "closed\there";
    submit("fdp-remove-form");
    expect($("#fdp-errors li").textContent).toBe(problemText("control", "en"));
    expect($<HTMLInputElement>(`#${REASON_ID}`).value).toBe("closed\there");
    $<HTMLAnchorElement>("#fdp-errors a").click();
    expect(document.activeElement?.id).toBe(REASON_ID);
    expect(lastAudit()).toEqual([]);
  });

  it("names a reason that is too long", () => {
    mount();
    read();
    pick(KIOSK);
    $<HTMLInputElement>(`#${REASON_ID}`).value = "x".repeat(501);
    submit("fdp-remove-form");
    expect($("#fdp-errors li").textContent).toBe(problemText("too-long", "en"));
  });

  it("puts the copy away when the choice changes, and says so", async () => {
    const h = mount();
    read();
    pick(CAFE);
    submit("fdp-remove-form");
    pick(KIOSK);
    expect(h.outcome()).toBeUndefined();
    expect(root.querySelector("#fdp-result")).toBeNull();
    expect($("#fdp-status").textContent).toBe(C.changed.en);
    submit("fdp-remove-form");
    expect(h.outcome()?.removal.removed.map((p) => p.name)).toEqual(["Café A", "Kiosk"]);
    $(`#${keepId(CAFE)}`).click();
    expect(h.outcome()).toBeUndefined();
    expect(await status()).toBe("Places to remove (1)");
  });

  it("starts over when another file is read", () => {
    const h = mount();
    read();
    pick(CAFE);
    submit("fdp-remove-form");
    read(exportNotes([testNote("x", "X", [], "1 Bay St")], "2026-11-01"));
    expect(h.chosen()).toEqual([]);
    expect(h.outcome()).toBeUndefined();
    expect(found()).toEqual(["X, 1 Bay St"]);
  });
});

describe("files, language and removing the file", () => {
  it("opens a file into the box", async () => {
    const h = mount("en", () => Promise.resolve(FILE));
    const input = $<HTMLInputElement>(`#${DROP_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($<HTMLTextAreaElement>(`#${DROP_TEXT_ID}`).value).toBe(FILE);
    expect(h.file()).toBeUndefined();
    expect(document.activeElement?.id).toBe(DROP_TEXT_ID);
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
    const input = $<HTMLInputElement>(`#${DROP_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(reads).toBe(0);
    expect($("#fdp-errors").textContent).toContain(dropErrorText("too-large", "en"));
  });

  it("says so when a file cannot be read", async () => {
    mount("en", () => Promise.reject(new Error("no")));
    const input = $<HTMLInputElement>(`#${DROP_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($("#fdp-status").textContent).toBe(C.readFailed.en);
    expect(document.activeElement?.id).toBe(DROP_OPEN_ID);
  });

  it("does nothing after destroy when a file finishes reading", async () => {
    let finish: (s: string) => void = () => undefined;
    const h = mount("en", () => new Promise<string>((r) => (finish = r)));
    const input = $<HTMLInputElement>(`#${DROP_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    h.destroy();
    handle = undefined;
    finish(FILE);
    await tick();
    expect(root.innerHTML).toBe("");
  });

  it("switches to French and keeps the search, the choice and the copy", () => {
    const h = mount();
    read();
    search("king");
    pick(CAFE);
    $<HTMLInputElement>(`#${REASON_ID}`).value = "fermé";
    submit("fdp-remove-form");
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#fdp-title").textContent).toBe(C.title.fr);
    expect($<HTMLInputElement>(`#${SEARCH_ID}`).value).toBe("king");
    expect(found()).toEqual(["Bakery, 20 King St W", "Café A, 10 King St W"]);
    expect(chosenNames(h)).toEqual(["Café A"]);
    expect($("#fdp-summary").textContent).toBe("1 lieu et 2 notes retirées\u202F; 3 lieux et 3 notes gardées.");
    expect(root.querySelector('a[download="notes-sans-1-lieu-2026-11-21.json"]')).not.toBeNull();
    expect(lastAudit()).toEqual([]);
  });

  it("removes the file, the choice and the copy, saves nothing, and removes its live region on destroy", async () => {
    const h = mount();
    read();
    pick(CAFE);
    submit("fdp-remove-form");
    $('[data-action="fdp-clear"]').click();
    expect(h.file()).toBeUndefined();
    expect(h.chosen()).toEqual([]);
    expect(h.outcome()).toBeUndefined();
    expect($<HTMLTextAreaElement>(`#${DROP_TEXT_ID}`).value).toBe("");
    expect(document.activeElement?.id).toBe(DROP_TEXT_ID);
    expect(await status()).toBe(C.cleared.en);
    expect(window.localStorage.length).toBe(0);
    h.destroy();
    handle = undefined;
    expect(document.querySelectorAll('[role="status"][aria-live]')).toHaveLength(0);
  });
});

// One axe run per language and screen.
describe("axe", () => {
  it.each(["en", "fr"] as const)("passes on the empty form (%s)", async (l) => {
    mount(l);
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with places ticked (%s)", async (l) => {
    mount(l);
    read();
    pick(CAFE);
    pick(KIOSK);
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on the copy (%s)", async (l) => {
    mount(l);
    read();
    pick(CAFE);
    submit("fdp-remove-form");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes after ticking from a list (%s)", async (l) => {
    mount(l);
    read();
    $<HTMLTextAreaElement>(`#${LIST_ID}`).value = "Kiosk\nPizza";
    submit("fdp-list-form");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with the problems shown (%s)", async (l) => {
    mount(l);
    read();
    $<HTMLInputElement>(`#${REASON_ID}`).value = "a\tb";
    submit("fdp-remove-form");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});
