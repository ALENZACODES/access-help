// @vitest-environment jsdom
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { FACT_KEYS, auditCopy, auditDom, groupPlaces, type Locale, type Place } from "./index";
import { addStop, answerQuestion, editAnswer, emptySurvey, leaveStop, setLicence, startSurvey, type StartError, type StopError, type Survey } from "./survey";
import { SURVEY_COPY, STOP_ERRORS, addPlaceLabel, overallText, questionOf, saveLabel, savedMessage, stopHeading, surveyStrings } from "./survey-copy";
import { candidates, renderSurvey, surveyFact, type SurveyContext } from "./views-survey";
import { AXE_OPTIONS } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));
const LOCALES: readonly Locale[] = ["en", "fr"];

function ok(r: { ok: true; survey: Survey } | { ok: false }): Survey {
  if (!r.ok) throw new Error("expected ok");
  return r.survey;
}

function planned(): Survey {
  let s = ok(addStop(emptySurvey(TODAY), "Library", "1 Main St", TODAY));
  s = ok(addStop(s, "Bakery", "", TODAY, ["elevator"]));
  return setLicence(s, "CC-BY-4.0");
}

const PLACES = (): Place[] =>
  groupPlaces(
    [
      testNote("a", "Arena", [{ key: "elevator", value: "yes" }]),
      testNote("b", "Arena", [{ key: "elevator", value: "no" }]),
      testNote("c", "Cafe", [{ key: "elevator", value: "yes" }], "3 Main St"),
      testNote("d", "Done", FACT_KEYS.map((key) => ({ key, value: "yes" as const })), "4 Main St"),
      testNote("l", "Library", [{ key: "elevator", value: "yes" }]),
    ],
    "en",
  );

function ctx(survey: Survey, locale: Locale, more: Partial<SurveyContext> = {}): SurveyContext {
  return {
    survey,
    locale,
    today: TODAY,
    places: PLACES(),
    addErrors: [],
    startErrors: [],
    draftName: "",
    draftAddress: "",
    confirmDiscard: false,
    statusMessage: undefined,
    notesRoom: 200,
    ...more,
  };
}

function mount(html: string, locale: Locale): HTMLElement {
  document.documentElement.lang = locale;
  document.body.innerHTML = `<div id="r"><a class="skip-link" href="#main" style="min-height:44px;min-width:44px">Skip</a><main id="main" lang="${locale}"><h1>The App</h1>${html}</main></div>`;
  return document.getElementById("r") as HTMLElement;
}

