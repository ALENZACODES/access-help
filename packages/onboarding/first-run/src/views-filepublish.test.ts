// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { auditDom } from "./audit";
import { exportNotes } from "./exchange";
import { FILE_PUBLISH_COPY as C, publishProblemText } from "./filepublish-copy";
import { readStreetFile, type StreetFile } from "./filestreets";
import { parseNote } from "./model";
import { DATASET_COLUMNS, type PublishOptions } from "./publishpack";
import { testNote } from "./testnotes";
import { decodeTextExportHref } from "./textexport";
import {
  AREA_ID,
  NOTE_TEXT_ID,
  PUBLISH_TEXT_ID,
  TITLE_ID,
  UNKNOWN_ID,
  languageId,
  layoutId,
  licenceId,
  problemTarget,
  readPublishForm,
  renderChecks,
  renderDataset,
  renderFilePublish,
  startOptions,
  type FilePublishContext,
} from "./views-filepublish";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const OPTS: PublishOptions = { title: "", language: "en", withUnknown: false, withNoteText: false, layout: "records", area: "", licences: undefined };

function file(): StreetFile {
  const withText = parseNote({ ...testNote("a", "<b>Library</b>", [{ key: "elevator", value: "yes" }], "100 King St W"), note: "Side door" });
  if (!withText) throw new Error("bad note");
  const r = readStreetFile(exportNotes([withText, testNote("c", "Cart", [], null)], "2026-11-01"), TODAY, "en");
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const ctx = (l: "en" | "fr" = "en", over: Partial<FilePublishContext> = {}): FilePublishContext => ({
  text: "",
  error: undefined,
  file: file(),
  form: OPTS,
  problems: [],
  prepared: OPTS,
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

const hrefs = (el: ParentNode): string[] => Array.from(el.querySelectorAll<HTMLAnchorElement>("a.linkbtn")).map((a) => a.getAttribute("href") ?? "");

describe("renderFilePublish", () => {
  it("starts with no title, the page's language and nothing extra", () => {
    expect(startOptions("fr")).toEqual({ title: "", language: "fr", withUnknown: false, withNoteText: false, layout: "records", area: "", licences: undefined });
  });

  it("shows only the file form before a file is read, and passes the audit", () => {
    const el = page(renderFilePublish(ctx("en", { file: undefined, prepared: undefined })), "en");
    expect(el.querySelector("#fpb-publish-form")).toBeNull();
    expect(el.querySelector("#fpb-checks")).toBeNull();
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("shows the checks and the form once a file is read, and the dataset once prepared, passing the audit in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const before = page(renderFilePublish(ctx(l, { prepared: undefined })), l);
      expect(before.querySelectorAll("#fpb-check-list li").length).toBeGreaterThan(1);
      expect(before.querySelector("#fpb-results")).toBeNull();
      expect(auditDom(before, { locale: l }), l).toEqual([]);
      const el = page(renderFilePublish(ctx(l)), l);
      expect(el.querySelector("#fpb-results")?.textContent).toBe(`${C.resultsTitle[l]} (1)`);
      expect(el.querySelectorAll("a.linkbtn")).toHaveLength(2);
      expect(el.querySelector("main b")).toBeNull();
      expect(auditDom(el, { locale: l }), l).toEqual([]);
    }
  });

  it("names a file problem, linked to the box", () => {
    const el = page(renderFilePublish(ctx("en", { error: "not-json", file: undefined, prepared: undefined })), "en");
    expect(el.querySelector("#fpb-errors a")?.getAttribute("href")).toBe(`#${PUBLISH_TEXT_ID}`);
  });

  it("marks the title and the note text box with their problems, linked from the summary", () => {
    const el = page(renderFilePublish(ctx("fr", { prepared: undefined, form: { ...OPTS, title: "a\tb", withNoteText: true }, problems: ["title-control", "personal-text"] })), "fr");
    expect(Array.from(el.querySelectorAll("#fpb-errors a")).map((a) => a.getAttribute("href"))).toEqual([`#${TITLE_ID}`, `#${NOTE_TEXT_ID}`]);
    expect(el.querySelector(`#e-${NOTE_TEXT_ID}`)?.textContent).toBe(publishProblemText("personal-text", "fr"));
    expect(el.querySelector(`#${NOTE_TEXT_ID}`)?.getAttribute("aria-describedby")).toBe(`h-${NOTE_TEXT_ID} e-${NOTE_TEXT_ID}`);
    expect(el.querySelector(`#${TITLE_ID}`)?.getAttribute("aria-invalid")).toBe("true");
    expect(auditDom(el, { locale: "fr" })).toEqual([]);
    expect(problemTarget("title-long")).toBe(TITLE_ID);
  });
});

describe("the dataset", () => {
  it("downloads the CSV and the text, and shows the text behind a disclosure", () => {
    const el = page(renderDataset(ctx(), file(), { ...OPTS, title: "Ward 4" }), "en");
    const [csvHref, textHref] = hrefs(el);
    const csv = decodeURIComponent((csvHref ?? "").replace(/^data:[^,]*,/, ""));
    expect(csv.slice(1).split("\r\n")[0]).toBe(DATASET_COLUMNS.join(","));
    expect(csv).toContain(",<b>Library</b>,100 King St W,elevator,yes,");
    const text = decodeTextExportHref(textHref ?? "") ?? "";
    expect(text.split("\n")[0]).toBe("Ward 4");
    expect(el.querySelector("#fpb-readme")?.textContent).toBe(text);
    expect(el.querySelectorAll("a.linkbtn")[0]?.getAttribute("download")).toBe("accessibility-dataset-2026-11-21.csv");
  });

  it("adds unknown rows and note text when chosen", () => {
    const el = page(renderDataset(ctx(), file(), { ...OPTS, withUnknown: true, withNoteText: true }), "en");
    const csv = decodeURIComponent((hrefs(el)[0] ?? "").replace(/^data:[^,]*,/, ""));
    expect(csv.split("\r\n")[0]?.endsWith(",note_id,note_text")).toBe(true);
    expect(csv).toContain(",Side door\r\n");
    expect(csv.split("\r\n").filter((r) => r.includes(",unknown,"))).toHaveLength(7);
  });

  it("lists the checks for the file", () => {
    const el = page(`<h2>T</h2>${renderChecks(file(), TODAY, "en")}`, "en");
    expect(Array.from(el.querySelectorAll("#fpb-check-list li")).map((x) => x.textContent)).toEqual([
      "2 places, 2 notes, 1 Yes or No record from 2026-10-01 to 2026-10-01.",
      "7 details have no record.",
      "1 note has its own text.",
      "1 place has no address.",
    ]);
  });
});

describe("the form", () => {
  it("keeps the choices and reads them back, keeping the fallback for a language it does not know", () => {
    const el = page(renderFilePublish(ctx("en", { prepared: undefined, form: { ...OPTS, title: "Ward & 4", language: "both", withUnknown: true } })), "en");
    expect(el.querySelector<HTMLInputElement>(`#${languageId("both")}`)?.checked).toBe(true);
    expect(el.querySelector<HTMLInputElement>(`#${UNKNOWN_ID}`)?.checked).toBe(true);
    expect(readPublishForm(el, OPTS)).toEqual({ ...OPTS, title: "Ward & 4", language: "both", withUnknown: true });
    expect(readPublishForm(document.createElement("div"), OPTS)).toEqual(OPTS);
  });
});

describe("layout, area and licences", () => {
  it("ticks every licence of the file to start, and reads every box ticked as every licence", () => {
    const el = page(renderFilePublish(ctx("en", { prepared: undefined })), "en");
    expect(el.querySelector<HTMLInputElement>(`#${licenceId(0)}`)?.checked).toBe(true);
    expect(readPublishForm(el, OPTS).licences).toBeUndefined();
  });

  it("reads the layout, area and licences chosen", () => {
    const el = page(renderFilePublish(ctx("en", { prepared: undefined })), "en");
    el.querySelector<HTMLInputElement>(`#${layoutId("places")}`)?.click();
    const area = el.querySelector<HTMLInputElement>(`#${AREA_ID}`);
    if (area) area.value = "King";
    el.querySelector<HTMLInputElement>(`#${licenceId(0)}`)?.click();
    expect(readPublishForm(el, OPTS)).toMatchObject({ layout: "places", area: "King", licences: [] });
  });

  it("marks the area and the licences with their problems, linked from the summary", () => {
    const el = page(renderFilePublish(ctx("fr", { prepared: undefined, form: { ...OPTS, area: "x".repeat(61), licences: [] }, problems: ["area-long", "no-licence"] })), "fr");
    expect(Array.from(el.querySelectorAll("#fpb-errors a")).map((a) => a.getAttribute("href"))).toEqual([`#${AREA_ID}`, `#${licenceId(0)}`]);
    expect(el.querySelector(`#${AREA_ID}`)?.getAttribute("aria-invalid")).toBe("true");
    expect(el.querySelector(`#${licenceId(0)}`)?.getAttribute("aria-describedby")).toBe("h-fpb-licences e-fpb-licences");
    expect(el.querySelector<HTMLInputElement>(`#${licenceId(0)}`)?.checked).toBe(false);
    expect(auditDom(el, { locale: "fr" })).toEqual([]);
  });

  it("downloads one row for each place when chosen, and counts places in the heading", () => {
    const el = page(renderDataset(ctx(), file(), { ...OPTS, layout: "places", withUnknown: true }), "en");
    expect(el.querySelector("#fpb-results")?.textContent).toBe(`${C.resultsTitle.en} (2)`);
    const csv = decodeURIComponent((hrefs(el)[0] ?? "").replace(/^data:[^,]*,/, ""));
    expect(csv.slice(1).split("\r\n")[0]?.startsWith("place_id,place_name,address,step-free-entry,step-free-entry_records")).toBe(true);
  });
});
