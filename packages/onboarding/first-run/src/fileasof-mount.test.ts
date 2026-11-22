// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { FILE_ASOF_COPY as C, asofErrorText, dayProblemText, toProblemText } from "./fileasof-copy";
import { mountFileAsof, type FileAsofHandle } from "./fileasof-mount";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { parseNote, type Note } from "./model";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { ASOF_OPEN_ID, ASOF_TEXT_ID, DAY_ID, TO_ID } from "./views-fileasof";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function madeOn(n: Note, day: string): Note {
  const out = parseNote({ ...n, createdOn: day });
  if (!out) throw new Error("bad note");
  return out;
}

const FILE = exportNotes(
  [
    madeOn(testNote("lib1", "Library", [{ key: "elevator", value: "yes", on: "2026-03-10" }], "1 King St W"), "2026-03-10"),
    madeOn(testNote("lib2", "Library", [{ key: "elevator", value: "no", on: "2026-06-01" }], "1 King St W"), "2026-06-01"),
    madeOn(testNote("cafe", "Café", [
      { key: "elevator", value: "no", on: "2026-03-15" },
      { key: "automatic-door", value: "yes", on: "2026-05-02" },
    ], "2 King St W"), "2026-03-15"),
    madeOn(testNote("park", "Park", [{ key: "elevator", value: "yes", on: "2026-08-01" }], "3 King St W"), "2026-08-01"),
  ],
  "2026-11-01",
);

let root: HTMLElement;
let handle: FileAsofHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileAsofHandle {
  document.documentElement.lang = locale;
  handle = mountFileAsof(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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
  $<HTMLTextAreaElement>(`#${ASOF_TEXT_ID}`).value = text;
  submit("fas-file-form");
}

function lookBack(day: string): void {
  $<HTMLInputElement>(`#${DAY_ID}`).value = day;
  submit("fas-day-form");
}

const errorLinks = (): string[] => Array.from(root.querySelectorAll("#fas-errors a")).map((a) => a.textContent ?? "");
const cell = (detail: string, col: number): string => {
  const row = Array.from(root.querySelectorAll("#fas-table tbody tr")).find((r) => r.querySelector("th")?.textContent === detail);
  return row?.querySelectorAll("td")[col]?.textContent ?? "";
};

describe("reading a file", () => {
  it("asks for the day and moves focus to the question", async () => {
    const h = mount();
    read();
    expect(h.file()?.places).toHaveLength(3);
    expect(document.activeElement?.id).toBe("fas-day-title");
    expect(await status()).toBe(C.dayTitle.en);
    expect(lastAudit()).toEqual([]);
  });

  it("names the problem when the text is not an export, and its link moves focus to the box", () => {
    const h = mount();
    read("not json");
    expect(errorLinks()).toEqual([asofErrorText("not-json", "en")]);
    expect(h.file()).toBeUndefined();
    root.querySelector<HTMLAnchorElement>("#fas-errors a")?.click();
    expect(document.activeElement?.id).toBe(ASOF_TEXT_ID);
  });
});

describe("looking back", () => {
  it("shows the file on the day, moves focus to it and announces the summary", async () => {
    const h = mount();
    read();
    lookBack("2026-03-31");
    expect(document.activeElement?.id).toBe("fas-results");
    expect(h.snapshot()).toMatchObject({ day: "2026-03-31", leftOut: 2, hidden: 1 });
    expect(await status()).toBe("On 2026-03-31 the file held 2 of its 4 notes, 2 places of 3; 2 notes were made later, and 1 record in the others was made later.");
    expect(cell("Elevator", 0)).toBe("2 (1 Yes, 1 No, 0 with reports that differ, 0 Unknown)");
    expect(cell("Elevator", 1)).toBe("3 (1 Yes, 1 No, 1 with reports that differ, 0 Unknown)");
    expect(cell("Elevator", 2)).toBe("+1");
    expect(cell("Automatic door", 2)).toBe("+1");
    expect(lastAudit()).toEqual([]);
  });

  it("lists the places answered since, detail by detail", () => {
    mount();
    read();
    lookBack("2026-03-31");
    expect(Array.from(root.querySelectorAll(".fas-answered li")).map((li) => li.textContent)).toEqual(["Café, 2 King St W", "Park, 3 King St W"]);
  });

  it("names each problem with the day, keeps what was typed and shows no results", () => {
    const h = mount();
    read();
    for (const [typed, p] of [["", "empty"], ["31/03/2026", "bad"], ["2027-01-01", "future"]] as const) {
      lookBack(typed);
      expect(document.activeElement?.id).toBe("fas-errors");
      expect(errorLinks()).toEqual([dayProblemText(p, "en")]);
      expect($<HTMLInputElement>(`#${DAY_ID}`).value).toBe(typed);
      expect(h.comparison()).toBeUndefined();
    }
    root.querySelector<HTMLAnchorElement>("#fas-errors a")?.click();
    expect(document.activeElement?.id).toBe(DAY_ID);
    expect(lastAudit()).toEqual([]);
  });

  it("offers the file as it was, which reads back with only what was known", () => {
    mount();
    read();
    lookBack("2026-05-01");
    const href = root.querySelector('a[download="notes-as-of-2026-05-01.json"]')?.getAttribute("href") ?? "";
    const back = importNotes(decodeURIComponent(href.replace(/^data:application\/json;charset=utf-8,/, "")));
    expect(back.notes.map((n) => n.id).sort()).toEqual(["cafe", "lib1"]);
    expect(back.notes.find((n) => n.id === "cafe")?.facts.find((f) => f.key === "automatic-door")?.value).toBe("unknown");
  });

  it("keeps the day for the next file", () => {
    const h = mount();
    read();
    lookBack("2026-03-31");
    read();
    expect($<HTMLInputElement>(`#${DAY_ID}`).value).toBe("2026-03-31");
    expect(h.comparison()).toBeUndefined();
    submit("fas-day-form");
    expect(h.comparison()?.day).toBe("2026-03-31");
  });

  it("shows no change when looking back to today", () => {
    mount();
    read();
    lookBack("2026-11-21");
    const rows = Array.from(root.querySelectorAll("#fas-table tbody tr"));
    expect(rows).toHaveLength(4);
    for (const row of rows) expect(row.querySelectorAll("td")[2]?.textContent, row.querySelector("th")?.textContent ?? "").toBe("0");
    expect(root.querySelectorAll(".fas-answered li")).toHaveLength(0);
  });
});

describe("quick days", () => {
  it("fills in a day often looked back to, keeps it in the box and says so", async () => {
    const h = mount();
    read();
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-action="fas-quick"]'));
    expect(buttons.map((b) => b.textContent)).toEqual([
      "End of last month (2026-10-31)",
      "End of last quarter (2026-09-30)",
      "End of last year (2025-12-31)",
      "A year ago today (2025-11-21)",
    ]);
    buttons[1]?.click();
    expect($<HTMLInputElement>(`#${DAY_ID}`).value).toBe("2026-09-30");
    expect(document.activeElement?.id).toBe(DAY_ID);
    expect(await status()).toBe(`${C.quickFilled.en} 2026-09-30`);
    expect(h.comparison()).toBeUndefined();
    submit("fas-day-form");
    expect(h.comparison()?.day).toBe("2026-09-30");
    expect(lastAudit()).toEqual([]);
  });
});

