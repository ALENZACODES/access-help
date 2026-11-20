import { describe, expect, it } from "vitest";
import { QUESTIONS, auditCopy, buildRoundup, findBanned, groupPlaces, placeId, type Checklist, type Note, type RoundupPlace } from "./index";
import { CALL_COPY, callScriptFilename, callScriptLines, callScriptText, callStrings, scriptQuestions } from "./callscript";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));
const NOTES = (): Note[] => [
  testNote("l1", "Library", [{ key: "step-free-entry", value: "yes" }]),
  testNote("c1", "Cafe", [{ key: "step-free-entry", value: "yes" }, { key: "elevator", value: "yes" }], null),
];
const LIBRARY = placeId({ placeName: "Library", address: "1 Main St" });
const CAFE = placeId({ placeName: "Cafe", address: undefined });

function roundupPlace(name: "Library" | "Cafe", checklist: Checklist = {}, locale: "en" | "fr" = "en"): RoundupPlace {
  const r = buildRoundup(groupPlaces(NOTES(), locale), [LIBRARY, CAFE], { "step-free-entry": "yes", elevator: "yes", "accessible-washroom": "yes" }, checklist, locale, TODAY);
  const p = r.places.find((x) => x.place.name === name);
  if (!p) throw new Error(name);
  return p;
}

describe("scriptQuestions", () => {
  it("keeps the questions not yet ticked, in the round-up's order", () => {
    expect(scriptQuestions(roundupPlace("Library"))).toEqual([QUESTIONS["accessible-washroom"].en, QUESTIONS.elevator.en]);
    const ticked: Checklist = { [LIBRARY]: { elevator: { asked: true, answer: "" } } };
    expect(scriptQuestions(roundupPlace("Library", ticked))).toEqual([QUESTIONS["accessible-washroom"].en]);
  });
});

describe("callScriptLines", () => {
  it("greets with the place name, numbers the questions and asks for a name and date", () => {
    expect(callScriptLines(roundupPlace("Library"), "en")).toEqual([
      "Hello. I am planning a visit to Library and have a few questions about access.",
      `1. ${QUESTIONS["accessible-washroom"].en}`,
      `2. ${QUESTIONS.elevator.en}`,
      CALL_COPY.thanks.en,
    ]);
  });

  it("is empty when every question is ticked as asked", () => {
    const all: Checklist = { [LIBRARY]: { elevator: { asked: true, answer: "" }, "accessible-washroom": { asked: true, answer: "" } } };
    expect(callScriptLines(roundupPlace("Library", all), "en")).toEqual([]);
  });

  it("speaks French", () => {
    const fr = callScriptLines(roundupPlace("Cafe", {}, "fr"), "fr");
    expect(fr[0]).toBe("Bonjour. Je prépare une visite à Cafe et j’ai quelques questions sur l’accès.");
    expect(fr[1]).toBe(`1. ${QUESTIONS["accessible-washroom"].fr}`);
    expect(fr[fr.length - 1]).toBe(CALL_COPY.thanks.fr);
  });
});

describe("callScriptText", () => {
  it("writes a titled script with the address, the after-call note and the date", () => {
    const text = callScriptText(roundupPlace("Library"), "en", TODAY);
    expect(text.startsWith("Call script: Library\n====================\n\n1 Main St\n\nHello.")).toBe(true);
    expect(text).toContain(`\n\n${CALL_COPY.after.en}\n\nMade on 2026-11-19.\n`);
  });

  it("says there is no script when nothing is left to ask", () => {
    const all: Checklist = { [CAFE]: { "accessible-washroom": { asked: true, answer: "" } } };
    expect(callScriptText(roundupPlace("Cafe", all), "en", TODAY)).toContain(CALL_COPY.noScript.en);
  });

  it("keeps French typography and makes no promise for the place", () => {
    const fr = callScriptText(roundupPlace("Library", {}, "fr"), "fr", TODAY);
    expect(fr).not.toMatch(/[^\u00A0\u202F](?=[:;?!])/u);
    for (const l of ["en", "fr"] as const) {
      const text = callScriptText(roundupPlace("Library", {}, l), l, TODAY);
      expect(findBanned(text), l).toBeUndefined();
      expect(text, l).not.toMatch(/\b(guarantee|verified|accessible to you|garanti|vérifié)\b/i);
    }
  });

  it("names the file by place, date and language", () => {
    expect(callScriptFilename(roundupPlace("Library"), TODAY, "en")).toBe(`call-${LIBRARY}-2026-11-19-en.txt`);
    expect(callScriptFilename(roundupPlace("Library"), TODAY, "fr")).toBe(`appel-${LIBRARY}-2026-11-19-fr.txt`);
  });

  it("strings pass the App's copy audit", () => {
    expect(auditCopy(callStrings()).map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
  });
});
