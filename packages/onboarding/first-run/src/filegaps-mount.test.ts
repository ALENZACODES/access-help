// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { FACT_KEYS } from "./facts";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { FILE_GAPS_COPY as C, boxErrorText } from "./filegaps-copy";
import { mountFileGaps, type FileGapsHandle } from "./filegaps-mount";
import { placeId } from "./places";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { decodeTextExportHref } from "./textexport";
import { ONLY_GAPS_ID, OPEN_IDS, SINCE_ID, TEXT_IDS, keyBoxId, tickId } from "./views-filegaps";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const MINE = exportNotes([testNote("m1", "Café", [{ key: "elevator", value: "yes" }], "1 A St"), testNote("m2", "Kiosk", [], null)], "2026-11-01");
const OTHER = exportNotes(
  [
    testNote("o1", "Café", [{ key: "automatic-door", value: "yes", source: "Visit" }], "1 A St"),
    testNote("o2", "Kiosk", [{ key: "elevator", value: "no", source: "Visit" }], null),
    testNote("o3", "Café", [{ key: "step-free-entry", value: "yes", source: "Visit" }, { key: "elevator", value: "no", source: "Visit" }], "1 A St"),
    testNote("o4", "Diner", [{ key: "elevator", value: "no", source: "Visit" }], "9 Z St"),
  ],
  "2026-11-01",
);
const CAFE = placeId({ placeName: "Café", address: "1 A St" });
const KIOSK = placeId({ placeName: "Kiosk", address: undefined });

let root: HTMLElement;
let handle: FileGapsHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileGapsHandle {
  document.documentElement.lang = locale;
  handle = mountFileGaps(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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

function read(mine = MINE, other = OTHER): void {
  $<HTMLTextAreaElement>(`#${TEXT_IDS.mine}`).value = mine;
  $<HTMLTextAreaElement>(`#${TEXT_IDS.other}`).value = other;
  submit("fgp-file-form");
}

function setTick(id: string, on: boolean): void {
  const box = $<HTMLInputElement>(`#${tickId(id)}`);
  box.checked = on;
  box.dispatchEvent(new Event("change", { bubbles: true }));
}

const copyIds = (): string[] =>
  importNotes(decodeURIComponent((root.querySelector('a[download^="notes-"]')?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, ""))).notes.map((n) => n.id);

describe("reading both files", () => {
  it("finds the answers for the gaps at once, every place ticked, focused and announced", async () => {
    const h = mount();
    read();
    expect(h.plan()?.places.map((p) => p.place.name)).toEqual(["Café", "Kiosk"]);
    expect(h.ticked()).toEqual([CAFE, KIOSK]);
    expect(document.activeElement?.id).toBe("fgp-results");
    expect(await status()).toBe("2 places can gain 2 answers from 2 notes.");
    expect($("#fgp-left-out").textContent).toBe("Left out: 1 note about places not in your file, 1 that also answer another detail.");
    expect(lastAudit()).toEqual([]);
  });

  it("names the problem with each file and links to its box", () => {
    const h = mount();
    read("", "nope");
    expect(document.activeElement?.id).toBe("fgp-errors");
    expect(Array.from(root.querySelectorAll("#fgp-errors a")).map((a) => a.textContent)).toEqual([boxErrorText("mine", "empty", "en"), boxErrorText("other", "not-json", "en")]);
    expect(h.plan()).toBeUndefined();
    root.querySelectorAll<HTMLAnchorElement>("#fgp-errors a")[1]?.click();
    expect(document.activeElement?.id).toBe(TEXT_IDS.other);
    expect($<HTMLTextAreaElement>(`#${TEXT_IDS.other}`).value).toBe("nope");
    expect(lastAudit()).toEqual([]);
  });

  it("names only the file with a problem", () => {
    mount();
    read(MINE, "");
    expect(Array.from(root.querySelectorAll("#fgp-errors a")).map((a) => a.getAttribute("href"))).toEqual([`#${TEXT_IDS.other}`]);
  });
});

describe("options", () => {
  it("brings in notes that also answer another detail when asked", async () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${ONLY_GAPS_ID}`).checked = false;
    submit("fgp-options-form");
    expect(h.options().onlyGaps).toBe(false);
    expect(h.plan()?.places[0]?.notes.map((n) => n.note.id)).toEqual(["o1", "o3"]);
    expect($(`#d-${tickId(CAFE)}`).textContent).toBe("Fills: Step-free entrance, Automatic door. Also adds a record to: Elevator.");
    expect(await status()).toBe("2 places can gain 3 answers from 3 notes.");
  });

  it("brings in only records from the day chosen, and names a day that is not a real date", async () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${SINCE_ID}`).value = "2026-31-01";
    submit("fgp-options-form");
    expect($("#fgp-errors li").textContent).toBe(C.badSince.en);
    expect(h.plan()).toBeUndefined();
    expect($<HTMLInputElement>(`#${SINCE_ID}`).value).toBe("2026-31-01");
    $<HTMLAnchorElement>("#fgp-errors a").click();
    expect(document.activeElement?.id).toBe(SINCE_ID);
    $<HTMLInputElement>(`#${SINCE_ID}`).value = " 2026-10-02 ";
    submit("fgp-options-form");
    expect(h.options().since).toBe("2026-10-02");
    expect(h.plan()?.places).toEqual([]);
    expect(h.plan()?.older).toBe(3);
    expect(await status()).toBe(C.none.en);
    expect(lastAudit()).toEqual([]);
  });

  it("names the problem when no detail is ticked, and links to the first detail", () => {
    const h = mount();
    read();
    for (const k of FACT_KEYS) $<HTMLInputElement>(`#${keyBoxId(k)}`).checked = false;
    submit("fgp-options-form");
    expect($("#fgp-errors li").textContent).toBe(C.noKeys.en);
    expect(h.plan()).toBeUndefined();
    $<HTMLAnchorElement>("#fgp-errors a").click();
    expect(document.activeElement?.id).toBe(keyBoxId("step-free-entry"));
    expect(lastAudit()).toEqual([]);
  });
});

