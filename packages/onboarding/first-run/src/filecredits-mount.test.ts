// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { MAX_FILE_BYTES, type FileReaderFn } from "./filecompare-mount";
import { FILE_CREDITS_COPY as C, creditsErrorText } from "./filecredits-copy";
import { mountFileCredits, type FileCreditsHandle } from "./filecredits-mount";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { decodeTextExportHref } from "./textexport";
import { AREA_ID, leaveOutId, variantId } from "./views-filecredits";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const FILE = exportNotes(
  [
    testNote("a", "Library", [
      { key: "elevator", value: "yes", on: "2026-01-05" },
      { key: "accessible-washroom", value: "no", on: "2025-03-01", source: "Open data", licence: "CC-BY-4.0" },
    ]),
    { ...testNote("b", "Café", [{ key: "automatic-door", value: "yes", on: "2026-05-01", source: "Walk group", licence: "ODbL-1.0" }]), licence: "ODbL-1.0" },
  ],
  "2026-11-01",
);

let root: HTMLElement;
let handle: FileCreditsHandle | undefined;
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

function mount(locale: "en" | "fr" = "en", readFile?: FileReaderFn): FileCreditsHandle {
  document.documentElement.lang = locale;
  handle = mountFileCredits(root, { locale, today: TODAY, onAudit: (v) => audits.push(v), ...(readFile ? { readFile } : {}) });
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
  $<HTMLTextAreaElement>("#fcr-text").value = text;
  submit("fcr-file-form");
}

function tickLicences(values: readonly string[]): void {
  for (const b of Array.from(root.querySelectorAll<HTMLInputElement>('input[name="leave-out"]'))) b.checked = values.includes(b.value);
}

describe("credits", () => {
  it("lists the licences with their sources and announces the counts", async () => {
    const h = mount();
    read();
    expect(document.activeElement?.id).toBe("fcr-summary");
    expect(h.credits()?.licences.map((l) => l.licence)).toEqual(["CC0-1.0", "CC-BY-4.0", "ODbL-1.0"]);
    expect(Array.from(root.querySelectorAll(".fcr-sources li")).map((li) => li.textContent)).toEqual([
      "City survey: 1 record, 2026-01-05",
      "Open data: 1 record, 2025-03-01",
      "Walk group: 1 record, 2026-05-01",
    ]);
    expect(await status()).toBe("3 records from 3 sources under 3 licences, in 2 notes.");
    expect(lastAudit()).toEqual([]);
  });

  it("downloads the credits as text to paste, as Markdown, and every record with its source", () => {
    mount();
    read();
    const md = decodeURIComponent((root.querySelector('a[download="credits-2026-11-21.md"]')?.getAttribute("href") ?? "").replace(/^data:text\/markdown;charset=utf-8,/, ""));
    expect(md).toContain("### [ODbL-1.0 (Open Database License 1.0)](https://opendatacommons.org/licenses/odbl/1-0/)\n\n- Walk group: 1 record, 2026-05-01\n");
    const records = decodeURIComponent((root.querySelector('a[download="records-and-sources-2026-11-21.csv"]')?.getAttribute("href") ?? "").replace(/^data:text\/csv;charset=utf-8,/, ""));
    expect(records.split("\r\n").filter((l) => /^(Library|Café),/.test(l))).toHaveLength(3);
    const text = decodeTextExportHref(root.querySelector('a[download="credits-2026-11-21.txt"]')?.getAttribute("href") ?? "") ?? "";
    expect(text).toContain("CC-BY-4.0 (Creative Commons Attribution 4.0)\n  https://creativecommons.org/licenses/by/4.0/\n  - Open data: 1 record, 2025-03-01\n");
  });

  it("names the problem when the text is not an export, and links to the box", () => {
    mount();
    read("nope");
    expect(document.activeElement?.id).toBe("fcr-errors");
    expect($("#fcr-errors").textContent).toContain(creditsErrorText("not-json", "en"));
    root.querySelector<HTMLAnchorElement>("#fcr-errors a")?.click();
    expect(document.activeElement?.id).toBe("fcr-text");
    expect(lastAudit()).toEqual([]);
  });
});

