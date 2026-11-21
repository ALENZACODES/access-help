// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Violation } from "./audit";
import { FILE_TOOLS_COPY as C, TOOL_IDS, TOOL_LOADERS, openedToolText, type ToolHandle, type ToolLoader, type ToolMount } from "./filetools";
import { mountFileTools, openToolTitle, type FileToolsHandle } from "./filetools-mount";
import { AXE_OPTIONS } from "./shelltest";

let root: HTMLElement;
let handle: FileToolsHandle | undefined;
let audits: Violation[][];

beforeEach(() => {
  document.documentElement.lang = "en";
  document.body.innerHTML =
    '<a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main"><h1>The App</h1><div id="host"></div></main>';
  root = document.getElementById("host") as HTMLElement;
  audits = [];
});

afterEach(() => {
  handle?.destroy();
  handle = undefined;
});

/** A small stand-in tool that records what the page does with it. */
function fakeTool(log: string[]): ToolMount {
  return (host, opts) => {
    let l = opts.locale;
    const draw = (): void => {
      host.innerHTML = `<section lang="${l}"><h2 tabindex="-1">Fake ${l}</h2></section>`;
    };
    draw();
    log.push(`mount ${l} ${opts.announcer ? "shared" : "own"}`);
    const h: ToolHandle = {
      setLocale(next) {
        l = next;
        draw();
        log.push(`locale ${next}`);
      },
      destroy() {
        log.push("destroy");
        host.innerHTML = "";
      },
    };
    return h;
  };
}

function mount(locale: "en" | "fr" = "en", loaders?: Partial<Record<(typeof TOOL_IDS)[number], ToolLoader>>): FileToolsHandle {
  document.documentElement.lang = locale;
  handle = mountFileTools(root, { locale, onAudit: (v) => audits.push(v), ...(loaders ? { loaders } : {}) });
  return handle;
}

const status = async (): Promise<string> => {
  await Promise.resolve();
  return document.querySelector('[role="status"][aria-live]')?.textContent ?? "";
};

const lastAudit = (): string[] => (audits.at(-1) ?? []).map((v) => `${v.rule}: ${v.detail}`);

describe("the list", () => {
  it("lists every tool with its title, summary and an open button named for it", () => {
    mount();
    const items = Array.from(root.querySelectorAll<HTMLElement>(".ft-tools li"));
    expect(items.map((li) => li.dataset["tool"])).toEqual([...TOOL_IDS]);
    for (const id of TOOL_IDS) {
      expect(root.querySelector(`#ft-h-${id}`)?.textContent).toBe(C.tools[id].title.en);
      expect(root.querySelector(`#ft-open-${id}`)?.textContent).toBe(C.tools[id].open.en);
    }
    expect(lastAudit()).toEqual([]);
  });

  it("loads no tool until one is opened", () => {
    let loads = 0;
    const counting: ToolLoader = () => {
      loads++;
      return Promise.resolve(fakeTool([]));
    };
    mount("en", { check: counting, compare: counting, merge: counting, split: counting });
    expect(loads).toBe(0);
  });
});

