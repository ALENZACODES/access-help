// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { auditDom } from "./audit";
import { exportNotes } from "./exchange";
import { readSheet, type Sheet } from "./filesheet";
import { readStreetFile, type StreetFile } from "./filestreets";
import { checkList, readEntries } from "./placelist";
import { testNote } from "./testnotes";
import {
  ADDRESS_COL_ID,
  LICENCE_ID,
  LIST_TEXT_ID,
  NAME_COL_ID,
  NOTES_TEXT_ID,
  decisionId,
  listResults,
  problemTarget,
  readColumns,
  readDecisions,
  renderColumns,
  renderDecide,
  renderFileList,
  renderMatch,
  type FileListContext,
} from "./views-filelist";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function file(): StreetFile {
  const r = readStreetFile(exportNotes([testNote("a", "<b>Library</b>", [], "100 King St W"), testNote("b", "Old Shop", [], "40 King St W")], "2026-11-01"), TODAY, "en");
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

function sheet(text = "Name,Address\n<b>Library</b>,100 King St W\nNew Bakery,40 King St W\nPharmacy,7 Elm Ave"): Sheet {
  const r = readSheet(text);
  if (!r.ok) throw new Error(r.error);
  return r.sheet;
}

const ctx = (l: "en" | "fr" = "en", over: Partial<FileListContext> = {}): FileListContext => ({
  notesText: "",
  listText: "",
  notesError: undefined,
  listError: undefined,
  file: file(),
  sheet: sheet(),
  columns: { name: 0, address: 1 },
  licence: "CC0-1.0",
  problems: [],
  decisions: {},
  locale: l,
  today: TODAY,
  statusMessage: undefined,
  ...over,
});

function page(inner: string, l: "en" | "fr"): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main"><h1>The App</h1>${inner}</main>`;
  return document.body;
}

describe("renderFileList", () => {
  it("shows every status with its places, escaped, and passes the App's audit in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFileList(ctx(l)), l);
      expect(el.querySelector("b")).toBeNull();
      expect(el.querySelector(".fpl-found li")?.textContent).toBe(l === "en" ? "Row 2 <b>Library</b>, 100 King St W0 of 4 details recorded" : "Ligne 2 <b>Library</b>, 100 King St W0 détail sur 4 noté");
      expect(el.querySelector(".fpl-same-address li li")?.textContent).toContain("Old Shop, 40 King St W");
      expect(el.querySelector(".fpl-missing li")?.textContent).toContain("Pharmacy, 7 Elm Ave");
      expect(Array.from(el.querySelectorAll("a.linkbtn")).map((a) => a.getAttribute("download"))).toHaveLength(4);
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });

  it("shows no results before both the notes and the list are read", () => {
    document.body.innerHTML = renderFileList(ctx("en", { file: undefined }));
    expect(document.querySelector("#fpl-columns-form")).toBeNull();
    document.body.innerHTML = renderFileList(ctx("en", { sheet: undefined }));
    expect(document.querySelector("#fpl-summary")).toBeNull();
  });

  it("links both boxes' errors and each columns problem from the summary", () => {
    document.body.innerHTML = renderFileList(ctx("en", { notesError: "not-json", listError: "no-rows", problems: ["same", "licence"] }));
    expect(Array.from(document.querySelectorAll("#fpl-errors a")).map((a) => a.getAttribute("href"))).toEqual([`#${NOTES_TEXT_ID}`, `#${LIST_TEXT_ID}`, `#${ADDRESS_COL_ID}`, `#${LICENCE_ID}`]);
    expect(document.getElementById(LIST_TEXT_ID)?.getAttribute("aria-describedby")).toBe(`h-${LIST_TEXT_ID} e-${LIST_TEXT_ID}`);
  });

  it("leaves out the starter and found downloads when there is nothing to put in them", () => {
    const el = page(renderFileList(ctx("en", { sheet: sheet("Name,Address\nPharmacy,7 Elm Ave") })), "en");
    expect(Array.from(el.querySelectorAll("a.linkbtn")).map((a) => a.getAttribute("download"))).toEqual([
      "starter-notes-2026-11-21.json",
      "list-check-2026-11-21.csv",
      "list-check-2026-11-21.txt",
      "notes-not-on-your-list-2026-11-21.json",
    ]);
    const all = page(renderFileList(ctx("en", { sheet: sheet("Name,Address\n<b>Library</b>,100 King St W") })), "en");
    expect(Array.from(all.querySelectorAll("a.linkbtn")).map((a) => a.getAttribute("download"))).toEqual([
      "notes-on-your-list-2026-11-21.json",
      "list-check-2026-11-21.csv",
      "list-check-2026-11-21.txt",
      "notes-not-on-your-list-2026-11-21.json",
    ]);
  });
});

