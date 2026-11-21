import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import { exportNotes } from "./exchange";
import { FACT_KEYS } from "./facts";
import { ASK_CSV_COLUMNS, DEFAULT_ASK, askCsv, askList, byDetail, chosenKeys, isAskOrder, questionsForPlace, readAskFile, type AskFile } from "./fileask";
import { FILE_ASK_COPY, askFilename, askSummaryText, detailHeading, fileAskStrings, questionHead, reasonText } from "./fileask-copy";
import { QUESTIONS } from "./plan";
import { testNote } from "./testnotes";
import { askText } from "./views-fileask";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 20));

const notes = [
  // Elevator differs; step-free entrance recorded long ago; the rest UNKNOWN.
  testNote("a1", "Central Library", [{ key: "elevator", value: "yes" }, { key: "step-free-entry", value: "yes", on: "2024-05-01" }], "1 King St W"),
  testNote("a2", "Central Library", [{ key: "elevator", value: "no", on: "2026-11-02" }], "1 King St W"),
  // Every detail recorded recently: nothing to ask.
  testNote("b1", "Pool", FACT_KEYS.map((key) => ({ key, value: "yes" as const, on: "2026-10-01" })), "9 Lake Rd"),
  testNote("c1", "Café Rivière", [], "12 King St E"),
];

function file(locale: "en" | "fr" = "en"): AskFile {
  const r = readAskFile(exportNotes(notes, "2026-11-01"), TODAY, locale);
  if (!r.ok) throw new Error(r.error);
  return r.file;
}

describe("readAskFile", () => {
  it("combines notes into places with the App's rules", () => {
    const f = file();
    expect(f.places.map((p) => p.name)).toEqual(["Café Rivière", "Central Library", "Pool"]);
    expect(f.notes).toBe(4);
  });

  it("refuses text that is not an export and files with no readable note", () => {
    expect(readAskFile("x", TODAY, "en")).toEqual({ ok: false, error: "not-json" });
    expect(readAskFile(exportNotes([], "2026-11-01"), TODAY, "en")).toEqual({ ok: false, error: "no-notes" });
  });
});

describe("questions", () => {
  it("asks about UNKNOWN details, differing reports and old answers, with the App's questions", () => {
    const lib = file().places.find((p) => p.name === "Central Library");
    if (!lib) throw new Error("no place");
    const qs = questionsForPlace(lib, DEFAULT_ASK, "en", TODAY);
    expect(qs.map((q) => [q.key, q.reason])).toEqual([
      ["accessible-washroom", "unknown"],
      ["automatic-door", "unknown"],
      ["elevator", "differ"],
      ["step-free-entry", "old"],
    ]);
    expect(qs.find((q) => q.key === "elevator")?.text).toBe(QUESTIONS.elevator.en);
  });

  it("can leave out old answers and limit the details", () => {
    const lib = file().places.find((p) => p.name === "Central Library");
    if (!lib) throw new Error("no place");
    const qs = questionsForPlace(lib, { keys: ["elevator", "step-free-entry"], includeOld: false, query: "", order: "place" }, "en", TODAY);
    expect(qs.map((q) => q.key)).toEqual(["elevator"]);
  });

  it("asks in French with the App's French questions", () => {
    const cafe = file("fr").places.find((p) => p.name === "Café Rivière");
    if (!cafe) throw new Error("no place");
    expect(questionsForPlace(cafe, DEFAULT_ASK, "fr", TODAY)[0]?.text).toBe(QUESTIONS["step-free-entry"].fr);
  });

  it("treats an empty detail list as every detail", () => {
    expect(chosenKeys(DEFAULT_ASK)).toEqual([...FACT_KEYS]);
    expect(chosenKeys({ ...DEFAULT_ASK, keys: ["elevator", "step-free-entry"] })).toEqual(["step-free-entry", "elevator"]);
  });
});

describe("askList", () => {
  it("lists places with questions in name order and counts the rest", () => {
    const list = askList(file(), DEFAULT_ASK, "en", TODAY);
    expect(list.places.map((p) => p.place.name)).toEqual(["Café Rivière", "Central Library"]);
    expect(list.nothingToAsk).toBe(1);
    expect(list.counts).toEqual({ unknown: 6, differ: 1, old: 1 });
  });

  it("searches by name or address", () => {
    const list = askList(file(), { ...DEFAULT_ASK, query: "cafe" }, "en", TODAY);
    expect(list.places.map((p) => p.place.name)).toEqual(["Café Rivière"]);
    expect(list.nothingToAsk).toBe(0);
  });
});

