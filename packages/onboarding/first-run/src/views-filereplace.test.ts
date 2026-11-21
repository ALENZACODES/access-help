// @vitest-environment jsdom
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { auditDom } from "./audit";
import { exportNotes, importNotes } from "./exchange";
import { readStreetFile, type StreetFile } from "./filestreets";
import { parseNote } from "./model";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";
import { DEFAULT_REPLACE, findHits, type OptionProblem, type ReplaceOptions } from "./textreplace";
import {
  CASE_ID,
  FIND_ID,
  REPLACE_TEXT_ID,
  WHOLE_ID,
  WITH_ID,
  acceptId,
  fieldBoxId,
  markedBefore,
  problemTarget,
  readAccepted,
  readOptions,
  renderFileReplace,
  type FileReplaceContext,
} from "./views-filereplace";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const O: ReplaceOptions = { ...DEFAULT_REPLACE, find: "Kng", replace: "King" };

function file(): StreetFile {
  const n = parseNote({ ...testNote("a", "<b>Kng</b> Café", [], "1 Kng St"), note: "Kng side\nramp" });
  if (!n) throw new Error("bad note");
  const r = readStreetFile(exportNotes([n, testNote("b", "Kng", [], null), testNote("c", "Library", [], "9 Bay St")], "2026-11-01"), TODAY, "en");
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

// Changes: 0 the name "<b>Kng</b> Café", 1 its address, 2 its note text, 3 the name "Kng".
const ctx = (l: "en" | "fr" = "en", over: Partial<FileReplaceContext> = {}): FileReplaceContext => {
  const f = file();
  const report = findHits(f, O);
  return {
    text: "",
    error: undefined,
    file: f,
    form: O,
    problems: [],
    report,
    options: O,
    accepted: new Set(report.hits.map((h) => h.id)),
    noneError: false,
    made: undefined,
    locale: l,
    today: TODAY,
    statusMessage: undefined,
    ...over,
  };
};

function host(html: string, l: "en" | "fr" = "en"): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main"><h1>The App</h1><div id="host">${html}</div></main>`;
  return document.getElementById("host") as HTMLElement;
}

describe("the page before a file is read", () => {
  it("has the file form and the remove control, with no options or changes", () => {
    const root = host(renderFileReplace(ctx("en", { file: undefined, report: undefined, options: undefined })));
    expect(root.querySelector("h2")?.textContent).toBe("Find and replace in notes");
    expect(root.querySelector('[data-action="fre-clear"]')?.textContent).toBe("Remove the file and the copy from the page");
    expect(root.querySelector("#fre-options-form")).toBeNull();
    expect(root.querySelector("#fre-results")).toBeNull();
  });

  it("links a file error to the box and marks it invalid", () => {
    const root = host(renderFileReplace(ctx("en", { file: undefined, report: undefined, options: undefined, error: "not-json" })));
    expect(root.querySelector("#fre-errors a")?.getAttribute("href")).toBe(`#${REPLACE_TEXT_ID}`);
    expect(root.querySelector(`#${REPLACE_TEXT_ID}`)?.getAttribute("aria-invalid")).toBe("true");
  });
});

describe("the options", () => {
  it("shows the options as on the form, with every place to look ticked by default", () => {
    const root = host(renderFileReplace(ctx("en", { report: undefined, options: undefined, form: DEFAULT_REPLACE })));
    expect(root.querySelector<HTMLInputElement>(`#${FIND_ID}`)?.value).toBe("");
    for (const f of ["name", "address", "note"] as const) expect(root.querySelector(`#${fieldBoxId(f)}`)?.hasAttribute("checked")).toBe(true);
    expect(root.querySelector(`#${CASE_ID}`)?.hasAttribute("checked")).toBe(false);
    expect(root.querySelector(`#${WHOLE_ID}`)?.getAttribute("aria-describedby")).toBe(`h-${WHOLE_ID}`);
    expect(root.querySelector("fieldset legend")?.textContent).toBe("Where to look");
  });

  it("marks each problem on its field and links to it from the summary", () => {
    const problems: OptionProblem[] = ["find-empty", "replace-long", "no-fields"];
    const root = host(renderFileReplace(ctx("en", { problems, form: { ...DEFAULT_REPLACE, replace: "x".repeat(201), fields: [] }, report: undefined, options: undefined })));
    expect(Array.from(root.querySelectorAll("#fre-errors a")).map((a) => a.getAttribute("href"))).toEqual([`#${FIND_ID}`, `#${WITH_ID}`, `#${fieldBoxId("name")}`]);
    expect(root.querySelector(`#${FIND_ID}`)?.getAttribute("aria-invalid")).toBe("true");
    expect(root.querySelector(`#${FIND_ID}`)?.getAttribute("aria-describedby")).toBe(`h-${FIND_ID} e-${FIND_ID}-find-empty`);
    expect(root.querySelector<HTMLInputElement>(`#${WITH_ID}`)?.value).toHaveLength(201);
    expect(root.querySelector("#e-fre-fields")?.textContent).toBe("Choose at least one place to look.");
  });

  it("sends each problem to the field it is about", () => {
    expect(problemTarget("find-control")).toBe(FIND_ID);
    expect(problemTarget("replace-control")).toBe(WITH_ID);
    expect(problemTarget("no-fields")).toBe(fieldBoxId("name"));
  });

  it("reads the options from the page", () => {
    const root = host(renderFileReplace(ctx()));
    root.querySelector<HTMLInputElement>(`#${FIND_ID}`)!.value = "St";
    root.querySelector<HTMLInputElement>(`#${WITH_ID}`)!.value = "Street";
    root.querySelector<HTMLInputElement>(`#${fieldBoxId("name")}`)!.checked = false;
    root.querySelector<HTMLInputElement>(`#${WHOLE_ID}`)!.checked = true;
    expect(readOptions(root)).toEqual({ find: "St", replace: "Street", fields: ["address", "note"], matchCase: false, wholeWords: true });
  });
});

