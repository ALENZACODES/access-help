// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { FILE_LIST_COPY as C, columnsProblemText, listErrorText, notesErrorText } from "./filelist-copy";
import { mountFileList, type FileListHandle } from "./filelist-mount";
import { AXE_OPTIONS } from "./shelltest";
import { decodeTextExportHref } from "./textexport";
import { testNote } from "./testnotes";
import { ADDRESS_COL_ID, LICENCE_ID, NAME_COL_ID, decisionId } from "./views-filelist";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const NOTES = exportNotes(
  [
    testNote("l1", "Library", [{ key: "elevator", value: "yes" }], "100 King St W"),
    testNote("x1", "Old Shop", [], "40 King St W"),
    testNote("k1", "Kiosk", [], null),
  ],
  "2026-11-01",
);
const LIST = "Name,Address\nLibrary,100 King St W\nNew Bakery,40 King St W\nPharmacy,7 Elm Ave";

let root: HTMLElement;
let handle: FileListHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileListHandle {
  document.documentElement.lang = locale;
  handle = mountFileList(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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

function read(notes = NOTES, list = LIST): void {
  $<HTMLTextAreaElement>("#fpl-notes").value = notes;
  $<HTMLTextAreaElement>("#fpl-list").value = list;
  submit("fpl-file-form");
}

const decodeJson = (sel: string): string => decodeURIComponent((root.querySelector(sel)?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, ""));

describe("checking a list", () => {
  it("guesses the columns, sorts the list by status, and announces the counts", async () => {
    const h = mount();
    read();
    expect(document.activeElement?.id).toBe("fpl-summary");
    expect(h.columns()).toEqual({ name: 0, address: 1 });
    expect($("#fpl-found").textContent).toBe("Places with notes (1)");
    expect($("#fpl-same-address").textContent).toBe("Same address, another name (1)");
    expect($("#fpl-missing").textContent).toBe("Places with no notes yet (1)");
    expect($(".fpl-not-in-list").textContent).toBe("Kiosk, No address");
    expect(await status()).toBe("Your list has 3 places: 1 with notes, 1 at the same address under another name, 1 with no notes yet. 1 place in the file is not on the list.");
    expect(lastAudit()).toEqual([]);
  });

  it("gives starter notes for the missing places with the chosen licence, and the notes of the places found", () => {
    mount();
    read();
    $<HTMLSelectElement>(`#${LICENCE_ID}`).value = "CC-BY-4.0";
    submit("fpl-columns-form");
    const starter = importNotes(decodeJson('a[download="starter-notes-2026-11-21.json"]'));
    expect(starter.notes.map((n) => [n.placeName, n.licence])).toEqual([["Pharmacy", "CC-BY-4.0"]]);
    expect(starter.notes[0]?.facts.every((f) => f.value === "unknown")).toBe(true);
    expect(importNotes(decodeJson('a[download="notes-on-your-list-2026-11-21.json"]')).notes.map((n) => n.placeName)).toEqual(["Library"]);
    expect(importNotes(decodeJson('a[download="notes-not-on-your-list-2026-11-21.json"]')).notes.map((n) => n.placeName)).toEqual(["Kiosk"]);
    const text = decodeTextExportHref(root.querySelector('a[download="list-check-2026-11-21.txt"]')?.getAttribute("href") ?? "") ?? "";
    expect(text).toContain("[ ] Row 4: Pharmacy, 7 Elm Ave");
  });

  it("checks again with other columns, keeping them when the same list is read again", () => {
    const h = mount();
    read();
    $<HTMLSelectElement>(`#${ADDRESS_COL_ID}`).value = "-1";
    submit("fpl-columns-form");
    expect(h.columns()).toEqual({ name: 0, address: -1 });
    // Without addresses, only names can match: Library has an address in the file, so nothing is found.
    expect(root.querySelector("#fpl-found")).toBeNull();
    expect($("#fpl-missing").textContent).toBe("Places with no notes yet (3)");
    read();
    expect(h.columns()).toEqual({ name: 0, address: -1 });
    read(NOTES, "Nom,Adresse\nLibrary,100 King St W");
    expect(h.columns()).toEqual({ name: 0, address: 1 });
  });

  it("refuses the same column twice and links the problem to the field", () => {
    mount();
    read();
    $<HTMLSelectElement>(`#${ADDRESS_COL_ID}`).value = "0";
    submit("fpl-columns-form");
    expect(document.activeElement?.id).toBe("fpl-errors");
    expect($("#fpl-errors").textContent).toContain(columnsProblemText("same", "en"));
    expect(root.querySelector("#fpl-summary")).toBeNull();
    root.querySelector<HTMLAnchorElement>(`#fpl-errors a[href="#${ADDRESS_COL_ID}"]`)?.click();
    expect(document.activeElement?.id).toBe(ADDRESS_COL_ID);
    expect(lastAudit()).toEqual([]);
  });

  it("says when no row has a name in the chosen column", () => {
    mount();
    read(NOTES, "Name,Address\nLibrary,100 King St W\nShop,1 Elm Ave");
    $<HTMLSelectElement>(`#${NAME_COL_ID}`).value = "1";
    $<HTMLSelectElement>(`#${ADDRESS_COL_ID}`).value = "-1";
    submit("fpl-columns-form");
    expect(root.querySelector("#fpl-errors")).toBeNull();
    // A list with other column names gets a fresh guess: the name column is empty on every row.
    read(NOTES, "Nom,Adresse\n,1 A St\n,2 A St");
    expect($("#fpl-errors").textContent).toContain(listErrorText("no-entries", "en"));
    expect($("#fpl-list").getAttribute("aria-invalid")).toBe("true");
  });

  it("reads a list saved with semicolons, as French spreadsheets often are", () => {
    const h = mount("fr");
    read(NOTES, "Nom;Adresse\nLibrary;100 King St W\nPharmacie;7 Elm Ave");
    expect(h.columns()).toEqual({ name: 0, address: 1 });
    expect(h.check()?.matches.map((m) => m.status)).toEqual(["found", "missing"]);
    expect(lastAudit()).toEqual([]);
  });

  it("names a problem in each box at once", () => {
    mount();
    read("nope", "");
    expect(document.activeElement?.id).toBe("fpl-errors");
    expect(Array.from(root.querySelectorAll("#fpl-errors li")).map((li) => li.textContent)).toEqual([notesErrorText("not-json", "en"), listErrorText("empty", "en")]);
    root.querySelector<HTMLAnchorElement>('#fpl-errors a[href="#fpl-list"]')?.click();
    expect(document.activeElement?.id).toBe("fpl-list");
    expect(lastAudit()).toEqual([]);
  });
});

describe("answers for the same address", () => {
  it("uses the person's answer, announces it, and keeps it when the same list is read again", async () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${decisionId(3, "same")}`).checked = true;
    submit("fpl-decide-form");
    expect(h.decisions()).toEqual({ 3: "same" });
    expect(document.activeElement?.id).toBe("fpl-summary");
    expect($("#fpl-found").textContent).toBe("Places with notes (2)");
    expect(await status()).toBe(`${C.updated.en} Your list has 3 places: 2 with notes, 0 at the same address under another name, 1 with no notes yet. 1 place in the file is not on the list.`);
    read();
    expect(h.decisions()).toEqual({ 3: "same" });
    expect(lastAudit()).toEqual([]);
  });

  it("keeps answers when the columns change, using them only for rows that are still at the same address", async () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${decisionId(3, "same")}`).checked = true;
    submit("fpl-decide-form");
    $<HTMLSelectElement>(`#${ADDRESS_COL_ID}`).value = "-1";
    submit("fpl-columns-form");
    // With no address column, row 3 is no longer at the same address as anything, so the answer has nothing to apply to.
    expect(h.decisions()).toEqual({ 3: "same" });
    expect(h.check()?.matches.map((m) => m.status)).toEqual(["missing", "missing", "missing"]);
    expect(root.querySelector("#fpl-decide-form")).toBeNull();
    expect(await status()).toBe(`${C.updated.en} Your list has 3 places: 0 with notes, 0 at the same address under another name, 3 with no notes yet. 3 places in the file are not on the list.`);
    $<HTMLSelectElement>(`#${ADDRESS_COL_ID}`).value = "1";
    submit("fpl-columns-form");
    expect(h.check()?.matches[1]).toMatchObject({ status: "found", decided: "same" });
  });

  it("gives a starter note when the person says the places differ, and forgets answers when the list changes", () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${decisionId(3, "different")}`).checked = true;
    submit("fpl-decide-form");
    const starter = importNotes(decodeJson('a[download="starter-notes-2026-11-21.json"]'));
    expect(starter.notes.map((n) => n.placeName)).toEqual(["New Bakery", "Pharmacy"]);
    read(NOTES, `${LIST}\nCafé,1 Oak St`);
    expect(h.decisions()).toEqual({});
  });
});

describe("files, language and removing", () => {
  it("opens the notes file and the list into their own boxes", async () => {
    const files: Record<string, string> = { "notes.json": NOTES, "list.csv": LIST };
    mount("en", (f) => Promise.resolve(files[f.name] ?? ""));
    for (const [id, name] of [["#fpl-notes-open", "notes.json"], ["#fpl-list-open", "list.csv"]] as const) {
      const input = $<HTMLInputElement>(id);
      Object.defineProperty(input, "files", { value: [new File(["x"], name)], configurable: true });
      input.dispatchEvent(new Event("change", { bubbles: true }));
      await tick();
    }
    expect($<HTMLTextAreaElement>("#fpl-notes").value).toBe(NOTES);
    expect($<HTMLTextAreaElement>("#fpl-list").value).toBe(LIST);
    expect(document.activeElement?.id).toBe("fpl-list");
    expect(await status()).toBe(C.opened.en);
  });

  it("refuses a file that is too large before reading it, in the right box", async () => {
    let reads = 0;
    mount("en", () => {
      reads++;
      return Promise.resolve("");
    });
    const big = new File(["x"], "big.csv");
    Object.defineProperty(big, "size", { value: MAX_FILE_BYTES + 1 });
    const input = $<HTMLInputElement>("#fpl-list-open");
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(reads).toBe(0);
    expect($("#fpl-errors").textContent).toBe(`${C.errorsTitle.en}${listErrorText("too-large", "en")}`);
  });

  it("says so when a file cannot be read", async () => {
    mount("en", () => Promise.reject(new Error("no")));
    const input = $<HTMLInputElement>("#fpl-notes-open");
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($("#fpl-status").textContent).toBe(C.readFailed.en);
    expect(document.activeElement?.id).toBe("fpl-notes-open");
  });

  it("ignores a file read that ends after the tool is closed", async () => {
    let finish: (s: string) => void = () => undefined;
    const h = mount("en", () => new Promise<string>((r) => (finish = r)));
    const input = $<HTMLInputElement>("#fpl-list-open");
    Object.defineProperty(input, "files", { value: [new File(["x"], "list.csv")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    h.destroy();
    handle = undefined;
    finish(LIST);
    await tick();
    expect(root.innerHTML).toBe("");
  });

  it("switches to French and keeps the results", () => {
    const h = mount();
    read();
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#fpl-title").textContent).toBe(C.title.fr);
    expect($("#fpl-missing").textContent).toBe("Lieux sans notes pour l’instant (1)");
    expect(h.check()?.matches).toHaveLength(3);
    expect(lastAudit()).toEqual([]);
  });

  it("removes the file, the list and the results, saves nothing, and removes its live region on destroy", async () => {
    const h = mount();
    read();
    $('[data-action="fpl-clear"]').click();
    expect(h.file()).toBeUndefined();
    expect(h.sheet()).toBeUndefined();
    expect(h.check()).toBeUndefined();
    expect(document.activeElement?.id).toBe("fpl-notes");
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

  it.each(["en", "fr"] as const)("passes with a problem in each box (%s)", async (l) => {
    mount(l);
    read("nope", "");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on the results (%s)", async (l) => {
    mount(l);
    read();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with a problem in the columns (%s)", async (l) => {
    mount(l);
    read();
    $<HTMLSelectElement>(`#${ADDRESS_COL_ID}`).value = "0";
    submit("fpl-columns-form");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});