describe("comparing two days", () => {
  function between(day: string, to: string): void {
    $<HTMLInputElement>(`#${DAY_ID}`).value = day;
    $<HTMLInputElement>(`#${TO_ID}`).value = to;
    submit("fas-day-form");
  }

  it("compares the file on two days, with who added records in between", () => {
    const h = mount();
    read();
    between("2026-03-31", "2026-05-31");
    expect(h.comparison()?.to).toBe("2026-05-31");
    expect($("#fas-results").textContent).toBe("The file from 2026-03-31 to 2026-05-31");
    expect(cell("Automatic door", 2)).toBe("+1");
    expect(cell("Elevator", 2)).toBe("0");
    expect(Array.from(root.querySelectorAll(".fas-sources li")).map((li) => li.textContent)).toEqual(["City survey: 1 record at 1 place"]);
    expect(lastAudit()).toEqual([]);
  });

  it("names a problem with the second day and keeps what was typed", () => {
    const h = mount();
    read();
    between("2026-03-31", "2026-03-01");
    expect(errorLinks()).toEqual([toProblemText("not-after", "en")]);
    expect($<HTMLInputElement>(`#${TO_ID}`).value).toBe("2026-03-01");
    expect(h.comparison()).toBeUndefined();
    root.querySelector<HTMLAnchorElement>("#fas-errors a")?.click();
    expect(document.activeElement?.id).toBe(TO_ID);
  });

  it("lists who added records since the day when comparing with now", () => {
    mount();
    read();
    lookBack("2026-03-31");
    expect(Array.from(root.querySelectorAll(".fas-sources li")).map((li) => li.textContent)).toEqual(["City survey: 3 records at 3 places"]);
  });

  it("keeps the results for the days they were made with when the language changes after typing new days", () => {
    const h = mount();
    read();
    between("2026-03-31", "2026-05-31");
    $<HTMLInputElement>(`#${DAY_ID}`).value = "2026-01-01";
    h.setLocale("fr");
    expect($("#fas-results").textContent).toBe("Le fichier du 2026-03-31 au 2026-05-31");
    expect($<HTMLInputElement>(`#${DAY_ID}`).value).toBe("2026-01-01");
  });
});

