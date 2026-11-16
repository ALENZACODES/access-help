// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { COPY, FIND_QUESTIONS, START_NODE, getQuestion, isLeaf, memoryStore, mountShell, searchHelp, type KeyValueStore, type ShellHandle, type Violation } from "./index";
import { PRACTICE_BUTTONS, buttonName } from "./practice";

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
const openHelp = (): void => click(act("view", "help"));
const openPractice = (): void => {
  openHelp();
  click(act("open-practice"));
};
const logLines = (): string[] => Array.from(root.querySelectorAll("#practice-log li")).map((li) => li.textContent ?? "");
const buttons = (): HTMLElement[] => Array.from(root.querySelectorAll<HTMLElement>(act("practice-press")));
const said = async (): Promise<string> => {
  await Promise.resolve();
  return document.querySelector(".sr-only[aria-live]")?.textContent ?? "";
};
function key(target: Element, k: string, init: KeyboardEventInit = {}): void {
  target.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...init }));
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app") as HTMLElement;
  store = memoryStore();
  window.location.hash = "";
});

afterEach(() => {
  shell?.destroy();
  shell = undefined;
});

describe("keyboard practice page", () => {
  it("opens from the help list and puts focus on its heading", () => {
    mount();
    openPractice();
    expect(heading()).toBe(COPY.practice.title.en);
    expect(document.activeElement?.tagName).toBe("H2");
    expect(root.querySelectorAll("[data-practice]").length).toBe(1);
  });

  it("says plainly that nothing changes, nothing is saved, and the App cannot tell the device", () => {
    mount();
    openPractice();
    expect(root.textContent).toContain(COPY.practice.intro.en);
    expect(root.textContent).toContain(COPY.practice.note.en);
    expect(root.textContent).toContain("Nothing is saved or sent.");
  });

  it("has four named buttons in one labelled group", () => {
    mount();
    openPractice();
    const group = root.querySelector('[role="group"]');
    expect(group?.getAttribute("aria-label")).toBe(COPY.practice.groupLabel.en);
    expect(buttons().length).toBe(PRACTICE_BUTTONS);
    expect(buttons().map((b) => b.textContent)).toEqual(Array.from({ length: PRACTICE_BUTTONS }, (_, i) => buttonName(i + 1, "en")));
    for (const b of buttons()) expect(b.tagName).toBe("BUTTON");
  });

  it("shows an empty log first, as a log region with a name", () => {
    mount();
    openPractice();
    const log = root.querySelector('[role="log"]');
    expect(log?.querySelector("#practice-log")).not.toBeNull();
    expect(log?.getAttribute("aria-labelledby")).toBe("practice-log-title");
    expect(logLines()).toEqual([COPY.practice.empty.en]);
  });

  it("logs a press and keeps focus on the button that was pressed", () => {
    mount();
    openPractice();
    const second = buttons()[1] as HTMLElement;
    second.focus();
    second.click();
    expect(logLines()).toEqual(["Practice button 2 pressed. This is press 1."]);
    expect(root.querySelector("#practice-total")?.textContent).toContain("1");
    expect(document.activeElement).toBe(root.querySelector(act("practice-press", "2")));
    second.click();
    expect(logLines().at(-1)).toBe("Practice button 2 pressed. This is press 2.");
    expect(root.querySelector("#practice-total")?.textContent).toContain("2");
  });

  it("logs Tab and Enter typed on the page, and ignores letters", () => {
    mount();
    openPractice();
    const first = buttons()[0] as HTMLElement;
    first.focus();
    key(first, "Tab");
    key(first, "Tab", { shiftKey: true });
    key(first, "a");
    key(first, "Enter");
    const lines = logLines();
    expect(lines.length).toBe(3);
    expect(lines[0]).toContain("Tab: focus moves to the next control.");
    expect(lines[1]).toContain("Shift+Tab");
    expect(lines[2]).toContain("Enter: presses the button");
  });

  it("does not log keys typed in the help search box, or on other pages", () => {
    mount();
    openHelp();
    const box = root.querySelector<HTMLElement>("input");
    if (box) key(box, "Tab");
    openPractice();
    expect(logLines()).toEqual([COPY.practice.empty.en]);
  });

  it("keeps only the newest lines", () => {
    mount();
    openPractice();
    const b = buttons()[0] as HTMLElement;
    for (let i = 0; i < 9; i++) b.click();
    expect(logLines().length).toBe(6);
    expect(logLines().at(-1)).toBe("Practice button 1 pressed. This is press 9.");
  });

  it("clears the log, says so, and keeps focus on the clear button", async () => {
    mount();
    openPractice();
    (buttons()[0] as HTMLElement).click();
    const clear = root.querySelector<HTMLElement>(act("practice-clear"));
    clear?.focus();
    clear?.click();
    expect(logLines()).toEqual([COPY.practice.empty.en]);
    expect(await said()).toContain(COPY.practice.cleared.en);
    expect(document.activeElement).toBe(clear);
  });

  it("is not saved: nothing is written to storage and a new visit starts clean", () => {
    const writes: string[] = [];
    const inner = memoryStore();
    store = { getItem: (k) => inner.getItem(k), removeItem: (k) => inner.removeItem(k), setItem: (k, v) => { writes.push(k); inner.setItem(k, v); } };
    mount();
    openPractice();
    for (const b of buttons()) b.click();
    expect(writes).toEqual([]);
    shell?.destroy();
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById("app") as HTMLElement;
    mount();
    openPractice();
    expect(logLines()).toEqual([COPY.practice.empty.en]);
  });

  it("goes back to the help list and returns focus to the practice button", () => {
    mount();
    openPractice();
    click(act("view", "help"));
    expect(root.querySelector(act("open-practice"))).not.toBeNull();
    expect(document.activeElement).toBe(root.querySelector(act("open-practice")));
  });

  it("is reachable by address and writes its address", () => {
    window.location.hash = "#/help/practice";
    mount(["en"], { hashRouting: true });
    expect(heading()).toBe(COPY.practice.title.en);
    window.location.hash = "";
    mount(["en"], { hashRouting: true });
    openPractice();
    expect(window.location.hash).toBe("#/help/practice");
  });

  it("is a choice at the end of the keyboard question, and the page it opens is this one", () => {
    mount();
    openHelp();
    click(act("find-open", START_NODE));
    click(act("find-open", "move"));
    click(act("find-open", "keyboard"));
    const choice = Array.from(root.querySelectorAll<HTMLElement>("main ul button")).find((b) => b.getAttribute("data-action") === "open-practice");
    expect(choice?.textContent).toBe("Practice with buttons that do nothing");
    choice?.click();
    expect(heading()).toBe(COPY.practice.title.en);
  });

  it("is found by help search", () => {
    const hits = searchHelp("practice", "en");
    expect(hits.some((h) => h.kind === "practice")).toBe(true);
  });

  it("works in French with the right typography and no English left over", () => {
    mount(["fr"]);
    openPractice();
    expect(heading()).toBe(COPY.practice.title.fr);
    expect(root.textContent).toContain(COPY.practice.intro.fr);
    (buttons()[2] as HTMLElement).click();
    expect(logLines()).toEqual(["Bouton d’essai 3 activé. C’est l’activation numéro 1."]);
    expect(root.querySelector("#practice-total")?.textContent).toMatch(/jusqu’ici\u00A0: 1$/);
    expect(root.textContent).not.toContain("Practice");
    expect(root.querySelector("section")?.getAttribute("lang")).toBe("fr");
  });

  it("passes the page audit and axe in both languages, with a press in the log", async () => {
    for (const lang of ["en", "fr"]) {
      document.body.innerHTML = '<div id="app"></div>';
      root = document.getElementById("app") as HTMLElement;
      store = memoryStore();
      mount([lang]);
      openPractice();
      (buttons()[0] as HTMLElement).click();
      expect(audits.at(-1) ?? [], lang).toEqual([]);
      const r = await axe.run(root, { rules: { "color-contrast": { enabled: false }, "target-size": { enabled: false }, region: { enabled: false } } });
      expect(r.violations.map((v) => `${lang} ${v.id}`)).toEqual([]);
      shell?.destroy();
      shell = undefined;
    }
  });

  it("is a leaf of the question tree that exists exactly once", () => {
    const leaves = FIND_QUESTIONS.flatMap((q) => q.choices.filter((c) => isLeaf(c.to) && c.to.kind === "practice"));
    expect(leaves.length).toBe(1);
    expect(getQuestion("keyboard")?.choices.some((c) => isLeaf(c.to) && c.to.kind === "practice")).toBe(true);
  });
});
