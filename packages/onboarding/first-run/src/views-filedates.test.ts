// @vitest-environment jsdom
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { auditDom } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { readStreetFile, type StreetFile } from "./filestreets";
import { futureRecords, recordId, type DateChoice, type DatesReport } from "./recorddates";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { decodeTextExportHref } from "./textexport";
import {
  DATES_TEXT_ID,
  choiceOf,
  groupName,
  isPick,
  keepId,
  readPicks,
  renderFileDates,
  renderRecord,
  renderSources,
  suggestionId,
  typedFieldId,
  typedId,
  unknownId,
  type DatePick,
  type FileDatesContext,
} from "./views-filedates";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function file(): StreetFile {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("a", "<b>Café</b>", [{ key: "elevator", value: "yes", on: "2026-12-05", source: "<i>walk</i>" }], "12 King St W"),
        testNote("b", "Kiosk", [{ key: "automatic-door", value: "no", on: "2099-01-01" }], null),
        testNote("c", "Park", [{ key: "elevator", value: "yes", on: "2026-01-01" }], "5 Park Ave"),
      ],
      "2026-11-01",
    ),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const ctx = (l: "en" | "fr" = "en", over: Partial<FileDatesContext> = {}): FileDatesContext => {
  const f = file();
  return {
    text: "",
    error: undefined,
    file: f,
    report: futureRecords(f, TODAY),
    picks: new Map(),
    typed: new Map(),
    typedErrors: new Map(),
    noneError: false,
    made: undefined,
    locale: l,
    today: TODAY,
    statusMessage: undefined,
    ...over,
  };
};

function host(html: string, l: "en" | "fr" = "en"): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main"><h1>The App</h1><div id="host">${html}</div></main>`;
  return document.getElementById("host") as HTMLElement;
}

const CAFE = recordId("a", "elevator");
const KIOSK = recordId("b", "automatic-door");

describe("the page before a file is read", () => {
  it("has the form, the privacy line and the remove control, with no results", () => {
    const root = host(renderFileDates(ctx("en", { file: undefined, report: undefined })));
    expect(root.querySelector("h2")?.textContent).toBe("Fix record dates");
    expect(root.querySelector(`#${DATES_TEXT_ID}`)?.getAttribute("aria-describedby")).toBe(`h-${DATES_TEXT_ID}`);
    expect(root.querySelector('[data-action="fdt-clear"]')?.textContent).toBe("Remove the file and the copy");
    expect(root.querySelector("#fdt-results")).toBeNull();
    expect(root.querySelector("#fdt-errors")).toBeNull();
  });

  it("links a file error to the box and marks it invalid", () => {
    const root = host(renderFileDates(ctx("en", { file: undefined, report: undefined, error: "not-json" })));
    expect(root.querySelector("#fdt-errors")?.getAttribute("role")).toBe("alert");
    expect(root.querySelector("#fdt-errors a")?.getAttribute("href")).toBe(`#${DATES_TEXT_ID}`);
    expect(root.querySelector(`#${DATES_TEXT_ID}`)?.getAttribute("aria-invalid")).toBe("true");
    expect(root.querySelector(`#${DATES_TEXT_ID}`)?.getAttribute("aria-describedby")).toBe(`h-${DATES_TEXT_ID} e-${DATES_TEXT_ID}`);
  });
});

