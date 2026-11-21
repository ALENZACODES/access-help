// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { FACT_KEYS } from "./facts";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { FILE_AREAS_COPY as C, areasErrorText } from "./fileareas-copy";
import { mountFileAreas, type FileAreasHandle } from "./fileareas-mount";
import { AXE_OPTIONS } from "./shelltest";
import { decodeTextExportHref } from "./textexport";
import { testNote } from "./testnotes";
import { AREAS_OPEN_ID, AREAS_TEXT_ID, HIDE_FULL_ID, PLACES_TITLE_ID, byId, keyBoxId, orderId, showId } from "./views-fileareas";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const FILE = exportNotes(
  [
    testNote("a", "Café A", [{ key: "elevator", value: "yes" }, { key: "step-free-entry", value: "yes" }], "10 King St W, Toronto ON M5V 1A1"),
    testNote("b", "Bakery", [], "20 King St W, Toronto ON M5V 2B2"),
    testNote("d1", "Diner", [{ key: "elevator", value: "yes" }], "30 Queen St E, Toronto ON M5C 1A1"),
    testNote("d2", "Diner", [{ key: "elevator", value: "no" }], "30 Queen St E, Toronto ON M5C 1A1"),
    testNote("s", "Shop", [{ key: "automatic-door", value: "no" }], "5 Rue Saint-Denis"),
    testNote("k", "Kiosk", [], null),
  ],
  "2026-11-01",
);

