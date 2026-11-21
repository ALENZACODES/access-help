// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { FILE_CHECK_COPY as C, checkErrorText, checkedText } from "./filecheck-copy";
import { checkErrorMessage, mountFileCheck, type FileCheckHandle } from "./filecheck-mount";
import type { FileReaderFn } from "./filecompare-mount";
import { MAX_FILE_BYTES } from "./filecompare-mount";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { decodeTextExportHref } from "./textexport";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const PROV = { source: "City survey", licence: "CC0-1.0", recordedOn: "2026-10-01" };

const MIXED = JSON.stringify({
  format: "app-notes",
  version: 1,
  exportedOn: "2026-11-01",
  notes: [
    { id: "n1", placeName: "Library", address: "1 Main St", createdOn: "2026-10-01", licence: "CC0-1.0", note: "Ask at sam@example.org", facts: [{ key: "elevator", value: "yes" }, { key: "step-free-entry", value: "yes", provenance: PROV }] },
    { id: "n2", placeName: "", createdOn: "2026-10-01", licence: "MIT" },
    { id: "n3", placeName: "Pool", address: "9 Lake Rd", createdOn: "2026-10-01", licence: "CC0-1.0", facts: [{ key: "elevator", value: "no", provenance: PROV }] },
  ],
});
const CLEAN = exportNotes([testNote("a", "Library", [{ key: "elevator", value: "yes" }])], "2026-11-01");

