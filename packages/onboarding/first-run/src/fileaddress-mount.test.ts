// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { FILE_ADDRESS_COPY as C, addressErrorText } from "./fileaddress-copy";
import { mountFileAddress, type FileAddressHandle } from "./fileaddress-mount";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { ADDRESS_OPEN_ID, ADDRESS_TEXT_ID, POSTAL_ID, fieldId, keepId, suggestionId, typedId } from "./views-fileaddress";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const FILE = exportNotes(
  [
    testNote("c1", "Café", [{ key: "elevator", value: "yes" }], null),
    testNote("c2", "Café", [], null),
    testNote("c3", "Café", [], "12 King St W"),
    testNote("k1", "Kiosk", [], "Main Street"),
    testNote("l1", "Library", [], "1 Main St"),
  ],
  "2026-11-01",
);
// Places with no address come first, then those with no readable street: Café, then Kiosk.
const CAFE = 0;
const KIOSK = 1;

let root: HTMLElement;
let handle: FileAddressHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileAddressHandle {
  document.documentElement.lang = locale;
  handle = mountFileAddress(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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
  $<HTMLTextAreaElement>(`#${ADDRESS_TEXT_ID}`).value = text;
  submit("fad-file-form");
}

const check = (id: string): void => {
  $<HTMLInputElement>(`#${id}`).checked = true;
};

const typeAddress = (i: number, value: string): void => {
  check(typedId(i));
  $<HTMLInputElement>(`#${fieldId(i)}`).value = value;
};

function copyNotes() {
  const href = root.querySelector('a[download="notes-addresses-added-2026-11-21.json"]')?.getAttribute("href") ?? "";
  return importNotes(decodeURIComponent(href.replace(/^data:application\/json;charset=utf-8,/, "")));
}

const errorLinks = (): string[] => Array.from(root.querySelectorAll("#fad-errors a")).map((a) => a.textContent ?? "");

describe("reading a file", () => {
  it("lists the places to add an address to, moves focus to them and announces the summary", async () => {
    const h = mount();
    read();
    expect(document.activeElement?.id).toBe("fad-results");
    expect(h.report()?.rows.map((r) => [r.place.name, r.issue])).toEqual([
      ["Café", "none"],
      ["Kiosk", "no-street"],
    ]);
    expect(await status()).toBe("4 places: 1 with no address, 1 with no street the App can read, 1 with an address offered.");
    expect(lastAudit()).toEqual([]);
  });

  it("names the problem when the text is not an export, and its link moves focus to the box", () => {
    const h = mount();
    read("not json");
    expect(document.activeElement?.id).toBe("fad-errors");
    expect(errorLinks()).toEqual([addressErrorText("not-json", "en")]);
    expect(h.file()).toBeUndefined();
    root.querySelector<HTMLAnchorElement>("#fad-errors a")?.click();
    expect(document.activeElement?.id).toBe(ADDRESS_TEXT_ID);
    expect(lastAudit()).toEqual([]);
  });
});

describe("making the copy", () => {
  it("uses an offered address for every note of the place, and announces what changed", async () => {
    const h = mount();
    read();
    check(suggestionId(CAFE, 0));
    submit("fad-fix-form");
    expect(document.activeElement?.id).toBe("fad-copy");
    expect(h.copy()).toMatchObject({ places: 1, changed: 2, readable: 1 });
    expect(await status()).toBe(`${C.made.en} 1 place was given an address, on 2 notes; the App can read the street of 1.`);
    expect(Array.from(root.querySelectorAll(".fad-changes li")).map((li) => li.textContent)).toEqual([
      "Café: 12 King St W (joins the place with this name already at this address; their records go together)",
    ]);
    const back = copyNotes();
    expect(back.rejected).toBe(0);
    expect(back.notes.filter((n) => n.address === "12 King St W").map((n) => n.id).sort()).toEqual(["c1", "c2", "c3"]);
    // The note's records are unchanged.
    expect(back.notes.find((n) => n.id === "c1")?.facts.find((f) => f.key === "elevator")?.value).toBe("yes");
    expect(lastAudit()).toEqual([]);
  });

  it("uses a typed address, and allows one with no readable street", () => {
    const h = mount();
    read();
    typeAddress(KIOSK, "Kiosk by the north gate");
    submit("fad-fix-form");
    expect(h.copy()).toMatchObject({ places: 1, changed: 1, readable: 0 });
    expect(Array.from(root.querySelectorAll(".fad-changes li")).map((li) => li.textContent)).toEqual(["Kiosk: Kiosk by the north gate (no street the App can read)"]);
    // The warning shows beside the box once the copy is made, and the choice stays on screen.
    expect($(`#w-${fieldId(KIOSK)}`).textContent).toBe(C.noStreetWarning.en);
    expect($<HTMLInputElement>(`#${typedId(KIOSK)}`).checked).toBe(true);
  });

  it("asks for at least one address when every place is left as it is", () => {
    const h = mount();
    read();
    submit("fad-fix-form");
    expect(document.activeElement?.id).toBe("fad-errors");
    expect(errorLinks()).toEqual([C.noneChanged.en]);
    expect(h.copy()).toBeUndefined();
    root.querySelector<HTMLAnchorElement>("#fad-errors a")?.click();
    expect(document.activeElement?.id).toBe(keepId(0));
    expect(lastAudit()).toEqual([]);
  });

  it("lists every typed-address problem, keeps what was typed and makes no copy", () => {
    const h = mount();
    read();
    typeAddress(CAFE, "");
    typeAddress(KIOSK, "x".repeat(201));
    submit("fad-fix-form");
    expect(errorLinks()).toEqual(["Address for place 1 — Type an address, or choose Leave it as it is.", "Address for place 2 — Use 200 characters or fewer."]);
    expect($(`#${fieldId(KIOSK)}`).getAttribute("aria-invalid")).toBe("true");
    expect($<HTMLInputElement>(`#${fieldId(KIOSK)}`).value).toHaveLength(201);
    expect(h.copy()).toBeUndefined();
    root.querySelectorAll<HTMLAnchorElement>("#fad-errors a")[1]?.click();
    expect(document.activeElement?.id).toBe(fieldId(KIOSK));
    expect(lastAudit()).toEqual([]);
  });

  it("clears a problem once it is fixed", () => {
    const h = mount();
    read();
    typeAddress(KIOSK, "");
    submit("fad-fix-form");
    expect(errorLinks()).toHaveLength(1);
    $<HTMLInputElement>(`#${fieldId(KIOSK)}`).value = "7 Main St";
    submit("fad-fix-form");
    expect(root.querySelector("#fad-errors")).toBeNull();
    expect(h.copy()).toMatchObject({ readable: 1 });
  });

  it("ignores a typed address when its place is left as it is", () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${fieldId(CAFE)}`).value = "\t";
    check(suggestionId(CAFE, 0));
    submit("fad-fix-form");
    expect(root.querySelector("#fad-errors")).toBeNull();
    expect(h.copy()).toMatchObject({ places: 1 });
  });

  it("drops the copy and the choices when a file is read again", () => {
    const h = mount();
    read();
    check(suggestionId(CAFE, 0));
    submit("fad-fix-form");
    read();
    expect(h.copy()).toBeUndefined();
    expect(root.querySelector("#fad-copy")).toBeNull();
    expect($<HTMLInputElement>(`#${keepId(CAFE)}`).checked).toBe(true);
  });

  it("reads the copy back with the place joined to the one with that address and nothing left to add", () => {
    mount();
    read();
    check(suggestionId(CAFE, 0));
    typeAddress(KIOSK, "7 Main St");
    submit("fad-fix-form");
    const text = decodeURIComponent((root.querySelector('a[download="notes-addresses-added-2026-11-21.json"]')?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, ""));
    read(text);
    expect($("#fad-none").textContent).toBe(C.none.en);
  });
});

