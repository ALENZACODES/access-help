// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { auditDom } from "./audit";
import { importNotes } from "./exchange";
import { FACT_KEYS } from "./facts";
import { FILE_GAPS_COPY as C, boxErrorText } from "./filegaps-copy";
import { DEFAULT_FILL, checkFill, fillCopy, fillPlan, filledFile, type FillPlan } from "./fillgaps";
import type { Note } from "./model";
import { testNote } from "./testnotes";
import { decodeTextExportHref } from "./textexport";
import {
  ONLY_GAPS_ID,
  SINCE_ID,
  OPEN_IDS,
  TEXT_IDS,
  keyBoxId,
  readOptions,
  renderFileGaps,
  renderOptions,
  renderOutcome,
  renderPlan,
  tickId,
  type FileGapsContext,
  type GapsOutcome,
} from "./views-filegaps";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const MINE: Note[] = [testNote("m1", "<b>Café</b>", [{ key: "elevator", value: "yes" }], "1 A St"), testNote("m2", "Kiosk", [], null)];
const OTHER: Note[] = [
  testNote("o1", "<b>Café</b>", [{ key: "automatic-door", value: "yes", source: "Visit" }], "1 A St"),
  testNote("o2", "Kiosk", [{ key: "elevator", value: "no", source: "Visit" }], null),
  testNote("o3", "Diner", [{ key: "elevator", value: "no", source: "Visit" }], "9 Z St"),
];
const plan = (l: "en" | "fr" = "en"): FillPlan => fillPlan(MINE, OTHER, DEFAULT_FILL, l);

function outcome(): GapsOutcome {
  const p = plan();
  const filled = fillCopy(MINE, p, p.places.map((x) => x.place.id));
  const copy = filledFile(filled, TODAY);
  return { filled, check: checkFill(copy, MINE, filled, "en"), copy };
}

const ctx = (l: "en" | "fr" = "en", over: Partial<FileGapsContext> = {}): FileGapsContext => ({
  mineText: "",
  otherText: "",
  mineError: undefined,
  otherError: undefined,
  loaded: true,
  form: DEFAULT_FILL,
  noKeys: false,
  badSince: false,
  plan: plan(l),
  ticked: plan(l).places.map((p) => p.place.id),
  noneTicked: false,
  outcome: undefined,
  locale: l,
  today: TODAY,
  statusMessage: undefined,
  ...over,
});

function page(inner: string, l: "en" | "fr"): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main"><h1>The App</h1><h2>Tool</h2>${inner}</main>`;
  return document.body;
}

describe("renderOptions", () => {
  it("shows the details and the only-gaps choice, and reads them back", () => {
    const el = page(renderOptions(ctx("en", { form: { keys: ["elevator"], onlyGaps: false, since: "2026-01-31" } })), "en");
    expect(FACT_KEYS.filter((k) => el.querySelector<HTMLInputElement>(`#${keyBoxId(k)}`)?.checked)).toEqual(["elevator"]);
    const only = el.querySelector<HTMLInputElement>(`#${ONLY_GAPS_ID}`);
    expect(only?.checked).toBe(false);
    expect(only?.getAttribute("aria-describedby")).toBe(`h-${ONLY_GAPS_ID}`);
    expect(readOptions(el)).toEqual({ keys: ["elevator"], onlyGaps: false, since: "2026-01-31" });
    for (const label of Array.from(el.querySelectorAll<HTMLLabelElement>("label.choice"))) expect(label.style.minHeight).toBe("44px");
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("ties a day that is not a real date to its field, in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderOptions(ctx(l, { form: { ...DEFAULT_FILL, since: "2026-13-01" }, badSince: true })), l);
      const input = el.querySelector<HTMLInputElement>(`#${SINCE_ID}`);
      expect(input?.value).toBe("2026-13-01");
      expect(input?.getAttribute("aria-invalid")).toBe("true");
      expect(input?.getAttribute("aria-describedby")).toBe(`h-${SINCE_ID} e-${SINCE_ID}`);
      expect(el.querySelector(`#e-${SINCE_ID}`)?.textContent).toBe(C.badSince[l]);
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
    expect(page(renderFileGaps(ctx("en", { badSince: true, plan: undefined })), "en").querySelector("#fgp-errors a")?.getAttribute("href")).toBe(`#${SINCE_ID}`);
  });

  it("ties the no-detail problem to its group, in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderOptions(ctx(l, { form: { ...DEFAULT_FILL, keys: [] }, noKeys: true })), l);
      expect(el.querySelector("#e-fgp-keys")?.closest("fieldset")?.getAttribute("aria-describedby")).toBe("e-fgp-keys");
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });
});

