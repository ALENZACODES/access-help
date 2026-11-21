// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { FILE_ADDRESS_COPY as C, addressErrorText } from "./fileaddress-copy";
import { mountFileAddress, type FileAddressHandle } from "./fileaddress-mount";
import { AXE_OPTIONS } from "./shelltest";
import { decodeTextExportHref } from "./textexport";
import { testNote } from "./testnotes";
import { nameId, postalId, streetId } from "./views-fileaddress";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const FILE = exportNotes(
  [
    testNote("a", "Library", [{ key: "elevator", value: "yes" }], "100 King St W, Toronto ON M5H 2N2"),
    testNote("b", "Bank", [], "40 King Street West, Toronto ON M5H 1A1"),
    testNote("c", "Café", [], "12 King St W, Toronto ON m5h2n3"),
    testNote("d", "Deli", [], "7 Queen St E, Toronto ON M5C 2NO"),
    testNote("k", "Kiosk", [], "Market Square, Toronto"),
  ],
  "2026-11-01",
);

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
  $<HTMLTextAreaElement>("#fad-text").value = text;
  submit("fad-file-form");
}

/** The ids of the postal fixes on the page, in order. */
const postalBoxes = (): HTMLInputElement[] => Array.from(root.querySelectorAll<HTMLInputElement>('input[name="postal"]'));

describe("looking at the addresses", () => {
  it("lists the issues and the streets written more than one way, and announces the counts", async () => {
    const h = mount();
    read();
    expect(document.activeElement?.id).toBe("fad-summary");
    expect(h.report()?.issues.map((i) => i.kind)).toEqual(["no-street", "postal-mistyped", "postal-format"]);
    expect(postalBoxes()).toHaveLength(2);
    expect(root.querySelectorAll(`#${streetId(0)} option`)).toHaveLength(3);
    expect(await status()).toBe(
      "5 places: 0 with no address, 0 at a crossing of streets, 1 with no house number and street, 1 postal code that may be mistyped, 0 texts that cannot be a postal code, 0 postal areas unlike the rest of the street, 1 postal code written another way; 1 street written more than one way; 0 addresses with several names.",
    );
    expect(lastAudit()).toEqual([]);
  });

  it("names the problem when the text is not an export, and links to the box", () => {
    mount();
    read("nope");
    expect(document.activeElement?.id).toBe("fad-errors");
    expect($("#fad-errors").textContent).toContain(addressErrorText("not-json", "en"));
    root.querySelector<HTMLAnchorElement>("#fad-errors a")?.click();
    expect(document.activeElement?.id).toBe("fad-text");
    expect(lastAudit()).toEqual([]);
  });
});

describe("a copy with fixes", () => {
  it("makes a copy with the ticked codes and the picked street form, and announces what changed", async () => {
    const h = mount();
    read();
    for (const b of postalBoxes()) b.checked = true;
    $<HTMLSelectElement>(`#${streetId(0)}`).value = "King St W";
    submit("fad-fix-form");
    expect(document.activeElement?.id).toBe("fad-copy");
    expect(h.copy()?.changedPlaces).toBe(3);
    expect(await status()).toBe(`${C.made.en} The copy changes the address of 3 places (3 notes).`);
    const href = root.querySelector('a[download="notes-addresses-fixed-2026-11-21.json"]')?.getAttribute("href") ?? "";
    const back = importNotes(decodeURIComponent(href.replace(/^data:application\/json;charset=utf-8,/, "")));
    expect(back.notes.map((n) => n.address).sort()).toEqual([
      "100 King St W, Toronto ON M5H 2N2",
      "12 King St W, Toronto ON M5H 2N3",
      "40 King St W, Toronto ON M5H 1A1",
      "7 Queen St E, Toronto ON M5C 2N0",
      "Market Square, Toronto",
    ]);
    expect(lastAudit()).toEqual([]);
  });

  it("ticks every suggested code at once, says to look at each, and changes nothing until the copy is made", async () => {
    const h = mount();
    read();
    $('[data-action="fad-tick-all"]').click();
    expect(postalBoxes().every((b) => b.checked)).toBe(true);
    expect(await status()).toBe(C.ticked.en);
    expect(h.copy()).toBeUndefined();
    submit("fad-fix-form");
    expect(h.copy()?.changedPlaces).toBe(2);
  });

  it("downloads the results to print", () => {
    mount();
    read();
    const text = decodeTextExportHref(root.querySelector('a[download="addresses-2026-11-21.txt"]')?.getAttribute("href") ?? "") ?? "";
    expect(text).toContain("Postal codes written another way (1)\n  Café, 12 King St W, Toronto ON m5h2n3 [m5h2n3 → M5H 2N3]\n");
  });

  it("keeps the choices on screen after the copy is made", () => {
    mount();
    read();
    const first = postalBoxes()[0];
    if (!first) throw new Error("no box");
    first.checked = true;
    submit("fad-fix-form");
    expect(postalBoxes()[0]?.checked).toBe(true);
    expect($<HTMLSelectElement>(`#${streetId(0)}`).value).toBe("");
  });

  it("asks for a fix to be chosen and links to the first one", () => {
    const h = mount();
    read();
    submit("fad-fix-form");
    expect(document.activeElement?.id).toBe("fad-errors");
    expect($("#fad-errors").textContent).toContain(C.noneChosen.en);
    expect(h.copy()).toBeUndefined();
    root.querySelector<HTMLAnchorElement>(`#fad-errors a[href="#${postalId(1)}"]`)?.click();
    expect(document.activeElement?.id).toBe(postalId(1));
    expect(lastAudit()).toEqual([]);
  });

  it("starts again with nothing chosen when another file is read", () => {
    const h = mount();
    read();
    for (const b of postalBoxes()) b.checked = true;
    submit("fad-fix-form");
    read();
    expect(h.copy()).toBeUndefined();
    expect(postalBoxes().some((b) => b.checked)).toBe(false);
  });
});

