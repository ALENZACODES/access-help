// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { auditDom } from "./audit";
import { exportNotes } from "./exchange";
import { readStreetFile, type StreetFile } from "./filestreets";
import { testNote } from "./testnotes";
import { WEEK, defaultPlanOptions, formFor, planVisits, type PlanOptions } from "./visitplan";
import {
  BOTH_SIDES_ID,
  KEEP_STREETS_ID,
  ONLY_OPEN_ID,
  VISITS_TEXT_ID,
  fieldId,
  readPlanForm,
  renderDay,
  renderFileVisits,
  renderPlan,
  renderPlanForm,
  weekdayId,
  type FileVisitsContext,
} from "./views-filevisits";

const TODAY = new Date(Date.UTC(2026, 10, 23));
const OPTIONS: PlanOptions = { ...defaultPlanOptions(TODAY), perDay: 2 };

function file(): StreetFile {
  const r = readStreetFile(
    exportNotes([testNote("a", "Library", [], "100 King St W"), testNote("b", "<b>Café</b>", [], "12 King St W"), testNote("c", "Kiosk", [], null)], "2026-11-01"),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const ctx = (l: "en" | "fr" = "en", over: Partial<FileVisitsContext> = {}): FileVisitsContext => ({
  text: "",
  error: undefined,
  file: file(),
  options: OPTIONS,
  form: formFor(OPTIONS),
  problems: [],
  locale: l,
  today: TODAY,
  statusMessage: undefined,
  ...over,
});

function page(inner: string, l: "en" | "fr", wrap = true): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main"><h1>The App</h1>${wrap ? `<h2>Plan</h2><h3>Days</h3>` : ""}${inner}</main>`;
  return document.body;
}

describe("renderDay", () => {
  it("lists a day's visits with their times, escaping names, and passes the App's audit in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const day = planVisits(file(), OPTIONS, l).days[0];
      if (!day) throw new Error("no day");
      const el = page(`<ul>${renderDay(day, l)}</ul>`, l);
      expect(el.querySelector("b")).toBeNull();
      expect(Array.from(el.querySelectorAll("ol li")).map((li) => li.textContent)).toEqual(
        l === "en" ? ["10:00 to 10:30 <b>Café</b>, 12 King St W", "10:45 to 11:15 Library, 100 King St W"] : ["10 h 00 à 10 h 30 <b>Café</b>, 12 King St W", "10 h 45 à 11 h 15 Library, 100 King St W"],
      );
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });

  it("says when a place has no address", () => {
    const day = planVisits(file(), OPTIONS, "en").days[1];
    if (!day) throw new Error("no day");
    const el = page(`<ul>${renderDay(day, "en")}</ul>`, "en");
    expect(el.querySelector("ol li")?.textContent).toBe("10:00 to 10:30 Kiosk, No address");
  });
});

describe("renderPlan", () => {
  it("has three downloads, each with a file name, and a heading with the number of days", () => {
    const plan = planVisits(file(), OPTIONS, "en");
    const el = page(renderPlan(ctx(), plan), "en", false);
    expect(Array.from(el.querySelectorAll("a.linkbtn")).map((a) => a.getAttribute("download"))).toEqual(["visit-plan-2026-11-23.ics", "visit-plan-2026-11-23.txt", "visit-plan-2026-11-23.csv"]);
    expect(el.querySelector("#fvp-days")?.textContent).toBe("Days (2)");
    expect(el.querySelector("#fvp-split")).toBeNull();
  });

  it("shows no list when there are no days", () => {
    const el = page(renderPlan(ctx(), { days: [], leftOutDone: 0, splitStreets: [] }), "en", false);
    expect(el.querySelector(".fvp-days")).toBeNull();
    expect(el.querySelector("#fvp-days")?.textContent).toBe("Days (0)");
  });

  it("names cut streets as the person's own text, with French spacing", () => {
    const plan = planVisits(file(), { ...OPTIONS, perDay: 1 }, "fr");
    const el = page(renderPlan(ctx("fr"), plan), "fr", false);
    expect(el.querySelector("#fvp-split")?.textContent).toBe("Rues sur plus d’une journée\u00A0: King Street West");
    expect(el.querySelector("#fvp-split [data-user-content]")?.textContent).toBe("King Street West");
  });
});

