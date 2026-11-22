// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { DEFAULT_GRID, gridRows, type GridFilter } from "./answergrid";
import { auditDom } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { FILE_GRID_COPY as C, gridErrorText } from "./filegrid-copy";
import { readStreetFile, type StreetFile } from "./filestreets";
import { testNote } from "./testnotes";
import {
  FIND_ID,
  GOTO_ID,
  columnId,
  renderTicked,
  rowTickId,
  GRID_TEXT_ID,
  KEY_ID,
  SHOWN_ID,
  orderId,
  readFilter,
  renderBreakdown,
  renderFileGrid,
  renderFilter,
  renderResults,
  renderTable,
  type FileGridContext,
} from "./views-filegrid";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function file(n = 0, l: "en" | "fr" = "en"): StreetFile {
  const extra = Array.from({ length: n }, (_, i) => testNote(`p${i}`, `Place ${String(i).padStart(3, "0")}`, [], `${i + 1} A St`));
  const r = readStreetFile(
    exportNotes(
      [
        testNote("c1", "<b>Café</b>", [{ key: "elevator", value: "yes", on: "2026-01-05" }], "1 King St W"),
        testNote("b1", "Bakery", [{ key: "elevator", value: "yes" }], "2 King St W"),
        testNote("b2", "Bakery", [{ key: "elevator", value: "no", source: "Visit" }], "2 King St W"),
        testNote("k1", "Kiosk", [], null),
        ...extra,
      ],
      "2026-11-01",
    ),
    TODAY,
    l,
  );
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const rowsOf = (f: StreetFile, filter: GridFilter = DEFAULT_GRID, l: "en" | "fr" = "en") => gridRows(f, filter, l);

const ctx = (l: "en" | "fr" = "en", over: Partial<FileGridContext> = {}): FileGridContext => ({
  text: "",
  error: undefined,
  file: file(0, l),
  filter: DEFAULT_GRID,
  shownFilter: DEFAULT_GRID,
  rows: rowsOf(file(0, l), DEFAULT_GRID, l),
  page: 1,
  noColumns: false,
  gotoText: "",
  badPage: false,
  ticked: [],
  onlyTicked: false,
  locale: l,
  today: TODAY,
  statusMessage: undefined,
  ...over,
});

function page(inner: string, l: "en" | "fr"): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main"><h1>The App</h1><h2>Tool</h2><h3>Results</h3>${inner}</main>`;
  return document.body;
}

const cells = (tr: Element | null | undefined): string[] => Array.from(tr?.children ?? []).map((c) => c.textContent ?? "");

