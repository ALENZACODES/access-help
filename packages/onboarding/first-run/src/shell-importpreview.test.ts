// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FACT_KEYS,
  PREVIEW_PLACES_SHOWN,
  addLabel,
  addNote,
  exportNotes,
  loadNotes,
  memoryStore,
  moreText,
  mountShell,
  parseNote,
  previewNotesImport,
  renderImportPreview,
  type KeyValueStore,
  type Note,
  type ShellHandle,
  type Violation,
} from "./index";

const TODAY = new Date(Date.UTC(2026, 10, 15));
let root: HTMLElement;
let shell: ShellHandle | undefined;
let store: KeyValueStore;
let audits: Violation[][];

function mount(locales: string[] = ["en"]): ShellHandle {
  audits = [];
  shell = mountShell(root, { requestedLocales: locales, store, today: TODAY, onAudit: (v) => audits.push(v) });
  return shell;
}

const act = (action: string): string => `[data-action="${action}"]`;

function click(sel: string): void {
  const el = root.querySelector<HTMLElement>(sel);
  expect(el, sel).not.toBeNull();
  el?.click();
}

const text = (): string => root.textContent ?? "";
const flush = (): Promise<void> => Promise.resolve();

function note(id: string, name: string, address = "1 Main St", source = "City survey"): Note {
  const facts = FACT_KEYS.map((key) => (key === "elevator" ? { key, value: "yes", provenance: { source, licence: "CC0-1.0", recordedOn: "2026-10-01" } } : { key, value: "unknown" }));
  const n = parseNote({ id, placeName: name, address, createdOn: "2026-10-01", licence: "CC0-1.0", facts });
  if (!n) throw new Error(`bad ${id}`);
  return n;
}

const EXPORT = (notes: Note[]): string => exportNotes(notes, "2026-11-15");

function paste(value: string): void {
  const ta = root.querySelector<HTMLTextAreaElement>("#import-text")!;
  ta.value = value;
}

const openNotes = (): void => click(act("view") + '[data-value="notes"]');
const savedIds = (): string[] => loadNotes(store).notes.map((n) => n.id).sort();
const rows = (): Record<string, string> => {
  const dts = Array.from(root.querySelectorAll("#import-preview dt")).map((d) => d.textContent ?? "");
  const dds = Array.from(root.querySelectorAll("#import-preview dd")).map((d) => d.firstChild?.textContent ?? "");
  return Object.fromEntries(dts.map((k, i) => [k, dds[i] ?? ""]));
};

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app") as HTMLElement;
  store = memoryStore();
  window.location.hash = "";
  addNote(store, note("a", "Library"));
});

afterEach(() => {
  shell?.destroy();
  shell = undefined;
  vi.unstubAllGlobals();
});

