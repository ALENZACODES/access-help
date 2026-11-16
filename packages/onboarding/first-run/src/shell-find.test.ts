// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ONBOARDING_PATHS } from "../../src/paths";
import {
  ARTICLES,
  COPY,
  FIND_QUESTIONS,
  HELP_KEY,
  MAX_RECENT,
  START_NODE,
  articleFilename,
  articleToText,
  decodeTextHref,
  getQuestion,
  isLeaf,
  loadHelpState,
  memoryStore,
  mountShell,
  sectionAnchor,
  type KeyValueStore,
  type ShellHandle,
  type Violation,
} from "./index";

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
const active = (): Element | null => document.activeElement;
const openHelp = (): void => click(act("view", "help"));
const article = (id: string): (typeof ARTICLES)[number] => ARTICLES.find((a) => a.id === id) as (typeof ARTICLES)[number];
const lastAudit = (): Violation[] => audits.at(-1) ?? [];
const said = async (): Promise<string> => {
  await Promise.resolve();
  return document.querySelector(".sr-only[aria-live]")?.textContent ?? "";
};

/** Opens a question by clicking down from the first one, the way a person would. */
function walkTo(id: string): void {
  const trail: string[] = [];
  for (let cur: string | undefined = id; cur && cur !== START_NODE; ) {
    trail.unshift(cur);
    const at: string = cur;
    cur = FIND_QUESTIONS.find((p) => p.choices.some((x) => !isLeaf(x.to) && x.to.node === at))?.id;
  }
  openHelp();
  click(act("find-open", START_NODE));
  for (const step of trail) click(act("find-open", step));
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

describe("find the right help", () => {
  it("opens from the help list, shows the first question and puts focus on it", () => {
    mount();
    openHelp();
    click(act("find-open", START_NODE));
    expect(heading()).toBe(getQuestion(START_NODE)?.prompt.en);
    expect(active()?.tagName).toBe("H2");
    expect(root.querySelectorAll("main ul button").length).toBe(getQuestion(START_NODE)?.choices.length);
  });

  it("shows which question this is and that going back is allowed", () => {
    mount();
    openHelp();
    click(act("find-open", START_NODE));
    expect(root.textContent).toContain("Question 1.");
    expect(root.textContent).toContain("You can go back at any time.");
    click(act("find-open", "move"));
    expect(root.textContent).toContain("Question 2.");
  });

  it("goes down to an answer, and back up one question at a time", () => {
    mount();
    openHelp();
    click(act("find-open", START_NODE));
    click(act("find-open", "move"));
    click(act("find-open", "switch"));
    expect(heading()).toBe(getQuestion("switch")?.prompt.en);
    click(act("find-open", "move"));
    expect(heading()).toBe(getQuestion("move")?.prompt.en);
    click(act("find-open", START_NODE));
    expect(heading()).toBe(getQuestion(START_NODE)?.prompt.en);
    click(act("view", "help"));
    expect(heading()).toBe("Help centre");
  });

  it("offers Previous question and Start again on a later question, and only Back to list on the first", () => {
    mount();
    openHelp();
    click(act("find-open", START_NODE));
    expect(root.querySelector(`main ${act("view", "help")}`)?.textContent).toBe("All guides");
    expect(root.textContent).not.toContain("Start again");
    click(act("find-open", "move"));
    expect(Array.from(root.querySelectorAll("button")).map((b) => b.textContent)).toEqual(expect.arrayContaining(["Previous question", "Start again"]));
    expect(root.querySelector(`main ${act("view", "help")}`)).toBeNull();
  });

  it("opens the article or guide a choice names, from any question", () => {
    mount();
    for (const q of FIND_QUESTIONS) {
      for (const c of q.choices) {
        if (!isLeaf(c.to)) continue;
        // Walk to this question through its parents, using only clicks on the page.
        walkTo(q.id);
        const label = c.label.en;
        const btn = Array.from(root.querySelectorAll<HTMLElement>("main ul button")).find((b) => b.textContent === label);
        expect(btn, `${q.id}: ${label}`).toBeDefined();
        btn?.click();
        const expected = c.to.kind === "names" ? COPY.names.title.en : c.to.kind === "practice" ? COPY.practice.title.en : c.to.kind === "article" ? article(c.to.id).title.en : ONBOARDING_PATHS.find((p) => p.id === (c.to as { id: string }).id)?.steps[0]?.title.en;
        expect(heading(), `${q.id}: ${label}`).toContain(expected ?? "(missing)");
      }
    }
  });

  it("falls back to the first question for a question that does not exist", () => {
    mount();
    openHelp();
    const el = document.createElement("button");
    el.dataset["action"] = "find-open";
    el.dataset["value"] = "not-a-question";
    root.appendChild(el);
    el.click();
    expect(heading()).toBe(getQuestion(START_NODE)?.prompt.en);
  });

  it("works in French", () => {
    mount(["fr"]);
    openHelp();
    click(act("find-open", START_NODE));
    expect(heading()).toBe(getQuestion(START_NODE)?.prompt.fr);
    click(act("find-open", "move"));
    click(act("find-open", "keyboard"));
    click(act("open-article", "keyboard"));
    expect(heading()).toBe(article("keyboard").title.fr);
  });

  it("is reachable by address and writes its address as you go", () => {
    window.location.hash = "#/help/find/switch";
    mount(["en"], { hashRouting: true });
    expect(heading()).toBe(getQuestion("switch")?.prompt.en);
    click(act("find-open", "move"));
    expect(window.location.hash).toBe("#/help/find/move");
    click(act("find-open", START_NODE));
    expect(window.location.hash).toBe("#/help/find");
  });

  it("returns focus to the find button when going back to the help list", () => {
    mount();
    openHelp();
    click(act("find-open", START_NODE));
    click(act("view", "help"));
    expect(active()).toBe(root.querySelector(act("find-open")));
  });

  it("passes the DOM audit and axe on every question, in both languages", async () => {
    for (const lang of ["en", "fr"]) {
      mount([lang]);
      for (const q of FIND_QUESTIONS) {
        walkTo(q.id);
        expect(lastAudit(), `${lang} ${q.id}`).toEqual([]);
        const r = await axe.run(root, { rules: { "color-contrast": { enabled: false }, "target-size": { enabled: false }, region: { enabled: false } } });
        expect(r.violations.map((v) => v.id), `${lang} ${q.id}`).toEqual([]);
      }
      shell?.destroy();
    }
  });
});

describe("reading one section at a time", () => {
  const multi = (): (typeof ARTICLES)[number] => ARTICLES.find((a) => a.sections.length >= 3) as (typeof ARTICLES)[number];

  function openMulti(): (typeof ARTICLES)[number] {
    const a = multi();
    openHelp();
    click(act("open-article", a.id));
    return a;
  }

  it("shows the whole article until a person chooses otherwise, and says it is unknown, not chosen", () => {
    mount();
    const a = openMulti();
    expect(root.querySelectorAll(".article-section").length).toBe(a.sections.length);
    expect(root.querySelector(act("read-mode", "steps"))?.textContent).toBe("Read one section at a time");
    expect(store.getItem(HELP_KEY)).not.toContain("reading");
  });

  it("switches to one section, keeps focus on the toggle, announces it, and saves the choice", async () => {
    mount();
    openMulti();
    click(act("read-mode", "steps"));
    expect(root.querySelectorAll(".article-section").length).toBe(1);
    expect(root.querySelector("main nav")).toBeNull();
    expect(active()).toBe(root.querySelector(act("read-mode", "whole")));
    expect(root.querySelector(act("read-mode", "whole"))?.textContent).toBe("Show the whole article");
    expect(root.textContent).toContain("Section 1 of");
    expect(loadHelpState(store).reading).toBe("steps");
    expect(await said()).toContain("one section at a time");
  });

  it("moves with Next and Previous, puts focus on the new section heading, and stops at the ends", () => {
    mount();
    const a = openMulti();
    click(act("read-mode", "steps"));
    const prev = (): HTMLButtonElement => root.querySelector(act("read-step", "-1")) as HTMLButtonElement;
    expect(prev().disabled).toBe(true);
    for (let i = 1; i < a.sections.length; i++) {
      click(act("read-step", String(i)));
      const s = a.sections[i];
      expect(active()?.id, `section ${i}`).toBe(sectionAnchor(a.id, (s as NonNullable<typeof s>).id));
      expect(root.querySelector("h3")?.textContent).toBe((s as NonNullable<typeof s>).heading.en);
      expect(root.textContent).toContain(`Section ${i + 1} of ${a.sections.length}`);
    }
    const next = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find((b) => b.textContent === "Next section");
    expect(next?.disabled).toBe(true);
    click(act("read-step", String(a.sections.length - 2)));
    expect(root.textContent).toContain(`Section ${a.sections.length - 1} of`);
  });

  it("ignores a step that is not a number or is out of range", () => {
    mount();
    const a = openMulti();
    click(act("read-mode", "steps"));
    for (const v of ["x", "", "1.5", "NaN"]) {
      const b = document.createElement("button");
      b.dataset["action"] = "read-step";
      b.dataset["value"] = v;
      root.appendChild(b);
      b.click();
      expect(root.textContent, v).toContain(`Section 1 of ${a.sections.length}`);
    }
    const far = document.createElement("button");
    far.dataset["action"] = "read-step";
    far.dataset["value"] = "999";
    root.appendChild(far);
    far.click();
    expect(root.textContent).toContain(`Section ${a.sections.length} of ${a.sections.length}`);
  });

  it("starts again at the first section when another article is opened", () => {
    mount();
    const a = openMulti();
    click(act("read-mode", "steps"));
    click(act("read-step", "1"));
    click(act("read-step", "2"));
    expect(root.textContent).toContain(`Section 3 of ${a.sections.length}`);
    click(act("view", "help"));
    click(act("open-article", a.id));
    expect(root.textContent).toContain(`Section 1 of ${a.sections.length}`);
  });

  it("remembers the choice after the page is reopened", () => {
    mount();
    openMulti();
    click(act("read-mode", "steps"));
    shell?.destroy();
    mount();
    openHelp();
    click(act("open-article", multi().id));
    expect(root.querySelectorAll(".article-section").length).toBe(1);
    click(act("read-mode", "whole"));
    expect(root.querySelectorAll(".article-section").length).toBe(multi().sections.length);
    expect(loadHelpState(store).reading).toBe("whole");
  });

  it("works in French, and passes the audit and axe in both modes", async () => {
    for (const lang of ["en", "fr"]) {
      store = memoryStore();
      mount([lang]);
      openHelp();
      click(act("open-article", multi().id));
      click(act("read-mode", "steps"));
      click(act("read-step", "1"));
      expect(root.textContent).toContain(lang === "fr" ? "Section 2 sur" : "Section 2 of");
      expect(lastAudit(), lang).toEqual([]);
      const r = await axe.run(root, { rules: { "color-contrast": { enabled: false }, "target-size": { enabled: false }, region: { enabled: false } } });
      expect(r.violations.map((v) => v.id), lang).toEqual([]);
      shell?.destroy();
    }
  });

  it("keeps the 44px target on Previous, Next and the toggle", () => {
    mount();
    openMulti();
    click(act("read-mode", "steps"));
    for (const b of Array.from(root.querySelectorAll<HTMLElement>(`${act("read-step")}, ${act("read-mode")}`))) {
      expect(b.getAttribute("style") ?? "").toMatch(/min-height:\s*44px/);
    }
  });
});

describe("recently opened", () => {
  it("shows nothing until an article has been opened, and then tags it", () => {
    mount();
    openHelp();
    expect(root.querySelector(act("recent-clear"))).toBeNull();
    expect(root.textContent).not.toContain("Recently opened.");
    click(act("open-article", "plan"));
    click(act("view", "help"));
    expect(root.textContent).toContain("Recently opened.");
    expect(root.querySelector(act("recent-clear"))).not.toBeNull();
  });

  it("lists the newest first, once each, without a second button for the same article", () => {
    mount();
    for (const id of ["plan", "data", "plan"]) {
      openHelp();
      click(act("open-article", id));
    }
    openHelp();
    const order = Array.from(root.querySelectorAll<HTMLElement>(act("open-article"))).map((b) => b.dataset["value"]);
    expect(order.slice(0, 2)).toEqual(["plan", "data"]);
    expect(new Set(order).size).toBe(order.length);
    expect(order.length).toBe(ARTICLES.length);
  });

  it("puts the suggested article before the recent ones", () => {
    store.setItem("app.onboarding.prefs.v1", JSON.stringify({ locale: "en", mode: "keyboard" }));
    mount();
    openHelp();
    click(act("open-article", "plan"));
    openHelp();
    const first = Array.from(root.querySelectorAll<HTMLElement>(act("open-article"))).map((b) => b.dataset["value"]);
    expect(first.slice(0, 2)).toEqual(["keyboard", "plan"]);
  });

  it("keeps only the newest few", () => {
    mount();
    for (const a of ARTICLES) {
      openHelp();
      click(act("open-article", a.id));
    }
    openHelp();
    expect(root.textContent?.split("Recently opened.").length).toBe(MAX_RECENT + 1);
    expect(loadHelpState(store).recent.length).toBe(MAX_RECENT);
  });

  it("is remembered after reopening, and cleared by the button, which moves focus to search and announces", async () => {
    mount();
    openHelp();
    click(act("open-article", "data"));
    shell?.destroy();
    mount();
    openHelp();
    expect(root.textContent).toContain("Recently opened.");
    click(act("recent-clear"));
    expect(root.textContent).not.toContain("Recently opened.");
    expect(active()?.id).toBe("help-q");
    expect(await said()).toContain("cleared");
    expect(loadHelpState(store).recent).toEqual([]);
    shell?.destroy();
    mount();
    openHelp();
    expect(root.textContent).not.toContain("Recently opened.");
  });

  it("does not record the short guides, the card guide or the find questions", () => {
    mount();
    openHelp();
    click(act("open-path", "find-a-place"));
    click(act("view", "help"));
    click(act("open-card"));
    click(act("view", "help"));
    click(act("find-open", START_NODE));
    expect(loadHelpState(store).recent).toEqual([]);
  });

  it("still works when the browser will not save anything", () => {
    const blocked: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    store = blocked;
    mount();
    openHelp();
    click(act("open-article", "plan"));
    click(act("read-mode", "steps"));
    expect(root.querySelectorAll(".article-section").length).toBe(1);
    click(act("view", "help"));
    expect(root.textContent).toContain("Recently opened.");
  });

  it("passes the DOM audit with recent articles shown, in both languages", () => {
    for (const lang of ["en", "fr"]) {
      store = memoryStore();
      mount([lang]);
      for (const id of ["plan", "data", "keyboard"]) {
        openHelp();
        click(act("open-article", id));
      }
      openHelp();
      expect(lastAudit(), lang).toEqual([]);
      shell?.destroy();
    }
  });
});

describe("saving an article as text", () => {
  it("offers a link on every article that downloads exactly the article's text", () => {
    for (const lang of ["en", "fr"]) {
      mount([lang]);
      openHelp();
      for (const a of ARTICLES) {
        click(act("open-article", a.id));
        const link = root.querySelector<HTMLAnchorElement>("a[download]");
        expect(link, `${a.id} ${lang}`).not.toBeNull();
        expect(link?.getAttribute("download")).toBe(articleFilename(a, lang as "en" | "fr"));
        expect(decodeTextHref(link?.getAttribute("href") ?? "")).toBe(articleToText(a, lang as "en" | "fr"));
        click(act("view", "help"));
      }
      shell?.destroy();
    }
  });

  it("names the link by what it does, tells the person nothing leaves the device, and keeps the target size", () => {
    mount();
    openHelp();
    click(act("open-article", "unknown"));
    const link = root.querySelector<HTMLAnchorElement>("a[download]") as HTMLAnchorElement;
    expect(link.textContent).toBe("Save this article as a text file");
    expect(root.textContent).toContain("Nothing is sent anywhere.");
    expect(link.getAttribute("style") ?? "").toMatch(/min-height:\s*44px/);
  });

  it("gives the saved copy of the whole article even while reading one section at a time", () => {
    mount();
    openHelp();
    const a = ARTICLES.find((x) => x.sections.length >= 3) as (typeof ARTICLES)[number];
    click(act("open-article", a.id));
    click(act("read-mode", "steps"));
    const text = decodeTextHref(root.querySelector<HTMLAnchorElement>("a[download]")?.getAttribute("href") ?? "") ?? "";
    for (const s of a.sections) expect(text).toContain(s.heading.en);
  });
});

describe("help overall", () => {
  it("still lists every article, short guide and the place-card guide, plus the find button", () => {
    mount();
    openHelp();
    expect(root.querySelectorAll("li button").length).toBe(ARTICLES.length + ONBOARDING_PATHS.length + 1);
    expect(root.querySelector(act("find-open", START_NODE))).not.toBeNull();
  });

  it("describes the new saved choices in the data article, in both languages", () => {
    for (const lang of ["en", "fr"] as const) {
      const data = ARTICLES.find((a) => a.id === "data");
      const text = (data?.sections.flatMap((s) => s.paragraphs ?? []) ?? []).map((p) => p[lang]).join(" ");
      expect(text, lang).toContain(lang === "en" ? "last few articles you opened" : "derniers articles ouverts");
    }
  });
});
