// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes } from "./exchange";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { FILE_PUBLISH_COPY as C, publishErrorText, publishProblemText } from "./filepublish-copy";
import { mountFilePublish, type FilePublishHandle } from "./filepublish-mount";
import { parseNote } from "./model";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { decodeTextExportHref } from "./textexport";
import { AREA_ID, NOTE_TEXT_ID, PUBLISH_OPEN_ID, PUBLISH_TEXT_ID, TITLE_ID, UNKNOWN_ID, languageId, layoutId, licenceId } from "./views-filepublish";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function noteWithText(text: string) {
  const n = parseNote({ ...testNote("t", "Cart", [{ key: "step-free-entry", value: "no", on: "2026-06-06" }], null), note: text });
  if (!n) throw new Error("bad note");
  return n;
}

const PLAIN = exportNotes(
  [
    testNote("a", "Library", [{ key: "elevator", value: "yes", on: "2026-03-01" }], "100 King St W"),
    testNote("b", "Bank", [{ key: "automatic-door", value: "no", source: "Visit" }], "40 Queen St E"),
    noteWithText("Side door at the back"),
  ],
  "2026-11-01",
);
const PERSONAL = exportNotes([testNote("a", "Library", [{ key: "elevator", value: "yes" }], "1 Elm St"), noteWithText("Ask Sam: sam@example.org")], "2026-11-01");

