// @vitest-environment jsdom
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { FACT_KEYS, auditDom, groupPlaces, type Locale, type Place } from "./index";
import { ASK_COPY, buildLetter, defaultAskKeys, parseMailto } from "./askplace";
import { renderAskPlace, type AskContext } from "./views-ask";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";

const place = (): Place =>
  groupPlaces([testNote("a", "Library", [{ key: "elevator", value: "yes" }]), testNote("b", "Library", [{ key: "elevator", value: "no" }])], "en")[0] as Place;

function ctx(more: Partial<AskContext> = {}): AskContext {
  const p = place();
  return { place: p, keys: defaultAskKeys(p), letterLocale: "en", locale: "en", statusMessage: undefined, today: new Date(Date.UTC(2026, 10, 19)), way: undefined, wayError: false, sent: undefined, ...more };
}

function mount(html: string, l: Locale): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<div id="r"><a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main" lang="${l}"><h1>The App</h1>${html}</main></div>`;
  return document.getElementById("r") as HTMLElement;
}

async function clean(html: string, l: Locale): Promise<void> {
  const root = mount(html, l);
  expect(auditDom(root, { locale: l }).map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
  const r = await axe.run(document.body, AXE_OPTIONS);
  expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

describe("the ask screen", () => {
  it.each(["en", "fr"] as const)("passes axe and the App's audit, with a message and without (%s)", async (l) => {
    await clean(renderAskPlace(ctx({ locale: l, letterLocale: l })), l);
    await clean(renderAskPlace(ctx({ locale: l, keys: [] })), l);
  });

  it("lists every detail with how it stands, and ticks the chosen ones", () => {
    const root = mount(renderAskPlace(ctx()), "en");
    const boxes = Array.from(root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
    expect(boxes.map((b) => b.dataset["key"])).toEqual(FACT_KEYS);
    expect(boxes.filter((b) => b.checked).map((b) => b.dataset["key"])).toEqual(FACT_KEYS);
    expect(root.querySelector('label[for="ask-key-elevator"]')?.textContent).toBe("Elevator (Reports differ)");
  });

  it("marks the message and the language choices with their own language", () => {
    const root = mount(renderAskPlace(ctx({ letterLocale: "fr" })), "en");
    expect(root.querySelector("#ask-text")?.getAttribute("lang")).toBe("fr");
    expect(Array.from(root.querySelectorAll('[data-action="ask-lang"]')).map((r) => [r.getAttribute("value"), (r as HTMLInputElement).checked, r.closest("label")?.getAttribute("lang")])).toEqual([
      ["en", false, "en"],
      ["fr", true, "fr"],
    ]);
  });

  it("puts the same message in the email link and the text box", () => {
    const root = mount(renderAskPlace(ctx()), "en");
    const letter = buildLetter(place(), FACT_KEYS, "en");
    expect(parseMailto(root.querySelector("[data-ask-email]")?.getAttribute("href") ?? "")).toEqual({ subject: letter?.subject, body: letter?.body });
    expect((root.querySelector("#ask-text") as HTMLTextAreaElement).value).toBe(letter?.body);
  });

  it("offers no email link, file or copy with nothing chosen", () => {
    const root = mount(renderAskPlace(ctx({ keys: [] })), "en");
    expect(root.querySelector("[data-ask-email]")).toBeNull();
    expect(root.querySelector("a[download]")).toBeNull();
    expect(root.querySelector('[data-action="select-text"]')).toBeNull();
    expect(root.querySelector("[data-ask-none]")?.textContent).toBe(ASK_COPY.noneChosen.en);
  });

  it("says when the place is not found", async () => {
    const html = renderAskPlace(ctx({ place: undefined, locale: "fr" }));
    expect(mount(html, "fr").querySelector("#ask-text")).toBeNull();
    await clean(html, "fr");
  });

  it("escapes the place's name", () => {
    const p = groupPlaces([testNote("x", "<i>Bar</i>", [])], "en")[0] as Place;
    const root = mount(renderAskPlace(ctx({ place: p, keys: defaultAskKeys(p) })), "en");
    expect(root.querySelector("i")).toBeNull();
    expect(root.querySelector("h2 [data-user-content]")?.textContent).toBe("<i>Bar</i>");
  });
});