let root: HTMLElement;
let handle: FileAreasHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileAreasHandle {
  document.documentElement.lang = locale;
  handle = mountFileAreas(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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
  $<HTMLTextAreaElement>(`#${AREAS_TEXT_ID}`).value = text;
  submit("far-file-form");
}

const areas = (): string[] => Array.from(root.querySelectorAll("#far-table tbody th")).map((th) => th.textContent ?? "");
const check = (id: string, on: boolean): void => {
  $<HTMLInputElement>(`#${id}`).checked = on;
};

describe("reading a file", () => {
  it("shows the areas at once, most gaps first, focuses them and announces the summary", async () => {
    const h = mount();
    read();
    expect(h.file()?.places).toHaveLength(5);
    expect(areas()).toEqual(["M5V", "M5C", "No area in the address"]);
    expect(document.activeElement?.id).toBe("far-results");
    expect(await status()).toBe("2 areas, 5 places: 16 details with no record.");
    expect(h.report()?.gaps).toBe(16);
    expect(lastAudit()).toEqual([]);
  });

  it("names the problem when the text is not an export, and links to the box", () => {
    const h = mount();
    read("not json");
    expect(document.activeElement?.id).toBe("far-errors");
    expect($("#far-errors a").textContent).toBe(areasErrorText("not-json", "en"));
    expect(h.file()).toBeUndefined();
    expect(root.querySelector("#far-options-form")).toBeNull();
    $<HTMLAnchorElement>("#far-errors a").click();
    expect(document.activeElement?.id).toBe(AREAS_TEXT_ID);
    expect($<HTMLTextAreaElement>(`#${AREAS_TEXT_ID}`).value).toBe("not json");
    expect(lastAudit()).toEqual([]);
  });

  it("says when the box is empty", () => {
    mount();
    read("");
    expect($("#far-errors").textContent).toContain(C.errors.empty.en);
  });

  it("clears an earlier report when a bad file is read", () => {
    const h = mount();
    read();
    read("{}");
    expect(h.report()).toBeUndefined();
    expect(root.querySelector("#far-table")).toBeNull();
  });
});

describe("options", () => {
  it("groups by street and orders by name", () => {
    const h = mount();
    read();
    check(byId("street"), true);
    check(orderId("name"), true);
    submit("far-options-form");
    expect(h.options()).toEqual({ by: "street", keys: FACT_KEYS, order: "name", hideFull: false });
    expect(areas()).toHaveLength(4);
    expect(areas()[0]).toMatch(/King/);
    expect(areas().at(-1)).toBe("No area in the address");
    expect(document.activeElement?.id).toBe("far-results");
    expect($("#far-results").textContent).toBe("Areas — Street");
    expect(lastAudit()).toEqual([]);
  });

  it("counts only the ticked details and shows a column for each", async () => {
    const h = mount();
    read();
    for (const k of FACT_KEYS) check(keyBoxId(k), k === "elevator");
    submit("far-options-form");
    expect(h.report()?.keys).toEqual(["elevator"]);
    expect(root.querySelectorAll("#far-table thead th")).toHaveLength(5);
    expect(await status()).toBe("2 areas, 5 places: 3 details with no record.");
  });

  it("names the problem when no detail is ticked, keeps the choices, and links to the first detail", () => {
    const h = mount();
    read();
    for (const k of FACT_KEYS) check(keyBoxId(k), false);
    check(byId("street"), true);
    submit("far-options-form");
    expect(document.activeElement?.id).toBe("far-errors");
    expect($("#far-errors li").textContent).toBe(C.noKeys.en);
    expect(h.report()).toBeUndefined();
    expect(root.querySelector("#far-table")).toBeNull();
    expect($<HTMLInputElement>(`#${byId("street")}`).checked).toBe(true);
    $<HTMLAnchorElement>("#far-errors a").click();
    expect(document.activeElement?.id).toBe(keyBoxId("step-free-entry"));
    expect(lastAudit()).toEqual([]);
    // Ticking one again brings the areas back.
    check(keyBoxId("automatic-door"), true);
    submit("far-options-form");
    expect(root.querySelector("#far-errors")).toBeNull();
    expect(h.report()?.keys).toEqual(["automatic-door"]);
  });

  it("keeps the choices when another file is read", () => {
    const h = mount();
    read();
    check(byId("street"), true);
    submit("far-options-form");
    read(exportNotes([testNote("x", "X", [], "1 Bay St, M5J 1A1")], "2026-11-01"));
    expect(h.options().by).toBe("street");
    expect(areas()).toHaveLength(1);
    expect(areas()[0]).toMatch(/Bay/);
  });

  it("says so at once when another file is read with no detail ticked", () => {
    mount();
    read();
    for (const k of FACT_KEYS) check(keyBoxId(k), false);
    submit("far-options-form");
    read();
    expect(document.activeElement?.id).toBe("far-errors");
    expect($("#far-errors li").textContent).toBe(C.noKeys.en);
  });
});

describe("the places in an area", () => {
  it("lists an area's places, focuses the list and announces it", async () => {
    const h = mount();
    read();
    $(`#${showId("M5V")}`).click();
    expect(h.openArea()).toBe("M5V");
    expect(document.activeElement?.id).toBe(PLACES_TITLE_ID);
    expect(await status()).toBe("Places in M5V (2)");
    expect(Array.from(root.querySelectorAll(".far-places h4")).map((x) => x.textContent)).toEqual(["Bakery", "Café A"]);
    expect($(`#${showId("M5V")}`).getAttribute("aria-expanded")).toBe("true");
    expect(lastAudit()).toEqual([]);
  });

  it("hides the list with its button or the hide button, and puts focus back on the area's button", () => {
    const h = mount();
    read();
    $(`#${showId("M5C")}`).click();
    $(`#${showId("M5C")}`).click();
    expect(h.openArea()).toBeUndefined();
    expect(root.querySelector("#far-places")).toBeNull();
    expect(document.activeElement?.id).toBe(showId("M5C"));
    $(`#${showId("")}`).click();
    expect(h.openArea()).toBe("");
    expect($(`#${PLACES_TITLE_ID}`).textContent).toBe("Places with no area in the address (2)");
    $('[data-action="far-close-places"]').click();
    expect(h.openArea()).toBeUndefined();
    expect(document.activeElement?.id).toBe(showId(""));
  });

  it("moves to another area's list", () => {
    const h = mount();
    read();
    $(`#${showId("M5V")}`).click();
    $(`#${showId("M5C")}`).click();
    expect(h.openArea()).toBe("M5C");
    expect(root.querySelectorAll("#far-places")).toHaveLength(1);
  });

  it("keeps the list open with other options while its area is shown, and closes it when not", () => {
    const h = mount();
    read();
    $(`#${showId("M5C")}`).click();
    for (const k of FACT_KEYS) check(keyBoxId(k), k === "elevator");
    submit("far-options-form");
    expect(h.openArea()).toBe("M5C");
    expect(Array.from(root.querySelectorAll(".far-gaps li")).map((x) => x.textContent)).toEqual(["Reports differ: Elevator"]);
    check(byId("street"), true);
    submit("far-options-form");
    expect(h.openArea()).toBeUndefined();
    expect(root.querySelector("#far-places")).toBeNull();
  });

  it("closes the list when a file is read again", () => {
    const h = mount();
    read();
    $(`#${showId("M5C")}`).click();
    read();
    expect(h.openArea()).toBeUndefined();
  });
});

describe("leaving out areas with nothing missing", () => {
  it("leaves them out and says how many", async () => {
    const h = mount();
    read(
      exportNotes(
        [
          testNote("f", "Full", FACT_KEYS.map((key) => ({ key, value: "yes" as const })), "1 Bay St, M5J 1A1"),
          testNote("e", "Empty", [], "1 Elm St, M4W 1A1"),
        ],
        "2026-11-01",
      ),
    );
    expect(areas()).toEqual(["M4W", "M5J"]);
    check(HIDE_FULL_ID, true);
    submit("far-options-form");
    expect(h.options().hideFull).toBe(true);
    expect(areas()).toEqual(["M4W"]);
    expect(await status()).toBe("1 area, 2 places: 4 details with no record. 1 area where every chosen detail has a record is left out.");
    expect($<HTMLInputElement>(`#${HIDE_FULL_ID}`).checked).toBe(true);
    expect(lastAudit()).toEqual([]);
  });

  it("closes the list of an area that is left out", () => {
    const h = mount();
    read(exportNotes([testNote("f", "Full", FACT_KEYS.map((key) => ({ key, value: "yes" as const })), "1 Bay St, M5J 1A1")], "2026-11-01"));
    $(`#${showId("M5J")}`).click();
    expect($(".far-gaps li").textContent).toBe(C.allRecorded.en);
    check(HIDE_FULL_ID, true);
    submit("far-options-form");
    expect(h.openArea()).toBeUndefined();
    expect(root.querySelector("#far-table")).toBeNull();
    expect($("#far-no-rows").textContent).toBe(C.noRows.en);
    expect(root.querySelector('a[download="areas-2026-11-21.csv"]')).not.toBeNull();
    expect(lastAudit()).toEqual([]);
  });
});

describe("downloads", () => {
  it("downloads an area's notes, the table and the text", () => {
    mount();
    read();
    const m5c = root.querySelector<HTMLAnchorElement>('a[download="notes-area-m5c-2026-11-21.json"]');
    expect(m5c?.textContent).toBe("Download notes for M5C (1 place)");
    const back = importNotes(decodeURIComponent((m5c?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, "")));
    expect(back.notes.map((n) => n.id).sort()).toEqual(["d1", "d2"]);
    const csv = decodeURIComponent((root.querySelector('a[download="areas-2026-11-21.csv"]')?.getAttribute("href") ?? "").replace(/^data:text\/csv;charset=utf-8,/, ""));
    expect(csv.split("\r\n")).toHaveLength(5);
    const text = decodeTextExportHref(root.querySelector('a[download="areas-2026-11-21.txt"]')?.getAttribute("href") ?? "") ?? "";
    expect(text).toContain("M5C — 1 place, 3 details with no record\n");
  });

  it("does not change the person's text", () => {
    mount();
    read();
    expect($<HTMLTextAreaElement>(`#${AREAS_TEXT_ID}`).value).toBe(FILE);
  });
});

describe("files, language and removing", () => {
  it("opens a file into the box", async () => {
    const h = mount("en", () => Promise.resolve(FILE));
    const input = $<HTMLInputElement>(`#${AREAS_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($<HTMLTextAreaElement>(`#${AREAS_TEXT_ID}`).value).toBe(FILE);
    expect(h.file()).toBeUndefined();
    expect(document.activeElement?.id).toBe(AREAS_TEXT_ID);
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
    const input = $<HTMLInputElement>(`#${AREAS_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(reads).toBe(0);
    expect($("#far-errors").textContent).toContain(areasErrorText("too-large", "en"));
    expect(document.activeElement?.id).toBe("far-errors");
  });

  it("says so when a file cannot be read", async () => {
    mount("en", () => Promise.reject(new Error("no")));
    const input = $<HTMLInputElement>(`#${AREAS_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($("#far-status").textContent).toBe(C.readFailed.en);
    expect(document.activeElement?.id).toBe(AREAS_OPEN_ID);
  });

  it("does nothing after destroy when a file finishes reading", async () => {
    let finish: (s: string) => void = () => undefined;
    const h = mount("en", () => new Promise<string>((r) => (finish = r)));
    const input = $<HTMLInputElement>(`#${AREAS_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    h.destroy();
    handle = undefined;
    finish(FILE);
    await tick();
    expect(root.innerHTML).toBe("");
  });

  it("switches to French and keeps the areas and choices", () => {
    const h = mount();
    read();
    check(orderId("name"), true);
    submit("far-options-form");
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#far-title").textContent).toBe(C.title.fr);
    expect(areas()).toEqual(["M5C", "M5V", "Aucun secteur dans l’adresse"]);
    expect(h.options().order).toBe("name");
    expect($<HTMLInputElement>(`#${orderId("name")}`).checked).toBe(true);
    expect(root.querySelector("#far-table")?.textContent).toContain("avec rapports divergents");
    expect(root.textContent).not.toMatch(/inconnu/i);
    expect(lastAudit()).toEqual([]);
  });

  it("removes the file and the areas, saves nothing, and removes its live region on destroy", async () => {
    const h = mount();
    read();
    check(byId("street"), true);
    submit("far-options-form");
    $(`#${showId("")}`).click();
    $('[data-action="far-clear"]').click();
    expect(h.file()).toBeUndefined();
    expect(h.report()).toBeUndefined();
    expect(h.openArea()).toBeUndefined();
    expect(h.options().by).toBe("postal");
    expect($<HTMLTextAreaElement>(`#${AREAS_TEXT_ID}`).value).toBe("");
    expect(document.activeElement?.id).toBe(AREAS_TEXT_ID);
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

  it.each(["en", "fr"] as const)("passes on the areas (%s)", async (l) => {
    mount(l);
    read();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on the streets (%s)", async (l) => {
    mount(l);
    read();
    check(byId("street"), true);
    submit("far-options-form");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with an area's places listed (%s)", async (l) => {
    mount(l);
    read();
    $(`#${showId("M5C")}`).click();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with the problems shown (%s)", async (l) => {
    mount(l);
    read();
    for (const k of FACT_KEYS) check(keyBoxId(k), false);
    submit("far-options-form");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});
