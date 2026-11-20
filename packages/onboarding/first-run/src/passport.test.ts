// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { auditCopy, auditDom, memoryStore, type Locale } from "./index";
import {
  PASSPORT_COPY,
  PASSPORT_KEY,
  emptyPassport,
  isEmptyPassport,
  loadPassport,
  needsFromRequirement,
  parsePassport,
  passportFilename,
  passportHtml,
  passportLines,
  passportStrings,
  passportText,
  savePassport,
  sizeValue,
  validatePassport,
  type Passport,
} from "./passport";
import { makeRng } from "./testkit";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const card = (more: Partial<Passport> = {}): Passport => ({
  ...emptyPassport(TODAY),
  device: "power-wheelchair",
  sizes: { width: "68", length: "120", seatHeight: "" },
  needs: ["step-free-entry", "elevator"],
  helps: "Please hold the door; I can transfer to a chair.",
  ...more,
});

describe("what the card says", () => {
  it("speaks in the first person, in English", () => {
    expect(passportLines(card(), "en")).toEqual([
      "I use a power wheelchair.",
      "Size: width 68\u00A0cm, length 120\u00A0cm.",
      "I need: step-free entrance, elevator.",
      "Other things that help: Please hold the door; I can transfer to a chair.",
    ]);
  });

  it("speaks in French with French typography", () => {
    expect(passportLines(card({ device: "walker", helps: "" }), "fr")).toEqual([
      "J’utilise une marchette.",
      "Dimensions\u00A0: largeur 68\u00A0cm, longueur 120\u00A0cm.",
      "J’ai besoin de\u00A0: entrée sans marche, ascenseur.",
    ]);
  });

  it("leaves out what was not given, and says nothing for an empty card", () => {
    expect(passportLines(card({ device: "", sizes: { width: "", length: "", seatHeight: "45" }, needs: [], helps: "" }), "en")).toEqual(["Size: seat height 45\u00A0cm."]);
    expect(passportLines(emptyPassport(TODAY), "en")).toEqual([]);
    expect(isEmptyPassport(emptyPassport(TODAY))).toBe(true);
    expect(isEmptyPassport(card({ device: "", sizes: { width: "", length: "", seatHeight: "" }, needs: [], helps: "  " }))).toBe(true);
  });

  it("starts the needs from the must-haves marked as needed", () => {
    expect(needsFromRequirement({ elevator: "yes", "automatic-door": "no" })).toEqual(["elevator"]);
    expect(needsFromRequirement({})).toEqual([]);
  });
});

describe("checks", () => {
  it("accepts a full card and asks for something on an empty one", () => {
    expect(validatePassport(card())).toEqual([]);
    expect(validatePassport(emptyPassport(TODAY))).toEqual([{ field: "card", code: "empty" }]);
  });

  it("wants whole centimetres in a sensible range", () => {
    expect(sizeValue(" 68 ")).toBe(68);
    expect(sizeValue("6.8")).toBeUndefined();
    expect(sizeValue("")).toBeUndefined();
    expect(validatePassport(card({ sizes: { width: "6.8", length: "1000", seatHeight: "19" } }))).toEqual([
      { field: "width", code: "not-a-number" },
      { field: "length", code: "not-a-number" },
      { field: "seatHeight", code: "out-of-range" },
    ]);
    expect(validatePassport(card({ sizes: { width: "30", length: "250", seatHeight: "120" } }))).toEqual([]);
    expect(validatePassport(card({ sizes: { width: "29", length: "", seatHeight: "" } }))).toEqual([{ field: "width", code: "out-of-range" }]);
  });

  it("keeps contact details and odd characters off the card, and its text short", () => {
    expect(validatePassport(card({ helps: "Call me at 416 555 0199" }))).toEqual([{ field: "helps", code: "personal-phone" }]);
    expect(validatePassport(card({ helps: "me@example.com" }))).toEqual([{ field: "helps", code: "personal-email" }]);
    expect(validatePassport(card({ helps: "bad\u0007char" }))).toEqual([{ field: "helps", code: "control-chars" }]);
    expect(validatePassport(card({ helps: "x".repeat(301) }))).toEqual([{ field: "helps", code: "too-long" }]);
    expect(validatePassport(card({ helps: "two\nlines" }))).toEqual([]);
  });
});