async function clean(html: string, locale: Locale): Promise<void> {
  const root = mount(html, locale);
  expect(auditDom(root, { locale }).map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
  const r = await axe.run(document.body, AXE_OPTIONS);
  expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

const allAnswered = (): Survey => {
  let s = ok(startSurvey(planned(), TODAY));
  s = answerQuestion(s, "yes");
  while (s.phase === "ask") s = answerQuestion(s, "unknown");
  return s;
};

describe("copy", () => {
  it("passes the App's copy audit", () => {
    expect(auditCopy(surveyStrings())).toEqual([]);
  });

  it("has every error code in both languages", () => {
    for (const [code, p] of Object.entries(STOP_ERRORS)) {
      expect(p.en, code).not.toBe("");
      expect(p.fr, code).not.toBe("");
    }
  });

  it("counts and headings read right in both languages", () => {
    expect(stopHeading(1, 3, "Library", "en")).toBe("Place 2 of 3: Library");
    expect(stopHeading(1, 3, "Library", "fr")).toBe("Lieu 2 sur 3 : Library");
    expect(questionOf(0, 4, "fr")).toBe("Question 1 sur 4 pour ce lieu");
    expect(overallText(1, 1, "en")).toBe("1 of 1 question answered in all");
    expect(overallText(2, 6, "fr")).toBe("2 questions répondues sur 6 en tout");
    expect(saveLabel(1, "en")).toBe("Save 1 note");
    expect(saveLabel(3, "fr")).toBe("Enregistrer 3 notes");
    expect(addPlaceLabel("Arena", 1, "en")).toBe("Add Arena (1 question)");
  });

  it("reports what was saved and what was left out", () => {
    expect(savedMessage(2, 0, "en")).toBe("Saved 2 notes.");
    expect(savedMessage(1, 1, "en")).toBe("Saved 1 note. 1 place had no Yes or No answer and was not saved.");
    expect(savedMessage(1, 2, "fr")).toBe("1 note enregistrée. 2 lieux n’avaient aucune réponse Oui ou Non et n’ont pas été enregistrés.");
    expect(savedMessage(2, 1, "fr")).toBe("2 notes enregistrées. 1 lieu n’avait aucune réponse Oui ou Non et n’a pas été enregistré.");
  });
});

describe("candidates", () => {
  it("lists places with open questions not in the survey, most open first", () => {
    const names = (s: Survey): string[] => candidates(PLACES(), s).map((p) => p.name);
    expect(names(emptySurvey(TODAY))).toEqual(["Arena", "Cafe", "Library"]);
    // "Library" is in the planned survey with the same address, so it is left out.
    expect(names(planned())).toEqual(["Arena", "Cafe"]);
  });
});

describe("planning screen", () => {
  it.each(LOCALES)("passes axe and the App's audit, empty and with places (%s)", async (l) => {
    await clean(renderSurvey(ctx(emptySurvey(TODAY), l)), l);
    await clean(renderSurvey(ctx(planned(), l)), l);
  });

  it("names each move and remove button after its place", () => {
    const root = mount(renderSurvey(ctx(planned(), "en")), "en");
    const names = Array.from(root.querySelectorAll(".survey-stops button")).map((b) => b.textContent);
    expect(names).toEqual(["Move Library, 1 Main St down", "Remove Library, 1 Main St from the survey", "Move Bakery up", "Remove Bakery from the survey"]);
  });

  it("offers places from the notes with how many questions each would ask", () => {
    const root = mount(renderSurvey(ctx(planned(), "fr")), "fr");
    const names = Array.from(root.querySelectorAll('[data-action="survey-add-place"]')).map((b) => b.textContent);
    expect(names).toEqual(["Ajouter Arena, 1 Main St (4 questions)", "Ajouter Cafe, 3 Main St (3 questions)"]);
  });

  it("shows the add errors on the fields, with the typed text kept", async () => {
    const addErrors: StopError[] = [{ field: "address", code: "personal-phone" }];
    const html = renderSurvey(ctx(planned(), "en", { addErrors, draftName: "Cafe", draftAddress: "416 555 0199" }));
    const root = mount(html, "en");
    const input = root.querySelector<HTMLInputElement>("#s-address");
    expect(input?.value).toBe("416 555 0199");
    expect(input?.getAttribute("aria-invalid")).toBe("true");
    expect(root.querySelector("#e-s-address")?.textContent).toBe(STOP_ERRORS["personal-phone"].en);
    expect(root.querySelector<HTMLInputElement>("#s-name")?.value).toBe("Cafe");
    await clean(html, "en");
  });

  it.each(LOCALES)("lists the start errors with links to the fields (%s)", async (l) => {
    const startErrors: StartError[] = [
      { field: "stops", code: "no-stops" },
      { field: "observedOn", code: "future-date" },
      { field: "licence", code: "licence-required" },
    ];
    const html = renderSurvey(ctx(emptySurvey(TODAY), l, { startErrors }));
    const root = mount(html, l);
    const links = Array.from(root.querySelectorAll("#error-summary a")).map((a) => a.getAttribute("href"));
    expect(links).toEqual(["#survey-stops", "#s-date", "#s-licence"]);
    expect(root.querySelector("#s-licence")?.getAttribute("aria-describedby")).toBe("h-s-licence e-s-licence");
    await clean(html, l);
  });

  it("says resume once a question has an answer, and asks before discarding", async () => {
    const s = answerQuestion(ok(startSurvey(planned(), TODAY)), "yes");
    const root = mount(renderSurvey(ctx({ ...s, phase: "plan" }, "en")), "en");
    expect(root.querySelector('[data-action="survey-start"]')?.textContent).toBe(SURVEY_COPY.resume.en);
    expect(root.querySelector('[data-stop] ')?.textContent).toContain("1 of 4 questions answered in all");
    const confirm = renderSurvey(ctx(planned(), "fr", { confirmDiscard: true }));
    expect(mount(confirm, "fr").querySelector('[data-action="survey-discard-confirm"]')?.textContent).toBe(SURVEY_COPY.yesDiscard.fr);
    await clean(confirm, "fr");
  });

  it("stops offering to add when the survey is full", () => {
    let s = emptySurvey(TODAY);
    for (let i = 0; i < 12; i++) s = ok(addStop(s, `Shop ${i}`, "", TODAY));
    const root = mount(renderSurvey(ctx(s, "en")), "en");
    expect(root.querySelector("#survey-stop-form")).toBeNull();
    expect(root.querySelector('[data-action="survey-add-place"]')).toBeNull();
    expect(root.textContent).toContain(STOP_ERRORS.full.en);
  });
});

describe("question screen", () => {
  it.each(LOCALES)("shows one question with three answers and passes the audits (%s)", async (l) => {
    const s = ok(startSurvey(planned(), TODAY));
    const html = renderSurvey(ctx(s, l));
    const root = mount(html, l);
    expect(root.querySelector("h2")?.textContent).toBe(stopHeading(0, 2, "Library", l));
    expect(root.querySelectorAll('[data-action="survey-answer"]')).toHaveLength(3);
    expect(root.querySelector('[data-action="survey-answer"][data-value="unknown"]')?.textContent).toBe(SURVEY_COPY.notSure[l]);
    expect(root.querySelector("progress")?.getAttribute("max")).toBe("5");
    await clean(html, l);
  });

  it("marks the answer given so far and says what it is", () => {
    const s = answerQuestion(ok(startSurvey(planned(), TODAY)), "no");
    const back = { ...s, q: 0 };
    const root = mount(renderSurvey(ctx(back, "en")), "en");
    expect(root.querySelector('[aria-pressed="true"]')?.getAttribute("data-value")).toBe("no");
    expect(root.querySelector("[data-survey-so-far]")?.textContent).toBe("Your answer so far: No");
  });

  it("from the review, offers only the way back to the review", async () => {
    const s = editAnswer(allAnswered(), 0, "elevator");
    const html = renderSurvey(ctx(s, "fr"));
    const root = mount(html, "fr");
    expect(root.querySelector('[data-action="survey-leave"]')).toBeNull();
    expect(root.querySelector('[data-action="survey-back"]')?.textContent).toBe(SURVEY_COPY.toReview.fr);
    await clean(html, "fr");
  });
});

describe("review screen", () => {
  it.each(LOCALES)("shows every detail with its source, licence and date, and passes the audits (%s)", async (l) => {
    const html = renderSurvey(ctx(allAnswered(), l));
    const root = mount(html, l);
    const cards = root.querySelectorAll(".survey-review > li");
    expect(cards).toHaveLength(2);
    expect(cards[0]?.querySelector("[data-survey-will]")?.getAttribute("data-survey-will")).toBe("save");
    expect(cards[1]?.querySelector("[data-survey-will]")?.getAttribute("data-survey-will")).toBe("skip");
    expect(root.querySelector('[data-action="survey-save"]')?.textContent).toBe(saveLabel(1, l));
    await clean(html, l);
  });

  it("offers a change button only for the details asked at each place", () => {
    const root = mount(renderSurvey(ctx(allAnswered(), "en")), "en");
    const bakery = root.querySelectorAll(".survey-review > li")[1];
    expect(Array.from(bakery?.querySelectorAll('[data-action="survey-edit"]') ?? []).map((b) => b.textContent)).toEqual(["Change Elevator at Bakery"]);
  });

  it("has nothing to save when no place has a Yes or No", () => {
    let s = ok(startSurvey(planned(), TODAY));
    s = leaveStop(leaveStop(s));
    const root = mount(renderSurvey(ctx(s, "en")), "en");
    expect(root.querySelector('[data-action="survey-save"]')).toBeNull();
    expect(root.textContent).toContain(SURVEY_COPY.nothingToSave.en);
  });

  it("does not offer to save more notes than fit", () => {
    const root = mount(renderSurvey(ctx(allAnswered(), "en", { notesRoom: 0 })), "en");
    expect(root.querySelector('[data-action="survey-save"]')).toBeNull();
    expect(root.textContent).toContain(SURVEY_COPY.notesFull.en);
  });

  it("puts the contributor source on a Yes or No and nothing on UNKNOWN", () => {
    const s = allAnswered();
    const lib = s.stops[0];
    if (!lib) throw new Error("no stop");
    expect(surveyFact(s, lib, "step-free-entry").provenance).toEqual({ source: "Contributor report", licence: "CC-BY-4.0", recordedOn: "2026-11-19" });
    expect(surveyFact(s, lib, "elevator")).toEqual({ key: "elevator", value: "unknown", provenance: undefined });
  });
});
