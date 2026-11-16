import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ALL_DEMONSTRATION_RECORDS, PAST_DEMONSTRATION_RECORD, findRecord } from "./fixtures.js";
import { messages, type MessageKey } from "./i18n.js";
import { buildJourneyHandoff, checkPlannerResult, journeyView, type JourneyPlannerResult } from "./journey.js";
import {
  buildOrganiserRecord,
  completeness,
  emptyOrganiserForm,
  formFields,
  organiserClaimViolations,
  organiserFileName,
  parseOrganiserFile,
  serializeOrganiserFile,
  validateOrganiserForm,
  type OrganiserFormInput,
} from "./organiser.js";
import { outingSourceFileName, serializeOutingSource, toOutingSource } from "./outing-source.js";
import { FIELD_DEFS, projectRecord, unknownFieldIds } from "./project.js";
import { daysBetween, eventTiming, isIsoDate, localToday, statementTiming } from "./timing.js";
import { UNKNOWN, type EventAccessRecord } from "./types.js";
import { EventAccessPage } from "./ui/EventAccessPage.js";
import { JourneyPanel } from "./ui/JourneyPanel.js";
import { OpenOrganiserFile } from "./ui/OpenOrganiserFile.js";
import { OrganiserForm } from "./ui/OrganiserForm.js";
import { fixtureRuleViolations, validateEventAccessRecord } from "./validate.js";

