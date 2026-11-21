import { describe, expect, it } from "vitest";
import { frenchTypographyIssues } from "../../src/paths";
import { auditCopy } from "./audit";
import { exportNotes } from "./exchange";
import { FACT_KEYS } from "./facts";
import {
  FILE_LETTERS_COPY,
  FRENCH_VERSION,
  LETTER_TEXT,
  allLetters,
  asksText,
  fileLettersStrings,
  languageText,
  letterText,
  lettersErrorText,
  lettersFilename,
  problemText,
  questionText,
  reasonText,
  daysText,
  lineText,
  setSummary,
  trackErrorText,
  trackProblemText,
  trackSummary,
  waitingText,
} from "./fileletters-copy";
import { CSV_MAX_ROWS } from "./csvimport";
import { FOLLOW_UP_DAYS, TRACK_PROBLEMS, type Tracking } from "./lettertrack";
import { readStreetFile } from "./filestreets";
import { makeLetters, type Letter, type LetterOptions, type LetterProblem, type LetterSet } from "./letters";
import { testNote } from "./testnotes";
import { findBanned } from "./wording";

const TODAY = new Date(Date.UTC(2026, 10, 21));
const NB = "\u00A0";
const NN = "\u202F";

function letters(): LetterSet {
  const r = readStreetFile(
    exportNotes(
      [
        testNote("a", "Library", [{ key: "elevator", value: "yes" }], "100 King St W, Toronto ON M5H 2N2"),
        testNote("d1", "Café", [{ key: "elevator", value: "yes" }, { key: "step-free-entry", value: "yes" }, { key: "accessible-washroom", value: "yes" }, { key: "automatic-door", value: "yes" }], "12 King St W"),
        testNote("d2", "Café", [{ key: "elevator", value: "no", source: "Visit" }], "12 King St W"),
        testNote("n", "Cart", [{ key: "step-free-entry", value: "yes" }, { key: "accessible-washroom", value: "yes" }, { key: "automatic-door", value: "yes" }], null),
      ],
      "2026-11-01",
    ),
    TODAY,
    "en",
  );
  if (!r.ok) throw new Error(r.error);
  return makeLetters(r.file, false, TODAY, "en");
}

const first = (set: LetterSet, name: string): Letter => {
  const l = set.letters.find((x) => x.place.name === name);
  if (!l) throw new Error(name);
  return l;
};

const opts = (o: Partial<LetterOptions> = {}): LetterOptions => ({ language: "en", includeOld: false, sender: "Ana Silva", contact: "ana@example.org", ...o });

describe("copy", () => {
  it("passes the App's copy audit, the letters' own words included", () => {
    const strings = fileLettersStrings();
    expect(strings.some(([k]) => k.startsWith("letterText."))).toBe(true);
    expect(auditCopy(strings)).toEqual([]);
  });

  it("has a question in each language for every detail, a text for every reason, problem and file error, without banned words", () => {
    for (const l of ["en", "fr"] as const) {
      for (const k of FACT_KEYS) expect(findBanned(questionText(k, l)), k).toBeUndefined();
      for (const r of ["unknown", "differ", "old"] as const) expect(reasonText(r, l).length).toBeGreaterThan(0);
      for (const p of ["sender-empty", "sender-long", "sender-control", "contact-long", "contact-control"] as LetterProblem[]) expect(problemText(p, l).length).toBeGreaterThan(0);
      for (const e of ["empty", "too-large", "not-json", "wrong-format", "wrong-version", "no-notes"] as const) expect(lettersErrorText(e, l).length).toBeGreaterThan(0);
      for (const x of ["en", "fr", "both"] as const) expect(languageText(x, l).length).toBeGreaterThan(0);
    }
    expect(findBanned(FRENCH_VERSION)).toBeUndefined();
  });

  it("says the letters are signed by the person, that nothing is sent or saved, and that a letter records nothing", () => {
    expect(FILE_LETTERS_COPY.privacy.en).toContain("Nothing is saved and nothing is sent");
    expect(FILE_LETTERS_COPY.recordsNothing.en).toContain("A letter records nothing.");
    expect(FILE_LETTERS_COPY.senderHint.en).toBe("The letters are signed with this name.");
  });

  it("asks rather than tells: no letter text says a detail is missing or wrong", () => {
    for (const [, p] of fileLettersStrings().filter(([k]) => k.startsWith("letterText."))) {
      expect(p.en).not.toMatch(/\b(missing|wrong|incorrect|error)\b/i);
      expect(p.fr).not.toMatch(/\b(manquant|faux|erron)/i);
    }
  });

  it("names the tools it points to by their own titles", () => {
    expect(FILE_LETTERS_COPY.recordsNothing.en).toContain("Record what you found on a round");
    expect(FILE_LETTERS_COPY.recordsNothing.fr).toContain("Noter ce que vous avez constaté lors d’une tournée");
  });
});