describe("renderTable", () => {
  it("has a caption, column headers and a row header for each place, with a cell for each detail", () => {
    const el = page(renderTable(rowsOf(file()), 1, "en"), "en");
    expect(el.querySelector("caption")?.textContent).toBe("Places 1 to 3 of 3");
    expect(Array.from(el.querySelectorAll("thead th")).every((th) => th.getAttribute("scope") === "col")).toBe(true);
    expect(cells(el.querySelector("thead tr"))).toEqual(["Place", "Step-free entrance", "Accessible washroom", "Automatic door", "Elevator", "Details with no record"]);
    // The person's own text is shown as text; "<" sorts before letters.
    expect(Array.from(el.querySelectorAll("tbody th[scope=row]")).map((th) => th.textContent)).toEqual(["<b>Café</b>1 King St W", "Bakery2 King St W", "KioskNo address"]);
    expect(cells(el.querySelectorAll("tbody tr")[1])).toEqual(["Bakery2 King St W", "Unknown", "Unknown", "Unknown", "Reports differ, 2026-10-01, 2 sources", "3"]);
    expect(cells(el.querySelector("tbody tr")).slice(4)).toEqual(["Yes, 2026-01-05, 1 source", "3"]);
    expect(el.querySelector("nav")).toBeNull();
    expect(el.querySelector("b")).toBeNull();
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("shows a page at a time with previous and next buttons, the ends disabled", () => {
    const rows = rowsOf(file(30));
    const first = page(renderTable(rows, 1, "en"), "en");
    expect(first.querySelector("caption")?.textContent).toBe("Places 1 to 25 of 33");
    expect(first.querySelector("nav")?.getAttribute("aria-label")).toBe(C.pagesLabel.en);
    expect(first.querySelector("#fgr-page")?.textContent).toBe("Page 1 of 2");
    expect(first.querySelector<HTMLButtonElement>('[data-action="fgr-prev"]')?.disabled).toBe(true);
    expect(first.querySelector<HTMLButtonElement>('[data-action="fgr-next"]')?.disabled).toBe(false);
    expect(auditDom(first, { locale: "en" })).toEqual([]);
    const last = page(renderTable(rows, 2, "fr"), "fr");
    expect(last.querySelector("caption")?.textContent).toBe("Lieux 26 à 33 sur 33");
    expect(last.querySelectorAll("tbody tr")).toHaveLength(8);
    expect(last.querySelector<HTMLButtonElement>('[data-action="fgr-next"]')?.disabled).toBe(true);
    expect(auditDom(last, { locale: "fr" })).toEqual([]);
  });

  it("says when no place matches, with no table", () => {
    const el = page(renderTable([], 1, "en"), "en");
    expect(el.querySelector("#fgr-none")?.textContent).toBe(C.noRows.en);
    expect(el.querySelector("table")).toBeNull();
  });

  it("writes UNKNOWN in French cells and passes the App's audit", () => {
    const el = page(renderTable(rowsOf(file(0, "fr"), DEFAULT_GRID, "fr"), 1, "fr"), "fr");
    expect(el.querySelector("tbody td")?.textContent).toBe("UNKNOWN");
    expect(el.textContent).not.toMatch(/inconnu/i);
    expect(auditDom(el, { locale: "fr" })).toEqual([]);
  });
});

describe("columns and the page box", () => {
  it("shows only the details chosen as columns, counting no record among them", () => {
    const el = page(renderTable(rowsOf(file()), 1, "en", ["elevator"]), "en");
    expect(cells(el.querySelector("thead tr"))).toEqual(["Place", "Elevator", "Details with no record"]);
    expect(cells(el.querySelectorAll("tbody tr")[2])).toEqual(["KioskNo address", "Unknown", "1"]);
  });

  it("offers a page box with the pages, and marks a number that is not a page", () => {
    const rows = rowsOf(file(30));
    const el = page(renderTable(rows, 1, "en", undefined, { text: "7", bad: true }), "en");
    const box = el.querySelector<HTMLInputElement>(`#${GOTO_ID}`);
    expect(box?.value).toBe("7");
    expect(box?.getAttribute("aria-invalid")).toBe("true");
    expect(box?.getAttribute("aria-describedby")).toBe(`e-${GOTO_ID}`);
    expect(el.querySelector(`#e-${GOTO_ID}`)?.textContent).toBe("Write a page number from 1 to 2.");
    expect(auditDom(el, { locale: "en" })).toEqual([]);
    expect(page(renderTable(rowsOf(file()), 1, "en"), "en").querySelector(`#${GOTO_ID}`)).toBeNull();
  });

  it("shows the column choices, ties the no-column problem to them, and links each problem from the summary", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFileGrid(ctx(l, { filter: { ...DEFAULT_GRID, columns: [] }, noColumns: true, rows: undefined, shownFilter: undefined })), l);
      expect(el.querySelector("#e-fgr-columns")?.closest("fieldset")?.getAttribute("aria-describedby")).toBe("e-fgr-columns");
      expect(el.querySelector("#fgr-errors a")?.getAttribute("href")).toBe(`#${columnId("step-free-entry")}`);
      expect(el.querySelector<HTMLInputElement>(`#${columnId("elevator")}`)?.checked).toBe(false);
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
    const bad = page(renderFileGrid(ctx("en", { rows: rowsOf(file(30)), badPage: true, gotoText: "9" })), "en");
    expect(bad.querySelector("#fgr-errors a")?.getAttribute("href")).toBe(`#${GOTO_ID}`);
    expect(bad.querySelector("#fgr-errors a")?.textContent).toBe("Write a page number from 1 to 2.");
  });
});