describe("previewing an import", () => {
  it("offers Preview first beside Import", () => {
    mount();
    openNotes();
    expect(root.querySelector(act("import-preview"))?.textContent).toBe("Preview first");
    expect(root.querySelector(act("import-run"))?.textContent).toBe("Import");
  });

  it("shows counts and adds nothing", () => {
    mount();
    openNotes();
    paste(EXPORT([note("a", "Library"), note("b", "Cinema", "3 High St"), note("c", "Dojo", "4 High St", "Town data")]));
    click(act("import-preview"));
    expect(rows()).toMatchObject({ "Notes in the text": "3", "New notes": "2", "Already on this device": "1", "Not valid": "0", "New places": "2", "Places that get more notes": "0" });
    expect(root.querySelector("#import-preview")?.textContent).toContain("Nothing has been added yet");
    expect(Array.from(root.querySelectorAll(".preview-places li")).map((li) => li.textContent)).toEqual(["Cinema", "Dojo"]);
    expect(rows()["Sources in the new notes"]).toBe("City survey, Town data");
    expect(savedIds()).toEqual(["a"]);
  });

  it("moves focus to the preview and announces it", async () => {
    mount();
    openNotes();
    paste(EXPORT([note("b", "Cinema", "3 High St")]));
    click(act("import-preview"));
    expect(document.activeElement?.id).toBe("import-preview");
    await flush();
    expect(document.querySelector('[role="status"][aria-live]')?.textContent).toBe("Preview of the import: 1 New notes");
  });

  it("adds the notes after Add, and says what was added", () => {
    mount();
    openNotes();
    paste(EXPORT([note("b", "Cinema", "3 High St"), note("c", "Dojo", "4 High St")]));
    click(act("import-preview"));
    expect(root.querySelector(act("import-confirm"))?.textContent).toBe("Add 2 notes");
    click(act("import-confirm"));
    expect(savedIds()).toEqual(["a", "b", "c"]);
    expect(root.querySelector("#import-preview")).toBeNull();
    expect(root.querySelector("#import-message")?.textContent).toContain("2 note(s) imported");
  });

  it("does not add anything after Cancel, and says so", () => {
    mount();
    openNotes();
    paste(EXPORT([note("b", "Cinema", "3 High St")]));
    click(act("import-preview"));
    click(act("import-cancel"));
    expect(savedIds()).toEqual(["a"]);
    expect(root.querySelector("#import-preview")).toBeNull();
    expect(text()).toContain("Preview closed. Nothing was added.");
    expect(document.activeElement?.id).toBe("import-text");
  });

  it("keeps what was pasted when the preview is closed", () => {
    mount();
    openNotes();
    const pasted = EXPORT([note("b", "Cinema", "3 High St")]);
    paste(pasted);
    click(act("import-preview"));
    click(act("import-cancel"));
    expect(root.querySelector<HTMLTextAreaElement>("#import-text")?.value).toBe(pasted);
  });

  it("shows a new preview, and adds nothing, when the text changed after the preview", () => {
    mount();
    openNotes();
    paste(EXPORT([note("b", "Cinema", "3 High St")]));
    click(act("import-preview"));
    paste(EXPORT([note("b", "Cinema", "3 High St"), note("c", "Dojo", "4 High St")]));
    click(act("import-confirm"));
    expect(savedIds()).toEqual(["a"]);
    expect(rows()["New notes"]).toBe("2");
    expect(text()).toContain("The text changed. Look at the new preview before adding.");
    click(act("import-confirm"));
    expect(savedIds()).toEqual(["a", "b", "c"]);
  });

  it("says nothing is new, and offers only to close", () => {
    mount();
    openNotes();
    paste(EXPORT([note("a", "Library")]));
    click(act("import-preview"));
    expect(root.querySelector(act("import-confirm"))).toBeNull();
    expect(text()).toContain("There is nothing new to add.");
    click(act("import-cancel"));
    expect(savedIds()).toEqual(["a"]);
  });

  it("says why a text cannot be read, with no preview", () => {
    mount();
    openNotes();
    paste("not a notes export");
    click(act("import-preview"));
    expect(root.querySelector("#import-preview")).toBeNull();
    expect(root.querySelector("#import-message")?.textContent).toBe("That text is not a notes export.");
    paste("");
    click(act("import-preview"));
    expect(root.querySelector("#import-message")?.textContent).toBe("Paste the exported text first.");
  });

  it("goes away when another page is opened, or when Import is used", () => {
    mount();
    openNotes();
    paste(EXPORT([note("b", "Cinema", "3 High St")]));
    click(act("import-preview"));
    click(act("view") + '[data-value="places"]');
    openNotes();
    expect(root.querySelector("#import-preview")).toBeNull();
    paste(EXPORT([note("b", "Cinema", "3 High St")]));
    click(act("import-preview"));
    click(act("import-run"));
    expect(root.querySelector("#import-preview")).toBeNull();
    expect(savedIds()).toEqual(["a", "b"]);
  });

  it("leaves the plain Import working the way it did", () => {
    mount();
    openNotes();
    paste(EXPORT([note("b", "Cinema", "3 High St"), note("a", "Library")]));
    click(act("import-run"));
    expect(savedIds()).toEqual(["a", "b"]);
    expect(root.querySelector("#import-message")?.textContent).toBe("1 note(s) imported, 1 already present or over the limit, 0 not valid.");
  });

  it("says when the notes could not be saved, and keeps the preview closed", () => {
    const real = store;
    store = {
      getItem: (k) => real.getItem(k),
      removeItem: (k) => real.removeItem(k),
      setItem: (k, v) => {
        if (k.includes("notes")) throw new Error("full");
        real.setItem(k, v);
      },
    };
    mount();
    openNotes();
    paste(EXPORT([note("b", "Cinema", "3 High St")]));
    click(act("import-preview"));
    click(act("import-confirm"));
    expect(root.querySelector("#import-message")?.textContent).toBe("The notes could not be saved on this device.");
  });

  it("is in French", () => {
    mount(["fr"]);
    openNotes();
    paste(EXPORT([note("b", "Cinema", "3 High St")]));
    click(act("import-preview"));
    expect(root.querySelector("#import-preview h3")?.textContent).toBe("Aperçu de l’importation");
    expect(root.querySelector(act("import-confirm"))?.textContent).toBe("Ajouter 1 note");
    expect(rows()["Nouvelles notes"]).toBe("1");
    click(act("import-cancel"));
    expect(text()).toContain("Aperçu fermé. Rien n’a été ajouté.");
  });
});

