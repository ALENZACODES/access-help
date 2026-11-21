// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes } from "./exchange";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { FILE_SAME_COPY as C, sameErrorText } from "./filesame-copy";
import { mountFileSame, type FileSameHandle } from "./filesame-mount";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { SAME_OPEN_ID, SAME_TEXT_ID, includeId, joinId, keepId, nameId, typedId } from "./views-filesame";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const FILE = exportNotes(
  [
    testNote("l1", "Central Library", [{ key: "elevator", value: "yes" }], "100 King St W"),
    testNote("l2", "Centrel Library", [{ key: "elevator", value: "no", source: "Visit" }], null),
    testNote("b1", "Bank", [], "40 Queen St E"),
    testNote("b2", "Royal Bank", [], "40 Queen St E"),
    testNote("c", "Cart", [], "1 Elm St"),
  ],
  "2026-11-01",
);

let root: HTMLElement;
let handle: FileSameHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileSameHandle {
  document.documentElement.lang = locale;
  handle = mountFileSame(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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
  $<HTMLTextAreaElement>(`#${SAME_TEXT_ID}`).value = text;
  submit("fsa-file-form");
}

function openWith(file: File): void {
  const input = $<HTMLInputElement>(`#${SAME_OPEN_ID}`);
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("reading a file", () => {
  it("lists the groups, focuses the results and announces the summary", async () => {
    const h = mount();
    read();
    expect(h.report()?.groups.map((g) => g.places.map((p) => p.name))).toEqual([
      ["Bank", "Royal Bank"],
      ["Central Library", "Centrel Library"],
    ]);
    expect(document.activeElement?.id).toBe("fsa-results");
    expect(await status()).toBe("5 places: 2 groups of places that may be the same, 4 places in all.");
    expect(lastAudit()).toEqual([]);
  });

  it("names the problem when the text is not an export, and links to the box", () => {
    const h = mount();
    read("nope");
    expect(h.report()).toBeUndefined();
    expect($("#fsa-errors").textContent).toContain(sameErrorText("not-json", "en"));
    $<HTMLAnchorElement>("#fsa-errors a").click();
    expect(document.activeElement?.id).toBe(SAME_TEXT_ID);
    expect(lastAudit()).toEqual([]);
  });
});

describe("making the copy", () => {
  it("joins the groups chosen, focuses the copy and announces what changed", async () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${joinId(1, 0)}`).checked = true;
    submit("fsa-join-form");
    expect(h.copy()).toMatchObject({ groups: 1, changed: 1, kept: 0 });
    expect(h.copy()?.notes.find((n) => n.id === "l2")?.placeName).toBe("Central Library");
    expect(document.activeElement?.id).toBe("fsa-copy");
    expect(await status()).toBe(`${C.made.en} 1 group joined: 1 note was given another name or address. The copy has 4 places (5 before).`);
    expect($<HTMLInputElement>(`#${joinId(1, 0)}`).checked).toBe(true);
    expect(lastAudit()).toEqual([]);
  });

  it("asks for a group to join when every group is kept apart, linking to the first choice", () => {
    const h = mount();
    read();
    submit("fsa-join-form");
    expect(h.copy()).toBeUndefined();
    expect(document.activeElement?.id).toBe("fsa-errors");
    $<HTMLAnchorElement>("#fsa-errors a").click();
    expect(document.activeElement?.id).toBe(keepId(0));
    expect(lastAudit()).toEqual([]);
  });

  it("starts again with nothing chosen when another file is read", () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${joinId(0, 0)}`).checked = true;
    submit("fsa-join-form");
    read();
    expect(h.copy()).toBeUndefined();
    expect($<HTMLInputElement>(`#${keepId(0)}`).checked).toBe(true);
  });
});

describe("joining under a typed name", () => {
  it("asks for a name when the typed choice has none, links to the field, and makes no copy", () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${typedId(1)}`).checked = true;
    submit("fsa-join-form");
    expect(h.copy()).toBeUndefined();
    expect(document.activeElement?.id).toBe("fsa-errors");
    $<HTMLAnchorElement>("#fsa-errors a").click();
    expect(document.activeElement?.id).toBe(nameId(1));
    expect(lastAudit()).toEqual([]);
  });

  it("joins under the name typed, keeping it on the page", () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${typedId(1)}`).checked = true;
    $<HTMLInputElement>(`#${nameId(1)}`).value = "Central Library";
    submit("fsa-join-form");
    expect(h.copy()?.notes.filter((n) => n.placeName === "Central Library" && n.address === undefined).map((n) => n.id).sort()).toEqual(["l1", "l2"]);
    expect($<HTMLInputElement>(`#${nameId(1)}`).value).toBe("Central Library");
    expect(lastAudit()).toEqual([]);
  });
});

