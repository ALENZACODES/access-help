// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { placeId } from "./index";
import { PASSPORT_COPY, PASSPORT_ERRORS, PASSPORT_KEY, loadPassport } from "./passport";
import { renderPassport, type PassportContext } from "./views-passport";
import { emptyPassport } from "./passport";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 20));
const LIBRARY = placeId({ placeName: "Library", address: "1 Main St" });
let h: Harness;

beforeEach(() => {
  h = createHarness(TODAY);
  h.seed([testNote("a", "Library", [{ key: "elevator", value: "yes" }])]);
});

afterEach(() => {
  h.destroy();
  vi.restoreAllMocks();
});

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => {
  const el = h.root.querySelector<T>(sel);
  expect(el, sel).not.toBeNull();
  return el as T;
};

const said = async (): Promise<string> => {
  await Promise.resolve();
  return h.status();
};

function open(locale = "en"): void {
  h.mount(locale);
  h.click(act("view", "notes"));
  h.click(act("view", "passport"));
}

function fill(): void {
  $<HTMLInputElement>('input[name="device"][value="manual-wheelchair"]').checked = true;
  $<HTMLInputElement>("#pp-width").value = "64";
  $<HTMLInputElement>('input[name="need"][value="accessible-washroom"]').checked = true;
  $<HTMLTextAreaElement>("#pp-helps").value = "I can transfer with a grab bar.";
}

