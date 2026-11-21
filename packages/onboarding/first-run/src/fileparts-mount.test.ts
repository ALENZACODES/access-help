// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { FILE_PARTS_COPY as C, partProblemText, partsErrorText } from "./fileparts-copy";
import { mountFileParts, type FilePartsHandle } from "./fileparts-mount";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { decodeTextExportHref } from "./textexport";
import { boxId, viewId } from "./views-fileparts";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const FILE = exportNotes(
  [
    testNote("l", "Library", [{ key: "elevator", value: "yes", on: "2026-01-05" }], "100 King St W, Toronto ON M5H 2N2"),
    testNote("b", "Bank", [{ key: "elevator", value: "no", on: "2025-02-01" }], "40 King St W, Toronto ON M5H 1A1"),
    testNote("c", "Café", [{ key: "automatic-door", value: "yes" }], "12 Queen St E, Kingston ON K7L 3N6"),
    testNote("k", "Kiosk", [], "1 Elm Ave"),
  ],
  "2026-11-01",
);

let root: HTMLElement;
let handle: FilePartsHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FilePartsHandle {
  document.documentElement.lang = locale;
  handle = mountFileParts(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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
  $<HTMLTextAreaElement>("#fpt-text").value = text;
  submit("fpt-file-form");
}

function compare(...parts: string[]): void {
  parts.forEach((p, i) => {
    $<HTMLInputElement>(`#${boxId(i)}`).value = p;
  });
  submit("fpt-parts-form");
}

const headings = (): string[] => Array.from(root.querySelectorAll(".fpt-parts > li > h4")).map((h) => h.textContent ?? "");

describe("comparing parts", () => {
  it("reads the file, moves to the first box and says how many places it has", async () => {
    mount();
    read();
    expect(document.activeElement?.id).toBe(boxId(0));
    expect(await status()).toBe("The file has 4 places. Name the parts to compare.");
    expect(root.querySelector("#fpt-results")).toBeNull();
    expect(lastAudit()).toEqual([]);
  });

  it("compares the parts with the rest of the file, and announces it", async () => {
    const h = mount();
    read();
    compare("King St", "Queen");
    expect(document.activeElement?.id).toBe("fpt-results");
    expect(headings()).toEqual(["“King St” (2 places)", "“Queen” (1 place)", "Rest of the file (1 place)"]);
    expect(h.report()?.parts[0]?.perDetail.elevator).toEqual({ yes: 1, no: 1, unknown: 0, differ: 0 });
    expect(await status()).toBe("2 parts compared with the rest of the file (1 place).");
    compare("King St", "");
    expect(await status()).toBe(`${C.updated.en} 1 part compared with the rest of the file (2 places).`);
    expect(lastAudit()).toEqual([]);
  });

  it("fills the boxes with the largest postal areas and compares them", () => {
    mount();
    read();
    $('[data-action="fpt-postal"]').click();
    expect(Array.from(root.querySelectorAll<HTMLInputElement>('input[name="part"]')).map((b) => b.value)).toEqual(["M5H", "K7L", "", ""]);
    expect(headings()).toEqual(["“M5H” (2 places)", "“K7L” (1 place)", "Rest of the file (1 place)"]);
    expect(document.activeElement?.id).toBe("fpt-results");
  });

  it("fills the boxes with the largest streets as their places write them, and compares them", () => {
    mount();
    read();
    $('[data-action="fpt-streets"]').click();
    expect(Array.from(root.querySelectorAll<HTMLInputElement>('input[name="part"]')).map((b) => b.value)).toEqual(["King St W", "Elm Ave", "Queen St E", ""]);
    expect(headings()).toEqual(["“King St W” (2 places)", "“Elm Ave” (1 place)", "“Queen St E” (1 place)", "Rest of the file (0 places)"]);
    expect(lastAudit()).toEqual([]);
  });

  it("takes only the four largest streets when a file has more", () => {
    mount();
    read(
      exportNotes(
        ["1 Oak St", "2 Oak St", "3 Oak St", "1 Ash St", "2 Ash St", "1 Elm Ave", "2 Elm Ave", "1 Fir Rd", "1 Pine Cres"].map((a, i) => testNote(`p${i}`, `Place ${i}`, [], a)),
        "2026-11-01",
      ),
    );
    $('[data-action="fpt-streets"]').click();
    expect(Array.from(root.querySelectorAll<HTMLInputElement>('input[name="part"]')).map((b) => b.value)).toEqual(["Oak St", "Ash St", "Elm Ave", "Fir Rd"]);
    expect(headings().at(-1)).toBe("Rest of the file (1 place)");
  });

  it("offers no street or postal button when no address has a street or a postal code", () => {
    mount();
    read(exportNotes([testNote("k", "Kiosk", [], "Market Square")], "2026-11-01"));
    expect(root.querySelector('[data-action="fpt-streets"]')).toBeNull();
    expect(root.querySelector('[data-action="fpt-postal"]')).toBeNull();
    expect(root.textContent).toContain("No address in this file has a house number and a street.");
    expect(lastAudit()).toEqual([]);
  });

  it("downloads the notes of a part's places with something to look at", () => {
    mount();
    read();
    compare("King");
    const href = root.querySelector('a[download="notes-to-look-at-part-1-2026-11-21.json"]')?.getAttribute("href") ?? "";
    expect(importNotes(decodeURIComponent(href.replace(/^data:application\/json;charset=utf-8,/, ""))).notes.map((n) => n.placeName).sort()).toEqual(["Bank", "Café", "Library"]);
  });

  it("shows the comparison detail by detail when chosen, and keeps the choice", () => {
    mount();
    read();
    $<HTMLInputElement>(`#${viewId("detail")}`).checked = true;
    compare("King St", "Queen");
    expect(root.querySelectorAll(".fpt-by-detail > li > h4")).toHaveLength(4);
    expect(root.querySelector(".fpt-parts")).toBeNull();
    expect($<HTMLInputElement>(`#${viewId("detail")}`).checked).toBe(true);
    expect(Array.from(root.querySelectorAll(".fpt-by-detail > li:nth-child(4) li")).map((li) => li.textContent?.split(":")[0])).toEqual([
      "“King St” (2 places)",
      "“Queen” (1 place)",
      "Rest of the file (1 place)",
    ]);
    expect(lastAudit()).toEqual([]);
  });

  it("says when a place is in two parts and counts it in each", () => {
    mount();
    read();
    compare("King", "Kingston");
    expect($("#fpt-summary").textContent).toBe("2 parts compared with the rest of the file (1 place). 1 place is in two parts or more and is counted in each.");
  });

  it("downloads each part's notes, the comparison and a text to print", () => {
    mount();
    read();
    compare("Queen");
    const notes = root.querySelector('a[download="notes-part-1-2026-11-21.json"]')?.getAttribute("href") ?? "";
    expect(importNotes(decodeURIComponent(notes.replace(/^data:application\/json;charset=utf-8,/, ""))).notes.map((n) => n.placeName)).toEqual(["Café"]);
    const csv = decodeURIComponent((root.querySelector('a[download="parts-comparison-2026-11-21.csv"]')?.getAttribute("href") ?? "").replace(/^data:text\/csv;charset=utf-8,/, ""));
    expect(csv).toContain("Queen,1,automatic-door,1,0,0,0");
    const text = decodeTextExportHref(root.querySelector('a[download="parts-comparison-2026-11-21.txt"]')?.getAttribute("href") ?? "") ?? "";
    expect(text).toContain("“Queen” (1 place)");
  });
});

describe("problems with the parts", () => {
  it("lists each box's problem, keeps what was typed and keeps the last comparison", () => {
    const h = mount();
    read();
    compare("King");
    compare("King", "king.", "Maple");
    expect(document.activeElement?.id).toBe("fpt-errors");
    expect(Array.from(root.querySelectorAll("#fpt-errors li")).map((li) => li.textContent)).toEqual([
      `Part 2: ${partProblemText("repeat", "en")}`,
      `Part 3: ${partProblemText("none-match", "en")}`,
    ]);
    expect($<HTMLInputElement>(`#${boxId(2)}`).value).toBe("Maple");
    expect($(`#${boxId(2)}`).getAttribute("aria-invalid")).toBe("true");
    expect(h.report()?.parts.map((p) => p.text)).toEqual(["King"]);
    root.querySelector<HTMLAnchorElement>(`#fpt-errors a[href="#${boxId(2)}"]`)?.click();
    expect(document.activeElement?.id).toBe(boxId(2));
    expect(lastAudit()).toEqual([]);
  });

  it("asks for at least one part", () => {
    mount();
    read();
    compare("", "", "", "");
    expect($("#fpt-errors").textContent).toContain(partProblemText("empty", "en"));
    root.querySelector<HTMLAnchorElement>("#fpt-errors a")?.click();
    expect(document.activeElement?.id).toBe(boxId(0));
  });

  it("names the problem when the text is not an export, and links to the box", () => {
    mount();
    read("nope");
    expect(document.activeElement?.id).toBe("fpt-errors");
    expect($("#fpt-errors").textContent).toContain(partsErrorText("not-json", "en"));
    root.querySelector<HTMLAnchorElement>("#fpt-errors a")?.click();
    expect(document.activeElement?.id).toBe("fpt-text");
    expect(lastAudit()).toEqual([]);
  });
});

describe("files, language and removing", () => {
  it("opens a file into the box", async () => {
    const h = mount("en", () => Promise.resolve(FILE));
    const input = $<HTMLInputElement>("#fpt-open");
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($<HTMLTextAreaElement>("#fpt-text").value).toBe(FILE);
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
    const input = $<HTMLInputElement>("#fpt-open");
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(reads).toBe(0);
    expect($("#fpt-errors").textContent).toContain(partsErrorText("too-large", "en"));
  });

  it("says so when a file cannot be read, and ignores a read that ends after the tool is closed", async () => {
    const first = mount("en", () => Promise.reject(new Error("no")));
    const input = $<HTMLInputElement>("#fpt-open");
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($("#fpt-status").textContent).toBe(C.readFailed.en);
    first.destroy();

    let finish: (s: string) => void = () => undefined;
    const late = mount("en", () => new Promise<string>((r) => (finish = r)));
    const input2 = $<HTMLInputElement>("#fpt-open");
    Object.defineProperty(input2, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input2.dispatchEvent(new Event("change", { bubbles: true }));
    late.destroy();
    handle = undefined;
    finish(FILE);
    await tick();
    expect(root.innerHTML).toBe("");
  });

  it("switches to French and keeps the boxes and the comparison", () => {
    const h = mount();
    read();
    compare("King");
    $<HTMLInputElement>(`#${boxId(1)}`).value = "Elm";
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#fpt-title").textContent).toBe(C.title.fr);
    expect($<HTMLInputElement>(`#${boxId(1)}`).value).toBe("Elm");
    // "King" is also in "Kingston", the Café's city.
    expect(headings()).toEqual(["«\u202FKing\u202F» (3 lieux)", "Reste du fichier (1 lieu)"]);
    expect(lastAudit()).toEqual([]);
  });

  it("removes the file and the parts, saves nothing, and removes its live region on destroy", async () => {
    const h = mount();
    read();
    compare("King");
    $('[data-action="fpt-clear"]').click();
    expect(h.file()).toBeUndefined();
    expect(h.report()).toBeUndefined();
    expect(document.activeElement?.id).toBe("fpt-text");
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
  });

  it.each(["en", "fr"] as const)("passes on the boxes (%s)", async (l) => {
    mount(l);
    read();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on the comparison (%s)", async (l) => {
    mount(l);
    read();
    compare("King", "Queen");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on the comparison detail by detail (%s)", async (l) => {
    mount(l);
    read();
    $<HTMLInputElement>(`#${viewId("detail")}`).checked = true;
    compare("King", "Queen");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with problems in the boxes (%s)", async (l) => {
    mount(l);
    read();
    compare("Maple", "", "x".repeat(70));
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});
