// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes } from "./exchange";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { FILE_LETTERS_COPY as C, lettersErrorText, problemText, trackErrorText } from "./fileletters-copy";
import { mountFileLetters, type FileLettersHandle } from "./fileletters-mount";
import { AXE_OPTIONS } from "./shelltest";
import { decodeTextExportHref } from "./textexport";
import { testNote } from "./testnotes";
import { CONTACT_ID, OLD_ID, SENDER_ID, TRACK_OPEN_ID, TRACK_TEXT_ID, languageId } from "./views-fileletters";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const FILE = exportNotes(
  [
    testNote("a", "Library", [{ key: "elevator", value: "yes" }], "100 King St W, Toronto ON M5H 2N2"),
    testNote("c", "Deli", [
      { key: "step-free-entry", value: "yes", on: "2024-01-15" },
      { key: "accessible-washroom", value: "yes" },
      { key: "automatic-door", value: "yes" },
      { key: "elevator", value: "yes" },
    ], "7 Queen St E"),
    testNote("n", "Cart", [], null),
  ],
  "2026-11-01",
);

let root: HTMLElement;
let handle: FileLettersHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileLettersHandle {
  document.documentElement.lang = locale;
  handle = mountFileLetters(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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
  $<HTMLTextAreaElement>("#flt-text").value = text;
  submit("flt-file-form");
}

function write(sender = "Ana Silva", contact = "ana@example.org"): void {
  $<HTMLInputElement>(`#${SENDER_ID}`).value = sender;
  $<HTMLInputElement>(`#${CONTACT_ID}`).value = contact;
  submit("flt-letter-form");
}

describe("reading a file", () => {
  it("asks who is writing once the file is read, writing no letter yet", async () => {
    const h = mount();
    read();
    expect(h.file()?.places).toHaveLength(3);
    expect(h.letters()).toBeUndefined();
    expect(document.activeElement?.id).toBe("flt-form");
    expect(await status()).toBe(C.formTitle.en);
    expect(root.querySelector("#flt-results")).toBeNull();
    expect(lastAudit()).toEqual([]);
  });

  it("names the problem when the text is not an export, and links to the box", () => {
    mount();
    read("hello");
    expect(document.activeElement?.id).toBe("flt-errors");
    expect($("#flt-errors").textContent).toContain(lettersErrorText("not-json", "en"));
    $<HTMLAnchorElement>("#flt-errors a").click();
    expect(document.activeElement?.id).toBe("flt-text");
    expect(lastAudit()).toEqual([]);
  });

  it("starts the letters' language as the page's", () => {
    mount("fr");
    read();
    expect($<HTMLInputElement>(`#${languageId("fr")}`).checked).toBe(true);
  });
});

describe("writing the letters", () => {
  it("writes a letter for each place with something to ask, focuses the results and announces the count", async () => {
    const h = mount();
    read();
    write();
    expect(h.letters()?.letters.map((l) => l.place.name)).toEqual(["Library", "Cart"]);
    expect(h.options()).toEqual({ sender: "Ana Silva", contact: "ana@example.org", language: "en", includeOld: false });
    expect(document.activeElement?.id).toBe("flt-results");
    expect(await status()).toBe(`${C.made.en} 2 letters, one for each place with something to ask. 1 place with nothing to ask gets no letter.`);
    expect(lastAudit()).toEqual([]);
  });

  it("asks about old records too when ticked", () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${OLD_ID}`).checked = true;
    write();
    expect(h.letters()?.letters.map((l) => l.place.name)).toEqual(["Library", "Deli", "Cart"]);
  });

  it("signs every letter with the typed name, in the chosen language", () => {
    mount();
    read();
    $<HTMLInputElement>(`#${languageId("fr")}`).checked = true;
    write("  Groupe   du quartier ", "");
    const all = decodeTextExportHref($<HTMLAnchorElement>("a.linkbtn").getAttribute("href") ?? "") ?? "";
    expect(all).toContain("Bonjour,");
    expect(all).not.toContain("Hello,");
    expect(all.split("Merci,\nGroupe du quartier\n")).toHaveLength(3);
    expect(all).not.toContain("Vous pouvez répondre");
  });

  it("asks for a name, links to the field, and writes nothing until it is given", () => {
    const h = mount();
    read();
    write("   ");
    expect(h.letters()).toBeUndefined();
    expect(document.activeElement?.id).toBe("flt-errors");
    expect($("#flt-errors").textContent).toContain(problemText("sender-empty", "en"));
    $<HTMLAnchorElement>("#flt-errors a").click();
    expect(document.activeElement?.id).toBe(SENDER_ID);
    expect(lastAudit()).toEqual([]);
    write("Ana");
    expect(h.letters()?.letters).toHaveLength(2);
    expect(root.querySelector("#flt-errors")).toBeNull();
  });

  it("keeps the letters on screen as they were written while the form is changed", () => {
    const h = mount();
    read();
    write("Ana");
    $<HTMLInputElement>(`#${SENDER_ID}`).value = "";
    submit("flt-letter-form");
    expect(root.querySelector("#flt-results")).not.toBeNull();
    expect(h.options()?.sender).toBe("Ana");
  });

  it("starts again with no letters when another file is read", () => {
    const h = mount();
    read();
    write();
    read(exportNotes([testNote("x", "Kiosk", [], "5 Elm Ave")], "2026-11-01"));
    expect(h.letters()).toBeUndefined();
    expect($<HTMLInputElement>(`#${SENDER_ID}`).value).toBe("Ana Silva");
  });
});

