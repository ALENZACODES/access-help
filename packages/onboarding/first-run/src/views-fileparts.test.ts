// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { auditDom } from "./audit";
import { exportNotes } from "./exchange";
import { readStreetFile, type StreetFile } from "./filestreets";
import { partsReport } from "./partsummary";
import { testNote } from "./testnotes";
import {
  PARTS_TEXT_ID,
  boxId,
  isPartsView,
  readBoxes,
  readView,
  renderByDetail,
  renderFileParts,
  renderPart,
  renderPartsForm,
  renderPlaces,
  renderResults,
  renderSources,
  viewId,
  type FilePartsContext,
} from "./views-fileparts";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function file(): StreetFile {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("l", "Library", [{ key: "elevator", value: "yes" }], "100 King St W, M5H 2N2"),
        testNote("k", "Kiosk", [], "1 Elm Ave"),
      ],
      "2026-11-01",
    ),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const ctx = (l: "en" | "fr" = "en", over: Partial<FilePartsContext> = {}): FilePartsContext => ({
  text: "",
  error: undefined,
  file: file(),
  boxes: ["<b>King</b>", "", "", ""],
  applied: [],
  problems: {},
  emptyError: false,
  view: "part",
  locale: l,
  today: TODAY,
  statusMessage: undefined,
  ...over,
});

function page(inner: string, l: "en" | "fr"): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main"><h1>The App</h1><h2>Parts</h2>${inner}</main>`;
  return document.body;
}

describe("renderPartsForm", () => {
  it("shows four boxes with what was typed and the postal areas, and passes the App's audit in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderPartsForm(ctx(l), file()), l);
      expect(el.querySelectorAll('input[name="part"]')).toHaveLength(4);
      expect(el.querySelector<HTMLInputElement>(`#${boxId(0)}`)?.value).toBe("<b>King</b>");
      expect(el.querySelector(".hint")?.textContent).toContain("M5H");
      expect(el.querySelector('[data-action="fpt-postal"]')).not.toBeNull();
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });

  it("ties each problem to its box", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderPartsForm(ctx(l, { problems: { 1: "none-match", 3: "long" } }), file()), l);
      expect(el.querySelector(`#${boxId(1)}`)?.getAttribute("aria-describedby")).toBe(`e-${boxId(1)}`);
      expect(el.querySelector(`#${boxId(3)}`)?.getAttribute("aria-invalid")).toBe("true");
      expect(el.querySelector(`#${boxId(0)}`)?.hasAttribute("aria-invalid")).toBe(false);
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });

  it("offers no postal button when no address has a postal code", () => {
    const r = readStreetFile(exportNotes([testNote("k", "Kiosk", [], "1 Elm Ave")], "2026-11-01"), TODAY, "en");
    if (!r.ok) throw new Error(r.error);
    const el = page(renderPartsForm(ctx("en", { file: r.file }), r.file), "en");
    expect(el.querySelector('[data-action="fpt-postal"]')).toBeNull();
    expect(el.querySelector(".hint")?.textContent).toContain("No address in this file has a postal code.");
  });
});

describe("renderResults", () => {
  it("shows each part and the rest, the text typed as the person's own words, and passes the App's audit in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderResults(ctx(l, { applied: ["King"] }), file()), l);
      expect(el.querySelector("#fpt-part-h-0 [data-user-content]")?.textContent).toBe("King");
      expect(el.querySelector("#fpt-rest")?.textContent).toBe(l === "en" ? "Rest of the file (1 place)" : "Reste du fichier (1 lieu)");
      expect(el.querySelectorAll(".fpt-details")).toHaveLength(2);
      expect(Array.from(el.querySelectorAll("a.linkbtn")).map((a) => a.getAttribute("download"))).toEqual(
        l === "en"
          ? [
              "parts-comparison-2026-11-21.csv",
              "parts-comparison-2026-11-21.txt",
              "notes-part-1-2026-11-21.json",
              "notes-to-look-at-part-1-2026-11-21.json",
              "notes-part-2-2026-11-21.json",
              "notes-to-look-at-part-2-2026-11-21.json",
            ]
          : [
              "comparaison-de-parties-2026-11-21.csv",
              "comparaison-de-parties-2026-11-21.txt",
              "notes-partie-1-2026-11-21.json",
              "notes-a-regarder-partie-1-2026-11-21.json",
              "notes-partie-2-2026-11-21.json",
              "notes-a-regarder-partie-2-2026-11-21.json",
            ],
      );
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });

  it("shows nothing before the first comparison", () => {
    expect(renderResults(ctx(), file())).toBe("");
  });

  it("says when the rest of the file is empty, with no download for it", () => {
    const r = partsReport(file(), ["King", "Elm"], TODAY);
    const el = page(`<h3>R</h3><ul>${renderPart(r.rest, 2, ctx())}</ul>`, "en");
    expect(el.querySelector(".hint")?.textContent).toBe("Every place is in one of the parts.");
    expect(el.querySelector("li a")).toBeNull();
  });

  it("escapes a part's text", () => {
    const el = page(renderResults(ctx("en", { applied: ["<b>King</b>"] }), file()), "en");
    expect(el.querySelector("b")).toBeNull();
  });
});

