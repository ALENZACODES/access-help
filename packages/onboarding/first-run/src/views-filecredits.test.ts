// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { auditDom } from "./audit";
import { collectCredits, sourceVariants } from "./credits";
import { exportNotes } from "./exchange";
import { readStreetFile, type StreetFile } from "./filestreets";
import type { Note } from "./model";
import { testNote } from "./testnotes";
import {
  AREA_ID,
  CREDITS_TEXT_ID,
  areaProblem,
  fileNotes,
  leaveOutId,
  leaveOutProblem,
  readLeaveOut,
  outsideArea,
  readPicks,
  renderArea,
  renderCopy,
  renderFileCredits,
  renderLeaveOut,
  renderLicence,
  renderVariants,
  variantId,
  type FileCreditsContext,
} from "./views-filecredits";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function notes(): Note[] {
  return [
    testNote("a", "Library", [{ key: "elevator", value: "yes", source: "<b>City</b>", licence: "CC-BY-4.0" }]),
    { ...testNote("b", "Café", [{ key: "automatic-door", value: "no", source: "Walk group", licence: "ODbL-1.0" }]), licence: "ODbL-1.0" },
  ];
}

function file(n = notes()): StreetFile {
  const r = readStreetFile(exportNotes(n, "2026-11-01"), TODAY, "en");
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const ctx = (l: "en" | "fr" = "en", over: Partial<FileCreditsContext> = {}): FileCreditsContext => ({
  text: "",
  error: undefined,
  file: file(),
  checked: [],
  leaveOut: [],
  picks: {},
  appliedPicks: {},
  area: "",
  areaText: "",
  areaError: undefined,
  leaveOutError: undefined,
  copyMade: false,
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

describe("renderFileCredits", () => {
  it("shows each licence with its summary, link and sources, escaped, and passes the App's audit in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFileCredits(ctx(l)), l);
      expect(el.querySelector("b")).toBeNull();
      expect(Array.from(el.querySelectorAll(".fcr-licences h4")).map((h) => h.textContent)).toEqual([
        "CC-BY-4.0 (Creative Commons Attribution 4.0)",
        "ODbL-1.0 (Open Database License 1.0)",
        "CC0-1.0 (Creative Commons CC0 1.0)",
      ]);
      expect(el.querySelector('[data-licence="CC-BY-4.0"] .fcr-sources [data-user-content]')?.textContent).toBe("<b>City</b>");
      expect(el.querySelector('[data-licence="CC-BY-4.0"] a')?.getAttribute("href")).toBe("https://creativecommons.org/licenses/by/4.0/");
      expect(Array.from(el.querySelectorAll("a[download]")).map((a) => a.getAttribute("download"))).toHaveLength(4);
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });

  it("names a licence carried only by notes", () => {
    const el = page(`<h2>C</h2><h3>L</h3><ul>${renderLicence(collectCredits(fileNotes(file())).licences[2] ?? never(), 2, "en")}</ul>`, "en");
    expect(el.querySelector(".hint")?.textContent).toBe("No record carries this licence; only notes do.");
  });

  it("shows no credits before a file is read, and links the errors from the summary", () => {
    document.body.innerHTML = renderFileCredits(ctx("en", { file: undefined, error: "empty" }));
    expect(document.querySelector("#fcr-summary")).toBeNull();
    expect(document.querySelector("#fcr-errors a")?.getAttribute("href")).toBe(`#${CREDITS_TEXT_ID}`);
    document.body.innerHTML = renderFileCredits(ctx("en", { leaveOutError: "none" }));
    expect(document.querySelector("#fcr-errors a")?.getAttribute("href")).toBe(`#${leaveOutId(0)}`);
  });
});

function never(): never {
  throw new Error("missing");
}

describe("leaving licences out", () => {
  it("offers each licence in the file, with the ticked ones checked and the problem shown", () => {
    for (const l of ["en", "fr"] as const) {
      const c = collectCredits(fileNotes(file()));
      const el = page(`<h2>C</h2>${renderLeaveOut(ctx(l, { checked: ["ODbL-1.0"], leaveOutError: "nothing-left" }), c)}`, l);
      expect(Array.from(el.querySelectorAll<HTMLInputElement>('input[name="leave-out"]')).map((b) => [b.value, b.checked])).toEqual([
        ["CC-BY-4.0", false],
        ["ODbL-1.0", true],
        ["CC0-1.0", false],
      ]);
      expect(el.querySelector("#e-fcr-leave")).not.toBeNull();
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });

  it("shows the copy only once it is made, with a valid choice", () => {
    expect(renderCopy(ctx("en", { leaveOut: ["CC-BY-4.0"] }), file())).toBe("");
    expect(renderCopy(ctx("en", { leaveOut: [], copyMade: true, leaveOutError: "none" }), file())).toBe("");
    const el = page(`<h2>C</h2>${renderCopy(ctx("en", { leaveOut: ["CC-BY-4.0"], copyMade: true }), file())}`, "en");
    expect(el.querySelector("#fcr-copy-summary")?.textContent).toBe("The copy has 1 record in 2 notes. 1 record and 0 notes are left out.");
    expect(el.querySelector("a[download]")?.getAttribute("download")).toBe("notes-copy-2026-11-21.json");
  });

  it("says when nothing is chosen or nothing would be left", () => {
    const f = file();
    expect(leaveOutProblem(f, [])).toBe("none");
    expect(leaveOutProblem(f, ["CC0-1.0", "ODbL-1.0"])).toBe("nothing-left");
    expect(leaveOutProblem(f, ["ODbL-1.0"])).toBeUndefined();
  });

  it("reads the ticked licences", () => {
    document.body.innerHTML = renderLeaveOut(ctx(), collectCredits(fileNotes(file())));
    (document.getElementById(leaveOutId(2)) as HTMLInputElement).checked = true;
    expect(readLeaveOut(document.body)).toEqual(["CC0-1.0"]);
  });
});

describe("spellings of one source", () => {
  const spelled = (): Note[] => [
    testNote("a", "A", [
      { key: "elevator", value: "yes", source: "<i>City</i> survey" },
      { key: "automatic-door", value: "no", source: "<i>city</i> survey." },
    ]),
  ];

  it("offers each group with Leave as they are first, escapes the spellings, and passes the App's audit in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(`<h2>C</h2><form>${renderVariants(sourceVariants(spelled()), {}, l)}</form>`, l);
      expect(el.querySelector("i")).toBeNull();
      expect(Array.from(el.querySelectorAll(`#${variantId(0)} option`)).map((o) => o.getAttribute("value"))).toEqual(["", "<i>City</i> survey", "<i>city</i> survey."]);
      expect(el.querySelector<HTMLSelectElement>(`#${variantId(0)}`)?.value).toBe("");
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
    expect(renderVariants([], {}, "en")).toBe("");
  });

  it("reads the picks, leaving out groups left as they are", () => {
    document.body.innerHTML = renderVariants(sourceVariants(spelled()), { "i city i survey": "<i>city</i> survey." }, "en");
    const sel = document.getElementById(variantId(0)) as HTMLSelectElement;
    expect(sel.value).toBe("<i>city</i> survey.");
    expect(readPicks(document.body)).toEqual({ "i city i survey": "<i>city</i> survey." });
    sel.value = "";
    expect(readPicks(document.body)).toEqual({});
  });

  it("makes a copy from a spelling alone, with no licence left out", () => {
    const f = file(spelled());
    expect(leaveOutProblem(f, [], { "i city i survey": "<i>City</i> survey" })).toBeUndefined();
    const el = page(`<h2>C</h2>${renderCopy(ctx("en", { file: f, copyMade: true, appliedPicks: { "i city i survey": "<i>City</i> survey" } }), f)}`, "en");
    expect(el.querySelector("#fcr-copy-summary")?.textContent).toBe("The copy has 2 records in 1 note. 0 records and 0 notes are left out. 1 record has its source written the way you chose.");
  });
});

describe("credits for part of the file", () => {
  const twoStreets = (): StreetFile =>
    file([testNote("a", "Library", [{ key: "elevator", value: "yes" }], "100 King St W"), testNote("b", "Café", [{ key: "elevator", value: "no", source: "Other" }], "5 Queen St E")]);

  it("keeps only the notes of places whose address holds the text", () => {
    const f = twoStreets();
    expect(fileNotes(f, "king st").map((n) => n.id)).toEqual(["a"]);
    expect(fileNotes(f).map((n) => n.id).sort()).toEqual(["a", "b"]);
    expect(outsideArea(f, "KING")).toBe(1);
  });

  it("refuses a text that is too long or that no address holds", () => {
    const f = twoStreets();
    expect(areaProblem(f, "x".repeat(61))).toBe("long");
    expect(areaProblem(f, "Elm")).toBe("none");
    expect(areaProblem(f, "  ")).toBeUndefined();
    expect(areaProblem(f, "queen")).toBeUndefined();
  });

  it("shows what is left out, and ties a problem to the field, passing the App's audit in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFileCredits(ctx(l, { file: twoStreets(), area: "King", areaText: "King" })), l);
      expect(el.querySelector("#fcr-left-out")?.textContent).toContain(l === "en" ? "1 place whose address does not hold “King”" : "1 lieu dont l’adresse");
      expect(el.querySelector("#fcr-summary")?.textContent).toBe(l === "en" ? "1 record from 1 source under 1 licence, in 1 note." : "1 donnée de 1 source sous 1 licence, dans 1 note.");
      expect(auditDom(el, { locale: l })).toEqual([]);
      const bad = page(`<h2>C</h2>${renderArea(ctx(l, { areaText: "Elm", areaError: "none" }))}`, l);
      expect(bad.querySelector(`#${AREA_ID}`)?.getAttribute("aria-describedby")).toBe(`h-${AREA_ID} e-${AREA_ID}`);
      expect(bad.querySelector<HTMLInputElement>(`#${AREA_ID}`)?.value).toBe("Elm");
      expect(auditDom(bad, { locale: l })).toEqual([]);
    }
  });
});