describe("a copy without some licences", () => {
  it("makes the copy, announces what was left out, and the copy reads back without those records", async () => {
    const h = mount();
    read();
    tickLicences(["CC-BY-4.0"]);
    submit("fcr-leave-form");
    expect(document.activeElement?.id).toBe("fcr-copy");
    expect(h.copy()?.droppedRecords).toBe(1);
    expect(await status()).toBe(`${C.made.en} The copy has 2 records in 2 notes. 1 record and 0 notes are left out.`);
    const href = root.querySelector('a[download="notes-copy-2026-11-21.json"]')?.getAttribute("href") ?? "";
    const back = importNotes(decodeURIComponent(href.replace(/^data:application\/json;charset=utf-8,/, "")));
    expect(back.notes.find((n) => n.id === "a")?.facts.find((f) => f.key === "accessible-washroom")?.value).toBe("unknown");
    expect(lastAudit()).toEqual([]);
  });

  it("leaves out a note whose own licence is chosen", () => {
    const h = mount();
    read();
    tickLicences(["ODbL-1.0"]);
    submit("fcr-leave-form");
    expect(h.copy()?.notes.map((n) => n.id)).toEqual(["a"]);
    expect($("#fcr-copy-summary").textContent).toBe("The copy has 2 records in 1 note. 0 records and 1 note are left out.");
  });

  it("asks for a licence to be chosen, and refuses a choice that leaves no note", () => {
    const h = mount();
    read();
    submit("fcr-leave-form");
    expect(document.activeElement?.id).toBe("fcr-errors");
    expect($("#fcr-errors").textContent).toContain(C.noneChosen.en);
    root.querySelector<HTMLAnchorElement>(`#fcr-errors a[href="#${leaveOutId(0)}"]`)?.click();
    expect(document.activeElement?.id).toBe(leaveOutId(0));
    tickLicences(["CC0-1.0", "ODbL-1.0"]);
    submit("fcr-leave-form");
    expect($("#fcr-errors").textContent).toContain(C.nothingLeft.en);
    expect(h.copy()).toBeUndefined();
    expect(root.querySelector("#fcr-copy")).toBeNull();
    expect(lastAudit()).toEqual([]);
  });

  it("starts again with nothing ticked when another file is read", () => {
    const h = mount();
    read();
    tickLicences(["CC-BY-4.0"]);
    submit("fcr-leave-form");
    read();
    expect(h.copy()).toBeUndefined();
    expect(root.querySelectorAll('input[name="leave-out"]:checked')).toHaveLength(0);
  });
});

describe("part of the file", () => {
  const TWO = exportNotes(
    [
      testNote("a", "Library", [{ key: "elevator", value: "yes", source: "Open data", licence: "CC-BY-4.0" }], "100 King St W"),
      testNote("b", "Café", [{ key: "elevator", value: "no", source: "Walk group" }], "5 Queen St E"),
    ],
    "2026-11-01",
  );

  it("limits the credits and the copy to places whose address holds the text, and says what is left out", async () => {
    const h = mount();
    read(TWO);
    $<HTMLInputElement>(`#${AREA_ID}`).value = "queen st";
    submit("fcr-area-form");
    expect(document.activeElement?.id).toBe("fcr-summary");
    expect(h.credits()?.licences.map((l) => l.licence)).toEqual(["CC0-1.0"]);
    expect($("#fcr-left-out").textContent).toBe("1 place whose address does not hold “queen st” is not in the credits.");
    expect(await status()).toBe("1 record from 1 source under 1 licence, in 1 note.");
    tickLicences(["CC0-1.0"]);
    submit("fcr-leave-form");
    expect($("#fcr-errors").textContent).toContain(C.nothingLeft.en);
    expect(lastAudit()).toEqual([]);
  });

  it("refuses text no address holds, keeps it on screen and links it from the summary", () => {
    const h = mount();
    read(TWO);
    $<HTMLInputElement>(`#${AREA_ID}`).value = "Elm Ave";
    submit("fcr-area-form");
    expect(document.activeElement?.id).toBe("fcr-errors");
    expect($<HTMLInputElement>(`#${AREA_ID}`).value).toBe("Elm Ave");
    expect(h.credits()?.notes).toBe(2);
    root.querySelector<HTMLAnchorElement>(`#fcr-errors a[href="#${AREA_ID}"]`)?.click();
    expect(document.activeElement?.id).toBe(AREA_ID);
    expect(lastAudit()).toEqual([]);
  });

  it("says when notes the App cannot read are not in the credits", () => {
    mount();
    const parsed = JSON.parse(TWO) as { notes: unknown[] };
    parsed.notes.push({ id: "bad id!", placeName: "X" });
    read(JSON.stringify(parsed));
    expect($("#fcr-left-out").textContent).toBe("1 note the App cannot read is not in the credits.");
  });
});