describe("one letter", () => {
  it("is addressed to the place, numbers each question with its reason, and has a reply box for each", () => {
    const text = letterText(first(letters(), "Café"), opts());
    const lines = text.split("\n");
    expect(lines.slice(0, 3)).toEqual(["Café", "12 King St W", ""]);
    expect(text).toContain("1. Is there an elevator? We have reports that do not agree.\n");
    expect(text).toContain("Reply\n-----\n1. Is there an elevator?\n   [ ] Yes   [ ] No   [ ] Not sure\n");
    expect(text).toContain("Please answer only what you know.");
    expect(text).toContain("Answered by: ________________\nDate: ________________\n");
    expect(text.endsWith("Thank you,\nAna Silva\nYou can reply to: ana@example.org\n")).toBe(true);
  });

  it("asks in the App's detail order, saying why each is asked", () => {
    const text = letterText(first(letters(), "Library"), opts());
    expect(text).toContain(
      "1. Is there an entrance with no steps? We have no record of this yet.\n2. Is there an accessible washroom? We have no record of this yet.\n3. Does the entrance have an automatic door? We have no record of this yet.\n",
    );
    expect(text).not.toContain("elevator");
  });

  it("leaves out the address line when the place has none, and the contact line when none is given", () => {
    const text = letterText(first(letters(), "Cart"), opts({ contact: "   " }));
    expect(text.split("\n").slice(0, 3)).toEqual(["Cart", "", "Hello,"]);
    expect(text).not.toContain("You can reply to");
    expect(text.endsWith("Thank you,\nAna Silva\n")).toBe(true);
  });

  it("puts the typed name and contact on one tidy line", () => {
    const text = letterText(first(letters(), "Cart"), opts({ sender: "  Ana   Silva ", contact: " 416 555  0100 " }));
    expect(text).toContain("\nAna Silva\nYou can reply to: 416 555 0100\n");
  });

  it("writes French with French typography outside the place's own words", () => {
    const text = letterText(first(letters(), "Café"), opts({ language: "fr" }));
    expect(text).toContain(`Bonjour,`);
    expect(text).toContain(`1. Y a-t-il un ascenseur${NN}? Nous avons des rapports qui ne concordent pas.\n`);
    expect(text).toContain("[ ] Oui   [ ] Non   [ ] Pas sûr");
    expect(text).toContain(`Réponse de${NB}: ________________`);
    expect(text).toContain(`Vous pouvez répondre à${NB}: ana@example.org`);
    for (const line of text.split("\n").slice(2)) expect(frenchTypographyIssues(line), line).toEqual([]);
  });

  it("puts both languages on one page, English first, the French half under its own heading", () => {
    const text = letterText(first(letters(), "Café"), opts({ language: "both" }));
    const at = text.indexOf(`\n${FRENCH_VERSION}\n${"=".repeat(FRENCH_VERSION.length)}\n`);
    expect(at).toBeGreaterThan(0);
    expect(text.slice(0, at)).toContain("Is there an elevator?");
    expect(text.slice(0, at)).not.toContain("ascenseur");
    expect(text.slice(at)).toContain("Y a-t-il un ascenseur");
    expect(text.slice(at)).not.toContain("Is there an elevator?");
  });

  it("is the same whatever language the page is in", () => {
    const set = letters();
    expect(allLetters(set, opts())).toBe(set.letters.map((l) => letterText(l, opts())).join(`\n${"=".repeat(60)}\n\n`));
  });
});