describe("leaving places out", () => {
  it("asks for two places when only one is left ticked, linking to the boxes, and makes no copy", () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${joinId(0, 0)}`).checked = true;
    $<HTMLInputElement>(`#${includeId(0, 1)}`).checked = false;
    submit("fsa-join-form");
    expect(h.copy()).toBeUndefined();
    $<HTMLAnchorElement>("#fsa-errors a").click();
    expect(document.activeElement?.id).toBe(includeId(0, 0));
    expect($<HTMLInputElement>(`#${includeId(0, 1)}`).checked).toBe(false);
    expect(lastAudit()).toEqual([]);
  });
});

describe("files, language and removing", () => {
  it("keeps the typed name, the unticked boxes and the choice when the page switches to French", () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${typedId(1)}`).checked = true;
    $<HTMLInputElement>(`#${nameId(1)}`).value = "Main Library";
    $<HTMLInputElement>(`#${includeId(0, 1)}`).checked = false;
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($<HTMLInputElement>(`#${typedId(1)}`).checked).toBe(true);
    expect($<HTMLInputElement>(`#${nameId(1)}`).value).toBe("Main Library");
    expect($<HTMLInputElement>(`#${includeId(0, 1)}`).checked).toBe(false);
    submit("fsa-join-form");
    expect(h.copy()?.notes.filter((n) => n.placeName === "Main Library").map((n) => n.id).sort()).toEqual(["l1", "l2"]);
    expect(h.copy()).toMatchObject({ placesBefore: 5, placesAfter: 4 });
    expect(lastAudit()).toEqual([]);
  });

  it("opens a file into the box, and refuses one too large before reading it", async () => {
    let reads = 0;
    const h = mount("en", () => {
      reads++;
      return Promise.resolve(FILE);
    });
    openWith(new File(["x"], "notes.json"));
    await tick();
    expect($<HTMLTextAreaElement>(`#${SAME_TEXT_ID}`).value).toBe(FILE);
    expect(h.file()).toBeUndefined();
    expect(await status()).toBe(C.opened.en);
    const big = new File(["x"], "big.json");
    Object.defineProperty(big, "size", { value: MAX_FILE_BYTES + 1 });
    openWith(big);
    await tick();
    expect(reads).toBe(1);
    expect($("#fsa-errors").textContent).toContain(sameErrorText("too-large", "en"));
  });

  it("says so when a file cannot be read, and ignores a read that ends after the tool is closed", async () => {
    const first = mount("en", () => Promise.reject(new Error("no")));
    openWith(new File(["x"], "notes.json"));
    await tick();
    expect($("#fsa-status").textContent).toBe(C.readFailed.en);
    first.destroy();

    let finish: (s: string) => void = () => undefined;
    const late = mount("en", () => new Promise<string>((r) => (finish = r)));
    openWith(new File(["x"], "notes.json"));
    late.destroy();
    handle = undefined;
    finish(FILE);
    await tick();
    expect(root.innerHTML).toBe("");
  });

  it("switches to French, keeping the choices and the copy", () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${joinId(0, 1)}`).checked = true;
    submit("fsa-join-form");
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#fsa-title").textContent).toBe(C.title.fr);
    expect($<HTMLInputElement>(`#${joinId(0, 1)}`).checked).toBe(true);
    expect($("#fsa-copy-summary").textContent).toContain("1 groupe réuni");
    expect(lastAudit()).toEqual([]);
  });

  it("removes the file, the groups and the copy, saves nothing, and removes its live region on destroy", async () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${joinId(0, 0)}`).checked = true;
    submit("fsa-join-form");
    $('[data-action="fsa-clear"]').click();
    expect(h.file()).toBeUndefined();
    expect(h.report()).toBeUndefined();
    expect(h.copy()).toBeUndefined();
    expect(document.activeElement?.id).toBe(SAME_TEXT_ID);
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

  it.each(["en", "fr"] as const)("passes on the groups (%s)", async (l) => {
    mount(l);
    read();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with no group chosen (%s)", async (l) => {
    mount(l);
    read();
    submit("fsa-join-form");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on the copy (%s)", async (l) => {
    mount(l);
    read();
    $<HTMLInputElement>(`#${joinId(0, 0)}`).checked = true;
    submit("fsa-join-form");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with a typed-name problem (%s)", async (l) => {
    mount(l);
    read();
    $<HTMLInputElement>(`#${typedId(0)}`).checked = true;
    submit("fsa-join-form");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});
