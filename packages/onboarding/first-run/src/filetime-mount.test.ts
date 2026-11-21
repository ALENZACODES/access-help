// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes } from "./exchange";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { FILE_TIME_COPY as C, dayProblemText, timeErrorText } from "./filetime-copy";
import { mountFileTime, type FileTimeHandle } from "./filetime-mount";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { TIME_AREA_ID, TIME_DAY_ID, TIME_OPEN_ID, TIME_TEXT_ID, stepId } from "./views-filetime";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const FILE = exportNotes(
  [
    testNote("a", "Library", [
      { key: "elevator", value: "yes", on: "2026-01-10" },
      { key: "accessible-washroom", value: "yes", on: "2026-03-05" },
    ], "100 King St W"),
    testNote("b1", "Bank", [{ key: "elevator", value: "yes", on: "2025-01-20" }], "40 Queen St E"),
    testNote("b2", "Bank", [{ key: "elevator", value: "no", on: "2026-03-15", source: "Visit" }], "40 Queen St E"),
    testNote("c", "Cart", [], null),
  ],
  "2026-11-01",
);

let root: HTMLElement;
let handle: FileTimeHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileTimeHandle {
  document.documentElement.lang = locale;
  handle = mountFileTime(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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
  $<HTMLTextAreaElement>(`#${TIME_TEXT_ID}`).value = text;
  submit("ftm-file-form");
}

function show(step: "month" | "year", area = ""): void {
  $<HTMLInputElement>(`#${stepId(step)}`).checked = true;
  $<HTMLInputElement>(`#${TIME_AREA_ID}`).value = area;
  submit("ftm-show-form");
}

describe("reading a file", () => {
  it("shows the whole file by month at once, focuses the results and announces the summary", async () => {
    const h = mount();
    read();
    expect(h.timeline()?.rows).toHaveLength(15);
    expect(h.timeline()?.step).toBe("month");
    expect(document.activeElement?.id).toBe("ftm-results");
    expect(await status()).toBe(`${C.shown.en} ${$("#ftm-summary").textContent ?? ""}`);
    expect(lastAudit()).toEqual([]);
  });

  it("names the problem when the text is not an export, and links to the box", () => {
    const h = mount();
    read("{}");
    expect(h.timeline()).toBeUndefined();
    expect(document.activeElement?.id).toBe("ftm-errors");
    expect($("#ftm-errors").textContent).toContain(timeErrorText("wrong-format", "en"));
    $<HTMLAnchorElement>("#ftm-errors a").click();
    expect(document.activeElement?.id).toBe(TIME_TEXT_ID);
    expect(lastAudit()).toEqual([]);
  });
});

describe("choosing what to show", () => {
  it("shows the file by year", () => {
    const h = mount();
    read();
    show("year");
    expect(h.timeline()?.rows.map((r) => [r.period, r.records])).toEqual([
      ["2025", 1],
      ["2026", 3],
    ]);
    expect($<HTMLInputElement>(`#${stepId("year")}`).checked).toBe(true);
  });

  it("keeps only the places in the area, trimmed", () => {
    const h = mount();
    read();
    show("month", "  Queen ");
    expect(h.timeline()?.places).toBe(1);
    expect($<HTMLInputElement>(`#${TIME_AREA_ID}`).value).toBe("  Queen ");
  });

  it("asks for a shorter area, links to the field, and keeps the timeline that was shown", () => {
    const h = mount();
    read();
    show("year", "x".repeat(61));
    expect(document.activeElement?.id).toBe("ftm-errors");
    $<HTMLAnchorElement>("#ftm-errors a").click();
    expect(document.activeElement?.id).toBe(TIME_AREA_ID);
    expect(h.timeline()?.step).toBe("month");
    expect(lastAudit()).toEqual([]);
    show("year", "King");
    expect(root.querySelector("#ftm-errors")).toBeNull();
    expect(h.timeline()?.places).toBe(1);
  });
});

describe("files, language and removing", () => {
  it("opens a file into the box", async () => {
    const h = mount("en", () => Promise.resolve(FILE));
    const input = $<HTMLInputElement>(`#${TIME_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($<HTMLTextAreaElement>(`#${TIME_TEXT_ID}`).value).toBe(FILE);
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
    const input = $<HTMLInputElement>(`#${TIME_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(reads).toBe(0);
    expect($("#ftm-errors").textContent).toContain(timeErrorText("too-large", "en"));
  });

  it("says so when a file cannot be read, and ignores a read that ends after the tool is closed", async () => {
    const first = mount("en", () => Promise.reject(new Error("no")));
    const input = $<HTMLInputElement>(`#${TIME_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($("#ftm-status").textContent).toBe(C.readFailed.en);
    first.destroy();

    let finish: (s: string) => void = () => undefined;
    const late = mount("en", () => new Promise<string>((r) => (finish = r)));
    const input2 = $<HTMLInputElement>(`#${TIME_OPEN_ID}`);
    Object.defineProperty(input2, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input2.dispatchEvent(new Event("change", { bubbles: true }));
    late.destroy();
    handle = undefined;
    finish(FILE);
    await tick();
    expect(root.innerHTML).toBe("");
  });

  it("switches to French, keeping the choices and the timeline", () => {
    const h = mount();
    read();
    show("year", "Queen");
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#ftm-title").textContent).toBe(C.title.fr);
    expect($<HTMLInputElement>(`#${stepId("year")}`).checked).toBe(true);
    expect($("#ftm-summary").textContent).toContain("1 lieu");
    expect(lastAudit()).toEqual([]);
  });

  it("removes the file and the timeline, saves nothing, and removes its live region on destroy", async () => {
    const h = mount();
    read();
    show("year", "King");
    $('[data-action="ftm-clear"]').click();
    expect(h.file()).toBeUndefined();
    expect(h.timeline()).toBeUndefined();
    expect(document.activeElement?.id).toBe(TIME_TEXT_ID);
    expect(await status()).toBe(C.cleared.en);
    expect(window.localStorage.length).toBe(0);
    read();
    expect($<HTMLInputElement>(`#${stepId("month")}`).checked).toBe(true);
    expect($<HTMLInputElement>(`#${TIME_AREA_ID}`).value).toBe("");
    h.destroy();
    handle = undefined;
    expect(document.querySelectorAll('[role="status"][aria-live]')).toHaveLength(0);
  });
});

function showDay(day: string): void {
  $<HTMLInputElement>(`#${TIME_DAY_ID}`).value = day;
  submit("ftm-day-form");
}

describe("as it stood on a day", () => {
  it("shows the day, focuses its summary and announces it", async () => {
    const h = mount();
    read();
    showDay(" 2026-02-01 ");
    expect(h.day()).toMatchObject({ day: "2026-02-01", recorded: 2, later: 2 });
    expect(document.activeElement?.id).toBe("ftm-day-summary");
    expect(await status()).toBe(`${C.day.shown.en} ${$("#ftm-day-summary").textContent ?? ""}`);
    expect(lastAudit()).toEqual([]);
  });

  it("asks for a day written the usual way and not after today, linking to the field", () => {
    const h = mount();
    read();
    showDay("2026-12-01");
    expect(h.day()).toBeUndefined();
    expect($("#ftm-errors").textContent).toContain(dayProblemText("after-today", "en"));
    $<HTMLAnchorElement>("#ftm-errors a").click();
    expect(document.activeElement?.id).toBe(TIME_DAY_ID);
    expect($<HTMLInputElement>(`#${TIME_DAY_ID}`).value).toBe("2026-12-01");
    expect(lastAudit()).toEqual([]);
  });

  it("follows the area of the timeline shown", () => {
    const h = mount();
    read();
    showDay("2026-02-01");
    show("month", "Queen");
    expect(h.day()).toMatchObject({ places: 1, recorded: 1 });
  });

  it("starts with no day when another file is read or the page is cleared", () => {
    const h = mount();
    read();
    showDay("2026-02-01");
    read();
    expect(h.day()).toBeUndefined();
    expect($<HTMLInputElement>(`#${TIME_DAY_ID}`).value).toBe("");
    showDay("2026-02-01");
    $('[data-action="ftm-clear"]').click();
    expect(h.day()).toBeUndefined();
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

  it.each(["en", "fr"] as const)("passes on the timeline (%s)", async (l) => {
    mount(l);
    read();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with an area problem (%s)", async (l) => {
    mount(l);
    read();
    show("month", "x".repeat(61));
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on a day (%s)", async (l) => {
    mount(l);
    read();
    showDay("2026-02-01");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with a day problem (%s)", async (l) => {
    mount(l);
    read();
    showDay("");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});
