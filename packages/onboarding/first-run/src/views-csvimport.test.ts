// @vitest-environment jsdom
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { CSV_IMPORT_COPY, parseCsv, previewCsvImport, readFileText, type CsvPreview } from "./csvimport";
import { auditDom, groupPlaces, type Locale } from "./index";
import { notesToCsv } from "./notes-csv";
import { AXE_OPTIONS } from "./shelltest";
import { makeRng, randomNotes } from "./testkit";
import { PROBLEMS_SHOWN, renderCsvImport, renderCsvPreview } from "./views-csvimport";

const LATER = new Date(Date.UTC(2030, 0, 1));

function mount(html: string, l: Locale): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<div id="r"><a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main" lang="${l}"><h1>The App</h1>${html}</main></div>`;
  return document.getElementById("r") as HTMLElement;
}

/** A preview of random notes, half already here, with some rows broken on purpose. */
function randomPreview(seed: number): { preview: CsvPreview; here: ReturnType<typeof randomNotes> } {
  const rng = makeRng(seed);
  const notes = randomNotes(rng, 10);
  const here = notes.filter(() => rng() < 0.5);
  const lines = notesToCsv(notes).split("\r\n");
  const broken = lines.map((line, i) => (i > 0 && line !== "" && rng() < 0.15 ? line.replace(/,(yes|no),[^,]*,/, ",$1,,") : line));
  const r = previewCsvImport(here, broken.join("\r\n"), LATER);
  if (r.error !== undefined) throw new Error(r.error);
  return { preview: r, here };
}

describe("random previews", () => {
  it.each(["en", "fr"] as const)("render with the App's audit clean, ids unique and nothing undefined (%s)", (l) => {
    for (let seed = 1; seed <= 30; seed++) {
      const { preview, here } = randomPreview(seed);
      const leftOut = new Set(preview.notes.filter((_, i) => i % 3 === 0).map((n) => n.id));
      const root = mount(renderCsvImport({ text: "x", preview, message: undefined, locale: l, leftOut, places: groupPlaces(here, l) }), l);
      expect(auditDom(root, { locale: l }).map((v) => `${v.rule}: ${v.detail}`), `seed ${seed}`).toEqual([]);
      const ids = Array.from(root.querySelectorAll("[id]")).map((e) => e.id);
      expect(new Set(ids).size, `seed ${seed}`).toBe(ids.length);
      expect(root.textContent, `seed ${seed}`).not.toMatch(/undefined|NaN|\[object/);
      expect(root.querySelectorAll('[data-action="csv-choose"]:checked').length, `seed ${seed}`).toBe(preview.notes.length - leftOut.size);
      expect(root.querySelectorAll("tbody tr").length, `seed ${seed}`).toBe(Math.min(preview.problems.length, PROBLEMS_SHOWN));
    }
  });

  it("pass axe in both languages", async () => {
    const { preview, here } = randomPreview(4);
    for (const l of ["en", "fr"] as const) {
      mount(renderCsvImport({ text: "", preview, message: "Note", locale: l, places: groupPlaces(here, l) }), l);
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => `${v.id}: ${v.help}`), l).toEqual([]);
    }
  });
});

describe("a long list of rows not used", () => {
  it("shows the first ones and says how many more are in the download", () => {
    const rows = Array.from({ length: PROBLEMS_SHOWN + 7 }, (_, i) => `Place ${i},elevator,maybe`);
    const r = previewCsvImport([], ["place_name,detail,value", ...rows].join("\n"), LATER);
    if (r.error !== undefined) throw new Error(r.error);
    const en = mount(`<h2>x</h2>${renderCsvPreview(r, "en")}`, "en");
    expect(en.querySelectorAll("tbody tr")).toHaveLength(PROBLEMS_SHOWN);
    expect(en.textContent).toContain("And 7 more in the download.");
    expect(en.textContent).toContain(CSV_IMPORT_COPY.nothingToAdd.en);
    const fr = mount(`<h2>x</h2>${renderCsvPreview(r, "fr")}`, "fr");
    expect(fr.textContent).toContain("Et 7 de plus dans le téléchargement.");
    const href = fr.querySelector("[data-csv-fix]")?.getAttribute("href") ?? "";
    expect(decodeURIComponent(href.slice(href.indexOf(",") + 1)).split("\r\n").filter((x) => x !== "")).toHaveLength(1 + PROBLEMS_SHOWN + 7);
  });
});

describe("reading a chosen file", () => {
  it("uses FileReader where a file has no text() of its own", async () => {
    const blob = new Blob(["a,b\r\nc,d"], { type: "text/csv" });
    // With text() taken away, the file is read through FileReader.
    Object.defineProperty(blob, "text", { value: undefined });
    expect(typeof (blob as { text?: unknown }).text).toBe("undefined");
    expect(await readFileText(blob)).toBe("a,b\r\nc,d");
  });

  it("takes a lone carriage return as a line end, as older spreadsheets write", () => {
    expect(parseCsv("a,b\rc,d\r")).toEqual({ rows: [["a", "b"], ["c", "d"]] });
  });
});
