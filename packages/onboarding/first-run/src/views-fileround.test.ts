// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { auditDom } from "./audit";
import { exportNotes } from "./exchange";
import { readStreetFile, type StreetFile } from "./filestreets";
import { testNote } from "./testnotes";
import {
  LICENCE_ID,
  SOURCE_ID,
  VISITED_ID,
  answerId,
  noteId,
  problemTarget,
  readEntries,
  readSettings,
  renderFileRound,
  renderResult,
  renderRoundPlace,
  renderSettings,
  type FileRoundContext,
} from "./views-fileround";
import { buildRound, defaultSettings, makeRound, type Round, type RoundPlace } from "./visitrecord";

const TODAY = new Date(Date.UTC(2026, 10, 20));

function file(): StreetFile {
  const r = readStreetFile(
    exportNotes([testNote("a", "<b>Café</b>", [{ key: "elevator", value: "yes" }], "12 King St W"), testNote("b", "Kiosk", [], null)], "2026-11-01"),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

function ctx(l: "en" | "fr" = "en", over: Partial<FileRoundContext> = {}): FileRoundContext {
  const f = file();
  return {
    text: "",
    error: undefined,
    file: f,
    round: makeRound(f, "open", l),
    askFor: "open",
    entries: {},
    settings: defaultSettings(TODAY),
    problems: [],
    result: undefined,
    edited: false,
    locale: l,
    today: TODAY,
    statusMessage: undefined,
    ...over,
  };
}

function page(inner: string, l: "en" | "fr"): HTMLElement {
  document.documentElement.lang = l;
  document.body.innerHTML = `<a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main"><h1>The App</h1><h2>Round</h2><h3>Places</h3>${inner}</main>`;
  return document.body;
}

const round = (c: FileRoundContext): Round => {
  if (!c.round) throw new Error("no round");
  return c.round;
};

describe("renderRoundPlace", () => {
  it("escapes the place's name, asks only the open details and passes the App's audit in both languages", () => {
    for (const l of ["en", "fr"] as const) {
      const c = ctx(l);
      const rp = round(c).places[0];
      if (!rp) throw new Error("no place");
      const el = page(`<ol>${renderRoundPlace(rp, 0, undefined, c)}</ol>`, l);
      expect(el.querySelector("b")).toBeNull();
      expect(el.querySelector("h4")?.textContent).toBe("<b>Café</b>");
      expect(Array.from(el.querySelectorAll("legend")).map((x) => x.textContent)).toHaveLength(3);
      expect(el.querySelectorAll('input[type="radio"]')).toHaveLength(9);
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });

  it("shows the answers and note already entered", () => {
    const c = ctx();
    const rp = round(c).places[1];
    if (!rp) throw new Error("no place");
    const el = page(`<ol>${renderRoundPlace(rp, 1, { answers: { elevator: "yes" }, note: "Bell at the door" }, c)}</ol>`, "en");
    expect(el.querySelector<HTMLInputElement>(`#${answerId(1, "elevator", "yes")}`)?.checked).toBe(true);
    expect(el.querySelector<HTMLInputElement>(`#${answerId(1, "automatic-door", "skip")}`)?.checked).toBe(true);
    expect(el.querySelector<HTMLTextAreaElement>(`#${noteId(1)}`)?.value).toBe("Bell at the door");
    expect(el.querySelector("p span")?.textContent).toBe("No address");
  });

  it("says so when every detail at a place has a record", () => {
    const c = ctx("en", { round: makeRound(file(), "all", "en") });
    const first = round(c).places[0];
    if (!first) throw new Error("no place");
    const rp: RoundPlace = { ...first, ask: [] };
    const el = page(`<ol>${renderRoundPlace(rp, 0, undefined, c)}</ol>`, "en");
    expect(el.querySelector("fieldset")).toBeNull();
    expect(el.querySelector(".hint")?.textContent).toBe("Every detail here has a record.");
  });
});

describe("renderSettings", () => {
  it("ties each problem to its field and keeps the hint", () => {
    for (const l of ["en", "fr"] as const) {
      const el = page(
        `<form>${renderSettings(ctx(l, { settings: { visitedOn: "x", source: "", licence: "CC0-1.0" }, problems: [{ kind: "settings", code: "date" }, { kind: "settings", code: "source" }] }))}</form>`,
        l,
      );
      expect(el.querySelector(`#${VISITED_ID}`)?.getAttribute("aria-describedby")).toBe(`h-${VISITED_ID} e-${VISITED_ID}`);
      expect(el.querySelector(`#${SOURCE_ID}`)?.getAttribute("aria-invalid")).toBe("true");
      expect(el.querySelector(`#${LICENCE_ID}`)?.hasAttribute("aria-invalid")).toBe(false);
      expect(el.querySelectorAll(`#${LICENCE_ID} option`)).toHaveLength(6);
      expect(auditDom(el, { locale: l })).toEqual([]);
    }
  });
});

describe("renderResult", () => {
  it("shows the summary, the four downloads and the changes, and the note when an answer changed", () => {
    const c = ctx();
    const f = c.file as StreetFile;
    const kiosk = f.places.find((p) => p.name === "Kiosk")?.id ?? "";
    const result = buildRound(round(c), { [kiosk]: { answers: { elevator: "no" }, note: "" } }, c.settings);
    const el = page(renderResult({ ...c, edited: true }, f, result), "en");
    expect(el.querySelector("#frd-result-summary")?.textContent).toBe("1 new note: 0 Yes, 1 No. 6 details stay Unknown.");
    expect(Array.from(el.querySelectorAll("a.linkbtn")).map((a) => a.getAttribute("download"))).toEqual([
      "round-notes-2026-11-20.json",
      "notes-with-round-2026-11-20.json",
      "round-answers-2026-11-20.csv",
      "round-report-2026-11-20.txt",
    ]);
    expect(el.querySelector("#frd-edited")).not.toBeNull();
    expect(el.querySelector(".frd-changes > li")?.textContent).toBe("Kiosk, No addressElevator: No (no record before)");
  });

  it("leaves out the changes list when only a note was written", () => {
    const c = ctx();
    const f = c.file as StreetFile;
    const kiosk = f.places.find((p) => p.name === "Kiosk")?.id ?? "";
    const result = buildRound(round(c), { [kiosk]: { answers: {}, note: "Closed" } }, c.settings);
    const el = page(renderResult(c, f, result), "en");
    expect(el.querySelector(".frd-changes")).toBeNull();
  });
});

describe("problemTarget and the error summary", () => {
  it("sends each problem to its field", () => {
    const c = ctx();
    const r = round(c);
    const kiosk = r.places[1]?.place.id ?? "";
    expect(problemTarget({ kind: "settings", code: "future" }, r)).toBe(VISITED_ID);
    expect(problemTarget({ kind: "settings", code: "source" }, r)).toBe(SOURCE_ID);
    expect(problemTarget({ kind: "settings", code: "licence" }, r)).toBe(LICENCE_ID);
    expect(problemTarget({ kind: "note", placeId: kiosk, code: "note-long" }, r)).toBe(noteId(1));
    expect(problemTarget({ kind: "empty" }, r)).toBe(answerId(0, "step-free-entry", "yes"));
    expect(problemTarget({ kind: "empty" }, { places: [], over: 0, leftOutDone: 0 })).toBe(noteId(0));
  });

  it("shows the place's name as its own text in a note problem's link", () => {
    const c = ctx();
    const id = round(c).places[0]?.place.id ?? "";
    document.body.innerHTML = renderFileRound({ ...c, problems: [{ kind: "note", placeId: id, code: "note-control" }] });
    expect(document.querySelector("#frd-errors a [data-user-content]")?.textContent).toBe("<b>Café</b>");
  });

  it("shows no round before a file is read", () => {
    document.body.innerHTML = renderFileRound(ctx("en", { file: undefined, round: undefined }));
    expect(document.querySelector("#frd-round-form")).toBeNull();
  });
});

describe("reading the page", () => {
  it("reads answers and notes by place, keeping answers for details not on the page", () => {
    const c = ctx();
    const r = round(c);
    const cafe = r.places[0]?.place.id ?? "";
    document.body.innerHTML = renderFileRound(c);
    (document.getElementById(answerId(0, "step-free-entry", "no")) as HTMLInputElement).checked = true;
    (document.getElementById(noteId(1)) as HTMLTextAreaElement).value = "Note";
    const entries = readEntries(document.body, r, { [cafe]: { answers: { elevator: "yes" }, note: "" } });
    expect(entries[cafe]?.answers).toEqual({ elevator: "yes", "step-free-entry": "no", "accessible-washroom": "skip", "automatic-door": "skip" });
    expect(entries[r.places[1]?.place.id ?? ""]?.note).toBe("Note");
  });

  it("reads the settings, or keeps them when the page has none", () => {
    document.body.innerHTML = renderFileRound(ctx());
    (document.getElementById(SOURCE_ID) as HTMLInputElement).value = "Group";
    expect(readSettings(document.body, defaultSettings(TODAY)).source).toBe("Group");
    document.body.innerHTML = "";
    expect(readSettings(document.body, defaultSettings(TODAY))).toEqual(defaultSettings(TODAY));
    expect(readEntries(document.body, round(ctx()), {})).toEqual({});
  });
});
