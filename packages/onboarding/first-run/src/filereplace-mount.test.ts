// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { FILE_REPLACE_COPY as C, optionProblemText, replaceErrorText } from "./filereplace-copy";
import { mountFileReplace, type FileReplaceHandle } from "./filereplace-mount";
import { parseNote, type Note } from "./model";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { CASE_ID, FIND_ID, REPLACE_OPEN_ID, REPLACE_TEXT_ID, WHOLE_ID, WITH_ID, acceptId, fieldBoxId } from "./views-filereplace";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function withText(n: Note, note: string): Note {
  const out = parseNote({ ...n, note });
  if (!out) throw new Error("bad note");
  return out;
}

const FILE = exportNotes(
  [
    withText(testNote("a", "Kng Café", [{ key: "elevator", value: "yes", source: "Kng survey" }], "12 Kng St W"), "Ramp on the Kng side."),
    testNote("b", "Library", [], "100 King St W"),
    testNote("c", "Station", [], "1 Front St"),
  ],
  "2026-11-01",
);

let root: HTMLElement;
let handle: FileReplaceHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileReplaceHandle {
  document.documentElement.lang = locale;
  handle = mountFileReplace(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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
  $<HTMLTextAreaElement>(`#${REPLACE_TEXT_ID}`).value = text;
  submit("fre-file-form");
}

function search(find: string, replace: string, extra: { whole?: boolean; matchCase?: boolean; fields?: Array<"name" | "address" | "note"> } = {}): void {
  $<HTMLInputElement>(`#${FIND_ID}`).value = find;
  $<HTMLInputElement>(`#${WITH_ID}`).value = replace;
  $<HTMLInputElement>(`#${WHOLE_ID}`).checked = extra.whole ?? false;
  $<HTMLInputElement>(`#${CASE_ID}`).checked = extra.matchCase ?? false;
  for (const f of ["name", "address", "note"] as const) $<HTMLInputElement>(`#${fieldBoxId(f)}`).checked = (extra.fields ?? ["name", "address", "note"]).includes(f);
  submit("fre-options-form");
}

function copyNotes(): Note[] {
  const href = root.querySelector('a[download="notes-replaced-2026-11-21.json"]')?.getAttribute("href") ?? "";
  return importNotes(decodeURIComponent(href.replace(/^data:application\/json;charset=utf-8,/, ""))).notes;
}

const errorLinks = (): string[] => Array.from(root.querySelectorAll("#fre-errors a")).map((a) => a.textContent ?? "");

describe("reading a file", () => {
  it("shows the options, moves focus to the find box and announces the notes read", async () => {
    const h = mount();
    read();
    expect(h.file()?.notes).toBe(3);
    expect(document.activeElement?.id).toBe(FIND_ID);
    expect(await status()).toBe(`3 ${C.readDone.en}`);
    expect(lastAudit()).toEqual([]);
  });

  it("names the problem when the text is not an export, and its link moves focus to the box", () => {
    const h = mount();
    read("{");
    expect(document.activeElement?.id).toBe("fre-errors");
    expect(errorLinks()).toEqual([replaceErrorText("not-json", "en")]);
    expect(h.file()).toBeUndefined();
    expect(root.querySelector("#fre-options-form")).toBeNull();
    root.querySelector<HTMLAnchorElement>("#fre-errors a")?.click();
    expect(document.activeElement?.id).toBe(REPLACE_TEXT_ID);
  });
});

describe("showing the changes", () => {
  it("lists every change, all ticked, moves focus to them and announces the summary", async () => {
    const h = mount();
    read();
    search("Kng", "King");
    expect(document.activeElement?.id).toBe("fre-results");
    expect(h.report()?.hits.map((x) => x.id)).toEqual(["name|a", "address|a", "note|a"]);
    for (const i of [0, 1, 2]) expect($<HTMLInputElement>(`#${acceptId(i)}`).checked).toBe(true);
    expect(await status()).toBe("“Kng” → “King”: 3 matches in 3 fields across 3 notes.");
    expect(lastAudit()).toEqual([]);
  });

  it("finds whole words only, matching capitals, in the places chosen", () => {
    const h = mount();
    read();
    search("St", "Street", { whole: true, fields: ["address"] });
    expect(h.report()?.hits.map((x) => [x.id, x.after])).toEqual([
      ["address|a", "12 Kng Street W"],
      ["address|b", "100 King Street W"],
      ["address|c", "1 Front Street"],
    ]);
    search("st", "Street", { whole: true, matchCase: true, fields: ["address"] });
    expect(h.report()?.hits).toEqual([]);
    expect($("#fre-none").textContent).toBe(C.none.en);
  });

  it("lists every problem with the options, keeps what was typed and shows no changes", () => {
    const h = mount();
    read();
    search("", "x".repeat(201), { fields: [] });
    expect(document.activeElement?.id).toBe("fre-errors");
    expect(errorLinks()).toEqual([optionProblemText("find-empty", "en"), optionProblemText("replace-long", "en"), optionProblemText("no-fields", "en")]);
    expect($<HTMLInputElement>(`#${WITH_ID}`).value).toHaveLength(201);
    expect(h.report()).toBeUndefined();
    root.querySelectorAll<HTMLAnchorElement>("#fre-errors a")[2]?.click();
    expect(document.activeElement?.id).toBe(fieldBoxId("name"));
    expect(lastAudit()).toEqual([]);
  });

  it("replaces the old changes and copy when the search changes", () => {
    const h = mount();
    read();
    search("Kng", "King");
    submit("fre-apply-form");
    expect(h.copy()).toBeDefined();
    search("Front", "Front Street");
    expect(h.copy()).toBeUndefined();
    expect(root.querySelector("#fre-copy")).toBeNull();
    expect(h.report()?.hits.map((x) => x.id)).toEqual(["address|c"]);
  });
});

describe("making the copy", () => {
  it("makes every ticked change, keeping each record, and announces what changed", async () => {
    const h = mount();
    read();
    search("Kng", "King");
    submit("fre-apply-form");
    expect(document.activeElement?.id).toBe("fre-copy");
    expect(h.copy()).toMatchObject({ replaced: 3, fields: 3, notesChanged: 1 });
    expect(await status()).toBe(`${C.made.en} 3 replacements in 3 fields across 1 note.`);
    const a = copyNotes().find((n) => n.id === "a");
    expect([a?.placeName, a?.address, a?.note]).toEqual(["King Café", "12 King St W", "Ramp on the King side."]);
    expect(a?.facts.find((f) => f.key === "elevator")?.provenance).toEqual({ source: "Kng survey", licence: "CC0-1.0", recordedOn: "2026-10-01" });
    expect(lastAudit()).toEqual([]);
  });

  it("leaves out unticked changes and keeps the ticks on screen", () => {
    const h = mount();
    read();
    search("Kng", "King");
    $<HTMLInputElement>(`#${acceptId(0)}`).checked = false;
    submit("fre-apply-form");
    expect(h.copy()).toMatchObject({ fields: 2 });
    expect($<HTMLInputElement>(`#${acceptId(0)}`).checked).toBe(false);
    expect(copyNotes().find((n) => n.id === "a")?.placeName).toBe("Kng Café");
    expect(Array.from(root.querySelectorAll(".fre-changes li")).map((li) => li.textContent)).toEqual([
      "Address of Kng Café: 12 Kng St W → 12 King St W",
      "Note text of Kng Café: Ramp on the Kng side. → Ramp on the King side.",
    ]);
  });

  it("ticks and unticks every change at once, and says so", async () => {
    const h = mount();
    read();
    search("Kng", "King");
    root.querySelector<HTMLButtonElement>('[data-action="fre-untick-all"]')?.click();
    for (const i of [0, 1, 2]) expect($<HTMLInputElement>(`#${acceptId(i)}`).checked).toBe(false);
    expect(await status()).toBe(C.noneTicked.en);
    root.querySelector<HTMLButtonElement>('[data-action="fre-tick-all"]')?.click();
    for (const i of [0, 1, 2]) expect($<HTMLInputElement>(`#${acceptId(i)}`).checked).toBe(true);
    expect(await status()).toBe(C.allTicked.en);
    submit("fre-apply-form");
    expect(h.copy()).toMatchObject({ fields: 3 });
  });

  it("says when a change makes a note the same place as another, and counts the places", () => {
    mount();
    read(exportNotes([testNote("x", "Kng Café", [], "1 King St"), testNote("y", "King Café", [], "1 King St")], "2026-11-01"));
    search("Kng", "King", { fields: ["name"] });
    submit("fre-apply-form");
    expect(Array.from(root.querySelectorAll(".fre-changes li")).map((li) => li.textContent)).toEqual([
      "Place name of Kng Café: Kng Café → King Café (joins another place with this name and address; their records go together)",
    ]);
    expect($("#fre-copy-places").textContent).toBe("The file had 2 places; the copy has 1, as 1 joined another.");
  });

  it("asks for at least one tick, linking to the first tick box", () => {
    const h = mount();
    read();
    search("Kng", "King");
    for (const i of [0, 1, 2]) $<HTMLInputElement>(`#${acceptId(i)}`).checked = false;
    submit("fre-apply-form");
    expect(document.activeElement?.id).toBe("fre-errors");
    expect(errorLinks()).toEqual([C.noneAccepted.en]);
    expect(h.copy()).toBeUndefined();
    root.querySelector<HTMLAnchorElement>("#fre-errors a")?.click();
    expect(document.activeElement?.id).toBe(acceptId(0));
    expect(lastAudit()).toEqual([]);
  });

  it("never makes a change the App would not keep", () => {
    const h = mount();
    read(exportNotes([testNote("x", "Kng", [], "1 Kng St"), testNote("y", "Kng Café", [], null)], "2026-11-01"));
    search("Kng", "", { fields: ["name"] });
    expect(root.querySelectorAll('.fre-hits input[type="checkbox"]')).toHaveLength(1);
    submit("fre-apply-form");
    expect(h.copy()).toMatchObject({ fields: 1 });
    expect(copyNotes().map((n) => n.placeName).sort()).toEqual(["Café", "Kng"]);
  });

  it("finds nothing left when the copy is read back and searched again", () => {
    mount();
    read();
    search("Kng", "King");
    submit("fre-apply-form");
    const href = root.querySelector('a[download="notes-replaced-2026-11-21.json"]')?.getAttribute("href") ?? "";
    read(decodeURIComponent(href.replace(/^data:application\/json;charset=utf-8,/, "")));
    search("Kng", "King");
    expect($("#fre-none").textContent).toBe(C.none.en);
  });

  it("keeps the search for the next file", () => {
    const h = mount();
    read();
    search("Kng", "King", { whole: true });
    read();
    expect($<HTMLInputElement>(`#${FIND_ID}`).value).toBe("Kng");
    expect($<HTMLInputElement>(`#${WHOLE_ID}`).checked).toBe(true);
    expect(h.report()).toBeUndefined();
  });
});

describe("the language", () => {
  it("keeps the file, search, ticks and copy when switching to French", () => {
    const h = mount();
    read();
    search("Kng", "King");
    $<HTMLInputElement>(`#${acceptId(2)}`).checked = false;
    submit("fre-apply-form");
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("h2").textContent).toBe(C.title.fr);
    expect($<HTMLInputElement>(`#${acceptId(2)}`).checked).toBe(false);
    expect($("#fre-copy-summary").textContent).toBe("2 remplacements dans 2 champs sur 1 note.");
    expect(root.querySelector('a[download="notes-remplacees-2026-11-21.json"]')).not.toBeNull();
    expect(lastAudit()).toEqual([]);
  });

  it("keeps a search not yet shown when switching", () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${FIND_ID}`).value = "Kn";
    h.setLocale("fr");
    expect($<HTMLInputElement>(`#${FIND_ID}`).value).toBe("Kn");
  });
});

