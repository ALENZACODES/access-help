// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import type { FactKey } from "./facts";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { FILE_ROUND_COPY as C, problemText, roundErrorText } from "./fileround-copy";
import { mountFileRound, type FileRoundHandle } from "./fileround-mount";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { decodeTextExportHref } from "./textexport";
import { LICENCE_ID, SOURCE_ID, VISITED_ID, answerId, askId, noteId } from "./views-fileround";
import type { Answer } from "./visitrecord";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const ALL_YES = (["step-free-entry", "accessible-washroom", "automatic-door", "elevator"] as const).map((key) => ({ key, value: "yes" as const }));
const FILE = exportNotes(
  [
    testNote("k1", "Library", [{ key: "elevator", value: "yes" }], "100 King St W"),
    testNote("k2", "Café", [], "12 King St W"),
    testNote("d1", "Done", ALL_YES, "5 Elm Ave"),
    testNote("n1", "Kiosk", [], null),
  ],
  "2026-11-01",
);

let root: HTMLElement;
let handle: FileRoundHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileRoundHandle {
  document.documentElement.lang = locale;
  handle = mountFileRound(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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
  $<HTMLTextAreaElement>("#frd-text").value = text;
  submit("frd-file-form");
}

function choose(index: number, key: FactKey, a: Answer): void {
  const radio = $<HTMLInputElement>(`#${answerId(index, key, a)}`);
  radio.checked = true;
  radio.dispatchEvent(new Event("change", { bubbles: true }));
}

const placeNames = (): string[] => Array.from(root.querySelectorAll(".frd-places h4")).map((h) => h.textContent ?? "");

describe("starting a round", () => {
  it("lists the places with something to look at, in walking order, and announces the counts", async () => {
    const h = mount();
    read();
    expect(document.activeElement?.id).toBe("frd-summary");
    expect(placeNames()).toEqual(["Café", "Library", "Kiosk"]);
    expect(h.round()?.leftOutDone).toBe(1);
    expect(root.querySelectorAll('[data-place] fieldset')).toHaveLength(4 + 3 + 4);
    expect($<HTMLInputElement>(`#${answerId(0, "elevator", "skip")}`).checked).toBe(true);
    expect(await status()).toBe("3 places on the round, 11 details to ask about. 1 place where every detail has a record is left off.");
    expect(lastAudit()).toEqual([]);
  });

  it("shows what the file says now beside each detail", () => {
    mount();
    read();
    const radio = $<HTMLInputElement>(`#${answerId(1, "step-free-entry", "yes")}`);
    expect(document.getElementById(radio.getAttribute("aria-describedby") ?? "")?.textContent).toBe("In the file now: Unknown");
  });

  it("asks about every detail when chosen, keeping what was entered", () => {
    const h = mount();
    read();
    choose(0, "elevator", "no");
    $<HTMLInputElement>(`#${askId("all")}`).checked = true;
    submit("frd-ask-form");
    expect(placeNames()).toEqual(["Done", "Café", "Library", "Kiosk"]);
    expect($<HTMLInputElement>(`#${answerId(1, "elevator", "no")}`).checked).toBe(true);
    expect(h.round()?.places.every((rp) => rp.ask.length === 4)).toBe(true);
    expect(lastAudit()).toEqual([]);
  });

  it("names the problem when the text is not an export, and links to the box", () => {
    mount();
    read("nope");
    expect(document.activeElement?.id).toBe("frd-errors");
    expect($("#frd-errors").textContent).toContain(roundErrorText("not-json", "en"));
    root.querySelector<HTMLAnchorElement>("#frd-errors a")?.click();
    expect(document.activeElement?.id).toBe("frd-text");
    expect(lastAudit()).toEqual([]);
  });
});

describe("making the notes file", () => {
  it("makes notes from the answers and the settings, and offers both downloads", async () => {
    const h = mount();
    read();
    choose(0, "elevator", "no");
    choose(0, "step-free-entry", "yes");
    $<HTMLInputElement>(`#${VISITED_ID}`).value = "2026-11-19";
    $<HTMLInputElement>(`#${SOURCE_ID}`).value = "Walk group";
    $<HTMLSelectElement>(`#${LICENCE_ID}`).value = "CC-BY-4.0";
    $<HTMLTextAreaElement>(`#${noteId(2)}`).value = "Closed on Sundays.";
    submit("frd-round-form");
    expect(document.activeElement?.id).toBe("frd-result");
    expect(h.result()?.notes.map((n) => n.placeName)).toEqual(["Café", "Kiosk"]);
    expect(await status()).toBe("2 new notes: 1 Yes, 1 No. 9 details stay Unknown.");

    const only = root.querySelector<HTMLAnchorElement>(`a[download="round-notes-2026-11-20.json"]`);
    const back = importNotes(decodeURIComponent((only?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, "")));
    expect(back.notes).toHaveLength(2);
    const cafe = back.notes.find((n) => n.placeName === "Café");
    expect(cafe?.facts.find((f) => f.key === "elevator")).toEqual({ key: "elevator", value: "no", provenance: { source: "Walk group", licence: "CC-BY-4.0", recordedOn: "2026-11-19" } });
    expect(back.notes.find((n) => n.placeName === "Kiosk")?.facts.every((f) => f.value === "unknown")).toBe(true);

    const withFile = root.querySelector<HTMLAnchorElement>(`a[download="notes-with-round-2026-11-20.json"]`);
    expect(importNotes(decodeURIComponent((withFile?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, ""))).notes).toHaveLength(6);
    expect(Array.from(root.querySelectorAll(".frd-changes li li")).map((li) => li.textContent)).toEqual(["Step-free entrance: Yes (no record before)", "Elevator: No (no record before)"]);
    const csv = decodeURIComponent((root.querySelector(`a[download="round-answers-2026-11-20.csv"]`)?.getAttribute("href") ?? "").replace(/^data:text\/csv;charset=utf-8,/, ""));
    expect(csv.split("\r\n").filter((x) => x.startsWith("2026-11-19,"))).toHaveLength(2);
    const report = decodeTextExportHref(root.querySelector(`a[download="round-report-2026-11-20.txt"]`)?.getAttribute("href") ?? "") ?? "";
    expect(report).toContain("Kiosk\n    No address\n    Only a note was written for this place.\n    Note: Closed on Sundays.");
    expect(lastAudit()).toEqual([]);
  });

  it("asks for something to be recorded first", () => {
    mount();
    read();
    submit("frd-round-form");
    expect(document.activeElement?.id).toBe("frd-errors");
    expect($("#frd-errors").textContent).toContain(problemText("empty", "en"));
    root.querySelector<HTMLAnchorElement>("#frd-errors a")?.click();
    expect(document.activeElement?.id).toBe(answerId(0, "step-free-entry", "yes"));
  });

  it("lists every problem with the settings and notes, ties each to its field and keeps what was typed", () => {
    mount();
    read();
    choose(0, "elevator", "yes");
    $<HTMLInputElement>(`#${VISITED_ID}`).value = "2026-11-21";
    $<HTMLInputElement>(`#${SOURCE_ID}`).value = " ";
    $<HTMLTextAreaElement>(`#${noteId(1)}`).value = "x".repeat(501);
    submit("frd-round-form");
    expect(Array.from(root.querySelectorAll("#frd-errors li")).map((li) => li.textContent)).toEqual([
      problemText("future", "en"),
      problemText("source", "en"),
      `Library ${problemText("note-long", "en")}`,
    ]);
    const day = $<HTMLInputElement>(`#${VISITED_ID}`);
    expect(day.value).toBe("2026-11-21");
    expect(day.getAttribute("aria-describedby")).toBe(`h-${VISITED_ID} e-${VISITED_ID}`);
    expect($(`#${noteId(1)}`).getAttribute("aria-invalid")).toBe("true");
    expect($<HTMLInputElement>(`#${answerId(0, "elevator", "yes")}`).checked).toBe(true);
    root.querySelector<HTMLAnchorElement>(`#frd-errors a[href="#${noteId(1)}"]`)?.click();
    expect(document.activeElement?.id).toBe(noteId(1));
    expect(lastAudit()).toEqual([]);
  });

  it("says so, without moving focus, when an answer changes after the file was made", async () => {
    mount();
    read();
    choose(0, "elevator", "yes");
    submit("frd-round-form");
    const radio = $<HTMLInputElement>(`#${answerId(0, "elevator", "no")}`);
    radio.focus();
    choose(0, "elevator", "no");
    expect(document.activeElement).toBe(radio);
    expect($("#frd-edited").textContent).toBe(C.edited.en);
    expect(await status()).toBe(C.edited.en);
    choose(0, "elevator", "yes");
    expect(root.querySelectorAll("#frd-edited")).toHaveLength(1);
    submit("frd-round-form");
    expect(root.querySelector("#frd-edited")).toBeNull();
    expect(lastAudit()).toEqual([]);
  });
});

describe("files, language and removing", () => {
  it("opens a file into the box", async () => {
    const h = mount("en", () => Promise.resolve(FILE));
    const input = $<HTMLInputElement>("#frd-open");
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($<HTMLTextAreaElement>("#frd-text").value).toBe(FILE);
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
    const input = $<HTMLInputElement>("#frd-open");
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(reads).toBe(0);
    expect($("#frd-errors").textContent).toContain(roundErrorText("too-large", "en"));
  });

  it("switches to French and keeps the answers", () => {
    const h = mount();
    read();
    choose(0, "elevator", "no");
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#frd-title").textContent).toBe(C.title.fr);
    expect($<HTMLInputElement>(`#${answerId(0, "elevator", "no")}`).checked).toBe(true);
    expect(root.querySelector(`label[for="${answerId(0, "elevator", "skip")}"]`)?.textContent).toBe("Pas regardé");
    expect(lastAudit()).toEqual([]);
  });

  it("removes the file and what was entered, saves nothing, and removes its live region on destroy", async () => {
    const h = mount();
    read();
    choose(0, "elevator", "no");
    $('[data-action="frd-clear"]').click();
    expect(h.file()).toBeUndefined();
    expect(h.entries()).toEqual({});
    expect(document.activeElement?.id).toBe("frd-text");
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

  it.each(["en", "fr"] as const)("passes on the round (%s)", async (l) => {
    mount(l);
    read();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on the round with problems (%s)", async (l) => {
    mount(l);
    read();
    $<HTMLInputElement>(`#${SOURCE_ID}`).value = "";
    submit("frd-round-form");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on the new notes (%s)", async (l) => {
    mount(l);
    read();
    choose(0, "elevator", "yes");
    submit("frd-round-form");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});