describe("ticking places", () => {
  it("gives each row a tick box with a 44 pixel label whose name says which place", () => {
    const f = file();
    const kiosk = f.places.find((p) => p.name === "Kiosk");
    if (!kiosk) throw new Error("no place");
    const el = page(renderTable(rowsOf(f), 1, "en", undefined, undefined, [kiosk.id]), "en");
    const box = el.querySelector<HTMLInputElement>(`#${rowTickId(kiosk.id)}`);
    expect(box?.checked).toBe(true);
    expect(box?.getAttribute("aria-label")).toBe("Choose Kiosk, No address");
    expect(box?.closest("label")?.style.minHeight).toBe("44px");
    expect(el.querySelectorAll('input[data-action="fgr-tick"]:checked')).toHaveLength(1);
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("downloads the notes of the places ticked, or says how ticking works", () => {
    const f = file();
    const ids = f.places.filter((p) => p.name !== "Kiosk").map((p) => p.id);
    const el = page(renderTicked(f, ids, TODAY, "en"), "en");
    const a = el.querySelector<HTMLAnchorElement>('a[download="notes-2-places-2026-11-21.json"]');
    expect(a?.textContent).toBe("Download the notes of the 2 places ticked");
    const back = importNotes(decodeURIComponent((a?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, "")));
    expect(back.notes.map((n) => n.id).sort()).toEqual(["b1", "b2", "c1"]);
    expect(el.querySelector('[data-action="fgr-untick-all"]')?.textContent).toBe(C.untickAll.en);
    expect(page(renderTicked(f, [], TODAY, "fr"), "fr").querySelector("#fgr-ticked")?.textContent).toBe(C.tickedHint.fr);
  });

  it("offers to show only the places ticked once a place is ticked", () => {
    expect(page(renderFilter(ctx()), "en").querySelector("#fgr-only-ticked")).toBeNull();
    const el = page(renderFilter(ctx("fr", { ticked: ["x"], onlyTicked: true })), "fr");
    const box = el.querySelector<HTMLInputElement>("#fgr-only-ticked");
    expect(box?.checked).toBe(true);
    expect(box?.closest("label")?.textContent).toBe(C.onlyTicked.fr);
    expect(auditDom(el, { locale: "fr" })).toEqual([]);
  });

  it("offers any detail shown as a column in the narrowing list", () => {
    const el = page(renderFilter(ctx("en", { filter: { ...DEFAULT_GRID, key: "any" } })), "en");
    expect(el.querySelector<HTMLSelectElement>(`#${KEY_ID}`)?.value).toBe("any");
    expect(el.querySelector<HTMLSelectElement>(`#${KEY_ID}`)?.options[1]?.textContent).toBe(C.anyColumn.en);
    expect(readFilter(el).key).toBe("any");
  });
});

describe("renderBreakdown and renderResults", () => {
  it("counts each answer for each detail", () => {
    const el = page(renderBreakdown(rowsOf(file()), "en"), "en");
    expect(Array.from(el.querySelectorAll(".fgr-breakdown li")).map((li) => li.textContent)).toEqual([
      "Step-free entrance: 0 Yes, 0 No, 3 Unknown, 0 where reports differ.",
      "Accessible washroom: 0 Yes, 0 No, 3 Unknown, 0 where reports differ.",
      "Automatic door: 0 Yes, 0 No, 3 Unknown, 0 where reports differ.",
      "Elevator: 1 Yes, 0 No, 1 Unknown, 1 where reports differ.",
    ]);
  });

  it("counts the breakdown over the places matching the name or address, not narrowed by the detail", () => {
    const f: GridFilter = { ...DEFAULT_GRID, key: "elevator", shown: "yes" };
    const el = page(renderResults(ctx(), file(), rowsOf(file(), f), f), "en");
    expect(el.querySelector("#fgr-summary")?.textContent).toBe("1 place matches.");
    expect(el.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(el.querySelectorAll(".fgr-breakdown li")[3]?.textContent).toBe("Elevator: 1 Yes, 0 No, 1 Unknown, 1 where reports differ.");
  });

  it("downloads the rows shown as a table and their notes", () => {
    const f: GridFilter = { ...DEFAULT_GRID, text: "king" };
    const el = page(renderResults(ctx(), file(), rowsOf(file(), f), f), "en");
    const csv = decodeURIComponent((el.querySelector('a[download="table-2-places-2026-11-21.csv"]')?.getAttribute("href") ?? "").replace(/^data:text\/csv;charset=utf-8,/, ""));
    expect(csv.split("\r\n")).toHaveLength(4);
    expect(el.querySelector('a[download="places-2-2026-11-21.txt"]')).not.toBeNull();
    const notes = el.querySelector('a[download="notes-2-places-2026-11-21.json"]');
    const back = importNotes(decodeURIComponent((notes?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, "")));
    expect(back.notes.map((n) => n.id).sort()).toEqual(["b1", "b2", "c1"]);
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("offers no download when no place matches", () => {
    const f: GridFilter = { ...DEFAULT_GRID, text: "nowhere" };
    const el = page(renderResults(ctx(), file(), rowsOf(file(), f), f), "en");
    expect(el.querySelector("a.linkbtn")).toBeNull();
    expect(el.querySelector("#fgr-summary")?.textContent).toBe(C.noRows.en);
  });
});

describe("renderFilter", () => {
  it("shows the filter as chosen and reads it back", () => {
    const f: GridFilter = { text: "king", key: "elevator", shown: "differ", order: "newest", columns: ["automatic-door", "elevator"] };
    const el = page(renderFilter(ctx("en", { filter: f })), "en");
    expect(el.querySelector<HTMLInputElement>(`#${FIND_ID}`)?.value).toBe("king");
    expect(el.querySelector<HTMLSelectElement>(`#${KEY_ID}`)?.value).toBe("elevator");
    expect(el.querySelector<HTMLSelectElement>(`#${SHOWN_ID}`)?.value).toBe("differ");
    expect(el.querySelector<HTMLInputElement>(`#${orderId("newest")}`)?.checked).toBe(true);
    expect(readFilter(el)).toEqual(f);
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("offers any detail first, and names the answers in French with UNKNOWN", () => {
    const el = page(renderFilter(ctx("fr")), "fr");
    expect(el.querySelector<HTMLSelectElement>(`#${KEY_ID}`)?.options[0]?.textContent).toBe(C.anyKey.fr);
    expect(Array.from(el.querySelector<HTMLSelectElement>(`#${SHOWN_ID}`)?.options ?? []).map((o) => o.textContent)).toEqual(["Oui", "Non", "UNKNOWN", "Rapports divergents"]);
    for (const label of Array.from(el.querySelectorAll<HTMLLabelElement>("label.choice"))) expect(label.style.minHeight).toBe("44px");
    expect(auditDom(el, { locale: "fr" })).toEqual([]);
  });
});

describe("renderFileGrid", () => {
  it("shows only the file form before a file is read", () => {
    const el = page(renderFileGrid(ctx("en", { file: undefined, rows: undefined, shownFilter: undefined })), "en");
    expect(el.querySelector("#fgr-filter-form")).toBeNull();
    expect(el.querySelector('[data-action="fgr-clear"]')?.textContent).toBe("Remove the file from the page");
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("links a file error to the box, in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFileGrid(ctx(l, { file: undefined, rows: undefined, error: "not-json", text: "{" })), l);
      expect(el.querySelector("#fgr-errors a")?.getAttribute("href")).toBe(`#${GRID_TEXT_ID}`);
      expect(el.querySelector("#fgr-errors a")?.textContent).toBe(gridErrorText("not-json", l));
      expect(el.querySelector(`#${GRID_TEXT_ID}`)?.getAttribute("aria-invalid")).toBe("true");
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });

  it("shows the filter and the table, in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFileGrid(ctx(l, { statusMessage: C.opened[l] })), l);
      expect(el.querySelector("#fgr-status")?.textContent).toBe(C.opened[l]);
      expect(el.querySelector("#fgr-filter-form")).not.toBeNull();
      expect(el.querySelectorAll("#fgr-table tbody tr")).toHaveLength(3);
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });
});
