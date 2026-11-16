// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ONBOARDING_PATHS } from "../../src/paths";
import { ARTICLES, KEY_HELP, PREFS_KEY, memoryStore, mountShell, resultsCount, type KeyValueStore, type ShellHandle, type Violation } from "./index";

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

function type(value: string): void {
  const input = root.querySelector<HTMLInputElement>("#help-q");
  expect(input).not.toBeNull();
  if (!input) return;
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

const heading = (): string => root.querySelector("h2")?.textContent ?? "";
const active = (): Element | null => document.activeElement;
const openHelp = (): void => click(act("view", "help"));

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

describe("help home", () => {
  it("lists every article, every short path and the place-card guide, each as one button", () => {
    mount();
    openHelp();
    expect(root.querySelectorAll("li button").length).toBe(ARTICLES.length + ONBOARDING_PATHS.length + 1);
    for (const a of ARTICLES) expect(root.querySelector(act("open-article", a.id)), a.id).not.toBeNull();
    for (const p of ONBOARDING_PATHS) expect(root.querySelector(act("open-path", p.id)), p.id).not.toBeNull();
    expect(root.querySelector(act("open-card"))).not.toBeNull();
  });

  it("has a labelled search box that is a real input, with a hint and a live result count", () => {
    mount();
    openHelp();
    const input = root.querySelector<HTMLInputElement>("#help-q");
    expect(input?.tagName).toBe("INPUT");
    expect(root.querySelector(`label[for="help-q"]`)?.textContent?.trim()).not.toBe("");
    expect(input?.getAttribute("aria-describedby")).not.toBeNull();
    // The count is a status line while searching; the shell's polite announcer also speaks it.
    type("keyboard");
    expect(root.querySelector("#help-count")?.getAttribute("role")).toBe("status");
  });

  it("filters while typing, keeps focus in the box, and announces the count", () => {
    mount();
    openHelp();
    const input = root.querySelector<HTMLInputElement>("#help-q") as HTMLInputElement;
    input.focus();
    type("voice");
    expect(active()).toBe(input);
    expect(root.querySelector(act("open-article", "voice"))).not.toBeNull();
    expect(root.querySelector(act("open-article", "plan"))).toBeNull();
    const n = root.querySelectorAll("#help-body li button").length;
    expect(root.querySelector("#help-count")?.textContent).toContain(resultsCount(n, "en"));
  });

  it("says plainly when nothing matches, and Clear brings everything back", () => {
    mount();
    openHelp();
    type("zzzzqqqq");
    expect(root.querySelectorAll("#help-body li button").length).toBe(0);
    expect(root.textContent).toContain("No help page matches that search.");
    click(act("help-clear"));
    expect(root.querySelectorAll("li button").length).toBe(ARTICLES.length + ONBOARDING_PATHS.length + 1);
    expect((root.querySelector("#help-q") as HTMLInputElement).value).toBe("");
    expect(active()?.id).toBe("help-q");
  });

  it("searches in French when the language is French", () => {
    mount(["fr"]);
    openHelp();
    type("clavier");
    expect(root.querySelector(act("open-article", "keyboard"))).not.toBeNull();
    type("keyboard");
    expect(root.querySelectorAll("#help-body li button").length).toBe(0);
  });

  it("suggests the article for the saved way of moving, and only then", () => {
    mount();
    openHelp();
    expect(root.textContent).not.toContain("Suggested for the way you chose to move");
    shell?.destroy();
    store.setItem(PREFS_KEY, JSON.stringify({ locale: "en", mode: "keyboard" }));
    mount();
    openHelp();
    expect(root.textContent).toContain("Suggested for the way you chose to move");
    expect(root.querySelector("li button")?.getAttribute("data-value")).toBe("keyboard");
    expect(root.querySelectorAll(act("open-article", "keyboard")).length).toBe(1);
  });

  it("does not suggest an article for a way of moving that has none", () => {
    store.setItem(PREFS_KEY, JSON.stringify({ locale: "en", mode: "pointer" }));
    mount();
    openHelp();
    expect(root.textContent).not.toContain("Suggested for the way you chose to move");
  });
});

describe("articles", () => {
  it("opens an article, moves focus to its heading and returns focus to the same item on Back", () => {
    mount();
    openHelp();
    click(act("open-article", "switch"));
    expect(heading()).toBe(ARTICLES.find((a) => a.id === "switch")?.title.en);
    expect(active()?.tagName).toBe("H2");
    click(act("view", "help"));
    expect(heading()).toBe("Help centre");
    expect(active()).toBe(root.querySelector(act("open-article", "switch")));
  });

  it("shows contents links that move focus to the section heading", () => {
    mount();
    openHelp();
    click(act("open-article", "keyboard"));
    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>("a[data-jump]"));
    expect(links.length).toBe(ARTICLES.find((a) => a.id === "keyboard")?.sections.length);
    for (const link of links) {
      const target = link.getAttribute("data-jump") as string;
      link.click();
      expect(active()?.id, target).toBe(target);
      expect(active()?.tagName).toBe("H3");
    }
  });

  it("shows the key table with a caption and scoped headers", () => {
    mount();
    openHelp();
    click(act("open-article", "keyboard"));
    const table = root.querySelector("table.keys") as HTMLTableElement;
    expect(table.querySelector("caption")?.textContent?.trim()).not.toBe("");
    expect(table.querySelectorAll("th[scope]").length).toBeGreaterThanOrEqual(2);
    expect(table.querySelectorAll("tbody tr").length).toBe(KEY_HELP.length);
  });

  it("has related buttons that open the other article or path", () => {
    mount();
    openHelp();
    click(act("open-article", "voice"));
    const related = root.querySelector<HTMLElement>(`${act("open-path")}, ${act("open-article")}`) as HTMLElement;
    expect(related).not.toBeNull();
    related.click();
    expect(heading()).not.toBe("");
    click(act("view", "help"));
    expect(heading()).toBe("Help centre");
  });

  it("states the source, licence and date of the help text", () => {
    mount();
    openHelp();
    click(act("open-article", "unknown"));
    expect(root.textContent).toContain("CC0-1.0");
    expect(root.textContent).toContain("2026-11-15");
  });

  it("never claims the App runs a scanner or listens, on any article, in either language", () => {
    for (const lang of ["en", "fr"]) {
      mount([lang]);
      openHelp();
      for (const a of ARTICLES) {
        click(act("open-article", a.id));
        expect(audits.at(-1)?.filter((v) => v.rule === "scanner-claim"), `${a.id} ${lang}`).toEqual([]);
        click(act("view", "help"));
      }
      shell?.destroy();
    }
  });
});

