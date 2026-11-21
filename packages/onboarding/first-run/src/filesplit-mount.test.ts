// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { FILE_SPLIT_COPY as C, chosenText, filterErrorText, splitErrorText } from "./filesplit-copy";
import { mountFileSplit, type FileSplitHandle } from "./filesplit-mount";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { FILTER_FIELD, noteBoxId } from "./views-filesplit";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const FILE = exportNotes(
  [
    testNote("n1", "Central Library", [{ key: "elevator", value: "yes" }], "1 King St W"),
    testNote("n2", "Pool", [{ key: "elevator", value: "no", source: "Owner" }], "9 Lake Rd"),
    testNote("n3", "Café Rivière", [], "12 King St E"),
  ],
  "2026-11-01",
);

let root: HTMLElement;
let handle: FileSplitHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileSplitHandle {
  document.documentElement.lang = locale;
  handle = mountFileSplit(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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

function readFile(text = FILE): void {
  $<HTMLTextAreaElement>("#fs-text").value = text;
  $<HTMLFormElement>("#fs-file-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

function filter(values: Partial<Record<keyof typeof FILTER_FIELD, string>>): void {
  for (const [k, v] of Object.entries(values)) $<HTMLInputElement>(`#${FILTER_FIELD[k as keyof typeof FILTER_FIELD]}`).value = v;
  $<HTMLFormElement>("#fs-filter-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

function tickNote(index: number): void {
  const box = $<HTMLInputElement>(`#${noteBoxId(index)}`);
  box.checked = !box.checked;
  box.dispatchEvent(new Event("change", { bubbles: true }));
}

function jsonLink(label: string): string {
  const a = Array.from(root.querySelectorAll<HTMLAnchorElement>("a.linkbtn")).find((x) => x.textContent === label);
  return decodeURIComponent((a?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, ""));
}

describe("reading a file", () => {
  it("shows the form only, then the filters and the notes, with nothing chosen", async () => {
    const h = mount();
    expect(root.querySelector("#fs-filter-form")).toBeNull();
    readFile();
    expect(document.activeElement?.id).toBe("fs-file-read");
    expect(root.querySelectorAll(".fs-notes li")).toHaveLength(3);
    expect(h.split()?.chosen).toEqual([]);
    expect($("#fs-chosen ~ p").textContent).toBe(C.noneChosen.en);
    expect(await status()).toBe(chosenText(0, 3, "en"));
    expect(lastAudit()).toEqual([]);
  });

  it("names the problem when the text is not an export", () => {
    mount();
    readFile("nope");
    expect(document.activeElement?.id).toBe("fs-errors");
    expect($("#fs-errors").textContent).toContain(splitErrorText("not-json", "en"));
    expect($("#fs-text").getAttribute("aria-invalid")).toBe("true");
    expect(lastAudit()).toEqual([]);
  });

  it("offers only the file's own sources and licences", () => {
    mount();
    readFile();
    const sources = Array.from(root.querySelectorAll<HTMLOptionElement>(`#${FILTER_FIELD.source} option`)).map((o) => o.value);
    expect(sources).toEqual(["", "City survey", "Owner"]);
    const licences = Array.from(root.querySelectorAll<HTMLOptionElement>(`#${FILTER_FIELD.licence} option`)).map((o) => o.value);
    expect(licences).toEqual(["", "CC0-1.0"]);
  });
});

describe("filters", () => {
  it("chooses the notes that pass, moves focus to the list and announces the count", async () => {
    const h = mount();
    readFile();
    filter({ words: "king" });
    expect(document.activeElement?.id).toBe("fs-notes");
    expect(h.split()?.chosen.map((n) => n.id)).toEqual(["n1", "n3"]);
    expect($<HTMLInputElement>(`#${noteBoxId(0)}`).checked).toBe(true);
    expect($<HTMLInputElement>(`#${noteBoxId(1)}`).checked).toBe(false);
    expect($("#fs-summary").textContent).toContain("Filters: words king.");
    expect(await status()).toBe(chosenText(2, 3, "en"));
    expect(lastAudit()).toEqual([]);
  });

  it("keeps UNKNOWN apart from No", () => {
    const h = mount();
    readFile();
    filter({ detail: "elevator", answer: "unknown" });
    expect(h.split()?.chosen.map((n) => n.id)).toEqual(["n3"]);
    filter({ detail: "elevator", answer: "no" });
    expect(h.split()?.chosen.map((n) => n.id)).toEqual(["n2"]);
  });

  it("reports bad dates on their fields and keeps the filters in use", () => {
    const h = mount();
    readFile();
    filter({ words: "king" });
    filter({ from: "2026-12-01", to: "2026-01-01" });
    expect(document.activeElement?.id).toBe("fs-errors");
    expect($("#fs-errors").textContent).toContain(filterErrorText("from-after-to", "en"));
    expect($(`#${FILTER_FIELD.from}`).getAttribute("aria-invalid")).toBe("true");
    expect(h.filters().words).toBe("king");
    expect($<HTMLInputElement>(`#${FILTER_FIELD.to}`).value).toBe("2026-01-01");
    root.querySelector<HTMLAnchorElement>("#fs-errors a")?.click();
    expect(document.activeElement?.id).toBe(FILTER_FIELD.from);
    expect(lastAudit()).toEqual([]);
  });

  it("removes every filter and moves focus to the first field", () => {
    const h = mount();
    readFile();
    filter({ words: "king" });
    $('[data-action="fs-reset"]').click();
    expect(h.split()?.chosen).toEqual([]);
    expect($<HTMLInputElement>(`#${FILTER_FIELD.words}`).value).toBe("");
    expect(document.activeElement?.id).toBe(FILTER_FIELD.words);
  });
});

describe("choosing by hand", () => {
  it("adds and takes out notes, keeps focus on the box and says it was by hand", async () => {
    const h = mount();
    readFile();
    filter({ words: "king" });
    tickNote(1);
    expect(document.activeElement?.id).toBe(noteBoxId(1));
    tickNote(2);
    expect(h.split()?.chosen.map((n) => n.id)).toEqual(["n1", "n2"]);
    expect(h.picks()).toEqual({ add: ["n2"], remove: ["n3"] });
    expect($('li[data-note="n2"]').textContent).toContain(C.byHand.en);
    expect($('li[data-note="n3"]').textContent).toContain(C.leftByHand.en);
    expect(await status()).toBe(chosenText(2, 3, "en"));
    expect(lastAudit()).toEqual([]);
  });

  it("gives each box a name with the note's place and id", () => {
    mount();
    readFile();
    expect(root.querySelector(`label[for="${noteBoxId(0)}"]`)?.textContent).toBe("Choose Central Library (id n1)");
  });
});

describe("downloads", () => {
  it("gives the chosen notes, the rest and a spreadsheet, each read back in full", () => {
    mount();
    readFile();
    filter({ words: "king" });
    const chosen = importNotes(jsonLink(C.downloadChosen.en));
    const rest = importNotes(jsonLink(C.downloadRest.en));
    expect(chosen.notes.map((n) => n.id)).toEqual(["n1", "n3"]);
    expect(rest.notes.map((n) => n.id)).toEqual(["n2"]);
    expect(chosen.rejected + rest.rejected).toBe(0);
    const csv = Array.from(root.querySelectorAll<HTMLAnchorElement>("a.linkbtn")).find((a) => a.textContent === C.downloadCsv.en);
    expect(csv?.getAttribute("download")).toBe("notes-chosen-2026-11-20.csv");
  });

  it("counts answers in the chosen notes, UNKNOWN on its own", () => {
    mount();
    readFile();
    filter({ words: "king" });
    const row = Array.from($('tr[data-key="elevator"]').querySelectorAll("td")).map((td) => td.textContent);
    expect(row).toEqual(["1", "0", "1"]);
  });

  it("says when every note is chosen and offers no second file", () => {
    mount();
    readFile();
    filter({ licence: "CC0-1.0" });
    expect(root.textContent).toContain(C.allChosen.en);
    expect(jsonLink(C.downloadRest.en)).toBe("");
  });
});

describe("files, language and removing", () => {
  it("opens a file into the box", async () => {
    const h = mount("en", () => Promise.resolve(FILE));
    const input = $<HTMLInputElement>("#fs-open");
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($<HTMLTextAreaElement>("#fs-text").value).toBe(FILE);
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
    const input = $<HTMLInputElement>("#fs-open");
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(reads).toBe(0);
    expect($("#fs-errors").textContent).toContain(splitErrorText("too-large", "en"));
  });

  it("switches to French and keeps the file, filters and picks", () => {
    const h = mount();
    readFile();
    filter({ words: "king" });
    tickNote(1);
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#fs-title").textContent).toBe(C.title.fr);
    expect(h.split()?.chosen.map((n) => n.id)).toEqual(["n1", "n2", "n3"]);
    expect($<HTMLInputElement>(`#${FILTER_FIELD.words}`).value).toBe("king");
    expect(lastAudit()).toEqual([]);
  });

  it("removes the file and every choice, and saves nothing", async () => {
    const h = mount();
    readFile();
    filter({ words: "king" });
    $('[data-action="fs-clear"]').click();
    expect(h.file()).toBeUndefined();
    expect(h.picks()).toEqual({ add: [], remove: [] });
    expect(document.activeElement?.id).toBe("fs-text");
    expect(await status()).toBe(C.cleared.en);
    expect(window.localStorage.length).toBe(0);
  });

  it("removes the widget and its own live region", () => {
    const h = mount();
    h.destroy();
    handle = undefined;
    expect(root.innerHTML).toBe("");
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

  it.each(["en", "fr"] as const)("passes with filter errors (%s)", async (l) => {
    mount(l);
    readFile();
    filter({ from: "nope" });
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with notes chosen (%s)", async (l) => {
    mount(l);
    readFile();
    filter({ words: "king" });
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});