describe("making the card", () => {
  it("opens from My notes, empty, with no print or download yet", () => {
    open();
    expect(h.heading()).toBe(PASSPORT_COPY.title.en);
    expect($<HTMLInputElement>("#pp-device").checked).toBe(true);
    expect(h.root.querySelector("[data-passport-download]")).toBeNull();
    expect(h.text()).toContain(PASSPORT_COPY.nothingYet.en);
  });

  it("asks for something before saving an empty card, with focus on the list of problems", () => {
    open();
    h.click(act("passport-save"));
    expect(document.activeElement?.id).toBe("error-summary");
    expect($("#error-summary li").textContent).toBe(PASSPORT_ERRORS.empty.en);
    expect(h.store.getItem(PASSPORT_KEY)).toBeNull();
  });

  it("shows a size problem on its field, keeping what was typed", () => {
    open();
    fill();
    $<HTMLInputElement>("#pp-width").value = "6.4";
    h.click(act("passport-save"));
    expect($<HTMLInputElement>("#pp-width").value).toBe("6.4");
    expect($("#pp-width").getAttribute("aria-invalid")).toBe("true");
    expect($("#e-pp-width").textContent).toBe(PASSPORT_ERRORS["not-a-number"].en);
    expect($<HTMLTextAreaElement>("#pp-helps").value).toBe("I can transfer with a grab bar.");
  });

  it("saves, says so, and shows the card as it reads", async () => {
    open();
    fill();
    h.click(act("passport-save"));
    expect(await said()).toBe(PASSPORT_COPY.saved.en);
    expect(document.activeElement?.id).toBe("pp-preview");
    expect(loadPassport(h.store, TODAY)).toMatchObject({ device: "manual-wheelchair", sizes: { width: "64" }, needs: ["accessible-washroom"], updatedOn: "2026-11-20" });
    expect(Array.from(h.root.querySelectorAll(".access-card li")).map((li) => li.textContent)).toEqual([
      "I use a manual wheelchair.",
      "Size: width 64\u00A0cm.",
      "I need: accessible washroom.",
      "Other things that help: I can transfer with a grab bar.",
    ]);
    const link = $<HTMLAnchorElement>("[data-passport-download]");
    expect(decodeURIComponent((link.getAttribute("href") ?? "").split(",").slice(1).join(","))).toContain("I use a manual wheelchair.");
  });

  it("copies the must-haves into the needs, keeping what else was typed", () => {
    h.store.setItem("app.onboarding.needs.v1", JSON.stringify({ elevator: "yes", "step-free-entry": "yes" }));
    open();
    $<HTMLTextAreaElement>("#pp-helps").value = "Quiet corner please";
    h.click(act("passport-musthaves"));
    expect(document.activeElement?.getAttribute("data-action")).toBe("passport-musthaves");
    const checked = Array.from(h.root.querySelectorAll<HTMLInputElement>('input[name="need"]:checked')).map((c) => c.value);
    expect(checked).toEqual(["step-free-entry", "elevator"]);
    expect($<HTMLTextAreaElement>("#pp-helps").value).toBe("Quiet corner please");
  });

  it("takes the needs from a saved set of must-haves, keeping what else was typed", () => {
    h.store.setItem("app.onboarding.needsets.v1", JSON.stringify([{ id: "s-w", name: "With the walker", needs: { "automatic-door": "yes", elevator: "yes" }, savedOn: "2026-11-01" }]));
    open();
    $<HTMLTextAreaElement>("#pp-helps").value = "Quiet corner please";
    h.click(act("passport-set", "s-w"));
    expect(document.activeElement?.textContent).toBe("Use the must-haves of With the walker");
    const checked = Array.from(h.root.querySelectorAll<HTMLInputElement>('input[name="need"]:checked')).map((c) => c.value);
    expect(checked).toEqual(["automatic-door", "elevator"]);
    expect($<HTMLTextAreaElement>("#pp-helps").value).toBe("Quiet corner please");
  });

  it("offers the must-haves button only when there are must-haves", () => {
    open();
    expect(h.root.querySelector(act("passport-musthaves"))).toBeNull();
  });

  it("is read back after a reload, and prints with the browser's dialog", () => {
    open();
    fill();
    h.click(act("passport-save"));
    open("fr");
    expect($<HTMLInputElement>('input[name="device"][value="manual-wheelchair"]').checked).toBe(true);
    expect($(".access-card li").textContent).toBe("J’utilise un fauteuil roulant manuel.");
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    h.click(act("card-print"));
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("has its own address", () => {
    window.location.hash = "#/notes/access-card";
    h.mount("fr", true);
    expect(h.heading()).toBe(PASSPORT_COPY.title.fr);
  });
});

describe("with the visit cards", () => {
  function saveCard(): void {
    open();
    fill();
    h.click(act("passport-save"));
  }

  it("prints the access card first, and can leave it out", () => {
    saveCard();
    h.click(act("view", "notes"));
    h.click(act("view", "places"));
    h.click(act("open-place", LIBRARY));
    h.click(act("open-place-card", LIBRARY));
    const cards = Array.from(h.root.querySelectorAll("article.place-card"));
    expect(cards[0]?.classList.contains("access-card")).toBe(true);
    expect(cards).toHaveLength(2);
    const href = $("[data-cards-download]").getAttribute("href") ?? "";
    expect(decodeURIComponent(href.slice(href.indexOf(",") + 1))).toContain("I use a manual wheelchair.");
    $<HTMLInputElement>('[data-action="card-passport"]').click();
    expect(document.activeElement?.getAttribute("data-action")).toBe("card-passport");
    expect(h.root.querySelectorAll("article.access-card")).toHaveLength(0);
  });

  it("offers nothing about it when there is no saved card", () => {
    h.mount("en");
    h.click(act("view", "notes"));
    h.click(act("view", "places"));
    h.click(act("open-place", LIBRARY));
    h.click(act("open-place-card", LIBRARY));
    expect(h.root.querySelector('[data-action="card-passport"]')).toBeNull();
  });

  it("is listed on the device page and can be cleared there", () => {
    saveCard();
    h.click(act("view", "help"));
    h.click(act("open-device"));
    expect($("#item-passport").textContent).toBe(PASSPORT_COPY.deviceTitle.en);
    h.click(act("device-clear", "passport"));
    h.click(act("device-confirm", "passport"));
    expect(h.store.getItem(PASSPORT_KEY)).toBeNull();
    h.click(act("view", "notes"));
    h.click(act("view", "passport"));
    expect(h.text()).toContain(PASSPORT_COPY.nothingYet.en);
  });
});

describe("accessibility", () => {
  it.each(["en", "fr"] as const)("the form, its errors and the saved card pass axe and the App's audit (%s)", async (l) => {
    open(l);
    for (const step of [
      () => undefined,
      () => {
        $<HTMLInputElement>("#pp-length").value = "9999";
        h.click(act("passport-save"));
      },
      () => {
        $<HTMLInputElement>("#pp-length").value = "";
        fill();
        h.click(act("passport-save"));
      },
    ]) {
      step();
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    }
    expect(h.auditLines()).toEqual([]);
  });

  it("keeps the form off the printed page, leaving the card", () => {
    const ctx: PassportContext = { draft: emptyPassport(TODAY), saved: false, errors: [], locale: "en", hasMustHaves: false, statusMessage: undefined };
    document.body.innerHTML = renderPassport(ctx);
    expect(document.querySelector("#passport-form")?.classList.contains("no-print")).toBe(true);
    expect(document.querySelector(".access-card")?.closest(".no-print")).toBeNull();
  });
});
