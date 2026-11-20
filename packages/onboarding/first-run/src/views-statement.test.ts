// @vitest-environment jsdom
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { auditCopy, auditDom, findBanned, type Locale } from "./index";
import { emptyStatementForm, readStatement, type StatementError, type StatementForm } from "./statement";
import { CUE_COPY, STATEMENT_COPY, STATEMENT_ERRORS, findingHeading, foundText, moreSentencesText, quote, savedText, sentencesCount, statementStrings } from "./statement-copy";
import { FIELD_ID, renderMention, renderStatement, type StatementContext } from "./views-statement";
import { AXE_OPTIONS } from "./shelltest";

const TODAY = new Date(Date.UTC(2026, 10, 19));
const LOCALES: readonly Locale[] = ["en", "fr"];
const PAGE = `Our main entrance is step-free, with a ramp on King St.
There is no elevator. The elevator is temporarily out of service.
Accessible washrooms are on the ground floor.`;

function ctx(locale: Locale, more: Partial<StatementContext> = {}, form: Partial<StatementForm> = {}): StatementContext {
  return { form: { ...emptyStatementForm(TODAY), ...form }, findings: undefined, errors: [], locale, statusMessage: undefined, ...more };
}

function mount(html: string, locale: Locale): HTMLElement {
  document.documentElement.lang = locale;
  document.body.innerHTML = `<div id="r"><a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main" lang="${locale}"><h1>The App</h1>${html}</main></div>`;
  return document.getElementById("r") as HTMLElement;
}

