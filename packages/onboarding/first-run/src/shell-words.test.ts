// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { COPY, GLOSSARY, decodeTextHref, memoryStore, mountShell, searchHelp, sortedGlossary, type KeyValueStore, type ShellHandle, type Violation } from "./index";

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
const terms = (): string[] => Array.from(root.querySelectorAll("dt")).map((d) => d.textContent ?? "");
const openWords = (): void => {
  click(act("view", "help"));
  click(act("open-words"));
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

describe("what words mean", () => {
  it("opens from the help list with focus on its heading", () => {
    mount();
    openWords();
    expect(heading()).toBe(COPY.words.title.en);
    expect(document.activeElement?.tagName).toBe("H2");
  });

  it("lists every word once, in alphabetical order, each with its meaning", () => {
    mount();
    openWords();
    expect(terms()).toEqual(sortedGlossary("en").map((w) => w.term.en));
    expect(root.querySelectorAll("dd").length).toBe(GLOSSARY.length);
    expect(root.textContent).toContain(`${GLOSSARY.length} words`);
    for (const w of GLOSSARY) expect(root.textContent).toContain(w.meaning.en);
  });

  it("has a jump link to every word, and a jump moves focus to that word", () => {
    mount();
    openWords();
    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>("ul a[data-jump]"));
    expect(links.length).toBe(GLOSSARY.length);
    const link = links.find((a) => a.textContent === "Voice control") as HTMLAnchorElement;
    link.click();
    expect(document.activeElement?.id).toBe("word-voice-control");
    expect(document.activeElement?.tagName).toBe("DT");
  });

  it("lands on the word named in the address", () => {
    window.location.hash = "#/help/words/scanning";
    mount(["en"], { hashRouting: true });
    expect(document.activeElement?.id).toBe("word-scanning");
    expect(root.querySelector(".notice")).toBeNull();
  });

  it("treats an unknown word in the address as not a route, so the page falls back and does not crash", () => {
    window.location.hash = "#/help/words/nope";
    mount(["en"], { hashRouting: true });
    expect(heading()).not.toBe(COPY.words.title.en);
  });

  it("writes its address as you go", () => {
    mount(["en"], { hashRouting: true });
    openWords();
    expect(window.location.hash).toBe("#/help/words");
  });

  it("saves the words as a plain text file in the page's language", () => {
    mount();
    openWords();
    const link = root.querySelector<HTMLAnchorElement>("a[download]");
    expect(link?.getAttribute("download")).toBe("words-en.txt");
    const text = decodeTextHref(link?.getAttribute("href") ?? "") ?? "";
    for (const w of GLOSSARY) expect(text).toContain(w.term.en);
  });

  it("goes back to the help list with focus on the button that opened it", () => {
    mount();
    openWords();
    click(`main ${act("view", "help")}`);
    expect(document.activeElement).toBe(root.querySelector(act("open-words")));
  });

  it("works in French, in French order, with no English left over", () => {
    mount(["fr"]);
    openWords();
    expect(heading()).toBe(COPY.words.title.fr);
    expect(terms()).toEqual(sortedGlossary("fr").map((w) => w.term.fr));
    expect(root.textContent).toContain("L’App n’écoute pas.");
    expect(root.textContent).not.toContain("Jump to a word");
    expect(root.querySelector("a[download]")?.getAttribute("download")).toBe("words-fr.txt");
  });
});

describe("words in search", () => {
  it("finds a word by its term, by another word for it, and by its meaning", () => {
    const hit = (q: string, id: string): boolean => searchHelp(q, "en").some((h) => h.kind === "word" && h.id === id);
    expect(hit("scanning", "scanning")).toBe(true);
    expect(hit("braille", "screen-reader")).toBe(true);
    expect(hit("outline", "focus-ring")).toBe(true);
    expect(searchHelp("balayage", "fr").some((h) => h.kind === "word" && h.id === "scanning")).toBe(true);
    expect(searchHelp("dictée", "fr").some((h) => h.kind === "word" && h.id === "voice-control")).toBe(true);
  });

  it("ranks a word's own page above a word that only mentions it", () => {
    const hits = searchHelp("scanning", "en");
    const i = hits.findIndex((h) => h.kind === "word" && h.id === "scanning");
    const j = hits.findIndex((h) => h.kind === "word" && h.id === "switch");
    expect(i).toBeGreaterThanOrEqual(0);
    if (j >= 0) expect(i).toBeLessThan(j);
  });

  it("opens the word from a search result and puts focus on it", () => {
    mount();
    click(act("view", "help"));
    const box = root.querySelector<HTMLInputElement>("#help-q") as HTMLInputElement;
    box.value = "braille";
    box.dispatchEvent(new Event("input", { bubbles: true }));
    click(act("open-words", "screen-reader"));
    expect(heading()).toBe(COPY.words.title.en);
    expect(document.activeElement?.id).toBe("word-screen-reader");
  });
});

describe("words page quality", () => {
  it("passes the page audit and axe in both languages", async () => {
    for (const lang of ["en", "fr"]) {
      fresh();
      mount([lang]);
      openWords();
      expect(audits.at(-1) ?? [], lang).toEqual([]);
      const r = await axe.run(root, { rules: { "color-contrast": { enabled: false }, "target-size": { enabled: false }, region: { enabled: false } } });
      expect(r.violations.map((v) => `${lang} ${v.id}`)).toEqual([]);
    }
  });
});
