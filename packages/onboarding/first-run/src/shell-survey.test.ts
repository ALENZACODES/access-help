// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CONTRIBUTOR_SOURCE, ITEMS, NOTES_KEY, QUESTIONS, groupPlaces, loadNotes, type Note } from "./index";
import { SURVEY_KEY, loadSurvey } from "./survey";
import { SURVEY_COPY, STOP_ERRORS, stopHeading } from "./survey-copy";
import { AXE_OPTIONS, act, createHarness, type Harness } from "./shelltest";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 19));
let h: Harness;

beforeEach(() => {
  h = createHarness(TODAY);
});

afterEach(() => {
  h.destroy();
});

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => {
  const el = h.root.querySelector<T>(sel);
  expect(el, sel).not.toBeNull();
  return el as T;
};

/** Opens the survey by its address. The way in from the add-a-note form has its own test. */
function openSurvey(locale = "en"): void {
  window.location.hash = "#/notes/survey";
  h.mount(locale, true);
}

const said = async (): Promise<string> => {
  await Promise.resolve();
  return h.status();
};

function addTyped(name: string, address = ""): void {
  $<HTMLInputElement>("#s-name").value = name;
  $<HTMLInputElement>("#s-address").value = address;
  $<HTMLButtonElement>('[data-action="survey-add"]').click();
}

