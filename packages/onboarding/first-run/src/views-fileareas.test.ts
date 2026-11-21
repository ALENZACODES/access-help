// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { DEFAULT_AREA, areaReport, type AreaReport } from "./areacover";
import { auditDom } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { FACT_KEYS } from "./facts";
import { FILE_AREAS_COPY as C, areasErrorText } from "./fileareas-copy";
import { readStreetFile, type StreetFile } from "./filestreets";
import { testNote } from "./testnotes";
import { decodeTextExportHref } from "./textexport";
import {
  AREAS_TEXT_ID,
  HIDE_FULL_ID,
  PLACES_TITLE_ID,
  byId,
  keyBoxId,
  orderId,
  readOptions,
  renderFileAreas,
  renderOptions,
  renderPlaces,
  renderResults,
  showId,
  renderTable,
  type FileAreasContext,
} from "./views-fileareas";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function file(l: "en" | "fr" = "en"): StreetFile {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("a", "<b>Café</b>", [{ key: "elevator", value: "yes" }], "12 King St W, Toronto ON M5V 1A1"),
        testNote("b", "Bakery", [], "14 King St W, Toronto ON M5V 1A2"),
        testNote("d1", "Diner", [{ key: "elevator", value: "yes" }], "30 Queen St E, M5C 1A1"),
        testNote("d2", "Diner", [{ key: "elevator", value: "no" }], "30 Queen St E, M5C 1A1"),
        testNote("k", "Kiosk", [], null),
      ],
      "2026-11-01",
    ),
    TODAY,
    l,
  );
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const report = (l: "en" | "fr" = "en", keys = DEFAULT_AREA.keys): AreaReport => areaReport(file(l), { ...DEFAULT_AREA, keys }, l);

