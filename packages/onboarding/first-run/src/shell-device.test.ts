// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { COPY, ITEMS, addNote, groupPlaces, loadNotes, hasAnything, inspectAll, memoryStore, mountShell, searchHelp, type KeyValueStore, type ShellHandle, type Violation } from "./index";
import { makeRng, randomNotes } from "./testkit";

const TODAY = new Date(Date.UTC(2026, 10, 15));
let root: HTMLElement;
let shell: ShellHandle | undefined;
let store: KeyValueStore;
let audits: Violation[][];

function mount(locales: string[] = ["en"], opts: { hashRouting?: boolean } = {}): ShellHandle {
  audits = [];
  shell = mountShell(root, { requestedLocales: locales, store, today: TODAY, onAudit: (v) => audits.push(v), ...opts });
  return shell;
}

const act = (action: string, value?: string): string => `[data-action="${action}"]` + (value !== undefined ? `[data-value="${value}"]` : "");
function click(sel: string): void {
  const el = root.querySelector<HTMLElement>(sel);
  expect(el, sel).not.toBeNull();
  el?.click();
}
const heading = (): string => root.querySelector("h2")?.textContent ?? "";
const stateText = (id: string): string => root.querySelector(`#state-${id}`)?.textContent ?? "";
const said = async (): Promise<string> => {
  await Promise.resolve();
  return document.querySelector(".sr-only[aria-live]")?.textContent ?? "";
};
const openDevice = (): void => {
  click(act("view", "help"));
  click(act("open-device"));
};

function fresh(): void {
  shell?.destroy();
  shell = undefined;
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app") as HTMLElement;
  store = memoryStore();
  window.location.hash = "";
}

function seedAll(): void {
  for (const n of randomNotes(makeRng(3), 3)) addNote(store, n);
  const first = groupPlaces(loadNotes(store).notes, "en")[0];
  store.setItem(ITEMS.find((i) => i.id === "shortlist")?.key ?? "", JSON.stringify(first ? [first.id] : []));
  store.setItem(ITEMS.find((i) => i.id === "display")?.key ?? "", JSON.stringify({ scale: "150", spacing: "wide", contrast: "auto", motion: "auto" }));
}

beforeEach(fresh);
afterEach(() => {
  shell?.destroy();
  shell = undefined;
});