describe("the records", () => {
  it("lists each record dated after today with its place, line and choices, escaping what the file holds", () => {
    const root = host(renderFileDates(ctx()));
    expect(root.querySelector("#fdt-results")?.textContent).toBe("Records dated after today (2)");
    expect(root.querySelector("#fdt-summary")?.textContent).toBe("3 places, 3 records: 2 are dated after today, 1 with a suggested date.");
    expect(root.querySelector("#fdt-record-0")?.textContent).toBe("<b>Café</b>, 12 King St W");
    expect(root.querySelector("#fdt-record-0 b")).toBeNull();
    expect(root.querySelector("#fdt-record-0 [data-user-content]")).not.toBeNull();
    expect(root.querySelector(".fdt-records li:first-child p")?.textContent).toBe("Elevator: Yes — <i>walk</i>, CC0-1.0, dated 2026-12-05");
    expect(Array.from(root.querySelectorAll(`input[name="${groupName(0)}"]`)).map((i) => (i as HTMLInputElement).value)).toEqual([
      "keep",
      "s:2026-05-12",
      "s:2025-12-05",
      "typed",
      "unknown",
    ]);
    expect(root.querySelector(`label[for="${suggestionId(0, 0)}"]`)?.textContent).toBe("Use 2026-05-12 (day and month swapped)");
    expect(root.querySelector(`#${keepId(0)}`)?.hasAttribute("checked")).toBe(true);
    expect(root.querySelector("fieldset legend")?.textContent).toBe("What to do with record 1");
  });

  it("says when no slip gives a date, for that record only", () => {
    const root = host(renderFileDates(ctx()));
    const kiosk = root.querySelectorAll(".fdt-records > li")[1];
    expect(kiosk?.querySelector(".hint")?.textContent).toBe("No plain typing slip gives a date on or before today.");
    expect(root.querySelectorAll(".fdt-records > li")[0]?.textContent).not.toContain("No plain typing slip");
  });

  it("offers the list as a CSV with the day in its name", () => {
    const root = host(renderFileDates(ctx()));
    const a = root.querySelector<HTMLAnchorElement>('a[download="records-dated-after-today-2026-11-21.csv"]');
    expect(a?.textContent).toBe("Download the list (CSV)");
    expect(a?.getAttribute("href")?.startsWith("data:text/csv")).toBe(true);
  });

  it("offers the list as text that matches what is on screen", () => {
    const root = host(renderFileDates(ctx()));
    const a = root.querySelector<HTMLAnchorElement>('a[download="records-dated-after-today-2026-11-21.txt"]');
    expect(a?.textContent).toBe("Download the list (text)");
    const text = decodeTextExportHref(a?.getAttribute("href") ?? "") ?? "";
    expect(text).toContain("1. <b>Café</b>, 12 King St W\n    Elevator: Yes — <i>walk</i>, CC0-1.0, dated 2026-12-05\n");
    expect(text).toContain("    Suggested: 2026-05-12 (day and month swapped)\n");
  });

  it("shows where the records come from, escaping the source", () => {
    const root = host(renderFileDates(ctx()));
    expect(root.querySelector("#fdt-sources")?.textContent).toBe("Where these records come from");
    expect(Array.from(root.querySelectorAll(".fdt-sources li")).map((li) => li.textContent)).toEqual([
      "<i>walk</i>: 1 record, 1 with a suggested date.",
      "City survey: 1 record, 0 with a suggested date.",
    ]);
    expect(root.querySelector(".fdt-sources i")).toBeNull();
    expect(renderSources({ places: 0, records: 0, future: [] }, "en")).toBe("");
  });

  it("says so when nothing is dated after today, with no form", () => {
    const f = file();
    const none: DatesReport = { places: 3, records: 3, future: [] };
    const root = host(renderFileDates(ctx("en", { file: f, report: none })));
    expect(root.querySelector("#fdt-none")?.textContent).toBe("No record in this file is dated after today.");
    expect(root.querySelector("#fdt-fix-form")).toBeNull();
  });

  it("shows the picks and typed dates it was given", () => {
    const root = host(
      renderFileDates(ctx("en", { picks: new Map<string, DatePick>([[CAFE, "s:2025-12-05"], [KIOSK, "typed"]]), typed: new Map([[KIOSK, "2026-01-02"]]) })),
    );
    expect(root.querySelector(`#${suggestionId(0, 1)}`)?.hasAttribute("checked")).toBe(true);
    expect(root.querySelector(`#${keepId(0)}`)?.hasAttribute("checked")).toBe(false);
    expect(root.querySelector(`#${typedId(1)}`)?.hasAttribute("checked")).toBe(true);
    expect(root.querySelector<HTMLInputElement>(`#${typedFieldId(1)}`)?.value).toBe("2026-01-02");
  });

  it("marks a typed date with a problem and links to it from the summary", () => {
    const root = host(renderFileDates(ctx("en", { picks: new Map<string, DatePick>([[KIOSK, "typed"]]), typed: new Map([[KIOSK, "2030-01-01"]]), typedErrors: new Map([[KIOSK, "after-today" as const]]) })));
    const field = root.querySelector(`#${typedFieldId(1)}`);
    expect(field?.getAttribute("aria-invalid")).toBe("true");
    expect(field?.getAttribute("aria-describedby")).toBe(`h-${typedFieldId(1)} e-${typedFieldId(1)}`);
    expect(root.querySelector(`#e-${typedFieldId(1)}`)?.textContent).toBe("Choose today or a day before it.");
    expect(Array.from(root.querySelectorAll("#fdt-errors a")).map((a) => [a.getAttribute("href"), a.textContent])).toEqual([
      [`#${typedFieldId(1)}`, "Date for record 2 — Choose today or a day before it."],
    ]);
  });

  it("links the nothing-changed problem to the first record's choices", () => {
    const root = host(renderFileDates(ctx("en", { noneError: true })));
    expect(root.querySelector("#fdt-errors a")?.getAttribute("href")).toBe(`#${keepId(0)}`);
  });

  it("shows the copy with its summary and download once made", () => {
    const made = new Map<string, DateChoice>([[CAFE, { kind: "date", date: "2025-12-05" }], [KIOSK, { kind: "unknown" }]]);
    const root = host(renderFileDates(ctx("en", { made })));
    expect(root.querySelector("#fdt-copy")?.textContent).toBe("Copy with the dates fixed");
    expect(root.querySelector("#fdt-copy-summary")?.textContent).toBe("1 record was given another date, 1 set back to Unknown, 0 kept with their date after today.");
    const href = root.querySelector('a[download="notes-dates-fixed-2026-11-21.json"]')?.getAttribute("href") ?? "";
    const back = importNotes(decodeURIComponent(href.replace(/^data:application\/json;charset=utf-8,/, "")));
    expect(back.notes).toHaveLength(3);
    expect(back.notes.find((n) => n.id === "b")?.facts.find((f) => f.key === "automatic-door")).toEqual({ key: "automatic-door", value: "unknown", provenance: undefined });
  });
});

