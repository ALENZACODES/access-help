// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { FACT_KEYS } from "./facts";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { FILE_FIRST_COPY as C, firstErrorText, problemText } from "./filefirst-copy";
import { mountFileFirst, type FileFirstHandle } from "./filefirst-mount";
import { AXE_OPTIONS } from "./shelltest";
import { decodeTextExportHref } from "./textexport";
import { testNote } from "./testnotes";
import { AREA_ID, COUNT_ID, OLD_ID, keyId, orderId, viewId } from "./views-filefirst";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const yes = (key: (typeof FACT_KEYS)[number], on = "2026-10-01") => ({ key, value: "yes" as const, on });
const FILE = exportNotes(
  [
    testNote("f", "Full", FACT_KEYS.map((k) => yes(k)), "1 King St W"),
    testNote("o", "Old", FACT_KEYS.map((k) => yes(k, "2025-06-01")), "2 King St W"),
    testNote("s1", "Split", FACT_KEYS.map((k) => yes(k)), "3 Queen St E"),
    testNote("s2", "Split", [{ key: "elevator", value: "no", on: "2026-09-01" }], "3 Queen St E"),
    testNote("h", "Half", [yes("elevator", "2026-05-01"), yes("automatic-door", "2026-05-01")], "4 Queen St E"),
    testNote("b", "Bare", [], "5 Rue Saint-Denis"),
  ],
  "2026-11-01",
);

