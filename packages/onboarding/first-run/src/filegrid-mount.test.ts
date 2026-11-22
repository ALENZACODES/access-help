// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes } from "./exchange";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { FILE_GRID_COPY as C, gridErrorText } from "./filegrid-copy";
import { mountFileGrid, type FileGridHandle } from "./filegrid-mount";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { FIND_ID, GOTO_ID, GRID_OPEN_ID, GRID_TEXT_ID, KEY_ID, SHOWN_ID, columnId, orderId, rowTickId } from "./views-filegrid";
import { placeId } from "./places";
import { FACT_KEYS } from "./facts";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const NOTES = [
  testNote("c1", "Café", [{ key: "elevator", value: "yes", on: "2026-01-05" }], "1 King St W"),
  testNote("b1", "Bakery", [{ key: "elevator", value: "yes" }], "2 King St W"),
  testNote("b2", "Bakery", [{ key: "elevator", value: "no", source: "Visit" }], "2 King St W"),
  testNote("k1", "Kiosk", [], null),
];
const FILE = exportNotes(NOTES, "2026-11-01");
const BIG = exportNotes([...NOTES, ...Array.from({ length: 30 }, (_, i) => testNote(`p${i}`, `Place ${String(i).padStart(3, "0")}`, [], `${i + 1} A St`))], "2026-11-01");

let root: HTMLElement;
let handle: FileGridHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileGridHandle {
  document.documentElement.lang = locale;
  handle = mountFileGrid(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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
  $<HTMLTextAreaElement>(`#${GRID_TEXT_ID}`).value = text;
  submit("fgr-file-form");
}

const rowNames = (): string[] => Array.from(root.querySelectorAll("#fgr-table tbody th label span")).map((s) => s.textContent ?? "");

describe("reading a file", () => {
  it("shows every place at once, focuses the results and announces how many", async () => {
    const h = mount();
    read();
    expect(rowNames()).toEqual(["Bakery", "Café", "Kiosk"]);
    expect(h.rows()).toHaveLength(3);
    expect(document.activeElement?.id).toBe("fgr-results");
    expect(await status()).toBe("3 places match.");
    expect(lastAudit()).toEqual([]);
  });

  it("names the problem when the text is not an export, and links to the box", () => {
    const h = mount();
    read("nope");
    expect(document.activeElement?.id).toBe("fgr-errors");
    expect($("#fgr-errors a").textContent).toBe(gridErrorText("not-json", "en"));
    expect(h.file()).toBeUndefined();
    $<HTMLAnchorElement>("#fgr-errors a").click();
    expect(document.activeElement?.id).toBe(GRID_TEXT_ID);
  });

  it("does not change the person's text", () => {
    mount();
    read();
    expect($<HTMLTextAreaElement>(`#${GRID_TEXT_ID}`).value).toBe(FILE);
  });
});

describe("narrowing and ordering", () => {
  it("narrows by name or address and by a detail's answer, in the order asked for", async () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${FIND_ID}`).value = "king";
    $<HTMLSelectElement>(`#${KEY_ID}`).value = "elevator";
    $<HTMLSelectElement>(`#${SHOWN_ID}`).value = "differ";
    submit("fgr-filter-form");
    expect(h.filter()).toEqual({ text: "king", key: "elevator", shown: "differ", order: "name", columns: ["step-free-entry", "accessible-washroom", "automatic-door", "elevator"] });
    expect(rowNames()).toEqual(["Bakery"]);
    expect(await status()).toBe("1 place matches.");
    $<HTMLSelectElement>(`#${KEY_ID}`).value = "";
    $<HTMLInputElement>(`#${orderId("unknown")}`).checked = true;
    submit("fgr-filter-form");
    expect(rowNames()).toEqual(["Bakery", "Café"]);
    expect(lastAudit()).toEqual([]);
  });

  it("shows only the details ticked as columns, and names the problem when none is ticked", () => {
    const h = mount();
    read();
    for (const k of FACT_KEYS) $<HTMLInputElement>(`#${columnId(k)}`).checked = k === "elevator";
    submit("fgr-filter-form");
    expect(Array.from(root.querySelectorAll("#fgr-table thead th")).map((th) => th.textContent)).toEqual(["Place", "Elevator", "Details with no record"]);
    expect(root.querySelectorAll(".fgr-breakdown li")).toHaveLength(1);
    $<HTMLInputElement>(`#${columnId("elevator")}`).checked = false;
    submit("fgr-filter-form");
    expect(document.activeElement?.id).toBe("fgr-errors");
    expect($("#fgr-errors li").textContent).toBe(C.noColumns.en);
    expect(h.rows()).toBeUndefined();
    $<HTMLAnchorElement>("#fgr-errors a").click();
    expect(document.activeElement?.id).toBe(columnId("step-free-entry"));
    expect(lastAudit()).toEqual([]);
  });

  it("says when no place matches", async () => {
    mount();
    read();
    $<HTMLInputElement>(`#${FIND_ID}`).value = "nowhere";
    submit("fgr-filter-form");
    expect(root.querySelector("#fgr-table")).toBeNull();
    expect(await status()).toBe(C.noRows.en);
  });

  it("keeps the filter when another file is read", () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${orderId("newest")}`).checked = true;
    submit("fgr-filter-form");
    read(exportNotes([testNote("x", "X", [], "1 Bay St")], "2026-11-01"));
    expect(h.filter().order).toBe("newest");
    expect(rowNames()).toEqual(["X"]);
  });
});

describe("pages", () => {
  it("moves a page at a time, focusing and announcing the page number", async () => {
    const h = mount();
    read(BIG);
    expect($("caption").textContent).toBe("Places 1 to 25 of 33");
    $('[data-action="fgr-next"]').click();
    expect(h.page()).toBe(2);
    expect($("caption").textContent).toBe("Places 26 to 33 of 33");
    expect(document.activeElement?.id).toBe("fgr-page");
    expect(await status()).toBe("Page 2 of 2. Places 26 to 33 of 33");
    // The next button is disabled on the last page, and does nothing.
    $('[data-action="fgr-next"]').click();
    expect(h.page()).toBe(2);
    $('[data-action="fgr-prev"]').click();
    expect(h.page()).toBe(1);
    expect(lastAudit()).toEqual([]);
  });

  it("goes to the page typed, or names the problem and links to the box", async () => {
    const h = mount();
    read(BIG);
    $<HTMLInputElement>(`#${GOTO_ID}`).value = "5";
    submit("fgr-goto-form");
    expect(document.activeElement?.id).toBe("fgr-errors");
    expect($("#fgr-errors li").textContent).toBe("Write a page number from 1 to 2.");
    expect($<HTMLInputElement>(`#${GOTO_ID}`).value).toBe("5");
    $<HTMLAnchorElement>("#fgr-errors a").click();
    expect(document.activeElement?.id).toBe(GOTO_ID);
    $<HTMLInputElement>(`#${GOTO_ID}`).value = "2";
    submit("fgr-goto-form");
    expect(h.page()).toBe(2);
    expect(root.querySelector("#fgr-errors")).toBeNull();
    expect(document.activeElement?.id).toBe("fgr-page");
    expect(await status()).toBe("Page 2 of 2. Places 26 to 33 of 33");
    expect(lastAudit()).toEqual([]);
  });

  it("goes back to the first page when the filter changes", () => {
    const h = mount();
    read(BIG);
    $('[data-action="fgr-next"]').click();
    submit("fgr-filter-form");
    expect(h.page()).toBe(1);
  });
});