describe("what is saved on this device", () => {
  it("opens from the help list with focus on its heading and says nothing leaves the device", () => {
    mount();
    openDevice();
    expect(heading()).toBe(COPY.device.title.en);
    expect(document.activeElement?.tagName).toBe("H2");
    expect(root.textContent).toContain("Nothing is sent anywhere.");
  });

  it("lists every item, says nothing is saved on a fresh start and offers no clear buttons", () => {
    mount();
    openDevice();
    expect(root.querySelectorAll("li.card").length).toBe(ITEMS.length);
    for (const i of ITEMS) expect(stateText(i.id), i.id).toBe(COPY.device.empty.en);
    expect(root.querySelectorAll(act("device-clear")).length).toBe(0);
    expect(root.textContent).toContain(COPY.device.nothingToClear.en);
  });

  it("shows what is saved, with a count where it is a list and a size", () => {
    seedAll();
    mount();
    openDevice();
    expect(stateText("notes")).toMatch(/^Saved\. 3 entries you can read\. [\d.]+ KB\.$/);
    expect(stateText("shortlist")).toMatch(/^Saved\. 1 entry you can read\. /);
    expect(stateText("display")).toMatch(/^Saved\. [\d.]+ KB\.$/);
    expect(stateText("draft")).toBe(COPY.device.empty.en);
  });

  it("reports something it cannot read, and still lets it be cleared", () => {
    store.setItem(ITEMS.find((i) => i.id === "notes")?.key ?? "", "{broken");
    mount();
    openDevice();
    expect(stateText("notes")).toContain("the App cannot read it");
    expect(root.querySelector(act("device-clear", "notes"))).not.toBeNull();
  });

  it("names each clear button with the item, so no two controls share a name", () => {
    seedAll();
    mount();
    openDevice();
    const names = Array.from(root.querySelectorAll(act("device-clear"))).map((b) => b.textContent);
    expect(names).toContain("Clear My notes");
    expect(names).toContain("Clear Shortlist");
    expect(names).toContain(COPY.device.clearAll.en);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("clearing", () => {
  it("asks first, in place, and a No keeps everything", async () => {
    seedAll();
    mount();
    openDevice();
    click(act("device-clear", "notes"));
    expect(root.querySelector("#ask-notes")?.textContent).toBe(COPY.device.confirmQuestion.en);
    expect(inspectAll(store).find((r) => r.id === "notes")?.state).toBe("saved");
    const no = root.querySelector<HTMLElement>(act("device-cancel", "notes"));
    expect(no?.textContent).toBe("No, keep My notes");
    no?.click();
    expect(inspectAll(store).find((r) => r.id === "notes")?.state).toBe("saved");
    expect(root.querySelector(".notice")?.textContent).toBe(COPY.device.kept.en);
    expect(await said()).toBe(COPY.device.kept.en);
    expect(document.activeElement).toBe(root.querySelector(act("device-clear", "notes")));
  });

  it("puts focus on the Yes button when it asks, so a keyboard user can answer at once", () => {
    seedAll();
    mount();
    openDevice();
    click(act("device-clear", "notes"));
    expect(document.activeElement).toBe(root.querySelector(act("device-confirm", "notes")));
  });

  it("clears one item, says so, announces it and leaves the rest", async () => {
    seedAll();
    mount();
    openDevice();
    click(act("device-clear", "notes"));
    click(act("device-confirm", "notes"));
    expect(stateText("notes")).toBe(COPY.device.empty.en);
    expect(stateText("display")).toMatch(/^Saved\./);
    expect(root.querySelector(".notice")?.textContent).toBe("Cleared. My notes.");
    expect(await said()).toBe("Cleared. My notes.");
    expect(document.activeElement?.tagName).toBe("H2");
  });

  it("also empties the shortlist when notes are cleared, as the notes hint says, because the places are gone", () => {
    seedAll();
    mount();
    openDevice();
    expect(stateText("shortlist")).toMatch(/^Saved\./);
    click(act("device-clear", "notes"));
    click(act("device-confirm", "notes"));
    expect(stateText("shortlist")).toBe(COPY.device.empty.en);
    expect(COPY.device.notesHint.en).toContain("also clears the shortlist and plan notes");
  });

  it("really removes the saved copy, and the notes screen shows no notes afterwards", () => {
    seedAll();
    mount();
    openDevice();
    click(act("device-clear", "notes"));
    click(act("device-confirm", "notes"));
    expect(inspectAll(store).find((r) => r.id === "notes")?.state).toBe("empty");
    click(act("view", "notes"));
    expect(root.textContent).toContain(COPY.notes.empty.en);
  });

  it("puts the display back to its defaults at once when display settings are cleared", () => {
    seedAll();
    mount();
    openDevice();
    click(act("device-clear", "display"));
    click(act("device-confirm", "display"));
    click(act("view", "display"));
    expect(root.querySelector('[data-key="scale"][aria-pressed="true"]')?.textContent).toBe("100%");
    expect(root.querySelector('[data-key="spacing"][aria-pressed="true"]')?.textContent).toBe("Normal");
  });

  it("clears everything after one question, and then offers nothing more to clear", async () => {
    seedAll();
    mount();
    openDevice();
    click(act("device-clear", "all"));
    expect(root.querySelector("#ask-all")?.textContent).toBe(COPY.device.clearAllQuestion.en);
    expect(hasAnything(inspectAll(store))).toBe(true);
    click(act("device-confirm", "all"));
    expect(hasAnything(inspectAll(store))).toBe(false);
    expect(root.querySelector(".notice")?.textContent).toBe(COPY.device.clearedAll.en);
    expect(await said()).toBe(COPY.device.clearedAll.en);
    expect(root.querySelectorAll(act("device-clear")).length).toBe(0);
  });

  it("does not clear anything for a value that is not an item", () => {
    seedAll();
    mount();
    openDevice();
    const before = JSON.stringify(inspectAll(store));
    const btn = root.querySelector<HTMLElement>(act("device-clear", "notes")) as HTMLElement;
    btn.setAttribute("data-value", "evil");
    btn.click();
    expect(root.querySelector("#ask-notes")).toBeNull();
    const yes = document.createElement("button");
    yes.setAttribute("data-action", "device-confirm");
    yes.setAttribute("data-value", "../notes");
    root.querySelector("main")?.appendChild(yes);
    yes.click();
    expect(JSON.stringify(inspectAll(store))).toBe(before);
    expect(root.querySelector(".notice")?.textContent).toBe(COPY.device.clearFailed.en);
  });

  it("drops a pending question when the person leaves the page", () => {
    seedAll();
    mount();
    openDevice();
    click(act("device-clear", "notes"));
    click(`main ${act("view", "help")}`);
    click(act("open-device"));
    expect(root.querySelector("#ask-notes")).toBeNull();
  });

  it("explains that clearing language and way of moving keeps this session's choices", () => {
    store.setItem(ITEMS.find((i) => i.id === "prefs")?.key ?? "", JSON.stringify({ locale: "en" }));
    mount();
    openDevice();
    expect(root.textContent).toContain("This screen keeps your choices until you close the App");
    expect(root.textContent).toContain(COPY.device.notesHint.en);
  });
});

describe("reaching and leaving the page", () => {
  it("is reachable by address and writes its address", () => {
    window.location.hash = "#/help/device";
    mount(["en"], { hashRouting: true });
    expect(heading()).toBe(COPY.device.title.en);
    fresh();
    mount(["en"], { hashRouting: true });
    openDevice();
    expect(window.location.hash).toBe("#/help/device");
  });

  it("goes back to the help list with focus on the button that opened it", () => {
    mount();
    openDevice();
    click(`main ${act("view", "help")}`);
    expect(document.activeElement).toBe(root.querySelector(act("open-device")));
  });

  it("is found by help search", () => {
    expect(searchHelp("saved", "en").some((h) => h.kind === "device")).toBe(true);
    expect(searchHelp("enregistré", "fr").some((h) => h.kind === "device")).toBe(true);
    mount();
    click(act("view", "help"));
    const box = root.querySelector<HTMLInputElement>("#help-q") as HTMLInputElement;
    box.value = "device";
    box.dispatchEvent(new Event("input", { bubbles: true }));
    click(act("open-device"));
    expect(heading()).toBe(COPY.device.title.en);
  });
});

describe("French and quality", () => {
  it("works in French with a decimal comma and French typography", () => {
    seedAll();
    mount(["fr"]);
    openDevice();
    expect(heading()).toBe(COPY.device.title.fr);
    expect(stateText("notes")).toMatch(/^Enregistré\. 3 entrées lisibles\. [\d,]+ Ko\.$/);
    expect(root.textContent).toContain(`${COPY.device.total.fr}\u00A0: `);
    expect(root.textContent).not.toContain("KB");
    click(act("device-clear", "notes"));
    expect(root.querySelector("#ask-notes")?.textContent).toContain("\u202F?");
  });

  it("passes the page audit and axe in both languages, with a question open", async () => {
    for (const lang of ["en", "fr"]) {
      fresh();
      seedAll();
      mount([lang]);
      openDevice();
      click(act("device-clear", "shortlist"));
      expect(audits.at(-1) ?? [], lang).toEqual([]);
      const r = await axe.run(root, { rules: { "color-contrast": { enabled: false }, "target-size": { enabled: false }, region: { enabled: false } } });
      expect(r.violations.map((v) => `${lang} ${v.id}`)).toEqual([]);
    }
  });
});