let root: HTMLElement;
let handle: FileCheckHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileCheckHandle {
  document.documentElement.lang = locale;
  handle = mountFileCheck(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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

function run(text: string): void {
  $<HTMLTextAreaElement>("#fk-text").value = text;
  $<HTMLFormElement>("#fk-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

function pickFile(file: File): void {
  const input = $<HTMLInputElement>("#fk-open");
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("the form", () => {
  it("shows a labelled box, a file picker and two buttons, and passes the App's audit", () => {
    mount();
    expect($("#fk-title").textContent).toBe(C.title.en);
    expect(root.querySelector('label[for="fk-text"]')?.textContent).toBe(C.pasteLabel.en);
    expect($<HTMLInputElement>("#fk-open").type).toBe("file");
    expect($('[data-action="fk-check"]').getAttribute("type")).toBe("submit");
    expect($('[data-action="fk-clear"]').textContent).toBe(C.clear.en);
    expect(root.textContent).toContain(C.privacy.en);
    expect(lastAudit()).toEqual([]);
  });
});

describe("errors", () => {
  it("names the problem, marks the box and moves focus to the message", () => {
    mount();
    run("not json");
    expect(document.activeElement?.id).toBe("fk-errors");
    expect($("#fk-errors li").textContent).toBe(checkErrorText("not-json", "en"));
    expect($("#fk-text").getAttribute("aria-invalid")).toBe("true");
    expect($("#fk-text").getAttribute("aria-describedby")).toBe("h-fk-text e-fk-text");
    expect($<HTMLTextAreaElement>("#fk-text").value).toBe("not json");
    expect(lastAudit()).toEqual([]);
  });

  it("moves focus to the box from the error link", () => {
    mount();
    run("");
    root.querySelector<HTMLAnchorElement>("#fk-errors a")?.click();
    expect(document.activeElement?.id).toBe("fk-text");
  });

  it("gives hosts the error in words", () => {
    expect(checkErrorMessage("empty", "fr")).toBe(C.errors.empty.fr);
    expect(checkErrorMessage(undefined, "en")).toBeUndefined();
  });
});

describe("a check", () => {
  it("moves focus to the results and announces the counts", async () => {
    const h = mount();
    run(MIXED);
    expect(document.activeElement?.id).toBe("fk-results");
    expect(await status()).toBe(checkedText(2, 1, 1, "en"));
    expect(h.check()?.totals.readable).toBe(2);
    expect(lastAudit()).toEqual([]);
  });

  it("lists the left-out entry, the answer read as Unknown and the notices", () => {
    mount();
    run(MIXED);
    expect($(".fk-left-out li").textContent).toContain("Entry 2 (id n2). Left out: it has no place name");
    expect($('.fk-dropped li[data-key="elevator"]').textContent).toBe("Elevator, Yes: no source, licence or date at all.");
    expect(root.querySelector('.fk-notices li[data-notice="email-in-text"]')).not.toBeNull();
    expect(root.querySelector(".fk-totals")?.textContent).toContain(C.rows.personal.en);
    expect(root.textContent).toContain("The file says it was exported on 2026-11-01.");
  });

  it("offers cleaned copies the App reads in full, one without the notes' own words", () => {
    mount();
    run(MIXED);
    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>("#fk-downloads ~ p a.linkbtn"));
    expect(links.map((a) => a.textContent)).toEqual([C.downloadClean.en, C.downloadNoWords.en, C.downloadReport.en]);
    const clean = decodeURIComponent((links[0]?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, ""));
    const noWords = decodeURIComponent((links[1]?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, ""));
    expect(importNotes(clean).notes.map((n) => n.id)).toEqual(["n1", "n3"]);
    expect(importNotes(clean).rejected).toBe(0);
    expect(noWords).not.toContain("sam@example.org");
    expect(links[0]?.getAttribute("download")).toBe("notes-cleaned-2026-11-20.json");
    expect(decodeTextExportHref(links[2]?.getAttribute("href") ?? "")).toContain("Check of a notes file");
  });

  it("offers one cleaned copy when no note has its own words", () => {
    mount();
    run(CLEAN);
    expect(root.querySelectorAll("#fk-downloads ~ p a.linkbtn")).toHaveLength(2);
    expect(root.textContent).toContain(C.clean.en);
  });

  it("says there is no cleaned copy when no note can be read", () => {
    mount();
    run(JSON.stringify({ format: "app-notes", version: 1, notes: [{ id: "x" }] }));
    expect(root.textContent).toContain(C.noReadable.en);
    expect(root.querySelectorAll("#fk-downloads ~ p a.linkbtn")).toHaveLength(1);
  });

  it("marks entry names as the file's own text", () => {
    mount("fr");
    run(JSON.stringify({ format: "app-notes", version: 1, notes: [{ id: "a", placeName: "Café : Chez Léa !", createdOn: "2026-10-01", licence: "CC0-1.0" }] }));
    expect(root.querySelector(".fk-notices [data-user-content]")?.textContent).toContain("Café : Chez Léa !");
    expect(lastAudit()).toEqual([]);
  });

  it("saves nothing on this device", () => {
    mount();
    run(MIXED);
    $('[data-action="fk-clear"]').click();
    expect(window.localStorage.length).toBe(0);
  });
});

describe("removing the file", () => {
  it("empties the box and the results, moves focus to the box and announces it", async () => {
    const h = mount();
    run(MIXED);
    $('[data-action="fk-clear"]').click();
    expect($<HTMLTextAreaElement>("#fk-text").value).toBe("");
    expect(root.querySelector("#fk-results")).toBeNull();
    expect(h.check()).toBeUndefined();
    expect(document.activeElement?.id).toBe("fk-text");
    expect(await status()).toBe(C.cleared.en);
  });
});

describe("opening a file", () => {
  it("puts its text in the box and drops an old check", async () => {
    const h = mount("en", () => Promise.resolve(CLEAN));
    run(MIXED);
    pickFile(new File([CLEAN], "notes.json"));
    await tick();
    expect(h.text()).toBe(CLEAN);
    expect(h.check()).toBeUndefined();
    expect(document.activeElement?.id).toBe("fk-text");
    expect(await status()).toBe(C.opened.en);
  });

  it("says when a file cannot be read", async () => {
    mount("en", () => Promise.reject(new Error("no")));
    pickFile(new File(["x"], "a.json"));
    await tick();
    expect($("#fk-status").textContent).toBe(C.readFailed.en);
    expect(document.activeElement?.id).toBe("fk-open");
  });

  it("refuses a file that is too large before reading it", async () => {
    let reads = 0;
    mount("en", () => {
      reads++;
      return Promise.resolve("");
    });
    const big = new File(["x"], "big.json");
    Object.defineProperty(big, "size", { value: MAX_FILE_BYTES + 1 });
    pickFile(big);
    await tick();
    expect(reads).toBe(0);
    expect($("#fk-errors").textContent).toContain(checkErrorText("too-large", "en"));
  });

  it("does nothing after the widget is removed", async () => {
    let finish: (s: string) => void = () => undefined;
    const h = mount("en", () => new Promise<string>((r) => (finish = r)));
    pickFile(new File(["x"], "a.json"));
    h.destroy();
    handle = undefined;
    finish(CLEAN);
    await tick();
    expect(root.innerHTML).toBe("");
  });
});

describe("language and destroy", () => {
  it("switches to French and keeps the text and the check", () => {
    const h = mount();
    run(MIXED);
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#fk-title").textContent).toBe(C.title.fr);
    expect(h.text()).toBe(MIXED);
    expect($(".fk-dropped li[data-key]").textContent).toContain("Ascenseur, Oui");
    expect(lastAudit()).toEqual([]);
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

  it.each(["en", "fr"] as const)("passes with an error (%s)", async (l) => {
    mount(l);
    run("{");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on the results (%s)", async (l) => {
    mount(l);
    run(MIXED);
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});
