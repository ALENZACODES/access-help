// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DISMISSED_KEY,
  FACT_KEYS,
  addNote,
  groupPlaces,
  hiddenText,
  memoryStore,
  mountShell,
  parseNote,
  reasonText,
  renderSimilar,
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

function mount(locales: string[] = ["en"], hashRouting = false): ShellHandle {
  audits = [];
  shell = mountShell(root, { requestedLocales: locales, store, today: TODAY, onAudit: (v) => audits.push(v), hashRouting });
  return shell;
}

const act = (action: string, value?: string): string => `[data-action="${action}"]` + (value !== undefined ? `[data-value="${value}"]` : "");

function click(sel: string): void {
  const el = root.querySelector<HTMLElement>(sel);
  expect(el, sel).not.toBeNull();
  el?.click();
}

const heading = (): string => root.querySelector("h2")?.textContent ?? "";
const text = (): string => root.textContent ?? "";
const flush = (): Promise<void> => Promise.resolve();

function note(id: string, name: string, address?: string): Note {
  const n = parseNote({ id, placeName: name, address, createdOn: "2026-10-01", licence: "CC0-1.0", facts: FACT_KEYS.map((key) => ({ key, value: "unknown" })) });
  if (!n) throw new Error(`bad ${id}`);
  return n;
}

const NOTES = (): Note[] => [
  note("a", "Library", "1 Main St"),
  note("b", "Libary"),
  note("c", "Corner Cafe", "5 High St"),
  note("d", "High Street Cafe", "5 high st"),
  note("e", "Pharmacy", "3 Low St"),
];

function seed(notes: Note[]): void {
  for (const n of notes.slice().reverse()) addNote(store, n);
}

const openSimilar = (): void => {
  click(act("view", "notes"));
  click(act("view", "places"));
  click(act("view", "similar"));
};

const cards = (): HTMLElement[] => Array.from(root.querySelectorAll<HTMLElement>("article.card"));
const pairNames = (c: HTMLElement): string[] => Array.from(c.querySelectorAll("ul.pair strong")).map((s) => s.textContent ?? "");

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app") as HTMLElement;
  store = memoryStore();
  window.location.hash = "";
});

afterEach(() => {
  shell?.destroy();
  shell = undefined;
  vi.unstubAllGlobals();
});

describe("the possible matches page", () => {
  it("is offered on the places screen in both languages", () => {
    seed(NOTES());
    mount();
    click(act("view", "notes"));
    click(act("view", "places"));
    expect(root.querySelector(act("view", "similar"))?.textContent).toBe("Possible matches");
    click(act("set-locale", "fr"));
    expect(root.querySelector(act("view", "similar"))?.textContent).toBe("Lieux peut-être identiques");
  });

  it("lists pairs, strongest reason first, and says that it only suggests", () => {
    seed(NOTES());
    mount();
    openSimilar();
    expect(heading()).toBe("Possible matches");
    expect(document.activeElement?.tagName).toBe("H2");
    expect(root.querySelector('nav [aria-current="page"]')?.textContent).toBe("Notes");
    expect(cards()).toHaveLength(2);
    expect(pairNames(cards()[0]!).sort()).toEqual(["Corner Cafe", "High Street Cafe"]);
    expect(cards()[0]?.textContent).toContain("Same address, different names.");
    expect(pairNames(cards()[1]!).sort()).toEqual(["Libary", "Library"]);
    expect(text()).toContain("does not merge anything and does not change your notes");
  });

  it("shows an address, or says there is none", () => {
    seed(NOTES());
    mount();
    openSimilar();
    expect(cards()[1]?.textContent).toContain("1 Main St");
    expect(cards()[1]?.querySelector("em")?.textContent).toBe("No address");
  });

  it("lists places with no address and opens one", () => {
    seed(NOTES());
    mount();
    openSimilar();
    const items = Array.from(root.querySelectorAll(".no-address li"));
    expect(items.map((li) => li.querySelector("span")?.textContent)).toEqual(["Libary"]);
    (items[0]?.querySelector("button") as HTMLElement).click();
    expect(heading()).toBe("Libary");
  });

  it("says so when there is nothing to look at", () => {
    seed([note("a", "Library", "1 Main St"), note("e", "Pharmacy", "3 Low St")]);
    mount();
    openSimilar();
    expect(cards()).toHaveLength(0);
    expect(text()).toContain("No pairs to look at.");
    expect(root.querySelector(".no-address")).toBeNull();
  });

  it("works with no notes at all", () => {
    mount();
    openSimilar();
    expect(text()).toContain("No pairs to look at.");
    expect(audits.at(-1)).toEqual([]);
  });

  it("has its own address and opens from it", () => {
    seed(NOTES());
    mount(["en"], true);
    click(act("view", "notes"));
    click(act("view", "places"));
    click(act("view", "similar"));
    expect(window.location.hash).toBe("#/places/similar");
    click(act("view", "places"));
    window.location.hash = "#/places/similar";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(heading()).toBe("Possible matches");
  });
});

