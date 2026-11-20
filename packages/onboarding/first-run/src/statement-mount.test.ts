// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CONTRIBUTOR_SOURCE, LIMITS, NOTES_KEY, groupPlaces, loadNotes, memoryStore, mountShell, type KeyValueStore, type Note, type Violation } from "./index";
import { STATEMENT_COPY, STATEMENT_ERRORS } from "./statement-copy";
import { mountStatementReader, type StatementHandle } from "./statement-mount";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));
const PAGE = `Accessibility at the Library
Our main entrance is step-free, with a ramp on King St.
There is no elevator.
Accessible washrooms are on the ground floor.`;

let root: HTMLElement;
let store: KeyValueStore;
let handle: StatementHandle | undefined;
let audits: Violation[][];
let saved: Note[];

beforeEach(() => {
  document.documentElement.lang = "en";
  document.body.innerHTML = '<a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main"><h1>The App</h1><div id="host"></div></main>';
  root = document.getElementById("host") as HTMLElement;
  store = memoryStore();
  audits = [];
  saved = [];
});

afterEach(() => {
  handle?.destroy();
  handle = undefined;
});

function mount(locale: "en" | "fr" = "en"): StatementHandle {
  document.documentElement.lang = locale;
  let n = 0;
  handle = mountStatementReader(root, { locale, store, today: TODAY, makeId: () => `st${++n}`, onAudit: (v) => audits.push(v), onSaved: (note) => saved.push(note) });
  return handle;
}

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => {
  const el = root.querySelector<T>(sel);
  expect(el, sel).not.toBeNull();
  return el as T;
};

function type(sel: string, value: string): void {
  $<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(sel).value = value;
}

function pick(key: string, value: "yes" | "no" | "unknown"): void {
  $<HTMLInputElement>(`input[name="answer-${key}"][value="${value}"]`).checked = true;
}

const status = async (): Promise<string> => {
  await Promise.resolve();
  return document.querySelector('[role="status"][aria-live]')?.textContent ?? "";
};

const auditLines = (): string[] => audits.flat().map((v) => `${v.rule}: ${v.detail}`);

/** Name, text pasted, sentences found. */
function readPage(locale: "en" | "fr" = "en"): void {
  mount(locale);
  type("#st-name", "Library");
  type("#st-address", "1 Main St");
  type("#st-text", PAGE);
  $('[data-action="statement-read"]').click();
}

describe("reading", () => {
  it("asks for text first, with focus in the box", async () => {
    mount();
    $('[data-action="statement-read"]').click();
    expect(document.activeElement?.id).toBe("st-text");
    expect($("#e-st-text").textContent).toBe(STATEMENT_ERRORS["text-required"].en);
    expect(await status()).toBe(STATEMENT_ERRORS["text-required"].en);
  });

  it("lists the sentences, moves focus to them and says how many details were found", async () => {
    readPage();
    expect(document.activeElement?.id).toBe("st-findings");
    expect(await status()).toBe("Found sentences for 3 of 4 details.");
    // What was typed is still there.
    expect($<HTMLInputElement>("#st-name").value).toBe("Library");
    expect($<HTMLTextAreaElement>("#st-text").value).toBe(PAGE);
    expect(auditLines()).toEqual([]);
  });

  it("keeps the answers chosen when the text is read again", () => {
    readPage();
    pick("elevator", "no");
    $('[data-action="statement-read"]').click();
    expect($<HTMLInputElement>('input[name="answer-elevator"][value="no"]').checked).toBe(true);
  });
});

