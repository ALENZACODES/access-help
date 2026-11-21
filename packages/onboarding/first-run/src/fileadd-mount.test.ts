// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { CONTRIBUTOR_SOURCE } from "./facts";
import { FILE_ADD_COPY as C, addErrorText, addProblemText } from "./fileadd-copy";
import { mountFileAdd, type FileAddHandle } from "./fileadd-mount";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { readStreetFile } from "./filestreets";
import type { Note } from "./model";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { ADD_OPEN_ID, ADD_TEXT_ID, DATE_ID, LICENCE_ID, ONLY_ID, SEARCH_ID, SOURCE_ID, keyId, placeBoxId, valueId, whoId } from "./views-fileadd";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const FILE = exportNotes(
  [
    testNote("a", "Bay Station", [], "1 Bay St"),
    testNote("b", "King Station", [{ key: "elevator", value: "yes" }], "2 King St W"),
    testNote("c", "Queen Station", [{ key: "elevator", value: "no" }], "3 Queen St E"),
    testNote("d", "Café", [], null),
  ],
  "2026-11-01",
);

let root: HTMLElement;
let handle: FileAddHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileAddHandle {
  document.documentElement.lang = locale;
  handle = mountFileAdd(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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
const check = (id: string, on = true): void => {
  $<HTMLInputElement>(`#${id}`).checked = on;
};

function read(text = FILE): void {
  $<HTMLTextAreaElement>(`#${ADD_TEXT_ID}`).value = text;
  submit("fbd-file-form");
}

/** Fills the record: the elevator is Yes, from the City transit list under OGL-Canada-2.0, dated 2026-11-01. */
function fill(over: { who?: "me" | "source"; source?: string; licence?: string; date?: string; value?: "yes" | "no" } = {}): void {
  check(keyId("elevator"));
  check(valueId(over.value ?? "yes"));
  check(whoId(over.who ?? "source"));
  $<HTMLInputElement>(`#${SOURCE_ID}`).value = over.source ?? "City transit list";
  $<HTMLSelectElement>(`#${LICENCE_ID}`).value = over.licence ?? "OGL-Canada-2.0";
  $<HTMLInputElement>(`#${DATE_ID}`).value = over.date ?? "2026-11-01";
}

function show(only = true, search = ""): void {
  check(ONLY_ID, only);
  $<HTMLInputElement>(`#${SEARCH_ID}`).value = search;
  submit("fbd-options-form");
}

function copyNotes(): Note[] {
  const href = root.querySelector('a[download="notes-record-added-2026-11-21.json"]')?.getAttribute("href") ?? "";
  return importNotes(decodeURIComponent(href.replace(/^data:application\/json;charset=utf-8,/, ""))).notes;
}

const listed = (): string[] => Array.from(root.querySelectorAll(".fbd-places label")).map((x) => x.textContent ?? "");
const errorLinks = (): string[] => Array.from(root.querySelectorAll("#fbd-errors a")).map((a) => a.textContent ?? "");

describe("reading a file", () => {
  it("shows the record form and moves focus to it", async () => {
    const h = mount();
    read();
    expect(h.file()?.places).toHaveLength(4);
    expect(document.activeElement?.id).toBe("fbd-record");
    expect(await status()).toBe(`${C.recordTitle.en}.`);
    expect(lastAudit()).toEqual([]);
  });

  it("names the problem when the text is not an export, and its link moves focus to the box", () => {
    const h = mount();
    read("nope");
    expect(errorLinks()).toEqual([addErrorText("not-json", "en")]);
    expect(h.file()).toBeUndefined();
    root.querySelector<HTMLAnchorElement>("#fbd-errors a")?.click();
    expect(document.activeElement?.id).toBe(ADD_TEXT_ID);
  });
});

describe("showing the places", () => {
  it("shows the places with no record for the detail, unticked, and announces the summary", async () => {
    const h = mount();
    read();
    fill();
    show();
    expect(document.activeElement?.id).toBe("fbd-list");
    expect(h.plan()?.map((a) => a.place.name)).toEqual(["Bay Station", "Café"]);
    expect(root.querySelectorAll(".fbd-places input:checked")).toHaveLength(0);
    expect(await status()).toBe("2 places shown: 2 with no record, 0 that agree, 0 where reports would differ, 0 where they already differ.");
    expect(lastAudit()).toEqual([]);
  });

  it("shows every place, or those matching the text, with what the record would do", () => {
    mount();
    read();
    fill();
    show(false);
    expect(listed()).toEqual([
      "Bay Station, 1 Bay St — now Unknown; first record for this detail",
      "Café, no address — now Unknown; first record for this detail",
      "King Station, 2 King St W — now Yes; agrees with what is there",
      "Queen Station, 3 Queen St E — now No; reports would differ",
    ]);
    show(false, "queen");
    expect(listed()).toHaveLength(1);
  });

  it("lists every problem with the record, keeps what was typed and shows no places", () => {
    const h = mount();
    read();
    check(whoId("source"));
    $<HTMLInputElement>(`#${SOURCE_ID}`).value = CONTRIBUTOR_SOURCE;
    $<HTMLInputElement>(`#${DATE_ID}`).value = "2030-01-01";
    show();
    expect(document.activeElement?.id).toBe("fbd-errors");
    expect(errorLinks()).toEqual(["no-key", "no-value", "source-contributor", "no-licence", "date-future"].map((p) => addProblemText(p as never, "en")));
    expect($<HTMLInputElement>(`#${DATE_ID}`).value).toBe("2030-01-01");
    expect(h.plan()).toBeUndefined();
    root.querySelectorAll<HTMLAnchorElement>("#fbd-errors a")[2]?.click();
    expect(document.activeElement?.id).toBe(SOURCE_ID);
    expect(lastAudit()).toEqual([]);
  });
});

describe("adding the record", () => {
  it("adds a new note with the record to each place ticked, and announces it", async () => {
    const h = mount();
    read();
    fill();
    show(false);
    check(placeBoxId(0));
    check(placeBoxId(3));
    submit("fbd-places-form");
    expect(document.activeElement?.id).toBe("fbd-copy");
    expect(h.copy()?.added.map((a) => a.place.name)).toEqual(["Bay Station", "Queen Station"]);
    expect(await status()).toBe(`${C.made.en} Record added to 2 places, in 2 new notes; reports now differ at 1 place.`);
    const notes = copyNotes();
    expect(notes).toHaveLength(6);
    const added = notes.find((n) => n.id === "add-20261121-2");
    expect(added?.placeName).toBe("Queen Station");
    expect(added?.facts.find((f) => f.key === "elevator")).toEqual({
      key: "elevator",
      value: "yes",
      provenance: { source: "City transit list", licence: "OGL-Canada-2.0", recordedOn: "2026-11-01" },
    });
    const again = readStreetFile(decodeURIComponent((root.querySelector('a[download="notes-record-added-2026-11-21.json"]')?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, "")), TODAY, "en");
    expect(again.ok && again.file.places.find((p) => p.name === "Queen Station")?.resolutions.elevator.kind).toBe("differ");
    expect(lastAudit()).toEqual([]);
  });

  it("saves the person's own check under the App's contributor label", () => {
    const h = mount();
    read();
    fill({ who: "me", source: "" });
    show();
    check(placeBoxId(0));
    submit("fbd-places-form");
    expect(h.copy()?.added[0]?.note.facts.find((f) => f.key === "elevator")?.provenance?.source).toBe(CONTRIBUTOR_SOURCE);
  });

  it("asks for at least one place, linking to the first one", () => {
    const h = mount();
    read();
    fill();
    show();
    submit("fbd-places-form");
    expect(document.activeElement?.id).toBe("fbd-errors");
    expect(errorLinks()).toEqual([addProblemText("no-places", "en")]);
    expect(h.copy()).toBeUndefined();
    root.querySelector<HTMLAnchorElement>("#fbd-errors a")?.click();
    expect(document.activeElement?.id).toBe(placeBoxId(0));
    expect(lastAudit()).toEqual([]);
  });

  it("ticks and unticks every place shown at once, and says so", async () => {
    const h = mount();
    read();
    fill();
    show(false);
    root.querySelector<HTMLButtonElement>('[data-action="fbd-tick-all"]')?.click();
    expect(root.querySelectorAll(".fbd-places input:checked")).toHaveLength(4);
    expect(await status()).toBe(C.allTicked.en);
    root.querySelector<HTMLButtonElement>('[data-action="fbd-untick-all"]')?.click();
    expect(root.querySelectorAll(".fbd-places input:checked")).toHaveLength(0);
    expect(await status()).toBe(C.noneTicked.en);
    root.querySelector<HTMLButtonElement>('[data-action="fbd-tick-all"]')?.click();
    submit("fbd-places-form");
    expect(h.copy()?.added).toHaveLength(4);
  });

  it("adds nothing more when run again on its own copy with the same record", () => {
    mount();
    read();
    fill();
    show(false);
    root.querySelector<HTMLButtonElement>('[data-action="fbd-tick-all"]')?.click();
    submit("fbd-places-form");
    const text = decodeURIComponent((root.querySelector('a[download="notes-record-added-2026-11-21.json"]')?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, ""));
    read(text);
    show(false);
    expect($("#fbd-none").textContent).toBe(C.allRepeat.en);
    expect(root.querySelector("#fbd-places-form")).toBeNull();
  });

  it("drops the places and copy, but keeps the record, when a new file is read", () => {
    const h = mount();
    read();
    fill();
    show();
    check(placeBoxId(0));
    submit("fbd-places-form");
    read();
    expect(h.plan()).toBeUndefined();
    expect(h.copy()).toBeUndefined();
    expect($<HTMLInputElement>(`#${keyId("elevator")}`).checked).toBe(true);
    expect($<HTMLInputElement>(`#${SOURCE_ID}`).value).toBe("City transit list");
  });

  it("gives the new notes ids that do not clash when the copy is read and added to again", () => {
    mount();
    read();
    fill();
    show();
    check(placeBoxId(0));
    submit("fbd-places-form");
    const text = decodeURIComponent((root.querySelector('a[download="notes-record-added-2026-11-21.json"]')?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, ""));
    read(text);
    fill({ value: "no" });
    show(false, "bay");
    check(placeBoxId(0));
    submit("fbd-places-form");
    expect(copyNotes().map((n) => n.id).filter((id) => id.startsWith("add-"))).toEqual(["add-20261121-1", "add-20261121-2"]);
  });
});

describe("the language", () => {
  it("keeps the file, record, ticks and copy when switching to French", () => {
    const h = mount();
    read();
    fill();
    show();
    check(placeBoxId(1));
    submit("fbd-places-form");
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("h2").textContent).toBe(C.title.fr);
    expect($<HTMLInputElement>(`#${placeBoxId(1)}`).checked).toBe(true);
    expect($("#fbd-copy-summary").textContent).toBe("Donnée ajoutée à 1 lieu, dans 1 nouvelle note.");
    expect(root.querySelector('a[download="notes-donnee-ajoutee-2026-11-21.json"]')).not.toBeNull();
    expect(lastAudit()).toEqual([]);
  });

  it("keeps a record not yet shown when switching", () => {
    const h = mount();
    read();
    check(valueId("no"));
    $<HTMLInputElement>(`#${DATE_ID}`).value = "2026-1";
    h.setLocale("fr");
    expect($<HTMLInputElement>(`#${valueId("no")}`).checked).toBe(true);
    expect($<HTMLInputElement>(`#${DATE_ID}`).value).toBe("2026-1");
  });
});

describe("opening and removing", () => {
  it("puts an opened file in the box without reading it", async () => {
    const h = mount("en", async () => FILE);
    const input = $<HTMLInputElement>(`#${ADD_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File([FILE], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($<HTMLTextAreaElement>(`#${ADD_TEXT_ID}`).value).toBe(FILE);
    expect(h.file()).toBeUndefined();
    expect(await status()).toBe(C.opened.en);
  });

  it("refuses a file that is too large before reading it", async () => {
    let called = false;
    mount("en", async () => {
      called = true;
      return "";
    });
    const input = $<HTMLInputElement>(`#${ADD_OPEN_ID}`);
    const big = new File(["x"], "big.json");
    Object.defineProperty(big, "size", { value: MAX_FILE_BYTES + 1 });
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(called).toBe(false);
    expect(errorLinks()).toEqual([addErrorText("too-large", "en")]);
  });

  it("says when a file cannot be opened, and keeps focus on the picker", async () => {
    mount("en", async () => {
      throw new Error("no");
    });
    const input = $<HTMLInputElement>(`#${ADD_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "a.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($("#fbd-status").textContent).toBe(C.readFailed.en);
    expect(document.activeElement?.id).toBe(ADD_OPEN_ID);
  });

  it("removes the file, the record and the copy from the page", async () => {
    const h = mount();
    read();
    fill();
    show();
    check(placeBoxId(0));
    submit("fbd-places-form");
    root.querySelector<HTMLButtonElement>('[data-action="fbd-clear"]')?.click();
    expect(h.file()).toBeUndefined();
    expect(h.copy()).toBeUndefined();
    expect(root.querySelector("#fbd-options-form")).toBeNull();
    expect(document.activeElement?.id).toBe(ADD_TEXT_ID);
    expect(await status()).toBe(C.cleared.en);
    read();
    expect($<HTMLInputElement>(`#${SOURCE_ID}`).value).toBe("");
  });

  it("does nothing after it is destroyed, even when a read finishes late", async () => {
    let finish: (s: string) => void = () => undefined;
    const h = mount("en", () => new Promise<string>((r) => (finish = r)));
    const input = $<HTMLInputElement>(`#${ADD_OPEN_ID}`);
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
    fill();
    show();
    check(placeBoxId(0));
    submit("fbd-places-form");
    expect(window.localStorage.length).toBe(0);
  });
});

describe("accessibility of the mounted tool", () => {
  for (const l of ["en", "fr"] as const) {
    it(`has no axe problems with errors, places and a copy (${l})`, async () => {
      mount(l);
      read();
      show();
      expect(root.querySelector("#fbd-errors")).not.toBeNull();
      let r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => v.id)).toEqual([]);
      fill();
      show(false);
      check(placeBoxId(0));
      submit("fbd-places-form");
      expect(root.querySelector("#fbd-copy")).not.toBeNull();
      r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => v.id)).toEqual([]);
      expect(lastAudit()).toEqual([]);
    });
  }

  it("works from the keyboard alone: every control can take focus", () => {
    mount();
    read();
    fill();
    show(false);
    const controls = Array.from(root.querySelectorAll<HTMLElement>("input, textarea, select, button, a[href]"));
    expect(controls.length).toBeGreaterThan(15);
    for (const c of controls) {
      expect(c.getAttribute("tabindex"), c.outerHTML).not.toBe("-1");
      c.focus();
      expect(document.activeElement).toBe(c);
    }
  });
});