async function clean(html: string, locale: Locale): Promise<void> {
  const root = mount(html, locale);
  expect(auditDom(root, { locale }).map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
  const r = await axe.run(document.body, AXE_OPTIONS);
  expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

describe("copy", () => {
  it("passes the App's copy audit and has no banned words", () => {
    expect(auditCopy(statementStrings())).toEqual([]);
    for (const [, p] of statementStrings()) {
      expect(findBanned(p.en)).toBeUndefined();
      expect(findBanned(p.fr)).toBeUndefined();
    }
  });

  it("counts and quotes the way each language does", () => {
    expect(sentencesCount(1, "en")).toBe("1 sentence");
    expect(sentencesCount(0, "fr")).toBe("0 phrase");
    expect(sentencesCount(3, "fr")).toBe("3 phrases");
    expect(moreSentencesText(1, "fr")).toBe("1 autre phrase n’est pas affichée.");
    expect(moreSentencesText(2, "en")).toBe("2 more sentences are not listed.");
    expect(findingHeading("Ascenseur", 2, "fr")).toBe("Ascenseur\u00A0: 2 phrases");
    expect(foundText(1, 4, "fr")).toBe("Phrases trouvées pour 1 détail sur 4.");
    expect(foundText(3, 4, "en")).toBe("Found sentences for 3 of 4 details.");
    expect(savedText("Library", "en")).toBe("Saved a note for Library.");
    expect(quote("Oui", "fr")).toBe("«\u202FOui\u202F»");
    expect(quote("Yes", "en")).toBe("“Yes”");
  });

  it("has an error message for every error code", () => {
    for (const [code, p] of Object.entries(STATEMENT_ERRORS)) expect(p.en.length * p.fr.length, code).toBeGreaterThan(0);
  });
});

describe("before reading", () => {
  it.each(LOCALES)("shows the paste box and passes axe and the App's audit (%s)", async (l) => {
    const html = renderStatement(ctx(l));
    const root = mount(html, l);
    expect(root.querySelector("h2")?.textContent).toBe(STATEMENT_COPY.title[l]);
    expect(root.querySelector("#st-text")).not.toBeNull();
    // No answers, date or save until the text is read.
    expect(root.querySelector('[data-action="statement-save"]')).toBeNull();
    expect(root.querySelectorAll('input[type="radio"]')).toHaveLength(0);
    await clean(html, l);
  });

  it("keeps what was typed", () => {
    const root = mount(renderStatement(ctx("en", {}, { placeName: "Library <b>", text: "Some & text" })), "en");
    expect(root.querySelector<HTMLInputElement>("#st-name")?.value).toBe("Library <b>");
    expect(root.querySelector<HTMLTextAreaElement>("#st-text")?.value).toBe("Some & text");
  });
});

describe("after reading", () => {
  it.each(LOCALES)("lists each detail's sentences with cues and answers, and passes the audits (%s)", async (l) => {
    const html = renderStatement(ctx(l, { findings: readStatement(PAGE) }, { text: PAGE }));
    const root = mount(html, l);
    expect(Array.from(root.querySelectorAll("[data-finding]")).map((e) => e.getAttribute("data-finding"))).toEqual([
      "step-free-entry",
      "accessible-washroom",
      "automatic-door",
      "elevator",
    ]);
    const elevator = root.querySelector('[data-finding="elevator"]');
    expect(Array.from(elevator?.querySelectorAll("[data-cue]") ?? []).map((e) => e.getAttribute("data-cue"))).toEqual(["lacks", "changes"]);
    expect(elevator?.querySelector(".cue")?.textContent).toBe(CUE_COPY.lacks[l]);
    // Every answer starts UNKNOWN.
    const checked = Array.from(root.querySelectorAll<HTMLInputElement>('input[type="radio"]:checked')).map((r) => r.value);
    expect(checked).toEqual(["unknown", "unknown", "unknown", "unknown"]);
    expect(root.querySelector('[data-finding="automatic-door"]')?.textContent).toContain(STATEMENT_COPY.noneFound[l]);
    await clean(html, l);
  });

  it("marks the matched words inside the quoted sentence", () => {
    const f = readStatement("L’entrée est de plain-pied.")[0];
    const m = f?.mentions[0];
    if (!m) throw new Error("no mention");
    const li = mount(`<ul>${renderMention(m, "fr")}</ul>`, "fr").querySelector("li");
    expect(li?.querySelector("mark")?.textContent).toBe("de plain-pied");
    expect(li?.textContent).toBe(`${CUE_COPY.has.fr}\u00A0: «\u202FL’entrée est de plain-pied.\u202F»`);
  });

  it("escapes the pasted text", () => {
    const f = readStatement("<img src=x onerror=alert(1)> There is an elevator.");
    const root = mount(renderStatement(ctx("en", { findings: f })), "en");
    expect(root.querySelector("img")).toBeNull();
    expect(root.querySelector('[data-finding="elevator"] [data-user-content]')?.textContent).toContain("<img src=x");
  });

  it("warns when the sentences point both ways, and counts the ones not listed", () => {
    const text = `${"There is an elevator. ".repeat(9)}There is no elevator.`;
    const root = mount(renderStatement(ctx("en", { findings: readStatement(text) })), "en");
    const el = root.querySelector('[data-finding="elevator"]');
    expect(el?.querySelector("h4")?.textContent).toBe("Elevator: 10 sentences");
    expect(el?.textContent).toContain(moreSentencesText(2, "en"));
    // The 9th and 10th sentences are not listed, so the "no" one is not among the 8 shown.
    expect(el?.textContent).not.toContain(STATEMENT_COPY.mixed.en);
    const both = mount(renderStatement(ctx("en", { findings: readStatement("There is an elevator. There is no elevator.") })), "en");
    expect(both.querySelector('[data-finding="elevator"]')?.textContent).toContain(STATEMENT_COPY.mixed.en);
  });

  it("keeps the person's answers checked", () => {
    const answers = { "step-free-entry": "yes", "accessible-washroom": "no", "automatic-door": "unknown", elevator: "unknown" } as const;
    const root = mount(renderStatement(ctx("en", { findings: readStatement(PAGE) }, { answers })), "en");
    expect(Array.from(root.querySelectorAll<HTMLInputElement>('input[type="radio"]:checked')).map((r) => `${r.name}=${r.value}`)).toEqual([
      "answer-step-free-entry=yes",
      "answer-accessible-washroom=no",
      "answer-automatic-door=unknown",
      "answer-elevator=unknown",
    ]);
  });
});

describe("errors", () => {
  it.each(LOCALES)("lists every error with a link to its field, and marks the fields (%s)", async (l) => {
    const errors: StatementError[] = [
      { field: "placeName", code: "required" },
      { field: "pageUrl", code: "bad-url" },
      { field: "details", code: "needs-one-detail" },
      { field: "licence", code: "licence-required" },
      { field: "observedOn", code: "future-date" },
    ];
    const html = renderStatement(ctx(l, { findings: readStatement(PAGE), errors }, { text: PAGE }));
    const root = mount(html, l);
    expect(Array.from(root.querySelectorAll("#error-summary a")).map((a) => a.getAttribute("href"))).toEqual(["#st-name", "#st-url", "#st-findings", "#st-licence", "#st-date"]);
    for (const id of ["st-name", "st-url", "st-licence", "st-date"]) {
      expect(root.querySelector(`#${id}`)?.getAttribute("aria-invalid"), id).toBe("true");
      expect(root.querySelector(`#e-${id}`)?.textContent, id).not.toBe("");
    }
    expect(root.querySelector("#e-st-findings")?.textContent).toBe(STATEMENT_ERRORS["needs-one-detail"][l]);
    await clean(html, l);
  });

  it("points every field at an element that exists once the text is read", () => {
    const root = mount(renderStatement(ctx("en", { findings: readStatement(PAGE) })), "en");
    for (const [field, id] of Object.entries(FIELD_ID)) expect(root.querySelector(`#${id}`), field).not.toBeNull();
  });

  it("shows a missing text error before reading", async () => {
    const html = renderStatement(ctx("fr", { errors: [{ field: "text", code: "text-required" }] }));
    const root = mount(html, "fr");
    expect(root.querySelector("#st-text")?.getAttribute("aria-describedby")).toBe("h-st-text e-st-text");
    await clean(html, "fr");
  });
});
