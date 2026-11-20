// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ONBOARDING_PATHS, getPath } from "../../src/paths";
import { ARTICLES, COPY, PATH_PROGRESS_KEY, decodeTextExportHref, hashToView, loadProgress, pathToText } from "./index";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";

const TODAY = new Date(Date.UTC(2026, 10, 19));
let h: Harness;

function openPath(id: string, locale = "en"): void {
  h.mount(locale);
  h.click(act("view", "help"));
  h.click(act("open-path", id));
}

const tick = (): HTMLInputElement | null => h.root.querySelector<HTMLInputElement>('input[data-action="path-done"]');
const progress = (): string => h.root.querySelector("[data-path-progress]")?.textContent ?? "";

beforeEach(() => {
  h = createHarness(TODAY);
});

afterEach(() => {
  h.destroy();
});

describe("ticking the steps of a short path", () => {
  it("shows an unticked box and the count on each step", () => {
    openPath("plan-a-visit");
    expect(h.heading()).toBe("Save your must-haves");
    expect(tick()?.checked).toBe(false);
    expect(tick()?.closest("label")?.textContent).toBe(COPY.pathProgress.done.en);
    expect(progress()).toBe("0 of 3 steps done");
  });

  it("saves a tick at once, keeps focus on it and says the new count", async () => {
    openPath("plan-a-visit");
    tick()?.click();
    expect(loadProgress(h.store)).toEqual({ "plan-a-visit": ["must-haves"] });
    expect(tick()?.checked).toBe(true);
    expect(document.activeElement).toBe(tick());
    expect(progress()).toBe("1 of 3 steps done");
    await Promise.resolve();
    expect(h.status()).toBe("1 of 3 steps done");
  });

  it("keeps ticks after the App is opened again, and shows them on the help list", () => {
    h.store.setItem(PATH_PROGRESS_KEY, JSON.stringify({ "plan-a-visit": ["must-haves", "shortlist"] }));
    openPath("plan-a-visit");
    expect(tick()?.checked).toBe(true);
    expect(progress()).toBe("2 of 3 steps done");
    h.click(act("view", "help"));
    const li = h.root.querySelector(act("open-path", "plan-a-visit"))?.closest("li");
    expect(li?.textContent).toContain("2 of 3 steps done");
    const other = h.root.querySelector(act("open-path", "get-help"))?.closest("li");
    expect(other?.textContent).not.toMatch(/steps? done/);
  });

  it("says when every step is ticked", () => {
    h.store.setItem(PATH_PROGRESS_KEY, JSON.stringify({ "tidy-my-notes": ["check", "decide", "copy"] }));
    openPath("tidy-my-notes");
    expect(h.root.querySelector("[data-path-all]")?.textContent).toBe(COPY.pathProgress.allDone.en);
  });

  it("starts the path again, clears only its ticks and moves focus to the box", async () => {
    h.store.setItem(PATH_PROGRESS_KEY, JSON.stringify({ "plan-a-visit": ["must-haves"], "get-help": ["contact"] }));
    openPath("plan-a-visit");
    h.click(act("path-reset", "plan-a-visit"));
    expect(loadProgress(h.store)).toEqual({ "get-help": ["contact"] });
    expect(tick()?.checked).toBe(false);
    expect(h.root.querySelector(act("path-reset"))).toBeNull();
    expect(document.activeElement).toBe(tick());
    await Promise.resolve();
    expect(h.status()).toBe(COPY.pathProgress.resetDone.en);
  });

  it("works on the older paths too, and ignores saved ticks for steps that do not exist", () => {
    h.store.setItem(PATH_PROGRESS_KEY, JSON.stringify({ "get-help": ["browse-help", "gone"], gone: ["x"] }));
    openPath("get-help");
    expect(tick()?.checked).toBe(true);
    expect(progress()).toBe(`1 of ${getPath("get-help")?.steps.length} steps done`);
  });
});

describe("when the device will not save", () => {
  it("still shows the tick for now, and says it could not be saved", async () => {
    openPath("plan-a-visit");
    const setItem = h.store.setItem.bind(h.store);
    h.store.setItem = (k: string, v: string): void => {
      if (k === PATH_PROGRESS_KEY) throw new Error("full");
      setItem(k, v);
    };
    tick()?.click();
    expect(tick()?.checked).toBe(true);
    expect(progress()).toBe("1 of 3 steps done");
    await Promise.resolve();
    expect(h.status()).toBe(COPY.save.unavailable.en);
    expect(h.store.getItem(PATH_PROGRESS_KEY)).toBeNull();
  });
});

