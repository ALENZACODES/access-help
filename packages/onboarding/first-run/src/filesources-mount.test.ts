// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { FACT_KEYS } from "./facts";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { FILE_SOURCES_COPY as C, sourcesErrorText } from "./filesources-copy";
import { mountFileSources, type FileSourcesHandle } from "./filesources-mount";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { decodeTextExportHref } from "./textexport";
import { ALONE_TITLE_ID, FIRST_ID, SECOND_ID, SOURCES_OPEN_ID, SOURCES_TEXT_ID, keyBoxId, orderId, showId } from "./views-filesources";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const FILE = exportNotes(
  [
    testNote("a", "Café", [{ key: "elevator", value: "yes", on: "2026-01-05" }, { key: "automatic-door", value: "no" }], "1 A St"),
    testNote("b", "Café", [{ key: "elevator", value: "yes", source: "Contributor report", on: "2026-09-01" }], "1 A St"),
    testNote("c", "Kiosk", [{ key: "step-free-entry", value: "yes", source: "Visit" }], null),
    testNote("d", "Bakery", [{ key: "step-free-entry", value: "no", source: "Visit" }], "2 A St"),
  ],
  "2026-11-01",
);

let root: HTMLElement;
let handle: FileSourcesHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileSourcesHandle {
  document.documentElement.lang = locale;
  handle = mountFileSources(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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
  $<HTMLTextAreaElement>(`#${SOURCES_TEXT_ID}`).value = text;
  submit("fsr-file-form");
}

const sources = (): string[] => Array.from(root.querySelectorAll("#fsr-table tbody th")).map((th) => th.textContent ?? "");
const check = (id: string, on: boolean): void => {
  $<HTMLInputElement>(`#${id}`).checked = on;
};

describe("reading a file", () => {
  it("shows the sources at once, focuses them and announces the summary", async () => {
    const h = mount();
    read();
    expect(sources()).toEqual(["City survey", "Visit", "Contributor report"]);
    expect(document.activeElement?.id).toBe("fsr-results");
    expect(await status()).toBe("3 sources. 4 answers: 3 rest on one source alone, 1 on two sources or more.");
    expect(h.report()?.alone).toBe(3);
    expect(lastAudit()).toEqual([]);
  });

  it("names the problem when the text is not an export, and links to the box", () => {
    const h = mount();
    read("nope");
    expect(document.activeElement?.id).toBe("fsr-errors");
    expect($("#fsr-errors a").textContent).toBe(sourcesErrorText("not-json", "en"));
    expect(h.file()).toBeUndefined();
    $<HTMLAnchorElement>("#fsr-errors a").click();
    expect(document.activeElement?.id).toBe(SOURCES_TEXT_ID);
  });

  it("does not change the person's text", () => {
    mount();
    read();
    expect($<HTMLTextAreaElement>(`#${SOURCES_TEXT_ID}`).value).toBe(FILE);
  });
});

describe("options", () => {
  it("counts only the ticked details, in the order asked for", async () => {
    const h = mount();
    read();
    for (const k of FACT_KEYS) check(keyBoxId(k), k === "elevator");
    check(orderId("name"), true);
    submit("fsr-options-form");
    expect(h.options()).toEqual({ keys: ["elevator"], order: "name" });
    expect(sources()).toEqual(["City survey", "Contributor report"]);
    expect(await status()).toBe("2 sources. 1 answer: 0 rest on one source alone, 1 on two sources or more.");
    expect(lastAudit()).toEqual([]);
  });

  it("names the problem when no detail is ticked, and links to the first detail", () => {
    const h = mount();
    read();
    for (const k of FACT_KEYS) check(keyBoxId(k), false);
    submit("fsr-options-form");
    expect(document.activeElement?.id).toBe("fsr-errors");
    expect($("#fsr-errors li").textContent).toBe(C.noKeys.en);
    expect(h.report()).toBeUndefined();
    $<HTMLAnchorElement>("#fsr-errors a").click();
    expect(document.activeElement?.id).toBe(keyBoxId("step-free-entry"));
    expect(lastAudit()).toEqual([]);
  });

  it("keeps the options when another file is read", () => {
    const h = mount();
    read();
    check(orderId("alone"), true);
    submit("fsr-options-form");
    read(exportNotes([testNote("x", "X", [{ key: "elevator", value: "yes", source: "Z source" }], "1 B St")], "2026-11-01"));
    expect(h.options().order).toBe("alone");
    expect(sources()).toEqual(["Z source"]);
  });
});

describe("the answers resting on one source", () => {
  it("lists them, focuses the list and announces it", async () => {
    const h = mount();
    read();
    $(`#${showId(1)}`).click();
    expect(h.openSource()).toBe("Visit");
    expect(document.activeElement?.id).toBe(ALONE_TITLE_ID);
    expect(await status()).toBe("Answers that rest on Visit alone (2)");
    expect(Array.from(root.querySelectorAll(".fsr-alone h4")).map((x) => x.textContent)).toEqual(["Bakery", "Kiosk"]);
    expect($(`#${showId(1)}`).getAttribute("aria-expanded")).toBe("true");
    const a = root.querySelector<HTMLAnchorElement>('a[download="notes-only-visit-2026-11-21.json"]');
    const back = importNotes(decodeURIComponent((a?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, "")));
    expect(back.notes.map((n) => n.id).sort()).toEqual(["c", "d"]);
    expect(lastAudit()).toEqual([]);
  });

  it("hides the list with its button or the hide button, putting focus back on the source's button", () => {
    const h = mount();
    read();
    $(`#${showId(0)}`).click();
    $(`#${showId(0)}`).click();
    expect(h.openSource()).toBeUndefined();
    expect(document.activeElement?.id).toBe(showId(0));
    $(`#${showId(1)}`).click();
    $('[data-action="fsr-close"]').click();
    expect(h.openSource()).toBeUndefined();
    expect(document.activeElement?.id).toBe(showId(1));
  });

  it("closes the list when its source no longer has an answer resting on it alone", () => {
    const h = mount();
    read();
    $(`#${showId(1)}`).click();
    for (const k of FACT_KEYS) check(keyBoxId(k), k === "elevator");
    submit("fsr-options-form");
    expect(h.openSource()).toBeUndefined();
    expect(root.querySelector("#fsr-alone")).toBeNull();
  });

  it("keeps the list open with other options while its source still has answers resting on it alone", () => {
    const h = mount();
    read();
    $(`#${showId(1)}`).click();
    check(orderId("name"), true);
    submit("fsr-options-form");
    expect(h.openSource()).toBe("Visit");
    expect(root.querySelector("#fsr-alone")).not.toBeNull();
  });
});

describe("comparing two sources", () => {
  const compareFile = exportNotes(
    [
      testNote("a", "Café", [{ key: "elevator", value: "yes", on: "2026-01-05" }], "1 A St"),
      testNote("b", "Café", [{ key: "elevator", value: "no", source: "Visit" }], "1 A St"),
      testNote("c", "Kiosk", [{ key: "automatic-door", value: "yes" }], null),
      testNote("d", "Kiosk", [{ key: "automatic-door", value: "yes", source: "Visit" }], null),
    ],
    "2026-11-01",
  );
  const choose = (a: string, b: string): void => {
    $<HTMLSelectElement>(`#${FIRST_ID}`).value = a;
    $<HTMLSelectElement>(`#${SECOND_ID}`).value = b;
    submit("fsr-compare-form");
  };

  it("starts with the first two sources, and compares them, focused and announced", async () => {
    const h = mount();
    read(compareFile);
    expect([$<HTMLSelectElement>(`#${FIRST_ID}`).value, $<HTMLSelectElement>(`#${SECOND_ID}`).value]).toEqual(["City survey", "Visit"]);
    submit("fsr-compare-form");
    expect(h.overlap()?.result.both).toBe(2);
    expect(document.activeElement?.id).toBe("fsr-overlap");
    expect(await status()).toBe("City survey and Visit both answer 2 details: the same answer for 1, different answers for 1.");
    expect($(".fsr-overlap li").textContent).toBe("Café, 1 A St: Elevator: City survey Yes, Visit No");
    expect(lastAudit()).toEqual([]);
  });

  it("names the problem when the same source is chosen twice, and links to the second list", () => {
    const h = mount();
    read(compareFile);
    choose("Visit", "Visit");
    expect(document.activeElement?.id).toBe("fsr-errors");
    expect($("#fsr-errors li").textContent).toBe(C.sameSource.en);
    expect(h.overlap()).toBeUndefined();
    $<HTMLAnchorElement>("#fsr-errors a").click();
    expect(document.activeElement?.id).toBe(SECOND_ID);
    choose("Visit", "City survey");
    expect(root.querySelector("#fsr-errors")).toBeNull();
    expect(h.overlap()?.a).toBe("Visit");
    expect(lastAudit()).toEqual([]);
  });

  it("keeps the comparison up to date when the details change", () => {
    const h = mount();
    read(compareFile);
    submit("fsr-compare-form");
    for (const k of FACT_KEYS) check(keyBoxId(k), k === "automatic-door");
    submit("fsr-options-form");
    expect(h.overlap()?.result).toEqual({ both: 1, same: 1, differ: [] });
    expect([$<HTMLSelectElement>(`#${FIRST_ID}`).value, $<HTMLSelectElement>(`#${SECOND_ID}`).value]).toEqual(["City survey", "Visit"]);
  });

  it("drops the comparison when a source it compares is no longer counted", () => {
    const h = mount();
    read();
    choose("City survey", "Contributor report");
    for (const k of FACT_KEYS) check(keyBoxId(k), k !== "elevator");
    submit("fsr-options-form");
    expect(h.overlap()).toBeUndefined();
    expect(root.querySelector("#fsr-overlap")).toBeNull();
  });
});

describe("downloads", () => {
  it("downloads the table and the text", () => {
    mount();
    read();
    const csv = decodeURIComponent((root.querySelector('a[download="sources-2026-11-21.csv"]')?.getAttribute("href") ?? "").replace(/^data:text\/csv;charset=utf-8,/, ""));
    expect(csv.split("\r\n")[1]?.startsWith("City survey,2,1,1,1,")).toBe(true);
    const text = decodeTextExportHref(root.querySelector('a[download="sources-2026-11-21.txt"]')?.getAttribute("href") ?? "") ?? "";
    expect(text).toContain("Visit\n    Records: 2\n    Places: 2\n");
  });
});

describe("files, language and removing", () => {
  it("opens a file into the box", async () => {
    const h = mount("en", () => Promise.resolve(FILE));
    const input = $<HTMLInputElement>(`#${SOURCES_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($<HTMLTextAreaElement>(`#${SOURCES_TEXT_ID}`).value).toBe(FILE);
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
    const input = $<HTMLInputElement>(`#${SOURCES_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(reads).toBe(0);
    expect($("#fsr-errors").textContent).toContain(sourcesErrorText("too-large", "en"));
  });

  it("says so when a file cannot be read", async () => {
    mount("en", () => Promise.reject(new Error("no")));
    const input = $<HTMLInputElement>(`#${SOURCES_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($("#fsr-status").textContent).toBe(C.readFailed.en);
    expect(document.activeElement?.id).toBe(SOURCES_OPEN_ID);
  });

  it("does nothing after destroy when a file finishes reading", async () => {
    let finish: (s: string) => void = () => undefined;
    const h = mount("en", () => new Promise<string>((r) => (finish = r)));
    const input = $<HTMLInputElement>(`#${SOURCES_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    h.destroy();
    handle = undefined;
    finish(FILE);
    await tick();
    expect(root.innerHTML).toBe("");
  });

  it("switches to French, names a contributor's reports in French, and keeps the list", () => {
    const h = mount();
    read();
    $(`#${showId(1)}`).click();
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#fsr-title").textContent).toBe(C.title.fr);
    expect(sources()).toContain("Rapport d’un contributeur");
    expect($(`#${ALONE_TITLE_ID}`).textContent).toBe("Réponses reposant sur Visit seule (2)");
    expect(root.textContent).not.toMatch(/inconnu/i);
    expect(lastAudit()).toEqual([]);
  });

  it("removes the file and the sources, saves nothing, and removes its live region on destroy", async () => {
    const h = mount();
    read();
    $(`#${showId(0)}`).click();
    $('[data-action="fsr-clear"]').click();
    expect(h.file()).toBeUndefined();
    expect(h.report()).toBeUndefined();
    expect(h.openSource()).toBeUndefined();
    expect(document.activeElement?.id).toBe(SOURCES_TEXT_ID);
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

  it.each(["en", "fr"] as const)("passes on the sources (%s)", async (l) => {
    mount(l);
    read();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with a list open (%s)", async (l) => {
    mount(l);
    read();
    $(`#${showId(0)}`).click();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with two sources compared (%s)", async (l) => {
    mount(l);
    read(exportNotes([testNote("a", "Café", [{ key: "elevator", value: "yes" }], "1 A St"), testNote("b", "Café", [{ key: "elevator", value: "no", source: "Visit" }], "1 A St")], "2026-11-01"));
    submit("fsr-compare-form");
    expect(root.querySelector(".fsr-overlap li")).not.toBeNull();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with the problem shown (%s)", async (l) => {
    mount(l);
    read();
    for (const k of FACT_KEYS) check(keyBoxId(k), false);
    submit("fsr-options-form");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});
