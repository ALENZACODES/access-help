// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { auditDom } from "./audit";
import { exportNotes } from "./exchange";
import { compareFiles, type FileComparison } from "./filecompare";
import { FILE_COMPARE_COPY as C } from "./filecompare-copy";
import { testNote } from "./testnotes";
import { FILTER_ID, TEXT_ID, renderFileCompare, renderFileErrors, renderGlance, renderPlaceComparison, renderTotals, type FileCompareContext } from "./views-filecompare";

const TODAY = new Date(Date.UTC(2026, 10, 20));

function comparison(a: Parameters<typeof testNote>[], b: Parameters<typeof testNote>[], l: "en" | "fr" = "en"): FileComparison {
  const r = compareFiles(exportNotes(a.map((n) => testNote(...n)), "2026-11-01"), exportNotes(b.map((n) => testNote(...n)), "2026-11-02"), l);
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.comparison;
}

function ctx(c: FileComparison | undefined, l: "en" | "fr" = "en", extra: Partial<FileCompareContext> = {}): FileCompareContext {
  return { textA: "", textB: "", errors: [], comparison: c, onlyDiffering: false, locale: l, today: TODAY, statusMessage: undefined, ...extra };
}

function page(inner: string, l: "en" | "fr"): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main"><h1>The App</h1>${inner}</main>`;
  return document.body;
}

/** A place block sits under the page's h2 and the "Places in both files" h3. */
const inResults = (html: string): string => `<h2>Compare</h2><h3>Places</h3>${html}`;

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("renderFileErrors", () => {
  it("is empty without errors", () => {
    expect(renderFileErrors([], "en")).toBe("");
  });

  it("links each error to its box", () => {
    const html = renderFileErrors([{ side: "b", code: "no-notes" }], "en");
    const el = page(html, "en");
    expect(el.querySelector("#fc-errors")?.getAttribute("role")).toBe("alert");
    expect(el.querySelector("#fc-errors a")?.getAttribute("href")).toBe(`#${TEXT_ID.b}`);
  });
});

describe("tables", () => {
  const c = comparison(
    [["a1", "Library", [{ key: "elevator", value: "yes" }]], ["a2", "Arena", [], "5 Rink Rd"]],
    [["b1", "Library", [{ key: "elevator", value: "no" }]]],
  );

  it("gives the glance table a caption, scoped headers and a labelled scroll region", () => {
    const el = page(renderGlance(c, "en"), "en");
    expect(el.querySelector("caption")?.textContent).toBe(C.glanceCaption.en);
    expect(Array.from(el.querySelectorAll("thead th")).every((th) => th.getAttribute("scope") === "col")).toBe(true);
    expect(Array.from(el.querySelectorAll("tbody th")).every((th) => th.getAttribute("scope") === "row")).toBe(true);
    const wrap = el.querySelector(".table-wrap");
    expect(wrap?.getAttribute("tabindex")).toBe("0");
    expect(wrap?.getAttribute("aria-labelledby")).toBe("fc-glance-caption");
  });

  it("counts every detail of the shared places once in the totals", () => {
    const el = page(renderTotals(c, "en"), "en");
    const counts = Array.from(el.querySelectorAll('td[data-col="count"]')).map((td) => Number(td.textContent));
    expect(counts.reduce((a, b) => a + b, 0)).toBe(4);
    expect(el.querySelector('tr[data-status="different-answers"] td')?.textContent).toBe("1");
  });
});

