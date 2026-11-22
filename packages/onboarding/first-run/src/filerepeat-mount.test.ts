// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { FILE_REPEAT_COPY as C, repeatErrorText } from "./filerepeat-copy";
import { mountFileRepeat, type FileRepeatHandle } from "./filerepeat-mount";
import { parseNote, type Note } from "./model";
import { groupId, type RepeatGroup } from "./repeatnotes";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { decodeTextExportHref } from "./textexport";
import { ANY_DAY_ID, REPEAT_OPEN_ID, REPEAT_TEXT_ID, WITHIN_ID, tickId } from "./views-filerepeat";

const TODAY = new Date(Date.UTC(2026, 10, 21));
function note(id: string, name: string, address: string | null, createdOn = "2026-10-01"): Note {
  const n = parseNote({ ...testNote(id, name, [{ key: "elevator", value: "yes" }], address), createdOn });
  if (!n) throw new Error("bad note");
  return n;
}
const NOTES = [note("a1", "Café A", "10 King St W"), note("b1", "Bakery", "20 King St W"), note("a2", "Café A", "10 King St W"), note("k1", "Kiosk", null), note("k2", "Kiosk", null, "2026-11-02")];
const FILE = exportNotes(NOTES, "2026-11-01");

let root: HTMLElement;
let handle: FileRepeatHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileRepeatHandle {
  document.documentElement.lang = locale;
  handle = mountFileRepeat(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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
  $<HTMLTextAreaElement>(`#${REPEAT_TEXT_ID}`).value = text;
  submit("frp-file-form");
}

function setTick(g: RepeatGroup, on: boolean): void {
  const box = $<HTMLInputElement>(`#${tickId(g)}`);
  box.checked = on;
  box.dispatchEvent(new Event("change", { bubbles: true }));
}

const group = (h: FileRepeatHandle, name: string): RepeatGroup => {
  const g = h.groups()?.find((x) => x.kept.placeName === name);
  if (!g) throw new Error(`no group for ${name}`);
  return g;
};
const dataOf = (sel: string): string => decodeURIComponent((root.querySelector(sel)?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, ""));

describe("reading", () => {
  it("finds the repeats at once, every group ticked, and focuses and announces them", async () => {
    const h = mount();
    read();
    expect(h.groups()?.map((g) => [g.kept.id, g.repeats.map((r) => r.id)])).toEqual([["a1", ["a2"]]]);
    expect(h.ticked()).toEqual([groupId(group(h, "Café A"))]);
    expect(document.activeElement?.id).toBe("frp-results");
    expect(await status()).toBe("1 group of repeated notes: 1 note repeats another one.");
    expect(lastAudit()).toEqual([]);
  });

  it("says when no note repeats another", () => {
    const h = mount();
    read(exportNotes([NOTES[0] as Note, NOTES[1] as Note], "2026-11-01"));
    expect(h.groups()).toEqual([]);
    expect($("#frp-found").textContent).toBe(C.none.en);
    expect(root.querySelector("#frp-remove-form")).toBeNull();
  });

  it("names the problem when the text is not an export, and links to the box", () => {
    const h = mount();
    read("nope");
    expect(document.activeElement?.id).toBe("frp-errors");
    expect($("#frp-errors a").textContent).toBe(repeatErrorText("not-json", "en"));
    expect(h.groups()).toBeUndefined();
    $<HTMLAnchorElement>("#frp-errors a").click();
    expect(document.activeElement?.id).toBe(REPEAT_TEXT_ID);
  });
});

describe("options", () => {
  it("counts notes made on different days only when asked", async () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${ANY_DAY_ID}`).checked = true;
    submit("frp-options-form");
    expect(h.groups()?.map((g) => g.kept.placeName)).toEqual(["Café A", "Kiosk"]);
    expect(await status()).toBe("2 groups of repeated notes: 2 notes repeat another one.");
    expect($<HTMLInputElement>(`#${ANY_DAY_ID}`).checked).toBe(true);
    expect($(`#d-${tickId(group(h, "Kiosk"))}`).textContent).toContain("Made on 2026-10-01 and 2026-11-02.");
    expect(lastAudit()).toEqual([]);
  });
});

