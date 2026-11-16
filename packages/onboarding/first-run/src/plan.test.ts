import { describe, expect, it } from "vitest";
import {
  QUESTIONS,
  FACT_KEYS,
  buildPlan,
  emptyForm,
  findBanned,
  groupPlaces,
  itemDetail,
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
