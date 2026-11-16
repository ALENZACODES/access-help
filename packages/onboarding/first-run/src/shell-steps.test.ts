// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { COPY, STEPS, addNote, memoryStore, mountShell, searchHelp, type KeyValueStore, type ShellHandle, type Violation } from "./index";
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
const stateText = (id: string): string => root.querySelector(`#step-state-${id}`)?.textContent ?? "";
const openSteps = (): void => {
  click(act("view", "help"));
  click(act("open-steps"));
};

function fresh(): void {
  shell?.destroy();
  shell = undefined;
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app") as HTMLElement;
  store = memoryStore();
  window.location.hash = "";
}

beforeEach(fresh);
afterEach(() => {
  shell?.destroy();
  shell = undefined;
});

describe("next steps page", () => {
  it("opens from the help list with focus on its heading and says nothing is required", () => {
    mount();
    openSteps();
    expect(heading()).toBe(COPY.steps.title.en);
    expect(document.activeElement?.tagName).toBe("H2");
    expect(root.textContent).toContain("none of it is required");
  });

  it("shows every step as a button named with its own words, in order", () => {
    mount();
    openSteps();
    const names = Array.from(root.querySelectorAll(act("step-go"))).map((b) => b.textContent);
    expect(names).toEqual(STEPS.map((s) => s.title.en));
    expect(new Set(names).size).toBe(names.length);
  });

  it("says nothing is saved yet for each step on a fresh start and suggests the first one in words", () => {
    mount();
    openSteps();
    for (const s of STEPS) expect(stateText(s.id), s.id).toContain(COPY.steps.notYet.en);
    expect(stateText("moving")).toContain("Suggested next.");
    expect(root.querySelectorAll("strong").length).toBe(1);
    expect(root.querySelector("#steps-summary")?.textContent).toBe("0 of 6 have something saved.");
  });

  it("changes as things get saved, and moves the suggestion on", () => {
    for (const n of randomNotes(makeRng(2), 1)) addNote(store, n);
    mount();
    openSteps();
    expect(stateText("first-note")).toContain(COPY.steps.saved.en);
    expect(root.querySelector("#steps-summary")?.textContent).toContain("1 of 6");
    expect(stateText("moving")).toContain("Suggested next.");
    click(act("view", "display"));
    click(act("view", "display"));
    click(`[data-action="display"][data-key="scale"][data-value="125"]`);
    click(act("view", "help"));
    click(act("open-steps"));
    expect(stateText("display")).toContain(COPY.steps.saved.en);
  });

  it("opens the screen a step names", () => {
    mount();
    openSteps();
    click(act("step-go", "display"));
    expect(heading()).toBe(COPY.display.title.en);
    click(act("view", "help"));
    click(act("open-steps"));
    click(act("step-go", "first-note"));
    expect(root.querySelector("form")).not.toBeNull();
    click(act("view", "help"));
    click(act("open-steps"));
    click(act("step-go", "shortlist"));
    expect(root.textContent).toContain(COPY.places.title.en);
  });

  it("ignores a step value that is not a step", () => {
    mount();
    openSteps();
    const btn = root.querySelector<HTMLElement>(act("step-go", "display")) as HTMLElement;
    btn.setAttribute("data-value", "evil");
    btn.click();
    expect(heading()).toBe(COPY.steps.title.en);
  });

  it("reports unknown, and says so in the summary, when saved text cannot be read", () => {
    store.setItem("app.onboarding.notes.v1", "{broken");
    mount();
    openSteps();
    expect(stateText("first-note")).toContain("Unknown.");
    expect(root.querySelector("#steps-summary")?.textContent).toContain("Some are Unknown.");
  });

  it("goes back to the help list with focus on the button that opened it", () => {
    mount();
    openSteps();
    click(`main ${act("view", "help")}`);
    expect(document.activeElement).toBe(root.querySelector(act("open-steps")));
  });

  it("is reachable by address, writes its address and is found by search", () => {
    window.location.hash = "#/help/next-steps";
    mount(["en"], { hashRouting: true });
    expect(heading()).toBe(COPY.steps.title.en);
    expect(searchHelp("steps", "en").some((h) => h.kind === "steps")).toBe(true);
    expect(searchHelp("étapes", "fr").some((h) => h.kind === "steps")).toBe(true);
  });

  it("works in French with French typography, and passes the audit and axe in both languages", async () => {
    mount(["fr"]);
    openSteps();
    expect(heading()).toBe(COPY.steps.title.fr);
    expect(root.querySelector("#steps-summary")?.textContent).toBe("0 sur 6 ont quelque chose d’enregistré.");
    for (const lang of ["en", "fr"]) {
      fresh();
      mount([lang]);
      openSteps();
      expect(audits.at(-1) ?? [], lang).toEqual([]);
      const r = await axe.run(root, { rules: { "color-contrast": { enabled: false }, "target-size": { enabled: false }, region: { enabled: false } } });
      expect(r.violations.map((v) => `${lang} ${v.id}`)).toEqual([]);
    }
  });
});
