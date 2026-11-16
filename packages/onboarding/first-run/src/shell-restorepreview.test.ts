// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CHECKLIST_KEY,
  FACT_KEYS,
  NEEDS_KEY,
  SHORTLIST_KEY,
  addNote,
  exportLists,
  groupPlaces,
  memoryStore,
  mountShell,
  parseNote,
  renderRestorePreview,
  type KeyValueStore,
  type Lists,
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

const act = (action: string, value?: string): string => `[data-action="${action}"]` + (value !== undefined ? `[data-value="${value}"]` : "");

function click(sel: string): void {
  const el = root.querySelector<HTMLElement>(sel);
  expect(el, sel).not.toBeNull();
  el?.click();
}

const text = (): string => root.textContent ?? "";

function note(id: string, name: string, address: string): Note {
  const n = parseNote({ id, placeName: name, address, createdOn: "2026-10-01", licence: "CC0-1.0", facts: FACT_KEYS.map((key) => ({ key, value: "unknown" })) });
  if (!n) throw new Error(`bad ${id}`);
  return n;
}

const NOTES = [note("a", "Library", "1 Main St"), note("b", "Bakery", "2 Side Rd")];
const [BAKERY, LIBRARY] = groupPlaces(NOTES, "en").map((p) => p.id) as [string, string];
const GONE = "gone-0a1b2c3d";
const EMPTY: Lists = { needs: {}, shortlist: [], checklist: {} };
const backup = (l: Partial<Lists>): string => exportLists({ ...EMPTY, ...l }, "2026-11-15");
const ask = { asked: true, answer: "yes" };

function paste(value: string): void {
  (root.querySelector("#restore-text") as HTMLTextAreaElement).value = value;
}

const openPlaces = (): void => {
  click(act("view", "notes"));
  click(act("view", "places"));
};

const rows = (): Record<string, string> => {
  const dts = Array.from(root.querySelectorAll("#restore-preview dt")).map((d) => d.textContent ?? "");
  const dds = Array.from(root.querySelectorAll("#restore-preview dd")).map((d) => d.textContent ?? "");
  return Object.fromEntries(dts.map((k, i) => [k, dds[i] ?? ""]));
};

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app") as HTMLElement;
  store = memoryStore();
  window.location.hash = "";
  for (const n of NOTES.slice().reverse()) addNote(store, n);
});

afterEach(() => {
  shell?.destroy();
  shell = undefined;
  vi.unstubAllGlobals();
});

