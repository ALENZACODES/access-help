// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PASSPORT_KEY } from "./passport";
import { QUESTIONS } from "./plan";
import { SHOW_COPY } from "./showcard";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const SAVED = {
  device: "walker",
  sizes: { width: "", length: "", seatHeight: "" },
  needs: ["accessible-washroom"],
  helps: "Please speak slowly.",
  updatedOn: "2026-11-19",
};
let h: Harness;

beforeEach(() => {
  h = createHarness(TODAY);
  h.seed([testNote("a", "Library", [{ key: "elevator", value: "yes" }])]);
});

afterEach(() => h.destroy());

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => {
  const el = h.root.querySelector<T>(sel);
  expect(el, sel).not.toBeNull();
  return el as T;
};

function open(locale = "en"): void {
  h.mount(locale);
  h.click(act("view", "notes"));
  h.click(act("view", "passport"));
  h.click(act("view", "showcard"));
}

const blocks = (): Array<string | null> => Array.from(h.root.querySelectorAll("section.show-block")).map((s) => s.getAttribute("lang"));

describe("showing the card", () => {
  beforeEach(() => h.store.setItem(PASSPORT_KEY, JSON.stringify(SAVED)));

  it("opens from the access card page, large, in the person's language, with the questions", () => {
    open();
    expect(h.heading()).toBe(SHOW_COPY.title.en);
    expect(blocks()).toEqual(["en"]);
    expect(($(".show-card") as HTMLElement).style.fontSize).toBe("200%");
    expect($("section.show-block h4 + ul li").textContent).toBe(QUESTIONS["accessible-washroom"].en);
    expect($("[data-user-content]").textContent).toBe("Please speak slowly.");
  });

  it("changes the text size, keeping focus on the chosen size", () => {
    open();
    h.click('[data-action="show-size"][data-value="largest"]');
    expect(($(".show-card") as HTMLElement).style.fontSize).toBe("275%");
    expect(document.activeElement?.getAttribute("data-value")).toBe("largest");
    expect($<HTMLInputElement>('[data-value="largest"]').checked).toBe(true);
  });

  it("adds the other language, with the person's words left as written", () => {
    open("fr");
    h.click('[data-action="show-both"]');
    expect(blocks()).toEqual(["fr", "en"]);
    expect(Array.from(h.root.querySelectorAll("[data-user-content]")).map((e) => [e.textContent, e.getAttribute("lang")])).toEqual([
      ["Please speak slowly.", "fr"],
      ["Please speak slowly.", "fr"],
    ]);
    expect(document.activeElement?.getAttribute("data-action")).toBe("show-both");
  });

  it("can hide the questions", () => {
    open();
    h.click('[data-action="show-questions"]');
    expect(h.root.querySelector("section.show-block h4")).toBeNull();
  });

  it("keeps the choices while the App is open, and goes back to the card page when done", () => {
    open();
    h.click('[data-action="show-size"][data-value="large"]');
    h.click(act("view", "passport"));
    expect(h.root.querySelector("#passport-form")).not.toBeNull();
    h.click(act("view", "showcard"));
    expect(($(".show-card") as HTMLElement).style.fontSize).toBe("150%");
  });

  it("offers both languages in one text file", () => {
    open();
    const link = $<HTMLAnchorElement>("[data-show-download]");
    expect(link.getAttribute("download")).toBe("access-card-en-fr.txt");
    const text = decodeURIComponent((link.getAttribute("href") ?? "").split(",").slice(1).join(","));
    expect(text).toContain("I use a walker.");
    expect(text).toContain("J’utilise une marchette.");
  });

  it("has its own address", () => {
    window.location.hash = "#/notes/access-card/show";
    h.mount("en", true);
    expect(h.heading()).toBe(SHOW_COPY.title.en);
    expect(blocks()).toEqual(["en"]);
  });

  it.each(["en", "fr"] as const)("passes axe and the App's audit with both languages and the largest text (%s)", async (l) => {
    open(l);
    h.click('[data-action="show-both"]');
    h.click('[data-action="show-size"][data-value="largest"]');
    const r = await axe.run(document.body, AXE_OPTIONS);
    expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    expect(h.auditLines()).toEqual([]);
  });
});

describe("with no saved card", () => {
  it("says to make one first, and is not offered from the card page", () => {
    h.mount("en");
    h.click(act("view", "notes"));
    h.click(act("view", "passport"));
    expect(h.root.querySelector(act("view", "showcard"))).toBeNull();
    h.destroy();
    h = createHarness(TODAY);
    window.location.hash = "#/notes/access-card/show";
    h.mount("en", true);
    expect(h.text()).toContain(SHOW_COPY.nothing.en);
    expect(h.root.querySelector(".show-card")).toBeNull();
    h.click(act("view", "passport"));
    expect(h.root.querySelector("#passport-form")).not.toBeNull();
  });
});