const ctx = (l: "en" | "fr" = "en", over: Partial<FileAreasContext> = {}): FileAreasContext => ({
  text: "",
  error: undefined,
  file: file(l),
  form: DEFAULT_AREA,
  noKeys: false,
  report: report(l),
  openArea: undefined,
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

const cells = (tr: Element | null | undefined): string[] => Array.from(tr?.children ?? []).map((c) => c.textContent ?? "");

describe("renderTable", () => {
  it("has a caption, column headers and a row header for each area", () => {
    const el = page(`<h2>Areas</h2>${renderTable(report(), ctx())}`, "en");
    expect(el.querySelector("caption")?.textContent).toBe(C.tableCaption.en);
    expect(Array.from(el.querySelectorAll("thead th")).map((th) => th.getAttribute("scope"))).toEqual(Array(8).fill("col"));
    expect(cells(el.querySelector("thead tr"))).toEqual(["Area", "Places", "Details with no record", "Step-free entrance", "Accessible washroom", "Automatic door", "Elevator", "For the area"]);
    expect(Array.from(el.querySelectorAll("tbody th[scope=row]")).map((th) => th.textContent)).toEqual(["M5V", "M5C", "No area in the address"]);
    expect(cells(el.querySelectorAll("tbody tr")[1]).slice(0, 7)).toEqual(["M5C", "1", "3", "0 of 1", "0 of 1", "0 of 1", "1 of 1 (1 with reports that differ)"]);
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("has a column only for the chosen details", () => {
    const el = page(`<h2>Areas</h2>${renderTable(report("en", ["elevator"]), ctx())}`, "en");
    expect(cells(el.querySelector("thead tr"))).toEqual(["Area", "Places", "Details with no record", "Elevator", "For the area"]);
    expect(cells(el.querySelector("tbody tr")).slice(0, 4)).toEqual(["M5V", "2", "1", "1 of 2"]);
  });

  it("downloads each area's own notes under a link that names the area", () => {
    const el = page(`<h2>Areas</h2>${renderTable(report(), ctx())}`, "en");
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>("tbody a.linkbtn"));
    expect(Array.from(el.querySelectorAll("tbody button")).map((b) => [b.textContent, b.getAttribute("aria-expanded")])).toEqual([
      ["Show the places in M5V", "false"],
      ["Show the places in M5C", "false"],
      ["Show the places with no area", "false"],
    ]);
    expect(links.map((a) => [a.textContent, a.getAttribute("download")])).toEqual([
      ["Download notes for M5V (2 places)", "notes-area-m5v-2026-11-21.json"],
      ["Download notes for M5C (1 place)", "notes-area-m5c-2026-11-21.json"],
      ["Download notes for the places with no area (1 place)", "notes-area-no-area-2026-11-21.json"],
    ]);
    const back = importNotes(decodeURIComponent((links[1]?.getAttribute("href") ?? "").replace(/^data:application\/json;charset=utf-8,/, "")));
    // Both notes of a place whose reports differ go with it.
    expect(back.notes.map((n) => n.id).sort()).toEqual(["d1", "d2"]);
  });

  it("shows the person's own text as text", () => {
    const el = page(`<h2>Areas</h2>${renderTable(areaReport(file(), { ...DEFAULT_AREA, by: "street" }, "en"), ctx())}`, "en");
    expect(el.querySelector("b")).toBeNull();
    expect(el.querySelector("tbody th [data-user-content]")?.textContent).toMatch(/King/);
  });

  it("passes the App's audit in French", () => {
    const el = page(`<h2>Secteurs</h2>${renderTable(report("fr"), ctx("fr"))}`, "fr");
    expect(el.querySelector("caption")?.textContent).toBe(C.tableCaption.fr);
    expect(el.querySelectorAll("tbody tr")[1]?.textContent).toContain("1 sur 1 (1 avec rapports divergents)");
    expect(auditDom(el, { locale: "fr" })).toEqual([]);
  });
});

describe("renderResults", () => {
  it("gives the summary and the table and text downloads", () => {
    const el = page(`<h2>Areas</h2>${renderResults(ctx(), report())}`, "en");
    expect(el.querySelector("#far-results")?.textContent).toBe("Areas — Postal area (first three characters of the postal code)");
    expect(el.querySelector("#far-summary")?.textContent).toBe("2 areas, 4 places: 14 details with no record.");
    const csv = el.querySelector<HTMLAnchorElement>('a[download="areas-2026-11-21.csv"]');
    expect(decodeURIComponent((csv?.getAttribute("href") ?? "").replace(/^data:text\/csv;charset=utf-8,/, ""))).toContain("\r\nM5V,2,");
    const text = decodeTextExportHref(el.querySelector('a[download="areas-2026-11-21.txt"]')?.getAttribute("href") ?? "") ?? "";
    expect(text).toContain("M5V — 2 places, 7 details with no record\n");
    expect(el.querySelector(".hint")?.textContent).toBe(C.notesHint.en);
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("names the no-area group in the CSV in the person's language", () => {
    const el = page(`<h2>Secteurs</h2>${renderResults(ctx("fr"), report("fr"))}`, "fr");
    const csv = decodeURIComponent((el.querySelector('a[download="secteurs-2026-11-21.csv"]')?.getAttribute("href") ?? "").replace(/^data:text\/csv;charset=utf-8,/, ""));
    expect(csv).toContain("\r\nAucun secteur dans l’adresse,1,");
    expect(auditDom(el, { locale: "fr" })).toEqual([]);
  });
});

describe("renderPlaces", () => {
  it("lists each place with what it has no record for among the chosen details", () => {
    const el = page(`<h2>Areas</h2>${renderPlaces(report("en", ["elevator", "automatic-door"]), "M5V", "en")}`, "en");
    expect(el.querySelector(`#${PLACES_TITLE_ID}`)?.textContent).toBe("Places in M5V (2)");
    expect(Array.from(el.querySelectorAll(".far-places > li")).map((li) => [li.querySelector("h4")?.textContent, Array.from(li.querySelectorAll(".far-gaps li")).map((x) => x.textContent)])).toEqual([
      ["<b>Café</b>", ["No record (Unknown): Automatic door"]],
      ["Bakery", ["No record (Unknown): Automatic door, Elevator"]],
    ]);
    expect(el.querySelector("b")).toBeNull();
    expect(el.querySelector('[data-action="far-close-places"]')?.textContent).toBe("Hide the list of places");
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("says when a place has no address, and passes the App's audit in French", () => {
    const el = page(`<h2>Secteurs</h2>${renderPlaces(report("fr"), "", "fr")}`, "fr");
    expect(el.querySelector(`#${PLACES_TITLE_ID}`)?.textContent).toBe("Lieux sans secteur dans l’adresse (1)");
    expect(el.querySelector(".far-places > li p")?.textContent).toBe("Aucune adresse");
    expect(el.querySelector(".far-gaps li")?.textContent).toContain("(UNKNOWN)");
    expect(el.textContent).not.toMatch(/inconnu/i);
    expect(auditDom(el, { locale: "fr" })).toEqual([]);
  });

  it("names reports that differ", () => {
    const el = page(`<h2>Areas</h2>${renderPlaces(report("en", ["elevator"]), "M5C", "en")}`, "en");
    expect(Array.from(el.querySelectorAll(".far-gaps li")).map((x) => x.textContent)).toEqual(["Reports differ: Elevator"]);
  });

  it("shows nothing for an area that is not in the report", () => {
    expect(renderPlaces(report(), "M9Z", "en")).toBe("");
  });

  it("shows under the table, with the open area's button marked expanded", () => {
    const el = page(`<h2>Areas</h2>${renderResults(ctx("en", { openArea: "M5C" }), report())}`, "en");
    expect(el.querySelector("#far-table + #far-places")).not.toBeNull();
    expect(el.querySelector(`#${showId("M5C")}`)?.getAttribute("aria-expanded")).toBe("true");
    expect(el.querySelector(`#${showId("M5V")}`)?.getAttribute("aria-expanded")).toBe("false");
    expect(el.querySelector(`#${showId("")}`)?.getAttribute("data-area")).toBe("");
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("gives each area's button its own id", () => {
    expect(showId("M5V")).toBe("far-show-M5V");
    expect(showId("")).toBe("far-show-none");
    expect(showId("king street west")).toBe("far-show-king-street-west");
  });
});

describe("renderOptions", () => {
  it("shows the chosen options and reads them back", () => {
    const el = page(`<h2>Areas</h2>${renderOptions(ctx("en", { form: { by: "street", keys: ["elevator", "automatic-door"], order: "name", hideFull: true } }))}`, "en");
    expect(el.querySelector<HTMLInputElement>(`#${byId("street")}`)?.checked).toBe(true);
    expect(el.querySelector<HTMLInputElement>(`#${orderId("name")}`)?.checked).toBe(true);
    expect(FACT_KEYS.filter((k) => el.querySelector<HTMLInputElement>(`#${keyBoxId(k)}`)?.checked)).toEqual(["automatic-door", "elevator"]);
    expect(readOptions(el)).toEqual({ by: "street", keys: ["automatic-door", "elevator"], order: "name", hideFull: true });
    expect(el.querySelector<HTMLInputElement>(`#${HIDE_FULL_ID}`)?.checked).toBe(true);
  });

  it("gives every choice a 44 pixel target on its label", () => {
    const el = page(`<h2>Areas</h2>${renderOptions(ctx())}`, "en");
    const labels = Array.from(el.querySelectorAll<HTMLLabelElement>("label.choice"));
    expect(labels).toHaveLength(2 + FACT_KEYS.length + 2 + 1);
    for (const label of labels) {
      expect(label.style.minHeight).toBe("44px");
      expect(label.style.minWidth).toBe("44px");
      expect(label.querySelector("input")?.id).toBe(label.htmlFor);
    }
  });

  it("ties the no-detail problem to its group and passes the App's audit in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(`<h2>${C.title[l]}</h2>${renderOptions(ctx(l, { form: { ...DEFAULT_AREA, keys: [] }, noKeys: true }))}`, l);
      expect(el.querySelector("#e-far-keys")?.textContent).toBe(C.noKeys[l]);
      expect(el.querySelector("#e-far-keys")?.closest("fieldset")?.getAttribute("aria-describedby")).toBe("e-far-keys");
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });

  it("reads the defaults when nothing is chosen", () => {
    const el = page(`<h2>Areas</h2>${renderOptions(ctx("en", { form: { ...DEFAULT_AREA, keys: [] } }))}`, "en");
    for (const i of Array.from(el.querySelectorAll<HTMLInputElement>('input[type="radio"]'))) i.checked = false;
    expect(readOptions(el)).toEqual({ by: "postal", keys: [], order: "gaps", hideFull: false });
  });
});

describe("renderFileAreas", () => {
  it("shows only the file form before a file is read", () => {
    const el = page(renderFileAreas(ctx("en", { file: undefined, report: undefined })), "en");
    expect(el.querySelector("#far-options-form")).toBeNull();
    expect(el.querySelector("#far-table")).toBeNull();
    expect(el.querySelector('[data-action="far-clear"]')?.textContent).toBe("Remove the file from the page");
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("links a file error to the box and marks it", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFileAreas(ctx(l, { text: "{", error: "not-json", file: undefined, report: undefined })), l);
      expect(el.querySelector("#far-errors a")?.getAttribute("href")).toBe(`#${AREAS_TEXT_ID}`);
      expect(el.querySelector("#far-errors a")?.textContent).toBe(areasErrorText("not-json", l));
      const box = el.querySelector<HTMLTextAreaElement>(`#${AREAS_TEXT_ID}`);
      expect(box?.getAttribute("aria-invalid")).toBe("true");
      expect(box?.getAttribute("aria-describedby")).toBe(`h-${AREAS_TEXT_ID} e-${AREAS_TEXT_ID}`);
      expect(box?.value).toBe("{");
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });

  it("links the no-detail problem to the first detail", () => {
    const el = page(renderFileAreas(ctx("en", { form: { ...DEFAULT_AREA, keys: [] }, noKeys: true, report: undefined })), "en");
    expect(el.querySelector("#far-errors a")?.getAttribute("href")).toBe(`#${keyBoxId("step-free-entry")}`);
    expect(el.querySelector("#far-table")).toBeNull();
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("shows the options and the areas once read, with a status when there is one", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFileAreas(ctx(l, { statusMessage: C.opened[l] })), l);
      expect(el.querySelector("#far-status")?.textContent).toBe(C.opened[l]);
      expect(el.querySelector(".fileareas")?.getAttribute("lang")).toBe(l);
      expect(el.querySelector("#far-options-form")).not.toBeNull();
      expect(el.querySelectorAll("#far-table tbody tr")).toHaveLength(3);
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });
});
