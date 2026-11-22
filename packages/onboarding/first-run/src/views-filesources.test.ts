// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { auditDom } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { FACT_KEYS } from "./facts";
import { FILE_SOURCES_COPY as C, sourcesErrorText } from "./filesources-copy";
import { readStreetFile, type StreetFile } from "./filestreets";
import { DEFAULT_SOURCES, sourceOverlap, sourceReport, type SourceReport } from "./sourcecover";
import { testNote } from "./testnotes";
import { decodeTextExportHref } from "./textexport";
import {
  ALONE_TITLE_ID,
  FIRST_ID,
  SECOND_ID,
  renderCompare,
  SOURCES_TEXT_ID,
  keyBoxId,
  orderId,
  readOptions,
  renderAlone,
  renderFileSources,
  renderOptions,
  renderResults,
  renderTable,
  showId,
  type FileSourcesContext,
} from "./views-filesources";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function file(l: "en" | "fr" = "en"): StreetFile {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("a", "<b>Café</b>", [{ key: "elevator", value: "yes", on: "2026-01-05" }, { key: "automatic-door", value: "no" }], "1 A St"),
        testNote("b", "<b>Café</b>", [{ key: "elevator", value: "yes", source: "Contributor report", on: "2026-09-01" }], "1 A St"),
        testNote("c", "Kiosk", [{ key: "step-free-entry", value: "yes", source: "<i>Visit</i>", licence: "CC-BY-4.0" }], null),
      ],
      "2026-11-01",
    ),
    TODAY,
    l,
  );
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const report = (l: "en" | "fr" = "en", keys = DEFAULT_SOURCES.keys): SourceReport => sourceReport(file(l), { ...DEFAULT_SOURCES, keys }, l);