describe("answers for the same address", () => {
  it("asks about each pair, Not sure by default, and passes the App's audit in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const raw = listResults(ctx(l))?.raw;
      if (!raw) throw new Error("no results");
      const el = page(`<h2>List</h2>${renderDecide(raw, {}, l)}`, l);
      expect(el.querySelectorAll("#fpl-decide-form fieldset")).toHaveLength(1);
      expect(el.querySelector<HTMLInputElement>(`#${decisionId(3, "unsure")}`)?.checked).toBe(true);
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
    expect(renderDecide({ matches: [], notInList: [] }, {}, "en")).toBe("");
  });

  it("moves a pair the person answered, and says so beside it", () => {
    const same = page(renderFileList(ctx("en", { decisions: { 3: "same" } })), "en");
    expect(same.querySelector<HTMLInputElement>(`#${decisionId(3, "same")}`)?.checked).toBe(true);
    expect(same.querySelector('.fpl-found li[data-row="3"]')?.textContent).toContain("You said this is the same place.");
    expect(same.querySelector("#fpl-summary")?.textContent).toContain("2 with notes, 0 at the same address");
    const different = page(renderFileList(ctx("en", { decisions: { 3: "different" } })), "en");
    expect(different.querySelector('.fpl-missing li[data-row="3"]')?.textContent).toContain("You said these are different places.");
    expect(Array.from(different.querySelectorAll("a.linkbtn")).map((a) => a.getAttribute("download"))).toContain("starter-notes-2026-11-21.json");
  });

  it("reads the answers on the page, keeping answers for rows not on it", () => {
    const raw = listResults(ctx())?.raw;
    if (!raw) throw new Error("no results");
    document.body.innerHTML = renderDecide(raw, {}, "en");
    (document.getElementById(decisionId(3, "different")) as HTMLInputElement).checked = true;
    expect(readDecisions(document.body, { 9: "same" })).toEqual({ 3: "different", 9: "same" });
  });
});

describe("renderColumns", () => {
  it("offers every column, and no address column, with the choices selected", () => {
    const el = page(`<h2>List</h2>${renderColumns(ctx("en", { columns: { name: 1, address: -1 } }), sheet())}`, "en");
    expect(Array.from(el.querySelectorAll(`#${NAME_COL_ID} option`)).map((o) => o.textContent)).toEqual(["Column 1: Name", "Column 2: Address"]);
    expect(el.querySelector<HTMLSelectElement>(`#${NAME_COL_ID}`)?.value).toBe("1");
    expect(el.querySelector<HTMLSelectElement>(`#${ADDRESS_COL_ID}`)?.value).toBe("-1");
  });

  it("ties each problem to its field and passes the App's audit in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(`<h2>List</h2>${renderColumns(ctx(l, { columns: { name: 1, address: 1 }, problems: ["same"] }), sheet())}`, l);
      expect(el.querySelector(`#${ADDRESS_COL_ID}`)?.getAttribute("aria-invalid")).toBe("true");
      expect(el.querySelector(`#${ADDRESS_COL_ID}`)?.getAttribute("aria-describedby")).toBe(`e-${ADDRESS_COL_ID}`);
      expect(el.querySelector(`#${NAME_COL_ID}`)?.hasAttribute("aria-invalid")).toBe(false);
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });
});

describe("helpers", () => {
  it("sends each problem to its field", () => {
    expect(problemTarget("name")).toBe(NAME_COL_ID);
    expect(problemTarget("same")).toBe(ADDRESS_COL_ID);
    expect(problemTarget("licence")).toBe(LICENCE_ID);
  });

  it("has no results with a problem or with no usable entries", () => {
    expect(listResults(ctx())).toBeDefined();
    expect(listResults(ctx("en", { problems: ["name"] }))).toBeUndefined();
    expect(listResults(ctx("en", { sheet: sheet("Name,Address\n,1 A St") }))).toBeUndefined();
  });

  it("shows a missing place on its own line", () => {
    const m = checkList(readEntries(sheet("Name\nKiosk"), { name: 0, address: -1 }), file()).matches[0];
    if (!m) throw new Error("no match");
    document.body.innerHTML = `<ul>${renderMatch(m, "en")}</ul>`;
    expect(document.querySelector("li")?.textContent).toBe("Row 2 Kiosk, No address");
  });

  it("reads the chosen columns and licence, or keeps them when the page has none", () => {
    document.body.innerHTML = renderColumns(ctx(), sheet());
    (document.getElementById(NAME_COL_ID) as HTMLSelectElement).value = "1";
    (document.getElementById(ADDRESS_COL_ID) as HTMLSelectElement).value = "-1";
    (document.getElementById(LICENCE_ID) as HTMLSelectElement).value = "ODbL-1.0";
    expect(readColumns(document.body, { name: 0, address: 1 }, "CC0-1.0")).toEqual({ columns: { name: 1, address: -1 }, licence: "ODbL-1.0" });
    document.body.innerHTML = "";
    expect(readColumns(document.body, { name: 0, address: 1 }, "CC0-1.0")).toEqual({ columns: { name: 0, address: 1 }, licence: "CC0-1.0" });
  });
});