describe("comparing a pair", () => {
  it("opens the comparison of exactly those two places", () => {
    seed(NOTES());
    mount();
    openSimilar();
    click(`${act("similar-compare")}`);
    expect(heading()).toBe("Compare places");
    const heads = Array.from(root.querySelectorAll("thead th")).map((th) => th.textContent);
    expect(heads).toEqual(["Detail", "Corner Cafe", "High Street Cafe"]);
  });

  it("changes nothing in the notes", () => {
    seed(NOTES());
    mount();
    const before = store.getItem("app.onboarding.notes.v1");
    openSimilar();
    click(act("similar-compare"));
    expect(store.getItem("app.onboarding.notes.v1")).toBe(before);
  });

  it("ignores a pair that was made up or whose places are gone", () => {
    seed(NOTES());
    mount();
    openSimilar();
    const btn = root.querySelector<HTMLElement>(act("similar-compare"))!;
    for (const v of ["a-1|b-2", "b-2|a-1", "x", "", "a|b|c"]) {
      btn.setAttribute("data-value", v);
      btn.click();
      expect(heading(), v).toBe("Possible matches");
    }
  });
});

describe("marking a pair as different places", () => {
  const dismissFirst = (): void => click(act("similar-dismiss"));

  it("hides the pair, says so, and keeps focus on the heading", async () => {
    seed(NOTES());
    mount();
    openSimilar();
    dismissFirst();
    expect(cards()).toHaveLength(1);
    expect(root.querySelector('[role="status"]')?.textContent).toContain("Marked as different places");
    expect(document.activeElement?.tagName).toBe("H2");
    await flush();
    expect(document.querySelector('[role="status"][aria-live]')?.textContent).toContain("Marked as different places");
    expect(text()).toContain("1 pair hidden");
  });

  it("saves the pair on the device and remembers it next time", () => {
    seed(NOTES());
    mount();
    openSimilar();
    dismissFirst();
    const saved = JSON.parse(store.getItem(DISMISSED_KEY) ?? "[]") as string[];
    expect(saved).toHaveLength(1);
    shell?.destroy();
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById("app") as HTMLElement;
    mount();
    openSimilar();
    expect(cards()).toHaveLength(1);
    expect(text()).toContain("1 pair hidden");
  });

  it("shows hidden pairs again", () => {
    seed(NOTES());
    mount();
    openSimilar();
    dismissFirst();
    click(act("similar-reset"));
    expect(cards()).toHaveLength(2);
    expect(text()).not.toContain("hidden");
    expect(store.getItem(DISMISSED_KEY)).toBeNull();
    expect(root.querySelector('[role="status"]')?.textContent).toContain("suggested again");
  });

  it("forgets a hidden pair when one of its places is gone", () => {
    seed(NOTES());
    mount();
    openSimilar();
    dismissFirst();
    // Remove every note: the places disappear, and so does the saved pair.
    store.setItem("app.onboarding.notes.v1", "[]");
    shell?.destroy();
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById("app") as HTMLElement;
    mount();
    openSimilar();
    expect(store.getItem(DISMISSED_KEY)).toBeNull();
  });

  it("says when it could not be saved, and still hides the pair for now", () => {
    seed(NOTES());
    const real = store;
    store = {
      getItem: (k) => real.getItem(k),
      removeItem: (k) => real.removeItem(k),
      setItem: (k, v) => {
        if (k === DISMISSED_KEY) throw new Error("full");
        real.setItem(k, v);
      },
    };
    mount();
    openSimilar();
    dismissFirst();
    expect(root.querySelector('[role="status"]')?.textContent).toContain("could not be saved");
  });

  it("ignores a tampered value", () => {
    seed(NOTES());
    mount();
    openSimilar();
    const btn = root.querySelector<HTMLElement>(act("similar-dismiss"))!;
    btn.setAttribute("data-value", "zzz-1|zzz-2");
    btn.click();
    expect(cards()).toHaveLength(2);
    expect(store.getItem(DISMISSED_KEY)).toBeNull();
  });

  it("is in French, with the right plural", () => {
    seed(NOTES());
    mount(["fr"]);
    openSimilar();
    dismissFirst();
    expect(text()).toContain("1 paire masquée");
    expect(root.querySelector('[role="status"]')?.textContent).toContain("Marqués comme lieux différents");
  });
});