describe("renderPlan", () => {
  it("sums up the plan, says what was left out, and lists the places with tick boxes", () => {
    const el = page(renderPlan(plan(), ctx()), "en");
    expect(el.querySelector("#fgp-summary")?.textContent).toBe("2 places can gain 2 answers from 2 notes.");
    expect(el.querySelector("#fgp-left-out")?.textContent).toBe("Left out: 1 note about places not in your file.");
    const boxes = Array.from(el.querySelectorAll<HTMLInputElement>(".fgp-places input"));
    expect(boxes.map((b) => b.closest("label")?.textContent)).toEqual(["Add 1 note to “<b>Café</b>, 1 A St”", "Add 1 note to “Kiosk, No address”"]);
    for (const b of boxes) {
      expect(b.checked).toBe(true);
      expect(el.querySelector(`#${b.getAttribute("aria-describedby") ?? "none"}`)?.textContent).toMatch(/^Fills: /);
    }
    expect(el.querySelector('[data-action="fgp-add"]')?.textContent).toBe("Add 2 notes to a copy of your file");
    expect(el.querySelector("b")).toBeNull();
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("shows every note a place would gain behind a disclosure with a 44 pixel summary", () => {
    const el = page(renderPlan(plan(), ctx()), "en");
    const kiosk = el.querySelectorAll<HTMLDetailsElement>("details.fgp-notes")[1];
    expect(kiosk?.open).toBe(false);
    expect(kiosk?.querySelector("summary")?.textContent).toBe("Show the notes for “Kiosk, No address” (1)");
    expect(kiosk?.querySelector("summary")?.style.minHeight).toBe("44px");
    expect(kiosk?.querySelector(":scope > ul > li > p")?.textContent).toBe("Note made on 2026-10-01");
    expect(kiosk?.querySelector(":scope > ul > li > ul > li")?.textContent).toBe("Elevator: No (Visit, 2026-10-01)");
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("shows an incoming note's text as the person's own text", () => {
    const withText = { ...(OTHER[1] as Note), note: "<i>Side</i> door" };
    const p = fillPlan(MINE, [withText], DEFAULT_FILL, "en");
    const el = page(renderPlan(p, ctx("en", { plan: p })), "en");
    expect(el.querySelector("details.fgp-notes li p")?.textContent).toBe("Note made on 2026-10-01. Text: “<i>Side</i> door”");
    expect(el.querySelector("i")).toBeNull();
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("offers to tick or untick every place when there is more than one", () => {
    const el = page(renderPlan(plan(), ctx()), "en");
    expect(el.querySelector('[data-action="fgp-tick-all"]')?.textContent).toBe(C.tickAll.en);
    expect(el.querySelector('[data-action="fgp-untick-all"]')?.textContent).toBe(C.untickAll.en);
    const one = fillPlan(MINE, [OTHER[1] as Note], DEFAULT_FILL, "en");
    expect(page(renderPlan(one, ctx("en", { plan: one })), "en").querySelector('[data-action="fgp-tick-all"]')).toBeNull();
  });

  it("counts only the ticked places, and ties the no-place problem to the list", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderPlan(plan(l), ctx(l, { ticked: [], noneTicked: true })), l);
      expect(el.querySelector("fieldset")?.getAttribute("aria-describedby")).toBe("e-fgp-places");
      expect(el.querySelector('[data-action="fgp-add"]')?.textContent).toBe(C.addNone[l]);
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });

  it("says when nothing in the other file answers a gap", () => {
    const none = fillPlan(MINE, [OTHER[2] as Note], DEFAULT_FILL, "en");
    const el = page(renderPlan(none, ctx("en", { plan: none, ticked: [] })), "en");
    expect(el.querySelector("#fgp-summary")?.textContent).toBe(C.none.en);
    expect(el.querySelector("#fgp-add-form")).toBeNull();
  });
});

describe("renderOutcome", () => {
  it("offers the copy and the list when the copy read back", () => {
    const el = page(renderOutcome(outcome(), ctx()), "en");
    expect(el.querySelector("#fgp-copy-summary")?.textContent).toBe("2 notes added; 2 gaps now have an answer; 4 notes in all.");
    expect(el.querySelector("#fgp-check")?.textContent).toBe(C.checkOk.en);
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>("a.linkbtn"));
    expect(links.map((a) => a.getAttribute("download"))).toEqual(["notes-2-notes-added-2026-11-21.json", "list-2-notes-added-2026-11-21.txt", "table-2-notes-added-2026-11-21.csv"]);
    const csv = decodeURIComponent((links[2]?.getAttribute("href") ?? "").replace(/^data:text\/csv;charset=utf-8,/, ""));
    expect(csv.split("\r\n")).toHaveLength(4);
    const back = importNotes(decodeURIComponent((links[0]?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, "")));
    expect(back.notes.map((n) => n.id)).toEqual(["m1", "m2", "o1", "o2"]);
    expect(decodeTextExportHref(links[1]?.getAttribute("href") ?? "")).toContain("- Kiosk, No address\n");
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("offers nothing when the copy did not read back", () => {
    const el = page(renderOutcome({ ...outcome(), check: { ok: false, reason: "new-place" } }, ctx("fr")), "fr");
    expect(el.querySelector("#fgp-check")?.textContent).toBe(C.checkFailed.fr);
    expect(el.querySelector("a.linkbtn")).toBeNull();
    expect(auditDom(el, { locale: "fr" })).toEqual([]);
  });
});

describe("renderFileGaps", () => {
  it("shows two boxes, each with its own label, hint and file input", () => {
    const el = page(renderFileGaps(ctx("en", { loaded: false, plan: undefined })), "en");
    for (const b of ["mine", "other"] as const) {
      expect(el.querySelector(`label[for="${TEXT_IDS[b]}"]`)).not.toBeNull();
      expect(el.querySelector(`#${OPEN_IDS[b]}`)?.getAttribute("data-box")).toBe(b);
    }
    expect(el.querySelector("#fgp-options-form")).toBeNull();
    expect(el.querySelector('[data-action="fgp-clear"]')?.textContent).toBe("Remove both files from the page");
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("links each file's error to its own box, naming the box", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFileGaps(ctx(l, { loaded: false, plan: undefined, mineError: "empty", otherError: "not-json" })), l);
      expect(Array.from(el.querySelectorAll("#fgp-errors a")).map((a) => [a.getAttribute("href"), a.textContent])).toEqual([
        [`#${TEXT_IDS.mine}`, boxErrorText("mine", "empty", l)],
        [`#${TEXT_IDS.other}`, boxErrorText("other", "not-json", l)],
      ]);
      expect(el.querySelector(`#${TEXT_IDS.other}`)?.getAttribute("aria-invalid")).toBe("true");
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });

  it("links the no-place problem to the first place", () => {
    const el = page(renderFileGaps(ctx("en", { ticked: [], noneTicked: true })), "en");
    expect(el.querySelector("#fgp-errors a")?.getAttribute("href")).toBe(`#${tickId(plan().places[0]?.place.id ?? "")}`);
  });

  it("shows the options, the plan and the copy, in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFileGaps(ctx(l, { outcome: outcome(), statusMessage: C.opened[l] })), l);
      expect(el.querySelector("#fgp-status")?.textContent).toBe(C.opened[l]);
      expect(el.querySelectorAll(".fgp-places > li")).toHaveLength(2);
      expect(el.querySelector("#fgp-copy")).not.toBeNull();
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });
});