describe("sources written more than one way", () => {
  const SPELLED = exportNotes(
    [
      testNote("a", "Library", [
        { key: "elevator", value: "yes", source: "Walk Group" },
        { key: "automatic-door", value: "no", source: "walk group." },
      ]),
    ],
    "2026-11-01",
  );

  it("offers to write them one way in the copy, and the credits of the copy list one source", async () => {
    const h = mount();
    read(SPELLED);
    expect(h.credits()?.sources).toBe(2);
    $<HTMLSelectElement>(`#${variantId(0)}`).value = "Walk Group";
    submit("fcr-leave-form");
    expect(document.activeElement?.id).toBe("fcr-copy");
    expect(h.copy()?.renamed).toBe(1);
    expect(await status()).toBe(`${C.made.en} The copy has 2 records in 1 note. 0 records and 0 notes are left out. 1 record has its source written the way you chose.`);
    expect(new Set(h.copy()?.notes[0]?.facts.flatMap((f) => (f.provenance ? [f.provenance.source] : [])))).toEqual(new Set(["Walk Group"]));
    expect(lastAudit()).toEqual([]);
  });

  it("keeps the picked spelling when the language changes", () => {
    const h = mount();
    read(SPELLED);
    $<HTMLSelectElement>(`#${variantId(0)}`).value = "walk group.";
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($<HTMLSelectElement>(`#${variantId(0)}`).value).toBe("walk group.");
    expect(lastAudit()).toEqual([]);
  });
});

describe("files, language and removing", () => {
  it("opens a file into the box", async () => {
    const h = mount("en", () => Promise.resolve(FILE));
    const input = $<HTMLInputElement>("#fcr-open");
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($<HTMLTextAreaElement>("#fcr-text").value).toBe(FILE);
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
    const input = $<HTMLInputElement>("#fcr-open");
    Object.defineProperty(input, "files", { value: [big], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(reads).toBe(0);
    expect($("#fcr-errors").textContent).toContain(creditsErrorText("too-large", "en"));
  });

  it("says so when a file cannot be read, and ignores a read that ends after the tool is closed", async () => {
    const first = mount("en", () => Promise.reject(new Error("no")));
    const input = $<HTMLInputElement>("#fcr-open");
    Object.defineProperty(input, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect($("#fcr-status").textContent).toBe(C.readFailed.en);
    first.destroy();

    let finish: (s: string) => void = () => undefined;
    const late = mount("en", () => new Promise<string>((r) => (finish = r)));
    const input2 = $<HTMLInputElement>("#fcr-open");
    Object.defineProperty(input2, "files", { value: [new File(["x"], "notes.json")], configurable: true });
    input2.dispatchEvent(new Event("change", { bubbles: true }));
    late.destroy();
    handle = undefined;
    finish(FILE);
    await tick();
    expect(root.innerHTML).toBe("");
  });

  it("switches to French, keeping the ticked licences and the copy", () => {
    const h = mount();
    read();
    tickLicences(["CC-BY-4.0"]);
    submit("fcr-leave-form");
    tickLicences(["CC-BY-4.0", "ODbL-1.0"]);
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect($("#fcr-title").textContent).toBe(C.title.fr);
    expect(Array.from(root.querySelectorAll<HTMLInputElement>('input[name="leave-out"]:checked')).map((b) => b.value)).toEqual(["CC-BY-4.0", "ODbL-1.0"]);
    // The copy on screen is still the one that was made, without CC-BY-4.0 only.
    expect($("#fcr-copy-summary").textContent).toBe("La copie compte 2 données dans 2 notes. 1 donnée et 0 note sont laissées de côté.");
    expect(lastAudit()).toEqual([]);
  });

  it("removes the file and the credits, saves nothing, and removes its live region on destroy", async () => {
    const h = mount();
    read();
    $('[data-action="fcr-clear"]').click();
    expect(h.file()).toBeUndefined();
    expect(h.credits()).toBeUndefined();
    expect(document.activeElement?.id).toBe("fcr-text");
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

  it.each(["en", "fr"] as const)("passes on the credits (%s)", async (l) => {
    mount(l);
    read();
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes on the copy (%s)", async (l) => {
    mount(l);
    read();
    tickLicences(["CC-BY-4.0"]);
    submit("fcr-leave-form");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with a problem in the choice (%s)", async (l) => {
    mount(l);
    read();
    submit("fcr-leave-form");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
    expect(lastAudit()).toEqual([]);
  });
});