describe("the card's forms", () => {
  function mount(html: string, l: Locale): HTMLElement {
    document.documentElement.lang = l;
    document.body.innerHTML = `<div id="r"><a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main" lang="${l}"><h1>The App</h1><section aria-labelledby="t"><h2 id="t">Cards</h2>${html}</section></main></div>`;
    return document.getElementById("r") as HTMLElement;
  }

  it.each(["en", "fr"] as const)("as markup: the person's words marked as theirs, and the App's audit passes (%s)", (l) => {
    const root = mount(passportHtml(card({ helps: "Porte lourde ; merci !" }), l), l);
    expect(root.querySelector("#access-card-title")?.tagName).toBe("H3");
    expect(root.querySelector("[data-user-content]")?.textContent).toContain("Porte lourde ; merci !");
    expect(auditDom(root, { locale: l }).map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
  });

  it("as markup: says when there is nothing yet, and takes its heading level", () => {
    expect(mount(passportHtml(emptyPassport(TODAY), "en"), "en").textContent).toContain(PASSPORT_COPY.nothingYet.en);
    expect(passportHtml(card(), "en", 2)).toContain('<h2 id="access-card-title">');
  });

  it("as text: title, lines and the day it was updated", () => {
    expect(passportText(card({ updatedOn: "2026-11-19" }), "en").split("\n")).toEqual([
      "Access card",
      "===========",
      "",
      ...passportLines(card(), "en"),
      "",
      "Updated on 2026-11-19.",
      "",
    ]);
    expect(passportFilename("fr")).toBe("fiche-acces-fr.txt");
  });
});

describe("kept on this device", () => {
  it("saves trimmed values and reads them back", () => {
    const store = memoryStore();
    expect(savePassport(store, card({ helps: "  Door  ", sizes: { width: " 68 ", length: "", seatHeight: "" } }))).toBe("saved");
    expect(loadPassport(store, TODAY)).toEqual(card({ helps: "Door", sizes: { width: "68", length: "", seatHeight: "" } }));
  });

  it("reads the details back in the App's order", () => {
    expect(parsePassport(JSON.stringify({ needs: ["elevator", "step-free-entry"] }), TODAY)?.needs).toEqual(["step-free-entry", "elevator"]);
  });

  it("reads saved text defensively and never shows a card that would fail the checks", () => {
    expect(parsePassport(null, TODAY)).toBeUndefined();
    expect(parsePassport("{", TODAY)).toBeUndefined();
    expect(parsePassport("[]", TODAY)).toBeUndefined();
    expect(parsePassport(JSON.stringify({ device: "rocket", needs: ["nope"], helps: "" }), TODAY)).toBeUndefined();
    expect(parsePassport(JSON.stringify({ helps: "call 416 555 0199" }), TODAY)).toBeUndefined();
    const odd = parsePassport(JSON.stringify({ device: "scooter", sizes: { width: "abc", length: 7 }, needs: ["elevator", "elevator", "x"], updatedOn: "never" }), TODAY);
    expect(odd).toEqual({ device: "scooter", sizes: { width: "", length: "", seatHeight: "" }, needs: ["elevator"], helps: "", updatedOn: "2026-11-20" });
  });

  it("says when the device will not keep it", () => {
    expect(savePassport(undefined, card())).toBe("unavailable");
    expect(savePassport({ getItem: () => null, setItem: () => { throw new Error("quota"); }, removeItem: () => undefined }, card())).toBe("unavailable");
    expect(loadPassport({ getItem: () => { throw new Error("no"); }, setItem: () => undefined, removeItem: () => undefined }, TODAY)).toBeUndefined();
    expect(PASSPORT_KEY).toBe("app.onboarding.passport.v1");
  });

  it("reads back every random card it saved", () => {
    const store = memoryStore();
    const devices = ["", "manual-wheelchair", "power-wheelchair", "scooter", "walker", "other"] as const;
    for (let seed = 1; seed <= 100; seed++) {
      const rng = makeRng(seed);
      const size = (lo: number, hi: number): string => (rng() < 0.4 ? "" : String(lo + Math.floor(rng() * (hi - lo + 1))));
      const p: Passport = {
        device: devices[Math.floor(rng() * devices.length)] ?? "",
        sizes: { width: size(30, 150), length: size(40, 250), seatHeight: size(20, 120) },
        needs: (["step-free-entry", "accessible-washroom", "automatic-door", "elevator"] as const).filter(() => rng() < 0.5),
        helps: rng() < 0.5 ? `Note ${seed}` : "",
        updatedOn: "2026-11-20",
      };
      if (validatePassport(p).length > 0) continue;
      savePassport(store, p);
      expect(loadPassport(store, TODAY), `seed ${seed}`).toEqual(p);
      for (const l of ["en", "fr"] as const) for (const line of passportLines(p, l)) expect(line).not.toMatch(/undefined|NaN/);
    }
  });
});

describe("copy", () => {
  it("passes the App's copy audit and asks for no health details", () => {
    expect(auditCopy(passportStrings())).toEqual([]);
    // The privacy line names what the card does not ask for; every other string must not ask for it.
    const all = passportStrings()
      .filter(([k]) => k !== "passport.privacy")
      .map(([, p]) => `${p.en} ${p.fr}`)
      .join(" ");
    expect(all).not.toMatch(/\b(?:diagnos\w*|injury|blessure|medication|médicament|level of|niveau de lésion)\b/i);
  });
});
