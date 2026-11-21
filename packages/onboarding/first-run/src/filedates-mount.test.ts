// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { FILE_DATES_COPY as C, datesErrorText } from "./filedates-copy";
import { mountFileDates, type FileDatesHandle } from "./filedates-mount";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { DATES_OPEN_ID, DATES_TEXT_ID, keepId, suggestionId, typedFieldId, typedId, unknownId } from "./views-filedates";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const FILE = exportNotes(
  [
    testNote("lib", "Library", [{ key: "elevator", value: "yes", on: "2062-03-01", source: "Branch walk", licence: "CC-BY-4.0" }], "100 King St W"),
    testNote("kiosk", "Kiosk", [{ key: "automatic-door", value: "no", on: "2099-01-01" }], null),
    testNote("park", "Park", [{ key: "elevator", value: "yes", on: "2026-01-01" }], "5 Park Ave"),
  ],
  "2026-11-01",
);
// Kiosk comes before Library by name, so record 0 is the kiosk and record 1 the library.
const KIOSK = 0;
const LIB = 1;

let root: HTMLElement;
let handle: FileDatesHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileDatesHandle {
  document.documentElement.lang = locale;
  handle = mountFileDates(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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
  $<HTMLTextAreaElement>(`#${DATES_TEXT_ID}`).value = text;
  submit("fdt-file-form");
}

const check = (id: string): void => {
  $<HTMLInputElement>(`#${id}`).checked = true;
};

function copyText(): string {
  const href = root.querySelector('a[download="notes-dates-fixed-2026-11-21.json"]')?.getAttribute("href") ?? "";
  return decodeURIComponent(href.replace(/^data:application\/json;charset=utf-8,/, ""));
}

const errorLinks = (): string[] => Array.from(root.querySelectorAll("#fdt-errors a")).map((a) => a.textContent ?? "");

describe("reading a file", () => {
  it("lists the records dated after today, moves focus to them and announces the summary", async () => {
    const h = mount();
    read();
    expect(document.activeElement?.id).toBe("fdt-results");
    expect(h.report()?.future.map((f) => f.place.name)).toEqual(["Kiosk", "Library"]);
    expect(await status()).toBe("3 places, 3 records: 2 are dated after today, 1 with a suggested date.");
    expect(lastAudit()).toEqual([]);
  });

  it("names the problem when the text is not an export, and its link moves focus to the box", () => {
    const h = mount();
    read("nope");
    expect(document.activeElement?.id).toBe("fdt-errors");
    expect(errorLinks()).toEqual([datesErrorText("not-json", "en")]);
    expect(h.file()).toBeUndefined();
    root.querySelector<HTMLAnchorElement>("#fdt-errors a")?.click();
    expect(document.activeElement?.id).toBe(DATES_TEXT_ID);
    expect(lastAudit()).toEqual([]);
  });

  it("names an empty box", () => {
    mount();
    read("");
    expect(errorLinks()).toEqual([datesErrorText("empty", "en")]);
  });

  it("says so when nothing is dated after today", () => {
    mount();
    read(exportNotes([testNote("p", "Park", [{ key: "elevator", value: "yes" }])], "2026-11-01"));
    expect($("#fdt-none").textContent).toBe(C.none.en);
    expect(root.querySelector("#fdt-fix-form")).toBeNull();
  });
});

describe("making the copy", () => {
  it("applies a suggested date and Unknown, moves focus to the copy and announces what changed", async () => {
    const h = mount();
    read();
    check(suggestionId(LIB, 0));
    check(unknownId(KIOSK));
    submit("fdt-fix-form");
    expect(document.activeElement?.id).toBe("fdt-copy");
    expect(h.copy()).toMatchObject({ redated: 1, cleared: 1, kept: 0 });
    expect(await status()).toBe(`${C.made.en} 1 record was given another date, 1 set back to Unknown, 0 kept with their date after today.`);
    const back = importNotes(copyText());
    expect(back.rejected).toBe(0);
    const lib = back.notes.find((n) => n.id === "lib")?.facts.find((f) => f.key === "elevator");
    expect(lib).toEqual({ key: "elevator", value: "yes", provenance: { source: "Branch walk", licence: "CC-BY-4.0", recordedOn: "2026-03-01" } });
    expect(back.notes.find((n) => n.id === "kiosk")?.facts.find((f) => f.key === "automatic-door")?.value).toBe("unknown");
    expect(Array.from(root.querySelectorAll(".fdt-changes li")).map((li) => li.textContent)).toEqual([
      "Kiosk — Automatic door: set back to Unknown",
      "Library, 100 King St W — Elevator: 2062-03-01 → 2026-03-01",
    ]);
    expect(lastAudit()).toEqual([]);
  });

  it("applies a typed date and keeps the choices on screen", () => {
    const h = mount();
    read();
    check(typedId(KIOSK));
    $<HTMLInputElement>(`#${typedFieldId(KIOSK)}`).value = "2019-01-01";
    submit("fdt-fix-form");
    expect(h.copy()).toMatchObject({ redated: 1, cleared: 0, kept: 1 });
    expect($<HTMLInputElement>(`#${typedId(KIOSK)}`).checked).toBe(true);
    expect($<HTMLInputElement>(`#${typedFieldId(KIOSK)}`).value).toBe("2019-01-01");
    const back = importNotes(copyText());
    expect(back.notes.find((n) => n.id === "kiosk")?.facts.find((f) => f.key === "automatic-door")?.provenance?.recordedOn).toBe("2019-01-01");
  });

  it("asks for at least one change when every record is kept, linking to the first record", () => {
    const h = mount();
    read();
    submit("fdt-fix-form");
    expect(document.activeElement?.id).toBe("fdt-errors");
    expect(errorLinks()).toEqual([C.noneChanged.en]);
    expect(h.copy()).toBeUndefined();
    root.querySelector<HTMLAnchorElement>("#fdt-errors a")?.click();
    expect(document.activeElement?.id).toBe(keepId(0));
    expect(lastAudit()).toEqual([]);
  });

  it("lists every typed-date problem, keeps what was typed and makes no copy", () => {
    const h = mount();
    read();
    check(typedId(KIOSK));
    $<HTMLInputElement>(`#${typedFieldId(KIOSK)}`).value = "2030-01-01";
    check(typedId(LIB));
    submit("fdt-fix-form");
    expect(errorLinks()).toEqual(["Date for record 1 — Choose today or a day before it.", "Date for record 2 — Type a date, written like 2026-03-31."]);
    expect($(`#${typedFieldId(KIOSK)}`).getAttribute("aria-invalid")).toBe("true");
    expect($<HTMLInputElement>(`#${typedFieldId(KIOSK)}`).value).toBe("2030-01-01");
    expect(h.copy()).toBeUndefined();
    root.querySelectorAll<HTMLAnchorElement>("#fdt-errors a")[1]?.click();
    expect(document.activeElement?.id).toBe(typedFieldId(LIB));
    expect(lastAudit()).toEqual([]);
  });

  it("clears a typed-date problem once it is fixed", () => {
    const h = mount();
    read();
    check(typedId(KIOSK));
    $<HTMLInputElement>(`#${typedFieldId(KIOSK)}`).value = "March";
    submit("fdt-fix-form");
    expect(errorLinks()).toEqual(["Date for record 1 — Write the date like 2026-03-31."]);
    $<HTMLInputElement>(`#${typedFieldId(KIOSK)}`).value = "2026-03-31";
    submit("fdt-fix-form");
    expect(root.querySelector("#fdt-errors")).toBeNull();
    expect(h.copy()).toMatchObject({ redated: 1 });
  });

  it("ignores a typed date when its record is kept", () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${typedFieldId(KIOSK)}`).value = "nonsense";
    check(unknownId(LIB));
    submit("fdt-fix-form");
    expect(root.querySelector("#fdt-errors")).toBeNull();
    expect(h.copy()).toMatchObject({ redated: 0, cleared: 1, kept: 1 });
  });

  it("drops the copy and the choices when a file is read again", () => {
    const h = mount();
    read();
    check(unknownId(KIOSK));
    submit("fdt-fix-form");
    read();
    expect(h.copy()).toBeUndefined();
    expect(root.querySelector("#fdt-copy")).toBeNull();
    expect($<HTMLInputElement>(`#${keepId(KIOSK)}`).checked).toBe(true);
  });
});