describe("renderPlanForm", () => {
  it("shows the form's values and choices", () => {
    const el = page(renderPlanForm(ctx("en", { form: { ...formFor(OPTIONS), weekdays: [6, 0], bothSides: true, onlyOpen: true, keepStreets: false } })), "en", false);
    expect(WEEK.filter((d) => el.querySelector<HTMLInputElement>(`#${weekdayId(d)}`)?.checked)).toEqual([6, 0]);
    expect(el.querySelector<HTMLInputElement>(`#${fieldId("start")}`)?.value).toBe("2026-11-23");
    expect(el.querySelector<HTMLInputElement>(`#${fieldId("startTime")}`)?.value).toBe("10:00");
    expect(el.querySelector<HTMLInputElement>(`#${BOTH_SIDES_ID}`)?.checked).toBe(true);
    expect(el.querySelector<HTMLInputElement>(`#${ONLY_OPEN_ID}`)?.checked).toBe(true);
    expect(el.querySelector<HTMLInputElement>(`#${KEEP_STREETS_ID}`)?.checked).toBe(false);
  });

  it("ties each error to its field, keeps the hint, and passes the App's audit in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const c = ctx(l, {
        form: { ...formFor(OPTIONS), startTime: "25:00", perDay: "0" },
        problems: [
          { field: "startTime", code: "time" },
          { field: "perDay", code: "perDay" },
        ],
      });
      const el = page(`<h2>Plan</h2>${renderPlanForm(c)}`, l, false);
      const time = el.querySelector<HTMLInputElement>(`#${fieldId("startTime")}`);
      expect(time?.getAttribute("aria-describedby")).toBe(`h-${fieldId("startTime")} e-${fieldId("startTime")}`);
      expect(time?.value).toBe("25:00");
      expect(el.querySelector(`#${fieldId("perDay")}`)?.getAttribute("aria-invalid")).toBe("true");
      expect(el.querySelector(`#${fieldId("minutes")}`)?.hasAttribute("aria-invalid")).toBe(false);
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });
});

describe("renderFileVisits", () => {
  it("links the file error and each form problem from the summary, in field order", () => {
    document.body.innerHTML = renderFileVisits(
      ctx("en", {
        error: "empty",
        problems: [
          { field: "gap", code: "gap" },
          { field: "weekdays", code: "weekdays" },
        ],
      }),
    );
    expect(Array.from(document.querySelectorAll("#fvp-errors a")).map((a) => a.getAttribute("href"))).toEqual([`#${VISITS_TEXT_ID}`, `#${weekdayId(1)}`, `#${fieldId("gap")}`]);
  });

  it("shows no plan before a file is read", () => {
    document.body.innerHTML = renderFileVisits(ctx("en", { file: undefined }));
    expect(document.querySelector("#fvp-summary")).toBeNull();
    expect(document.querySelector("#fvp-options-form")).toBeNull();
  });
});

describe("readPlanForm", () => {
  it("reads the values and choices on the page", () => {
    document.body.innerHTML = renderPlanForm(ctx());
    const input = (id: string): HTMLInputElement => document.querySelector<HTMLInputElement>(`#${id}`) as HTMLInputElement;
    input(fieldId("gap")).value = "5";
    input(weekdayId(1)).checked = false;
    input(weekdayId(0)).checked = true;
    input(KEEP_STREETS_ID).checked = false;
    const f = readPlanForm(document.body, formFor(OPTIONS));
    expect(f.gap).toBe("5");
    expect(f.weekdays).toEqual([2, 3, 4, 5, 0]);
    expect(f.keepStreets).toBe(false);
  });

  it("falls back to the form it was given when the page has no form", () => {
    document.body.innerHTML = "";
    const fallback = formFor(OPTIONS);
    expect(readPlanForm(document.body, fallback)).toEqual(fallback);
  });
});