describe("ticking places", () => {
  const KIOSK = placeId({ placeName: "Kiosk", address: undefined });
  const PLACE_0 = placeId({ placeName: "Place 000", address: "1 A St" });
  const tickRow = (id: string, on = true): void => {
    const box = $<HTMLInputElement>(`#${rowTickId(id)}`);
    box.checked = on;
    box.dispatchEvent(new Event("change", { bubbles: true }));
  };

  it("keeps the tick box focused, and keeps the ticks across pages and filters", () => {
    const h = mount();
    read(BIG);
    tickRow(KIOSK);
    expect(document.activeElement?.id).toBe(rowTickId(KIOSK));
    $('[data-action="fgr-next"]').click();
    $<HTMLInputElement>(`#${FIND_ID}`).value = "place 000";
    submit("fgr-filter-form");
    tickRow(PLACE_0);
    expect(h.ticked()).toEqual([KIOSK, PLACE_0]);
    expect($("#fgr-ticked a").textContent).toBe("Download the notes of the 2 places ticked");
    expect(lastAudit()).toEqual([]);
  });

  it("unticks a place with its box, or every place at once", () => {
    const h = mount();
    read();
    tickRow(KIOSK);
    tickRow(KIOSK, false);
    expect(h.ticked()).toEqual([]);
    expect($("#fgr-ticked").textContent).toBe(C.tickedHint.en);
    tickRow(KIOSK);
    $('[data-action="fgr-untick-all"]').click();
    expect(h.ticked()).toEqual([]);
    expect(document.activeElement?.id).toBe("fgr-results");
  });

  it("shows only the places ticked when asked, and everything again once they are all unticked", async () => {
    const h = mount();
    read(BIG);
    tickRow(KIOSK);
    $<HTMLInputElement>("#fgr-only-ticked").checked = true;
    submit("fgr-filter-form");
    expect(rowNames()).toEqual(["Kiosk"]);
    expect(await status()).toBe("1 place matches.");
    $('[data-action="fgr-untick-all"]').click();
    expect(h.rows()).toHaveLength(33);
    expect(root.querySelector("#fgr-only-ticked")).toBeNull();
    expect(lastAudit()).toEqual([]);
  });

  it("keeps the ticks and the choice to show only them across a change of language", () => {
    const h = mount();
    read(BIG);
    tickRow(KIOSK);
    $<HTMLInputElement>("#fgr-only-ticked").checked = true;
    submit("fgr-filter-form");
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect(h.ticked()).toEqual([KIOSK]);
    expect(rowNames()).toEqual(["Kiosk"]);
    expect($(`#${rowTickId(KIOSK)}`).getAttribute("aria-label")).toBe("Choisir Kiosk, Aucune adresse");
    expect($("#fgr-ticked a").textContent).toBe("Télécharger les notes du lieu coché");
    expect(lastAudit()).toEqual([]);
  });

  it("starts with nothing ticked when another file is read", () => {
    const h = mount();
    read();
    tickRow(KIOSK);
    read();
    expect(h.ticked()).toEqual([]);
  });
});

