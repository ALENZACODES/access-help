// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { auditDom } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { FILE_SAME_COPY as C } from "./filesame-copy";
import { readStreetFile, type StreetFile } from "./filestreets";
import { TYPED, fileMatches, type JoinChoices } from "./placematch";
import { testNote } from "./testnotes";
import { SAME_TEXT_ID, addressId, includeId, readLeft, groupName, joinId, keepId, nameId, problemField, readChoices, readTyped, renderFileSame, renderGroup, renderRecords, typedId, type FileSameContext } from "./views-filesame";

const TODAY = new Date(Date.UTC(2026, 10, 21));

function file(): StreetFile {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("l1", "<b>Library</b>", [{ key: "elevator", value: "yes", on: "2026-03-01" }], "100 King St W"),
        testNote("l2", "<b>Library</b>", [], null),
        testNote("b1", "Bank", [], "40 Queen St E"),
        testNote("b2", "Royal Bank", [], "40 Queen St E"),
      ],
      "2026-11-01",
    ),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

const ctx = (l: "en" | "fr" = "en", over: Partial<FileSameContext> = {}): FileSameContext => {
  const f = file();
  return { text: "", error: undefined, file: f, report: fileMatches(f), choices: new Map(), noneError: false, made: undefined, typed: new Map(), typedErrors: new Map(), left: new Map(), tooFew: new Set(), locale: l, today: TODAY, statusMessage: undefined, ...over };
};

function page(inner: string, l: "en" | "fr"): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main"><h1>The App</h1>${inner}</main>`;
  return document.body;
}

describe("renderFileSame", () => {
  it("shows only the file form before a file is read, and passes the audit", () => {
    const el = page(renderFileSame(ctx("en", { file: undefined, report: undefined })), "en");
    expect(el.querySelector("#fsa-join-form")).toBeNull();
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("lists each group with its places, reasons and choices, escaped, passing the audit in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(renderFileSame(ctx(l)), l);
      const groups = Array.from(el.querySelectorAll(".fsa-groups > li"));
      expect(groups).toHaveLength(2);
      expect(groups[0]?.querySelector("h4")?.textContent).toBe(l === "en" ? "Group 1: 2 places" : "Groupe 1\u00A0: 2 lieux");
      expect(Array.from(groups[1]?.querySelectorAll(".table-wrap:first-of-type tbody th") ?? []).map((x) => x.textContent)).toEqual([
        l === "en" ? "<b>Library</b> (no address)" : "<b>Library</b> (aucune adresse)",
        "<b>Library</b>, 100 King St W",
      ]);
      expect(el.querySelector("main b")).toBeNull();
      expect(el.querySelector<HTMLInputElement>(`#${keepId(0)}`)?.checked).toBe(true);
      // Keep apart, each of the two places, or a typed name.
      expect(el.querySelectorAll(`input[name="${groupName(1)}"]`)).toHaveLength(4);
      expect(el.querySelectorAll("a.linkbtn")).toHaveLength(2);
      expect(auditDom(el, { locale: l }), l).toEqual([]);
    }
  });

  it("says when no two places match, with no form", () => {
    const r = readStreetFile(exportNotes([testNote("k", "Kiosk", [], "1 Elm St")], "2026-11-01"), TODAY, "en");
    if (!r.ok) throw new Error(r.error);
    const el = page(renderFileSame(ctx("en", { file: r.file, report: fileMatches(r.file) })), "en");
    expect(el.querySelector("#fsa-none")?.textContent).toBe(C.none.en);
    expect(el.querySelector("#fsa-join-form")).toBeNull();
  });

  it("names a file problem, linked to the box", () => {
    const el = page(renderFileSame(ctx("en", { error: "not-json", file: undefined, report: undefined })), "en");
    expect(el.querySelector("#fsa-errors a")?.getAttribute("href")).toBe(`#${SAME_TEXT_ID}`);
    expect(el.querySelector(`#${SAME_TEXT_ID}`)?.getAttribute("aria-invalid")).toBe("true");
  });

  it("asks for a group to join, linked to the first group's choice", () => {
    const el = page(renderFileSame(ctx("fr", { noneError: true })), "fr");
    expect(el.querySelector("#fsa-errors a")?.getAttribute("href")).toBe(`#${keepId(0)}`);
    expect(el.querySelector("#fsa-errors")?.textContent).toContain(C.noneChosen.fr);
    expect(auditDom(el, { locale: "fr" })).toEqual([]);
  });
});