describe("opening a tool", () => {
  it("loads it, mounts it below a Back button with the shared live region, moves focus to its heading and announces it", async () => {
    const log: string[] = [];
    const h = mount("en", { split: () => Promise.resolve(fakeTool(log)) });
    root.querySelector<HTMLButtonElement>("#ft-open-split")?.click();
    expect(root.textContent).toContain(C.loading.en);
    await h.open("split");
    expect(h.openTool()).toBe("split");
    expect(log).toEqual(["mount en shared"]);
    expect(root.querySelector("#ft-back")?.textContent).toBe(C.back.en);
    expect(document.activeElement?.textContent).toBe("Fake en");
    expect(await status()).toBe(openedToolText("split", "en"));
    expect(openToolTitle(h, "fr")).toBe(C.tools.split.title.fr);
    expect(lastAudit()).toEqual([]);
  });

  it("goes back to the list, removes the tool and returns focus to its button", async () => {
    const log: string[] = [];
    const h = mount("en", { merge: () => Promise.resolve(fakeTool(log)) });
    await h.open("merge");
    root.querySelector<HTMLButtonElement>("#ft-back")?.click();
    expect(h.openTool()).toBeUndefined();
    expect(log).toEqual(["mount en shared", "destroy"]);
    expect(document.activeElement?.id).toBe("ft-open-merge");
  });

  it("says when a tool cannot be loaded and keeps focus on its button", async () => {
    const h = mount("en", { check: () => Promise.reject(new Error("offline")) });
    await h.open("check");
    expect(h.openTool()).toBeUndefined();
    expect(root.querySelector("#ft-failed-check")?.textContent).toBe(C.loadFailed.en);
    expect(root.querySelector("#ft-open-check")?.getAttribute("aria-describedby")).toBe("ft-failed-check");
    expect(document.activeElement?.id).toBe("ft-open-check");
    expect(await status()).toBe(C.loadFailed.en);
    expect(lastAudit()).toEqual([]);
  });

  it("ignores a load that finishes after the person went back", async () => {
    let finish: (m: ToolMount) => void = () => undefined;
    const log: string[] = [];
    const h = mount("en", { compare: () => new Promise<ToolMount>((r) => (finish = r)) });
    const opening = h.open("compare");
    h.back();
    finish(fakeTool(log));
    await opening;
    expect(h.openTool()).toBeUndefined();
    expect(log).toEqual([]);
    expect(root.querySelector(".ft-tools")).not.toBeNull();
  });

  it("closes one tool before opening another", async () => {
    const log: string[] = [];
    const h = mount("en", { merge: () => Promise.resolve(fakeTool(log)), split: () => Promise.resolve(fakeTool(log)) });
    await h.open("merge");
    await h.open("split");
    expect(log).toEqual(["mount en shared", "destroy", "mount en shared"]);
    expect(h.openTool()).toBe("split");
  });
});

describe("language and destroy", () => {
  it("passes a language change to the open tool and its Back button", async () => {
    const log: string[] = [];
    const h = mount("en", { split: () => Promise.resolve(fakeTool(log)) });
    await h.open("split");
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect(log).toContain("locale fr");
    expect(root.querySelector("#ft-back")?.textContent).toBe(C.back.fr);
    expect(root.querySelector(".filetools-app")?.getAttribute("lang")).toBe("fr");
  });

  it("redraws the list in the other language", () => {
    const h = mount();
    document.documentElement.lang = "fr";
    h.setLocale("fr");
    expect(root.querySelector("#ft-title")?.textContent).toBe(C.title.fr);
    expect(lastAudit()).toEqual([]);
  });

  it("removes the open tool and its own live region", async () => {
    const log: string[] = [];
    const h = mount("en", { check: () => Promise.resolve(fakeTool(log)) });
    await h.open("check");
    h.destroy();
    handle = undefined;
    expect(log).toEqual(["mount en shared", "destroy"]);
    expect(root.innerHTML).toBe("");
    expect(document.querySelectorAll('[role="status"][aria-live]')).toHaveLength(0);
  });
});

describe("the real tools", () => {
  it.each([...TOOL_IDS])("loads %s from its own module and mounts it", async (id) => {
    const mountTool = await TOOL_LOADERS[id]();
    expect(typeof mountTool).toBe("function");
    const h = mount();
    await h.open(id);
    expect(h.openTool()).toBe(id);
    expect(root.querySelector("#ft-tool h2")?.textContent).toBe(C.tools[id].title.en);
    expect(document.querySelectorAll('[role="status"][aria-live]')).toHaveLength(1);
    expect(lastAudit()).toEqual([]);
  });
});

// One axe run per language and screen.
describe("axe", () => {
  it.each(["en", "fr"] as const)("passes on the list (%s)", async (l) => {
    mount(l);
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes with a tool open (%s)", async (l) => {
    const h = mount(l);
    await h.open("merge");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });

  it.each(["en", "fr"] as const)("passes after a failed load (%s)", async (l) => {
    const h = mount(l, { split: () => Promise.reject(new Error("offline")) });
    await h.open("split");
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });
});