describe("pieces of the preview", () => {
  it("writes the add label and the 'more' text in each language", () => {
    expect([1, 2].map((n) => addLabel(n, "en"))).toEqual(["Add 1 note", "Add 2 notes"]);
    expect([1, 2].map((n) => addLabel(n, "fr"))).toEqual(["Ajouter 1 note", "Ajouter 2 notes"]);
    expect([1, 3].map((n) => moreText(n, "en"))).toEqual(["and 1 more", "and 3 more"]);
    expect([1, 3].map((n) => moreText(n, "fr"))).toEqual(["et 1 autre", "et 3 autres"]);
  });

  it("lists only the first places, then says how many more", () => {
    const notes = Array.from({ length: PREVIEW_PLACES_SHOWN + 3 }, (_, i) => note(`n${i}`, `Place ${String.fromCharCode(65 + i)}`, `${i + 1} Main St`));
    const p = previewNotesImport([], EXPORT(notes), "en");
    if (p.error !== undefined) throw new Error("preview");
    const html = renderImportPreview(p, "en");
    expect(html.match(/<li data-user-content>/g)).toHaveLength(PREVIEW_PLACES_SHOWN);
    expect(html).toContain("and 3 more");
  });

  it("escapes place names and sources", () => {
    const p = previewNotesImport([], EXPORT([note("x", "<img src=x onerror=alert(1)>", "1 A St", "<b>src</b>")]), "en");
    if (p.error !== undefined) throw new Error("preview");
    const html = renderImportPreview(p, "en");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<b>src");
  });
});

describe("accessibility and wording", () => {
  it.each(["en", "fr"] as const)("passes axe and the App's own audit (%s)", async (locale) => {
    mount([locale]);
    openNotes();
    paste(EXPORT([note("b", "Cinema", "3 High St"), note("c", "Dojo", "4 High St")]));
    click(act("import-preview"));
    const run = async (label: string): Promise<void> => {
      const r = await axe.run(document.body, { rules: { "color-contrast": { enabled: false }, "target-size": { enabled: false }, region: { enabled: false } } });
      expect(r.violations.map((v) => `${v.id}: ${v.help}`), `${label} ${locale}`).toEqual([]);
    };
    await run("preview");
    paste(EXPORT([note("a", "Library")]));
    click(act("import-confirm"));
    await run("changed");
    click(act("import-cancel"));
    await run("closed");
    expect(audits.flat().map((v) => `${v.rule}: ${v.detail}`), locale).toEqual([]);
  });

  it("keeps every control at least 44 pixels high", () => {
    mount();
    openNotes();
    paste(EXPORT([note("b", "Cinema", "3 High St")]));
    click(act("import-preview"));
    for (const el of Array.from(root.querySelectorAll<HTMLElement>("#import-preview button"))) expect(el.style.minHeight).toBe("44px");
  });

  it("does not call anything checked or confirmed", () => {
    mount();
    openNotes();
    paste(EXPORT([note("b", "Cinema", "3 High St")]));
    click(act("import-preview"));
    expect(text()).not.toMatch(/verif|confirm|guarantee|safe to/i);
  });
});