describe("hash routes", () => {
  it("opens an article from its address and writes the address when one is opened", () => {
    window.location.hash = "#/help/articles/voice";
    mount(["en"], { hashRouting: true });
    expect(heading()).toBe(ARTICLES.find((a) => a.id === "voice")?.title.en);
    click(act("view", "help"));
    click(act("open-article", "plan"));
    expect(window.location.hash).toBe("#/help/articles/plan");
  });

  it("falls back to the help list for an address that names no article", () => {
    window.location.hash = "#/help/articles/not-a-real-article";
    mount(["en"], { hashRouting: true });
    expect(heading()).not.toBe(ARTICLES[0]?.title.en);
    expect(root.querySelector("main, [role='main'], #main")).not.toBeNull();
  });
});

describe("every help screen is reachable and understandable", () => {
  it("reaches every article, path step and the card guide by clicks alone, and Back always returns", () => {
    mount();
    openHelp();
    for (const a of ARTICLES) {
      click(act("open-article", a.id));
      expect(heading(), a.id).toBe(a.title.en);
      click(act("view", "help"));
      expect(active(), a.id).toBe(root.querySelector(act("open-article", a.id)));
    }
    for (const p of ONBOARDING_PATHS) {
      click(act("open-path", p.id));
      expect(heading(), p.id).toContain(p.steps[0]?.title.en ?? "");
      for (let i = 1; i < p.steps.length; i++) {
        click(act("path-step", String(i)));
        expect(heading(), `${p.id} ${i}`).toContain(p.steps[i]?.title.en ?? "");
      }
      click(act("view", "help"));
      expect(heading()).toBe("Help centre");
    }
    click(act("open-card"));
    expect(root.textContent).not.toBe("");
    click(act("view", "help"));
    expect(heading()).toBe("Help centre");
  });

  it("passes the DOM audit on the help list, search results and every article in both languages", () => {
    for (const lang of ["en", "fr"]) {
      mount([lang]);
      openHelp();
      type("clavier");
      type("keyboard");
      type("");
      for (const a of ARTICLES) {
        click(act("open-article", a.id));
        click(act("view", "help"));
      }
      expect(audits.flat(), lang).toEqual([]);
      shell?.destroy();
    }
  });

  // One test for each language, so each stays well inside the time limit on a busy machine.
  it.each(["en", "fr"])("passes axe on the help list and each article (%s)", async (lang) => {
    mount([lang]);
    openHelp();
    const run = async (label: string): Promise<void> => {
      const r = await axe.run(root, { rules: { "color-contrast": { enabled: false }, "target-size": { enabled: false }, region: { enabled: false } } });
      expect(r.violations.map((v) => `${label}: ${v.id}`), `${lang} ${label}`).toEqual([]);
    };
    await run("list");
    for (const a of ARTICLES) {
      click(act("open-article", a.id));
      await run(a.id);
      click(act("view", "help"));
    }
    shell?.destroy();
  });

  it("keeps touch targets at least 44px high on the help screens", () => {
    mount();
    openHelp();
    click(act("open-article", "keyboard"));
    for (const link of Array.from(root.querySelectorAll<HTMLElement>("a[data-jump]"))) {
      expect(link.getAttribute("style") ?? "").toMatch(/min-height:\s*44px/);
    }
  });
});

describe("duplicate names are guarded where they matter", () => {
  it("marks the help list, every article, every path step and the card guide as names-unique", () => {
    mount();
    openHelp();
    expect(root.querySelector("[data-names-unique]")).not.toBeNull();
    for (const a of ARTICLES) {
      click(act("open-article", a.id));
      expect(root.querySelector("[data-names-unique]"), a.id).not.toBeNull();
      click(act("view", "help"));
    }
    click(act("open-path", "move-with-keyboard"));
    expect(root.querySelector("[data-names-unique]")).not.toBeNull();
    click(act("view", "help"));
    click(act("open-card"));
    expect(root.querySelector("[data-names-unique]")).not.toBeNull();
  });
});
