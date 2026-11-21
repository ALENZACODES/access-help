// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { MAX_FILES } from "./filemerge";
import { FILE_MERGE_COPY as C, addedText, combinedText, fileProblemText } from "./filemerge-copy";
import { listFile, mountFileMerge, type FileMergeHandle } from "./filemerge-mount";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { clashRadioId, copyBoxId, formErrorText } from "./views-filemerge";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const A = exportNotes([testNote("n1", "Library", [{ key: "elevator", value: "yes" }]), testNote("n2", "Pool", [], "9 Lake Rd")], "2026-11-01");
const B = exportNotes([testNote("n1", "Library", [{ key: "elevator", value: "no", on: "2026-11-02" }]), testNote("p9", "Pool", [], "9 Lake Rd"), testNote("n3", "Arena", [], "5 Rink Rd")], "2026-11-02");

let root: HTMLElement;
let handle: FileMergeHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileMergeHandle {
  document.documentElement.lang = locale;
  handle = mountFileMerge(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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

function add(text: string, label = ""): void {
  $<HTMLInputElement>("#fm-name").value = label;
  $<HTMLTextAreaElement>("#fm-text").value = text;
  $<HTMLFormElement>("#fm-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

function combineAB(locale: "en" | "fr" = "en"): FileMergeHandle {
  const h = mount(locale);
  add(A, "sam.json");
  add(B, "lee.json");
  $('[data-action="fm-combine"]').click();
  return h;
}

function pick(el: HTMLInputElement): void {
  el.checked = !el.checked || el.type === "radio";
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function downloaded(): string {
  const href = root.querySelector<HTMLAnchorElement>('a.linkbtn[download$=".json"]')?.getAttribute("href") ?? "";
  return decodeURIComponent(href.replace(/^data:application\/json;charset=utf-8,/, ""));
}

describe("adding files", () => {
  it("adds a pasted file with its name and what the App reads in it, then empties the box", async () => {
    const h = mount();
    add(A, "sam.json");
    expect(h.files()).toHaveLength(1);
    expect($("#fm-file-0").textContent).toContain("File 1 (sam.json): 2 notes, 0 entries left out");
    expect($<HTMLTextAreaElement>("#fm-text").value).toBe("");
    expect($<HTMLInputElement>("#fm-name").value).toBe("");
    expect(document.activeElement?.id).toBe("fm-files");
    expect(await status()).toBe(addedText(1, "en"));
    expect(lastAudit()).toEqual([]);
  });

  it("asks for text before adding", () => {
    mount();
    add("  ");
    expect(document.activeElement?.id).toBe("fm-errors");
    expect($("#fm-errors").textContent).toContain(formErrorText("empty-paste", "en"));
    expect($("#fm-text").getAttribute("aria-invalid")).toBe("true");
    expect(lastAudit()).toEqual([]);
  });

  it("lists a file it cannot read", () => {
    mount();
    add("not json", "odd");
    expect($("#fm-file-0").textContent).toContain(C.errors["not-json"].en);
  });

  it("stops at the file limit", () => {
    const h = mount();
    for (let i = 0; i < MAX_FILES; i++) add(exportNotes([testNote(`x${i}`, `Place ${i}`)], "2026-11-01"));
    add(A);
    expect(h.files()).toHaveLength(MAX_FILES);
    expect($("#fm-errors").textContent).toContain(C.tooMany.en);
  });

  it("opens several files at once, each under its own name", async () => {
    const texts: Record<string, string> = { "a.json": A, "b.json": B };
    const h = mount("en", (f) => Promise.resolve(texts[f.name] ?? ""));
    const input = $<HTMLInputElement>("#fm-open");
    Object.defineProperty(input, "files", { value: [new File(["x"], "a.json"), new File(["y"], "b.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(h.files().map((f) => f.label)).toEqual(["a.json", "b.json"]);
    expect(await status()).toBe(addedText(2, "en"));
  });

  it("lists a file too large to read without reading it", async () => {
    let reads = 0;
    const h = mount("en", () => {
      reads++;
      return Promise.resolve("");
    });
    const big = new File(["x"], "big.json");
    Object.defineProperty(big, "size", { value: MAX_FILE_BYTES + 1 });
    const input = $<HTMLInputElement>("#fm-open");
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(reads).toBe(0);
    expect(h.files()[0]?.unreadable).toBe(true);
  });

  it("says when a file cannot be opened", async () => {
    mount("en", () => Promise.reject(new Error("no")));
    const input = $<HTMLInputElement>("#fm-open");
    Object.defineProperty(input, "files", { value: [new File(["x"], "a.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($("#fm-status").textContent).toBe(C.readFailed.en);
  });
});

describe("removing files", () => {
  it("removes one file by its named button and renumbers the rest", () => {
    const h = mount();
    add(A, "sam.json");
    add(B);
    add(A, "third");
    const btn = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-action="fm-remove"]'))[0];
    expect(btn?.textContent).toBe("Remove file 1 (sam.json) from the list");
    btn?.click();
    expect(h.files().map((f) => f.label)).toEqual(["", "third"]);
    expect($("#fm-file-0").textContent).toContain("File 1:");
    expect($("#fm-file-1").textContent).toContain("File 2 (third):");
    expect(document.activeElement?.id).toBe("fm-files");
  });

  it("removes every file and drops the combined result", async () => {
    const h = combineAB();
    $('[data-action="fm-clear"]').click();
    expect(h.files()).toEqual([]);
    expect(h.plan()).toBeUndefined();
    expect(root.querySelector("#fm-results")).toBeNull();
    expect(document.activeElement?.id).toBe("fm-text");
    expect(await status()).toBe(C.cleared.en);
  });
});

describe("combining", () => {
  it("needs two readable files, and lists the ones it cannot use", () => {
    mount();
    add(A, "sam.json");
    add("nope", "bad");
    $('[data-action="fm-combine"]').click();
    expect(document.activeElement?.id).toBe("fm-errors");
    const text = $("#fm-errors").textContent ?? "";
    expect(text).toContain(formErrorText("need-two", "en"));
    expect(text).toContain(fileProblemText(1, "bad", "not-json", "en"));
    expect(lastAudit()).toEqual([]);
  });

  it("moves focus to the results and announces the counts", async () => {
    const h = combineAB();
    expect(document.activeElement?.id).toBe("fm-results");
    expect(await status()).toBe(combinedText(4, 1, 1, "en"));
    expect(h.plan()?.clashes).toHaveLength(1);
    expect(lastAudit()).toEqual([]);
  });

  it("shows both versions of a clash with each record's source, licence and date", () => {
    combineAB();
    const cells = Array.from(root.querySelectorAll(".fm-clash table.compare tbody tr:last-child td")).map((td) => td.textContent ?? "");
    expect(cells[0]).toContain("Yes.");
    expect(cells[1]).toContain("No.");
    for (const c of cells) expect(c).toMatch(/Source: .*Licence: .*Recorded on \d{4}-\d{2}-\d{2}/);
    expect($<HTMLInputElement>(`#${clashRadioId(0, "first")}`).checked).toBe(true);
  });

  it("downloads a combined file the App reads, following each choice", () => {
    combineAB();
    expect(importNotes(downloaded()).notes.map((n) => n.id)).toEqual(["n1", "n2", "p9", "n3"]);
    pick($<HTMLInputElement>(`#${clashRadioId(0, "both")}`));
    expect(document.activeElement?.id).toBe(clashRadioId(0, "both"));
    expect(importNotes(downloaded()).notes.map((n) => n.id)).toEqual(["n1", "n2", "n1-2", "p9", "n3"]);
    pick($<HTMLInputElement>(`#${copyBoxId(0)}`));
    expect(document.activeElement?.id).toBe(copyBoxId(0));
    expect(importNotes(downloaded()).notes.map((n) => n.id)).toEqual(["n1", "n2", "n1-2", "n3"]);
    pick($<HTMLInputElement>(`#${clashRadioId(0, "later")}`));
    const n1 = importNotes(downloaded()).notes.find((n) => n.id === "n1");
    expect(n1?.facts.find((f) => f.key === "elevator")?.value).toBe("no");
  });

  it("announces each change", async () => {
    combineAB();
    pick($<HTMLInputElement>(`#${copyBoxId(0)}`));
    expect(await status()).toBe(C.updated.en);
  });

  it("labels each copy's box with the copy's id", () => {
    combineAB();
    expect(root.querySelector(`label[for="${copyBoxId(0)}"]`)?.textContent).toBe(`${C.dropCopy.en} (p9)`);
  });

  it("drops the result and the choices when the list changes", () => {
    const h = combineAB();
    pick($<HTMLInputElement>(`#${clashRadioId(0, "later")}`));
    add(exportNotes([testNote("z", "Zoo")], "2026-11-01"));
    expect(h.plan()).toBeUndefined();
    expect(h.choices().clashes).toEqual({});
  });

  it("says when the result holds more than a device keeps", () => {
    mount();
    const many = Array.from({ length: 201 }, (_, i) => testNote(`m${i}`, `Place ${i}`, [], `${i} Main St`));
    add(exportNotes(many.slice(0, 120), "2026-11-01"));
    add(exportNotes(many.slice(120), "2026-11-01"));
    $('[data-action="fm-combine"]').click();
    expect(root.textContent).toContain(C.overLimit.en);
  });

  it("saves nothing on this device", () => {
    combineAB();
    pick($<HTMLInputElement>(`#${copyBoxId(0)}`));
    expect(window.localStorage.length).toBe(0);
  });
});

describe("language and destroy", () => {
  it("switches to French and keeps the files and choices", () => {
    const h = combineAB();
    pick($<HTMLInputElement>(`#${clashRadioId(0, "later")}`));
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#fm-title").textContent).toBe(C.title.fr);
    expect(h.files()).toHaveLength(2);
    expect($<HTMLInputElement>(`#${clashRadioId(0, "later")}`).checked).toBe(true);
    expect(lastAudit()).toEqual([]);
  });

  it("removes the widget and its own live region", () => {
    const h = mount();
    h.destroy();
    handle = undefined;
    expect(root.innerHTML).toBe("");
    expect(document.querySelectorAll('[role="status"][aria-live]')).toHaveLength(0);
  });

  it("does nothing when a file finishes reading after removal", async () => {
    let finish: (s: string) => void = () => undefined;
    const h = mount("en", () => new Promise<string>((r) => (finish = r)));
    const input = $<HTMLInputElement>("#fm-open");
    Object.defineProperty(input, "files", { value: [new File(["x"], "a.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    h.destroy();
    handle = undefined;
    finish(A);
    await tick();
    expect(root.innerHTML).toBe("");
  });
});

describe("listFile", () => {
  it("counts what the App reads and keeps the label as given", () => {
    expect(listFile(" sam.json ", A, TODAY)).toMatchObject({ label: "sam.json", notes: 2, leftOut: 0, unreadable: false });
    expect(listFile("", "x", TODAY)).toMatchObject({ label: "", unreadable: true });
  });
});

// One axe run per language and screen.
describe("axe", () => {
  it.each(["en", "fr"] as const)("passes on the empty page (%s)", async (l) => {
    mount(l);
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with files and an error (%s)", async (l) => {
    mount(l);
    add(A, "sam.json");
    $('[data-action="fm-combine"]').click();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on the results (%s)", async (l) => {
    combineAB(l);
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});