describe("issues with no fix", () => {
  it("lists a corner and a postal area unlike its street without offering a fix", () => {
    mount();
    read(
      exportNotes(
        [
          testNote("s", "Stand", [], "King St & Bay St"),
          ...["M5H 2N2", "M5H 2N3", "M5H 2N4", "K7L 3N6"].map((c, i) => testNote(`p${i}`, `Place ${i}`, [], `${i + 1} Oak St, ${c}`)),
        ],
        "2026-11-01",
      ),
    );
    expect($(".fad-intersection li").textContent).toBe("Stand, King St & Bay St");
    expect($(".fad-postal-other-area li").textContent).toContain("K7L");
    expect(root.querySelector(".fad-postal-other-area input")).toBeNull();
    expect(root.querySelector("#fad-fix-form")).toBeNull();
    expect(lastAudit()).toEqual([]);
  });
});

describe("one address, several names", () => {
  const NAMED = exportNotes(
    [testNote("a", "Joe's Café", [{ key: "elevator", value: "yes" }], "5 Elm Ave"), testNote("b", "Joes Cafe", [{ key: "elevator", value: "no" }], "5 Elm Ave")],
    "2026-11-01",
  );

  it("joins the places as one in the copy when the person keeps one name, and says so", async () => {
    const h = mount();
    read(NAMED);
    expect(root.querySelectorAll('input[name="name-0"]')).toHaveLength(3);
    $<HTMLInputElement>(`#${nameId(0, 1)}`).checked = true;
    submit("fad-fix-form");
    expect(h.copy()?.joined).toBe(1);
    expect(await status()).toBe(
      `${C.made.en} The copy changes the address of 1 place (1 note). 1 place now has the same name and address as another and is shown as one with it.`,
    );
    expect(lastAudit()).toEqual([]);
  });

  it("makes no copy while every name is kept", () => {
    const h = mount();
    read(NAMED);
    submit("fad-fix-form");
    expect(h.copy()).toBeUndefined();
    expect($("#fad-errors").textContent).toContain(C.noneChosen.en);
  });
});

describe("files, language and removing", () => {
  it("opens a file into the box", async () => {
    const h = mount("en", () => Promise.resolve(FILE));
    const input = $<HTMLInputElement>("#fad-open");
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($<HTMLTextAreaElement>("#fad-text").value).toBe(FILE);
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
    const input = $<HTMLInputElement>("#fad-open");
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(reads).toBe(0);
    expect($("#fad-errors").textContent).toContain(addressErrorText("too-large", "en"));
  });

  it("says so when a file cannot be read, and ignores a read that ends after the tool is closed", async () => {
    const first = mount("en", () => Promise.reject(new Error("no")));
    const input = $<HTMLInputElement>("#fad-open");
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($("#fad-status").textContent).toBe(C.readFailed.en);
    first.destroy();

    let finish: (s: string) => void = () => undefined;
    const late = mount("en", () => new Promise<string>((r) => (finish = r)));
    const input2 = $<HTMLInputElement>("#fad-open");
    Object.defineProperty(input2, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input2.dispatchEvent(new Event("change", { bubbles: true }));
    late.destroy();
    handle = undefined;
    finish(FILE);
    await tick();
    expect(root.innerHTML).toBe("");
  });

  it("switches to French, keeping what was chosen", () => {
    const h = mount();
    read();
    $<HTMLSelectElement>(`#${streetId(0)}`).value = "King Street West";
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#fad-title").textContent).toBe(C.title.fr);
    expect($<HTMLSelectElement>(`#${streetId(0)}`).value).toBe("King Street West");
    expect(lastAudit()).toEqual([]);
  });

  it("removes the file and the results, saves nothing, and removes its live region on destroy", async () => {
    const h = mount();
    read();
    $('[data-action="fad-clear"]').click();
    expect(h.file()).toBeUndefined();
    expect(h.report()).toBeUndefined();
    expect(document.activeElement?.id).toBe("fad-text");
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

  it.each(["en", "fr"] as const)("passes on the results (%s)", async (l) => {
    mount(l);
    read();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on the copy (%s)", async (l) => {
    mount(l);
    read();
    for (const b of postalBoxes()) b.checked = true;
    submit("fad-fix-form");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on an address with several names (%s)", async (l) => {
    mount(l);
    read(exportNotes([testNote("a", "Joe's Café", [], "5 Elm Ave"), testNote("b", "Joes Cafe", [], "5 Elm Ave")], "2026-11-01"));
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes when no fix is chosen (%s)", async (l) => {
    mount(l);
    read();
    submit("fad-fix-form");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});
