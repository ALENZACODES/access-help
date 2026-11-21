// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes } from "./exchange";
import { FACT_KEYS } from "./facts";
import { FILE_ASK_COPY as C, askErrorText, askSummaryText } from "./fileask-copy";
import { mountFileAsk, type FileAskHandle } from "./fileask-mount";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { decodeTextExportHref } from "./textexport";
import { ASK_OLD_ID, ASK_SEARCH_ID, keyBoxId, orderRadioId } from "./views-fileask";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const FILE = exportNotes(
  [
    testNote("a1", "Central Library", [{ key: "elevator", value: "yes" }, { key: "step-free-entry", value: "yes", on: "2024-05-01" }], "1 King St W"),
    testNote("a2", "Central Library", [{ key: "elevator", value: "no", on: "2026-11-02" }], "1 King St W"),
    testNote("b1", "Pool", FACT_KEYS.map((key) => ({ key, value: "yes" as const, on: "2026-10-01" })), "9 Lake Rd"),
    testNote("c1", "Café Rivière", [], "12 King St E"),
  ],
  "2026-11-01",
);

let root: HTMLElement;
let handle: FileAskHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileAskHandle {
  document.documentElement.lang = locale;
  handle = mountFileAsk(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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
  $<HTMLTextAreaElement>("#fa-text").value = text;
  $<HTMLFormElement>("#fa-file-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

function update(): void {
  $<HTMLFormElement>("#fa-options-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

const placeNames = (): string[] => Array.from(root.querySelectorAll(".fa-places > li h4")).map((h) => h.textContent ?? "");

describe("reading a file", () => {
  it("lists the places to ask, moves focus to the list and announces it", async () => {
    mount();
    read();
    expect(document.activeElement?.id).toBe("fa-list");
    expect(placeNames()).toEqual(["Café Rivière", "Central Library"]);
    expect($("#fa-summary").textContent).toBe(askSummaryText(2, 8, "en"));
    expect(await status()).toBe(askSummaryText(2, 8, "en"));
    expect(lastAudit()).toEqual([]);
  });

  it("counts questions by reason and the places with nothing to ask", () => {
    mount();
    read();
    const cell = (r: string): string => root.querySelector(`.fa-counts tr[data-reason="${r}"] td`)?.textContent ?? "";
    expect([cell("unknown"), cell("differ"), cell("old"), cell("none")]).toEqual(["6", "1", "1", "1"]);
  });

  it("names the problem when the text is not an export", () => {
    mount();
    read("nope");
    expect(document.activeElement?.id).toBe("fa-errors");
    expect($("#fa-errors").textContent).toContain(askErrorText("not-json", "en"));
    expect($("#fa-text").getAttribute("aria-invalid")).toBe("true");
    root.querySelector<HTMLAnchorElement>("#fa-errors a")?.click();
    expect(document.activeElement?.id).toBe("fa-text");
    expect(lastAudit()).toEqual([]);
  });
});

describe("options", () => {
  it("limits the details, leaves out old answers and searches", async () => {
    const h = mount();
    read();
    for (const k of FACT_KEYS) $<HTMLInputElement>(`#${keyBoxId(k)}`).checked = k === "elevator" || k === "step-free-entry";
    $<HTMLInputElement>(`#${ASK_OLD_ID}`).checked = false;
    update();
    expect(h.options()).toEqual({ keys: ["step-free-entry", "elevator"], includeOld: false, query: "", order: "place" });
    expect(placeNames()).toEqual(["Café Rivière", "Central Library"]);
    expect(Array.from(root.querySelectorAll('li[data-reason="old"]'))).toHaveLength(0);
    $<HTMLInputElement>(`#${ASK_SEARCH_ID}`).value = "lake";
    update();
    expect(placeNames()).toEqual([]);
    expect(root.textContent).toContain(C.nothing.en);
    expect(await status()).toBe(askSummaryText(0, 0, "en"));
    expect(lastAudit()).toEqual([]);
  });

  it("keeps the earlier details when every box is unticked", () => {
    const h = mount();
    read();
    for (const k of FACT_KEYS) $<HTMLInputElement>(`#${keyBoxId(k)}`).checked = false;
    update();
    expect(h.options().keys).toEqual([]);
    expect(FACT_KEYS.every((k) => $<HTMLInputElement>(`#${keyBoxId(k)}`).checked)).toBe(true);
  });
});

describe("order", () => {
  it("shows the list detail by detail, and the text download follows", () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${orderRadioId("detail")}`).checked = true;
    update();
    expect(h.options().order).toBe("detail");
    expect(root.querySelector(".fa-places")).toBeNull();
    expect(Array.from(root.querySelectorAll(".fa-details > li")).map((li) => li.getAttribute("data-key"))).toEqual(["step-free-entry", "accessible-washroom", "automatic-door", "elevator"]);
    expect($<HTMLInputElement>(`#${orderRadioId("detail")}`).checked).toBe(true);
    const href = root.querySelector<HTMLAnchorElement>("a.linkbtn[download$='.txt']")?.getAttribute("href") ?? "";
    expect(decodeTextExportHref(href)).toContain("Elevator (2 places)");
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes axe detail by detail (%s)", async (l) => {
    mount(l);
    read();
    $<HTMLInputElement>(`#${orderRadioId("detail")}`).checked = true;
    update();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});

describe("downloads", () => {
  it("gives text to print and a CSV", () => {
    mount();
    read();
    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>("a.linkbtn[download]"));
    expect(links.map((a) => a.textContent)).toEqual([C.downloadText.en, C.downloadCsv.en]);
    expect(decodeTextExportHref(links[0]?.getAttribute("href") ?? "")).toContain(C.answerLine.en);
    expect(links[1]?.getAttribute("download")).toBe("questions-to-ask-2026-11-20.csv");
    expect(decodeURIComponent(links[1]?.getAttribute("href") ?? "")).toContain("place_name,address,detail,reason,question");
  });
});

describe("files, language and removing", () => {
  it("opens a file into the box", async () => {
    const h = mount("en", () => Promise.resolve(FILE));
    const input = $<HTMLInputElement>("#fa-open");
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($<HTMLTextAreaElement>("#fa-text").value).toBe(FILE);
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
    const input = $<HTMLInputElement>("#fa-open");
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(reads).toBe(0);
    expect($("#fa-errors").textContent).toContain(askErrorText("too-large", "en"));
  });

  it("says when a file cannot be opened", async () => {
    mount("en", () => Promise.reject(new Error("no")));
    const input = $<HTMLInputElement>("#fa-open");
    Object.defineProperty(input, "files", { value: [new File(["x"], "a.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($("#fa-status").textContent).toBe(C.readFailed.en);
    expect(document.activeElement?.id).toBe("fa-open");
  });

  it("switches to French and asks the French questions", () => {
    const h = mount();
    read();
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#fa-title").textContent).toBe(C.title.fr);
    expect(root.textContent).toContain("Y a-t-il un ascenseur");
    expect(lastAudit()).toEqual([]);
  });

  it("removes the file, saves nothing, and removes its live region on destroy", async () => {
    const h = mount();
    read();
    $('[data-action="fa-clear"]').click();
    expect(h.file()).toBeUndefined();
    expect(document.activeElement?.id).toBe("fa-text");
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

  it.each(["en", "fr"] as const)("passes with the list (%s)", async (l) => {
    mount(l);
    read();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});
