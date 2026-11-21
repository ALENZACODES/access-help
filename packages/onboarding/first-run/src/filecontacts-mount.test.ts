// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { FILE_CONTACTS_COPY as C, contactsErrorText } from "./filecontacts-copy";
import { mountFileContacts, type FileContactsHandle } from "./filecontacts-mount";
import { looksLikeEmail, looksLikePhone } from "./form";
import { parseNote, type Note } from "./model";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { CONTACTS_OPEN_ID, CONTACTS_TEXT_ID, fieldId, pickId } from "./views-filecontacts";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function withText(n: Note, note: string): Note {
  const out = parseNote({ ...n, note });
  if (!out) throw new Error("bad note");
  return out;
}

const FILE = exportNotes(
  [
    withText(testNote("a", "Library", [{ key: "elevator", value: "yes", source: "Walk by jo@example.org" }], "1 King St W"), "Ask Jo at jo@example.org."),
    testNote("b", "Kiosk 905-555-0102", [{ key: "elevator", value: "no", source: "Walk by jo@example.org" }], "2 King St W"),
    testNote("c", "Park", [{ key: "elevator", value: "yes" }], "3 King St W"),
  ],
  "2026-11-01",
);
// Items: the Kiosk name, the Library note text, then the source.
const NAME = 0;
const TEXT = 1;
const SOURCE = 2;