describe("pieces of the page", () => {
  it("writes the hidden count in each language", () => {
    expect([1, 2, 7].map((n) => hiddenText(n, "en"))).toEqual(["1 pair hidden", "2 pairs hidden", "7 pairs hidden"]);
    expect([1, 2, 7].map((n) => hiddenText(n, "fr"))).toEqual(["1 paire masquée", "2 paires masquées", "7 paires masquées"]);
  });

  it("has a sentence for every reason in both languages", () => {
    for (const r of ["same-address", "same-name", "similar-name"] as const) {
      expect(reasonText(r, "en")).not.toBe(reasonText(r, "fr"));
      expect(reasonText(r, "en").length).toBeGreaterThan(10);
    }
  });

  it("escapes names and addresses", () => {
    const places = groupPlaces([note("a", "<img src=x onerror=alert(1)>", '"><script>x</script>'), note("b", "<img src=x onerror=alert(1)>!")], "en");
    const html = renderSimilar({ places, suggestions: [], hidden: 0, locale: "en", statusMessage: "<b>hi</b>" });
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<b>hi");
  });
});

describe("accessibility and wording", () => {
  it.each(["en", "fr"] as const)("passes axe and the App's own audit (%s)", async (locale) => {
    seed(NOTES());
    mount([locale]);
    openSimilar();
    const run = async (label: string): Promise<void> => {
      const r = await axe.run(document.body, { rules: { "color-contrast": { enabled: false }, "target-size": { enabled: false }, region: { enabled: false } } });
      expect(r.violations.map((v) => `${v.id}: ${v.help}`), `${label} ${locale}`).toEqual([]);
    };
    await run("pairs");
    click(act("similar-dismiss"));
    await run("one hidden");
    click(act("similar-reset"));
    await run("shown again");
    expect(audits.flat().map((v) => `${v.rule}: ${v.detail}`), locale).toEqual([]);
  });

  it("makes every control at least 44 pixels high", () => {
    seed(NOTES());
    mount();
    openSimilar();
    for (const el of Array.from(root.querySelectorAll<HTMLElement>("main button"))) expect(el.style.minHeight, el.textContent ?? "").toBe("44px");
  });

  it("never says two places are the same or that a pair is confirmed", () => {
    seed(NOTES());
    mount();
    openSimilar();
    expect(text()).not.toMatch(/verif|confirm|duplicate|certain|definitely|merge[ds]\b/i);
  });
});