describe("the changes", () => {
  it("summarises the search and offers the changes as a CSV", () => {
    const root = host(renderFileReplace(ctx()));
    expect(root.querySelector("#fre-results")?.textContent).toBe("Changes found (4)");
    expect(root.querySelector("#fre-summary")?.textContent).toBe("“Kng” → “King”: 4 matches in 4 fields across 3 notes.");
    expect(root.querySelector('a[download="changes-found-2026-11-21.csv"]')).not.toBeNull();
  });

  it("shows each change now and after, with matches marked and everything escaped", () => {
    const root = host(renderFileReplace(ctx()));
    const first = root.querySelectorAll(".fre-hits > li")[0];
    expect(first?.querySelector("h4")?.textContent).toBe("Place name of <b>Kng</b> Café — 1 match");
    expect(first?.querySelector("b")).toBeNull();
    expect(Array.from(first!.querySelectorAll("mark")).map((m) => m.textContent)).toEqual(["Kng"]);
    expect(first?.querySelectorAll("p")[0]?.textContent).toBe("Now: <b>Kng</b> Café");
    expect(first?.querySelectorAll("p")[1]?.textContent).toBe("After: <b>King</b> Café");
  });

  it("ticks every change that can be made, with a label naming it", () => {
    const root = host(renderFileReplace(ctx()));
    expect(root.querySelectorAll('.fre-hits input[type="checkbox"]')).toHaveLength(4);
    expect(root.querySelector(`#${acceptId(1)}`)?.hasAttribute("checked")).toBe(true);
    expect(root.querySelector(`label[for="${acceptId(1)}"]`)?.textContent).toBe("Make change 2 (address of <b>Kng</b> Café)");
  });

  it("shows a change that cannot be made with its reason and no tick box", () => {
    const o = { ...O, replace: "", fields: ["name" as const] };
    const f = file();
    const report = findHits(f, o);
    const root = host(renderFileReplace(ctx("en", { file: f, form: o, options: o, report, accepted: new Set(report.hits.map((h) => h.id)) })));
    const items = root.querySelectorAll(".fre-hits > li");
    expect(items[1]?.querySelector(".error")?.textContent).toBe("Cannot be made: a place needs a name.");
    expect(items[1]?.querySelector("input")).toBeNull();
    expect(items[1]?.querySelectorAll("p")[1]?.textContent).toBe("After: (empty)");
  });

  it("says so when nothing matches", () => {
    const o = { ...O, find: "zzz" };
    const root = host(renderFileReplace(ctx("en", { form: o, options: o, report: findHits(file(), o) })));
    expect(root.querySelector("#fre-none")?.textContent).toBe("Nothing in the places you chose matches.");
    expect(root.querySelector("#fre-apply-form")).toBeNull();
  });

  it("offers to tick or untick every change, only when one can be made", () => {
    const root = host(renderFileReplace(ctx()));
    expect(root.querySelector('[data-action="fre-tick-all"]')?.textContent).toBe("Tick every change");
    expect(root.querySelector('[data-action="fre-untick-all"]')?.textContent).toBe("Untick every change");
    const o = { ...O, find: "Kng", replace: "", fields: ["name" as const] };
    const f = readStreetFile(exportNotes([testNote("x", "Kng", [])], "2026-11-01"), TODAY, "en");
    if (!f.ok) throw new Error(f.error);
    const blocked = host(renderFileReplace(ctx("en", { file: f.file, form: o, options: o, report: findHits(f.file, o) })));
    expect(blocked.querySelector('[data-action="fre-tick-all"]')).toBeNull();
  });

  it("links the nothing-ticked problem to the first tick box", () => {
    expect(host(renderFileReplace(ctx("en", { noneError: true, accepted: new Set() }))).querySelector("#fre-errors a")?.getAttribute("href")).toBe(`#${acceptId(0)}`);
  });

  it("reads which changes are ticked", () => {
    const c = ctx();
    const root = host(renderFileReplace(c));
    root.querySelector<HTMLInputElement>(`#${acceptId(0)}`)!.checked = false;
    root.querySelector<HTMLInputElement>(`#${acceptId(2)}`)!.checked = false;
    expect([...readAccepted(root, c.report!)]).toEqual([c.report!.hits[1]!.id, c.report!.hits[3]!.id]);
  });

  it("marks each match in the text before", () => {
    const h = ctx().report!.hits[2]!;
    expect(markedBefore(h)).toBe("<mark>Kng</mark> side\nramp");
  });

  it("shows the copy with its summary, what it changed and the download", () => {
    const c = ctx();
    const made = new Set([c.report!.hits[1]!.id, c.report!.hits[3]!.id]);
    const root = host(renderFileReplace({ ...c, made }));
    expect(root.querySelector("#fre-copy-summary")?.textContent).toBe("2 replacements in 2 fields across 2 notes.");
    expect(root.querySelector("#fre-copy-places")?.textContent).toBe("The file had 3 places; the copy has 3.");
    expect(Array.from(root.querySelectorAll(".fre-changes li")).map((li) => li.textContent)).toEqual(["Address of <b>Kng</b> Café: 1 Kng St → 1 King St", "Place name of Kng: Kng → King"]);
    const href = root.querySelector('a[download="notes-replaced-2026-11-21.json"]')?.getAttribute("href") ?? "";
    const back = importNotes(decodeURIComponent(href.replace(/^data:application\/json;charset=utf-8,/, "")));
    expect(back.notes.find((n) => n.id === "a")?.address).toBe("1 King St");
    expect(back.notes.find((n) => n.id === "a")?.placeName).toBe("<b>Kng</b> Café");
  });
});