describe("previewing a restore", () => {
  it("offers Preview first beside Restore from text", () => {
    mount();
    openPlaces();
    expect(root.querySelector(act("restore-preview"))?.textContent).toBe("Preview first");
    expect(root.querySelector(act("backup-restore"))?.textContent).toBe("Restore from text");
  });

  it("shows counts and restores nothing", () => {
    mount();
    openPlaces();
    paste(backup({ needs: { elevator: "yes" }, shortlist: [LIBRARY, GONE], checklist: { [LIBRARY]: { elevator: ask } } }));
    click(act("restore-preview"));
    expect(rows()).toMatchObject({
      "Must-haves in the backup": "1",
      "Must-haves that would be added": "1",
      "Shortlist places in the backup": "2",
      "Shortlist places that would be added": "1",
      "Left out, the place is not on this device": "1",
    });
    expect(text()).toContain("Nothing has been restored yet");
    expect(store.getItem(NEEDS_KEY)).toBeNull();
    expect(store.getItem(SHORTLIST_KEY)).toBeNull();
    expect(store.getItem(CHECKLIST_KEY)).toBeNull();
  });

  it("moves focus to the preview", () => {
    mount();
    openPlaces();
    paste(backup({ shortlist: [LIBRARY] }));
    click(act("restore-preview"));
    expect(document.activeElement?.id).toBe("restore-preview");
  });

  it("restores exactly what the preview said, after Restore", () => {
    mount();
    openPlaces();
    paste(backup({ needs: { elevator: "yes" }, shortlist: [LIBRARY, BAKERY, GONE], checklist: { [LIBRARY]: { elevator: ask } } }));
    click(act("restore-preview"));
    click(act("restore-confirm"));
    expect(JSON.parse(store.getItem(SHORTLIST_KEY) ?? "[]")).toEqual([LIBRARY, BAKERY]);
    expect(JSON.parse(store.getItem(NEEDS_KEY) ?? "{}")).toEqual({ elevator: "yes" });
    expect(Object.keys(JSON.parse(store.getItem(CHECKLIST_KEY) ?? "{}"))).toEqual([LIBRARY]);
    expect(root.querySelector("#restore-preview")).toBeNull();
    expect(root.querySelector("#restore-message")?.textContent).toContain("Restored");
  });

  it("restores nothing after Cancel, and says so", () => {
    mount();
    openPlaces();
    paste(backup({ shortlist: [LIBRARY] }));
    click(act("restore-preview"));
    click(act("restore-cancel"));
    expect(store.getItem(SHORTLIST_KEY)).toBeNull();
    expect(text()).toContain("Preview closed. Nothing was restored.");
    expect(document.activeElement?.id).toBe("restore-text");
  });

  it("shows a new preview when the text changed after the preview", () => {
    mount();
    openPlaces();
    paste(backup({ shortlist: [LIBRARY] }));
    click(act("restore-preview"));
    paste(backup({ shortlist: [LIBRARY, BAKERY] }));
    click(act("restore-confirm"));
    expect(store.getItem(SHORTLIST_KEY)).toBeNull();
    expect(rows()["Shortlist places that would be added"]).toBe("2");
    expect(text()).toContain("The text changed. Look at the new preview before restoring.");
    click(act("restore-confirm"));
    expect(JSON.parse(store.getItem(SHORTLIST_KEY) ?? "[]")).toHaveLength(2);
  });

  it("says when restoring would change nothing, and offers only to close", () => {
    mount();
    openPlaces();
    paste(backup({}));
    click(act("restore-preview"));
    expect(root.querySelector(act("restore-confirm"))).toBeNull();
    expect(text()).toContain("Restoring would not change anything.");
  });

  it("says that must-haves already here are kept", () => {
    store.setItem(NEEDS_KEY, JSON.stringify({ "step-free-entry": "yes" }));
    mount();
    openPlaces();
    paste(backup({ needs: { elevator: "yes" } }));
    click(act("restore-preview"));
    expect(text()).toContain("This device already has must-haves, so they are kept as they are.");
    expect(rows()["Must-haves that would be added"]).toBe("0");
  });

  it("says why a text cannot be read, with no preview", () => {
    mount();
    openPlaces();
    paste("hello");
    click(act("restore-preview"));
    expect(root.querySelector("#restore-preview")).toBeNull();
    expect(root.querySelector("#restore-message")?.textContent).toBe("That text is not a backup. It could not be read.");
  });

  it("goes away when another page is opened", () => {
    mount();
    openPlaces();
    paste(backup({ shortlist: [LIBRARY] }));
    click(act("restore-preview"));
    click(act("view", "notes"));
    click(act("view", "places"));
    expect(root.querySelector("#restore-preview")).toBeNull();
  });

  it("leaves the plain restore working the way it did", () => {
    mount();
    openPlaces();
    paste(backup({ shortlist: [LIBRARY] }));
    click(act("backup-restore"));
    expect(JSON.parse(store.getItem(SHORTLIST_KEY) ?? "[]")).toEqual([LIBRARY]);
    expect(root.querySelector("#restore-message")?.textContent).toContain("1 place(s) added to the shortlist");
  });

  it("is in French", () => {
    mount(["fr"]);
    openPlaces();
    paste(backup({ needs: { elevator: "yes" }, shortlist: [LIBRARY, GONE] }));
    click(act("restore-preview"));
    expect(root.querySelector("#restore-preview h4")?.textContent).toBe("Aperçu de la restauration");
    expect(rows()["Incontournables dans la sauvegarde"]).toBe("1");
    expect(root.querySelector(act("restore-confirm"))?.textContent).toBe("Restaurer");
  });
});

describe("the preview itself", () => {
  const base = { error: undefined, needsInFile: 0, needsTaken: 0, deviceHasNeeds: false, shortlistInFile: 0, shortlistNoPlace: 0, shortlistAdded: 0, notesInFile: 0, notesNoPlace: 0, notesAdded: 0 } as const;

  it("only lists the 'left out' rows when something was left out", () => {
    expect(renderRestorePreview(base, "en")).not.toContain("Left out");
    expect(renderRestorePreview({ ...base, shortlistNoPlace: 1 }, "en")).toContain("Left out");
    expect(renderRestorePreview({ ...base, notesNoPlace: 2 }, "en")).toContain("Left out");
  });

  it("offers Restore only when something would be added", () => {
    expect(renderRestorePreview(base, "en")).not.toContain('data-action="restore-confirm"');
    expect(renderRestorePreview({ ...base, notesAdded: 1 }, "en")).toContain('data-action="restore-confirm"');
  });
});

describe("accessibility and wording", () => {
  it.each(["en", "fr"] as const)("passes axe and the App's own audit (%s)", async (locale) => {
    mount([locale]);
    openPlaces();
    paste(backup({ needs: { elevator: "yes" }, shortlist: [LIBRARY, GONE] }));
    click(act("restore-preview"));
    const run = async (label: string): Promise<void> => {
      const r = await axe.run(document.body, { rules: { "color-contrast": { enabled: false }, "target-size": { enabled: false }, region: { enabled: false } } });
      expect(r.violations.map((v) => `${v.id}: ${v.help}`), `${label} ${locale}`).toEqual([]);
    };
    await run("preview");
    paste(backup({}));
    click(act("restore-confirm"));
    await run("changed");
    click(act("restore-cancel"));
    await run("closed");
    expect(audits.flat().map((v) => `${v.rule}: ${v.detail}`), locale).toEqual([]);
  });

  it("keeps every control at least 44 pixels high", () => {
    mount();
    openPlaces();
    paste(backup({ shortlist: [LIBRARY] }));
    click(act("restore-preview"));
    for (const el of Array.from(root.querySelectorAll<HTMLElement>("#restore-preview button"))) expect(el.style.minHeight).toBe("44px");
  });
});