describe("every step of every path, ticked or not", () => {
  it("passes the App's own audit, with names unique on each page, in both languages", () => {
    for (const locale of ["en", "fr"]) {
      for (const p of ONBOARDING_PATHS) {
        for (const ticked of [false, true]) {
          h.destroy();
          h = createHarness(TODAY);
          if (ticked) h.store.setItem(PATH_PROGRESS_KEY, JSON.stringify({ [p.id]: [p.steps[0]?.id] }));
          openPath(p.id, locale);
          for (let i = 0; i < p.steps.length; i++) {
            if (i > 0) h.click(act("path-step", String(i)));
            expect(h.auditLines(), `${locale} ${p.id} ${i} ${ticked}`).toEqual([]);
            const names = Array.from(h.root.querySelectorAll("main button, main a[download]")).map((b) => (b.textContent ?? "").trim().toLowerCase());
            expect(new Set(names).size, `${locale} ${p.id} ${i}`).toBe(names.length);
          }
        }
      }
    }
  });
});

describe("what a step will find on this device", () => {
  const status = (): string => h.root.querySelector("[data-step-status]")?.textContent ?? "";

  it("shows a live count on steps with an App page, and updates after the person acts", () => {
    openPath("plan-a-visit");
    expect(status()).toBe(`On this device now: ${COPY.stepStatus.noNeeds.en}`);
    h.click(act("path-open", "#/places/must-haves"));
    const radio = h.root.querySelector<HTMLInputElement>('input[data-action="need-choice"][data-key="elevator"][data-value="yes"]');
    if (!radio) throw new Error("no radio");
    radio.checked = true;
    radio.dispatchEvent(new Event("change", { bubbles: true }));
    h.click(act("view", "help"));
    h.click(act("open-path", "plan-a-visit"));
    expect(status()).toBe("On this device now: Must-haves saved for 1 detail.");
  });

  it("shows nothing on a step that happens away from the App", () => {
    openPath("keep-details-current");
    h.click(act("path-step", "1"));
    expect(h.heading()).toBe("Ask the place again");
    expect(h.root.querySelector("[data-step-status]")).toBeNull();
  });

  it("uses a no-break space after the French label", () => {
    openPath("tidy-my-notes", "fr");
    expect(status()).toBe(`Sur cet appareil maintenant\u00A0: ${COPY.stepStatus.noFlags.fr}`);
  });
});

describe("continuing a path", () => {
  it("lists started paths on the help list and opens the first step not ticked", () => {
    h.store.setItem(PATH_PROGRESS_KEY, JSON.stringify({ "plan-a-visit": ["must-haves"], "tidy-my-notes": ["check", "decide", "copy"] }));
    h.mount();
    h.click(act("view", "help"));
    const buttons = Array.from(h.root.querySelectorAll(act("path-continue"))).map((b) => b.textContent);
    expect(buttons).toEqual(["Continue: Plan a visit, step by step"]);
    h.click(act("path-continue", "plan-a-visit"));
    expect(h.shell?.getView()).toEqual({ kind: "path", id: "plan-a-visit", step: 1 });
    expect(h.heading()).toBe("Put your shortlist in order");
  });

  it("shows nothing to continue when no path is part done", () => {
    h.mount();
    h.click(act("view", "help"));
    expect(h.root.querySelector(act("path-continue"))).toBeNull();
  });

  it("names the continue button in French with a no-break space", () => {
    h.store.setItem(PATH_PROGRESS_KEY, JSON.stringify({ "ask-about-unknown": ["find-gaps"] }));
    h.mount("fr");
    h.click(act("view", "help"));
    expect(h.root.querySelector(act("path-continue", "ask-about-unknown"))?.textContent).toBe("Continuer\u00A0: Demander un détail UNKNOWN");
  });
});

describe("steps not ticked yet", () => {
  it("lists the other unticked steps once a path is started, and jumps to one", () => {
    h.store.setItem(PATH_PROGRESS_KEY, JSON.stringify({ "plan-a-visit": ["shortlist"] }));
    openPath("plan-a-visit");
    const items = Array.from(h.root.querySelectorAll('ul[aria-labelledby="path-left"] button')).map((b) => b.textContent);
    expect(items).toEqual(["Step 3 of 3: Read the round-up"]);
    h.click(`ul[aria-labelledby="path-left"] ${act("path-step", "2")}`);
    expect(h.heading()).toBe("Read the round-up");
    expect(h.root.querySelectorAll('ul[aria-labelledby="path-left"] button')).toHaveLength(1);
    expect(h.root.querySelector('ul[aria-labelledby="path-left"] button')?.textContent).toBe("Step 1 of 3: Save your must-haves");
  });

  it("is not shown before any tick, nor when only this step is left", () => {
    openPath("plan-a-visit");
    expect(h.root.querySelector("#path-left")).toBeNull();
    h.destroy();
    h = createHarness(TODAY);
    h.store.setItem(PATH_PROGRESS_KEY, JSON.stringify({ "plan-a-visit": ["shortlist", "round-up"] }));
    openPath("plan-a-visit");
    expect(h.root.querySelector("#path-left")).toBeNull();
  });

  it("names the jumps in French with a no-break space", () => {
    h.store.setItem(PATH_PROGRESS_KEY, JSON.stringify({ "tidy-my-notes": ["check"] }));
    openPath("tidy-my-notes", "fr");
    const names = Array.from(h.root.querySelectorAll('ul[aria-labelledby="path-left"] button')).map((b) => b.textContent);
    expect(names).toEqual(["Étape 2 sur 3\u00A0: Décidez pour chaque note", "Étape 3 sur 3\u00A0: Enregistrez une copie de vos notes"]);
  });
});

