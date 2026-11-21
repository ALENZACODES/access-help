// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { FILE_RENAME_COPY as C, problemText, renameErrorText } from "./filerename-copy";
import { mountFileRename, type FileRenameHandle } from "./filerename-mount";
import { placeId } from "./places";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { decodeTextExportHref } from "./textexport";
import { ADDRESS_ID, JOIN_ID, NAME_ID, RENAME_OPEN_ID, RENAME_TEXT_ID, SEARCH_ID, mixedId, pickId } from "./views-filerename";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const NOTES = [
  testNote("a1", "Café A", [{ key: "elevator", value: "yes" }], "10 King St W"),
  testNote("a2", "Cafe A", [{ key: "automatic-door", value: "no" }], "10 King St. W."),
  testNote("b", "Bakery", [], "20 King St W"),
  testNote("k", "Kiosk", [], null),
];
const FILE = exportNotes(NOTES, "2026-11-01");
const CAFE = placeId({ placeName: "Café A", address: "10 King St W" });
const BAKERY = placeId({ placeName: "Bakery", address: "20 King St W" });
const KIOSK = placeId({ placeName: "Kiosk", address: undefined });

let root: HTMLElement;
let handle: FileRenameHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileRenameHandle {
  document.documentElement.lang = locale;
  handle = mountFileRename(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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
  $<HTMLTextAreaElement>(`#${RENAME_TEXT_ID}`).value = text;
  submit("frn-file-form");
}

function choose(id: string): void {
  $<HTMLInputElement>(`#${pickId(id)}`).checked = true;
  submit("frn-pick-form");
}

function save(name: string, address: string, join?: boolean): void {
  $<HTMLInputElement>(`#${NAME_ID}`).value = name;
  $<HTMLInputElement>(`#${ADDRESS_ID}`).value = address;
  if (join !== undefined) $<HTMLInputElement>(`#${JOIN_ID}`).checked = join;
  submit("frn-edit-form");
}

const listed = (): string[] => Array.from(root.querySelectorAll("#frn-pick-form label")).map((l) => l.textContent ?? "");
const copyNotes = () => importNotes(decodeURIComponent((root.querySelector('a[download^="notes-renamed-"]')?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, ""))).notes;

describe("reading and choosing", () => {
  it("lists every place once the file is read, focuses the search and announces the count", async () => {
    mount();
    read();
    expect(listed()).toEqual(["Bakery, 20 King St W", "Café A, 10 King St W", "Kiosk, No address"]);
    expect(document.activeElement?.id).toBe("frn-find");
    expect(await status()).toBe("3 places found.");
    expect(lastAudit()).toEqual([]);
  });

  it("finds places by every word of the search", async () => {
    mount();
    read();
    $<HTMLInputElement>(`#${SEARCH_ID}`).value = "king cafe";
    submit("frn-find-form");
    expect(listed()).toEqual(["Café A, 10 King St W"]);
    expect(document.activeElement?.id).toBe("frn-found");
    expect(await status()).toBe("1 place found.");
  });

  it("names the problem when no place is chosen, and links to the first one", () => {
    const h = mount();
    read();
    submit("frn-pick-form");
    expect(document.activeElement?.id).toBe("frn-errors");
    expect($("#frn-errors li").textContent).toBe(problemText("no-choice", "en"));
    expect(h.editing()).toBeUndefined();
    $<HTMLAnchorElement>("#frn-errors a").click();
    expect(document.activeElement?.id).toBe(pickId(BAKERY));
    expect(lastAudit()).toEqual([]);
  });

  it("opens the place's form with its name and address, focused and announced", async () => {
    const h = mount();
    read();
    choose(CAFE);
    expect(h.editing()?.id).toBe(CAFE);
    expect(document.activeElement?.id).toBe("frn-edit");
    expect(await status()).toBe("Rename “Café A, 10 King St W”");
    expect($<HTMLInputElement>(`#${NAME_ID}`).value).toBe("Café A");
    expect($<HTMLInputElement>(`#${ADDRESS_ID}`).value).toBe("10 King St W");
    expect(root.querySelector("#frn-find-form")).toBeNull();
    expect(lastAudit()).toEqual([]);
  });

  it("goes back to the list with the place still chosen and focused", () => {
    const h = mount();
    read();
    choose(KIOSK);
    $('[data-action="frn-back"]').click();
    expect(h.editing()).toBeUndefined();
    expect(document.activeElement?.id).toBe(pickId(KIOSK));
    expect($<HTMLInputElement>(`#${pickId(KIOSK)}`).checked).toBe(true);
  });

  it("names the problem when the text is not an export", () => {
    mount();
    read("nope");
    expect($("#frn-errors a").textContent).toBe(renameErrorText("not-json", "en"));
    $<HTMLAnchorElement>("#frn-errors a").click();
    expect(document.activeElement?.id).toBe(RENAME_TEXT_ID);
  });
});

describe("places written more than one way", () => {
  it("lists them and opens the place's form from its button", async () => {
    const h = mount();
    read();
    expect($("#frn-mixed").textContent).toBe("Places written more than one way (1)");
    $(`#${mixedId(CAFE)}`).click();
    expect(h.editing()?.id).toBe(CAFE);
    expect(document.activeElement?.id).toBe("frn-edit");
    expect(await status()).toBe("Rename “Café A, 10 King St W”");
    expect(lastAudit()).toEqual([]);
  });

  it("no longer lists a place once one spelling is written into every note", () => {
    mount();
    read();
    $(`#${mixedId(CAFE)}`).click();
    save("Café A", "10 King St W");
    expect(root.querySelector("#frn-mixed")).toBeNull();
    expect(copyNotes().filter((n) => n.id.startsWith("a")).map((n) => n.address)).toEqual(["10 King St W", "10 King St W"]);
  });
});

describe("renaming", () => {
  it("writes one spelling into every note about the place, reads the copy back and offers it", async () => {
    const h = mount();
    read();
    choose(CAFE);
    save("Café Ardoise", "10 King St W");
    expect(h.changes()).toHaveLength(1);
    expect(h.check()).toEqual({ ok: true, notes: 4, places: 3 });
    expect(document.activeElement?.id).toBe("frn-copy");
    expect(await status()).toBe(`${C.saved.en} ${C.checkOk.en}`);
    expect(copyNotes().filter((n) => n.id.startsWith("a")).map((n) => [n.placeName, n.address])).toEqual([
      ["Café Ardoise", "10 King St W"],
      ["Café Ardoise", "10 King St W"],
    ]);
    expect($(".frn-changes li").textContent).toBe("“Café A, 10 King St W” became “Café Ardoise, 10 King St W” (2 notes)");
    // The search shows the place under its new name.
    expect(listed()).toContain("Café Ardoise, 10 King St W");
    expect(lastAudit()).toEqual([]);
  });

  it("keeps the records of the notes changed", () => {
    mount();
    read();
    choose(CAFE);
    save("Café Ardoise", "10 King St W");
    const a1 = copyNotes().find((n) => n.id === "a1");
    expect(a1?.facts).toEqual(NOTES[0]?.facts);
  });

  it("names problems with the name and address, keeps what was typed, and links to the field", () => {
    const h = mount();
    read();
    choose(BAKERY);
    save("", "a\tb");
    expect(Array.from(root.querySelectorAll("#frn-errors li")).map((li) => li.textContent)).toEqual([problemText("name-empty", "en"), problemText("address-control", "en")]);
    expect($<HTMLInputElement>(`#${ADDRESS_ID}`).value).toBe("a\tb");
    root.querySelectorAll<HTMLAnchorElement>("#frn-errors a")[1]?.click();
    expect(document.activeElement?.id).toBe(ADDRESS_ID);
    expect(h.changes()).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it("says when nothing would change", () => {
    mount();
    read();
    choose(BAKERY);
    save("Bakery", "20 King St W");
    expect($("#frn-errors li").textContent).toBe(problemText("unchanged", "en"));
  });

  it("asks before reading two places as one, and does it once the box is ticked", () => {
    const h = mount();
    read();
    choose(KIOSK);
    save("Bakery", "20 King St W");
    expect($("#frn-errors li").textContent).toBe(problemText("joins", "en"));
    expect($("#frn-joins").textContent).toContain("“Bakery, 20 King St W”");
    $<HTMLAnchorElement>("#frn-errors a").click();
    expect(document.activeElement?.id).toBe(JOIN_ID);
    expect(h.changes()).toEqual([]);
    save("Bakery", "20 King St W", true);
    expect(h.changes()[0]?.joined).toEqual({ name: "Bakery", address: "20 King St W" });
    expect(h.check()).toEqual({ ok: true, notes: 4, places: 2 });
    expect(lastAudit()).toEqual([]);
  });

  it("drops the box when the new name no longer matches another place", () => {
    mount();
    read();
    choose(KIOSK);
    save("Bakery", "20 King St W");
    save("Kiosk", "Union Station");
    expect(root.querySelector("#frn-errors")).toBeNull();
    expect(root.querySelector(`#${JOIN_ID}`)).toBeNull();
  });

  it("renames several places, and takes back the last change", async () => {
    const h = mount();
    read();
    choose(KIOSK);
    save("Kiosk", "Union Station");
    choose(BAKERY);
    save("Bread Shop", "20 King St W");
    expect(h.changes()).toHaveLength(2);
    expect($("#frn-changes").textContent).toBe("Changes in the copy (2)");
    expect(root.querySelector('a[download="notes-renamed-2-changes-2026-11-21.json"]')).not.toBeNull();
    $('[data-action="frn-undo"]').click();
    expect(h.changes()).toHaveLength(1);
    expect(h.notes().find((n) => n.id === "b")?.placeName).toBe("Bakery");
    expect(h.notes().find((n) => n.id === "k")?.address).toBe("Union Station");
    expect(document.activeElement?.id).toBe("frn-changes");
    expect(await status()).toBe(C.undone.en);
    $('[data-action="frn-undo"]').click();
    expect(h.changes()).toEqual([]);
    expect(h.check()).toBeUndefined();
    expect(root.querySelector("#frn-copy")).toBeNull();
    expect([...h.notes()].sort((a, b) => a.id.localeCompare(b.id))).toEqual([...NOTES].sort((a, b) => a.id.localeCompare(b.id)));
    expect(lastAudit()).toEqual([]);
  });

  it("does not change the person's text", () => {
    mount();
    read();
    choose(KIOSK);
    save("Kiosk", "Union Station");
    expect($<HTMLTextAreaElement>(`#${RENAME_TEXT_ID}`).value).toBe(FILE);
  });

  it("starts over when another file is read", () => {
    const h = mount();
    read();
    choose(KIOSK);
    save("Kiosk", "Union Station");
    read(exportNotes([testNote("x", "X", [], "1 Bay St")], "2026-11-01"));
    expect(h.changes()).toEqual([]);
    expect(h.check()).toBeUndefined();
    expect(listed()).toEqual(["X, 1 Bay St"]);
  });
});

describe("files, language and removing the file", () => {
  it("opens a file into the box", async () => {
    const h = mount("en", () => Promise.resolve(FILE));
    const input = $<HTMLInputElement>(`#${RENAME_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($<HTMLTextAreaElement>(`#${RENAME_TEXT_ID}`).value).toBe(FILE);
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
    const input = $<HTMLInputElement>(`#${RENAME_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(reads).toBe(0);
    expect($("#frn-errors").textContent).toContain(renameErrorText("too-large", "en"));
  });

  it("says so when a file cannot be read", async () => {
    mount("en", () => Promise.reject(new Error("no")));
    const input = $<HTMLInputElement>(`#${RENAME_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($("#frn-status").textContent).toBe(C.readFailed.en);
    expect(document.activeElement?.id).toBe(RENAME_OPEN_ID);
  });

  it("does nothing after destroy when a file finishes reading", async () => {
    let finish: (s: string) => void = () => undefined;
    const h = mount("en", () => new Promise<string>((r) => (finish = r)));
    const input = $<HTMLInputElement>(`#${RENAME_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    h.destroy();
    handle = undefined;
    finish(FILE);
    await tick();
    expect(root.innerHTML).toBe("");
  });

  it("switches to French and keeps the form, the changes and the copy", () => {
    const h = mount();
    read();
    choose(KIOSK);
    save("Kiosk", "Union Station");
    choose(BAKERY);
    $<HTMLInputElement>(`#${NAME_ID}`).value = "Boulangerie";
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#frn-title").textContent).toBe(C.title.fr);
    expect($<HTMLInputElement>(`#${NAME_ID}`).value).toBe("Boulangerie");
    expect($(".frn-changes li").textContent).toBe("«\u202FKiosk, Aucune adresse\u202F» est devenu «\u202FKiosk, Union Station\u202F» (1 note)");
    expect(root.querySelector('a[download="notes-renommees-1-modification-2026-11-21.json"]')).not.toBeNull();
    expect(lastAudit()).toEqual([]);
  });

  it("removes the file and the changes, saves nothing, and removes its live region on destroy", async () => {
    const h = mount();
    read();
    choose(KIOSK);
    save("Kiosk", "Union Station");
    $('[data-action="frn-clear"]').click();
    expect(h.notes()).toEqual([]);
    expect(h.changes()).toEqual([]);
    expect(h.check()).toBeUndefined();
    expect(document.activeElement?.id).toBe(RENAME_TEXT_ID);
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

  it.each(["en", "fr"] as const)("passes on the list of places (%s)", async (l) => {
    mount(l);
    read();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on the form with the join box and problems (%s)", async (l) => {
    mount(l);
    read();
    choose(KIOSK);
    save("Bakery", "20 King St W");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on the changes and the copy (%s)", async (l) => {
    mount(l);
    read();
    choose(KIOSK);
    save("Kiosk", "Union Station");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});