describe("adding", () => {
  it("adds the notes to a copy, reads it back, focuses it and announces it", async () => {
    const h = mount();
    read();
    submit("fgp-add-form");
    expect(h.outcome()?.check).toEqual({ ok: true, notes: 4, filled: 2 });
    expect(document.activeElement?.id).toBe("fgp-copy");
    expect(await status()).toBe(`2 notes added; 2 gaps now have an answer; 4 notes in all. ${C.checkOk.en}`);
    expect(copyIds()).toEqual(["m1", "m2", "o1", "o2"]);
    const list = decodeTextExportHref(root.querySelector('a[download="list-2-notes-added-2026-11-21.txt"]')?.getAttribute("href") ?? "") ?? "";
    expect(list).toContain("- Café, 1 A St\n    Fills: Automatic door.\n");
    expect(lastAudit()).toEqual([]);
  });

  it("leaves out a place the person unticks, keeping its tick box focused", () => {
    const h = mount();
    read();
    setTick(KIOSK, false);
    expect(document.activeElement?.id).toBe(tickId(KIOSK));
    expect($('[data-action="fgp-add"]').textContent).toBe("Add 1 note to a copy of your file");
    submit("fgp-add-form");
    expect(h.outcome()?.filled.added.map((n) => n.id)).toEqual(["o1"]);
  });

  it("ticks and unticks every place at once, keeping focus on the button and saying what is ticked", async () => {
    const h = mount();
    read();
    $('[data-action="fgp-untick-all"]').click();
    expect(h.ticked()).toEqual([]);
    expect(document.activeElement?.getAttribute("data-action")).toBe("fgp-untick-all");
    expect(await status()).toBe("No place is ticked.");
    $('[data-action="fgp-tick-all"]').click();
    expect(h.ticked()).toEqual([CAFE, KIOSK]);
    expect(await status()).toBe("2 places ticked: 2 notes to add.");
    submit("fgp-add-form");
    const before = h.outcome();
    $('[data-action="fgp-tick-all"]').click();
    // Every place was ticked already, so the copy stays.
    expect(h.outcome()).toBe(before);
    expect(lastAudit()).toEqual([]);
  });

  it("names the problem when no place is ticked, and links to the first one", () => {
    const h = mount();
    read();
    setTick(CAFE, false);
    setTick(KIOSK, false);
    submit("fgp-add-form");
    expect($("#fgp-errors li").textContent).toBe(C.noneTicked.en);
    expect(h.outcome()).toBeUndefined();
    $<HTMLAnchorElement>("#fgp-errors a").click();
    expect(document.activeElement?.id).toBe(tickId(CAFE));
    expect(lastAudit()).toEqual([]);
  });

  it("puts the copy away when the choice changes, and says so", () => {
    const h = mount();
    read();
    submit("fgp-add-form");
    setTick(KIOSK, false);
    expect(h.outcome()).toBeUndefined();
    expect($("#fgp-status").textContent).toBe(C.changed.en);
  });

  it("does not change either file's text", () => {
    mount();
    read();
    submit("fgp-add-form");
    expect($<HTMLTextAreaElement>(`#${TEXT_IDS.mine}`).value).toBe(MINE);
    expect($<HTMLTextAreaElement>(`#${TEXT_IDS.other}`).value).toBe(OTHER);
  });
});