describe("saving", () => {
  it("lists what is missing, with focus on the list, and saves nothing", () => {
    readPage();
    $<HTMLButtonElement>('[data-action="statement-save"]').click();
    expect(document.activeElement?.id).toBe("error-summary");
    expect(Array.from(root.querySelectorAll("#error-summary li")).map((li) => li.textContent)).toEqual([
      STATEMENT_ERRORS["needs-one-detail"].en,
      STATEMENT_ERRORS["licence-required"].en,
    ]);
    expect(loadNotes(store).notes).toEqual([]);
    expect(auditLines()).toEqual([]);
  });

  it("moves focus to a field from the error list", () => {
    readPage();
    $<HTMLButtonElement>('[data-action="statement-save"]').click();
    $('#error-summary a[href="#st-licence"]').click();
    expect(document.activeElement?.id).toBe("st-licence");
  });

  it("saves only what the person chose, with source, licence and date", async () => {
    readPage();
    pick("step-free-entry", "yes");
    pick("elevator", "no");
    type("#st-licence", "CC-BY-4.0");
    type("#st-date", "2026-11-18");
    type("#st-url", "https://example.org/access");
    $<HTMLButtonElement>('[data-action="statement-save"]').click();
    expect(await status()).toBe("Saved a note for Library.");
    expect(document.activeElement?.id).toBe("st-title");
    const notes = loadNotes(store).notes;
    expect(notes).toHaveLength(1);
    const note = notes[0];
    expect(saved).toEqual(notes);
    expect(note?.note).toBe("Read from the place’s own accessibility page. https://example.org/access");
    const byKey = Object.fromEntries((note?.facts ?? []).map((f) => [f.key, f]));
    expect(byKey["step-free-entry"]).toEqual({ key: "step-free-entry", value: "yes", provenance: { source: CONTRIBUTOR_SOURCE, licence: "CC-BY-4.0", recordedOn: "2026-11-18" } });
    expect(byKey["elevator"]?.value).toBe("no");
    // The washroom sentence says "accessible", but the person did not choose: it stays UNKNOWN.
    expect(byKey["accessible-washroom"]).toEqual({ key: "accessible-washroom", value: "unknown", provenance: undefined });
  });

  it("keeps the licence and date for the next page and clears the rest", () => {
    readPage();
    pick("elevator", "no");
    type("#st-licence", "ODbL-1.0");
    $<HTMLButtonElement>('[data-action="statement-save"]').click();
    expect(handle?.form()).toMatchObject({ placeName: "", text: "", licence: "ODbL-1.0", observedOn: "2026-11-19" });
    expect(root.querySelector("#st-findings")).toBeNull();
  });

  it("does not save past the notes limit, and says so", async () => {
    for (let i = 0; i < LIMITS.notes; i++) {
      const raw = JSON.parse(store.getItem(NOTES_KEY) ?? "[]") as unknown[];
      store.setItem(NOTES_KEY, JSON.stringify([testNote(`n${i}`, `Shop ${i}`, [{ key: "elevator", value: "yes" }]), ...raw]));
    }
    readPage();
    pick("elevator", "no");
    type("#st-licence", "CC0-1.0");
    $<HTMLButtonElement>('[data-action="statement-save"]').click();
    expect(await status()).toBe(STATEMENT_COPY.full.en);
    expect(loadNotes(store).notes).toHaveLength(LIMITS.notes);
    expect(saved).toEqual([]);
  });

  it("says so when the browser will not keep the note", async () => {
    store = { getItem: () => null, setItem: () => { throw new Error("quota"); }, removeItem: () => undefined };
    readPage();
    pick("elevator", "no");
    type("#st-licence", "CC0-1.0");
    $<HTMLButtonElement>('[data-action="statement-save"]').click();
    expect(await status()).toBe(STATEMENT_COPY.unavailable.en);
    expect(saved).toEqual([]);
  });

  it("puts the note where the first-run shell finds it", () => {
    readPage();
    pick("elevator", "no");
    type("#st-licence", "CC0-1.0");
    $<HTMLButtonElement>('[data-action="statement-save"]').click();
    handle?.destroy();
    handle = undefined;
    const shellHost = document.createElement("div");
    document.body.appendChild(shellHost);
    const shell = mountShell(shellHost, { requestedLocales: ["en"], store, today: TODAY });
    const places = groupPlaces(loadNotes(store).notes, "en");
    expect(places.map((p) => [p.name, p.resolutions.elevator.kind])).toEqual([["Library", "agree"]]);
    shell.destroy();
  });
});

describe("starting over and language", () => {
  it("clears everything without saving", async () => {
    readPage();
    $('[data-action="statement-clear"]').click();
    expect(await status()).toBe(STATEMENT_COPY.cleared.en);
    expect(document.activeElement?.id).toBe("st-text");
    expect($<HTMLTextAreaElement>("#st-text").value).toBe("");
    expect(loadNotes(store).notes).toEqual([]);
  });

  it("switches language and keeps what is on screen", () => {
    readPage();
    pick("elevator", "no");
    handle?.setLocale("fr");
    expect($("h2").textContent).toBe(STATEMENT_COPY.title.fr);
    expect($<HTMLInputElement>("#st-name").value).toBe("Library");
    expect($<HTMLInputElement>('input[name="answer-elevator"][value="no"]').checked).toBe(true);
  });

  it("removes itself and its listeners", () => {
    mount();
    handle?.destroy();
    handle = undefined;
    expect(root.innerHTML).toBe("");
    expect(document.querySelector('[role="status"][aria-live]')).toBeNull();
  });
});

describe("accessibility", () => {
  it.each(["en", "fr"] as const)("passes axe and the App's audit before and after reading and with errors (%s)", async (l) => {
    mount(l);
    for (const step of [
      () => undefined,
      () => {
        type("#st-name", "Bibliothèque");
        type("#st-text", PAGE);
        $('[data-action="statement-read"]').click();
      },
      () => $<HTMLButtonElement>('[data-action="statement-save"]').click(),
    ]) {
      step();
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    }
    expect(auditLines()).toEqual([]);
  });
});
