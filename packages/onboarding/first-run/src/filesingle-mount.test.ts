// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes } from "./exchange";
import { FACT_KEYS } from "./facts";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { FILE_SINGLE_COPY as C, singleErrorText } from "./filesingle-copy";
import { mountFileSingle, type FileSingleHandle } from "./filesingle-mount";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { KEYS_TARGET, SINGLE_AREA_ID, SINGLE_OPEN_ID, SINGLE_TEXT_ID, keyId, modeId } from "./views-filesingle";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const FILE = exportNotes(
  [
    testNote("a1", "Library", [{ key: "elevator", value: "yes" }, { key: "accessible-washroom", value: "yes", on: "2025-05-05" }], "100 King St W"),
    testNote("a2", "Library", [{ key: "accessible-washroom", value: "yes" }], "100 King St W"),
    testNote("b1", "Bank", [{ key: "elevator", value: "yes" }], "40 Queen St E"),
    testNote("b2", "Bank", [{ key: "elevator", value: "no", source: "Visit" }], "40 Queen St E"),
    testNote("c", "Cart", [], null),
  ],
  "2026-11-01",
);

let root: HTMLElement;
let handle: FileSingleHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileSingleHandle {
  document.documentElement.lang = locale;
  handle = mountFileSingle(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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
  $<HTMLTextAreaElement>(`#${SINGLE_TEXT_ID}`).value = text;
  submit("fsg-file-form");
}

function show(mode: "report" | "source", area = ""): void {
  $<HTMLInputElement>(`#${modeId(mode)}`).checked = true;
  $<HTMLInputElement>(`#${SINGLE_AREA_ID}`).value = area;
  submit("fsg-show-form");
}

function openWith(file: File): void {
  const input = $<HTMLInputElement>(`#${SINGLE_OPEN_ID}`);
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("reading a file", () => {
  it("shows the details with one report at once, focuses the results and announces the summary", async () => {
    const h = mount();
    read();
    expect(h.report()?.list.map((p) => [p.place.name, p.details.map((d) => d.key)])).toEqual([["Library", ["elevator"]]]);
    expect(h.report()?.differ).toBe(1);
    expect(document.activeElement?.id).toBe("fsg-results");
    expect(await status()).toBe(`${C.shown.en} ${$("#fsg-summary").textContent ?? ""}`);
    expect(lastAudit()).toEqual([]);
  });

  it("names the problem when the text is not an export, and links to the box", () => {
    const h = mount();
    read("{}");
    expect(h.report()).toBeUndefined();
    expect($("#fsg-errors").textContent).toContain(singleErrorText("wrong-format", "en"));
    $<HTMLAnchorElement>("#fsg-errors a").click();
    expect(document.activeElement?.id).toBe(SINGLE_TEXT_ID);
    expect(lastAudit()).toEqual([]);
  });
});

describe("downloads", () => {
  it("offers the details listed, their notes, the text to print, and where sources differ, named for the mode and day", () => {
    mount();
    read();
    expect(Array.from(root.querySelectorAll<HTMLAnchorElement>("a.linkbtn")).map((a) => a.getAttribute("download"))).toEqual([
      "details-with-one-report-2026-11-21.csv",
      "details-with-one-report-2026-11-21-notes.json",
      "details-with-one-report-2026-11-21.txt",
      "where-sources-differ-2026-11-21.csv",
      "places-where-sources-differ-2026-11-21-notes.json",
    ]);
    expect(lastAudit()).toEqual([]);
  });
});

describe("choosing what to show", () => {
  it("lists details with reports from one source only when chosen", () => {
    const h = mount();
    read();
    show("source");
    expect(h.report()?.list.map((p) => p.details.map((d) => d.key))).toEqual([["accessible-washroom", "elevator"]]);
    expect(h.choice()).toEqual({ mode: "source", area: "", keys: FACT_KEYS });
  });

  it("keeps only the places in the area, trimmed", () => {
    const h = mount();
    read();
    show("report", "  queen ");
    expect(h.report()?.places).toBe(1);
    expect(h.choice()?.area).toBe("queen");
    expect($<HTMLInputElement>(`#${SINGLE_AREA_ID}`).value).toBe("  queen ");
  });

  it("asks for a shorter area, links to the field, and keeps the results shown", () => {
    const h = mount();
    read();
    show("source", "x".repeat(61));
    expect(document.activeElement?.id).toBe("fsg-errors");
    $<HTMLAnchorElement>("#fsg-errors a").click();
    expect(document.activeElement?.id).toBe(SINGLE_AREA_ID);
    expect(h.choice()).toEqual({ mode: "report", area: "", keys: FACT_KEYS });
    expect(lastAudit()).toEqual([]);
  });
});

describe("choosing the details", () => {
  it("shows only the details ticked, and keeps them ticked", () => {
    const h = mount();
    read();
    for (const k of FACT_KEYS) $<HTMLInputElement>(`#${keyId(k)}`).checked = k === "accessible-washroom";
    show("source");
    expect(h.choice()?.keys).toEqual(["accessible-washroom"]);
    expect(h.report()?.list.map((p) => p.details.map((d) => d.key))).toEqual([["accessible-washroom"]]);
    expect($<HTMLInputElement>(`#${keyId("elevator")}`).checked).toBe(false);
  });

  it("keeps the details chosen when the page switches to French, and says which they are", () => {
    const h = mount();
    read();
    for (const k of FACT_KEYS) $<HTMLInputElement>(`#${keyId(k)}`).checked = k === "elevator";
    show("report");
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect(FACT_KEYS.filter((k) => $<HTMLInputElement>(`#${keyId(k)}`).checked)).toEqual(["elevator"]);
    expect($("#fsg-keys").textContent).toBe("Détails à regarder\u00A0: Ascenseur");
    expect(lastAudit()).toEqual([]);
  });

  it("asks for at least one detail, links to the first box, and keeps the results shown", () => {
    const h = mount();
    read();
    for (const k of FACT_KEYS) $<HTMLInputElement>(`#${keyId(k)}`).checked = false;
    show("report");
    expect(document.activeElement?.id).toBe("fsg-errors");
    $<HTMLAnchorElement>("#fsg-errors a").click();
    expect(document.activeElement?.id).toBe(KEYS_TARGET);
    expect(h.choice()?.keys).toEqual(FACT_KEYS);
    expect(lastAudit()).toEqual([]);
  });
});

describe("files, language and removing", () => {
  it("opens a file into the box, and refuses one too large before reading it", async () => {
    let reads = 0;
    const h = mount("en", () => {
      reads++;
      return Promise.resolve(FILE);
    });
    openWith(new File(["x"], "notes.json"));
    await tick();
    expect($<HTMLTextAreaElement>(`#${SINGLE_TEXT_ID}`).value).toBe(FILE);
    expect(h.file()).toBeUndefined();
    expect(await status()).toBe(C.opened.en);
    const big = new File(["x"], "big.json");
    Object.defineProperty(big, "size", { value: MAX_FILE_BYTES + 1 });
    openWith(big);
    await tick();
    expect(reads).toBe(1);
    expect($("#fsg-errors").textContent).toContain(singleErrorText("too-large", "en"));
  });

  it("says so when a file cannot be read, and ignores a read that ends after the tool is closed", async () => {
    const first = mount("en", () => Promise.reject(new Error("no")));
    openWith(new File(["x"], "notes.json"));
    await tick();
    expect($("#fsg-status").textContent).toBe(C.readFailed.en);
    first.destroy();

    let finish: (s: string) => void = () => undefined;
    const late = mount("en", () => new Promise<string>((r) => (finish = r)));
    openWith(new File(["x"], "notes.json"));
    late.destroy();
    handle = undefined;
    finish(FILE);
    await tick();
    expect(root.innerHTML).toBe("");
  });

  it("switches to French, keeping the choices and the results", () => {
    const h = mount();
    read();
    show("source", "King");
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#fsg-title").textContent).toBe(C.title.fr);
    expect($<HTMLInputElement>(`#${modeId("source")}`).checked).toBe(true);
    expect($("#fsg-summary").textContent).toContain("1 lieu");
    expect(lastAudit()).toEqual([]);
  });

  it("removes the file and the results, starting the form again, and removes its live region on destroy", async () => {
    const h = mount();
    read();
    show("source", "King");
    $('[data-action="fsg-clear"]').click();
    expect(h.file()).toBeUndefined();
    expect(h.report()).toBeUndefined();
    expect(document.activeElement?.id).toBe(SINGLE_TEXT_ID);
    expect(await status()).toBe(C.cleared.en);
    expect(window.localStorage.length).toBe(0);
    read();
    expect(h.choice()).toEqual({ mode: "report", area: "", keys: FACT_KEYS });
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

  it.each(["en", "fr"] as const)("passes on the results (%s)", async (l) => {
    mount(l);
    read();
    show("source");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with an area problem (%s)", async (l) => {
    mount(l);
    read();
    show("report", "x".repeat(61));
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with no detail chosen (%s)", async (l) => {
    mount(l);
    read();
    for (const k of FACT_KEYS) $<HTMLInputElement>(`#${keyId(k)}`).checked = false;
    show("report");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});