describe("files, language and removing", () => {
  it("opens a file into its own box", async () => {
    const h = mount("en", () => Promise.resolve(OTHER));
    const input = $<HTMLInputElement>(`#${OPEN_IDS.other}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "other.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($<HTMLTextAreaElement>(`#${TEXT_IDS.other}`).value).toBe(OTHER);
    expect($<HTMLTextAreaElement>(`#${TEXT_IDS.mine}`).value).toBe("");
    expect(document.activeElement?.id).toBe(TEXT_IDS.other);
    expect(h.plan()).toBeUndefined();
    expect(await status()).toBe(C.opened.en);
  });

  it("refuses a file that is too large before reading it, naming its box", async () => {
    let reads = 0;
    mount("en", () => {
      reads++;
      return Promise.resolve("");
    });
    const big = new File(["x"], "big.json");
    Object.defineProperty(big, "size", { value: MAX_FILE_BYTES + 1 });
    const input = $<HTMLInputElement>(`#${OPEN_IDS.mine}`);
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(reads).toBe(0);
    expect($("#fgp-errors a").textContent).toBe(boxErrorText("mine", "too-large", "en"));
  });

  it("says so when a file cannot be read, and does nothing after destroy", async () => {
    mount("en", () => Promise.reject(new Error("no")));
    const input = $<HTMLInputElement>(`#${OPEN_IDS.mine}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($("#fgp-status").textContent).toBe(C.readFailed.en);
    expect(document.activeElement?.id).toBe(OPEN_IDS.mine);
    handle?.destroy();
    let finish: (s: string) => void = () => undefined;
    const h = mount("en", () => new Promise<string>((r) => (finish = r)));
    const again = $<HTMLInputElement>(`#${OPEN_IDS.mine}`);
    Object.defineProperty(again, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    again.dispatchEvent(new Event("change", { bubbles: true }));
    h.destroy();
    handle = undefined;
    finish(MINE);
    await tick();
    expect(root.innerHTML).toBe("");
  });

  it("switches to French and keeps the ticks and the copy", () => {
    const h = mount();
    read();
    setTick(KIOSK, false);
    submit("fgp-add-form");
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#fgp-title").textContent).toBe(C.title.fr);
    expect(h.ticked()).toEqual([CAFE]);
    expect($("#fgp-copy-summary").textContent).toBe("1 note ajoutée\u202F; 1 manque a maintenant une réponse\u202F; 3 notes en tout.");
    expect(lastAudit()).toEqual([]);
  });

  it("keeps every option across a change of language", () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${ONLY_GAPS_ID}`).checked = false;
    $<HTMLInputElement>(`#${SINCE_ID}`).value = "2026-01-01";
    submit("fgp-options-form");
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect(h.options()).toEqual({ keys: FACT_KEYS, onlyGaps: false, since: "2026-01-01" });
    expect($<HTMLInputElement>(`#${SINCE_ID}`).value).toBe("2026-01-01");
    expect($<HTMLInputElement>(`#${ONLY_GAPS_ID}`).checked).toBe(false);
    expect($("#fgp-summary").textContent).toBe("2 lieux peuvent recevoir 3 réponses grâce à 3 notes.");
  });

  it("removes both files and the copy, saves nothing, and removes its live region on destroy", async () => {
    const h = mount();
    read();
    submit("fgp-add-form");
    $('[data-action="fgp-clear"]').click();
    expect(h.plan()).toBeUndefined();
    expect(h.outcome()).toBeUndefined();
    expect($<HTMLTextAreaElement>(`#${TEXT_IDS.other}`).value).toBe("");
    expect(document.activeElement?.id).toBe(TEXT_IDS.mine);
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

  it.each(["en", "fr"] as const)("passes with both file errors (%s)", async (l) => {
    mount(l);
    read("", "nope");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with every option problem shown (%s)", async (l) => {
    mount(l);
    read();
    for (const k of FACT_KEYS) $<HTMLInputElement>(`#${keyBoxId(k)}`).checked = false;
    $<HTMLInputElement>(`#${SINCE_ID}`).value = "soon";
    submit("fgp-options-form");
    expect(root.querySelectorAll("#fgp-errors li")).toHaveLength(2);
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on the plan (%s)", async (l) => {
    mount(l);
    read();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on the copy (%s)", async (l) => {
    mount(l);
    read();
    submit("fgp-add-form");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});
