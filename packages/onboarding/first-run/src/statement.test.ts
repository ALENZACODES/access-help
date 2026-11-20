import { describe, expect, it } from "vitest";
import { CONTRIBUTOR_SOURCE, FACT_KEYS, parseNote, type FactKey, type Tri } from "./index";
import {
  MAX_PER_DETAIL,
  MAX_SENTENCE,
  MAX_TEXT,
  cleanStatementForm,
  cueCounts,
  dateLooksRight,
  emptyStatementForm,
  foldKeepLength,
  isPageUrl,
  mixed,
  noteText,
  readSentence,
  readStatement,
  splitSentences,
  statementNote,
  statementValues,
  validateStatement,
  type Cue,
  type StatementForm,
} from "./statement";

const TODAY = new Date(Date.UTC(2026, 11 - 1, 19));

/** The cue and the marked words for one sentence and one detail. */
function cue(sentence: string, key: FactKey): [Cue, string] | undefined {
  const m = readSentence(sentence, key);
  return m ? [m.cue, m.sentence.slice(m.start, m.end)] : undefined;
}

describe("foldKeepLength", () => {
  it("drops accents and case and straightens apostrophes, keeping every position", () => {
    const s = "L’Entrée Élevée";
    const f = foldKeepLength(s);
    expect(f).toBe("l'entree elevee");
    expect(f.length).toBe(s.length);
  });

  it("keeps characters that have no single base letter", () => {
    expect(foldKeepLength("Œuvre ß 😀")).toBe("œuvre ß 😀");
  });
});

describe("splitSentences", () => {
  it("splits at sentence ends, semicolons and line breaks, and drops list bullets", () => {
    const text = "Welcome! The entrance is level; doors open inward.\n\n- Elevator to all floors\n• Accessible washroom\n2) Parking at the back";
    expect(splitSentences(text)).toEqual([
      "Welcome!",
      "The entrance is level;",
      "doors open inward.",
      "Elevator to all floors",
      "Accessible washroom",
      "Parking at the back",
    ]);
  });

  it("splits only where a space follows the stop, and squeezes spaces", () => {
    expect(splitSentences("Open 9 a.m.–5 p.m.   Ramp   at   St.George")).toEqual(["Open 9 a.m.–5 p.m.", "Ramp at St.George"]);
  });

  it("reads at most 20,000 characters and cuts long sentences", () => {
    const long = `${"word ".repeat(200)}end`;
    const out = splitSentences(long);
    expect(out[0]?.length).toBe(MAX_SENTENCE);
    expect(out[0]?.endsWith("…")).toBe(true);
    const huge = "Elevator here. ".repeat(3000);
    expect(splitSentences(huge).join(" ").length).toBeLessThanOrEqual(MAX_TEXT);
  });

  it("gives nothing for empty or blank text", () => {
    expect(splitSentences("")).toEqual([]);
    expect(splitSentences(" \n \r\n\t ")).toEqual([]);
  });
});

describe("step-free entrance", () => {
  it.each([
    ["Our main entrance is step-free.", "has", "step-free"],
    ["The front entry is stepless.", "has", "stepless"],
    ["There is a level entrance on Bay Street.", "has", "level entrance"],
    ["There are no steps to get in.", "has", "no steps"],
    ["A ramp leads to the side door.", "has", "ramp"],
    ["There are two steps at the entrance.", "lacks", "steps at the entrance"],
    ["The entrance has three steps.", "lacks", "entrance has three steps"],
    ["L’entrée comporte trois marches.", "lacks", "entrée comporte trois marches"],
    ["The building is not step-free.", "lacks", "not step-free"],
    ["L’entrée est de plain-pied.", "has", "de plain-pied"],
    ["Accès sans marche par la porte latérale.", "has", "sans marche"],
    ["Il y a deux marches à l’entrée.", "lacks", "marches à l’entrée"],
    ["Il n’y a pas de rampe.", "lacks", "pas de rampe"],
    ["The ramp is closed for repairs this month.", "changes", "ramp"],
  ] as const)("%s → %s", (sentence, c, words) => {
    expect(cue(sentence, "step-free-entry")).toEqual([c, words]);
  });

  it("does not list a sentence that never names the entrance", () => {
    expect(cue("We are open on Sundays.", "step-free-entry")).toBeUndefined();
  });
});

describe("accessible washroom", () => {
  it.each([
    ["Accessible washrooms are on the ground floor.", "has", "Accessible washrooms"],
    ["There is a universal washroom near the café.", "has", "universal washroom"],
    ["Washrooms are upstairs.", "lacks", "Washrooms are upstairs"],
    ["There is no accessible washroom.", "lacks", "no accessible washroom"],
    ["The washroom is not accessible.", "lacks", "washroom is not accessible"],
    ["Washrooms are at the back.", "mentions", "Washrooms"],
    ["Toilettes accessibles au rez-de-chaussée.", "has", "Toilettes accessibles"],
    ["Il n’y a pas de toilettes accessibles.", "lacks", "pas de toilettes accessibles"],
    ["Les toilettes ne sont pas adaptées.", "lacks", "toilettes ne sont pas adaptées"],
  ] as const)("%s → %s", (sentence, c, words) => {
    expect(cue(sentence, "accessible-washroom")).toEqual([c, words]);
  });
});

