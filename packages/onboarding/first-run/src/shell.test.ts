// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ONBOARDING_PATHS } from "../../src/paths";
import {
  ARTICLES,
  PREFS_KEY,
  memoryStore,
  mountShell,
  type KeyValueStore,
  type ShellHandle,
} from "./index";

const TODAY = new Date(Date.UTC(2026, 10, 15));
let root: HTMLElement;
let shell: ShellHandle | undefined;
let store: KeyValueStore;

function mount(locales: string[] = ["en"], s: KeyValueStore | undefined = store): ShellHandle {
  shell = mountShell(root, { requestedLocales: locales, store: s, today: TODAY });
  return shell;
}

function click(sel: string): void {
  const el = root.querySelector<HTMLElement>(sel);
  expect(el, sel).not.toBeNull();
  el?.click();
}

const act = (action: string, value?: string): string =>
  `[data-action="${action}"]` + (value !== undefined ? `[data-value="${value}"]` : "");

const heading = (): string => root.querySelector("h2")?.textContent ?? "";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app") as HTMLElement;
  store = memoryStore();
});

afterEach(() => {
  shell?.destroy();
  shell = undefined;
});

describe("setup view", () => {
  it("starts on the movement question in the negotiated language", () => {
    mount(["fr-CA"]);
    expect(document.documentElement.lang).toBe("fr");
    expect(heading()).toBe("Comment vous déplacez-vous dans l’App\u202F?");
    expect(document.title).toContain("L’App");
  });

  it("leaves everything unknown until the user chooses", () => {
    mount();
    expect(root.querySelectorAll('[aria-pressed="true"]').length).toBe(0);
    expect(store.getItem(PREFS_KEY)).toBeNull();
  });

  it("saves a choice, keeps keyboard focus on the chosen button, and shows the highlight interval step for single-switch", () => {
    mount();
    click(act("choose-mode", "switch"));
    const pressed = root.querySelector(act("choose-mode", "switch"));
    expect(pressed?.getAttribute("aria-pressed")).toBe("true");
    expect(document.activeElement).toBe(pressed);
    expect(JSON.parse(store.getItem(PREFS_KEY) ?? "{}")).toEqual({ locale: "en", mode: "switch" });
    click(act("next"));
    expect(heading()).toBe("Preferred highlight interval");
    click(act("set-scan", "3000"));
    expect(JSON.parse(store.getItem(PREFS_KEY) ?? "{}").scanMs).toBe(3000);
  });

  it("skipping leaves choices unknown on the summary", () => {
    mount();
    click(act("skip"));
    expect(heading()).toBe("Setup finished");
    expect(root.textContent).toContain("Movement: unknown");
    expect(document.activeElement?.tagName).toBe("H2");
  });

  it("finishing saves, moves to Help and announces where choices are kept", async () => {
    let done = 0;
    shell = mountShell(root, { requestedLocales: ["en"], store, today: TODAY, onDone: () => done++ });
    click(act("choose-mode", "keyboard"));
    click(act("next"));
    click(act("done"));
    expect(shell.getView().kind).toBe("help");
    expect(done).toBe(1);
    await Promise.resolve();
    const status = document.querySelector('[role="status"]');
    expect(status?.textContent).toBe("Your choices are saved on this device only.");
  });

  it("says so when choices cannot be saved", async () => {
    const broken: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error("full");
      },
      removeItem: () => undefined,
    };
    mount(["en"], broken);
    click(act("skip"));
    click(act("done"));
    await Promise.resolve();
    expect(document.querySelector('[role="status"]')?.textContent).toContain("could not be saved");
  });

  it("restores saved preferences on the next visit", () => {
    store.setItem(PREFS_KEY, JSON.stringify({ locale: "fr", mode: "switch", scanMs: 2000 }));
    mount(["en"]);
    expect(document.documentElement.lang).toBe("fr");
    expect(root.querySelector(act("choose-mode", "switch"))?.getAttribute("aria-pressed")).toBe("true");
  });
});

describe("language and navigation", () => {
  it("switches language, keeps focus on the toggle, announces, and persists", async () => {
    mount();
    click(act("set-locale", "fr"));
    expect(document.documentElement.lang).toBe("fr");
    expect(heading()).toContain("Comment vous");
    expect(document.activeElement?.getAttribute("data-action")).toBe("set-locale");
    await Promise.resolve();
    expect(document.querySelector('[role="status"]')?.textContent).toBe("La langue est maintenant le français.");
    expect(JSON.parse(store.getItem(PREFS_KEY) ?? "{}").locale).toBe("fr");
    const toggle = root.querySelector<HTMLElement>(act("set-locale"));
    expect(toggle?.getAttribute("lang")).toBe("en");
    expect(toggle?.textContent).toBe("English");
  });

  it("marks the current section and moves focus to the heading on view change", () => {
    mount();
    click(act("view", "help"));
    expect(root.querySelector(act("view", "help"))?.getAttribute("aria-current")).toBe("page");
    expect(root.querySelector(act("view", "setup"))?.hasAttribute("aria-current")).toBe(false);
    expect(document.activeElement?.tagName).toBe("H2");
    expect(heading()).toBe("Help centre");
  });

  it("provides a working skip link target", () => {
    mount();
    const link = root.querySelector<HTMLAnchorElement>("a.skip-link");
    expect(link?.getAttribute("href")).toBe("#main");
    expect(root.querySelector("#main")).not.toBeNull();
  });
});