const ctx = (l: "en" | "fr" = "en", over: Partial<FileSourcesContext> = {}): FileSourcesContext => ({
  text: "",
  error: undefined,
  file: file(l),
  form: DEFAULT_SOURCES,
  noKeys: false,
  report: report(l),
  openSource: undefined,
  pair: undefined,
  sameSource: false,
  overlap: undefined,
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

const cells = (tr: Element | null | undefined): string[] => Array.from(tr?.children ?? []).map((c) => c.textContent ?? "");

describe("renderTable", () => {
  it("has a caption, column headers and a row header for each source", () => {
    const el = page(`<h3>Sources</h3>${renderTable(report(), ctx())}`, "en");
    expect(el.querySelector("caption")?.textContent).toBe(C.tableCaption.en);
    expect(Array.from(el.querySelectorAll("thead th")).every((th) => th.getAttribute("scope") === "col")).toBe(true);
    expect(cells(el.querySelector("thead tr"))).toEqual(["Source", "Records", "Places", "Answers shown from it", "Answers resting on it alone", "Days recorded", "Licences used", "List"]);
    expect(Array.from(el.querySelectorAll("tbody th[scope=row]")).map((th) => th.textContent)).toEqual(["City survey", "<i>Visit</i>", "Contributor report"]);
    expect(cells(el.querySelector("tbody tr")).slice(0, 7)).toEqual(["City survey", "2", "1", "1", "1", "2026-01-05 to 2026-10-01", "CC0-1.0"]);
    expect(el.querySelector("i")).toBeNull();
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("gives a button only to sources with answers resting on them alone, each naming its source", () => {
    const el = page(`<h3>Sources</h3>${renderTable(report(), ctx("en", { openSource: "City survey" }))}`, "en");
    const buttons = Array.from(el.querySelectorAll("tbody button"));
    expect(buttons.map((b) => [b.id, b.textContent, b.getAttribute("aria-expanded")])).toEqual([
      [showId(0), "Show the answers that rest on City survey alone (1)", "true"],
      [showId(1), "Show the answers that rest on <i>Visit</i> alone (1)", "false"],
    ]);
    expect(el.querySelectorAll("tbody tr")[2]?.querySelector("button")).toBeNull();
  });

  it("names a contributor's reports in French and passes the App's audit", () => {
    const el = page(`<h3>Sources</h3>${renderTable(report("fr"), ctx("fr"))}`, "fr");
    expect(el.textContent).toContain("Rapport d’un contributeur");
    expect(el.querySelector("tbody tr td:nth-of-type(5)")?.textContent).toBe("du 2026-01-05 au 2026-10-01");
    expect(auditDom(el, { locale: "fr" })).toEqual([]);
  });
});

describe("renderAlone", () => {
  it("lists the places and details that rest on the source alone, with a download of their notes", () => {
    const el = page(`<h3>Sources</h3>${renderAlone(file(), report(), "City survey", ctx())}`, "en");
    expect(el.querySelector(`#${ALONE_TITLE_ID}`)?.textContent).toBe("Answers that rest on City survey alone (1)");
    expect(el.querySelector(".fsr-alone h4")?.textContent).toBe("<b>Café</b>");
    expect(el.querySelector(".fsr-alone ul li")?.textContent).toBe("Automatic door: No");
    const a = el.querySelector<HTMLAnchorElement>('a[download="notes-only-city-survey-2026-11-21.json"]');
    const back = importNotes(decodeURIComponent((a?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, "")));
    expect(back.notes.map((n) => n.id).sort()).toEqual(["a", "b"]);
    expect(el.querySelector('[data-action="fsr-close"]')?.textContent).toBe(C.closeAlone.en);
    expect(el.querySelector("b")).toBeNull();
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("says when a place has no address, and passes the App's audit in French", () => {
    const el = page(`<h3>Sources</h3>${renderAlone(file("fr"), report("fr"), "<i>Visit</i>", ctx("fr"))}`, "fr");
    expect(el.querySelector(".fsr-alone p")?.textContent).toBe("Aucune adresse");
    expect(el.querySelector(".fsr-alone ul li")?.textContent).toBe("Entrée sans marche\u00A0: Oui");
    expect(auditDom(el, { locale: "fr" })).toEqual([]);
  });

  it("shows nothing for a source with no answer resting on it alone", () => {
    expect(renderAlone(file(), report(), "Contributor report", ctx())).toBe("");
  });
});

describe("renderResults and renderOptions", () => {
  it("gives the summary, the downloads and the table", () => {
    const el = page(renderResults(ctx(), file(), report()), "en");
    expect(el.querySelector("#fsr-results")?.textContent).toBe(C.resultsTitle.en);
    expect(el.querySelector("#fsr-summary")?.textContent).toBe("3 sources. 3 answers: 2 rest on one source alone, 1 on two sources or more.");
    const csv = decodeURIComponent((el.querySelector('a[download="sources-2026-11-21.csv"]')?.getAttribute("href") ?? "").replace(/^data:text\/csv;charset=utf-8,/, ""));
    expect(csv.split("\r\n")).toHaveLength(5);
    expect(decodeTextExportHref(el.querySelector('a[download="sources-2026-11-21.txt"]')?.getAttribute("href") ?? "")).toContain("City survey\n    Records: 2\n");
    expect(el.querySelector(".hint")?.textContent).toBe(C.shownHint.en);
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("shows only the summary when no source has a record for the details chosen", () => {
    const el = page(renderResults(ctx(), file(), report("en", ["accessible-washroom"])), "en");
    expect(el.querySelector("#fsr-summary")?.textContent).toBe(C.noSources.en);
    expect(el.querySelector("table")).toBeNull();
    expect(el.querySelector("a.linkbtn")).toBeNull();
  });

  it("shows the chosen options, reads them back, and gives each a 44 pixel label", () => {
    const el = page(renderOptions(ctx("en", { form: { keys: ["elevator", "automatic-door"], order: "alone" } })), "en");
    expect(el.querySelector<HTMLInputElement>(`#${orderId("alone")}`)?.checked).toBe(true);
    expect(readOptions(el)).toEqual({ keys: ["automatic-door", "elevator"], order: "alone" });
    for (const label of Array.from(el.querySelectorAll<HTMLLabelElement>("label.choice"))) expect(label.style.minHeight).toBe("44px");
    for (const i of Array.from(el.querySelectorAll<HTMLInputElement>('input[type="radio"]'))) i.checked = false;
    expect(readOptions(el).order).toBe("records");
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("ties the no-detail problem to its group, in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderOptions(ctx(l, { form: { ...DEFAULT_SOURCES, keys: [] }, noKeys: true })), l);
      expect(el.querySelector("#e-fsr-keys")?.closest("fieldset")?.getAttribute("aria-describedby")).toBe("e-fsr-keys");
      expect(FACT_KEYS.some((k) => el.querySelector<HTMLInputElement>(`#${keyBoxId(k)}`)?.checked)).toBe(false);
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });
});

describe("renderCompare", () => {
  it("offers every source in both lists with the pair chosen, and passes the App's audit in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderCompare(report(l), ctx(l, { pair: ["City survey", "Contributor report"] })), l);
      const first = el.querySelector<HTMLSelectElement>(`#${FIRST_ID}`);
      const second = el.querySelector<HTMLSelectElement>(`#${SECOND_ID}`);
      expect(Array.from(first?.options ?? []).map((o) => o.value)).toEqual(["City survey", "<i>Visit</i>", "Contributor report"]);
      expect([first?.value, second?.value]).toEqual(["City survey", "Contributor report"]);
      expect(first?.style.minHeight).toBe("44px");
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });

  it("names the problem when the same source is chosen twice", () => {
    const el = page(renderCompare(report(), ctx("en", { pair: ["City survey", "City survey"], sameSource: true })), "en");
    expect(el.querySelector(`#${SECOND_ID}`)?.getAttribute("aria-invalid")).toBe("true");
    expect(el.querySelector(`#${SECOND_ID}`)?.getAttribute("aria-describedby")).toBe(`h-fsr-compare e-${SECOND_ID}`);
    expect(el.querySelector(`#e-${SECOND_ID}`)?.textContent).toBe(C.sameSource.en);
    expect(page(renderFileSources(ctx("en", { pair: ["City survey", "City survey"], sameSource: true })), "en").querySelector("#fsr-errors a")?.getAttribute("href")).toBe(`#${SECOND_ID}`);
  });

  it("shows the comparison and each place where the answers differ", () => {
    const result = sourceOverlap(file(), "City survey", "Contributor report", DEFAULT_SOURCES.keys, "en");
    const el = page(renderCompare(report(), ctx("en", { pair: ["City survey", "Contributor report"], overlap: { a: "City survey", b: "Contributor report", result } })), "en");
    expect(el.querySelector("#fsr-overlap")?.textContent).toBe("City survey and Contributor report both answer 1 detail: the same answer for 1, different answers for 0.");
    expect(el.querySelector(".fsr-overlap")).toBeNull();
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("is offered only when there are two sources or more", () => {
    expect(page(renderResults(ctx(), file(), report()), "en").querySelector("#fsr-compare-form")).not.toBeNull();
    const one = report("en", ["automatic-door"]);
    expect(page(renderResults(ctx("en", { report: one }), file(), one), "en").querySelector("#fsr-compare-form")).toBeNull();
  });
});

describe("renderFileSources", () => {
  it("shows only the file form before a file is read", () => {
    const el = page(renderFileSources(ctx("en", { file: undefined, report: undefined })), "en");
    expect(el.querySelector("#fsr-options-form")).toBeNull();
    expect(el.querySelector('[data-action="fsr-clear"]')?.textContent).toBe("Remove the file from the page");
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("links a file error to the box, and the no-detail problem to the first detail", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFileSources(ctx(l, { file: undefined, report: undefined, error: "not-json", text: "{" })), l);
      expect(el.querySelector("#fsr-errors a")?.getAttribute("href")).toBe(`#${SOURCES_TEXT_ID}`);
      expect(el.querySelector("#fsr-errors a")?.textContent).toBe(sourcesErrorText("not-json", l));
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
    const el = page(renderFileSources(ctx("en", { form: { ...DEFAULT_SOURCES, keys: [] }, noKeys: true, report: undefined })), "en");
    expect(el.querySelector("#fsr-errors a")?.getAttribute("href")).toBe(`#${keyBoxId("step-free-entry")}`);
  });

  it("shows the options, the sources and an open list, in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFileSources(ctx(l, { openSource: "City survey", statusMessage: C.opened[l] })), l);
      expect(el.querySelector("#fsr-status")?.textContent).toBe(C.opened[l]);
      expect(el.querySelector("#fsr-table + #fsr-alone")).not.toBeNull();
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });
});