let root: HTMLElement;
let handle: FileFirstHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileFirstHandle {
  document.documentElement.lang = locale;
  handle = mountFileFirst(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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
  $<HTMLTextAreaElement>("#ffl-text").value = text;
  submit("ffl-file-form");
}

const listed = (): string[] => Array.from(root.querySelectorAll(".ffl-places h4")).map((h) => h.textContent ?? "");

describe("ranking", () => {
  it("ranks the places with something to look at, with reasons, and announces the counts", async () => {
    mount();
    read();
    expect(document.activeElement?.id).toBe("ffl-summary");
    expect(listed()).toEqual(["Bare", "Old", "Half", "Split"]);
    expect(Array.from(root.querySelectorAll('.ffl-places > li:nth-child(4) .ffl-reasons li')).map((li) => li.textContent)).toEqual(["Reports differ: Elevator"]);
    expect(await status()).toBe("4 places have something to look at; all are listed. 1 place with nothing to look at.");
    expect(lastAudit()).toEqual([]);
  });

  it("changes the order, details, year-old records, area and count", async () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${orderId("differ")}`).checked = true;
    $<HTMLInputElement>(`#${OLD_ID}`).checked = false;
    $<HTMLInputElement>(`#${AREA_ID}`).value = "king st";
    submit("ffl-options-form");
    expect(document.activeElement?.id).toBe("ffl-list");
    expect(h.options()).toMatchObject({ order: "differ", includeOld: false, area: "king st" });
    expect(listed()).toEqual([]);
    expect($("#ffl-summary").textContent).toBe("No place has anything to look at. 2 places with nothing to look at. 3 places whose address does not hold “king st”.");

    $<HTMLInputElement>(`#${AREA_ID}`).value = "";
    $<HTMLInputElement>(`#${COUNT_ID}`).value = "2";
    for (const k of FACT_KEYS) $<HTMLInputElement>(`#${keyId(k)}`).checked = k === "elevator";
    submit("ffl-options-form");
    expect(listed()).toEqual(["Split", "Bare"]);
    // Year-old records are still left out, so Old has nothing open on the elevator.
    expect(await status()).toBe(`${C.updated.en} 2 places have something to look at; all are listed. 3 places with nothing to look at.`);
    $<HTMLInputElement>(`#${OLD_ID}`).checked = true;
    submit("ffl-options-form");
    expect(listed()).toEqual(["Split", "Bare"]);
    expect($("#ffl-summary").textContent).toBe("3 places have something to look at; the first 2 are listed. 2 places with nothing to look at.");
    expect(lastAudit()).toEqual([]);
  });

  it("downloads the first places' notes and the ranking", () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${COUNT_ID}`).value = "2";
    submit("ffl-options-form");
    expect(h.picked().map((n) => n.place.name)).toEqual(["Bare", "Old"]);
    const notes = root.querySelector<HTMLAnchorElement>('a[download="notes-first-2-places-2026-11-21.json"]');
    const back = importNotes(decodeURIComponent((notes?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, "")));
    expect(back.notes.map((n) => n.placeName)).toEqual(["Bare", "Old"]);
    const csv = decodeURIComponent((root.querySelector('a[download="ranking-2-places-2026-11-21.csv"]')?.getAttribute("href") ?? "").replace(/^data:text\/csv;charset=utf-8,/, ""));
    expect(csv.split("\r\n").filter((l) => /^\d,/.test(l))).toHaveLength(2);
    const text = decodeTextExportHref(root.querySelector('a[download="list-2-places-2026-11-21.txt"]')?.getAttribute("href") ?? "") ?? "";
    expect(text).toContain("1. Bare\n    5 Rue Saint-Denis\n");
    expect(text).toContain("2. Old\n");
  });

  it("names the problem when the text is not an export, and links to the box", () => {
    mount();
    read("nope");
    expect(document.activeElement?.id).toBe("ffl-errors");
    expect($("#ffl-errors").textContent).toContain(firstErrorText("not-json", "en"));
    root.querySelector<HTMLAnchorElement>("#ffl-errors a")?.click();
    expect(document.activeElement?.id).toBe("ffl-text");
    expect(lastAudit()).toEqual([]);
  });
});

describe("the streets view", () => {
  it("shows streets with what is open on each, and announces it", async () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${viewId("streets")}`).checked = true;
    submit("ffl-options-form");
    expect(h.options().view).toBe("streets");
    expect(document.activeElement?.id).toBe("ffl-list");
    // Saint-Denis and King both have 4 open details on 1 place; Saint-Denis's place was never recorded. Queen has 3.
    expect(Array.from(root.querySelectorAll(".ffl-streets h4")).map((x) => x.textContent)).toEqual(["rue Saint-Denis", "King Street West", "Queen Street East"]);
    expect(Array.from(root.querySelectorAll(".ffl-streets > li > p")).map((p) => p.textContent)).toEqual([
      "1 place, 4 details to look at: 4 with no record. 1 place never recorded.",
      "1 place, 4 details to look at: 4 a year old or more.",
      "2 places, 3 details to look at: 2 with no record, 1 where reports differ.",
    ]);
    expect(await status()).toBe(`${C.updated.en} 3 streets have something to look at; all are listed.`);
    const notes = root.querySelector<HTMLAnchorElement>('a[download="notes-first-3-streets-2026-11-21.json"]');
    const back = importNotes(decodeURIComponent((notes?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, "")));
    expect(back.notes.map((n) => n.placeName)).toEqual(["Bare", "Old", "Half", "Split", "Split"]);
    expect(lastAudit()).toEqual([]);
  });

  it("keeps the streets view when the language changes", () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${viewId("streets")}`).checked = true;
    submit("ffl-options-form");
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#ffl-list").textContent).toBe("Premières rues (3)");
    expect(lastAudit()).toEqual([]);
  });
});

describe("problems with the ranking choices", () => {
  it("lists every problem, keeps what was typed and keeps the last ranking on screen", () => {
    const h = mount();
    read();
    for (const k of FACT_KEYS) $<HTMLInputElement>(`#${keyId(k)}`).checked = false;
    $<HTMLInputElement>(`#${COUNT_ID}`).value = "500";
    submit("ffl-options-form");
    expect(document.activeElement?.id).toBe("ffl-errors");
    expect(Array.from(root.querySelectorAll("#ffl-errors li")).map((li) => li.textContent)).toEqual([problemText("keys", "en"), problemText("count", "en")]);
    expect($<HTMLInputElement>(`#${COUNT_ID}`).value).toBe("500");
    expect($(`#${COUNT_ID}`).getAttribute("aria-invalid")).toBe("true");
    expect(h.options().count).toBe(10);
    expect(listed()).toHaveLength(4);
    root.querySelector<HTMLAnchorElement>(`#ffl-errors a[href="#${keyId("step-free-entry")}"]`)?.click();
    expect(document.activeElement?.id).toBe(keyId("step-free-entry"));
    expect(lastAudit()).toEqual([]);
  });

  it("keeps the choices when another file is read", () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${COUNT_ID}`).value = "1";
    submit("ffl-options-form");
    read();
    expect(h.options().count).toBe(1);
    expect(listed()).toEqual(["Bare"]);
  });
});

describe("files, language and removing", () => {
  it("opens a file into the box", async () => {
    const h = mount("en", () => Promise.resolve(FILE));
    const input = $<HTMLInputElement>("#ffl-open");
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($<HTMLTextAreaElement>("#ffl-text").value).toBe(FILE);
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
    const input = $<HTMLInputElement>("#ffl-open");
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(reads).toBe(0);
    expect($("#ffl-errors").textContent).toContain(firstErrorText("too-large", "en"));
  });

  it("says so when a file cannot be read", async () => {
    mount("en", () => Promise.reject(new Error("no")));
    const input = $<HTMLInputElement>("#ffl-open");
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($("#ffl-status").textContent).toBe(C.readFailed.en);
    expect(document.activeElement?.id).toBe("ffl-open");
  });

  it("switches to French and keeps the ranking", () => {
    const h = mount();
    read();
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#ffl-title").textContent).toBe(C.title.fr);
    expect(listed()).toEqual(["Bare", "Old", "Half", "Split"]);
    expect(root.querySelector(".ffl-reasons li")?.textContent).toContain("(UNKNOWN)");
    expect(lastAudit()).toEqual([]);
  });

  it("removes the file and the ranking, saves nothing, and removes its live region on destroy", async () => {
    const h = mount();
    read();
    $('[data-action="ffl-clear"]').click();
    expect(h.file()).toBeUndefined();
    expect(h.picked()).toEqual([]);
    expect(document.activeElement?.id).toBe("ffl-text");
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

  it.each(["en", "fr"] as const)("passes on the ranking (%s)", async (l) => {
    mount(l);
    read();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on the streets (%s)", async (l) => {
    mount(l);
    read();
    $<HTMLInputElement>(`#${viewId("streets")}`).checked = true;
    submit("ffl-options-form");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on the ranking with problems (%s)", async (l) => {
    mount(l);
    read();
    $<HTMLInputElement>(`#${COUNT_ID}`).value = "x";
    $<HTMLInputElement>(`#${AREA_ID}`).value = "y".repeat(70);
    submit("ffl-options-form");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});
