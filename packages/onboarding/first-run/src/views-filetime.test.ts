// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { auditDom } from "./audit";
import { t } from "./copy";
import { exportNotes } from "./exchange";
import { readStreetFile, type StreetFile } from "./filestreets";
import { FILE_TIME_COPY as C, timelineSummary } from "./filetime-copy";
import { importNotes } from "./exchange";
import { fileTimeline } from "./recordtimeline";
import { testNote } from "./testnotes";
import { decodeTextExportHref } from "./textexport";
import {
  TIME_AREA_ID,
  TIME_DAY_ID,
  TIME_TEXT_ID,
  areaTooLong,
  readTimeForm,
  renderDay,
  renderDetailTable,
  renderFileTime,
  renderTimeTable,
  stepId,
  type FileTimeContext,
} from "./views-filetime";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function file(): StreetFile {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("a", "<b>Library</b>", [
          { key: "elevator", value: "yes", on: "2026-01-10" },
          { key: "accessible-washroom", value: "yes", on: "2026-03-05" },
        ], "100 King St W"),
        testNote("b1", "Bank", [{ key: "elevator", value: "yes", on: "2026-01-20" }], "40 Queen St E"),
        testNote("b2", "Bank", [{ key: "elevator", value: "no", on: "2026-03-15", source: "Visit" }], "40 Queen St E"),
        testNote("c", "Cart", [], null),
      ],
      "2026-11-01",
    ),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

function readOnly(): StreetFile {
  const r = readStreetFile(exportNotes([testNote("c", "Cart", [], "1 Cart Lane")], "2026-11-01"), TODAY, "en");
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const ctx = (l: "en" | "fr" = "en", over: Partial<FileTimeContext> = {}): FileTimeContext => ({
  text: "",
  error: undefined,
  file: file(),
  form: { step: "month", area: "" },
  areaError: false,
  shown: { step: "month", area: "" },
  locale: l,
  today: TODAY,
  statusMessage: undefined,
  dayText: "",
  dayProblem: undefined,
  dayShown: undefined,
  ...over,
});

function page(inner: string, l: "en" | "fr"): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main"><h1>The App</h1>${inner}</main>`;
  return document.body;
}

const cellsOf = (row: Element | null | undefined): string[] => Array.from(row?.querySelectorAll("th,td") ?? []).map((c) => c.textContent ?? "");

describe("renderFileTime", () => {
  it("shows only the file form before a file is read, and passes the audit", () => {
    const el = page(renderFileTime(ctx("en", { file: undefined, shown: undefined })), "en");
    expect(el.querySelector("#ftm-show-form")).toBeNull();
    expect(el.querySelector("#ftm-results")).toBeNull();
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("shows the timeline with its tables and downloads, passing the audit in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFileTime(ctx(l)), l);
      expect(el.querySelector("#ftm-summary")?.textContent).toBe(timelineSummary(fileTimeline(file(), "month", "", TODAY), l));
      expect(el.querySelectorAll("#ftm-table tbody tr")).toHaveLength(3);
      expect(el.querySelectorAll("#ftm-detail-table tbody tr")).toHaveLength(4);
      expect(Array.from(el.querySelectorAll<HTMLAnchorElement>("a.linkbtn")).map((a) => a.getAttribute("download"))).toEqual(
        l === "en" ? ["records-over-time-by-month-2026-11-21.csv", "records-over-time-by-month-2026-11-21.txt"] : ["donnees-au-fil-du-temps-par-mois-2026-11-21.csv", "donnees-au-fil-du-temps-par-mois-2026-11-21.txt"],
      );
      expect(auditDom(el, { locale: l }), l).toEqual([]);
    }
  });

  it("names a file problem and an area too long, each linked to its field", () => {
    const el = page(renderFileTime(ctx("en", { error: "not-json", file: undefined, shown: undefined })), "en");
    expect(el.querySelector("#ftm-errors a")?.getAttribute("href")).toBe(`#${TIME_TEXT_ID}`);
    const el2 = page(renderFileTime(ctx("fr", { areaError: true, shown: undefined, form: { step: "month", area: "x".repeat(70) } })), "fr");
    expect(el2.querySelector("#ftm-errors a")?.getAttribute("href")).toBe(`#${TIME_AREA_ID}`);
    const area = el2.querySelector(`#${TIME_AREA_ID}`);
    expect(area?.getAttribute("aria-invalid")).toBe("true");
    expect(area?.getAttribute("aria-describedby")).toBe(`h-${TIME_AREA_ID} e-${TIME_AREA_ID}`);
    expect(auditDom(el2, { locale: "fr" })).toEqual([]);
  });

  it("says when no place is in the area, with no tables", () => {
    const el = page(renderFileTime(ctx("en", { shown: { step: "month", area: "nowhere" } })), "en");
    expect(el.querySelector("#ftm-summary")?.textContent).toBe(C.noPlaces.en);
    expect(el.querySelector("table")).toBeNull();
  });

  it("says when no record is dated, keeping the table by detail", () => {
    const el = page(renderFileTime(ctx("fr", { shown: { step: "year", area: "cart" }, file: readOnly() })), "fr");
    expect(el.querySelector("#ftm-none")?.textContent).toBe(C.noDates.fr);
    expect(el.querySelector("#ftm-table")).toBeNull();
    expect(el.querySelector("#ftm-detail-table")).not.toBeNull();
    expect(el.querySelectorAll("a.linkbtn")).toHaveLength(0);
    expect(auditDom(el, { locale: "fr" })).toEqual([]);
  });
});