describe("the language", () => {
  it("keeps the file, choices and copy when switching to French", () => {
    const h = mount();
    read();
    check(unknownId(KIOSK));
    submit("fdt-fix-form");
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("h2").textContent).toBe(C.title.fr);
    expect($<HTMLInputElement>(`#${unknownId(KIOSK)}`).checked).toBe(true);
    expect($("#fdt-copy-summary").textContent).toBe("0 donnée a reçu une autre date, 1 est remise à UNKNOWN, 1 garde sa date d’après aujourd’hui.");
    expect(root.querySelector('a[download="notes-dates-corrigees-2026-11-21.json"]')).not.toBeNull();
    expect(lastAudit()).toEqual([]);
  });

  it("keeps an unfinished typed date when switching", () => {
    const h = mount();
    read();
    check(typedId(LIB));
    $<HTMLInputElement>(`#${typedFieldId(LIB)}`).value = "2026-0";
    h.setLocale("fr");
    expect($<HTMLInputElement>(`#${typedId(LIB)}`).checked).toBe(true);
    expect($<HTMLInputElement>(`#${typedFieldId(LIB)}`).value).toBe("2026-0");
  });
});

describe("opening and removing", () => {
  it("puts an opened file in the box without reading it", async () => {
    const h = mount("en", async () => FILE);
    const input = $<HTMLInputElement>(`#${DATES_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File([FILE], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($<HTMLTextAreaElement>(`#${DATES_TEXT_ID}`).value).toBe(FILE);
    expect(h.file()).toBeUndefined();
    expect(document.activeElement?.id).toBe(DATES_TEXT_ID);
    expect(await status()).toBe(C.opened.en);
  });

  it("refuses a file that is too large before reading it", async () => {
    let called = false;
    mount("en", async () => {
      called = true;
      return "";
    });
    const input = $<HTMLInputElement>(`#${DATES_OPEN_ID}`);
    const big = new File(["x"], "big.json");
    Object.defineProperty(big, "size", { value: MAX_FILE_BYTES + 1 });
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(called).toBe(false);
    expect(errorLinks()).toEqual([datesErrorText("too-large", "en")]);
  });

  it("says when a file cannot be opened, and keeps focus on the picker", async () => {
    mount("en", async () => {
      throw new Error("no");
    });
    const input = $<HTMLInputElement>(`#${DATES_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "a.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($("#fdt-status").textContent).toBe(C.readFailed.en);
    expect(document.activeElement?.id).toBe(DATES_OPEN_ID);
  });

  it("removes the file, the choices and the copy", async () => {
    const h = mount();
    read();
    check(unknownId(KIOSK));
    submit("fdt-fix-form");
    root.querySelector<HTMLButtonElement>('[data-action="fdt-clear"]')?.click();
    expect(h.file()).toBeUndefined();
    expect(h.copy()).toBeUndefined();
    expect($<HTMLTextAreaElement>(`#${DATES_TEXT_ID}`).value).toBe("");
    expect(root.querySelector("#fdt-results")).toBeNull();
    expect(document.activeElement?.id).toBe(DATES_TEXT_ID);
    expect(await status()).toBe(C.cleared.en);
  });

  it("does nothing after it is destroyed, even when a read finishes late", async () => {
    let finish: (s: string) => void = () => undefined;
    const h = mount("en", () => new Promise<string>((r) => (finish = r)));
    const input = $<HTMLInputElement>(`#${DATES_OPEN_ID}`);
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
    check(unknownId(KIOSK));
    submit("fdt-fix-form");
    expect(window.localStorage.length).toBe(0);
  });
});

describe("accessibility of the mounted tool", () => {
  for (const l of ["en", "fr"] as const) {
    it(`has no axe problems with records, errors and a copy (${l})`, async () => {
      mount(l);
      read();
      check(typedId(KIOSK));
      $<HTMLInputElement>(`#${typedFieldId(KIOSK)}`).value = "x";
      submit("fdt-fix-form");
      expect(root.querySelector("#fdt-errors")).not.toBeNull();
      let r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => v.id)).toEqual([]);
      $<HTMLInputElement>(`#${typedFieldId(KIOSK)}`).value = "2026-01-01";
      submit("fdt-fix-form");
      expect(root.querySelector("#fdt-copy")).not.toBeNull();
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