const TODAY = "2026-11-16";
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const demo = (id: string): EventAccessRecord => {
  const found = findRecord(id);
  if (!found) throw new Error(`missing fixture ${id}`);
  return clone(found);
};
const html = (node: React.ReactElement) => renderToStaticMarkup(node).replace(/&#x27;/g, "'").replace(/&quot;/g, '"');

/** Test-only answers typed into the checklist. They describe no real event. */
function filledForm(overrides: Partial<OrganiserFormInput> = {}): OrganiserFormInput {
  return {
    ...emptyOrganiserForm("2026-11-10"),
    eventLabelEn: "Test-only evening",
    occurrenceDate: "2026-12-05",
    statedBy: "test organiser role",
    placeLabelEn: "Test-only hall",
    address: "Test-only address line",
    arrivalEarliest: "18:00",
    arrivalLatest: "19:00",
    answers: {
      "entrance.inUse": "Side door for this test",
      "temporary.ramp": "yes",
      "washroom.openDuringEvent": "no",
      "quiet.space": "yes",
      "entrance.doorClearWidthMm": "900",
      "supportPerson.policy": "free",
    },
    answersFr: { "entrance.inUse": "Porte latérale pour cet essai" },
    ...overrides,
  };
}

describe("event-night fields", () => {
  it("adds the per-event items to every record, each value-or-Unknown with provenance", () => {
    const ids = FIELD_DEFS.map((d) => d.id);
    for (const id of [
      "entrance.inUse",
      "temporary.ramp",
      "temporary.stageAccess",
      "temporary.layoutNotes",
      "washroom.openDuringEvent",
      "seating.viewingPosition",
      "seating.sightlineWhenOthersStand",
      "quiet.space",
      "quiet.notes",
      "arrival.dropOff",
      "supportPerson.policy",
      "remote.livestream",
      "remote.participation",
      "remote.link",
    ]) {
      expect(ids, id).toContain(id);
    }
    expect(new Set(ids).size).toBe(ids.length);
    for (const record of ALL_DEMONSTRATION_RECORDS) {
      expect(validateEventAccessRecord(record, record.eventId), record.eventId).toMatchObject({ valid: true });
      expect(fixtureRuleViolations(record)).toEqual([]);
      expect(record.demonstration).toBe(true);
      for (const def of FIELD_DEFS) {
        const fact = def.read(record);
        if (!fact) continue;
        expect(fact.source.length, def.id).toBeGreaterThan(0);
        expect(fact.licence.length, def.id).toBeGreaterThan(0);
        expect(isIsoDate(fact.date), def.id).toBe(true);
        expect([0, 1], def.id).toContain(fact.tier);
      }
    }
  });

  it("refuses a record that leaves an event-night group out, or uses false or empty for Unknown", () => {
    for (const group of ["temporary", "quiet", "remote"] as const) {
      const record = demo("demo-nothing-known") as unknown as Record<string, unknown>;
      delete record[group];
      expect(validateEventAccessRecord(record).valid, group).toBe(false);
    }
    for (const bad of [false, "", null, "unknown", 0]) {
      const record = demo("demo-nothing-known");
      (record.quiet.space as unknown as { value: unknown }).value = bad;
      expect(validateEventAccessRecord(record).valid, String(bad)).toBe(false);
    }
  });

  it("accepts only https links, and an arrival window only with an event date", () => {
    const link = (value: string) => {
      const record = demo("demo-hybrid-confirmed");
      record.remote.link = { ...record.remote.livestream, value };
      return validateEventAccessRecord(record).valid;
    };
    expect(link("https://example.invalid/stream")).toBe(true);
    expect(link("http://example.invalid/stream")).toBe(false);
    expect(link("javascript:alert(1)")).toBe(false);
    expect(link("https://example.invalid/a b")).toBe(false);

    const noDate = demo("demo-nothing-known");
    noDate.arrivalWindow = { earliest: "18:00", latest: "19:00" };
    expect(validateEventAccessRecord(noDate).valid).toBe(false);
    const badTime = demo("demo-hybrid-confirmed");
    badTime.arrivalWindow = { earliest: "25:00", latest: "26:00" };
    expect(validateEventAccessRecord(badTime).valid).toBe(false);
  });

  it("names every new field and section in English and French", () => {
    for (const lang of ["en", "fr"] as const) {
      const projected = projectRecord(demo("demo-hybrid-confirmed"), lang);
      for (const section of projected.sections) expect(section.heading, section.id).toBeTruthy();
      for (const field of projected.sections.flatMap((s) => s.fields)) expect(field.label, field.id).toBeTruthy();
    }
  });
});

describe("timing", () => {
  it("checks ISO dates and counts days", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-2-3")).toBe(false);
    expect(isIsoDate(undefined)).toBe(false);
    expect(daysBetween("2026-11-16", "2026-12-01")).toBe(15);
    expect(daysBetween("2026-12-01", "2026-11-16")).toBe(-15);
    expect(daysBetween("2026-03-07", "2026-03-09")).toBe(2);
    expect(localToday(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("ties freshness to the event date: upcoming, today, past, undated", () => {
    expect(eventTiming({ occurrenceDate: "2026-12-01" }, TODAY)).toBe("upcoming");
    expect(eventTiming({ occurrenceDate: TODAY }, TODAY)).toBe("today");
    expect(eventTiming({ occurrenceDate: "2026-11-15" }, TODAY)).toBe("past");
    expect(eventTiming({}, TODAY)).toBe("undated");
    expect(eventTiming({ occurrenceDate: "not a date" }, TODAY)).toBe("undated");
    expect(() => eventTiming({ occurrenceDate: "2026-12-01" }, "today")).toThrow();
  });

  it("reports how a statement sits against the event day as a plain count", () => {
    expect(statementTiming("2026-11-15", "2026-12-01")).toEqual({ relation: "before_event", days: 16 });
    expect(statementTiming("2026-12-01", "2026-12-01")).toEqual({ relation: "on_event_day", days: 0 });
    expect(statementTiming("2026-12-03", "2026-12-01")).toEqual({ relation: "after_event", days: 2 });
    expect(statementTiming("2026-12-03", undefined)).toEqual({ relation: "no_event_date", days: null });
  });

  it("shows a past event's record as past, in both languages, and an upcoming one as upcoming", () => {
    for (const lang of ["en", "fr"] as const) {
      const past = html(<EventAccessPage record={PAST_DEMONSTRATION_RECORD} lang={lang} today={TODAY} />);
      expect(past).toContain('data-timing-notice="past"');
      expect(past).toContain(messages[lang].timing_past);
      expect(past).not.toContain(messages[lang].timing_upcoming);
      expect(past).toContain(messages[lang].demoBanner);

      const upcoming = html(<EventAccessPage record={demo("demo-hybrid-confirmed")} lang={lang} today={TODAY} />);
      expect(upcoming).toContain(messages[lang].timing_upcoming);
      expect(upcoming).not.toContain("data-timing-notice");
      expect(upcoming).toContain(messages[lang].tierMeaning);

      const undated = html(<EventAccessPage record={demo("demo-nothing-known")} lang={lang} today={TODAY} />);
      expect(undated).toContain(messages[lang].timing_undated);
    }
    const later = html(<EventAccessPage record={demo("demo-hybrid-confirmed")} lang="en" today="2026-12-02" />);
    expect(later).toContain('data-timing-notice="past"');
  });

  it("shows the statement count only for stated values, and the place and arrival window when recorded", () => {
    const page = html(<EventAccessPage record={demo("demo-hybrid-confirmed")} lang="en" today={TODAY} />);
    expect(page).toContain("Stated 16 days before the event date");
    const stated = (page.match(/data-stated="true"/g) ?? []).length;
    const record = demo("demo-hybrid-confirmed");
    expect(stated).toBe(projectRecord(record, "en").totalFields - unknownFieldIds(record).length);
    expect(page).toContain("Demonstration place (not a real location)");
    expect(page).toContain("18:00 to 19:00");
    expect(page).not.toMatch(/<button|<a /i);
  });
});

describe("organiser checklist", () => {
  it("asks about every field for the format, and about captions only for virtual and hybrid", () => {
    expect(formFields("in_person").map((d) => d.id)).not.toContain("captions.live");
    expect(formFields("hybrid").map((d) => d.id)).toContain("captions.live");
    expect(formFields("virtual")).toHaveLength(FIELD_DEFS.length);
  });

  it("reports what must be fixed on an empty form", () => {
    const issues = validateOrganiserForm(emptyOrganiserForm(""), TODAY);
    expect(issues).toEqual([
      { field: "eventLabel", code: "label_required" },
      { field: "occurrenceDate", code: "date_required" },
      { field: "statedBy", code: "stated_by_required" },
      { field: "statementDate", code: "statement_date_required" },
    ]);
  });

  it("validates dates, the arrival window, numbers, choices and links", () => {
    const codes = (overrides: Partial<OrganiserFormInput>) => validateOrganiserForm(filledForm(overrides), TODAY).map((i) => `${i.field}:${i.code}`);
    expect(codes({})).toEqual([]);
    expect(codes({ occurrenceDate: "2026-02-30" })).toContain("occurrenceDate:date_invalid");
    expect(codes({ statementDate: "2026-11-17" })).toEqual(["statementDate:statement_date_future"]);
    expect(codes({ arrivalLatest: "" })).toEqual(["arrivalWindow:window_needs_both"]);
    expect(codes({ arrivalEarliest: "19:00", arrivalLatest: "18:00" })).toEqual(["arrivalWindow:window_order"]);
    expect(codes({ arrivalEarliest: "7pm", arrivalLatest: "8pm" })).toEqual(["arrivalWindow:time_invalid"]);
    for (const bad of ["0", "-3", "wide", "1e3", "90 cm"]) {
      expect(codes({ answers: { "entrance.doorClearWidthMm": bad } }), bad).toEqual(["entrance.doorClearWidthMm:number_invalid"]);
    }
    expect(codes({ answers: { "temporary.ramp": "maybe" } })).toEqual(["temporary.ramp:choice_invalid"]);
    expect(codes({ answers: { "remote.link": "http://example.invalid" } })).toEqual(["remote.link:link_invalid"]);
    expect(codes({ answers: { "remote.link": "https://example.invalid/join" } })).toEqual([]);
    expect(codes({ answers: { "quiet.notes": "x".repeat(1001) } })).toEqual(["quiet.notes:too_long"]);
    expect(codes({ eventLabelEn: "", eventLabelFr: "Soirée d'essai" })).toEqual([]);
  });

  it("builds a valid record where every answer is an unverified organiser claim and every blank is Unknown", () => {
    const built = buildOrganiserRecord(filledForm(), "en", TODAY);
    if (!built.ok) throw new Error(JSON.stringify(built.issues));
    const { record } = built;
    expect(validateEventAccessRecord(record)).toMatchObject({ valid: true });
    expect(organiserClaimViolations(record)).toEqual([]);
    expect(record.demonstration).toBe(false);
    expect(record.inAppRegistration).toBe(false);
    expect(record.occurrenceDate).toBe("2026-12-05");
    expect(record.eventId).toBe("organiser-2026-12-05-test-only-evening");
    expect(record.place).toEqual({ label: { en: "Test-only hall", fr: "Test-only hall" }, address: "Test-only address line" });
    expect(record.arrivalWindow).toEqual({ earliest: "18:00", latest: "19:00" });
    expect(record.captions).toBeUndefined();

    expect(record.temporary.ramp).toEqual({
      value: "yes",
      source: "Organiser statement by test organiser role",
      licence: "No reuse terms stated by the organiser",
      date: "2026-11-10",
      tier: 1,
      prototypeLabel: "PROTOTYPE-UNVERIFIED",
    });
    expect(record.washroom.openDuringEvent.value).toBe("no");
    expect(record.entrance.doorClearWidthMm.value).toBe(900);
    expect(record.entrance.inUse.value).toEqual({ en: "Side door for this test", fr: "Porte latérale pour cet essai" });
    expect(record.temporary.stageAccess).toMatchObject({ value: UNKNOWN, tier: 0, source: "Not answered by the organiser" });

    const answered = ["entrance.inUse", "temporary.ramp", "washroom.openDuringEvent", "quiet.space", "entrance.doorClearWidthMm", "supportPerson.policy"];
    for (const def of formFields("in_person")) {
      const fact = def.read(record);
      expect(fact, def.id).toBeDefined();
      expect(fact?.prototypeLabel).toBe("PROTOTYPE-UNVERIFIED");
      if (answered.includes(def.id)) expect(fact?.tier, def.id).toBe(1);
      else expect(fact, def.id).toMatchObject({ value: UNKNOWN, tier: 0 });
    }
  });

  it("stores source wording in the organiser's language and keeps one-language text as written", () => {
    const built = buildOrganiserRecord(
      filledForm({ eventLabelEn: "", eventLabelFr: "Soirée d'essai", licence: "Test terms", answers: { "quiet.notes": "Only in English" }, answersFr: {} }),
      "fr",
      TODAY,
    );
    if (!built.ok) throw new Error(JSON.stringify(built.issues));
    expect(built.record.eventLabel).toEqual({ en: "Soirée d'essai", fr: "Soirée d'essai" });
    expect(built.record.eventId).toBe("organiser-2026-12-05-soiree-d-essai");
    expect(built.record.quiet.notes).toMatchObject({
      value: { en: "Only in English", fr: "Only in English" },
      source: "Déclaration de l'organisateur par test organiser role",
      licence: "Test terms",
    });
    expect(completeness(built.record).sameTextBothLanguages).toEqual(["quiet.notes"]);
  });

  it("does not build a record while the form has issues", () => {
    const built = buildOrganiserRecord(filledForm({ statedBy: " " }), "en", TODAY);
    expect(built).toEqual({ ok: false, issues: [{ field: "statedBy", code: "stated_by_required" }] });
  });

  it("records captions for a hybrid event and counts them", () => {
    const built = buildOrganiserRecord(filledForm({ format: "hybrid", answers: { "captions.live": "yes" } }), "en", TODAY);
    if (!built.ok) throw new Error(JSON.stringify(built.issues));
    expect(built.record.captions).toMatchObject({ value: "yes", tier: 1 });
    expect(completeness(built.record).total).toBe(FIELD_DEFS.length);
  });

  it("counts Unknowns honestly and never calls a part-filled checklist complete", () => {
    const built = buildOrganiserRecord(filledForm(), "en", TODAY);
    if (!built.ok) throw new Error("form should build");
    const summary = completeness(built.record);
    expect(summary.total).toBe(FIELD_DEFS.length - 1);
    expect(summary.answered).toBe(6);
    expect(summary.unknown).toBe(summary.total - 6);
    expect(summary.unknownIds).toEqual(unknownFieldIds(built.record));
    expect(summary.complete).toBe(false);
    expect(summary.sections.reduce((n, s) => n + s.total, 0)).toBe(summary.total);
    expect(summary.sections.reduce((n, s) => n + s.unknown, 0)).toBe(summary.unknown);
    expect(summary.sections.find((s) => s.id === "temporary")).toEqual({ id: "temporary", total: 3, unknown: 2 });
    expect(summary.sections.some((s) => s.id === "captions")).toBe(false);

    const nothing = completeness(demo("demo-nothing-known"));
    expect(nothing).toMatchObject({ answered: 0, complete: false });
    expect(nothing.unknown).toBe(nothing.total);
  });

  it("calls the checklist complete only when no field is Unknown", () => {
    const answers: Record<string, string> = {};
    for (const def of formFields("in_person")) {
      answers[def.id] =
        def.kind === "yesno" ? "no" : def.kind === "parking" ? "none" : def.kind === "support" ? "full_price" : def.kind === "link" ? "https://example.invalid/x" : def.kind === "text" ? "Test-only note" : "5";
    }
    const built = buildOrganiserRecord(filledForm({ answers, answersFr: {} }), "en", TODAY);
    if (!built.ok) throw new Error(JSON.stringify(built.issues));
    expect(completeness(built.record)).toMatchObject({ unknown: 0, complete: true });
    expect(messages.en.orgSummaryComplete).toContain("does not mean the event is accessible");
    expect(messages.fr.orgSummaryComplete).toContain("ne veut pas dire que l'événement est accessible");
  });
});

describe("organiser file", () => {
  const built = buildOrganiserRecord(filledForm(), "en", TODAY);
  if (!built.ok) throw new Error("form should build");
  const text = serializeOrganiserFile(built.record, TODAY);

  it("round-trips through the exported file", () => {
    const parsed = parseOrganiserFile(text);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.file.record).toEqual(built.record);
    expect(parsed.file).toMatchObject({ kind: "event-access-organiser-statement", formatVersion: 1, statement: "organiser_claim_unverified", exportedOn: TODAY });
    expect(organiserFileName(built.record)).toBe("event-access-organiser-2026-12-05-test-only-evening.json");
    expect(() => serializeOrganiserFile(built.record, "today")).toThrow();
  });

  it("refuses files that are not organiser statements", () => {
    const error = (value: string) => {
      const parsed = parseOrganiserFile(value);
      return parsed.ok ? "ok" : parsed.error;
    };
    expect(error("not json")).toBe("not_json");
    expect(error("[]")).toBe("wrong_kind");
    expect(error("null")).toBe("wrong_kind");
    expect(error(JSON.stringify({ ...JSON.parse(text), kind: "something-else" }))).toBe("wrong_kind");
    expect(error(JSON.stringify({ ...JSON.parse(text), statement: "verified" }))).toBe("wrong_kind");
    expect(error(JSON.stringify({ ...JSON.parse(text), formatVersion: 2 }))).toBe("wrong_version");
    expect(error(JSON.stringify({ ...JSON.parse(text), record: {} }))).toBe("record_invalid");
    expect(error(JSON.stringify({ ...JSON.parse(text), exportedOn: "soon" }))).toBe("record_invalid");
    expect(error(" ".repeat(262_145))).toBe("too_large");
  });

  it("refuses a file that tries to raise a claim above the organiser tier", () => {
    const verified = JSON.parse(text) as { record: EventAccessRecord };
    (verified.record.temporary.ramp as unknown as { prototypeLabel: string }).prototypeLabel = "VERIFIED";
    expect(parseOrganiserFile(JSON.stringify(verified))).toMatchObject({ ok: false, error: "record_invalid" });

    const tier3 = JSON.parse(text) as { record: EventAccessRecord };
    (tier3.record.temporary.ramp as unknown as { tier: number }).tier = 3;
    expect(parseOrganiserFile(JSON.stringify(tier3))).toMatchObject({ ok: false, error: "record_invalid" });

    const peer = JSON.parse(text) as { record: EventAccessRecord };
    peer.record.temporary.ramp = { ...peer.record.temporary.ramp, tier: 2, prototypeLabel: "COMMUNITY-REPORTED" };
    expect(validateEventAccessRecord(peer.record).valid).toBe(true);
    expect(parseOrganiserFile(JSON.stringify(peer))).toMatchObject({ ok: false, error: "claim_rule" });

    const unknownAsClaim = JSON.parse(text) as { record: EventAccessRecord };
    unknownAsClaim.record.temporary.stageAccess = { ...unknownAsClaim.record.temporary.stageAccess, tier: 1 };
    expect(parseOrganiserFile(JSON.stringify(unknownAsClaim))).toMatchObject({ ok: false, error: "claim_rule" });
  });
});

describe("journey hand-off", () => {
  it("passes the event place and arrival window as data and marks what is missing", () => {
    const handoff = buildJourneyHandoff(demo("demo-hybrid-confirmed"), TODAY);
    expect(handoff.ready).toBe(true);
    expect(handoff.gaps).toEqual([]);
    expect(handoff.request).toEqual({
      kind: "event-journey-request",
      formatVersion: 1,
      eventId: "demo-hybrid-confirmed",
      demonstration: true,
      destination: {
        label: { en: "Demonstration place (not a real location)", fr: "Lieu de démonstration (pas un vrai lieu)" },
        placeId: "demo-place-001",
        address: UNKNOWN,
        entranceInUse: UNKNOWN,
        dropOff: UNKNOWN,
      },
      arrival: { date: "2026-12-01", earliest: "18:00", latest: "19:00" },
    });
  });

  it("is not ready without a place or a date, for a past event, or for a virtual event", () => {
    const nothing = buildJourneyHandoff(demo("demo-nothing-known"), TODAY);
    expect(nothing.ready).toBe(false);
    expect(nothing.gaps).toEqual(["no_place", "no_event_date", "no_arrival_window"]);
    expect(nothing.request.destination.label).toBe(UNKNOWN);
    expect(nothing.request.arrival).toEqual({ date: UNKNOWN, earliest: UNKNOWN, latest: UNKNOWN });

    const past = buildJourneyHandoff(PAST_DEMONSTRATION_RECORD, TODAY);
    expect(past.ready).toBe(false);
    expect(past.gaps).toEqual(["event_past", "no_arrival_window"]);
    expect(past.request.destination.entranceInUse).toMatchObject({ en: expect.stringContaining("side entrance") });

    expect(buildJourneyHandoff(demo("demo-virtual-captions-unknown"), TODAY).gaps).toContain("virtual_event");
    expect(buildJourneyHandoff(demo("demo-hybrid-confirmed"), "2026-12-02").ready).toBe(false);
  });

  it("treats a missing arrival window as a gap that does not block the hand-off", () => {
    const record = demo("demo-hybrid-confirmed");
    delete record.arrivalWindow;
    expect(buildJourneyHandoff(record, TODAY)).toMatchObject({ ready: true, gaps: ["no_arrival_window"] });
  });

  const result: JourneyPlannerResult = {
    kind: "event-journey-result",
    formatVersion: 1,
    eventId: "demo-hybrid-confirmed",
    outcome: "no_plan_found",
    summary: { en: "Test-only planner wording.", fr: "Texte de planificateur pour essai." },
    planner: "test-planner",
    computedOn: TODAY,
  };

  it("says not connected unless a well-formed result for this event is supplied", () => {
    const handoff = buildJourneyHandoff(demo("demo-hybrid-confirmed"), TODAY);
    expect(journeyView(handoff)).toEqual({ state: "not_connected" });
    expect(journeyView(handoff, null)).toEqual({ state: "not_connected" });
    expect(journeyView(handoff, result)).toEqual({ state: "planner_result", result });
    expect(journeyView(handoff, { ...result, eventId: "another" })).toEqual({ state: "result_refused", problem: "other_event" });
    for (const bad of [{}, "ok", { ...result, outcome: "works" }, { ...result, summary: { en: "x" } }, { ...result, computedOn: "now" }, { ...result, planner: "" }]) {
      expect(journeyView(handoff, bad)).toEqual({ state: "result_refused", problem: "malformed" });
    }
    expect(checkPlannerResult({ ...result, extra: "dropped" }, handoff.request)).toEqual({ usable: true, result });
  });

  it("renders not connected by default and never claims a route, in both languages", () => {
    for (const lang of ["en", "fr"] as const) {
      const page = html(<JourneyPanel record={demo("demo-hybrid-confirmed")} lang={lang} today={TODAY} />);
      expect(page).toContain('data-journey-state="not_connected"');
      expect(page).toContain(messages[lang].journeyNotConnected);
      expect(page).toContain(messages[lang].journeyReady);
      expect(page).toContain(messages[lang].demoBanner);
      expect(page).toContain("demo-place-001");
      expect(page).not.toContain(messages[lang].journeyResultHeading);
      expect(page).not.toMatch(/route (works|is accessible)|step-free route|trajet accessible/i);
    }
    const nothing = html(<JourneyPanel record={demo("demo-nothing-known")} lang="en" today={TODAY} />);
    expect(nothing).toContain('data-handoff-ready="false"');
    expect(nothing).toContain(messages.en.gap_no_place);
    expect(nothing).toContain(messages.en.gap_no_event_date);
  });

  it("shows a supplied planner result as the planner's statement, and refuses one for another event", () => {
    const shown = html(<JourneyPanel record={demo("demo-hybrid-confirmed")} lang="fr" today={TODAY} plannerResult={result} />);
    expect(shown).toContain('data-journey-state="planner_result"');
    expect(shown).toContain("Texte de planificateur pour essai.");
    expect(shown).toContain(messages.fr.journeyOutcome_no_plan_found);
    expect(shown).toContain("test-planner");
    expect(shown).toContain("ne l'a pas vérifié");
    expect(shown).not.toContain(messages.fr.journeyNotConnected);

    const refused = html(<JourneyPanel record={demo("demo-venue-note")} lang="en" today={TODAY} plannerResult={result} />);
    expect(refused).toContain('data-journey-state="result_refused"');
    expect(refused).toContain(messages.en.journeyRefused_other_event);
    expect(refused).not.toContain("Test-only planner wording.");
  });
});

describe("outing source", () => {
  it("lists exactly the Unknown items with bilingual labels and no values", () => {
    const record = demo("demo-hybrid-confirmed");
    const source = toOutingSource(record, TODAY);
    expect(source).toMatchObject({
      kind: "event-outing-source",
      formatVersion: 1,
      eventId: "demo-hybrid-confirmed",
      eventDate: "2026-12-01",
      demonstration: true,
      preparedOn: TODAY,
      totalFields: FIELD_DEFS.length,
    });
    expect(source.unknownItems.map((i) => i.fieldId)).toEqual(unknownFieldIds(record));
    expect(source.unknownItems.find((i) => i.fieldId === "quiet.space")?.label).toEqual({ en: "Quiet space available", fr: "Espace calme offert" });
    expect(JSON.stringify(source)).not.toContain('"value"');
    expect(toOutingSource(demo("demo-nothing-known"), TODAY).eventDate).toBe(UNKNOWN);
    expect(JSON.parse(serializeOutingSource(source))).toEqual(source);
    expect(outingSourceFileName(source)).toBe("event-questions-demo-hybrid-confirmed.json");
    expect(() => toOutingSource(record, "x")).toThrow();
  });
});

describe("organiser screens", () => {
  it("renders a labelled control for every field, in both languages, with Unknown as the default choice", () => {
    for (const lang of ["en", "fr"] as const) {
      const page = html(<OrganiserForm lang={lang} today={TODAY} />);
      expect(page).toContain(messages[lang].orgIntro);
      expect(page).toContain(messages[lang].orgClaimNote);
      const ids = [...page.matchAll(/<(?:input|select|textarea)[^>]* id="([^"]+)"/g)].map((match) => match[1]);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(page, id).toContain(`<label for="${id}"`);
      for (const def of formFields("in_person")) expect(ids, def.id).toContain(`org-${def.id.replace(".", "-")}`);
      const selects = (page.match(/<select/g) ?? []).length;
      expect((page.match(new RegExp(`<option value="" selected="">${messages[lang].orgUnknownOption}</option>`, "g")) ?? []).length).toBe(selects - 1);
      expect(page).not.toContain("data-form-outcome");
    }
  });

  it("lists the issues with links to the fields and marks them invalid", () => {
    const page = html(<OrganiserForm lang="en" today={TODAY} initialInput={emptyOrganiserForm("")} initiallyChecked />);
    expect(page).toContain('data-form-outcome="errors"');
    expect(page).toContain("4 things need fixing");
    expect(page).toContain('<a href="#org-eventLabelEn">');
    expect(page).toContain('<a href="#org-statedBy">');
    expect((page.match(/aria-invalid="true"/g) ?? []).length).toBe(4);
    expect(page).toContain('id="org-statedBy-error"');
    expect(page).toMatch(/id="org-statedBy"[^>]*aria-describedby="org-statedBy-hint org-statedBy-error"|aria-describedby="org-statedBy-hint org-statedBy-error"[^>]*id="org-statedBy"/);
    expect(page).not.toContain(messages.en.orgSave);
  });

  it("shows the completeness summary with the real Unknown count before offering the file", () => {
    for (const lang of ["en", "fr"] as const) {
      const page = html(<OrganiserForm lang={lang} today={TODAY} initialInput={filledForm()} initiallyChecked />);
      const total = FIELD_DEFS.length - 1;
      expect(page).toContain('data-form-outcome="summary"');
      expect(page).toContain(`data-summary-unknown="${total - 6}"`);
      expect(page).toContain(`data-summary-total="${total}"`);
      expect(page).toContain(messages[lang].orgSummaryIncomplete);
      expect(page).not.toContain(messages[lang].orgSummaryComplete);
      expect(page).toContain(messages[lang].orgSave);
      expect(page).toContain(messages[lang].field_temporary_stageAccess);
    }
  });

  it("shows an opened organiser file as an unverified organiser statement", () => {
    const built = buildOrganiserRecord(filledForm(), "en", TODAY);
    if (!built.ok) throw new Error("form should build");
    const parsed = parseOrganiserFile(serializeOrganiserFile(built.record, TODAY));
    if (!parsed.ok) throw new Error(parsed.error);
    for (const lang of ["en", "fr"] as const) {
      const page = html(<OpenOrganiserFile lang={lang} today={TODAY} initialFile={parsed.file} />);
      expect(page).toContain(messages[lang].originOrganiserFile);
      expect(page).toContain(messages[lang].tier_1);
      expect(page).toContain(messages[lang].proto_PROTOTYPE_UNVERIFIED);
      expect(page).not.toContain(messages[lang].demoBanner);
      expect(page).toContain("Test-only evening");
      expect(page).toContain('type="file"');
    }
    const empty = html(<OpenOrganiserFile lang="en" today={TODAY} />);
    expect(empty).toContain(messages.en.openIntro);
    expect(empty).not.toContain("data-field=");
  });
});

describe("new strings", () => {
  const keys = Object.keys(messages.en) as MessageKey[];

  it("keep the same placeholders in English and French", () => {
    const holes = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    for (const key of keys) expect(holes(messages.fr[key]), key).toEqual(holes(messages.en[key]));
  });

  it("use the word verified only in a negated sentence", () => {
    const negated = /unverified|\b(not|no|never)\b[^.]*verified|non vérifié|\b(pas|ni|jamais|aucun)\b[^.]*vérifié|n'(a|est)[^.]*vérifié|ne l'a[^.]*vérifié/i;
    for (const lang of ["en", "fr"] as const) {
      for (const key of keys) {
        const text = messages[lang][key];
        if (/verified|vérifié/i.test(text)) expect(text, key).toMatch(negated);
      }
    }
  });
});
