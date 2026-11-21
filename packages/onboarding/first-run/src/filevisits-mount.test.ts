// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes } from "./exchange";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { FILE_VISITS_COPY as C, problemText, visitsErrorText } from "./filevisits-copy";
import { mountFileVisits, type FileVisitsHandle } from "./filevisits-mount";
import { decodeIcsHref, unfoldLines } from "./ics";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { decodeTextExportHref } from "./textexport";
import { KEEP_STREETS_ID, ONLY_OPEN_ID, fieldId, weekdayId } from "./views-filevisits";

const TODAY = new Date(Date.UTC(2026, 10, 23)); // a Monday
const FILE = exportNotes(
  [
    testNote("k1", "Library", [{ key: "elevator", value: "yes" }], "100 King St W"),
    testNote("k2", "Café", [], "12 King Street West"),
    testNote("k3", "Bank", [], "40 King St W"),
    testNote("e1", "Bakery", [], "5 Elm Ave"),
    testNote("e2", "Florist", [], "9 Elm Ave"),
    testNote("n1", "Market", [], "Toronto"),
  ],
  "2026-11-01",
);

let root: HTMLElement;
let handle: FileVisitsHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileVisitsHandle {
  document.documentElement.lang = locale;
  handle = mountFileVisits(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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
  $<HTMLTextAreaElement>("#fvp-text").value = text;
  $<HTMLFormElement>("#fvp-file-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

function set(field: "start" | "startTime" | "perDay" | "minutes" | "gap", value: string): void {
  $<HTMLInputElement>(`#${fieldId(field)}`).value = value;
}

function update(): void {
  $<HTMLFormElement>("#fvp-options-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

const dayHeadings = (): string[] => Array.from(root.querySelectorAll(".fvp-days h4")).map((h) => h.textContent ?? "");
const dayNames = (): string[][] =>
  Array.from(root.querySelectorAll(".fvp-days > li")).map((d) => Array.from(d.querySelectorAll("ol li")).map((li) => li.querySelector("[data-user-content]")?.textContent ?? ""));
const linkNamed = (label: string): HTMLAnchorElement | undefined => Array.from(root.querySelectorAll<HTMLAnchorElement>("a.linkbtn")).find((a) => a.textContent === label);

describe("planning", () => {
  it("plans the file with the default days and times, and announces the summary", async () => {
    const h = mount();
    read();
    expect(document.activeElement?.id).toBe("fvp-summary");
    expect(h.options().perDay).toBe(6);
    expect(dayHeadings()).toEqual(["Monday, November 23, 2026 (6 visits)"]);
    expect(dayNames()).toEqual([["Bakery", "Florist", "Café", "Bank", "Library", "Market"]]);
    expect(root.querySelector(".fvp-days .fvp-time")?.textContent).toBe("10:00 to 10:30");
    expect(await status()).toBe("6 visits on Monday, November 23, 2026.");
    expect(lastAudit()).toEqual([]);
  });

  it("changes the plan when the days and times change, keeping streets together", async () => {
    const h = mount();
    read();
    set("perDay", "3");
    set("startTime", "9 h 15");
    $<HTMLInputElement>(`#${weekdayId(2)}`).checked = false;
    update();
    expect(h.options().startTime).toBe(9 * 60 + 15);
    expect(document.activeElement?.id).toBe("fvp-days");
    expect(dayHeadings()).toEqual(["Monday, November 23, 2026 (2 visits)", "Wednesday, November 25, 2026 (3 visits)", "Thursday, November 26, 2026 (1 visit)"]);
    expect($<HTMLInputElement>(`#${fieldId("startTime")}`).value).toBe("09:15");
    expect(await status()).toBe(`${C.updated.en} 6 visits over 3 days, from Monday, November 23, 2026 to Thursday, November 26, 2026.`);
    expect(lastAudit()).toEqual([]);
  });

  it("names the streets cut across days when streets may be cut", () => {
    mount();
    read();
    set("perDay", "3");
    $<HTMLInputElement>(`#${KEEP_STREETS_ID}`).checked = false;
    update();
    expect(dayNames()).toEqual([["Bakery", "Florist", "Café"], ["Bank", "Library", "Market"]]);
    expect($("#fvp-split").textContent).toBe("Streets on more than one day: King Street West");
  });

  it("leaves out places with nothing to look at, and says how many", () => {
    mount();
    read(
      exportNotes(
        [
          testNote("d", "Done", [{ key: "elevator", value: "yes" }, { key: "step-free-entry", value: "yes" }, { key: "automatic-door", value: "no" }, { key: "accessible-washroom", value: "yes" }], "2 Elm Ave"),
          testNote("o", "Open", [], "4 Elm Ave"),
        ],
        "2026-11-01",
      ),
    );
    $<HTMLInputElement>(`#${ONLY_OPEN_ID}`).checked = true;
    update();
    expect($("#fvp-summary").textContent).toBe("1 visit on Monday, November 23, 2026. 1 place with nothing to look at is left out.");
    expect(dayNames()).toEqual([["Open"]]);
  });

  it("names the problem when the text is not an export, and links to the box", () => {
    mount();
    read("nope");
    expect(document.activeElement?.id).toBe("fvp-errors");
    expect($("#fvp-errors").textContent).toContain(visitsErrorText("not-json", "en"));
    expect($("#fvp-text").getAttribute("aria-invalid")).toBe("true");
    root.querySelector<HTMLAnchorElement>("#fvp-errors a")?.click();
    expect(document.activeElement?.id).toBe("fvp-text");
    expect(lastAudit()).toEqual([]);
  });
});

describe("problems with the days and times", () => {
  it("lists every problem, keeps what was typed and keeps the last plan on screen", () => {
    const h = mount();
    read();
    set("start", "");
    set("perDay", "99");
    set("gap", "x");
    update();
    expect(document.activeElement?.id).toBe("fvp-errors");
    expect(Array.from(root.querySelectorAll("#fvp-errors li")).map((li) => li.textContent)).toEqual([problemText("date", "en"), problemText("perDay", "en"), problemText("gap", "en")]);
    const perDay = $<HTMLInputElement>(`#${fieldId("perDay")}`);
    expect(perDay.value).toBe("99");
    expect(perDay.getAttribute("aria-invalid")).toBe("true");
    expect(perDay.getAttribute("aria-describedby")).toBe(`e-${fieldId("perDay")}`);
    expect(h.options().perDay).toBe(6);
    expect(dayHeadings()).toHaveLength(1);
    expect(lastAudit()).toEqual([]);
  });

  it("moves focus to the field from its link in the summary", () => {
    mount();
    read();
    set("minutes", "0");
    update();
    root.querySelector<HTMLAnchorElement>(`#fvp-errors a[href="#${fieldId("minutes")}"]`)?.click();
    expect(document.activeElement?.id).toBe(fieldId("minutes"));
  });

  it("asks for at least one day of the week, linking to the first day", () => {
    mount();
    read();
    for (const box of Array.from(root.querySelectorAll<HTMLInputElement>('input[name="weekday"]'))) box.checked = false;
    update();
    expect($("#e-fvp-weekdays").textContent).toBe(problemText("weekdays", "en"));
    root.querySelector<HTMLAnchorElement>(`#fvp-errors a[href="#${weekdayId(1)}"]`)?.click();
    expect(document.activeElement?.id).toBe(weekdayId(1));
    expect(lastAudit()).toEqual([]);
  });

  it("refuses a day that runs past midnight, on the visits-a-day field", () => {
    mount();
    read();
    set("startTime", "23:00");
    update();
    expect($(`#e-${fieldId("perDay")}`).textContent).toBe(problemText("pastMidnight", "en"));
  });

  it("clears the problems once the form is right", () => {
    mount();
    read();
    set("gap", "x");
    update();
    set("gap", "10");
    update();
    expect(root.querySelector("#fvp-errors")).toBeNull();
    expect($<HTMLInputElement>(`#${fieldId("gap")}`).hasAttribute("aria-invalid")).toBe(false);
  });
});

describe("downloads", () => {
  it("gives a calendar file with one event per visit at the plan's times", () => {
    mount();
    read();
    set("perDay", "3");
    update();
    const ics = decodeIcsHref(linkNamed(C.downloadCalendar.en)?.getAttribute("href") ?? "") ?? "";
    const lines = unfoldLines(ics);
    expect(lines.filter((l) => l === "BEGIN:VEVENT")).toHaveLength(6);
    expect(lines.filter((l) => l.startsWith("DTSTART:"))[2]).toBe("DTSTART:20261124T100000");
    expect(lines).toContain("SUMMARY:Bakery");
    expect(linkNamed(C.downloadCalendar.en)?.getAttribute("download")).toBe("visit-plan-2026-11-23.ics");
  });

  it("gives the plan as text to print and as a CSV", () => {
    mount();
    read();
    const text = decodeTextExportHref(linkNamed(C.downloadText.en)?.getAttribute("href") ?? "") ?? "";
    expect(text).toContain("Monday, November 23, 2026 (6 visits)");
    expect(text).toContain("[ ] Market\n    Toronto");
    const csv = decodeURIComponent((linkNamed(C.downloadCsv.en)?.getAttribute("href") ?? "").replace(/^data:text\/csv;charset=utf-8,/, ""));
    expect(csv.split("\r\n").filter((x) => x.startsWith("2026-11-23,"))).toHaveLength(6);
  });
});

describe("files, language and removing", () => {
  it("opens a file into the box", async () => {
    const h = mount("en", () => Promise.resolve(FILE));
    const input = $<HTMLInputElement>("#fvp-open");
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($<HTMLTextAreaElement>("#fvp-text").value).toBe(FILE);
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
    const input = $<HTMLInputElement>("#fvp-open");
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(reads).toBe(0);
    expect($("#fvp-errors").textContent).toContain(visitsErrorText("too-large", "en"));
  });

  it("says so when a file cannot be read, and ignores a read that ends after destroy", async () => {
    mount("en", () => Promise.reject(new Error("no")));
    const input = $<HTMLInputElement>("#fvp-open");
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($("#fvp-status").textContent).toBe(C.readFailed.en);
    expect(document.activeElement?.id).toBe("fvp-open");
    handle?.destroy();

    let finish: (s: string) => void = () => undefined;
    const late = mount("en", () => new Promise<string>((r) => (finish = r)));
    const input2 = $<HTMLInputElement>("#fvp-open");
    Object.defineProperty(input2, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input2.dispatchEvent(new Event("change", { bubbles: true }));
    late.destroy();
    handle = undefined;
    finish(FILE);
    await tick();
    expect(root.innerHTML).toBe("");
  });

  it("keeps the chosen days and times when another file is read", () => {
    const h = mount();
    read();
    set("perDay", "2");
    update();
    read();
    expect(h.options().perDay).toBe(2);
    expect(dayHeadings()).toHaveLength(3);
  });

  it("switches to French and keeps the plan", () => {
    const h = mount();
    read();
    set("perDay", "3");
    update();
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#fvp-title").textContent).toBe(C.title.fr);
    expect(dayHeadings()[0]).toBe("lundi 23 novembre 2026 (2 visites)");
    expect(root.querySelector(".fvp-days .fvp-time")?.textContent).toBe("10 h 00 à 10 h 30");
    expect(lastAudit()).toEqual([]);
  });

  it("removes the file and the plan, saves nothing, and removes its live region on destroy", async () => {
    const h = mount();
    read();
    $('[data-action="fvp-clear"]').click();
    expect(h.file()).toBeUndefined();
    expect(h.plan()).toBeUndefined();
    expect(root.querySelector("#fvp-days")).toBeNull();
    expect(document.activeElement?.id).toBe("fvp-text");
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

  it.each(["en", "fr"] as const)("passes on the plan (%s)", async (l) => {
    mount(l);
    read();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on the plan with problems in the form (%s)", async (l) => {
    mount(l);
    read();
    set("start", "");
    set("gap", "x");
    for (const box of Array.from(root.querySelectorAll<HTMLInputElement>('input[name="weekday"]'))) box.checked = false;
    update();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});
