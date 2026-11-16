// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { KEY_HELP, memoryStore, mountShell, type KeyValueStore, type ShellHandle } from "./index";

const TODAY = new Date(Date.UTC(2026, 10, 15));
let root: HTMLElement;
let shell: ShellHandle | undefined;
let store: KeyValueStore;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app") as HTMLElement;
  store = memoryStore();
  shell = mountShell(root, { requestedLocales: ["en"], store, today: TODAY });
});

afterEach(() => {
  shell?.destroy();
  shell = undefined;
});

const press = (el: Element, key: string): boolean => el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
const group = (): HTMLElement => root.querySelector<HTMLElement>('[role="group"]') as HTMLElement;
const options = (): HTMLElement[] => Array.from(group().querySelectorAll<HTMLElement>("button"));

/** Every key the keyboard article lists is driven here against the real page. */
describe("the keys the keyboard article lists", () => {
  it("lists exactly these keys", () => {
    expect(KEY_HELP.map((k) => k.id)).toEqual(["tab", "shift-tab", "enter-space", "arrows", "home-end"]);
  });

  it("arrows move between options and wrap around", () => {
    const [a, b, c] = options();
    a!.focus();
    press(a!, "ArrowRight");
    expect(document.activeElement).toBe(b);
    press(b!, "ArrowDown");
    expect(document.activeElement).toBe(c);
    press(c!, "ArrowRight");
    expect(document.activeElement).toBe(a);
    press(a!, "ArrowLeft");
    expect(document.activeElement).toBe(c);
    press(c!, "ArrowUp");
    expect(document.activeElement).toBe(b);
  });

  it("Home and End go to the first and last option", () => {
    const list = options();
    list[1]!.focus();
    press(list[1]!, "End");
    expect(document.activeElement).toBe(list[list.length - 1]);
    press(list[list.length - 1]!, "Home");
    expect(document.activeElement).toBe(list[0]);
  });

  it("Tab and Shift+Tab are never taken over", () => {
    const list = options();
    list[0]!.focus();
    expect(press(list[0]!, "Tab")).toBe(true);
    expect(press(list[0]!, "Tab")).toBe(true);
    const ev = new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true });
    list[0]!.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
  });

  it("moving to a control does not use it", () => {
    const list = options();
    list[0]!.focus();
    press(list[0]!, "ArrowRight");
    expect(list.every((b) => b.getAttribute("aria-pressed") !== "true")).toBe(true);
    expect(store.getItem("app.onboarding.prefs.v1")).toBeNull();
  });

  it("Enter and Space work because every control is a native button, link or field", () => {
    for (const el of Array.from(root.querySelectorAll<HTMLElement>("[data-action]"))) {
      expect(["BUTTON", "INPUT", "SELECT", "TEXTAREA", "A"], el.outerHTML.slice(0, 80)).toContain(el.tagName);
      expect(el.getAttribute("role")).not.toBe("button");
    }
  });

  it("the first Tab stop is the skip link, and it points at the main content", () => {
    const focusable = Array.from(root.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea, [tabindex]")).filter((e) => e.getAttribute("tabindex") !== "-1");
    const first = focusable[0] as HTMLAnchorElement;
    expect(first.classList.contains("skip-link")).toBe(true);
    expect(first.getAttribute("href")).toBe("#main");
    expect(root.querySelector("#main")).not.toBeNull();
  });

  it("has no single-letter shortcuts or access keys on any screen", () => {
    const screens = ["setup", "notes", "places", "help", "display"];
    for (const s of screens) {
      const nav = root.querySelector<HTMLElement>(`[data-action="view"][data-value="${s}"]`);
      nav?.click();
      expect(root.querySelector("[accesskey]"), s).toBeNull();
      expect(Array.from(root.querySelectorAll("[tabindex]")).every((e) => Number(e.getAttribute("tabindex")) <= 0), s).toBe(true);
    }
  });
});