describe("detail by detail", () => {
  it("groups the same questions by detail, in the App's detail order, places in name order", () => {
    const list = askList(file(), DEFAULT_ASK, "en", TODAY);
    const d = byDetail(list);
    expect(d.map((x) => [x.key, x.items.map((i) => [i.place.name, i.question.reason])])).toEqual([
      ["step-free-entry", [["Café Rivière", "unknown"], ["Central Library", "old"]]],
      ["accessible-washroom", [["Café Rivière", "unknown"], ["Central Library", "unknown"]]],
      ["automatic-door", [["Café Rivière", "unknown"], ["Central Library", "unknown"]]],
      ["elevator", [["Café Rivière", "unknown"], ["Central Library", "differ"]]],
    ]);
    const total = d.reduce((n, x) => n + x.items.length, 0);
    expect(total).toBe(list.places.reduce((n, p) => n + p.questions.length, 0));
  });

  it("leaves out details with nothing to ask", () => {
    const list = askList(file(), { ...DEFAULT_ASK, keys: ["elevator"] }, "en", TODAY);
    expect(byDetail(list).map((x) => x.key)).toEqual(["elevator"]);
  });

  it("writes the text detail by detail", () => {
    const text = askText(askList(file(), DEFAULT_ASK, "en", TODAY), "en", TODAY, "detail");
    expect(text).toContain(`Elevator (2 places)\n- Café Rivière, 12 King St E (No record (Unknown))\n  ${QUESTIONS.elevator.en}\n  ${FILE_ASK_COPY.answerLine.en}`);
    expect(text).toContain("- Central Library, 1 King St W (Reports differ)");
  });

  it("knows the orders", () => {
    expect(isAskOrder("detail")).toBe(true);
    expect(isAskOrder("place")).toBe(true);
    expect(isAskOrder("name")).toBe(false);
    expect(isAskOrder(null)).toBe(false);
    expect(detailHeading("elevator", 1, "fr")).toBe("Ascenseur (1 lieu)");
    expect(frenchTypographyIssues(detailHeading("elevator", 3, "fr"))).toEqual([]);
  });
});

describe("downloads", () => {
  it("writes a CSV the App's way: header, one row per question, guarded cells, blank answer columns", () => {
    const evil = readAskFile(exportNotes([testNote("x", "=HYPERLINK(1)", [], null)], "2026-11-01"), TODAY, "en");
    if (!evil.ok) throw new Error("read failed");
    const csv = askCsv(askList(evil.file, DEFAULT_ASK, "en", TODAY));
    const lines = csv.replace(/^\uFEFF/, "").trimEnd().split("\r\n");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(lines[0]).toBe(ASK_CSV_COLUMNS.join(","));
    expect(lines).toHaveLength(1 + FACT_KEYS.length);
    expect(lines[1]?.startsWith("'=HYPERLINK(1),,step-free-entry,unknown,")).toBe(true);
    expect(lines[1]?.endsWith(",,,")).toBe(true);
  });

  it("quotes fields that hold commas or quotes", () => {
    const r = readAskFile(exportNotes([testNote("x", 'The "Hub", east', [], "1 Main St")], "2026-11-01"), TODAY, "en");
    if (!r.ok) throw new Error("read failed");
    expect(askCsv(askList(r.file, DEFAULT_ASK, "en", TODAY))).toContain('"The ""Hub"", east"');
  });

  it("writes text to print with a line to write each answer", () => {
    const text = askText(askList(file(), DEFAULT_ASK, "en", TODAY), "en", TODAY);
    expect(text.startsWith("Questions to ask places\nMade on 2026-11-20\n")).toBe(true);
    expect(text).toContain("2 places to ask, 8 questions.");
    expect(text).toContain("Central Library\n1 King St W\n");
    expect(text).toContain(`- Elevator — Reports differ\n  ${QUESTIONS.elevator.en}\n  ${FILE_ASK_COPY.answerLine.en}`);
    expect(text).not.toContain("Pool");
  });

  it("writes French text with French typography and the UNKNOWN token", () => {
    const text = askText(askList(file("fr"), DEFAULT_ASK, "fr", TODAY), "fr", TODAY);
    expect(text).toContain("Aucune donnée (UNKNOWN)");
    expect(text).not.toMatch(/inconnu/i);
    for (const line of text.split("\n")) if (!/^(Café|Central|Pool|\d)/.test(line)) expect(frenchTypographyIssues(line), line).toEqual([]);
  });

  it("says when there is nothing to ask", () => {
    const text = askText({ places: [], nothingToAsk: 3, counts: { unknown: 0, differ: 0, old: 0 } }, "en", TODAY);
    expect(text).toContain(FILE_ASK_COPY.nothing.en);
  });
});

describe("the copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(fileAskStrings())).toEqual([]);
  });

  it("builds sentences with French typography and no banned words", () => {
    const all = (l: "en" | "fr"): string[] => [askSummaryText(1, 1, l), askSummaryText(3, 7, l), questionHead("elevator", "old", l), reasonText("unknown", l)];
    for (const s of all("fr")) expect(frenchTypographyIssues(s), s).toEqual([]);
    for (const l of ["en", "fr"] as const) for (const s of all(l)) expect(findBanned(s), s).toBeUndefined();
    expect(askSummaryText(1, 1, "fr")).toBe("1 lieu à questionner, 1 question.");
  });

  it("names the removal on the remove button and gives ASCII file names", () => {
    expect(FILE_ASK_COPY.clear.en).toMatch(/^Remove /);
    expect(askFilename("csv", TODAY, "fr")).toBe("questions-a-poser-2026-11-20.csv");
    expect(askFilename("text", TODAY, "en")).toBe("questions-to-ask-2026-11-20.txt");
  });
});