describe("accessibility", () => {
  for (const l of ["en", "fr"] as const) {
    it(`has no axe or App audit problems with records, errors and a copy (${l})`, async () => {
      const made = new Map<string, DateChoice>([[CAFE, { kind: "date", date: "2025-12-05" }]]);
      const root = host(
        renderFileDates(ctx(l, { made, picks: new Map<string, DatePick>([[KIOSK, "typed"]]), typed: new Map([[KIOSK, "x"]]), typedErrors: new Map([[KIOSK, "not-date" as const]]), statusMessage: "ok" })),
        l,
      );
      expect(root.querySelector("#fdt-errors")).not.toBeNull();
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => v.id)).toEqual([]);
      expect(auditDom(document.body, { locale: l })).toEqual([]);
    });

    it(`has no axe problems before a file is read (${l})`, async () => {
      host(renderFileDates(ctx(l, { file: undefined, report: undefined, error: "empty" })), l);
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => v.id)).toEqual([]);
      expect(auditDom(document.body, { locale: l })).toEqual([]);
    });
  }

  it("gives every control a 44 by 44 target and a label", () => {
    const root = host(renderFileDates(ctx()));
    for (const label of Array.from(root.querySelectorAll("label.choice"))) expect(label.getAttribute("style")).toContain("min-height:44px;min-width:44px");
    for (const input of Array.from(root.querySelectorAll('input:not([type="radio"]), textarea'))) {
      expect(input.getAttribute("style"), input.id).toContain("min-height:44px");
      expect(root.querySelector(`label[for="${input.id}"]`), input.id).not.toBeNull();
    }
  });

  it("puts the French page in French with UNKNOWN for Unknown", () => {
    const root = host(renderFileDates(ctx("fr")), "fr");
    expect(root.querySelector("section")?.getAttribute("lang")).toBe("fr");
    expect(root.querySelector(`label[for="${unknownId(0)}"]`)?.textContent).toBe("Remettre le détail à UNKNOWN (retire cette donnée)");
    expect(root.textContent?.toLowerCase()).not.toContain("inconnu");
  });
});

describe("reading the choices", () => {
  it("reads the checked pick and typed date of each record, leaving out kept records and empty boxes", () => {
    const c = ctx();
    const root = host(renderFileDates(c));
    root.querySelector<HTMLInputElement>(`#${unknownId(0)}`)!.checked = true;
    root.querySelector<HTMLInputElement>(`#${typedFieldId(1)}`)!.value = "2026-02-03";
    const { picks, typed } = readPicks(root, c.report!);
    expect([...picks]).toEqual([[CAFE, "unknown"]]);
    expect([...typed]).toEqual([[KIOSK, "2026-02-03"]]);
  });

  it("knows which values are picks", () => {
    for (const v of ["keep", "typed", "unknown", "s:2026-01-01"]) expect(isPick(v)).toBe(true);
    for (const v of [undefined, "", "date", "S:2026-01-01"]) expect(isPick(v)).toBe(false);
  });

  it("turns a pick into a choice, refusing a bad typed date and a date it did not suggest", () => {
    const cafe = ctx().report!.future[0]!;
    expect(choiceOf(cafe, undefined, undefined, TODAY)).toEqual({ kind: "keep" });
    expect(choiceOf(cafe, "unknown", undefined, TODAY)).toEqual({ kind: "unknown" });
    expect(choiceOf(cafe, "s:2026-05-12", undefined, TODAY)).toEqual({ kind: "date", date: "2026-05-12" });
    expect(choiceOf(cafe, "s:2020-01-01", undefined, TODAY)).toEqual({ kind: "keep" });
    expect(choiceOf(cafe, "typed", " 2026-11-21 ", TODAY)).toEqual({ kind: "date", date: "2026-11-21" });
    expect(choiceOf(cafe, "typed", "2026-11-22", TODAY)).toBeUndefined();
    expect(choiceOf(cafe, "typed", undefined, TODAY)).toBeUndefined();
  });

  it("renders one record on its own with its index in the ids", () => {
    const c = ctx();
    const html = renderRecord(c.report!.future[1]!, 1, c);
    expect(html).toContain(`id="${typedFieldId(1)}"`);
    expect(html).toContain("What to do with record 2");
  });
});
