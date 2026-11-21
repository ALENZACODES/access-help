// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes } from "./exchange";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { FILE_SUMMARY_COPY as C, summarizedText, summaryErrorText } from "./filesummary-copy";
import { mountFileSummary, type FileSummaryHandle } from "./filesummary-mount";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { decodeTextExportHref } from "./textexport";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const FILE = exportNotes(
  [
    testNote("a1", "Central Library", [{ key: "elevator", value: "yes" }, { key: "step-free-entry", value: "yes", on: "2024-05-01" }], "1 King St W"),
    testNote("a2", "Central Library", [{ key: "elevator", value: "no", on: "2026-11-02", source: "Owner" }], "1 King St W"),
    testNote("b1", "Pool", [{ key: "elevator", value: "no" }], "9 Lake Rd"),
    testNote("c1", "Café Rivière", [], null),
  ],
  "2026-11-01",
);

let root: HTMLElement;
let handle: FileSummaryHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileSummaryHandle {
  document.documentElement.lang = locale;
  handle = mountFileSummary(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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

function read(text = FILE): void {
  $<HTMLTextAreaElement>("#fy-text").value = text;
  $<HTMLFormElement>("#fy-file-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

describe("a summary", () => {
  it("shows the summary, moves focus to it and announces it; the App's table checks pass", async () => {
    const h = mount();
    read();
    expect(document.activeElement?.id).toBe("fy-results");
    expect(h.summary()?.places).toBe(3);
    expect(await status()).toBe(summarizedText(3, 4, "en"));
    // The ages and sources tables use the App's own audited form: bands must add up, rows need licences and dates.
    expect(root.querySelector('table.data[data-kind="ages"]')).not.toBeNull();
    expect(root.querySelector('table.data[data-kind="sources"]')).not.toBeNull();
    expect(lastAudit()).toEqual([]);
  });

  it("shows the numbers, coverage and answers", () => {
    mount();
    read();
    expect(Array.from(root.querySelectorAll(".fy-numbers td")).map((td) => td.textContent)).toEqual(["4", "3", "0", "1", "1"]);
    expect(root.querySelector('li[data-recorded="2"] strong')?.textContent).toBe("1");
    const elevator = Array.from(root.querySelectorAll('.fy-answers tr[data-key="elevator"] td')).map((td) => td.textContent);
    expect(elevator).toEqual(["0", "1", "1", "1"]);
    expect(root.textContent).toContain("The file says it was exported on 2026-11-01.");
  });

  it("lists places where reports differ, by detail", () => {
    mount();
    read();
    expect(root.querySelector('.fy-differ li[data-key="elevator"] h4')?.textContent).toBe("Elevator (1)");
    expect(root.querySelector('.fy-differ li[data-key="elevator"] li')?.textContent).toBe("Central Library, 1 King St W");
  });

  it("says when no place has reports that differ", () => {
    mount();
    read(exportNotes([testNote("x", "Zoo")], "2026-11-01"));
    expect(root.textContent).toContain(C.noneDiffer.en);
  });

  it("offers the summary as text", () => {
    mount();
    read();
    const link = root.querySelector<HTMLAnchorElement>("a.linkbtn[download]");
    expect(link?.textContent).toBe(C.download.en);
    expect(link?.getAttribute("download")).toBe("file-summary-2026-11-20.txt");
    expect(decodeTextExportHref(link?.getAttribute("href") ?? "")).toContain("Summary of a notes file");
  });

  it("says so when no detail is recorded, instead of empty tables", () => {
    mount();
    read(exportNotes([testNote("x", "Zoo")], "2026-11-01"));
    expect(root.querySelector('table.data[data-kind="ages"]')).toBeNull();
    expect(root.querySelector('table.data[data-kind="sources"]')).toBeNull();
    expect(lastAudit()).toEqual([]);
  });

  it("names the problem when the text is not an export", () => {
    mount();
    read("nope");
    expect(document.activeElement?.id).toBe("fy-errors");
    expect($("#fy-errors").textContent).toContain(summaryErrorText("not-json", "en"));
    expect($("#fy-text").getAttribute("aria-invalid")).toBe("true");
    root.querySelector<HTMLAnchorElement>("#fy-errors a")?.click();
    expect(document.activeElement?.id).toBe("fy-text");
  });
});

describe("files, language and removing", () => {
  it("opens a file into the box", async () => {
    const h = mount("en", () => Promise.resolve(FILE));
    const input = $<HTMLInputElement>("#fy-open");
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($<HTMLTextAreaElement>("#fy-text").value).toBe(FILE);
    expect(h.summary()).toBeUndefined();
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
    const input = $<HTMLInputElement>("#fy-open");
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(reads).toBe(0);
    expect($("#fy-errors").textContent).toContain(summaryErrorText("too-large", "en"));
  });

  it("switches to French and keeps the summary", () => {
    const h = mount();
    read();
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#fy-title").textContent).toBe(C.title.fr);
    expect(h.summary()?.places).toBe(3);
    expect(lastAudit()).toEqual([]);
  });

  it("removes the file, saves nothing, and removes its live region on destroy", async () => {
    const h = mount();
    read();
    $('[data-action="fy-clear"]').click();
    expect(h.summary()).toBeUndefined();
    expect(document.activeElement?.id).toBe("fy-text");
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

  it.each(["en", "fr"] as const)("passes with an error (%s)", async (l) => {
    mount(l);
    read("{");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with the summary (%s)", async (l) => {
    mount(l);
    read();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});
