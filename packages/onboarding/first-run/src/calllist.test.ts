import { describe, expect, it } from "vitest";
import { FACT_KEYS, QUESTIONS, auditCopy, findBanned, groupPlaces, type Note } from "./index";
import { CALL_LIST_COPY, callListFilename, callListLabel, callListStrings, callListText, renderCallListLink } from "./calllist";
import { scriptLines, scriptText } from "./callscript";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));
const NOTES = (): Note[] => [testNote("a1", "Arena", [], "9 Main St"), testNote("b1", "Bakery", [], null)];
const places = () => groupPlaces(NOTES(), "en");

describe("callListText", () => {
  it("writes the question, then each place with lines for the answer and who gave it", () => {
    const text = callListText("elevator", places(), "en", TODAY);
    expect(text.startsWith("Call list: Elevator\n===================\n\n")).toBe(true);
    expect(text).toContain(`Ask each place: ${QUESTIONS.elevator.en}\n\n1. Arena, 9 Main St\n   Answer: ____________________\n   Who answered, and the date: ____________________\n\n2. Bakery\n`);
    expect(text.endsWith(`${CALL_LIST_COPY.after.en}\nMade on 2026-11-19.\n`)).toBe(true);
  });

  it("keeps French typography for every detail", () => {
    for (const key of FACT_KEYS) {
      const fr = callListText(key, places(), "fr", TODAY);
      expect(fr, key).toContain(`Demandez à chaque lieu\u00A0: ${QUESTIONS[key].fr}`);
      expect(fr, key).not.toMatch(/[^\u00A0\u202F](?=[:;?!])/u);
      expect(findBanned(fr), key).toBeUndefined();
    }
  });

  it("names the file and the link by detail, so each link on a page is unique", () => {
    expect(callListFilename("elevator", TODAY, "en")).toBe("call-list-elevator-2026-11-19-en.txt");
    expect(callListFilename("elevator", TODAY, "fr")).toBe("liste-appels-elevator-2026-11-19-fr.txt");
    const labels = FACT_KEYS.map((k) => callListLabel(k, "en"));
    expect(new Set(labels).size).toBe(labels.length);
    expect(callListLabel("elevator", "fr")).toBe("Télécharger la liste d’appels pour Ascenseur");
  });

  it("gives no link when there is no place to call", () => {
    expect(renderCallListLink("elevator", [], "en", TODAY)).toBe("");
    expect(renderCallListLink("elevator", places(), "en", TODAY)).toContain('data-call-list="elevator"');
  });

  it("strings pass the App's copy audit", () => {
    expect(auditCopy(callListStrings()).map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
  });
});

describe("scripts for any list of questions", () => {
  it("are empty with no question and numbered otherwise", () => {
    expect(scriptLines("Arena", [], "en")).toEqual([]);
    expect(scriptLines("Arena", ["Q1?", "Q2?"], "en").slice(1, 3)).toEqual(["1. Q1?", "2. Q2?"]);
  });

  it("write the address when there is one", () => {
    const p = places().find((x) => x.name === "Arena");
    if (!p) throw new Error("no place");
    expect(scriptText(p, [QUESTIONS.elevator.en], "en", TODAY)).toContain("\n\n9 Main St\n\nHello.");
  });
});