describe("the copy", () => {
  it("shows what it changed and downloads the joined notes", () => {
    const c = ctx();
    const lib = c.report?.groups[1];
    const into = lib?.places[1];
    if (!lib || !into) throw new Error("no group");
    const made: JoinChoices = new Map([[lib.id, into.id]]);
    const el = page(renderFileSame({ ...c, choices: made, made }), "en");
    expect(el.querySelector("#fsa-copy-summary")?.textContent).toBe("1 group joined: 1 note was given another name or address. The copy has 3 places (4 before).");
    expect(el.querySelector<HTMLInputElement>(`#${joinId(1, 1)}`)?.checked).toBe(true);
    expect(el.querySelector("#fsa-joined")?.textContent).toBe("Group 2: 2 places now <b>Library</b>, 100 King St W");
    const json = decodeURIComponent((el.querySelectorAll<HTMLAnchorElement>("a.linkbtn")[2]?.getAttribute("href") ?? "").replace(/^data:[^,]*,/, ""));
    const l2 = importNotes(json).notes.find((n) => n.id === "l2");
    expect([l2?.placeName, l2?.address]).toEqual(["<b>Library</b>", "100 King St W"]);
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });
});

describe("reading the choices", () => {
  it("reads each group's choice, keeping apart a group whose choice is not one of its places", () => {
    const c = ctx();
    const r = c.report;
    if (!r) throw new Error("no report");
    const el = page(renderFileSame(c), "en");
    el.querySelector<HTMLInputElement>(`#${joinId(0, 1)}`)?.click();
    const read = readChoices(el, r);
    expect(read.get(r.groups[0]?.id ?? "")).toBe(r.groups[0]?.places[1]?.id);
    expect(read.get(r.groups[1]?.id ?? "")).toBeUndefined();
    const radio = el.querySelector<HTMLInputElement>(`#${joinId(1, 0)}`);
    if (!radio) throw new Error("no radio");
    radio.value = "someone-else";
    radio.checked = true;
    expect(readChoices(el, r).get(r.groups[1]?.id ?? "")).toBeUndefined();
  });

  it("shows a group on its own with its numbers", () => {
    const c = ctx();
    const g = c.report?.groups[1];
    if (!g) throw new Error("no group");
    const el = page(`<h2>T</h2><h3>R</h3><ol>${renderGroup(g, 1, undefined, "en")}</ol>`, "en");
    expect(Array.from(el.querySelectorAll(".table-wrap:first-of-type tbody tr")).map((r) => Array.from(r.querySelectorAll("td")).map((x) => x.textContent))).toEqual([
      ["1", "0", "none"],
      ["1", "1", "2026-03-01"],
    ]);
    expect(Array.from(el.querySelectorAll("caption")).map((c) => c.textContent)).toEqual([`${C.placesCaption.en} 2`, `${C.recordsCaption.en} 2`]);
    expect(el.querySelector("legend")?.textContent).toBe(`${C.choiceLegend.en} 2`);
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });
});

