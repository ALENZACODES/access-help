// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { importNotes } from "./exchange";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { FILE_SHEET_COPY as C, madeText, readText, setupErrorText, sheetErrorText } from "./filesheet-copy";
import { mountFileSheet, type FileSheetHandle } from "./filesheet-mount";
import { AXE_OPTIONS } from "./shelltest";
import { setupToJson } from "./filesheet-setup";
import { FIXED_ID, SETUP_OPEN_ID, WORDS_ID, columnSelectId } from "./views-filesheet";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const SHEET = ["Nom;Adresse;Ascenseur;Ramp?", "Bibliothèque;1 rue King;oui;Y", "Piscine;9 Lake Rd;NON;", "Café;12 King St;peut-être;?", ";5 Rink Rd;oui;oui"].join("\n");

let root: HTMLElement;
let handle: FileSheetHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileSheetHandle {
  document.documentElement.lang = locale;
  handle = mountFileSheet(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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

function read(text = SHEET): void {
  $<HTMLTextAreaElement>("#fh-text").value = text;
  $<HTMLFormElement>("#fh-file-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

function setValue(id: string, v: string): void {
  $<HTMLInputElement | HTMLSelectElement>(`#${id}`).value = v;
}

function make(): void {
  $<HTMLFormElement>("#fh-setup-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

/** The usual setup: Ramp? is the step-free entrance, and the answers come from a mapping day. */
function fillSetup(): void {
  setValue(columnSelectId(3), "step-free-entry");
  setValue(FIXED_ID.source, "Mapping day, Elm St");
  setValue(FIXED_ID.licence, "CC-BY-4.0");
  setValue(FIXED_ID.recordedOn, "2026-11-14");
}

function notesFile(): string {
  const a = Array.from(root.querySelectorAll<HTMLAnchorElement>("a.linkbtn")).find((x) => x.textContent === C.downloadNotes.en);
  return decodeURIComponent((a?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, ""));
}

describe("reading a spreadsheet", () => {
  it("shows one choice per column with a guess and examples, and moves focus to the first", async () => {
    const h = mount();
    read();
    expect(h.mapping()).toEqual(["place_name", "address", "elevator", ""]);
    expect(document.activeElement?.id).toBe(columnSelectId(0));
    expect(root.querySelector(`label[for="${columnSelectId(3)}"]`)?.textContent).toBe("Column 4: Ramp?");
    expect($(`#h-${columnSelectId(2)}`).textContent).toBe("For example: oui, NON, peut-être");
    expect(await status()).toBe(readText(4, 4, "en"));
    expect(lastAudit()).toEqual([]);
  });

  it("names the problem when there is nothing under the first row", () => {
    mount();
    read("a,b");
    expect(document.activeElement?.id).toBe("fh-errors");
    expect($("#fh-errors").textContent).toContain(sheetErrorText("no-rows", "en"));
    expect($("#fh-text").getAttribute("aria-invalid")).toBe("true");
  });
});

describe("setup", () => {
  it("asks for a source, licence and date instead of filling them in, each linked to its field", () => {
    mount();
    read();
    make();
    expect(document.activeElement?.id).toBe("fh-errors");
    const text = $("#fh-errors").textContent ?? "";
    for (const code of ["no-source", "bad-licence", "bad-date"] as const) expect(text).toContain(setupErrorText(code, "en"));
    expect($(`#${FIXED_ID.licence}`).getAttribute("aria-invalid")).toBe("true");
    root.querySelector<HTMLAnchorElement>(`#fh-errors a[href="#${FIXED_ID.source}"]`)?.click();
    expect(document.activeElement?.id).toBe(FIXED_ID.source);
    expect(lastAudit()).toEqual([]);
  });

  it("ties each error to its field, so a screen reader says why it needs fixing", () => {
    mount();
    read();
    setValue(columnSelectId(1), "place_name");
    make();
    for (const id of [FIXED_ID.source, FIXED_ID.licence, FIXED_ID.recordedOn, columnSelectId(0)]) {
      const el = $(`#${id}`);
      expect(el.getAttribute("aria-invalid"), id).toBe("true");
      expect(el.getAttribute("aria-describedby")?.split(" "), id).toContain(`e-${id}`);
      expect($(`#e-${id}`).textContent, id).not.toBe("");
    }
    expect($(`#e-${columnSelectId(0)}`).textContent).toBe(setupErrorText("two-columns", "en"));
    expect($(`#${FIXED_ID.source}`).getAttribute("aria-describedby")).toBe(`h-${FIXED_ID.source} e-${FIXED_ID.source}`);
    expect($(`#${columnSelectId(2)}`).getAttribute("aria-invalid")).toBeNull();
  });

  it("keeps every choice and typed value when it asks again", () => {
    const h = mount();
    read();
    setValue(columnSelectId(3), "step-free-entry");
    setValue(FIXED_ID.source, "Mapping day");
    make();
    expect(h.mapping()[3]).toBe("step-free-entry");
    expect($<HTMLInputElement>(`#${FIXED_ID.source}`).value).toBe("Mapping day");
    expect($<HTMLSelectElement>(`#${columnSelectId(3)}`).value).toBe("step-free-entry");
  });

  it("refuses the same target for two columns and a word in two lists", () => {
    mount();
    read();
    fillSetup();
    setValue(columnSelectId(1), "place_name");
    setValue(WORDS_ID.no, "non, oui");
    make();
    const text = $("#fh-errors").textContent ?? "";
    expect(text).toContain(setupErrorText("two-columns", "en"));
    expect(text).toContain(setupErrorText("word-in-two-lists", "en", "oui"));
  });
});

describe("making the notes file", () => {
  it("makes the notes, moves focus to the results, announces them and passes the App's audit", async () => {
    const h = mount();
    read();
    fillSetup();
    make();
    expect(document.activeElement?.id).toBe("fh-results");
    expect(h.result()?.preview.notes.map((n) => n.placeName)).toEqual(["Bibliothèque", "Piscine"]);
    expect(await status()).toBe(madeText(2, 2, "en"));
    expect(lastAudit()).toEqual([]);
  });

  it("downloads a notes file the App reads in full, with the person's source on every answer", () => {
    mount();
    read();
    fillSetup();
    make();
    const back = importNotes(notesFile());
    expect(back.rejected).toBe(0);
    const lib = back.notes.find((n) => n.placeName === "Bibliothèque");
    expect(lib?.facts.find((f) => f.key === "step-free-entry")).toEqual({ key: "step-free-entry", value: "yes", provenance: { source: "Mapping day, Elm St", licence: "CC-BY-4.0", recordedOn: "2026-11-14" } });
  });

  it("lists answers in no word list and rows not used, on the person's own rows and columns", () => {
    mount();
    read();
    fillSetup();
    make();
    expect($(".fh-unmatched").textContent).toBe("“peut-être” (1 cell)");
    const problems = Array.from(root.querySelectorAll(".fh-problems li")).map((li) => li.textContent);
    expect(problems).toEqual(["Row 4, column Ascenseur: This answer is in none of your word lists.", "Row 5, column Nom: The place name is empty."]);
  });

  it("offers the rows not used as the person's own rows with a reason", () => {
    mount();
    read();
    fillSetup();
    make();
    const a = Array.from(root.querySelectorAll<HTMLAnchorElement>("a.linkbtn")).find((x) => x.textContent === C.downloadProblems.en);
    const csv = decodeURIComponent((a?.getAttribute("href") ?? "").replace(/^data:text\/csv;charset=utf-8,/, ""));
    const lines = csv.replace(/^\uFEFF/, "").trimEnd().split("\r\n");
    expect(lines[0]).toBe("Nom,Adresse,Ascenseur,Ramp?,row,column,reason");
    expect(lines[1]).toBe("Café,12 King St,peut-être,?,4,Ascenseur,This answer is in none of your word lists.");
  });

  it("uses a word once it is added to a list", () => {
    const h = mount();
    read();
    fillSetup();
    make();
    setValue(WORDS_ID.unknown, `${$<HTMLInputElement>(`#${WORDS_ID.unknown}`).value}, peut-être`);
    make();
    expect(h.result()?.unmatched).toEqual([]);
    expect(h.result()?.preview.notes.map((n) => n.placeName)).toEqual(["Bibliothèque", "Piscine"]);
    expect(root.querySelector(".fh-unmatched")).toBeNull();
  });
});

describe("rows as the person wrote them", () => {
  it("reports a row with a different number of cells on its own row, and later rows keep their numbers", () => {
    const h = mount();
    read(["Nom;Ascenseur", "Bibliothèque;oui", "Piscine;non;en trop", "Café;oui"].join("\n"));
    setValue(FIXED_ID.source, "Survey");
    setValue(FIXED_ID.licence, "CC0-1.0");
    setValue(FIXED_ID.recordedOn, "2026-11-01");
    make();
    expect(h.result()?.preview.problems.map((p) => [p.row, p.code])).toEqual([[3, "wrong-width"]]);
    expect(h.result()?.preview.notes.map((n) => n.placeName)).toEqual(["Bibliothèque", "Café"]);
    expect($(".fh-problems li").textContent).toBe("Row 3: It has a different number of cells from the first row.");
    expect(lastAudit()).toEqual([]);
  });

  it("reads cells pasted straight from a spreadsheet, separated by tabs, with a blank column name", () => {
    const h = mount();
    read(["Place\t\tElevator", "Pool\tnote\tY", "Arena\t\tN"].join("\n"));
    expect(h.sheet()?.header).toEqual(["Place", "", "Elevator"]);
    expect(h.mapping()).toEqual(["place_name", "", "elevator"]);
    expect(root.querySelector(`label[for="${columnSelectId(1)}"]`)?.textContent).toBe("Column 2: –");
    setValue(FIXED_ID.source, "Survey");
    setValue(FIXED_ID.licence, "CC0-1.0");
    setValue(FIXED_ID.recordedOn, "2026-11-01");
    make();
    expect(h.result()?.preview.notes.map((n) => [n.placeName, n.facts.find((f) => f.key === "elevator")?.value])).toEqual([
      ["Pool", "yes"],
      ["Arena", "no"],
    ]);
  });
});

describe("saved choices", () => {
  function openChoices(json: string): void {
    const input = $<HTMLInputElement>(`#${SETUP_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File([json], "choices.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  it("downloads the choices as they stand, and fills them in on another spreadsheet with the same columns", async () => {
    let next = "";
    const h = mount("en", () => Promise.resolve(next));
    read();
    fillSetup();
    make();
    const a = Array.from(root.querySelectorAll<HTMLAnchorElement>("a.linkbtn")).find((x) => x.textContent === C.downloadSetup.en);
    const json = decodeURIComponent((a?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, ""));
    expect(JSON.parse(json).columns).toEqual({ Nom: "place_name", Adresse: "address", Ascenseur: "elevator", "Ramp?": "step-free-entry" });
    // Next week: the same columns in another order, and one column gone.
    read(["Ascenseur,NOM,Ramp?", "oui,Pool,non"].join("\n"));
    next = json;
    openChoices(json);
    await tick();
    expect(h.mapping()).toEqual(["elevator", "place_name", "step-free-entry"]);
    expect(h.fixed()).toEqual({ source: "Mapping day, Elm St", licence: "CC-BY-4.0", recordedOn: "2026-11-14" });
    expect($("#fh-status").textContent).toBe(`${C.setupApplied.en} Saved columns not in this spreadsheet: Adresse.`);
    expect(document.activeElement?.id).toBe(columnSelectId(0));
    expect(h.result()).toBeUndefined();
    make();
    expect(h.result()?.preview.notes.map((n) => n.placeName)).toEqual(["Pool"]);
  });

  it("says when a file is not a choices file, and changes nothing", async () => {
    const h = mount("en", () => Promise.resolve("{}"));
    read();
    const before = h.mapping();
    openChoices("{}");
    await tick();
    expect($("#fh-status").textContent).toBe(C.setupFileErrors["wrong-format"].en);
    expect(h.mapping()).toEqual(before);
  });

  it("fills in only what passes the checks; a bad saved licence is still reported when making", async () => {
    const json = setupToJson(["Nom", "Ascenseur"], ["place_name", "elevator"], { source: "Survey", licence: "All rights reserved", recordedOn: "2026-11-01" }, { yes: "", no: "", unknown: "" });
    const h = mount("en", () => Promise.resolve(json));
    read();
    openChoices(json);
    await tick();
    expect(h.words().yes).toContain("oui");
    make();
    expect($("#fh-errors").textContent).toContain(setupErrorText("bad-licence", "en"));
  });
});

describe("files, language and removing", () => {
  it("opens a CSV file into the box", async () => {
    const h = mount("en", () => Promise.resolve(SHEET));
    const input = $<HTMLInputElement>("#fh-open");
    Object.defineProperty(input, "files", { value: [new File(["x"], "sheet.csv")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($<HTMLTextAreaElement>("#fh-text").value).toBe(SHEET);
    expect(h.sheet()).toBeUndefined();
    expect(await status()).toBe(C.opened.en);
  });

  it("refuses a file that is too large before reading it", async () => {
    let reads = 0;
    mount("en", () => {
      reads++;
      return Promise.resolve("");
    });
    const big = new File(["x"], "big.csv");
    Object.defineProperty(big, "size", { value: MAX_FILE_BYTES + 1 });
    const input = $<HTMLInputElement>("#fh-open");
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(reads).toBe(0);
    expect($("#fh-errors").textContent).toContain(sheetErrorText("too-large", "en"));
  });

  it("switches to French and keeps every choice", () => {
    const h = mount();
    read();
    fillSetup();
    make();
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#fh-title").textContent).toBe(C.title.fr);
    expect(h.mapping()[3]).toBe("step-free-entry");
    expect($<HTMLInputElement>(`#${FIXED_ID.source}`).value).toBe("Mapping day, Elm St");
    expect(lastAudit()).toEqual([]);
  });

  it("removes everything, saves nothing, and removes its live region on destroy", async () => {
    const h = mount();
    read();
    fillSetup();
    make();
    $('[data-action="fh-clear"]').click();
    expect(h.sheet()).toBeUndefined();
    expect(h.fixed()).toEqual({ source: "", licence: "", recordedOn: "" });
    expect(document.activeElement?.id).toBe("fh-text");
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

  it.each(["en", "fr"] as const)("passes on the column choices with setup errors (%s)", async (l) => {
    mount(l);
    read();
    make();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on the results (%s)", async (l) => {
    mount(l);
    read();
    fillSetup();
    make();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});
