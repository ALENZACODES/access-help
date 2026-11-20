import { describe, expect, it } from "vitest";
import { testNote } from "./testnotes";
import {
  QUESTIONS,
  FACT_KEYS,
  buildPlan,
  emptyForm,
  findBanned,
  groupPlaces,
  isOld,
  itemDetail,
  newestReportAge,
  plannedQuestions,
  planToText,
  questionsFor,
  statusLabel,
  toNote,
  type FactKey,
  type Note,
  type Tri,
} from "./index";

const TODAY = new Date(Date.UTC(2026, 10, 15));

function mk(id: string, name: string, details: Partial<Record<FactKey, Tri>>, on = "2026-11-01"): Note {
  const f = emptyForm(TODAY);
  return toNote(
    { ...f, placeName: name, observedOn: on, licence: "CC0-1.0", details: { ...f.details, "automatic-door": "yes", ...details } },
    new Date(`${on}T00:00:00Z`),
    () => id,
  );
}

const place = (notes: Note[]) => groupPlaces(notes, "en")[0]!;

describe("buildPlan", () => {
  const p = place([
    mk("a", "Hall", { "step-free-entry": "yes", elevator: "no" }),
    mk("b", "Hall", { "accessible-washroom": "yes" }),
    mk("c", "Hall", { "accessible-washroom": "no" }, "2026-11-05"),
  ]);
  const plan = buildPlan(p, { "step-free-entry": "yes", elevator: "yes", "accessible-washroom": "yes", "automatic-door": "no" });
  const by = (k: FactKey) => plan.items.find((i) => i.key === k)!;

  it("lists only the details asked for, in the usual order", () => {
    expect(plan.items.map((i) => i.key)).toEqual(FACT_KEYS.filter((k) => ["step-free-entry", "elevator", "accessible-washroom", "automatic-door"].includes(k)));
  });

  it("gives each item one of four statuses", () => {
    expect(by("step-free-entry").status).toBe("matches");
    expect(by("elevator").status).toBe("not-met");
    expect(by("accessible-washroom").status).toBe("differ");
    expect(by("automatic-door").status).toBe("not-met");
  });

  it("never treats unknown as met", () => {
    const q = buildPlan(place([mk("z", "Quiet", {})]), { "step-free-entry": "yes" });
    expect(q.items[0]?.status).toBe("unknown");
  });
});

describe("questions", () => {
  const p = place([mk("a", "Hall", { "step-free-entry": "yes" }), mk("b", "Hall", { "elevator": "yes" }), mk("c", "Hall", { elevator: "no" }, "2026-11-05")]);
  const plan = buildPlan(p, { "step-free-entry": "yes", elevator: "yes", "accessible-washroom": "yes" });

  it("asks only about unknown and differing details", () => {
    expect(questionsFor(plan, "en")).toEqual(FACT_KEYS.filter((k) => k === "elevator" || k === "accessible-washroom").map((k) => QUESTIONS[k].en));
  });

  it("has English and French text for every detail, French with a narrow no-break space before ?", () => {
    for (const k of FACT_KEYS) {
      expect(QUESTIONS[k].en.length).toBeGreaterThan(5);
      expect(QUESTIONS[k].fr).toMatch(/\u202F\?$/);
    }
  });
});

describe("plain text", () => {
  const p = place([mk("a", "Hall", { "step-free-entry": "yes" })]);
  const plan = buildPlan(p, { "step-free-entry": "yes", elevator: "yes" });

  it("carries source, licence and date for recorded details and questions for unknown ones", () => {
    const text = planToText(p, plan, "en", TODAY);
    expect(text).toContain("Hall");
    expect(text).toContain("CC0-1.0");
    expect(text).toContain("2026-11-01");
    expect(text).toContain(QUESTIONS.elevator.en);
    expect(text).toContain("Check with the place before you go.");
  });

  it("uses no banned wording in either language", () => {
    for (const l of ["en", "fr"] as const) {
      expect(findBanned(planToText(p, plan, l, TODAY)), l).toBeUndefined();
      for (const i of plan.items) {
        expect(findBanned(statusLabel(i.status, l))).toBeUndefined();
        expect(findBanned(itemDetail(i, l, TODAY))).toBeUndefined();
      }
    }
  });
});

describe("old reports and the notes in the text", () => {
  const OLD = new Date(Date.UTC(2027, 1, 20));
  const p = place([mk("a", "Hall", { "step-free-entry": "yes", elevator: "no" }, "2026-11-01"), mk("b", "Hall", { "accessible-washroom": "yes" }, "2025-10-01")]);
  const plan = buildPlan(p, { "step-free-entry": "yes", elevator: "yes", "accessible-washroom": "yes" });

  it("flags answers a year old or more, and only those", () => {
    const items = Object.fromEntries(plan.items.map((i) => [i.key, isOld(i, OLD)]));
    expect(items).toEqual({ "step-free-entry": false, "accessible-washroom": true, elevator: false });
    expect(isOld(plan.items[0]!, new Date(Date.UTC(2028, 0, 1)))).toBe(true);
  });

  it("never flags unknown or differing items as old", () => {
    const q = buildPlan(place([mk("z", "Quiet", {})]), { "step-free-entry": "yes" });
    expect(isOld(q.items[0]!, new Date(Date.UTC(2040, 0, 1)))).toBe(false);
    expect(newestReportAge(q.items[0]!, OLD)).toBeUndefined();
  });

  it("asks a still-the-case question for old answers, after the unknown ones", () => {
    const qs = plannedQuestions(plan, "en", OLD);
    expect(qs.map((q) => q.reason)).toEqual(["old"]);
    expect(qs[0]!.text).toContain("still the case");
    expect(qs[0]!.text).toContain("16 months old");
    const unknown = buildPlan(p, { "automatic-door": "no", "accessible-washroom": "yes" });
    expect(plannedQuestions(unknown, "en", OLD).map((q) => q.reason)).toEqual(["old"]);
  });

  it("writes French with narrow no-break spaces before ?", () => {
    expect(plannedQuestions(plan, "fr", OLD)[0]!.text).toMatch(/\u202F\?/);
  });

  it("puts the person's own notes in the text, marked as theirs", () => {
    const list = { [p.id]: { "accessible-washroom": { asked: true, answer: "Staff said it is on level two." } } };
    const text = planToText(p, plan, "en", OLD, list);
    expect(text).toContain("[asked]");
    expect(text).toContain("What the place said: Staff said it is on level two.");
    expect(text).toContain("These are your own notes. A detail stays Unknown until a report is added.");
    expect(planToText(p, plan, "en", OLD)).not.toContain("[asked]");
  });

  it("uses no banned wording", () => {
    for (const l of ["en", "fr"] as const) for (const q of plannedQuestions(plan, l, OLD)) expect(findBanned(q.text)).toBeUndefined();
  });
});

describe("French typography of the ask-again question", () => {
  it("puts a no-break space, not a narrow one, before the colon", () => {
    const notes = [testNote("o1", "Hall", [{ key: "elevator", value: "yes", on: "2023-01-01" }])];
    const place = groupPlaces(notes, "fr")[0];
    if (!place) throw new Error("no place");
    const q = plannedQuestions(buildPlan(place, { elevator: "yes" }), "fr", new Date(Date.UTC(2026, 10, 19))).find((x) => x.reason === "old");
    expect(q?.text.startsWith("Est-ce toujours le cas\u00A0: ")).toBe(true);
    expect(q?.text).not.toContain("\u202F:");
  });
});