describe("articles point to the new paths", () => {
  it("relate planning, Unknown and data to their step-by-step paths", () => {
    const rel = (id: string): readonly string[] => ARTICLES.find((a) => a.id === id)?.relatedPaths ?? [];
    expect(rel("plan")).toContain("plan-a-visit");
    expect(rel("unknown")).toContain("ask-about-unknown");
    expect(rel("data")).toContain("tidy-my-notes");
  });

  it("opens the path from the article, with a name no other control on the page has", () => {
    h.mount();
    h.click(act("view", "help"));
    h.click(act("open-article", "plan"));
    const b = h.root.querySelector(act("open-path", "plan-a-visit"));
    expect(b?.textContent).toBe("Plan a visit, step by step");
    h.click(act("open-path", "plan-a-visit"));
    expect(h.shell?.getView()).toEqual({ kind: "path", id: "plan-a-visit", step: 0 });
  });
});

describe("saving a path as text", () => {
  it("offers the path with the person's ticks", () => {
    h.store.setItem(PATH_PROGRESS_KEY, JSON.stringify({ "plan-a-visit": ["shortlist"] }));
    openPath("plan-a-visit");
    const link = h.root.querySelector<HTMLAnchorElement>("main a[download]");
    expect(link?.getAttribute("download")).toBe("path-plan-a-visit-2026-11-19-en.txt");
    expect(link?.textContent).toBe(COPY.pathText.download.en);
    expect(decodeTextExportHref(link?.getAttribute("href") ?? "")).toBe(pathToText(getPath("plan-a-visit") as NonNullable<ReturnType<typeof getPath>>, { "plan-a-visit": ["shortlist"] }, "en", TODAY));
  });
});

describe("opening the page a step is about", () => {
  it("opens the screen named by each step's route", () => {
    for (const p of ONBOARDING_PATHS) {
      p.steps.forEach((s, i) => {
        if (!s.appRoute) return;
        h.destroy();
        h = createHarness(TODAY);
        openPath(p.id);
        for (let n = 0; n < i; n++) h.click(act("path-step", String(n + 1)));
        h.click(act("path-open", s.appRoute));
        expect(h.shell?.getView(), `${p.id}.${s.id}`).toEqual(hashToView(s.appRoute));
      });
    }
  });

  it("shows no open button on a step that happens away from the App", () => {
    openPath("ask-about-unknown");
    h.click(act("path-step", "1"));
    expect(h.heading()).toBe("Ask the place");
    expect(h.root.querySelector(act("path-open"))).toBeNull();
  });
});

describe("accessibility and wording", () => {
  it.each(["en", "fr"] as const)("passes axe and the App's own audit on every step of the new paths (%s)", async (locale) => {
    for (const id of ["plan-a-visit", "ask-about-unknown", "tidy-my-notes"]) {
      h.destroy();
      h = createHarness(TODAY);
      openPath(id, locale);
      const steps = getPath(id)?.steps.length ?? 0;
      for (let i = 0; i < steps; i++) {
        if (i > 0) h.click(act("path-step", String(i)));
        tick()?.click();
        const r = await axe.run(document.body, AXE_OPTIONS);
        expect(r.violations.map((v) => `${v.id}: ${v.help}`), `${id} ${i}`).toEqual([]);
        expect(h.auditLines(), `${id} ${i} ${locale}`).toEqual([]);
        for (const el of Array.from(h.root.querySelectorAll<HTMLElement>("main button, main label.choice"))) expect(el.style.minHeight, el.textContent ?? "").toBe("44px");
      }
    }
  });

  it("passes the audit on the help list with paths to continue, in both languages", async () => {
    h.store.setItem(PATH_PROGRESS_KEY, JSON.stringify({ "plan-a-visit": ["must-haves"], "get-help": ["browse-help"] }));
    for (const locale of ["en", "fr"]) {
      h.mount(locale);
      h.click(act("view", "help"));
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => `${v.id}: ${v.help}`), locale).toEqual([]);
      expect(h.auditLines(), locale).toEqual([]);
    }
  });

  it("uses French counts and the UNKNOWN token, and never inconnu", () => {
    h.store.setItem(PATH_PROGRESS_KEY, JSON.stringify({ "ask-about-unknown": ["find-gaps", "ask"] }));
    openPath("ask-about-unknown", "fr");
    expect(progress()).toBe("2 étapes faites sur 3");
    h.click(act("path-step", "1"));
    const main = h.root.querySelector("main")?.textContent ?? "";
    expect(main).toContain("UNKNOWN");
    expect(main).not.toMatch(/\binconnu/i);
    expect(tick()?.closest("label")?.textContent).toBe("J’ai fait cette étape");
  });
});