describe("the tables", () => {
  it("gives each period its counts, with a bar hidden from screen readers beside the share", () => {
    const el = page(renderTimeTable(fileTimeline(file(), "month", "", TODAY), "en"), "en");
    expect(cellsOf(el.querySelector("thead tr"))).toEqual([
      t(C.columns.period, "en"),
      t(C.columns.records, "en"),
      t(C.columns.firstRecords, "en"),
      t(C.columns.placesStarted, "en"),
      t(C.columns.recorded, "en"),
      t(C.columns.differing, "en"),
    ]);
    const rows = Array.from(el.querySelectorAll("tbody tr"));
    expect(cellsOf(rows[2])).toEqual(["March 2026", "2", "1", "0", "3 (25%)", "1"]);
    const bar = rows[2]?.querySelector(".ftm-bar");
    expect(bar?.getAttribute("aria-hidden")).toBe("true");
    expect(bar?.getAttribute("style")).toContain("width:2.00em");
    expect(el.querySelector(".table-wrap")?.getAttribute("tabindex")).toBe("0");
  });

  it("gives each detail its records, places and dates, saying none when there is none", () => {
    const el = page(renderDetailTable(fileTimeline(file(), "month", "", TODAY), "fr"), "fr");
    const rows = Array.from(el.querySelectorAll("tbody tr")).map(cellsOf);
    expect(rows.at(-1)).toEqual(["Ascenseur", "3", "2 (66\u202F%)", "2026-01-10", "2026-03-15"]);
    expect(rows[2]).toEqual(["Porte automatique", "0", "0 (0\u202F%)", "aucune", "aucune"]);
  });

  it("puts the same timeline in the printable download", () => {
    const el = page(renderFileTime(ctx()), "en");
    const text = decodeTextExportHref(el.querySelectorAll<HTMLAnchorElement>("a.linkbtn")[1]?.getAttribute("href") ?? "") ?? "";
    expect(text.startsWith("Records over time\nMade on 2026-11-21\n")).toBe(true);
  });
});

describe("the form", () => {
  it("keeps the step and area chosen, and reads them back", () => {
    const el = page(renderFileTime(ctx("en", { form: { step: "year", area: "King & Co" } })), "en");
    expect(el.querySelector<HTMLInputElement>(`#${stepId("year")}`)?.checked).toBe(true);
    expect(el.querySelector<HTMLInputElement>(`#${TIME_AREA_ID}`)?.value).toBe("King & Co");
    expect(readTimeForm(el, { step: "month", area: "" })).toEqual({ step: "year", area: "King & Co" });
    expect(readTimeForm(document.createElement("div"), { step: "month", area: "x" })).toEqual({ step: "month", area: "x" });
  });

  it("knows an area too long, after trimming", () => {
    expect(areaTooLong(` ${"a".repeat(60)} `)).toBe(false);
    expect(areaTooLong("a".repeat(61))).toBe(true);
  });
});

describe("the day", () => {
  it("asks for a day before one is shown, with no table", () => {
    const el = page(`<h2>T</h2>${renderDay(ctx(), file(), "")}`, "en");
    expect(el.querySelector(`#${TIME_DAY_ID}`)).not.toBeNull();
    expect(el.querySelector("#ftm-day-table")).toBeNull();
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("shows places in each state for each detail on that day, in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(`<h2>T</h2>${renderDay(ctx(l, { dayText: "2026-02-01", dayShown: "2026-02-01" }), file(), "")}`, l);
      const rows = Array.from(el.querySelectorAll("#ftm-day-table tbody tr")).map(cellsOf);
      expect(rows.at(-1)).toEqual([l === "en" ? "Elevator" : "Ascenseur", "2", "0", "0", "1"]);
      expect(cellsOf(el.querySelector("#ftm-day-table thead tr")).at(-1)).toBe(l === "en" ? "Unknown" : "UNKNOWN");
      expect(el.querySelector("#ftm-day-caption")?.textContent).toContain("(2026-02-01)");
      expect(auditDom(el, { locale: l }), l).toEqual([]);
    }
  });

  it("downloads the notes as they stood that day, for the places of the area", () => {
    const el = page(`<h2>T</h2>${renderDay(ctx("en", { dayShown: "2026-02-01" }), file(), "queen")}`, "en");
    const a = el.querySelector<HTMLAnchorElement>("a.linkbtn");
    expect(a?.getAttribute("download")).toBe("notes-as-of-2026-02-01.json");
    const json = decodeURIComponent((a?.getAttribute("href") ?? "").replace(/^data:[^,]*,/, ""));
    const back = importNotes(json);
    expect(back.notes.map((n) => n.id).sort()).toEqual(["b1", "b2"]);
    expect(back.notes.find((n) => n.id === "b2")?.facts.find((f) => f.key === "elevator")?.value).toBe("unknown");
  });

  it("marks a day problem and lists it in the error summary", () => {
    const el = page(renderFileTime(ctx("fr", { dayText: "demain", dayProblem: "not-date" })), "fr");
    expect(el.querySelector("#ftm-errors a")?.getAttribute("href")).toBe(`#${TIME_DAY_ID}`);
    expect(el.querySelector(`#${TIME_DAY_ID}`)?.getAttribute("aria-invalid")).toBe("true");
    expect(el.querySelector<HTMLInputElement>(`#${TIME_DAY_ID}`)?.value).toBe("demain");
    expect(auditDom(el, { locale: "fr" })).toEqual([]);
  });
});