describe("help centre", () => {
  it("lists the onboarding paths plus the place-card guide", () => {
    mount();
    click(act("view", "help"));
    // Every article, every short path and the place-card guide, each opened by one button.
    expect(root.querySelectorAll("li button").length).toBe(ARTICLES.length + ONBOARDING_PATHS.length + 1);
  });

  it("walks a path step by step with a step counter in both languages", () => {
    mount();
    click(act("view", "help"));
    click(act("open-path", "find-a-place"));
    expect(root.textContent).toContain("Step 1 of 3");
    click(act("path-step", "1"));
    expect(heading()).toBe("Read the details");
    click(act("path-step", "2"));
    expect(heading()).toBe("Unknown means unknown");
    expect(root.querySelector(act("path-step", "3"))).toBeNull();
    click(act("set-locale", "fr"));
    expect(root.textContent).toContain("Étape 3 sur 3");
    click(act("view", "help"));
    expect(heading()).toBe("Centre d’aide");
  });

  it("falls back to the guide list for an unknown path id", () => {
    mount();
    click(act("view", "help"));
    const btn = document.createElement("button");
    btn.dataset["action"] = "open-path";
    btn.dataset["value"] = "does-not-exist";
    root.appendChild(btn);
    btn.click();
    expect(heading()).toBe("Help centre");
  });

  it("explains unknown on the example card without claiming anything real", () => {
    mount();
    click(act("view", "help"));
    click(act("open-card"));
    expect(root.querySelector(".notice")?.textContent).toBe("Example only. This is not a real place.");
    const text = root.textContent ?? "";
    expect(text).toContain("Step-free entrance");
    expect(text).toContain("Unknown");
    expect(text).toContain("Source: Illustrative example written for the App.");
    expect(text).toContain("Licence: CC0-1.0.");
    expect(text).not.toMatch(/verified|real-?time/i);
    expect(root.querySelectorAll("dt").length).toBe(4);
  });
});

describe("offline status", () => {
  it("updates the footer text in the current language", () => {
    const h = mount();
    expect(root.querySelector("footer")?.textContent).toBe("Preparing offline use.");
    h.setOfflineStatus("registered");
    expect(root.querySelector("footer")?.textContent).toContain("set up on this device");
    h.setOfflineStatus("unsupported");
    expect(root.querySelector("footer")?.textContent).toBe("Offline use is not available in this browser.");
  });
});

describe("keyboard", () => {
  it("moves between options with arrows and never traps Tab", () => {
    mount();
    const buttons = Array.from(root.querySelectorAll<HTMLElement>('[role="group"] button'));
    buttons[0]?.focus();
    const key = (k: string): boolean =>
      (document.activeElement as HTMLElement).dispatchEvent(
        new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }),
      );
    key("ArrowDown");
    expect(document.activeElement).toBe(buttons[1]);
    key("End");
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
    expect(key("Tab")).toBe(true);
  });

  it("has only native, tabbable controls", () => {
    mount();
    for (const c of Array.from(root.querySelectorAll("button, a"))) {
      expect((c as HTMLElement).tabIndex).toBe(0);
    }
    expect(root.innerHTML).not.toMatch(/tabindex="[1-9]/);
  });
});

describe("accessibility (axe-core in jsdom)", () => {
  const run = async (): Promise<string[]> => {
    const results = await axe.run(document.body, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
      // jsdom has no layout, so these cannot run here.
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });
    return results.violations.map((v) => `${v.id}: ${v.help}`);
  };

  it("finds no violations in any view in either language", async () => {
    for (const loc of ["en", "fr"]) {
      store = memoryStore();
      root.innerHTML = "";
      shell?.destroy();
      document.body.innerHTML = '<div id="app"></div>';
      root = document.getElementById("app") as HTMLElement;
      mount([loc]);
      document.title = "x";
      expect(await run(), `setup ${loc}`).toEqual([]);
      click(act("choose-mode", "switch"));
      click(act("next"));
      expect(await run(), `scan ${loc}`).toEqual([]);
      click(act("next"));
      expect(await run(), `finish ${loc}`).toEqual([]);
      click(act("view", "help"));
      expect(await run(), `help ${loc}`).toEqual([]);
      click(act("open-path", "get-help"));
      expect(await run(), `path ${loc}`).toEqual([]);
      click(act("view", "help"));
      click(act("open-card"));
      expect(await run(), `card ${loc}`).toEqual([]);
    }
  });

  it("every control is a native button with the 44px minimum", () => {
    mount();
    for (const b of Array.from(root.querySelectorAll("button"))) {
      expect(b.getAttribute("style") ?? "").toContain("min-height:44px");
      expect(b.getAttribute("style") ?? "").toContain("min-width:44px");
    }
  });
});