describe("notes held in a fuller note", () => {
  const notes = (): Note[] => {
    const full = parseNote(testNote("f", "Shop", [{ key: "elevator", value: "yes" }, { key: "automatic-door", value: "no" }], "1 A St"));
    if (!full) throw new Error("bad note");
    return [note("s", "Shop", "1 A St"), full];
  };

  it("finds them only when asked, and takes them out keeping the answers", async () => {
    const h = mount();
    read(exportNotes(notes(), "2026-11-01"));
    expect(h.groups()).toEqual([]);
    $<HTMLInputElement>(`#${WITHIN_ID}`).checked = true;
    submit("frp-options-form");
    expect(h.groups()?.map((g) => [g.kind, g.kept.id])).toEqual([["within", "f"]]);
    expect($(`label[for="${tickId(group(h, "Shop"))}"]`).textContent).toBe("Remove the note held in a fuller note about “Shop, 1 A St”");
    submit("frp-remove-form");
    expect(h.outcome()?.check).toEqual({ ok: true, notes: 1 });
    expect(await status()).toBe(`1 repeated note taken out; 1 note kept. ${C.checkOk.en}`);
    expect(lastAudit()).toEqual([]);
  });
});

describe("removing", () => {
  it("makes a copy without the repeats, reads it back, focuses it and announces it", async () => {
    const h = mount();
    read();
    submit("frp-remove-form");
    expect(h.outcome()?.check).toEqual({ ok: true, notes: 4 });
    expect(document.activeElement?.id).toBe("frp-copy");
    expect(await status()).toBe(`1 repeated note taken out; 4 notes kept. ${C.checkOk.en}`);
    expect(importNotes(dataOf('a[download="notes-without-1-repeat-2026-11-21.json"]')).notes.map((n) => n.id)).toEqual(["a1", "b1", "k1", "k2"]);
    expect(importNotes(dataOf('a[download="notes-taken-out-1-repeat-2026-11-21.json"]')).notes.map((n) => n.id)).toEqual(["a2"]);
    const text = decodeTextExportHref(root.querySelector('a[download="list-1-repeat-2026-11-21.txt"]')?.getAttribute("href") ?? "") ?? "";
    expect(text).toContain("- Café A, 10 King St W\n");
    expect(lastAudit()).toEqual([]);
  });

  it("keeps a group the person unticks, and keeps the tick box focused", () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${ANY_DAY_ID}`).checked = true;
    submit("frp-options-form");
    setTick(group(h, "Kiosk"), false);
    expect(document.activeElement?.id).toBe(tickId(group(h, "Kiosk")));
    expect($('[data-action="frp-remove"]').textContent).toBe("Remove 1 repeated note from the copy");
    submit("frp-remove-form");
    expect(h.outcome()?.removal.removed.map((n) => n.id)).toEqual(["a2"]);
  });

  it("ticks and unticks every group at once, keeping focus on the button and saying what is ticked", async () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${ANY_DAY_ID}`).checked = true;
    submit("frp-options-form");
    $('[data-action="frp-untick-all"]').click();
    expect(h.ticked()).toEqual([]);
    expect(document.activeElement?.getAttribute("data-action")).toBe("frp-untick-all");
    expect(await status()).toBe("No group is ticked.");
    $('[data-action="frp-tick-all"]').click();
    expect(h.ticked()).toHaveLength(2);
    expect(await status()).toBe("2 groups ticked: 2 notes to take out.");
    expect(lastAudit()).toEqual([]);
  });

  it("leaves the copy alone when every group is already ticked", () => {
    const h = mount();
    read();
    $<HTMLInputElement>(`#${ANY_DAY_ID}`).checked = true;
    submit("frp-options-form");
    submit("frp-remove-form");
    const before = h.outcome();
    expect(before?.removal.removed).toHaveLength(2);
    $('[data-action="frp-tick-all"]').click();
    expect(h.outcome()).toBe(before);
    expect(root.querySelector("#frp-status")).toBeNull();
  });

  it("names the problem when no group is ticked, and links to the first one", () => {
    const h = mount();
    read();
    setTick(group(h, "Café A"), false);
    submit("frp-remove-form");
    expect(document.activeElement?.id).toBe("frp-errors");
    expect($("#frp-errors li").textContent).toBe(C.problems.none.en);
    expect(h.outcome()).toBeUndefined();
    $<HTMLAnchorElement>("#frp-errors a").click();
    expect(document.activeElement?.id).toBe(tickId(group(h, "Café A")));
    setTick(group(h, "Café A"), true);
    expect(root.querySelector("#frp-errors")).toBeNull();
    expect(lastAudit()).toEqual([]);
  });

  it("puts the copy away when the choice or the options change, and says so", () => {
    const h = mount();
    read();
    submit("frp-remove-form");
    setTick(group(h, "Café A"), false);
    expect(h.outcome()).toBeUndefined();
    expect($("#frp-status").textContent).toBe(C.changed.en);
    setTick(group(h, "Café A"), true);
    submit("frp-remove-form");
    submit("frp-options-form");
    expect(h.outcome()).toBeUndefined();
    expect($("#frp-status").textContent).toBe(C.changed.en);
  });

  it("does not change the person's text", () => {
    mount();
    read();
    submit("frp-remove-form");
    expect($<HTMLTextAreaElement>(`#${REPEAT_TEXT_ID}`).value).toBe(FILE);
  });
});