describe("summaries and names", () => {
  it("counts the letters and the places left out, in both languages", () => {
    const set = letters();
    expect(setSummary(set, "en")).toBe("3 letters, one for each place with something to ask.");
    expect(setSummary({ ...set, nothingOpen: 1, over: 2 }, "en")).toBe(
      "3 letters, one for each place with something to ask. 1 place with nothing to ask gets no letter. 2 more places are past the limit of 200 letters; split the file to write to them.",
    );
    const fr = setSummary({ ...set, nothingOpen: 2, over: 1 }, "fr");
    expect(fr).toBe(
      `3 lettres, une pour chaque lieu à qui poser une question. 2 lieux sans question ne reçoivent pas de lettre. 1 lieu de plus dépasse la limite de 200 lettres${NN}; divisez le fichier pour leur écrire.`,
    );
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("says so when no place has anything to ask", () => {
    expect(setSummary({ letters: [], nothingOpen: 4, over: 0 }, "en")).toBe("No place has anything to ask about. 4 places with nothing to ask get no letter.");
    expect(setSummary({ letters: [], nothingOpen: 1, over: 0 }, "fr")).toBe("Aucun lieu n’a de question à recevoir. 1 lieu sans question ne reçoit pas de lettre.");
  });

  it("lists what a letter asks, for the page", () => {
    const names = (k: string) => k.toUpperCase();
    expect(asksText(first(letters(), "Café").asks, names, "en")).toBe("ELEVATOR (reports differ)");
    expect(asksText(first(letters(), "Cart").asks, names, "fr")).toBe("ELEVATOR (aucune donnée)");
  });

  it("names the downloads with the day, in the page's language", () => {
    expect(lettersFilename("all", 0, TODAY, "en")).toBe("letters-2026-11-21.txt");
    expect(lettersFilename("csv", 0, TODAY, "fr")).toBe("suivi-des-lettres-2026-11-21.csv");
    expect(lettersFilename("notes", 0, TODAY, "en")).toBe("notes-of-places-written-to-2026-11-21.json");
    expect(lettersFilename("one", 6, TODAY, "fr")).toBe("lettre-007-2026-11-21.txt");
  });

  it("keeps the reply boxes the same width in both languages' letters", () => {
    expect(LETTER_TEXT.boxes.en.split("[ ]").length).toBe(4);
    expect(LETTER_TEXT.boxes.fr.split("[ ]").length).toBe(4);
  });
});

describe("following up", () => {
  const tr: Tracking = {
    notSent: [{ line: 2, name: "A", address: "", sentOn: "", replyOn: "" }],
    waiting: [
      { line: 3, name: "B", address: "", sentOn: "2026-09-01", replyOn: "", days: 81 },
      { line: 4, name: "C", address: "", sentOn: "2026-11-20", replyOn: "", days: 1 },
    ],
    replied: [],
    unusable: [{ line: 5, name: "D", address: "", sentOn: "x", replyOn: "", problem: "sent-date" }],
  };

  it("counts each group, and the waits long enough to follow up", () => {
    expect(trackSummary(tr, 1, "en")).toBe(`4 letters: 1 not sent yet, 2 waiting for a reply (1 for ${FOLLOW_UP_DAYS} days or more), 0 replied, 1 row to fix.`);
    const fr = trackSummary(tr, 1, "fr");
    expect(fr).toBe(`4 lettres${NB}: 1 pas encore envoyée, 2 en attente de réponse (1 depuis ${FOLLOW_UP_DAYS}${NB}jours ou plus), 0 avec réponse, 1 ligne à corriger.`);
    expect(frenchTypographyIssues(fr)).toEqual([]);
  });

  it("says how long a letter has waited, in both languages", () => {
    const w = tr.waiting[1];
    if (!w) throw new Error("no wait");
    expect(waitingText(w, "en")).toBe("Sent 2026-11-20, waiting 1 day");
    expect(waitingText(w, "fr")).toBe(`Envoyée le 2026-11-20, en attente depuis 1${NB}jour`);
    expect(daysText(81, "en")).toBe("81 days");
    expect(daysText(81, "fr")).toBe(`81${NB}jours`);
    expect(lineText(5, "fr")).toBe("Ligne 5");
  });

  it("explains every problem a row can have, and names the missing columns", () => {
    for (const l of ["en", "fr"] as const) for (const p of TRACK_PROBLEMS) expect(trackProblemText(p, l).length, p).toBeGreaterThan(0);
    expect(trackErrorText("missing-columns", ["sent_on", "reply_on"], "en")).toBe("The list is missing columns: sent_on, reply_on.");
    expect(trackErrorText("missing-columns", ["sent_on"], "fr")).toBe(`Il manque des colonnes à la liste${NB}: sent_on.`);
    expect(trackErrorText("no-rows", undefined, "en")).toBe("The list has a header but no rows.");
  });

  it("gives the App's own row limit in the too-many-rows message", () => {
    expect(CSV_MAX_ROWS).toBe(5000);
    expect(FILE_LETTERS_COPY.track.errors["too-many-rows"].en).toContain("5,000");
    expect(FILE_LETTERS_COPY.track.errors["too-many-rows"].fr).toBe(`La liste compte plus de 5${NN}000${NB}lignes.`);
  });

  it("says a reply is not a record until the person adds it with a source and date", () => {
    expect(FILE_LETTERS_COPY.track.afterReply.en).toContain("A reply is not a record yet.");
  });
});