describe("the language", () => {
  it("keeps the file, day and results when switching to French", () => {
    const h = mount();
    read();
    lookBack("2026-03-31");
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("h2").textContent).toBe(C.title.fr);
    expect($("#fas-results").textContent).toBe("Le fichier au 2026-03-31");
    expect($("#fas-table caption").textContent).toBe(C.tableCaption.fr);
    expect(root.querySelector('a[download="notes-au-2026-03-31.json"]')).not.toBeNull();
    expect(lastAudit()).toEqual([]);
  });

  it("keeps a day not yet shown when switching", () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${DAY_ID}`).value = "2026-0";
    h.setLocale("fr");
    expect($<HTMLInputElement>(`#${DAY_ID}`).value).toBe("2026-0");
  });
});

describe("opening and removing", () => {
  it("puts an opened file in the box without reading it", async () => {
    const h = mount("en", async () => FILE);
    const input = $<HTMLInputElement>(`#${ASOF_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File([FILE], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($<HTMLTextAreaElement>(`#${ASOF_TEXT_ID}`).value).toBe(FILE);
    expect(h.file()).toBeUndefined();
    expect(await status()).toBe(C.opened.en);
  });

  it("refuses a file that is too large before reading it", async () => {
    let called = false;
    mount("en", async () => {
      called = true;
      return "";
    });
    const input = $<HTMLInputElement>(`#${ASOF_OPEN_ID}`);
    const big = new File(["x"], "big.json");
    Object.defineProperty(big, "size", { value: MAX_FILE_BYTES + 1 });
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(called).toBe(false);
    expect(errorLinks()).toEqual([asofErrorText("too-large", "en")]);
  });

  it("says when a file cannot be opened, and keeps focus on the picker", async () => {
    mount("en", async () => {
      throw new Error("no");
    });
    const input = $<HTMLInputElement>(`#${ASOF_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "a.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($("#fas-status").textContent).toBe(C.readFailed.en);
    expect(document.activeElement?.id).toBe(ASOF_OPEN_ID);
  });

  it("removes the file, the day and the results from the page", async () => {
    const h = mount();
    read();
    lookBack("2026-03-31");
    root.querySelector<HTMLButtonElement>('[data-action="fas-clear"]')?.click();
    expect(h.file()).toBeUndefined();
    expect(h.comparison()).toBeUndefined();
    expect(root.querySelector("#fas-day-form")).toBeNull();
    expect(document.activeElement?.id).toBe(ASOF_TEXT_ID);
    expect(await status()).toBe(C.cleared.en);
    read();
    expect($<HTMLInputElement>(`#${DAY_ID}`).value).toBe("");
  });

  it("does nothing after it is destroyed, even when a read finishes late", async () => {
    let finish: (s: string) => void = () => undefined;
    const h = mount("en", () => new Promise<string>((r) => (finish = r)));
    const input = $<HTMLInputElement>(`#${ASOF_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "a.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    h.destroy();
    handle = undefined;
    finish(FILE);
    await tick();
    expect(root.innerHTML).toBe("");
  });

  it("saves nothing to storage", () => {
    mount();
    read();
    lookBack("2026-03-31");
    expect(window.localStorage.length).toBe(0);
  });
});

describe("accessibility of the mounted tool", () => {
  for (const l of ["en", "fr"] as const) {
    it(`has no axe problems with a problem and with results (${l})`, async () => {
      mount(l);
      read();
      lookBack("x");
      let r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => v.id)).toEqual([]);
      lookBack("2026-03-31");
      expect(root.querySelector("#fas-table")).not.toBeNull();
      r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => v.id)).toEqual([]);
      expect(lastAudit()).toEqual([]);
    });
  }

  it("works from the keyboard alone: every control can take focus", () => {
    mount();
    read();
    lookBack("2026-03-31");
    const controls = Array.from(root.querySelectorAll<HTMLElement>("input, textarea, button, a[href]"));
    expect(controls.length).toBeGreaterThan(6);
    for (const c of controls) {
      expect(c.getAttribute("tabindex"), c.outerHTML).not.toBe("-1");
      c.focus();
      expect(document.activeElement).toBe(c);
    }
  });
});