let root: HTMLElement;
let handle: FileContactsHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileContactsHandle {
  document.documentElement.lang = locale;
  handle = mountFileContacts(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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
  $<HTMLTextAreaElement>(`#${CONTACTS_TEXT_ID}`).value = text;
  submit("fct-file-form");
}

const check = (i: number, p: "keep" | "remove" | "clear" | "text"): void => {
  $<HTMLInputElement>(`#${pickId(i, p)}`).checked = true;
};

const write = (i: number, value: string): void => {
  check(i, "text");
  $<HTMLInputElement>(`#${fieldId(i)}`).value = value;
};

function copyText(): string {
  const href = root.querySelector('a[download="notes-without-contact-details-2026-11-21.json"]')?.getAttribute("href") ?? "";
  return decodeURIComponent(href.replace(/^data:application\/json;charset=utf-8,/, ""));
}

const noteIn = (id: string): Note | undefined => importNotes(copyText()).notes.find((n) => n.id === id);
const errorLinks = (): string[] => Array.from(root.querySelectorAll("#fct-errors a")).map((a) => a.textContent ?? "");
const changes = (): string[] => Array.from(root.querySelectorAll(".fct-changes li")).map((li) => li.textContent ?? "");

describe("reading a file", () => {
  it("lists the contact details found, moves focus to them and announces the summary", async () => {
    const h = mount();
    read();
    expect(document.activeElement?.id).toBe("fct-results");
    expect(h.report()?.findings.map((f) => f.id)).toEqual(["name|b", "note|a", "source|Walk by jo@example.org"]);
    expect(await status()).toBe("3 notes: 2 emails and 1 phone number in 3 items.");
    expect(lastAudit()).toEqual([]);
  });

  it("names the problem when the text is not an export, and its link moves focus to the box", () => {
    const h = mount();
    read("[]");
    expect(document.activeElement?.id).toBe("fct-errors");
    expect(errorLinks()).toEqual([contactsErrorText("wrong-format", "en")]);
    expect(h.file()).toBeUndefined();
    root.querySelector<HTMLAnchorElement>("#fct-errors a")?.click();
    expect(document.activeElement?.id).toBe(CONTACTS_TEXT_ID);
  });
});

describe("making the copy", () => {
  it("removes every detail the person chooses, leaving a copy with none, and announces it", async () => {
    const h = mount();
    read();
    check(NAME, "remove");
    check(TEXT, "remove");
    write(SOURCE, "Branch walk");
    submit("fct-fix-form");
    expect(document.activeElement?.id).toBe("fct-copy");
    expect(h.copy()).toMatchObject({ changed: 3, notesChanged: 2, stillHas: 0 });
    expect(await status()).toBe(`${C.made.en} 3 items changed in 2 notes.`);
    expect(changes()).toEqual(["Place name, Kiosk 905-555-0102: Kiosk", "Note text, Library: Ask Jo at.", "Source name: Branch walk"]);
    const text = copyText();
    expect(looksLikeEmail(text) || looksLikePhone(text)).toBe(false);
    expect(importNotes(text).rejected).toBe(0);
    expect(noteIn("a")?.facts.find((f) => f.key === "elevator")?.provenance).toEqual({ source: "Branch walk", licence: "CC0-1.0", recordedOn: "2026-10-01" });
    expect(lastAudit()).toEqual([]);
  });

  it("removes a whole note text", () => {
    mount();
    read();
    check(TEXT, "clear");
    submit("fct-fix-form");
    expect(noteIn("a")?.note).toBeUndefined();
    expect(changes()).toEqual(["Note text, Library: note text removed"]);
  });

  it("keeps a detail the person writes back in, and says so", () => {
    const h = mount();
    read();
    write(NAME, "Kiosk (905-555-0102)");
    submit("fct-fix-form");
    expect(h.copy()).toMatchObject({ changed: 1, stillHas: 1 });
    expect($("#fct-copy-summary").textContent).toBe("1 item changed in 1 note; 1 still holds contact details, as you chose.");
    expect($(`#w-${fieldId(NAME)}`).textContent).toBe(C.stillWarning.en);
  });

  it("asks for at least one change when everything is kept, linking to the first item", () => {
    const h = mount();
    read();
    submit("fct-fix-form");
    expect(document.activeElement?.id).toBe("fct-errors");
    expect(errorLinks()).toEqual([C.noneChanged.en]);
    expect(h.copy()).toBeUndefined();
    root.querySelector<HTMLAnchorElement>("#fct-errors a")?.click();
    expect(document.activeElement?.id).toBe(pickId(0, "keep"));
    expect(lastAudit()).toEqual([]);
  });

  it("counts writing the same text back as no change", () => {
    const h = mount();
    read();
    check(NAME, "text");
    submit("fct-fix-form");
    expect(errorLinks()).toEqual([C.noneChanged.en]);
    expect(h.copy()).toBeUndefined();
  });

  it("lists every problem with written text, keeps what was written and makes no copy", () => {
    const h = mount();
    read();
    write(NAME, "");
    write(SOURCE, "Contributor report");
    submit("fct-fix-form");
    expect(errorLinks()).toEqual([
      "Text for item 1 — Write the text, or choose Keep it as it is.",
      "Text for item 3 — Contributor report is the App’s own label. Choose another name.",
    ]);
    expect($(`#${fieldId(SOURCE)}`).getAttribute("aria-invalid")).toBe("true");
    expect($<HTMLInputElement>(`#${fieldId(SOURCE)}`).value).toBe("Contributor report");
    expect(h.copy()).toBeUndefined();
    root.querySelectorAll<HTMLAnchorElement>("#fct-errors a")[1]?.click();
    expect(document.activeElement?.id).toBe(fieldId(SOURCE));
    expect(lastAudit()).toEqual([]);
  });

  it("allows an empty note text, which removes it", () => {
    mount();
    read();
    write(TEXT, "");
    submit("fct-fix-form");
    expect(root.querySelector("#fct-errors")).toBeNull();
    expect(noteIn("a")?.note).toBeUndefined();
  });

  it("keeps line breaks in rewritten note text", () => {
    mount();
    read();
    write(TEXT, "Lift by the back door.\nAsk at the desk.");
    submit("fct-fix-form");
    expect(noteIn("a")?.note).toBe("Lift by the back door.\nAsk at the desk.");
  });

  it("drops the copy and the choices when a file is read again", () => {
    const h = mount();
    read();
    check(TEXT, "clear");
    submit("fct-fix-form");
    read();
    expect(h.copy()).toBeUndefined();
    expect(root.querySelector("#fct-copy")).toBeNull();
    expect($<HTMLInputElement>(`#${pickId(TEXT, "keep")}`).checked).toBe(true);
  });

  it("finds nothing left in the copy when it is read back", () => {
    mount();
    read();
    check(NAME, "remove");
    check(TEXT, "clear");
    check(SOURCE, "text");
    $<HTMLInputElement>(`#${fieldId(SOURCE)}`).value = "Walk";
    submit("fct-fix-form");
    read(copyText());
    expect($("#fct-none").textContent).toBe(C.none.en);
  });
});

describe("the language", () => {
  it("keeps the file, choices and copy when switching to French", () => {
    const h = mount();
    read();
    check(NAME, "remove");
    submit("fct-fix-form");
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("h2").textContent).toBe(C.title.fr);
    expect($<HTMLInputElement>(`#${pickId(NAME, "remove")}`).checked).toBe(true);
    expect($("#fct-copy-summary").textContent).toBe("1 élément changé dans 1 note.");
    expect(root.querySelector('a[download="notes-sans-coordonnees-2026-11-21.json"]')).not.toBeNull();
    expect(lastAudit()).toEqual([]);
  });

  it("keeps unfinished text when switching", () => {
    const h = mount();
    read();
    write(TEXT, "Ask Jo at the d");
    h.setLocale("fr");
    expect($<HTMLInputElement>(`#${pickId(TEXT, "text")}`).checked).toBe(true);
    expect($<HTMLTextAreaElement>(`#${fieldId(TEXT)}`).value).toBe("Ask Jo at the d");
  });
});