let root: HTMLElement;
let handle: FilePublishHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FilePublishHandle {
  document.documentElement.lang = locale;
  handle = mountFilePublish(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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

function read(text = PLAIN): void {
  $<HTMLTextAreaElement>(`#${PUBLISH_TEXT_ID}`).value = text;
  submit("fpb-file-form");
}

function openWith(file: File): void {
  const input = $<HTMLInputElement>(`#${PUBLISH_OPEN_ID}`);
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("reading a file", () => {
  it("shows the checks and the form, focuses the form and announces the checks", async () => {
    const h = mount();
    read();
    expect(h.file()?.places).toHaveLength(3);
    expect(h.rows()).toBeUndefined();
    expect(document.activeElement?.id).toBe("fpb-form");
    expect(await status()).toContain("3 places, 3 notes, 3 Yes or No records");
    expect(lastAudit()).toEqual([]);
  });

  it("names the problem when the text is not an export, and links to the box", () => {
    mount();
    read("[]");
    expect($("#fpb-errors").textContent).toContain(publishErrorText("wrong-format", "en"));
    $<HTMLAnchorElement>("#fpb-errors a").click();
    expect(document.activeElement?.id).toBe(PUBLISH_TEXT_ID);
  });
});

describe("preparing the dataset", () => {
  it("prepares it with the choices made, focuses the results and announces it", async () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${TITLE_ID}`).value = "  Ward 4  ";
    $<HTMLInputElement>(`#${languageId("both")}`).checked = true;
    $<HTMLInputElement>(`#${UNKNOWN_ID}`).checked = true;
    submit("fpb-publish-form");
    expect(h.options()).toEqual({ title: "Ward 4", language: "both", withUnknown: true, withNoteText: false, layout: "records", area: "", licences: undefined });
    expect(h.rows()).toHaveLength(12);
    expect(document.activeElement?.id).toBe("fpb-results");
    expect(await status()).toBe(C.prepared.en);
    const text = decodeTextExportHref(root.querySelectorAll<HTMLAnchorElement>("a.linkbtn")[1]?.getAttribute("href") ?? "") ?? "";
    expect(text.split("\n")[0]).toBe("Ward 4");
    expect(text).toContain("Notes sur l’accessibilité");
    expect(lastAudit()).toEqual([]);
  });

  it("adds the notes' own text when chosen and none of it looks personal", () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${NOTE_TEXT_ID}`).checked = true;
    $<HTMLInputElement>(`#${UNKNOWN_ID}`).checked = true;
    submit("fpb-publish-form");
    // Only the Cart's record comes from a note with its own text; unknown rows carry none.
    expect(h.rows()?.filter((r) => r.noteText !== "").map((r) => [r.placeName, r.key, r.noteText])).toEqual([["Cart", "step-free-entry", "Side door at the back"]]);
    expect(h.options()?.withNoteText).toBe(true);
  });

  it("refuses the notes' own text when some looks like an email address, linking to the box, and prepares nothing", () => {
    const h = mount();
    read(PERSONAL);
    $<HTMLInputElement>(`#${NOTE_TEXT_ID}`).checked = true;
    submit("fpb-publish-form");
    expect(h.rows()).toBeUndefined();
    expect($("#fpb-errors").textContent).toContain(publishProblemText("personal-text", "en"));
    $<HTMLAnchorElement>("#fpb-errors a").click();
    expect(document.activeElement?.id).toBe(NOTE_TEXT_ID);
    expect(lastAudit()).toEqual([]);
    $<HTMLInputElement>(`#${NOTE_TEXT_ID}`).checked = false;
    submit("fpb-publish-form");
    expect(h.rows()).toHaveLength(2);
  });

  it("refuses a title on two lines", () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${TITLE_ID}`).value = "Ward\t4";
    submit("fpb-publish-form");
    expect(h.rows()).toBeUndefined();
    $<HTMLAnchorElement>("#fpb-errors a").click();
    expect(document.activeElement?.id).toBe(TITLE_ID);
  });
});

describe("layout, area and licences", () => {
  it("prepares one row for each place in the area, trimmed, and keeps the choices", () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${layoutId("places")}`).checked = true;
    $<HTMLInputElement>(`#${AREA_ID}`).value = "  King ";
    submit("fpb-publish-form");
    expect(h.options()).toMatchObject({ layout: "places", area: "King" });
    expect(h.rows()?.map((r) => r.placeName)).toEqual(["Library"]);
    expect($("#fpb-results").textContent).toBe(`${C.resultsTitle.en} (1)`);
    expect($<HTMLInputElement>(`#${layoutId("places")}`).checked).toBe(true);
  });

  it("asks for at least one licence, linking to the first box", () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${licenceId(0)}`).checked = false;
    submit("fpb-publish-form");
    expect(h.rows()).toBeUndefined();
    $<HTMLAnchorElement>("#fpb-errors a").click();
    expect(document.activeElement?.id).toBe(licenceId(0));
    expect(lastAudit()).toEqual([]);
  });
});

describe("files, language and removing", () => {
  it("opens a file into the box, and refuses one too large before reading it", async () => {
    let reads = 0;
    const h = mount("en", () => {
      reads++;
      return Promise.resolve(PLAIN);
    });
    openWith(new File(["x"], "notes.json"));
    await tick();
    expect($<HTMLTextAreaElement>(`#${PUBLISH_TEXT_ID}`).value).toBe(PLAIN);
    expect(h.file()).toBeUndefined();
    expect(await status()).toBe(C.opened.en);
    const big = new File(["x"], "big.json");
    Object.defineProperty(big, "size", { value: MAX_FILE_BYTES + 1 });
    openWith(big);
    await tick();
    expect(reads).toBe(1);
    expect($("#fpb-errors").textContent).toContain(publishErrorText("too-large", "en"));
  });

  it("says so when a file cannot be read, and ignores a read that ends after the tool is closed", async () => {
    const first = mount("en", () => Promise.reject(new Error("no")));
    openWith(new File(["x"], "notes.json"));
    await tick();
    expect($("#fpb-status").textContent).toBe(C.readFailed.en);
    first.destroy();

    let finish: (s: string) => void = () => undefined;
    const late = mount("en", () => new Promise<string>((r) => (finish = r)));
    openWith(new File(["x"], "notes.json"));
    late.destroy();
    handle = undefined;
    finish(PLAIN);
    await tick();
    expect(root.innerHTML).toBe("");
  });

  it("switches to French, keeping the form and the dataset as chosen", () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${TITLE_ID}`).value = "Ward 4";
    submit("fpb-publish-form");
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#fpb-title").textContent).toBe(C.title.fr);
    expect($<HTMLInputElement>(`#${TITLE_ID}`).value).toBe("Ward 4");
    expect($<HTMLInputElement>(`#${languageId("en")}`).checked).toBe(true);
    expect($("#fpb-check-list").textContent).toContain("3 lieux");
    expect(lastAudit()).toEqual([]);
  });

  it("removes the file and the dataset, starts the form again, and removes its live region on destroy", async () => {
    const h = mount("fr");
    read();
    $<HTMLInputElement>(`#${TITLE_ID}`).value = "Ward 4";
    submit("fpb-publish-form");
    $('[data-action="fpb-clear"]').click();
    expect(h.file()).toBeUndefined();
    expect(h.rows()).toBeUndefined();
    expect(document.activeElement?.id).toBe(PUBLISH_TEXT_ID);
    expect(await status()).toBe(C.cleared.fr);
    expect(window.localStorage.length).toBe(0);
    read();
    expect($<HTMLInputElement>(`#${TITLE_ID}`).value).toBe("");
    expect($<HTMLInputElement>(`#${languageId("fr")}`).checked).toBe(true);
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

  it.each(["en", "fr"] as const)("passes on the checks and the form (%s)", async (l) => {
    mount(l);
    read();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with problems (%s)", async (l) => {
    mount(l);
    read(PERSONAL);
    $<HTMLInputElement>(`#${NOTE_TEXT_ID}`).checked = true;
    $<HTMLInputElement>(`#${TITLE_ID}`).value = "x".repeat(130);
    submit("fpb-publish-form");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on the dataset with the text open (%s)", async (l) => {
    mount(l);
    read();
    submit("fpb-publish-form");
    $<HTMLDetailsElement>("details").open = true;
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});