describe("files, language and removing", () => {
  it("opens a file into the box", async () => {
    const h = mount("en", () => Promise.resolve(FILE));
    const input = $<HTMLInputElement>(`#${GRID_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($<HTMLTextAreaElement>(`#${GRID_TEXT_ID}`).value).toBe(FILE);
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
    const input = $<HTMLInputElement>(`#${GRID_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(reads).toBe(0);
    expect($("#fgr-errors").textContent).toContain(gridErrorText("too-large", "en"));
  });

  it("says so when a file cannot be read, and does nothing after destroy", async () => {
    mount("en", () => Promise.reject(new Error("no")));
    const input = $<HTMLInputElement>(`#${GRID_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($("#fgr-status").textContent).toBe(C.readFailed.en);
    expect(document.activeElement?.id).toBe(GRID_OPEN_ID);
    handle?.destroy();
    let finish: (s: string) => void = () => undefined;
    const h = mount("en", () => new Promise<string>((r) => (finish = r)));
    const again = $<HTMLInputElement>(`#${GRID_OPEN_ID}`);
    Object.defineProperty(again, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    again.dispatchEvent(new Event("change", { bubbles: true }));
    h.destroy();
    handle = undefined;
    finish(FILE);
    await tick();
    expect(root.innerHTML).toBe("");
  });

  it("switches to French and keeps the filter and the page", () => {
    const h = mount();
    read(BIG);
    $('[data-action="fgr-next"]').click();
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#fgr-title").textContent).toBe(C.title.fr);
    expect(h.page()).toBe(2);
    expect($("caption").textContent).toBe("Lieux 26 à 33 sur 33");
    expect(root.textContent).not.toMatch(/inconnu/i);
    expect(lastAudit()).toEqual([]);
  });

  it("removes the file and the table, saves nothing, and removes its live region on destroy", async () => {
    const h = mount();
    read();
    $('[data-action="fgr-clear"]').click();
    expect(h.file()).toBeUndefined();
    expect(h.rows()).toBeUndefined();
    expect(document.activeElement?.id).toBe(GRID_TEXT_ID);
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

  it.each(["en", "fr"] as const)("passes on the table with pages (%s)", async (l) => {
    mount(l);
    read(BIG);
    $('[data-action="fgr-next"]').click();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with the file error (%s)", async (l) => {
    mount(l);
    read("nope");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with a page number that is not a page (%s)", async (l) => {
    mount(l);
    read(BIG);
    $<HTMLInputElement>(`#${GOTO_ID}`).value = "0";
    submit("fgr-goto-form");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with places ticked and shown on their own (%s)", async (l) => {
    mount(l);
    read(BIG);
    const box = $<HTMLInputElement>(`#${rowTickId(placeId({ placeName: "Kiosk", address: undefined }))}`);
    box.checked = true;
    box.dispatchEvent(new Event("change", { bubbles: true }));
    $<HTMLInputElement>("#fgr-only-ticked").checked = true;
    submit("fgr-filter-form");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes when no place matches (%s)", async (l) => {
    mount(l);
    read();
    $<HTMLInputElement>(`#${FIND_ID}`).value = "nowhere";
    submit("fgr-filter-form");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});
