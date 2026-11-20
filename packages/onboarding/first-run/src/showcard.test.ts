// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { auditCopy, auditDom, type Locale } from "./index";
import { PASSPORT_COPY, emptyPassport, type Passport } from "./passport";
import { QUESTIONS } from "./plan";
import {
  DEFAULT_SHOW,
  SHOW_COPY,
  SHOW_SCALE,
  SHOW_SIZES,
  bilingualFilename,
  bilingualText,
  isShowSize,
  needQuestions,
  showBlockHtml,
  showHtml,
  showStrings,
} from "./showcard";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const card = (more: Partial<Passport> = {}): Passport => ({
  ...emptyPassport(TODAY),
  device: "scooter",
  sizes: { width: "70", length: "", seatHeight: "" },
  needs: ["step-free-entry", "elevator"],
  helps: "Je parle lentement ; merci !",
  updatedOn: "2026-11-18",
  ...more,
});

function mount(html: string, l: Locale): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<div id="r"><a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main" lang="${l}"><h1>The App</h1><section aria-labelledby="t"><h2 id="t">Show</h2>${html}</section></main></div>`;
  return document.getElementById("r") as HTMLElement;
}

describe("the options", () => {
  it("knows its sizes, grows with each step and starts big enough to read across a counter", () => {
    expect(SHOW_SIZES.map((s) => SHOW_SCALE[s])).toEqual([150, 200, 275]);
    expect(isShowSize("larger")).toBe(true);
    expect(isShowSize("huge")).toBe(false);
    expect(isShowSize(undefined)).toBe(false);
    expect(DEFAULT_SHOW).toEqual({ size: "larger", both: false, questions: true });
  });

  it("asks the App's own questions for each need, in order", () => {
    expect(needQuestions(["step-free-entry", "elevator"], "fr")).toEqual([QUESTIONS["step-free-entry"].fr, QUESTIONS.elevator.fr]);
    expect(needQuestions([], "en")).toEqual([]);
  });
});

describe("one language's block", () => {
  it("keeps the person's words as typed, in the language they wrote them", () => {
    const root = mount(showBlockHtml(card(), "en", "fr", true), "en");
    const own = root.querySelector("[data-user-content]");
    expect(own?.textContent).toBe("Je parle lentement ; merci !");
    expect(own?.getAttribute("lang")).toBe("fr");
    expect(root.querySelector("section.show-block")?.getAttribute("lang")).toBe("en");
    expect(Array.from(root.querySelectorAll("section.show-block > ul:not([aria-labelledby]) > li")).map((li) => li.textContent)).toEqual([
      "I use a mobility scooter.",
      "Size: width 70\u00A0cm.",
      "I need: step-free entrance, elevator.",
      "In my own words: Je parle lentement ; merci !",
    ]);
  });

  it("lists the questions only when asked and when there are needs", () => {
    expect(mount(showBlockHtml(card(), "en", "en", true), "en").querySelectorAll("h4 + ul li")).toHaveLength(2);
    expect(mount(showBlockHtml(card(), "en", "en", false), "en").querySelector("h4")).toBeNull();
    expect(mount(showBlockHtml(card({ needs: [] }), "en", "en", true), "en").querySelector("h4")).toBeNull();
  });

  it("leaves out the own-words line when there are none", () => {
    expect(mount(showBlockHtml(card({ helps: "  " }), "fr", "fr", false), "fr").querySelector("[data-user-content]")).toBeNull();
  });
});

describe("the whole screen's card", () => {
  it("shows the person's language first, then the other when asked, at the chosen size", () => {
    const one = mount(showHtml(card(), "fr", DEFAULT_SHOW), "fr");
    expect(Array.from(one.querySelectorAll("section.show-block")).map((s) => s.getAttribute("lang"))).toEqual(["fr"]);
    const two = mount(showHtml(card(), "fr", { size: "largest", both: true, questions: true }), "fr");
    expect(Array.from(two.querySelectorAll("section.show-block")).map((s) => s.getAttribute("lang"))).toEqual(["fr", "en"]);
    expect((two.querySelector(".show-card") as HTMLElement).style.fontSize).toBe("275%");
    expect(two.querySelector("#show-title-en")?.textContent).toBe(PASSPORT_COPY.cardTitle.en);
    expect(new Set(Array.from(two.querySelectorAll("[id]")).map((e) => e.id)).size).toBe(two.querySelectorAll("[id]").length);
  });

  it.each(["en", "fr"] as const)("passes the App's audit in both languages at once (%s first)", (l) => {
    const root = mount(showHtml(card(), l, { size: "large", both: true, questions: true }), l);
    expect(auditDom(root, { locale: l }).map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
  });
});

describe("the two-language text file", () => {
  it("puts the person's language first and the update day once, at the end", () => {
    const lines = bilingualText(card({ helps: "" }), "en").split("\n");
    expect(lines.slice(0, 8)).toEqual([
      "Access card",
      "===========",
      "",
      "I use a mobility scooter.",
      "Size: width 70\u00A0cm.",
      "I need: step-free entrance, elevator.",
      "",
      "Could you tell me:",
    ]);
    expect(lines).toContain("Fiche d’accès");
    expect(lines).toContain(`- ${QUESTIONS.elevator.fr}`);
    expect(lines.filter((x) => x.startsWith("Updated on") || x.startsWith("Mise à jour"))).toEqual(["Updated on 2026-11-18."]);
    expect(lines.indexOf("Fiche d’accès")).toBeGreaterThan(lines.indexOf("Access card"));
  });

  it("keeps the person's words unchanged in both halves", () => {
    const text = bilingualText(card(), "fr");
    expect(text.split("Je parle lentement ; merci !")).toHaveLength(3);
    expect(text).toContain("Dans mes mots\u00A0: Je parle lentement");
    expect(text).toContain("In my own words: Je parle lentement");
    expect(text.startsWith("Fiche d’accès")).toBe(true);
    expect(text.endsWith("Mise à jour le 2026-11-18.\n")).toBe(true);
  });

  it("names the file by its languages", () => {
    expect(bilingualFilename("en")).toBe("access-card-en-fr.txt");
    expect(bilingualFilename("fr")).toBe("fiche-acces-fr-en.txt");
  });
});

describe("copy", () => {
  it("passes the App's copy audit and offers each language's switch in the other's name", () => {
    expect(auditCopy(showStrings())).toEqual([]);
    expect(SHOW_COPY.both.en).toContain("French");
    expect(SHOW_COPY.both.fr).toContain("anglais");
    expect(showStrings().map(([, p]) => `${p.en} ${p.fr}`).join(" ")).not.toMatch(/\b(?:sent to|envoyé à|share with|partag)/i);
  });
});
