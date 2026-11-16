// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  NEEDS_KEY,
  addNote,
  emptyForm,
  loadNeeds,
  memoryStore,
  mountShell,
  toNote,
  type FactKey,
  type KeyValueStore,
  type Note,
  type ShellHandle,
  type Tri,
  type Violation,
} from "./index";

const TODAY = new Date(Date.UTC(2026, 10, 15));
let root: HTMLElement;
let shell: ShellHandle | undefined;
let store: KeyValueStore;
let audits: Violation[][];

function mount(locales: string[] = ["en"], extra: { hashRouting?: boolean } = {}): ShellHandle {
  audits = [];
  shell = mountShell(root, { requestedLocales: locales, store, today: TODAY, onAudit: (v) => audits.push(v), ...extra });
  return shell;
}

const act = (action: string, value?: string, key?: string): string =>
  `[data-action="${action}"]` + (key !== undefined ? `[data-key="${key}"]` : "") + (value !== undefined ? `[data-value="${value}"]` : "");

function click(sel: string): void {
  const el = root.querySelector<HTMLElement>(sel);
  expect(el, sel).not.toBeNull();
  el?.click();
}

const heading = (): string => root.querySelector("h2")?.textContent ?? "";
const text = (): string => root.textContent ?? "";

function mk(id: string, name: string, details: Partial<Record<FactKey, Tri>>, on = "2026-11-01"): Note {
  const f = emptyForm(TODAY);
  return toNote(
    { ...f, placeName: name, observedOn: on, licence: "CC0-1.0", details: { ...f.details, "automatic-door": "yes", ...details } },
    new Date(`${on}T00:00:00Z`),
    () => id,
  );
}

function seed(notes: Note[]): void {
  for (const n of notes.slice().reverse()) addNote(store, n);
}

const NOTES = (): Note[] => [
  mk("a", "Archive", { "step-free-entry": "yes" }),
  mk("b", "Cinema", { "step-free-entry": "yes" }),
  mk("c", "Cinema", { "step-free-entry": "no" }, "2026-11-05"),
  mk("d", "Bakery", {}),
];