describe("automatic door", () => {
  it.each([
    ["The front has an automatic door.", "has", "automatic door"],
    ["Push-button doors at both entrances.", "has", "Push-button doors"],
    ["There is a power door opener.", "has", "power door"],
    ["Door opener on the left.", "has", "Door opener"],
    ["There is no automatic door.", "lacks", "no automatic door"],
    ["The automatic door opener is out of order.", "changes", "automatic door"],
    ["Porte automatique à l’entrée principale.", "has", "Porte automatique"],
    ["Ouvre-porte électrique côté stationnement.", "has", "Ouvre-porte"],
    ["Il n’y a pas de porte automatique.", "lacks", "pas de porte automatique"],
  ] as const)("%s → %s", (sentence, c, words) => {
    expect(cue(sentence, "automatic-door")).toEqual([c, words]);
  });
});

describe("elevator", () => {
  it.each([
    ["An elevator serves all floors.", "has", "elevator"],
    ["Lifts to every level.", "has", "Lifts"],
    ["There is no elevator.", "lacks", "There is no elevator"],
    ["The upper floor is reached by stairs only.", "undefined", ""],
    ["The elevator is not available on weekends.", "lacks", "elevator is not available"],
    ["The elevator is temporarily out of service.", "changes", "elevator"],
    ["Un ascenseur dessert tous les étages.", "has", "ascenseur"],
    ["Il n’y a pas d’ascenseur.", "lacks", "pas d’ascenseur"],
    ["Ascenseur en panne jusqu’au 3 décembre.", "changes", "Ascenseur"],
    ["Plateforme élévatrice à l’arrière.", "has", "Plateforme élévatrice"],
  ] as const)("%s → %s", (sentence, c, words) => {
    expect(cue(sentence, "elevator") ?? ["undefined", ""]).toEqual([c, words]);
  });

  it("does not read the verb 'lift' as an elevator", () => {
    expect(cue("Please lift up the latch to open the gate.", "elevator")).toBeUndefined();
    expect(cue("Staff can lift the bags for you.", "elevator")).toBeUndefined();
  });

  it("reads a negation before a plain mention as 'lacks'", () => {
    expect(cue("This building has never had an elevator.", "elevator")).toEqual(["lacks", "elevator"]);
  });
});

describe("readStatement", () => {
  const PAGE = `Accessibility at the Library
Our main entrance is step-free, with a ramp on King St.
There is no elevator; the second floor is reached by stairs only.
- Accessible washrooms are on the ground floor.
The automatic door opener is temporarily out of service.`;

  it("gives every detail, in the App's order, with its sentences in the order of the text", () => {
    const f = readStatement(PAGE);
    expect(f.map((x) => x.key)).toEqual(FACT_KEYS);
    expect(f.map((x) => x.mentions.map((m) => m.cue))).toEqual([["has"], ["has"], ["changes"], ["lacks"]]);
  });

  it("lists at most 8 sentences per detail and counts the rest", () => {
    const f = readStatement("The elevator is here. ".repeat(12));
    const el = f.find((x) => x.key === "elevator");
    expect(el?.mentions).toHaveLength(MAX_PER_DETAIL);
    expect(el?.more).toBe(4);
  });

  it("finds nothing in text about something else", () => {
    for (const f of readStatement("We sell bread and coffee. Open daily.")) expect(f.mentions).toEqual([]);
  });

  it("counts cues and spots sentences pointing both ways", () => {
    const f = readStatement("There is an elevator. There is no elevator. The elevator is out of service.").find((x) => x.key === "elevator");
    if (!f) throw new Error("no finding");
    expect(cueCounts(f)).toEqual({ has: 1, lacks: 1, changes: 1, mentions: 0 });
    expect(mixed(f)).toBe(true);
    const plain = readStatement("There is an elevator.").find((x) => x.key === "elevator");
    expect(plain && mixed(plain)).toBe(false);
  });
});