describe("places with no postal code", () => {
  const POSTAL = exportNotes(
    [testNote("a", "Bank", [], "345 King St W"), testNote("b", "Bakery", [], "345 King St W, Toronto ON M5V 1J5"), testNote("c", "Bar", [], null)],
    "2026-11-01",
  );

  it("lists them when asked, keeps the option for the next file, and adds the postal code from the file", () => {
    const h = mount();
    $<HTMLInputElement>(`#${POSTAL_ID}`).checked = true;
    read(POSTAL);
    expect($<HTMLInputElement>(`#${POSTAL_ID}`).checked).toBe(true);
    expect(h.report()?.rows.map((r) => [r.place.name, r.issue])).toEqual([
      ["Bar", "none"],
      ["Bank", "no-postal"],
    ]);
    check(suggestionId(1, 0));
    submit("fad-fix-form");
    expect(Array.from(root.querySelectorAll(".fad-changes li")).map((li) => li.textContent)).toEqual(["Bank: 345 King St W, Toronto ON M5V 1J5"]);
    expect(lastAudit()).toEqual([]);
  });

  it("leaves them out when the option is off", () => {
    const h = mount();
    read(POSTAL);
    expect(h.report()?.rows.map((r) => r.place.name)).toEqual(["Bar"]);
  });
});

