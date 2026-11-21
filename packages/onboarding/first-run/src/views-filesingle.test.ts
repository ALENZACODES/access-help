// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { auditDom } from "./audit";
import { fileSingle } from "./corroboration";
import { exportNotes, importNotes } from "./exchange";
import { FACT_KEYS } from "./facts";
import { FILE_SINGLE_COPY as C } from "./filesingle-copy";
import { readStreetFile, type StreetFile } from "./filestreets";
import { testNote } from "./testnotes";
import {
  SINGLE_AREA_ID,
  SINGLE_TEXT_ID,
  START_CHOICE,
  KEYS_TARGET,
  areaTooLong,
  keyId,
  modeId,
  readSingleForm,
  renderCounts,
  renderDifferDownload,
  renderFileSingle,
  renderPairs,
  renderSingle,
  renderSources,
  type FileSingleContext,
} from "./views-filesingle";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function fileOf(list = [
  testNote("a1", "<b>Library</b>", [{ key: "elevator", value: "yes" }, { key: "automatic-door", value: "yes" }], "100 King St W"),
  testNote("a2", "<b>Library</b>", [{ key: "automatic-door", value: "yes", source: "<i>Visit</i>" }], "100 King St W"),
  testNote("b", "Bank", [{ key: "elevator", value: "no", source: "<i>Visit</i>" }], null),
]): StreetFile {
  const r = readStreetFile(exportNotes(list, "2026-11-01"), TODAY, "en");
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const ctx = (l: "en" | "fr" = "en", over: Partial<FileSingleContext> = {}): FileSingleContext => ({
  text: "",
  error: undefined,
  file: fileOf(),
  form: START_CHOICE,
  areaError: false,
  keysError: false,
  shown: START_CHOICE,
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

const rows = (el: ParentNode, id: string): string[][] => Array.from(el.querySelectorAll(`#${id} tbody tr`)).map((r) => Array.from(r.querySelectorAll("th,td")).map((c) => c.textContent ?? ""));

describe("renderFileSingle", () => {
  it("starts with details that have one report, for the whole file", () => {
    expect(START_CHOICE).toEqual({ mode: "report", area: "", keys: FACT_KEYS });
  });

  it("shows only the file form before a file is read, and passes the audit", () => {
    const el = page(renderFileSingle(ctx("en", { file: undefined, shown: undefined })), "en");
    expect(el.querySelector("#fsg-show-form")).toBeNull();
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("shows counts, downloads, places, sources and pairs, escaped, passing the audit in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFileSingle(ctx(l)), l);
      expect(rows(el, "fsg-counts").map((r) => r[1])).toEqual(["2", "0", "1"]);
      expect(el.querySelectorAll("a.linkbtn")).toHaveLength(3);
      expect(Array.from(el.querySelectorAll('ul[aria-labelledby="fsg-places-title"] > li > span:first-child')).map((x) => x.textContent)).toEqual(["<b>Library</b>", "Bank"]);
      expect(rows(el, "fsg-sources")).toEqual([
        ["<i>Visit</i>", "1", "2"],
        ["City survey", "1", "2"],
      ]);
      expect(rows(el, "fsg-pairs")).toEqual([["<i>Visit</i>", "City survey", "1", "1", "0"]]);
      expect(el.querySelector("main b, main i")).toBeNull();
      expect(auditDom(el, { locale: l }), l).toEqual([]);
    }
  });

  it("names a file problem and an area too long, each linked to its field", () => {
    const el = page(renderFileSingle(ctx("en", { error: "not-json", file: undefined, shown: undefined })), "en");
    expect(el.querySelector("#fsg-errors a")?.getAttribute("href")).toBe(`#${SINGLE_TEXT_ID}`);
    const el2 = page(renderFileSingle(ctx("fr", { areaError: true, shown: undefined, form: { ...START_CHOICE, mode: "source", area: "x".repeat(61) } })), "fr");
    expect(el2.querySelector("#fsg-errors a")?.getAttribute("href")).toBe(`#${SINGLE_AREA_ID}`);
    expect(el2.querySelector(`#${SINGLE_AREA_ID}`)?.getAttribute("aria-invalid")).toBe("true");
    expect(el2.querySelector<HTMLInputElement>(`#${modeId("source")}`)?.checked).toBe(true);
    expect(auditDom(el2, { locale: "fr" })).toEqual([]);
  });

  it("says when no place is in the area", () => {
    const el = page(renderSingle(ctx(), fileOf(), { ...START_CHOICE, mode: "report", area: "nowhere" }), "en");
    expect(el.querySelector("#fsg-summary")?.textContent).toBe(C.noPlaces.en);
  });

  it("says when nothing is listed, in words for the mode, with no downloads", () => {
    const both = fileOf([
      testNote("x1", "Kiosk", [{ key: "elevator", value: "yes" }], "1 Elm St"),
      testNote("x2", "Kiosk", [{ key: "elevator", value: "yes", source: "Visit" }], "1 Elm St"),
    ]);
    for (const mode of ["report", "source"] as const) {
      const el = page(renderSingle(ctx(), both, { ...START_CHOICE, mode }), "en");
      expect(el.querySelector("#fsg-none")?.textContent).toBe(C.noneListed[mode].en);
      expect(el.querySelectorAll("a.linkbtn")).toHaveLength(0);
    }
  });
});

describe("parts", () => {
  it("names each backing in the counts table", () => {
    const el = page(renderCounts(fileSingle(fileOf(), "report", ""), "fr"), "fr");
    expect(rows(el, "fsg-counts").map((r) => r[0])).toEqual([C.backings["one-report"].fr, C.backings["one-source"].fr, C.backings.several.fr]);
  });

  it("leaves out the sources table when there is no record, and says when no pair of sources meets", () => {
    const none = fileSingle(fileOf([testNote("c", "Cart", [], "1 Elm St")]), "report", "");
    expect(renderSources(none, "en")).toBe("");
    const el = page(`<h2>T</h2><h3>R</h3>${renderPairs(fileSingle(fileOf([testNote("s", "Solo", [{ key: "elevator", value: "yes" }], "1 Elm St")]), "report", ""), "en")}`, "en");
    expect(el.querySelector("#fsg-no-pairs")?.textContent).toBe(C.noPairs.en);
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("downloads the notes of the places listed", () => {
    const el = page(renderSingle(ctx(), fileOf(), START_CHOICE), "en");
    const json = decodeURIComponent((el.querySelectorAll<HTMLAnchorElement>("a.linkbtn")[1]?.getAttribute("href") ?? "").replace(/^data:[^,]*,/, ""));
    expect(importNotes(json).notes.map((n) => n.id).sort()).toEqual(["a1", "a2", "b"]);
  });
});

describe("the form", () => {
  it("reads the form back, keeping the fallback for a mode it does not know", () => {
    const el = page(renderFileSingle(ctx("en", { form: { ...START_CHOICE, mode: "source", area: "King & Co" } })), "en");
    expect(readSingleForm(el, START_CHOICE)).toEqual({ mode: "source", area: "King & Co", keys: FACT_KEYS });
    expect(readSingleForm(document.createElement("div"), { ...START_CHOICE, mode: "source", area: "x" })).toEqual({ ...START_CHOICE, mode: "source", area: "x" });
  });

  it("knows an area too long, after trimming", () => {
    expect(areaTooLong(` ${"a".repeat(60)} `)).toBe(false);
    expect(areaTooLong("a".repeat(61))).toBe(true);
  });
});

describe("where two sources differ", () => {
  it("lists each pair's differences behind a disclosure, escaped, passing the audit", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFileSingle(ctx(l, { file: fileOf([
        testNote("x1", "<b>Kiosk</b>", [{ key: "elevator", value: "yes" }], "1 Elm St"),
        testNote("x2", "<b>Kiosk</b>", [{ key: "elevator", value: "no", source: "Visit" }], "1 Elm St"),
      ]) })), l);
      expect(el.querySelector(".fsg-differ summary")?.textContent).toBe(l === "en" ? "Where City survey and Visit differ (1)" : "Là où City survey et Visit diffèrent (1)");
      expect(el.querySelector(".fsg-differ li")?.textContent).toContain("<b>Kiosk</b>, 1 Elm St — ");
      expect(el.querySelector("main b")).toBeNull();
      expect(auditDom(el, { locale: l }), l).toEqual([]);
    }
  });

  it("shows no list for pairs that always agree", () => {
    const el = page(renderFileSingle(ctx()), "en");
    expect(el.querySelector(".fsg-differ")).toBeNull();
    expect(el.querySelector("#fsg-where-title")).toBeNull();
  });
});

describe("choosing the details", () => {
  it("ticks the details chosen, reads them back, and reads none when every box is clear", () => {
    const el = page(renderFileSingle(ctx("en", { form: { ...START_CHOICE, keys: ["elevator"] } })), "en");
    expect(el.querySelector<HTMLInputElement>(`#${keyId("elevator")}`)?.checked).toBe(true);
    expect(el.querySelector<HTMLInputElement>(`#${keyId("step-free-entry")}`)?.checked).toBe(false);
    expect(readSingleForm(el, START_CHOICE).keys).toEqual(["elevator"]);
    el.querySelector<HTMLInputElement>(`#${keyId("elevator")}`)?.click();
    expect(readSingleForm(el, START_CHOICE).keys).toEqual([]);
  });

  it("says to choose at least one, linked from the error summary to the first box", () => {
    const el = page(renderFileSingle(ctx("fr", { keysError: true, shown: undefined, form: { ...START_CHOICE, keys: [] } })), "fr");
    expect(el.querySelector("#fsg-errors a")?.getAttribute("href")).toBe(`#${KEYS_TARGET}`);
    expect(el.querySelector("#e-fsg-keys")?.textContent).toBe(C.keysEmpty.fr);
    expect(el.querySelector(`#${keyId("elevator")}`)?.getAttribute("aria-describedby")).toBe("e-fsg-keys");
    expect(auditDom(el, { locale: "fr" })).toEqual([]);
  });

  it("says which details the results are about when not all are chosen, and nothing when all are", () => {
    const fr = page(`<div lang="fr"><h2>T</h2>${renderSingle(ctx("fr"), fileOf(), { ...START_CHOICE, keys: ["elevator", "step-free-entry"] })}</div>`, "fr");
    expect(fr.querySelector("#fsg-keys")?.textContent).toBe("Détails à regarder\u00A0: Entrée sans marche, Ascenseur");
    expect(auditDom(fr, { locale: "fr" })).toEqual([]);
    expect(page(renderSingle(ctx(), fileOf(), START_CHOICE), "en").querySelector("#fsg-keys")).toBeNull();
  });

  it("shows only the details chosen", () => {
    const el = page(renderSingle(ctx(), fileOf(), { ...START_CHOICE, keys: ["automatic-door"] }), "en");
    expect(rows(el, "fsg-counts").map((r) => r[1])).toEqual(["0", "0", "1"]);
    expect(el.querySelector("#fsg-none")?.textContent).toBe(C.noneListed.report.en);
  });
});

describe("the download of where sources differ", () => {
  it("is offered only when two sources differ", () => {
    const differ = fileSingle(fileOf([
      testNote("x1", "Kiosk", [{ key: "elevator", value: "yes" }], "1 Elm St"),
      testNote("x2", "Kiosk", [{ key: "elevator", value: "no", source: "Visit" }], "1 Elm St"),
    ]), "report", "");
    const el = page(renderDifferDownload(differ, "report", TODAY, "en"), "en");
    const a = el.querySelector<HTMLAnchorElement>("a.linkbtn");
    expect(a?.getAttribute("download")).toBe("where-sources-differ-2026-11-21.csv");
    expect(decodeURIComponent((a?.getAttribute("href") ?? "").replace(/^data:[^,]*,/, ""))).toContain("Kiosk,1 Elm St,elevator,City survey,yes,2026-10-01,Visit,no,2026-10-01");
    const notesLink = el.querySelectorAll<HTMLAnchorElement>("a.linkbtn")[1];
    expect(notesLink?.getAttribute("download")).toBe("places-where-sources-differ-2026-11-21-notes.json");
    expect(importNotes(decodeURIComponent((notesLink?.getAttribute("href") ?? "").replace(/^data:[^,]*,/, ""))).notes.map((n) => n.id).sort()).toEqual(["x1", "x2"]);
    expect(renderDifferDownload(fileSingle(fileOf(), "report", ""), "report", TODAY, "en")).toBe("");
  });
});
