// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { FILE_MOVE_COPY as C, moveErrorText, problemText } from "./filemove-copy";
import { mountFileMove, type FileMoveHandle } from "./filemove-mount";
import { placeId } from "./places";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { decodeTextExportHref } from "./textexport";
import { MOVE_OPEN_ID, MOVE_TEXT_ID, NEW_ADDRESS_ID, NEW_ID, NEW_NAME_ID, SEARCH_ID, TARGET_SEARCH_ID, noteRadioId, placeRadioId, targetRadioId } from "./views-filemove";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const NOTES = [
  testNote("a1", "Café A", [{ key: "elevator", value: "yes" }], "10 King St W"),
  testNote("a2", "Café A", [{ key: "automatic-door", value: "no" }], "10 King St W"),
  testNote("b1", "Bakery", [], "20 King St W"),
  testNote("k1", "Kiosk", [], null),
];
const FILE = exportNotes(NOTES, "2026-11-01");
const CAFE = placeId({ placeName: "Café A", address: "10 King St W" });
const BAKERY = placeId({ placeName: "Bakery", address: "20 King St W" });
const KIOSK = placeId({ placeName: "Kiosk", address: undefined });

let root: HTMLElement;
let handle: FileMoveHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileMoveHandle {
  document.documentElement.lang = locale;
  handle = mountFileMove(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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
  $<HTMLTextAreaElement>(`#${MOVE_TEXT_ID}`).value = text;
  submit("fmv-file-form");
}

function pickPlace(id: string): void {
  $<HTMLInputElement>(`#${placeRadioId(id)}`).checked = true;
  submit("fmv-place-form");
}

function pickNote(id: string): void {
  $<HTMLInputElement>(`#${noteRadioId(id)}`).checked = true;
  submit("fmv-note-form");
}

function moveTo(id: string): void {
  $<HTMLInputElement>(`#${targetRadioId(id)}`).checked = true;
  submit("fmv-move-form");
}

function moveToNew(name: string, address: string): void {
  $<HTMLInputElement>(`#${NEW_ID}`).checked = true;
  $<HTMLInputElement>(`#${NEW_NAME_ID}`).value = name;
  $<HTMLInputElement>(`#${NEW_ADDRESS_ID}`).value = address;
  submit("fmv-move-form");
}

const labels = (form: string): string[] => Array.from(root.querySelectorAll(`#${form} label.choice`)).map((l) => l.textContent ?? "");
const copyNotes = () => importNotes(decodeURIComponent((root.querySelector('a[download^="notes-"]')?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, ""))).notes;

describe("choosing the place and the note", () => {
  it("lists every place once the file is read, focused and announced", async () => {
    mount();
    read();
    expect(labels("fmv-place-form")).toEqual(["Bakery, 20 King St W", "Café A, 10 King St W", "Kiosk, No address"]);
    expect(document.activeElement?.id).toBe("fmv-find");
    expect(await status()).toBe("3 places found.");
    expect(lastAudit()).toEqual([]);
  });

  it("finds places by every word of the search", () => {
    mount();
    read();
    $<HTMLInputElement>(`#${SEARCH_ID}`).value = "kiosk";
    submit("fmv-find-form");
    expect(labels("fmv-place-form")).toEqual(["Kiosk, No address"]);
    expect(document.activeElement?.id).toBe("fmv-found");
  });

  it("shows the notes under the place chosen, focused and announced", async () => {
    const h = mount();
    read();
    pickPlace(CAFE);
    expect(h.place()?.id).toBe(CAFE);
    expect(labels("fmv-note-form")).toHaveLength(2);
    expect(document.activeElement?.id).toBe("fmv-notes");
    expect(await status()).toBe("Notes under “Café A, 10 King St W” (2)");
    expect(lastAudit()).toEqual([]);
  });

  it("names the problem when no place or no note is chosen, and links to the list", () => {
    mount();
    read();
    submit("fmv-place-form");
    expect($("#fmv-errors li").textContent).toBe(problemText("no-place", "en"));
    $<HTMLAnchorElement>("#fmv-errors a").click();
    expect(document.activeElement?.id).toBe(placeRadioId(BAKERY));
    pickPlace(CAFE);
    submit("fmv-note-form");
    expect($("#fmv-errors li").textContent).toBe(problemText("no-note", "en"));
    $<HTMLAnchorElement>("#fmv-errors a").click();
    expect(document.activeElement?.tagName).toBe("INPUT");
    expect(lastAudit()).toEqual([]);
  });

  it("goes back a step with the choice kept and focused", () => {
    const h = mount();
    read();
    pickPlace(CAFE);
    pickNote("a2");
    $('[data-action="fmv-back-notes"]').click();
    expect(h.note()).toBeUndefined();
    expect(document.activeElement?.id).toBe(noteRadioId("a2"));
    expect($<HTMLInputElement>(`#${noteRadioId("a2")}`).checked).toBe(true);
    $('[data-action="fmv-back-places"]').click();
    expect(h.place()).toBeUndefined();
    expect(document.activeElement?.id).toBe(placeRadioId(CAFE));
  });
});

describe("moving", () => {
  it("offers every other place and a place not in the file", async () => {
    const h = mount();
    read();
    pickPlace(CAFE);
    pickNote("a2");
    expect(h.note()?.id).toBe("a2");
    expect(labels("fmv-move-form")).toEqual(["Bakery, 20 King St W", "Kiosk, No address", C.newPlace.en]);
    expect(document.activeElement?.id).toBe("fmv-target");
    expect(await status()).toBe("Move the note made on 2026-10-01, under “Café A, 10 King St W”");
  });

  it("moves the note to a place in the file, reads the copy back and offers it", async () => {
    const h = mount();
    read();
    pickPlace(CAFE);
    pickNote("a2");
    moveTo(BAKERY);
    expect(h.changes()).toHaveLength(1);
    expect(h.check()).toEqual({ ok: true, notes: 4, places: 3 });
    expect(document.activeElement?.id).toBe("fmv-copy");
    expect(await status()).toBe(`${C.saved.en} ${C.checkOk.en}`);
    const a2 = copyNotes().find((n) => n.id === "a2");
    expect([a2?.placeName, a2?.address]).toEqual(["Bakery", "20 King St W"]);
    expect(a2?.facts).toEqual(NOTES[1]?.facts);
    expect($(".fmv-changes li").textContent).toBe("The note made on 2026-10-01 went from “Café A, 10 King St W” to “Bakery, 20 King St W”");
    // Back at the start, ready for another move.
    expect(root.querySelector("#fmv-find-form")).not.toBeNull();
    expect(lastAudit()).toEqual([]);
  });

  it("finds the place to move to with its own search", () => {
    mount();
    read();
    pickPlace(CAFE);
    pickNote("a1");
    $<HTMLInputElement>(`#${TARGET_SEARCH_ID}`).value = "kiosk";
    submit("fmv-target-find-form");
    expect(labels("fmv-move-form")).toEqual(["Kiosk, No address", C.newPlace.en]);
    expect(document.activeElement?.id).toBe("fmv-targets-found");
  });

  it("moves the note to a place not in the file", () => {
    const h = mount();
    read();
    pickPlace(KIOSK);
    pickNote("k1");
    moveToNew("Deli", "5 Elm St");
    expect(h.changes()[0]?.existing).toBe(false);
    expect($(".fmv-changes li").textContent).toContain("(a place not in the file)");
    expect(copyNotes().find((n) => n.id === "k1")?.placeName).toBe("Deli");
  });

  it("names the problems with a new place, keeps what was typed, and links to the field", () => {
    const h = mount();
    read();
    pickPlace(KIOSK);
    pickNote("k1");
    moveToNew("", "a\tb");
    expect(Array.from(root.querySelectorAll("#fmv-errors li")).map((li) => li.textContent)).toEqual([problemText("name-empty", "en"), problemText("address-control", "en")]);
    expect($<HTMLInputElement>(`#${NEW_ADDRESS_ID}`).value).toBe("a\tb");
    expect($<HTMLInputElement>(`#${NEW_ID}`).checked).toBe(true);
    root.querySelectorAll<HTMLAnchorElement>("#fmv-errors a")[1]?.click();
    expect(document.activeElement?.id).toBe(NEW_ADDRESS_ID);
    expect(h.changes()).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it("asks for a new place already in the file to be chosen from the list", () => {
    mount();
    read();
    pickPlace(KIOSK);
    pickNote("k1");
    moveToNew("bakery", "20 King St W");
    expect($("#fmv-errors li").textContent).toBe(problemText("exists", "en"));
    $<HTMLAnchorElement>("#fmv-errors a").click();
    expect(document.activeElement?.id).toBe(TARGET_SEARCH_ID);
  });

  it("says when no target is chosen, or the note is already under that place", () => {
    mount();
    read();
    pickPlace(KIOSK);
    pickNote("k1");
    submit("fmv-move-form");
    expect($("#fmv-errors li").textContent).toBe(problemText("no-target", "en"));
    moveToNew("Kiosk", "");
    expect($("#fmv-errors li").textContent).toBe(problemText("same-place", "en"));
  });

  it("moves several notes, and takes back the last move", async () => {
    const h = mount();
    read();
    pickPlace(CAFE);
    pickNote("a2");
    moveTo(BAKERY);
    pickPlace(KIOSK);
    pickNote("k1");
    moveTo(BAKERY);
    expect(h.changes()).toHaveLength(2);
    expect(root.querySelector('a[download="notes-2-moves-2026-11-21.json"]')).not.toBeNull();
    $('[data-action="fmv-undo"]').click();
    expect(h.changes()).toHaveLength(1);
    expect(h.notes().find((n) => n.id === "k1")?.placeName).toBe("Kiosk");
    expect(document.activeElement?.id).toBe("fmv-changes");
    expect(await status()).toBe(C.undone.en);
    $('[data-action="fmv-undo"]').click();
    expect(h.check()).toBeUndefined();
    expect([...h.notes()].sort((a, b) => a.id.localeCompare(b.id))).toEqual([...NOTES].sort((a, b) => a.id.localeCompare(b.id)));
    expect(lastAudit()).toEqual([]);
  });

  it("does not change the person's text, and starts over when another file is read", () => {
    const h = mount();
    read();
    pickPlace(KIOSK);
    pickNote("k1");
    moveTo(BAKERY);
    expect($<HTMLTextAreaElement>(`#${MOVE_TEXT_ID}`).value).toBe(FILE);
    read(exportNotes([testNote("x", "X", [], "1 Bay St")], "2026-11-01"));
    expect(h.changes()).toEqual([]);
    expect(labels("fmv-place-form")).toEqual(["X, 1 Bay St"]);
  });
});

describe("files, language and removing the file", () => {
  it("names the problem when the text is not an export", () => {
    mount();
    read("nope");
    expect($("#fmv-errors a").textContent).toBe(moveErrorText("not-json", "en"));
    $<HTMLAnchorElement>("#fmv-errors a").click();
    expect(document.activeElement?.id).toBe(MOVE_TEXT_ID);
  });

  it("opens a file into the box", async () => {
    const h = mount("en", () => Promise.resolve(FILE));
    const input = $<HTMLInputElement>(`#${MOVE_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($<HTMLTextAreaElement>(`#${MOVE_TEXT_ID}`).value).toBe(FILE);
    expect(h.notes()).toEqual([]);
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
    const input = $<HTMLInputElement>(`#${MOVE_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(reads).toBe(0);
    expect($("#fmv-errors").textContent).toContain(moveErrorText("too-large", "en"));
  });

  it("says so when a file cannot be read, and does nothing after destroy", async () => {
    mount("en", () => Promise.reject(new Error("no")));
    const input = $<HTMLInputElement>(`#${MOVE_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($("#fmv-status").textContent).toBe(C.readFailed.en);
    expect(document.activeElement?.id).toBe(MOVE_OPEN_ID);
    handle?.destroy();
    let finish: (s: string) => void = () => undefined;
    const h = mount("en", () => new Promise<string>((r) => (finish = r)));
    const again = $<HTMLInputElement>(`#${MOVE_OPEN_ID}`);
    Object.defineProperty(again, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    again.dispatchEvent(new Event("change", { bubbles: true }));
    h.destroy();
    handle = undefined;
    finish(FILE);
    await tick();
    expect(root.innerHTML).toBe("");
  });

  it("switches to French and keeps the step, what was typed and the moves", () => {
    const h = mount();
    read();
    pickPlace(CAFE);
    pickNote("a2");
    moveTo(BAKERY);
    pickPlace(KIOSK);
    pickNote("k1");
    $<HTMLInputElement>(`#${NEW_NAME_ID}`).value = "Dépanneur";
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#fmv-title").textContent).toBe(C.title.fr);
    expect($<HTMLInputElement>(`#${NEW_NAME_ID}`).value).toBe("Dépanneur");
    expect($(".fmv-changes li").textContent).toBe("La note créée le 2026-10-01 est passée de «\u202FCafé A, 10 King St W\u202F» à «\u202FBakery, 20 King St W\u202F»");
    expect(root.querySelector('a[download="notes-1-deplacement-2026-11-21.json"]')).not.toBeNull();
    expect(lastAudit()).toEqual([]);
  });

  it("removes the file and the moves, saves nothing, and removes its live region on destroy", async () => {
    const h = mount();
    read();
    pickPlace(KIOSK);
    pickNote("k1");
    moveTo(BAKERY);
    $('[data-action="fmv-clear"]').click();
    expect(h.notes()).toEqual([]);
    expect(h.changes()).toEqual([]);
    expect(h.check()).toBeUndefined();
    expect(document.activeElement?.id).toBe(MOVE_TEXT_ID);
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

  it.each(["en", "fr"] as const)("passes on the notes of a place (%s)", async (l) => {
    mount(l);
    read();
    pickPlace(CAFE);
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on where the note goes, with problems (%s)", async (l) => {
    mount(l);
    read();
    pickPlace(KIOSK);
    pickNote("k1");
    moveToNew("", "");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on the moves and the copy (%s)", async (l) => {
    mount(l);
    read();
    pickPlace(KIOSK);
    pickNote("k1");
    moveTo(BAKERY);
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});