describe("the language", () => {
  it("keeps the file, choices and copy when switching to French", () => {
    const h = mount();
    read();
    check(suggestionId(CAFE, 0));
    submit("fad-fix-form");
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("h2").textContent).toBe(C.title.fr);
    expect($<HTMLInputElement>(`#${suggestionId(CAFE, 0)}`).checked).toBe(true);
    expect($("#fad-copy-summary").textContent).toBe("1 lieu a reçu une adresse, sur 2 notes\u202F; l’App peut lire la rue de 1.");
    expect(root.querySelector('a[download="notes-adresses-ajoutees-2026-11-21.json"]')).not.toBeNull();
    expect(lastAudit()).toEqual([]);
  });

  it("keeps the postal-code option when switching", () => {
    const h = mount();
    $<HTMLInputElement>(`#${POSTAL_ID}`).checked = true;
    read();
    h.setLocale("fr");
    expect($<HTMLInputElement>(`#${POSTAL_ID}`).checked).toBe(true);
    expect($("#fad-summary").textContent).toContain("sans code postal lisible");
  });

  it("keeps an unfinished typed address when switching", () => {
    const h = mount();
    read();
    typeAddress(KIOSK, "7 Ma");
    h.setLocale("fr");
    expect($<HTMLInputElement>(`#${typedId(KIOSK)}`).checked).toBe(true);
    expect($<HTMLInputElement>(`#${fieldId(KIOSK)}`).value).toBe("7 Ma");
  });
});

describe("opening and removing", () => {
  it("puts an opened file in the box without reading it", async () => {
    const h = mount("en", async () => FILE);
    const input = $<HTMLInputElement>(`#${ADDRESS_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File([FILE], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($<HTMLTextAreaElement>(`#${ADDRESS_TEXT_ID}`).value).toBe(FILE);
    expect(h.file()).toBeUndefined();
    expect(document.activeElement?.id).toBe(ADDRESS_TEXT_ID);
    expect(await status()).toBe(C.opened.en);
  });

  it("refuses a file that is too large before reading it", async () => {
    let called = false;
    mount("en", async () => {
      called = true;
      return "";
    });
    const input = $<HTMLInputElement>(`#${ADDRESS_OPEN_ID}`);
    const big = new File(["x"], "big.json");
    Object.defineProperty(big, "size", { value: MAX_FILE_BYTES + 1 });
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(called).toBe(false);
    expect(errorLinks()).toEqual([addressErrorText("too-large", "en")]);
  });

  it("says when a file cannot be opened, and keeps focus on the picker", async () => {
    mount("en", async () => {
      throw new Error("no");
    });
    const input = $<HTMLInputElement>(`#${ADDRESS_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "a.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($("#fad-status").textContent).toBe(C.readFailed.en);
    expect(document.activeElement?.id).toBe(ADDRESS_OPEN_ID);
  });

  it("removes the file, the choices and the copy", async () => {
    const h = mount();
    read();
    check(suggestionId(CAFE, 0));
    submit("fad-fix-form");
    root.querySelector<HTMLButtonElement>('[data-action="fad-clear"]')?.click();
    expect(h.file()).toBeUndefined();
    expect(h.copy()).toBeUndefined();
    expect($<HTMLTextAreaElement>(`#${ADDRESS_TEXT_ID}`).value).toBe("");
    expect(root.querySelector("#fad-results")).toBeNull();
    expect(document.activeElement?.id).toBe(ADDRESS_TEXT_ID);
    expect(await status()).toBe(C.cleared.en);
  });

  it("does nothing after it is destroyed, even when a read finishes late", async () => {
    let finish: (s: string) => void = () => undefined;
    const h = mount("en", () => new Promise<string>((r) => (finish = r)));
    const input = $<HTMLInputElement>(`#${ADDRESS_OPEN_ID}`);
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
    check(suggestionId(CAFE, 0));
    submit("fad-fix-form");
    expect(window.localStorage.length).toBe(0);
  });
});

describe("accessibility of the mounted tool", () => {
  for (const l of ["en", "fr"] as const) {
    it(`has no axe problems with places, errors and a copy (${l})`, async () => {
      mount(l);
      read();
      typeAddress(KIOSK, "");
      submit("fad-fix-form");
      expect(root.querySelector("#fad-errors")).not.toBeNull();
      let r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => v.id)).toEqual([]);
      $<HTMLInputElement>(`#${fieldId(KIOSK)}`).value = "By the gate";
      submit("fad-fix-form");
      expect(root.querySelector("#fad-copy")).not.toBeNull();
      r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => v.id)).toEqual([]);
      expect(lastAudit()).toEqual([]);
    });
  }

  it("works from the keyboard alone: every control can take focus", () => {
    mount();
    read();
    const controls = Array.from(root.querySelectorAll<HTMLElement>("input, textarea, button, a[href]"));
    expect(controls.length).toBeGreaterThan(8);
    for (const c of controls) {
      expect(c.getAttribute("tabindex"), c.outerHTML).not.toBe("-1");
      c.focus();
      expect(document.activeElement).toBe(c);
    }
  });
});