describe("files, language and removing the file", () => {
  it("opens a file into the box", async () => {
    const h = mount("en", () => Promise.resolve(FILE));
    const input = $<HTMLInputElement>(`#${REPEAT_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($<HTMLTextAreaElement>(`#${REPEAT_TEXT_ID}`).value).toBe(FILE);
    expect(h.groups()).toBeUndefined();
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
    const input = $<HTMLInputElement>(`#${REPEAT_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(reads).toBe(0);
    expect($("#frp-errors").textContent).toContain(repeatErrorText("too-large", "en"));
  });

  it("says so when a file cannot be read", async () => {
    mount("en", () => Promise.reject(new Error("no")));
    const input = $<HTMLInputElement>(`#${REPEAT_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($("#frp-status").textContent).toBe(C.readFailed.en);
    expect(document.activeElement?.id).toBe(REPEAT_OPEN_ID);
  });

  it("does nothing after destroy when a file finishes reading", async () => {
    let finish: (s: string) => void = () => undefined;
    const h = mount("en", () => new Promise<string>((r) => (finish = r)));
    const input = $<HTMLInputElement>(`#${REPEAT_OPEN_ID}`);
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    h.destroy();
    handle = undefined;
    finish(FILE);
    await tick();
    expect(root.innerHTML).toBe("");
  });

  it("switches to French and keeps the ticks and the copy", () => {
    const h = mount();
    read();
    submit("frp-remove-form");
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#frp-title").textContent).toBe(C.title.fr);
    expect($("#frp-summary").textContent).toBe("1 note répétée retirée\u202F; 4 notes gardées.");
    expect(root.querySelector('a[download="notes-sans-1-repetition-2026-11-21.json"]')).not.toBeNull();
    expect(lastAudit()).toEqual([]);
  });

  it("orders the groups again in French and keeps what is ticked", () => {
    const h = mount();
    read(exportNotes([note("z1", "Zebra", "2 A St"), note("z2", "Zebra", "2 A St"), note("e1", "Éclair", "1 A St"), note("e2", "Éclair", "1 A St"), note("d1", "Dôme", "3 A St"), note("d2", "Dôme", "3 A St")], "2026-11-01"));
    setTick(group(h, "Zebra"), false);
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect(h.groups()?.map((g) => g.kept.placeName)).toEqual(["Dôme", "Éclair", "Zebra"]);
    expect($<HTMLInputElement>(`#${tickId(group(h, "Zebra"))}`).checked).toBe(false);
    expect($<HTMLInputElement>(`#${tickId(group(h, "Dôme"))}`).checked).toBe(true);
    expect(lastAudit()).toEqual([]);
  });

  it("removes the file, the groups and the copy, saves nothing, and removes its live region on destroy", async () => {
    const h = mount();
    read();
    submit("frp-remove-form");
    $('[data-action="frp-clear"]').click();
    expect(h.notes()).toEqual([]);
    expect(h.groups()).toBeUndefined();
    expect(h.outcome()).toBeUndefined();
    expect(document.activeElement?.id).toBe(REPEAT_TEXT_ID);
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

  it.each(["en", "fr"] as const)("passes on the groups (%s)", async (l) => {
    mount(l);
    read();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with the problem shown (%s)", async (l) => {
    const h = mount(l);
    read();
    setTick(group(h, "Café A"), false);
    submit("frp-remove-form");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with both options and every kind of group (%s)", async (l) => {
    mount(l);
    read(exportNotes([...NOTES, note("s", "Shop", "1 A St"), parseNote(testNote("f", "Shop", [{ key: "elevator", value: "yes" }, { key: "automatic-door", value: "no" }], "1 A St")) as Note], "2026-11-01"));
    $<HTMLInputElement>(`#${ANY_DAY_ID}`).checked = true;
    $<HTMLInputElement>(`#${WITHIN_ID}`).checked = true;
    submit("frp-options-form");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on the copy (%s)", async (l) => {
    mount(l);
    read();
    submit("frp-remove-form");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});