describe("the note form", () => {
  const filled = (more: Partial<StatementForm> = {}): StatementForm => ({
    ...emptyStatementForm(TODAY),
    placeName: "Library",
    address: "1 Main St",
    text: "There is an elevator.",
    licence: "CC0-1.0",
    answers: { "step-free-entry": "unknown", "accessible-washroom": "unknown", "automatic-door": "unknown", elevator: "yes" },
    ...more,
  });

  it("starts with every detail UNKNOWN, no licence and today's date", () => {
    const f = emptyStatementForm(TODAY);
    expect(Object.values(f.answers)).toEqual(["unknown", "unknown", "unknown", "unknown"]);
    expect(f.licence).toBe("");
    expect(f.observedOn).toBe("2026-11-19");
  });

  it("needs the text, a place name, one Yes or No, a licence and a good date", () => {
    const codes = (f: StatementForm): string[] => validateStatement(f, TODAY, "en").map((e) => `${e.field}:${e.code}`);
    expect(codes(emptyStatementForm(TODAY))).toEqual(["text:text-required", "placeName:required", "details:needs-one-detail", "licence:licence-required"]);
    expect(codes(filled())).toEqual([]);
    expect(codes(filled({ observedOn: "2026-11-20" }))).toEqual(["observedOn:future-date"]);
    expect(codes(filled({ address: "me@example.com" }))).toEqual(["address:personal-email"]);
  });

  it("accepts only a plain web address for the page, and blames the address for anything wrong in it", () => {
    const codes = (pageUrl: string): string[] => validateStatement(filled({ pageUrl }), TODAY, "en").map((e) => `${e.field}:${e.code}`);
    expect(codes("https://example.org/access")).toEqual([]);
    expect(codes("javascript:alert(1)")).toEqual(["pageUrl:bad-url"]);
    expect(codes("ftp://example.org/x")).toEqual(["pageUrl:bad-url"]);
    expect(codes("https://user:pw@example.org/")).toEqual(["pageUrl:bad-url"]);
    expect(codes("https://localhost/x")).toEqual(["pageUrl:bad-url"]);
    expect(codes("https://example.org/contact?email=me@example.com")).toEqual(["pageUrl:personal-email"]);
    expect(isPageUrl(`https://example.org/${"a".repeat(300)}`)).toBe(false);
  });

  it("says in the note where the answers came from, in the person's language", () => {
    expect(noteText("", "en")).toBe("Read from the place’s own accessibility page.");
    expect(noteText(" https://example.org/a ", "fr")).toBe("Lu sur la page d’accessibilité du lieu. https://example.org/a");
    expect(statementValues(filled({ pageUrl: "https://example.org/a" }), "en").note).toBe("Read from the place’s own accessibility page. https://example.org/a");
  });

  it("builds a note with source, licence and date on each Yes or No only", () => {
    const note = statementNote(filled({ observedOn: "2026-11-18" }), TODAY, "en", () => "n1");
    expect(note.id).toBe("n1");
    expect(note.facts.find((f) => f.key === "elevator")).toEqual({
      key: "elevator",
      value: "yes",
      provenance: { source: CONTRIBUTOR_SOURCE, licence: "CC0-1.0", recordedOn: "2026-11-18" },
    });
    for (const f of note.facts.filter((x) => x.key !== "elevator")) expect(f.provenance).toBeUndefined();
    expect(parseNote(JSON.parse(JSON.stringify(note)))).toEqual(note);
  });

  it("refuses to build a note from a form with errors", () => {
    expect(() => statementNote(filled({ licence: "" }), TODAY, "en")).toThrow();
  });

  it("cleans untrusted input: lengths cut, answers and licence only from the lists", () => {
    const f = cleanStatementForm(
      { placeName: "x".repeat(500), text: 42, answers: { elevator: "maybe", "step-free-entry": "no" }, licence: "Proprietary", observedOn: "" },
      TODAY,
    );
    expect(f.placeName.length).toBe(121);
    expect(f.text).toBe("");
    expect(f.answers).toEqual({ "step-free-entry": "no", "accessible-washroom": "unknown", "automatic-door": "unknown", elevator: "unknown" } satisfies Record<FactKey, Tri>);
    expect(f.licence).toBe("");
    expect(f.observedOn).toBe("2026-11-19");
    // The cut name is one too long on purpose, so the form says it is too long instead of saving a shortened name.
    expect(validateStatement({ ...f, text: "x" }, TODAY, "en").some((e) => e.field === "placeName" && e.code === "too-long")).toBe(true);
  });

  it("says whether a date would be accepted", () => {
    expect(dateLooksRight("2026-11-19", TODAY)).toBe(true);
    expect(dateLooksRight("2026-11-20", TODAY)).toBe(false);
    expect(dateLooksRight("2026-02-30", TODAY)).toBe(false);
  });
});

describe("text from the place's written reply", () => {
  const reply = (more: Partial<StatementForm> = {}): StatementForm => ({
    ...emptyStatementForm(TODAY),
    placeName: "Library",
    text: "Yes, there is an elevator.",
    licence: "CC0-1.0",
    from: "reply",
    answers: { "step-free-entry": "unknown", "accessible-washroom": "unknown", "automatic-door": "unknown", elevator: "yes" },
    ...more,
  });

  it("says in the note that the answers came from the reply", () => {
    expect(noteText("", "en", "reply")).toBe("Read from the place’s written reply.");
    expect(noteText("", "fr", "reply")).toBe("Lu dans la réponse écrite du lieu.");
    expect(statementNote(reply(), TODAY, "fr", () => "r1").note).toBe("Lu dans la réponse écrite du lieu.");
  });

  it("starts as a page, and keeps 'reply' only when asked for exactly", () => {
    expect(emptyStatementForm(TODAY).from).toBe("page");
    expect(cleanStatementForm({ from: "reply" }, TODAY).from).toBe("reply");
    expect(cleanStatementForm({ from: "REPLY" }, TODAY).from).toBe("page");
    expect(cleanStatementForm({}, TODAY).from).toBe("page");
  });
});