describe("typed names and records", () => {
  it("shows each place's answers side by side", () => {
    const g = ctx().report?.groups[1];
    if (!g) throw new Error("no group");
    for (const l of ["en", "fr"] as const) {
      const el = page(`<h2>T</h2><h3>R</h3>${renderRecords(g, 1, l)}`, l);
      const rows = Array.from(el.querySelectorAll("tbody tr")).map((r) => Array.from(r.querySelectorAll("td")).map((x) => x.textContent));
      expect(rows).toEqual(l === "en" ? [["Unknown", "Unknown", "Unknown", "Unknown"], ["Unknown", "Unknown", "Unknown", "Yes"]] : [["UNKNOWN", "UNKNOWN", "UNKNOWN", "UNKNOWN"], ["UNKNOWN", "UNKNOWN", "UNKNOWN", "Oui"]]);
      expect(auditDom(el, { locale: l }), l).toEqual([]);
    }
  });

  it("keeps what was typed, marks each problem on its field, and lists it in the summary by group", () => {
    const c = ctx("fr");
    const g = c.report?.groups[1];
    if (!g) throw new Error("no group");
    const el = page(
      renderFileSame({ ...c, choices: new Map([[g.id, TYPED]]), typed: new Map([[g.id, { name: "", address: "a\tb" }]]), typedErrors: new Map([[g.id, ["name-empty", "address-control"]]]) }),
      "fr",
    );
    expect(el.querySelector<HTMLInputElement>(`#${typedId(1)}`)?.checked).toBe(true);
    expect(el.querySelector(`#${nameId(1)}`)?.getAttribute("aria-invalid")).toBe("true");
    expect(el.querySelector(`#${addressId(1)}`)?.getAttribute("aria-describedby")).toBe(`fsa-typed-hint-1 e-${addressId(1)}`);
    expect(Array.from(el.querySelectorAll("#fsa-errors a")).map((a) => a.getAttribute("href"))).toEqual([`#${nameId(1)}`, `#${addressId(1)}`]);
    expect(el.querySelector("#fsa-errors li")?.textContent).toBe("Groupe 2\u00A0: 2 lieux — Tapez un nom.");
    expect(auditDom(el, { locale: "fr" })).toEqual([]);
    expect(problemField(3, "personal")).toBe(nameId(3));
  });

  it("reads the typed choice and the typed text back, keeping only groups with something typed", () => {
    const c = ctx();
    const r = c.report;
    if (!r) throw new Error("no report");
    const el = page(renderFileSame(c), "en");
    el.querySelector<HTMLInputElement>(`#${typedId(0)}`)?.click();
    const name = el.querySelector<HTMLInputElement>(`#${nameId(0)}`);
    if (!name) throw new Error("no field");
    name.value = "Royal Bank of Canada";
    expect(readChoices(el, r).get(r.groups[0]?.id ?? "")).toBe(TYPED);
    const typed = readTyped(el, r, new Map());
    expect([...typed.values()]).toEqual([{ name: "Royal Bank of Canada", address: "" }]);
  });

  it("offers the groups to print", () => {
    const el = page(renderFileSame(ctx()), "en");
    expect(el.querySelectorAll<HTMLAnchorElement>("a.linkbtn")[1]?.getAttribute("download")).toBe("places-that-may-be-the-same-2026-11-21.txt");
  });
});

describe("leaving places out of a join", () => {
  it("ticks every place to start, reads the unticked ones back, and passes the audit", () => {
    const c = ctx();
    const r = c.report;
    if (!r) throw new Error("no report");
    const el = page(renderFileSame(c), "en");
    expect(el.querySelector<HTMLInputElement>(`#${includeId(1, 0)}`)?.checked).toBe(true);
    expect(readLeft(el, r).size).toBe(0);
    el.querySelector<HTMLInputElement>(`#${includeId(1, 0)}`)?.click();
    expect([...(readLeft(el, r).get(r.groups[1]?.id ?? "") ?? [])]).toEqual([r.groups[1]?.places[0]?.id]);
    expect(auditDom(el, { locale: "en" })).toEqual([]);
  });

  it("says a join needs two places, on the group and in the summary", () => {
    const c = ctx("fr");
    const g = c.report?.groups[0];
    if (!g) throw new Error("no group");
    const el = page(renderFileSame({ ...c, tooFew: new Set([g.id]), left: new Map([[g.id, new Set([g.places[1]?.id ?? ""])]]) }), "fr");
    expect(el.querySelector("#e-fsa-include-0")?.textContent).toBe(C.tooFew.fr);
    expect(el.querySelector<HTMLInputElement>(`#${includeId(0, 1)}`)?.checked).toBe(false);
    expect(el.querySelector(`#${includeId(0, 0)}`)?.getAttribute("aria-describedby")).toBe("fsa-include-hint-0 e-fsa-include-0");
    expect(el.querySelector("#fsa-errors a")?.getAttribute("href")).toBe(`#${includeId(0, 0)}`);
    expect(auditDom(el, { locale: "fr" })).toEqual([]);
  });
});