describe("opening and removing", () => {
  it("puts an opened file in the box without reading it", async () => {
    const h = mount("en", async () => FILE);
    const input = $<HTMLInputElement>(`#${CONTACTS_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File([FILE], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($<HTMLTextAreaElement>(`#${CONTACTS_TEXT_ID}`).value).toBe(FILE);
    expect(h.file()).toBeUndefined();
    expect(document.activeElement?.id).toBe(CONTACTS_TEXT_ID);
    expect(await status()).toBe(C.opened.en);
  });

  it("refuses a file that is too large before reading it", async () => {
    let called = false;
    mount("en", async () => {
      called = true;
      return "";
    });
    const input = $<HTMLInputElement>(`#${CONTACTS_OPEN_ID}`);
    const big = new File(["x"], "big.json");
    Object.defineProperty(big, "size", { value: MAX_FILE_BYTES + 1 });
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(called).toBe(false);
    expect(errorLinks()).toEqual([contactsErrorText("too-large", "en")]);
  });

  it("says when a file cannot be opened, and keeps focus on the picker", async () => {
    mount("en", async () => {
      throw new Error("no");
    });
    const input = $<HTMLInputElement>(`#${CONTACTS_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "a.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($("#fct-status").textContent).toBe(C.readFailed.en);
    expect(document.activeElement?.id).toBe(CONTACTS_OPEN_ID);
  });

  it("removes the file, the choices and the copy from the page", async () => {
    const h = mount();
    read();
    check(TEXT, "clear");
    submit("fct-fix-form");
    root.querySelector<HTMLButtonElement>('[data-action="fct-clear"]')?.click();
    expect(h.file()).toBeUndefined();
    expect(h.copy()).toBeUndefined();
    expect($<HTMLTextAreaElement>(`#${CONTACTS_TEXT_ID}`).value).toBe("");
    expect(root.querySelector("#fct-results")).toBeNull();
    expect(root.textContent).not.toContain("jo@example.org");
    expect(document.activeElement?.id).toBe(CONTACTS_TEXT_ID);
    expect(await status()).toBe(C.cleared.en);
  });

  it("does nothing after it is destroyed, even when a read finishes late", async () => {
    let finish: (s: string) => void = () => undefined;
    const h = mount("en", () => new Promise<string>((r) => (finish = r)));
    const input = $<HTMLInputElement>(`#${CONTACTS_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "a.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    h.destroy();
    handle = undefined;
    finish(FILE);
    await tick();
    expect(root.innerHTML).toBe("");
  });

  it("saves nothing to storage", () => {
    mount();
    read();
    check(TEXT, "clear");
    submit("fct-fix-form");
    expect(window.localStorage.length).toBe(0);
  });
});

describe("accessibility of the mounted tool", () => {
  for (const l of ["en", "fr"] as const) {
    it(`has no axe problems with items, errors and a copy (${l})`, async () => {
      mount(l);
      read();
      write(NAME, "");
      submit("fct-fix-form");
      expect(root.querySelector("#fct-errors")).not.toBeNull();
      let r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => v.id)).toEqual([]);
      $<HTMLInputElement>(`#${fieldId(NAME)}`).value = "Kiosk";
      submit("fct-fix-form");
      expect(root.querySelector("#fct-copy")).not.toBeNull();
      r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => v.id)).toEqual([]);
      expect(lastAudit()).toEqual([]);
    });
  }

  it("works from the keyboard alone: every control can take focus", () => {
    mount();
    read();
    const controls = Array.from(root.querySelectorAll<HTMLElement>("input, textarea, button, a[href]"));
    expect(controls.length).toBeGreaterThan(10);
    for (const c of controls) {
      expect(c.getAttribute("tabindex"), c.outerHTML).not.toBe("-1");
      c.focus();
      expect(document.activeElement).toBe(c);
    }
  });
});