function choose(sel: string, value: string): void {
  const el = $<HTMLInputElement | HTMLSelectElement>(sel);
  el.value = value;
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function answer(v: "yes" | "no" | "unknown"): void {
  h.click(act("survey-answer", v));
}

function storedNotes(): Note[] {
  return loadNotes(h.store).notes;
}

describe("getting to the survey", () => {
  it("opens from the add-a-note form and sits under My notes in the menu", async () => {
    openSurvey();
    expect(h.heading()).toBe(SURVEY_COPY.title.en);
    expect(h.root.querySelector('nav [aria-current="page"]')?.getAttribute("data-value")).toBe("notes");
  });

  it("has its own address", async () => {
    window.location.hash = "#/notes/survey";
    h.mount("fr", true);
    expect(h.heading()).toBe(SURVEY_COPY.title.fr);
    h.click(act("view", "notes"));
    h.click(act("add-note"));
    h.click(act("survey-open"));
    expect(window.location.hash).toBe("#/notes/survey");
  });
});

describe("planning", () => {
  it("adds typed places, keeps focus on the name field and announces each one", async () => {
    openSurvey();
    addTyped("Library", "1 Main St");
    expect(document.activeElement?.id).toBe("s-name");
    expect(await said()).toBe("Added to the survey: Library, 1 Main St");
    addTyped("Bakery");
    expect(Array.from(h.root.querySelectorAll(".survey-stops [data-user-content]")).map((e) => e.textContent)).toEqual(["Library, 1 Main St", "Bakery"]);
    // Kept on this device as it goes.
    expect(loadSurvey(h.store, TODAY)?.stops).toHaveLength(2);
  });

  it("shows the problem on the field, keeps what was typed and moves focus there", async () => {
    openSurvey();
    addTyped("Cafe", "call 416 555 0199");
    const address = $<HTMLInputElement>("#s-address");
    expect(document.activeElement).toBe(address);
    expect(address.value).toBe("call 416 555 0199");
    expect(address.getAttribute("aria-invalid")).toBe("true");
    expect(await said()).toBe(STOP_ERRORS["personal-phone"].en);
    addTyped("");
    expect(document.activeElement?.id).toBe("s-name");
    expect($("#e-s-name").textContent).toBe(STOP_ERRORS.required.en);
    addTyped("Cafe");
    addTyped("café");
    expect($("#e-s-name").textContent).toBe(STOP_ERRORS.duplicate.en);
  });

  it("moves a place and keeps focus on it, and removes one", async () => {
    openSurvey();
    addTyped("A");
    addTyped("B");
    addTyped("C");
    h.click(act("survey-up", "2"));
    expect(Array.from(h.root.querySelectorAll(".survey-stops [data-user-content]")).map((e) => e.textContent)).toEqual(["A", "C", "B"]);
    expect((document.activeElement as HTMLElement).dataset["value"]).toBe("1");
    h.click(act("survey-up", "1"));
    // At the top there is no "up" any more: focus goes to its "down" button.
    expect(document.activeElement?.getAttribute("data-action")).toBe("survey-down");
    expect(document.activeElement?.textContent).toBe("Move C down");
    h.click(act("survey-remove", "0"));
    expect(document.activeElement?.id).toBe("survey-stops");
    expect(await said()).toBe("Removed from the survey: C");
  });

  it("adds places from the notes with only their open questions", async () => {
    h.seed([testNote("a", "Arena", [{ key: "elevator", value: "yes" }, { key: "step-free-entry", value: "no" }])]);
    openSurvey();
    const arena = groupPlaces(storedNotes(), "en")[0];
    h.click(act("survey-add-place", arena?.id));
    expect(h.root.querySelector('[data-action="survey-add-place"]')).toBeNull();
    expect(loadSurvey(h.store, TODAY)?.stops[0]?.keys).toEqual(["accessible-washroom", "automatic-door"]);
  });

  it("will not start without a licence, and says why with focus on the summary", async () => {
    openSurvey();
    h.click(act("survey-start"));
    expect(document.activeElement?.id).toBe("error-summary");
    expect(Array.from(h.root.querySelectorAll("#error-summary li")).map((li) => li.textContent)).toEqual([
      STOP_ERRORS["no-stops"].en,
      STOP_ERRORS["licence-required"].en,
    ]);
    expect(h.auditLines()).toEqual([]);
  });
});

/** Two places, licence chosen, started. */
function walk(locale = "en"): void {
  openSurvey(locale);
  addTyped("Library", "1 Main St");
  addTyped("Bakery");
  choose("#s-licence", "CC-BY-4.0");
  choose("#s-date", "2026-11-18");
  h.click(act("survey-start"));
}

describe("asking", () => {
  it("asks one question per screen and keeps focus on the answers within a place", async () => {
    walk();
    expect(h.heading()).toBe(stopHeading(0, 2, "Library", "en"));
    expect($("#survey-question-text").textContent).toBe(QUESTIONS["step-free-entry"].en);
    answer("yes");
    expect(document.activeElement?.getAttribute("data-value")).toBe("yes");
    expect($("#survey-question-text").textContent).toBe(QUESTIONS["accessible-washroom"].en);
    expect(await said()).toBe(`Next question: Accessible washroom. ${QUESTIONS["accessible-washroom"].en}`);
  });

  it("moves focus to the heading when the place changes", async () => {
    walk();
    h.click(act("survey-leave"));
    expect(h.heading()).toBe(stopHeading(1, 2, "Bakery", "en"));
    expect(document.activeElement).toBe(h.root.querySelector("h2"));
  });

  it("goes back a question with the earlier answer marked", async () => {
    walk();
    answer("no");
    h.click(act("survey-back"));
    expect(h.root.querySelector('[aria-pressed="true"]')?.getAttribute("data-value")).toBe("no");
  });

  it("is picked up again after the page is reloaded", async () => {
    walk();
    answer("yes");
    answer("no");
    openSurvey();
    expect($("#survey-question-text").textContent).toBe(QUESTIONS["automatic-door"].en);
    h.click(act("survey-plan"));
    expect($('[data-action="survey-start"]').textContent).toBe(SURVEY_COPY.resume.en);
  });
});

describe("review and save", () => {
  function toReview(): void {
    walk();
    answer("yes"); // Library: step-free entry
    answer("unknown");
    answer("no"); // automatic door
    h.click(act("survey-leave")); // elevator stays UNKNOWN
    h.click(act("survey-leave")); // Bakery: nothing answered
  }

  it("shows the review, then saves one note per place with an answer", async () => {
    toReview();
    expect(h.heading()).toBe(SURVEY_COPY.reviewTitle.en);
    expect(h.auditLines()).toEqual([]);
    h.click(act("survey-save"));
    expect(h.heading()).toBe("My notes");
    expect(await said()).toBe("Saved 1 note. 1 place had no Yes or No answer and was not saved.");
    const notes = storedNotes();
    expect(notes).toHaveLength(1);
    const facts = Object.fromEntries((notes[0]?.facts ?? []).map((f) => [f.key, f]));
    expect(facts["step-free-entry"]).toEqual({ key: "step-free-entry", value: "yes", provenance: { source: CONTRIBUTOR_SOURCE, licence: "CC-BY-4.0", recordedOn: "2026-11-18" } });
    expect(facts["automatic-door"]?.value).toBe("no");
    expect(facts["accessible-washroom"]?.value).toBe("unknown");
    expect(facts["elevator"]?.value).toBe("unknown");
    // The finished walk is gone from this device.
    expect(h.store.getItem(SURVEY_KEY)).toBeNull();
  });

  it("changes one answer from the review and comes back to it", async () => {
    toReview();
    h.click('[data-action="survey-edit"][data-value="0"][data-key="elevator"]');
    expect($("#survey-question-text").textContent).toBe(QUESTIONS.elevator.en);
    answer("yes");
    expect(h.heading()).toBe(SURVEY_COPY.reviewTitle.en);
    h.click(act("survey-save"));
    const elevator = storedNotes()[0]?.facts.find((f) => f.key === "elevator");
    expect(elevator?.value).toBe("yes");
  });

  it("sends a walk that lost its licence back to planning before saving", async () => {
    toReview();
    const saved = JSON.parse(h.store.getItem(SURVEY_KEY) ?? "{}") as Record<string, unknown>;
    h.store.setItem(SURVEY_KEY, JSON.stringify({ ...saved, licence: "" }));
    openSurvey();
    expect(h.heading()).toBe(SURVEY_COPY.title.en);
    expect(storedNotes()).toHaveLength(0);
  });

  it("will not save past the notes limit", async () => {
    h.seed(Array.from({ length: 200 }, (_, i) => testNote(`n${i}`, `Shop ${i}`, [{ key: "elevator", value: "yes" }])));
    toReview();
    expect(h.heading()).toBe(SURVEY_COPY.reviewTitle.en);
    expect(h.root.querySelector('[data-action="survey-save"]')).toBeNull();
    expect(h.text()).toContain(SURVEY_COPY.notesFull.en);
    expect(JSON.parse(h.store.getItem(NOTES_KEY) ?? "[]")).toHaveLength(200);
  });
});

describe("discarding", () => {
  it("asks first, can keep the survey, and then discards it", async () => {
    openSurvey();
    addTyped("Library");
    h.click(act("survey-discard"));
    expect(document.activeElement?.getAttribute("data-action")).toBe("survey-discard-confirm");
    h.click(act("survey-discard-cancel"));
    expect(document.activeElement?.getAttribute("data-action")).toBe("survey-discard");
    expect(await said()).toBe(SURVEY_COPY.kept.en);
    h.click(act("survey-discard"));
    h.click(act("survey-discard-confirm"));
    expect(await said()).toBe(SURVEY_COPY.discarded.en);
    expect(h.store.getItem(SURVEY_KEY)).toBeNull();
    expect(h.root.querySelector(".survey-stops")).toBeNull();
  });
});

describe("what is kept on this device", () => {
  it("lists the unfinished survey with its places and clears it", async () => {
    openSurvey();
    addTyped("Library");
    addTyped("Bakery");
    h.click(act("view", "help"));
    h.click(act("open-device"));
    expect($("#item-survey").textContent).toBe(SURVEY_COPY.deviceTitle.en);
    expect($("#state-survey").textContent).toMatch(/^Saved\. 2 entries you can read\./);
    h.click(act("device-clear", "survey"));
    h.click(act("device-confirm", "survey"));
    expect(h.store.getItem(SURVEY_KEY)).toBeNull();
    expect(ITEMS.some((i) => i.key === SURVEY_KEY)).toBe(true);
    h.click(act("view", "notes"));
    h.click(act("add-note"));
    h.click(act("survey-open"));
    expect(h.root.querySelector(".survey-stops")).toBeNull();
  });
});

describe("accessibility across the walk", () => {
  it.each(["en", "fr"] as const)("passes axe and the App's audit on every screen (%s)", async (l) => {
    const screens: Array<() => void> = [
      () => walk(l),
      () => answer("yes"),
      () => h.click(act("survey-leave")),
      () => h.click(act("survey-leave")),
    ];
    for (const step of screens) {
      step();
      const r = await axe.run(document.body, AXE_OPTIONS);
      expect(r.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    }
    expect(h.heading()).toBe(SURVEY_COPY.reviewTitle[l]);
    expect(h.auditLines()).toEqual([]);
  });
});