describe("renderPlaceComparison", () => {
  it("builds a comparison table the App's audit accepts, with one row per detail", () => {
    const c = comparison([["a", "Library", [{ key: "elevator", value: "yes" }]]], [["b", "Library", [{ key: "elevator", value: "no" }, { key: "automatic-door", value: "yes" }]]]);
    const p = c.both[0];
    if (!p) throw new Error("no place");
    const el = page(inResults(renderPlaceComparison(p, 0, "en", TODAY)), "en");
    const table = el.querySelector("table.compare");
    expect(table?.querySelectorAll("tbody tr")).toHaveLength(4);
    expect(Array.from(table?.querySelectorAll("tbody tr") ?? []).every((tr) => tr.querySelectorAll("td").length === 2)).toBe(true);
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("lists every report, each with its source, licence and date, when a file holds reports that differ", () => {
    const c = comparison(
      [["a1", "Library", [{ key: "elevator", value: "yes" }]], ["a2", "Library", [{ key: "elevator", value: "no", source: "Owner", on: "2026-10-20" }]]],
      [["b", "Library", []]],
    );
    const p = c.both[0];
    if (!p) throw new Error("no place");
    const el = page(inResults(renderPlaceComparison(p, 0, "fr", TODAY)), "fr");
    const cell = el.querySelector('tr[data-key="elevator"] td[data-side="a"]');
    expect(cell?.querySelector("strong")?.textContent).toBe("Rapports divergents");
    const items = Array.from(cell?.querySelectorAll("li") ?? []).map((li) => li.textContent ?? "");
    expect(items).toHaveLength(2);
    for (const li of items) expect(li).toMatch(/Source.*Licence.*Saisi le \d{4}-\d{2}-\d{2}/);
    expect(auditDom(el, { locale: "fr" })).toEqual([]);
  });

  it("says when file B gives another name or address", () => {
    const c = comparison([["a", "Café Central", [], "1 Main St"]], [["b", "CAFE CENTRAL", [], "1 main st"]]);
    const p = c.both[0];
    if (!p) throw new Error("no place");
    const el = page(renderPlaceComparison(p, 3, "en", TODAY), "en");
    const text = el.textContent ?? "";
    expect(text).toContain("File B names it “CAFE CENTRAL”.");
    expect(text).toContain("File B gives the address 1 main st.");
    expect(el.querySelector("h4")?.id).toBe("fc-place-3");
    expect(el.querySelector("caption")?.id).toBe("fc-cap-3");
  });

  it("escapes names and addresses from a file", () => {
    const evil = '<img src=x onerror="alert(1)">';
    const c = comparison([["a", evil, [], null]], [["b", evil, [], null]]);
    const p = c.both[0];
    if (!p) throw new Error("no place");
    const el = page(inResults(renderPlaceComparison(p, 0, "en", TODAY)), "en");
    expect(el.querySelector("img")).toBeNull();
    expect(el.querySelector("h4")?.textContent).toBe(evil);
  });

  it("marks the file's own text so the French checks skip it", () => {
    const c = comparison([["a", "Bistro: Chez Léa!", [], null]], [["b", "Bistro: Chez Léa!", [], null]], "fr");
    const p = c.both[0];
    if (!p) throw new Error("no place");
    const el = page(inResults(renderPlaceComparison(p, 0, "fr", TODAY)), "fr");
    expect(el.querySelector("h4 [data-user-content]")).not.toBeNull();
    expect(auditDom(el, { locale: "fr" }).filter((v) => v.rule === "french-typography")).toEqual([]);
  });
});

describe("renderFileCompare", () => {
  it("shows no results before a comparison", () => {
    const el = page(renderFileCompare(ctx(undefined)), "en");
    expect(el.querySelector("#fc-results")).toBeNull();
    expect(el.querySelector(`#${FILTER_ID}`)).toBeNull();
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("puts the filter in a 44px label and keeps it ticked", () => {
    const c = comparison([["a", "Library", [{ key: "elevator", value: "yes" }]]], [["b", "Library", []]]);
    const el = page(renderFileCompare(ctx(c, "en", { onlyDiffering: true })), "en");
    const box = el.querySelector<HTMLInputElement>(`#${FILTER_ID}`);
    expect(box?.checked).toBe(true);
    expect(box?.closest("label.choice")?.getAttribute("style")).toContain("min-height:44px");
  });

  it("keeps the boxes' text, escaped", () => {
    const el = page(renderFileCompare(ctx(undefined, "en", { textA: "</textarea><b>x</b>", textB: "b" })), "en");
    expect(el.querySelector<HTMLTextAreaElement>(`#${TEXT_ID.a}`)?.value).toBe("</textarea><b>x</b>");
    expect(el.querySelector("b")).toBeNull();
  });

  it("has unique ids across a whole page of results, in both languages", () => {
    const c = comparison(
      [["a1", "Library", [{ key: "elevator", value: "yes" }]], ["a2", "Pool", [], "9 Lake Rd"], ["a3", "Arena", [], "5 Rink Rd"]],
      [["b1", "Library", [{ key: "elevator", value: "no" }]], ["b2", "Pool", [], "9 Lake Rd"], ["b3", "Rink", [], "5 Rink Rd"]],
    );
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFileCompare(ctx(c, l, { statusMessage: "x" })), l);
      expect(auditDom(el, { locale: l })).toEqual([]);
      const ids = Array.from(el.querySelectorAll("[id]")).map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