function openPlaces(): void {
  click(act("view", "notes"));
  click(act("view", "places"));
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

describe("places view", () => {
  it("combines notes about one place and says when reports differ", () => {
    seed(NOTES());
    mount();
    openPlaces();
    expect(heading()).toBe("Places");
    expect(root.querySelectorAll("article.card").length).toBe(3);
    expect(text()).toContain("Reports differ");
    expect(text()).toContain("2 reports disagree.");
  });

  it("keeps unknown places out of matches and excluded when filtering", () => {
    seed(NOTES());
    mount();
    openPlaces();
    click(act("filter", "yes", "step-free-entry"));
    const groups = Array.from(root.querySelectorAll("#results h3")).map((h) => h.textContent ?? "");
    expect(groups.length).toBe(3);
    const cardsIn = (i: number): string[] => {
      const out: string[] = [];
      let el = root.querySelectorAll("#results h3")[i]?.nextElementSibling ?? null;
      while (el && el.tagName !== "H3") {
        if (el.matches("article")) out.push(el.querySelector("h4")?.textContent ?? "");
        el = el.nextElementSibling;
      }
      return out;
    };
    expect(cardsIn(0)).toEqual(["Archive"]);
    expect(cardsIn(1).sort()).toEqual(["Bakery", "Cinema"]);
    expect(cardsIn(2)).toEqual([]);
  });

  it("opens a place, lists every report, and goes back", () => {
    seed(NOTES());
    mount();
    openPlaces();
    const cinema = Array.from(root.querySelectorAll<HTMLElement>(act("open-place"))).find((b) => b.closest("article")?.textContent?.includes("Cinema"));
    cinema?.click();
    expect(shell?.getView().kind).toBe("place");
    expect(heading()).toBe("Cinema");
    expect(text()).toContain("2026-11-05");
    expect(text()).toContain("CC0-1.0");
    click(act("view", "places"));
    expect(shell?.getView().kind).toBe("places");
  });

  it("shows a not-found message for an address with no place", () => {
    mount(["en"], { hashRouting: true });
    window.location.hash = "#/places/nope";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(root.querySelector('[role="note"]')?.textContent).toContain("not found on this device");
  });
});

describe("visit plan", () => {
  it("asks questions for unknown and differing details and offers copyable text", () => {
    seed(NOTES());
    mount();
    openPlaces();
    click(act("filter", "yes", "step-free-entry"));
    click(act("filter", "yes", "elevator"));
    const bakery = Array.from(root.querySelectorAll<HTMLElement>(act("open-plan"))).find((b) => b.closest("article")?.textContent?.includes("Bakery"));
    bakery?.click();
    expect(heading()).toBe("Visit plan");
    expect(root.querySelectorAll("ol li").length).toBe(2);
    const ta = root.querySelector<HTMLTextAreaElement>("#plan-text");
    expect(ta?.value).toContain("Bakery");
    expect(ta?.value).toContain("Check with the place before you go.");
    click(act("select-text"));
    expect(document.activeElement).toBe(ta);
  });

  it("says what to do when nothing is required", () => {
    seed(NOTES());
    mount();
    openPlaces();
    click(act("open-plan"));
    expect(heading()).toBe("Visit plan");
    expect(root.querySelector("#plan-text")).toBeNull();
    click(act("view", "places"));
    expect(heading()).toBe("Places");
  });
});

describe("saved must-haves", () => {
  it("saves, clears the filter, reapplies and clears them", () => {
    seed(NOTES());
    mount();
    openPlaces();
    expect(root.querySelector(act("save-needs"))).toBeNull();
    click(act("filter", "yes", "step-free-entry"));
    click(act("save-needs"));
    expect(loadNeeds(store)).toEqual({ "step-free-entry": "yes" });
    expect(document.activeElement).toBe(root.querySelector(act("save-needs")));
    click(act("filter", "any", "step-free-entry"));
    click(act("use-needs"));
    expect(root.querySelector<HTMLInputElement>(act("filter", "yes", "step-free-entry"))?.getAttribute("aria-pressed")).toBe("true");
    click(act("clear-needs"));
    expect(store.getItem(NEEDS_KEY)).toBeNull();
  });

  it("plans from saved must-haves when the filter is empty", () => {
    seed(NOTES());
    store.setItem(NEEDS_KEY, JSON.stringify({ "step-free-entry": "yes" }));
    mount();
    openPlaces();
    click(act("open-plan"));
    expect(root.querySelector("#plan-text")).not.toBeNull();
    expect(text()).toContain("saved must-haves");
  });
});

describe("hash routing", () => {
  it("is off unless asked for", () => {
    mount();
    click(act("view", "display"));
    expect(window.location.hash).toBe("");
  });

  it("updates the address as screens change and follows it back", () => {
    mount(["en"], { hashRouting: true });
    click(act("view", "notes"));
    expect(window.location.hash).toBe("#/notes");
    click(act("view", "places"));
    expect(window.location.hash).toBe("#/places");
    window.location.hash = "#/display";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(shell?.getView().kind).toBe("display");
    expect(window.location.hash).toBe("#/display");
  });

  it("opens the screen named in the address at start, and ignores skip links", () => {
    window.location.hash = "#/help/get-help/2";
    mount(["en"], { hashRouting: true });
    expect(shell?.getView()).toMatchObject({ kind: "path", id: "get-help", step: 1 });
    window.location.hash = "#main";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(shell?.getView().kind).toBe("path");
  });
});

describe.each(["en", "fr"] as const)("audits across the new screens (%s)", (locale) => {
  it("has no DOM audit violations and no axe violations", async () => {
    seed(NOTES());
    store.setItem(NEEDS_KEY, JSON.stringify({ "step-free-entry": "yes" }));
    mount([locale]);
    const axeRun = async (label: string): Promise<void> => {
      const r = await axe.run(document.body, { rules: { "color-contrast": { enabled: false }, "target-size": { enabled: false } } });
      expect(r.violations.map((v) => `${v.id}: ${v.help}`), `axe ${label} ${locale}`).toEqual([]);
    };
    click(act("view", "notes")); await axeRun("notes");
    click(act("view", "places")); await axeRun("places");
    click(act("filter", "yes", "step-free-entry")); await axeRun("places filtered");
    click(act("save-needs")); await axeRun("places saved");
    click(act("open-plan")); await axeRun("plan");
    click(act("view", "places"));
    click(act("open-place")); await axeRun("place");
    expect(audits.flat().map((v) => `${v.rule}: ${v.detail}`), locale).toEqual([]);
  });
});