describe("renderPlaces", () => {
  it("lists a part's places with how many details are recorded, escaped, and passes the App's audit in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const r = readStreetFile(exportNotes([testNote("x", "<b>Shop</b>", [{ key: "elevator", value: "yes" }], "1 King St W")], "2026-11-01"), TODAY, l);
      if (!r.ok) throw new Error(r.error);
      const part = partsReport(r.file, ["King"], TODAY).parts[0];
      if (!part) throw new Error("no part");
      const el = page(`<h3>R</h3>${renderPlaces(part, l)}`, l);
      expect(el.querySelector("b")).toBeNull();
      expect(el.querySelector("summary")?.textContent).toBe(l === "en" ? "Places in this part (1)" : "Lieux de cette partie (1)");
      expect(el.querySelector(".fpt-places li")?.textContent).toBe(l === "en" ? "<b>Shop</b>, 1 King St W: 1 of 4 details recorded" : "<b>Shop</b>, 1 King St W\u00A0: 1 détail sur 4 noté");
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });

  it("offers the streets the way the file writes them", () => {
    const el = page(renderPartsForm(ctx(), file()), "en");
    expect(Array.from(el.querySelectorAll(".hint")).some((p) => p.textContent === "Streets in this file, as their places write them: Elm Ave (1 place), King St W (1 place)")).toBe(true);
    expect(el.querySelector('[data-action="fpt-streets"]')).not.toBeNull();
  });
});

describe("detail by detail", () => {
  it("lists each detail with every part's counts, the rest last, the typed text as the person's own words, in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const r = partsReport(file(), ["King"], TODAY);
      const el = page(`<h3>R</h3>${renderByDetail([...r.parts, r.rest], l)}`, l);
      expect(el.querySelectorAll(".fpt-by-detail > li")).toHaveLength(4);
      const elevator = Array.from(el.querySelectorAll(".fpt-by-detail > li:nth-child(4) li")).map((li) => li.textContent);
      expect(elevator).toEqual(
        l === "en"
          ? ["“King” (1 place): 1 Yes, 0 No, 0 Unknown, 0 with reports that differ", "Rest of the file (1 place): 0 Yes, 0 No, 1 Unknown, 0 with reports that differ"]
          : ["«\u202FKing\u202F» (1 lieu)\u00A0: 1 Oui, 0 Non, 0 UNKNOWN, 0 aux rapports divergents", "Reste du fichier (1 lieu)\u00A0: 0 Oui, 0 Non, 1 UNKNOWN, 0 aux rapports divergents"],
      );
      expect(el.querySelector(".fpt-by-detail [data-user-content]")?.textContent).toBe("King");
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });

  it("shows the chosen view in the results and the form", () => {
    const el = page(renderFileParts(ctx("en", { applied: ["King"], view: "detail" })), "en");
    expect(el.querySelector(".fpt-by-detail")).not.toBeNull();
    expect(el.querySelector(".fpt-parts")).toBeNull();
    expect(el.querySelector<HTMLInputElement>(`#${viewId("detail")}`)?.checked).toBe(true);
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("reads the view chosen, or keeps it", () => {
    document.body.innerHTML = renderPartsForm(ctx(), file());
    expect(readView(document.body, "detail")).toBe("part");
    (document.getElementById(viewId("detail")) as HTMLInputElement).checked = true;
    expect(readView(document.body, "part")).toBe("detail");
    document.body.innerHTML = "";
    expect(readView(document.body, "detail")).toBe("detail");
    expect(isPartsView("table")).toBe(false);
  });
});

describe("renderSources", () => {
  it("names who recorded a part as their own words, escaped, and passes the App's audit in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const r = readStreetFile(exportNotes([testNote("x", "Shop", [{ key: "elevator", value: "yes", source: "<i>City?</i>" }], "1 King St W")], "2026-11-01"), TODAY, l);
      if (!r.ok) throw new Error(r.error);
      const part = partsReport(r.file, ["King"], TODAY).parts[0];
      if (!part) throw new Error("no part");
      const el = page(`<h3>R</h3>${renderSources(part, l)}`, l);
      expect(el.querySelector("i")).toBeNull();
      expect(el.querySelector(".fpt-sources [data-user-content]")?.textContent).toBe("<i>City?</i>");
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
    expect(renderSources(partsReport(file(), ["Elm"], TODAY).parts[0] ?? never(), "en")).toBe("");
  });
});

function never(): never {
  throw new Error("missing");
}

describe("renderFileParts", () => {
  it("links the file error, the empty boxes and each box's problem from the summary", () => {
    document.body.innerHTML = renderFileParts(ctx("en", { error: "not-json", emptyError: true, problems: { 2: "repeat" } }));
    expect(Array.from(document.querySelectorAll("#fpt-errors a")).map((a) => [a.getAttribute("href"), a.textContent])).toEqual([
      [`#${PARTS_TEXT_ID}`, "This text is not a notes export."],
      [`#${boxId(0)}`, "Type text for at least one part."],
      [`#${boxId(2)}`, "Part 3: This is the same as an earlier part."],
    ]);
  });

  it("shows no parts before a file is read", () => {
    document.body.innerHTML = renderFileParts(ctx("en", { file: undefined }));
    expect(document.querySelector("#fpt-parts-form")).toBeNull();
  });
});

describe("readBoxes", () => {
  it("reads the four boxes, or keeps what it had when the page has none", () => {
    document.body.innerHTML = renderPartsForm(ctx(), file());
    (document.getElementById(boxId(2)) as HTMLInputElement).value = "Elm";
    expect(readBoxes(document.body, [])).toEqual(["<b>King</b>", "", "Elm", ""]);
    document.body.innerHTML = "";
    expect(readBoxes(document.body, ["a", "b", "", ""])).toEqual(["a", "b", "", ""]);
  });
});
