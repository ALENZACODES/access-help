import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ALL_DEMONSTRATION_RECORDS } from "../../event-access/src/fixtures.js";
import { serializeOutingSource, toOutingSource } from "../../event-access/src/outing-source.js";
import {
  EventOutingPlanner,
  PLANS_KEY,
  SAMPLE_EVENT_SOURCES,
  addOwnItem,
  buildPlan,
  deleteAllPlans,
  eventSourceProblems,
  fill,
  loadPlans,
  localToday,
  parseEventSource,
  planProgress,
  planStrings,
  planTiming,
  removeOwnItem,
  setItemDone,
  upsertPlan,
  withoutPlan,
  writePlans,
  type EventOutingSource,
  type PlanStringKey,
  type StorageLike,
} from "../src";

const TODAY = "2026-11-16";

function sample(index: number): EventOutingSource {
  const source = SAMPLE_EVENT_SOURCES[index];
  if (!source) throw new Error(`missing sample ${index}`);
  return structuredClone(source) as EventOutingSource;
}

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}

const refusing: StorageLike = {
  getItem() {
    throw new Error("blocked");
  },
  setItem() {
    throw new Error("blocked");
  },
  removeItem() {
    throw new Error("blocked");
  },
};

const html = (props: Parameters<typeof EventOutingPlanner>[0]) =>
  renderToStaticMarkup(createElement(EventOutingPlanner, props)).replace(/&#x27;/g, "'");

describe("sample events", () => {
  it("are valid, labelled as demonstrations, and name no link or contact", () => {
    expect(SAMPLE_EVENT_SOURCES.length).toBeGreaterThan(0);
    for (const source of SAMPLE_EVENT_SOURCES) {
      expect(eventSourceProblems(source), source.eventId).toEqual([]);
      expect(source.demonstration).toBe(true);
      expect(source.eventId.startsWith("sample-")).toBe(true);
      expect(source.label.en).toMatch(/^Demonstration event/);
      expect(source.label.fr).toMatch(/^Événement de démonstration/);
    }
    expect(JSON.stringify(SAMPLE_EVENT_SOURCES)).not.toMatch(/https?:|www\.|@/i);
  });
});

describe("event source", () => {
  it("reads the questions file written from every demonstration event record", () => {
    for (const record of ALL_DEMONSTRATION_RECORDS) {
      const written = toOutingSource(record, TODAY);
      const parsed = parseEventSource(serializeOutingSource(written));
      if (!parsed.ok) throw new Error(`${record.eventId}: ${parsed.error}`);
      expect(parsed.source).toEqual(written);
      const plan = buildPlan(parsed.source, TODAY);
      expect(plan.items).toHaveLength(written.unknownItems.length);
      expect(plan.demonstration).toBe(true);
    }
  });

  it("refuses anything that is not a questions file", () => {
    const error = (text: string) => {
      const parsed = parseEventSource(text);
      return parsed.ok ? "ok" : parsed.error;
    };
    const good = sample(0);
    expect(error(JSON.stringify(good))).toBe("ok");
    expect(error("{")).toBe("not_json");
    expect(error("null")).toBe("not_a_questions_file");
    expect(error(JSON.stringify({ ...good, kind: "event-access-organiser-statement" }))).toBe("not_a_questions_file");
    expect(error(JSON.stringify({ ...good, formatVersion: 2 }))).toBe("not_a_questions_file");
    expect(error(JSON.stringify({ ...good, eventDate: "2026-02-30" }))).toBe("not_a_questions_file");
    expect(error(JSON.stringify({ ...good, eventDate: "" }))).toBe("not_a_questions_file");
    expect(error(JSON.stringify({ ...good, totalFields: 1 }))).toBe("not_a_questions_file");
    expect(error(JSON.stringify({ ...good, unknownItems: [good.unknownItems[0], good.unknownItems[0]] }))).toBe("not_a_questions_file");
    expect(error(JSON.stringify({ ...good, stepFree: true }))).toBe("not_a_questions_file");
    expect(error(" ".repeat(131_073))).toBe("too_large");
  });
});

describe("plan", () => {
  it("makes one ask-the-organiser line per Unknown item and nothing else", () => {
    const source = sample(0);
    const plan = buildPlan(source, TODAY);
    expect(plan).toMatchObject({
      id: "plan:sample-evening-some-unknown",
      eventId: source.eventId,
      eventDate: "2026-12-01",
      demonstration: true,
      createdOn: TODAY,
      sourcePreparedOn: "2026-11-15",
      sourceTotalFields: 8,
    });
    expect(plan.items.map((item) => (item.kind === "ask_organiser" ? item.fieldId : "own"))).toEqual(source.unknownItems.map((i) => i.fieldId));
    expect(plan.items.every((item) => item.kind === "ask_organiser" && !item.done)).toBe(true);
    expect(planProgress(plan)).toEqual({ total: 5, done: 0, open: 5, openQuestions: 5 });
    expect(buildPlan({ ...source, unknownItems: [] }, TODAY).items).toEqual([]);
    expect(() => buildPlan({ ...source, eventId: "" }, TODAY)).toThrow();
    expect(() => buildPlan(source, "today")).toThrow();
  });

  it("words each line as a question for the organiser in both languages", () => {
    const first = buildPlan(sample(0), TODAY).items[0];
    if (!first || first.kind !== "ask_organiser") throw new Error("expected an organiser question");
    expect(fill(planStrings.en.askItem, { label: first.label.en })).toBe("Ask the organiser about: Entrance in use for this event");
    expect(fill(planStrings.fr.askItem, { label: first.label.fr })).toBe("Demander à l’organisateur : Entrée utilisée pour cet événement");
  });

  it("ticks lines, adds and removes own lines, and keeps record lines", () => {
    let plan = buildPlan(sample(0), TODAY);
    plan = setItemDone(plan, "ask:quiet.space", true);
    expect(planProgress(plan)).toEqual({ total: 5, done: 1, open: 4, openQuestions: 4 });

    const added = addOwnItem(plan, "  Charge   the chair  ");
    if (!added.ok) throw new Error(added.problem);
    plan = added.plan;
    expect(plan.items.at(-1)).toEqual({ id: "own:1", kind: "own", text: "Charge the chair", done: false });
    expect(addOwnItem(plan, "   ")).toEqual({ ok: false, problem: "empty" });
    expect(addOwnItem(plan, "x".repeat(201))).toEqual({ ok: false, problem: "too_long" });

    const second = addOwnItem(plan, "Second line");
    if (!second.ok) throw new Error(second.problem);
    plan = removeOwnItem(second.plan, "own:1");
    const third = addOwnItem(plan, "Third line");
    if (!third.ok) throw new Error(third.problem);
    expect(new Set(third.plan.items.map((i) => i.id)).size).toBe(third.plan.items.length);

    expect(removeOwnItem(plan, "ask:quiet.space").items).toHaveLength(plan.items.length);
    expect(setItemDone(plan, "ask:quiet.space", false).items.find((i) => i.id === "ask:quiet.space")?.done).toBe(false);

    let full = buildPlan(sample(1), TODAY);
    for (let n = 0; n < 50; n += 1) {
      const next = addOwnItem(full, `line ${n}`);
      if (!next.ok) throw new Error(next.problem);
      full = next.plan;
    }
    expect(addOwnItem(full, "one more")).toEqual({ ok: false, problem: "too_many" });
  });

  it("ties the plan to the event date: upcoming, today, past, undated", () => {
    expect(planTiming({ eventDate: "2026-12-01" }, TODAY)).toBe("upcoming");
    expect(planTiming({ eventDate: TODAY }, TODAY)).toBe("today");
    expect(planTiming({ eventDate: "2026-10-01" }, TODAY)).toBe("past");
    expect(planTiming({ eventDate: "Unknown" }, TODAY)).toBe("undated");
    expect(() => planTiming({ eventDate: "2026-12-01" }, "")).toThrow();
    expect(localToday(new Date(2026, 10, 6, 0, 1))).toBe("2026-11-06");
  });
});

describe("on-device store", () => {
  it("saves, reloads, replaces and deletes plans", () => {
    const storage = new MemoryStorage();
    expect(loadPlans(storage)).toEqual({ plans: [], problem: null });
    const a = buildPlan(sample(0), TODAY);
    const b = buildPlan(sample(1), TODAY);
    let plans = upsertPlan(upsertPlan([], a), b);
    expect(writePlans(storage, plans)).toBe(true);
    expect(loadPlans(storage)).toEqual({ plans: [a, b], problem: null });

    const ticked = setItemDone(a, "ask:quiet.space", true);
    plans = upsertPlan(plans, ticked);
    expect(plans).toHaveLength(2);
    writePlans(storage, plans);
    expect(loadPlans(storage).plans[0]).toEqual(ticked);

    plans = withoutPlan(plans, a.id);
    writePlans(storage, plans);
    expect(loadPlans(storage).plans.map((p) => p.id)).toEqual([b.id]);

    writePlans(storage, []);
    expect(storage.data.has(PLANS_KEY)).toBe(false);

    writePlans(storage, [a, b]);
    expect(deleteAllPlans(storage)).toBe(true);
    expect(storage.data.size).toBe(0);
    expect(loadPlans(storage)).toEqual({ plans: [], problem: null });
  });

  it("stores only the plan under one key", () => {
    const storage = new MemoryStorage();
    writePlans(storage, [buildPlan(sample(0), TODAY)]);
    expect([...storage.data.keys()]).toEqual([PLANS_KEY]);
    const stored = JSON.parse(storage.data.get(PLANS_KEY) ?? "") as { version: number; plans: unknown[] };
    expect(stored.version).toBe(1);
    expect(Object.keys(stored.plans[0] as object).sort()).toEqual(
      ["createdOn", "demonstration", "eventDate", "eventId", "eventLabel", "id", "items", "sourcePreparedOn", "sourceTotalFields"].sort(),
    );
  });

  it("leaves out damaged content instead of guessing, and reports it", () => {
    const storage = new MemoryStorage();
    const good = buildPlan(sample(0), TODAY);
    storage.setItem(PLANS_KEY, "not json");
    expect(loadPlans(storage)).toEqual({ plans: [], problem: "damaged" });
    storage.setItem(PLANS_KEY, JSON.stringify({ version: 2, plans: [good] }));
    expect(loadPlans(storage)).toEqual({ plans: [], problem: "damaged" });
    storage.setItem(PLANS_KEY, JSON.stringify({ version: 1, plans: [good, { ...good, id: "x", items: "none" }, good, { ...good, id: "y", verified: true }] }));
    expect(loadPlans(storage)).toEqual({ plans: [good], problem: "damaged" });
  });

  it("reports when the device will not store anything", () => {
    expect(loadPlans(null)).toEqual({ plans: [], problem: "unavailable" });
    expect(loadPlans(refusing)).toEqual({ plans: [], problem: "unavailable" });
    expect(writePlans(refusing, [buildPlan(sample(0), TODAY)])).toBe(false);
    expect(writePlans(null, [])).toBe(false);
    expect(deleteAllPlans(refusing)).toBe(false);
  });
});

describe("planner screen", () => {
  it("offers labelled sample events and says where plans are kept, in both languages", () => {
    for (const lang of ["en", "fr"] as const) {
      const t = planStrings[lang];
      const page = html({ lang, today: TODAY, storage: new MemoryStorage() });
      expect(page).toContain(`lang="${lang}"`);
      for (const text of [t.title, t.onDevice, t.noRouteNote, t.sampleNote, t.noPlans]) expect(page).toContain(text);
      for (const source of SAMPLE_EVENT_SOURCES) expect(page).toContain(source.label[lang]);
      expect(page).toContain('<label for="ep-source">');
      expect(page).toContain('<label for="ep-file">');
      expect(page).not.toContain(t.deleteAll);
    }
  });

  it("shows a saved plan with its questions, progress, sample label and delete controls", () => {
    for (const lang of ["en", "fr"] as const) {
      const t = planStrings[lang];
      const storage = new MemoryStorage();
      const added = addOwnItem(setItemDone(buildPlan(sample(0), TODAY), "ask:quiet.space", true), "Test-only own line");
      if (!added.ok) throw new Error(added.problem);
      writePlans(storage, [added.plan]);
      const page = html({ lang, today: TODAY, storage });
      expect(page).toContain(sample(0).label[lang]);
      expect(page).toContain(t.demoLabel);
      expect(page).toContain(t.timing_upcoming);
      expect(page).toContain(fill(t.progress, { done: 1, total: 6 }));
      expect(page).toContain('data-plan-progress="1/6"');
      expect((page.match(/data-item-kind="ask_organiser"/g) ?? []).length).toBe(5);
      expect((page.match(/type="checkbox"/g) ?? []).length).toBe(6);
      expect((page.match(/checked=""/g) ?? []).length).toBe(1);
      expect(page).toContain(fill(t.askItem, { label: sample(0).unknownItems[0]?.label[lang] ?? "" }));
      expect(page).toContain(fill(t.removeLine, { text: "Test-only own line" }));
      expect(page).toContain(fill(t.sourceLine, { date: "2026-11-15", unknown: 5, total: 8 }));
      expect(page).toContain(t.deletePlan);
      expect(page).toContain(t.deleteAll);
      const boxes = [...page.matchAll(/<input id="([^"]+)" type="checkbox"/g)].map((m) => m[1]);
      for (const id of boxes) expect(page).toContain(`<label for="${id}">`);
    }
  });

  it("shows a past event's plan as past and an undated one as undated", () => {
    const page = html({ lang: "en", today: TODAY, initialPlans: [buildPlan(sample(2), TODAY), buildPlan(sample(1), TODAY)], storage: null });
    expect(page).toContain('data-plan-timing="past"');
    expect(page).toContain(planStrings.en.timing_past);
    expect(page).toContain('data-plan-timing="undated"');
    expect(page).toContain(planStrings.en.eventDateUnknown);
  });

  it("says so when the device will not save or saved content was damaged", () => {
    expect(html({ lang: "en", today: TODAY, storage: null })).toContain(planStrings.en.storage_unavailable);
    const storage = new MemoryStorage();
    storage.setItem(PLANS_KEY, "{");
    expect(html({ lang: "fr", today: TODAY, storage })).toContain(planStrings.fr.storage_damaged);
  });

  it("says when a record had no Unknown items without calling the event accessible", () => {
    const page = html({ lang: "en", today: TODAY, storage: null, initialPlans: [buildPlan({ ...sample(0), unknownItems: [] }, TODAY)] });
    expect(page).toContain(planStrings.en.noUnknown);
    expect(page).not.toMatch(/is accessible|fully accessible/i);
  });
});

describe("planner copy", () => {
  const keys = Object.keys(planStrings.en) as PlanStringKey[];
  const BANNED = [
    /\bAI\b/, /\bIA\b/, /artificial intelligence|intelligence artificielle/i,
    /you should|you are eligible|vous devriez|vous êtes admissible/i,
    /\b(score|rating|stars?|reviews?)\b/i, /\b(étoiles?|cote)\b/i,
  ];

  it("has the same keys and placeholders in English and French, all non-empty", () => {
    expect(Object.keys(planStrings.fr).sort()).toEqual([...keys].sort());
    const holes = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of keys) {
      expect(planStrings.en[key].length, key).toBeGreaterThan(0);
      expect(holes(planStrings.fr[key]), key).toEqual(holes(planStrings.en[key]));
    }
  });

  it("uses no banned wording and never promises access or a working route", () => {
    for (const lang of ["en", "fr"] as const) {
      for (const key of keys) {
        const text = planStrings[lang][key];
        for (const re of BANNED) expect(text, key).not.toMatch(re);
        expect(text, key).not.toMatch(/\bverified\b|\bvérifié/i);
      }
    }
    expect(planStrings.en.noRouteNote).toContain("does not say that any route or entrance will work");
    expect(planStrings.fr.noRouteNote).toContain("ne dit pas");
  });

  it("puts a non-breaking space before : and ? in French", () => {
    for (const key of keys) expect(planStrings.fr[key], key).not.toMatch(/[^ \d][:?!;]/);
  });
});