describe("files, language and removing", () => {
  it("opens a file into the box", async () => {
    const h = mount("en", () => Promise.resolve(FILE));
    const input = $<HTMLInputElement>("#flt-open");
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($<HTMLTextAreaElement>("#flt-text").value).toBe(FILE);
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
    const input = $<HTMLInputElement>("#flt-open");
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(reads).toBe(0);
    expect($("#flt-errors").textContent).toContain(lettersErrorText("too-large", "en"));
  });

  it("says so when a file cannot be read, and ignores a read that ends after the tool is closed", async () => {
    const first = mount("en", () => Promise.reject(new Error("no")));
    const input = $<HTMLInputElement>("#flt-open");
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($("#flt-status").textContent).toBe(C.readFailed.en);
    first.destroy();

    let finish: (s: string) => void = () => undefined;
    const late = mount("en", () => new Promise<string>((r) => (finish = r)));
    const input2 = $<HTMLInputElement>("#flt-open");
    Object.defineProperty(input2, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input2.dispatchEvent(new Event("change", { bubbles: true }));
    late.destroy();
    handle = undefined;
    finish(FILE);
    await tick();
    expect(root.innerHTML).toBe("");
  });

  it("switches the page to French, keeping what was typed and the letters' own language", () => {
    const h = mount();
    read();
    write("Ana");
    $<HTMLInputElement>(`#${CONTACT_ID}`).value = "typed later";
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#flt-title").textContent).toBe(C.title.fr);
    expect($<HTMLInputElement>(`#${CONTACT_ID}`).value).toBe("typed later");
    expect($<HTMLInputElement>(`#${languageId("en")}`).checked).toBe(true);
    expect($("pre.flt-letter").textContent).toContain("Hello,");
    expect(lastAudit()).toEqual([]);
  });

  it("removes the file, the name and the letters, saves nothing, and removes its live region on destroy", async () => {
    const h = mount();
    read();
    write();
    $('[data-action="flt-clear"]').click();
    expect(h.file()).toBeUndefined();
    expect(h.letters()).toBeUndefined();
    expect(h.options()).toBeUndefined();
    expect(root.querySelector(`#${SENDER_ID}`)).toBeNull();
    expect(document.activeElement?.id).toBe("flt-text");
    expect(await status()).toBe(C.cleared.en);
    expect(window.localStorage.length).toBe(0);
    read();
    expect($<HTMLInputElement>(`#${SENDER_ID}`).value).toBe("");
    h.destroy();
    handle = undefined;
    expect(document.querySelectorAll('[role="status"][aria-live]')).toHaveLength(0);
  });
});

const LIST = "place_name,address,sent_on,reply_on\r\nLibrary,100 King St W,2026-09-01,\r\nBank,,2026-11-01,2026-11-10\r\nCart,,,\r\nDeli,,2026-13-01,\r\n";

function readList(text = LIST): void {
  $<HTMLTextAreaElement>(`#${TRACK_TEXT_ID}`).value = text;
  submit("flt-track-form");
}

describe("following up on letters", () => {
  it("sorts the list, focuses its summary and announces it", async () => {
    const h = mount();
    readList();
    expect(h.tracking()?.waiting.map((w) => [w.name, w.days])).toEqual([["Library", 81]]);
    expect(h.tracking()?.unusable.map((r) => r.problem)).toEqual(["sent-date"]);
    expect(document.activeElement?.id).toBe("flt-track-summary");
    expect(await status()).toBe("4 letters: 1 not sent yet, 1 waiting for a reply (1 for 30 days or more), 1 replied, 1 row to fix.");
    expect($("#flt-track-due").textContent).toBe(C.track.followUp.en);
    expect(lastAudit()).toEqual([]);
  });

  it("works without a notes file, and keeps the letters when the list is read", () => {
    const h = mount();
    readList();
    expect(h.file()).toBeUndefined();
    read();
    write();
    readList();
    expect(h.letters()?.letters).toHaveLength(2);
    expect(h.tracking()).toBeDefined();
  });

  it("names missing columns and links to the box", () => {
    const h = mount();
    readList("place_name,address\nA,B\n");
    expect(h.tracking()).toBeUndefined();
    expect(document.activeElement?.id).toBe("flt-track-errors");
    expect($("#flt-track-errors").textContent).toContain(trackErrorText("missing-columns", ["sent_on", "reply_on"], "en"));
    $<HTMLAnchorElement>("#flt-track-errors a").click();
    expect(document.activeElement?.id).toBe(TRACK_TEXT_ID);
    expect(lastAudit()).toEqual([]);
  });

  it("opens a list into its box, refusing one too large", async () => {
    mount("en", () => Promise.resolve(LIST));
    const input = $<HTMLInputElement>(`#${TRACK_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "letters.csv")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    // A text box keeps line ends as "\n"; the list is read the same either way.
    expect($<HTMLTextAreaElement>(`#${TRACK_TEXT_ID}`).value).toBe(LIST.replace(/\r\n/g, "\n"));
    expect(await status()).toBe(C.track.opened.en);

    const big = new File(["x"], "big.csv");
    Object.defineProperty(big, "size", { value: MAX_FILE_BYTES + 1 });
    const input2 = $<HTMLInputElement>(`#${TRACK_OPEN_ID}`);
    Object.defineProperty(input2, "files", { value: [big], configurable: true });
    input2.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($("#flt-track-errors").textContent).toContain(trackErrorText("too-large", undefined, "en"));
  });

  it("removes the list alone, saving nothing", async () => {
    const h = mount();
    read();
    readList();
    $('[data-action="flt-track-clear"]').click();
    expect(h.tracking()).toBeUndefined();
    expect(h.file()).toBeDefined();
    expect($<HTMLTextAreaElement>(`#${TRACK_TEXT_ID}`).value).toBe("");
    expect(document.activeElement?.id).toBe(TRACK_TEXT_ID);
    expect(await status()).toBe(C.track.cleared.en);
    expect(window.localStorage.length).toBe(0);
  });

  it("keeps the list when the page switches language", () => {
    const h = mount();
    readList();
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#flt-track-summary").textContent).toContain("4 lettres");
    expect(lastAudit()).toEqual([]);
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

  it.each(["en", "fr"] as const)("passes on the signer's form with problems (%s)", async (l) => {
    mount(l);
    read();
    write("", "x".repeat(200));
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on the letters, one opened (%s)", async (l) => {
    mount(l);
    read();
    $<HTMLInputElement>(`#${languageId("both")}`).checked = true;
    write();
    $<HTMLDetailsElement>("details").open = true;
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on the follow-up list (%s)", async (l) => {
    mount(l);
    readList();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on a follow-up list problem (%s)", async (l) => {
    mount(l);
    readList("a,b\n1,2\n");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});