describe("opening and removing", () => {
  it("puts an opened file in the box without reading it", async () => {
    const h = mount("en", async () => FILE);
    const input = $<HTMLInputElement>(`#${REPLACE_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File([FILE], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($<HTMLTextAreaElement>(`#${REPLACE_TEXT_ID}`).value).toBe(FILE);
    expect(h.file()).toBeUndefined();
    expect(document.activeElement?.id).toBe(REPLACE_TEXT_ID);
    expect(await status()).toBe(C.opened.en);
  });

  it("refuses a file that is too large before reading it", async () => {
    let called = false;
    mount("en", async () => {
      called = true;
      return "";
    });
    const input = $<HTMLInputElement>(`#${REPLACE_OPEN_ID}`);
    const big = new File(["x"], "big.json");
    Object.defineProperty(big, "size", { value: MAX_FILE_BYTES + 1 });
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(called).toBe(false);
    expect(errorLinks()).toEqual([replaceErrorText("too-large", "en")]);
  });

  it("says when a file cannot be opened, and keeps focus on the picker", async () => {
    mount("en", async () => {
      throw new Error("no");
    });
    const input = $<HTMLInputElement>(`#${REPLACE_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "a.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($("#fre-status").textContent).toBe(C.readFailed.en);
    expect(document.activeElement?.id).toBe(REPLACE_OPEN_ID);
  });

  it("removes the file, the search and the copy from the page", async () => {
    const h = mount();
    read();
    search("Kng", "King");
    submit("fre-apply-form");
    root.querySelector<HTMLButtonElement>('[data-action="fre-clear"]')?.click();
    expect(h.file()).toBeUndefined();
    expect(h.copy()).toBeUndefined();
    expect($<HTMLTextAreaElement>(`#${REPLACE_TEXT_ID}`).value).toBe("");
    expect(root.querySelector("#fre-options-form")).toBeNull();
    expect(document.activeElement?.id).toBe(REPLACE_TEXT_ID);
    expect(await status()).toBe(C.cleared.en);
    read();
    expect($<HTMLInputElement>(`#${FIND_ID}`).value).toBe("");
  });

  it("does nothing after it is destroyed, even when a read finishes late", async () => {
    let finish: (s: string) => void = () => undefined;
    const h = mount("en", () => new Promise<string>((r) => (finish = r)));
    const input = $<HTMLInputElement>(`#${REPLACE_OPEN_ID}`);
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
    search("Kng", "King");
    submit("fre-apply-form");
    expect(window.localStorage.length).toBe(0);
  });
});

describe("accessibility of the mounted tool", () => {
  for (const l of ["en", "fr"] as const) {
    it(`has no axe problems with errors, changes and a copy (${l})`, async () => {
      mount(l);
      read();
      search("", "");
      expect(root.querySelector("#fre-errors")).not.toBeNull();
      let r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => v.id)).toEqual([]);
      search("Kng", "King");
      submit("fre-apply-form");
      expect(root.querySelector("#fre-copy")).not.toBeNull();
      r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => v.id)).toEqual([]);
      expect(lastAudit()).toEqual([]);
    });
  }

  it("works from the keyboard alone: every control can take focus", () => {
    mount();
    read();
    search("Kng", "King");
    const controls = Array.from(root.querySelectorAll<HTMLElement>("input, textarea, button, a[href]"));
    expect(controls.length).toBeGreaterThan(10);
    for (const c of controls) {
      expect(c.getAttribute("tabindex"), c.outerHTML).not.toBe("-1");
      c.focus();
      expect(document.activeElement).toBe(c);
    }
  });
});