describe("accessibility", () => {
  for (const l of ["en", "fr"] as const) {
    it(`has no axe or App audit problems with options, changes and a copy (${l})`, async () => {
      const c = ctx(l);
      host(renderFileReplace({ ...c, made: new Set([c.report!.hits[0]!.id]), statusMessage: "ok" }), l);
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => v.id)).toEqual([]);
      expect(auditDom(document.body, { locale: l })).toEqual([]);
    });

    it(`has no axe problems with every option problem shown (${l})`, async () => {
      const problems: OptionProblem[] = ["find-empty", "find-control", "replace-long", "no-fields"];
      const root = host(renderFileReplace(ctx(l, { problems, report: undefined, options: undefined, form: { ...DEFAULT_REPLACE, fields: [] } })), l);
      expect(root.querySelector("#fre-errors")).not.toBeNull();
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => v.id)).toEqual([]);
      expect(auditDom(document.body, { locale: l })).toEqual([]);
    });

    it(`has no axe problems before a file is read (${l})`, async () => {
      host(renderFileReplace(ctx(l, { file: undefined, report: undefined, options: undefined, error: "empty" })), l);
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => v.id)).toEqual([]);
    });
  }

  it("gives every control a 44 by 44 target and a label", () => {
    const root = host(renderFileReplace(ctx()));
    for (const box of Array.from(root.querySelectorAll('input[type="checkbox"]'))) expect(box.closest("label.choice")?.getAttribute("style"), box.id).toContain("min-height:44px;min-width:44px");
    for (const input of Array.from(root.querySelectorAll('input:not([type="checkbox"]), textarea'))) {
      expect(input.getAttribute("style"), input.id).toContain("min-height:44px");
      expect(root.querySelector(`label[for="${input.id}"]`), input.id).not.toBeNull();
    }
  });

  it("puts the French page in French", () => {
    const root = host(renderFileReplace(ctx("fr")), "fr");
    expect(root.querySelector("section")?.getAttribute("lang")).toBe("fr");
    expect(root.querySelector(`label[for="${WITH_ID}"]`)?.textContent).toBe("Remplacer par");
    expect(root.querySelectorAll(".fre-hits > li")[0]?.querySelectorAll("p")[0]?.textContent).toBe("Maintenant\u00A0: <b>Kng</b> Café");
  });
});
