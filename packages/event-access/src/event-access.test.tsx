import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEMONSTRATION_RECORDS } from "./fixtures.js";
import { messages, type MessageKey } from "./i18n.js";
import { FIELD_DEFS, mayStateConfirmed, projectRecord, unknownFieldIds } from "./project.js";
import { EventAccessPage } from "./ui/EventAccessPage.js";
import { fixtureRuleViolations, validateEventAccessRecord } from "./validate.js";
import { UNKNOWN, type EventAccessRecord } from "./types.js";

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const byId = (id: string): EventAccessRecord => {
  const found = DEMONSTRATION_RECORDS.find((r) => r.eventId === id);
  if (!found) throw new Error(`missing fixture ${id}`);
  return clone(found);
};

describe("schema", () => {
  it("accepts every demonstration record", () => {
    for (const record of DEMONSTRATION_RECORDS) {
      expect(validateEventAccessRecord(record, record.eventId), record.eventId).toMatchObject({ valid: true });
    }
  });

  it("keeps fixtures to the two allowed prototype labels and tiers 0 or 1", () => {
    for (const record of DEMONSTRATION_RECORDS) expect(fixtureRuleViolations(record)).toEqual([]);
  });

  it("refuses VERIFIED and tier 3", () => {
    const verified = byId("demo-venue-note");
    (verified.entrance.stepFree as unknown as { prototypeLabel: string }).prototypeLabel = "VERIFIED";
    expect(validateEventAccessRecord(verified).valid).toBe(false);
    const tier3 = byId("demo-venue-note");
    (tier3.entrance.stepFree as unknown as { tier: number }).tier = 3;
    expect(validateEventAccessRecord(tier3).valid).toBe(false);
    expect(fixtureRuleViolations(tier3).length).toBeGreaterThan(0);
  });

  it("requires source, licence, date and tier on every fact", () => {
    for (const key of ["source", "licence", "date", "tier"] as const) {
      const record = byId("demo-nothing-known");
      delete (record.entrance.doorClearWidthMm as unknown as Record<string, unknown>)[key];
      expect(validateEventAccessRecord(record).valid, key).toBe(false);
    }
  });

  it("does not let 0, an empty string, or null stand in for Unknown", () => {
    for (const bad of [0, -5, "", null, "unknown"]) {
      const record = byId("demo-nothing-known");
      (record.entrance.doorClearWidthMm as unknown as { value: unknown }).value = bad;
      expect(validateEventAccessRecord(record).valid, String(bad)).toBe(false);
    }
  });

  it("accepts a measured number only with provenance", () => {
    const record = byId("demo-nothing-known");
    record.entrance.doorClearWidthMm = {
      value: 900,
      source: "Test-only value inside a unit test, not a fixture",
      licence: "Not a third-party dataset",
      date: "2026-11-15",
      tier: 1,
      prototypeLabel: "PROTOTYPE-UNVERIFIED",
    };
    expect(validateEventAccessRecord(record).valid).toBe(true);
  });

  it("requires an occurrence date when confirmed, and captions for virtual and hybrid only", () => {
    const confirmed = byId("demo-hybrid-confirmed");
    delete confirmed.occurrenceDate;
    expect(validateEventAccessRecord(confirmed).valid).toBe(false);

    const hybridNoCaptions = byId("demo-hybrid-confirmed");
    delete hybridNoCaptions.captions;
    expect(validateEventAccessRecord(hybridNoCaptions).valid).toBe(false);

    const inPersonWithCaptions = byId("demo-nothing-known");
    inPersonWithCaptions.captions = byId("demo-hybrid-confirmed").captions!;
    expect(validateEventAccessRecord(inPersonWithCaptions).valid).toBe(false);
  });

  it("refuses in-app registration and unknown properties", () => {
    const registration = byId("demo-nothing-known") as unknown as { inAppRegistration: boolean };
    registration.inAppRegistration = true;
    expect(validateEventAccessRecord(registration).valid).toBe(false);
    const extra = { ...byId("demo-nothing-known"), ticketUrl: "https://example.invalid" };
    expect(validateEventAccessRecord(extra).valid).toBe(false);
  });
});

describe("demonstration data", () => {
  it("is labelled demonstration and never states a measurement", () => {
    for (const record of DEMONSTRATION_RECORDS) {
      expect(record.demonstration).toBe(true);
      expect(record.entrance.doorClearWidthMm.value).toBe(UNKNOWN);
      expect(record.washroom.transferSpaceMm.value).toBe(UNKNOWN);
      expect(record.parking.distanceToEntranceM.value).toBe(UNKNOWN);
      expect(record.washroom.present.value).toBe(UNKNOWN);
      expect(record.washroom.adultChangeTable.value).toBe(UNKNOWN);
      expect(record.washroom.hoist.value).toBe(UNKNOWN);
    }
  });

  it("names no URL or contact address", () => {
    const text = JSON.stringify(DEMONSTRATION_RECORDS);
    expect(text).not.toMatch(/https?:\/\//i);
    expect(text).not.toMatch(/@|www\./i);
  });
});

describe("projectors", () => {
  it("keeps Unknown as Unknown: no value, no display, no zero, no no", () => {
    const projected = projectRecord(byId("demo-nothing-known"), "en");
    for (const field of projected.sections.flatMap((s) => s.fields)) {
      expect(field.unknown, field.id).toBe(true);
      expect(field.value).toBeNull();
      expect(field.display).toBeNull();
    }
    expect(projected.unknownFields).toBe(projected.totalFields);
  });

  it("projects known values and leaves neighbours Unknown", () => {
    const projected = projectRecord(byId("demo-venue-note"), "fr");
    const fields = Object.fromEntries(projected.sections.flatMap((s) => s.fields).map((f) => [f.id, f]));
    expect(fields["entrance.stepFree"]?.display).toBe("Oui");
    expect(fields["entrance.doorClearWidthMm"]?.unknown).toBe(true);
    expect(fields["entrance.doorwayNotes"]?.display).toContain("Personne n'a mesuré la porte");
  });

  it("formats numbers with a non-breaking space and the stored number only", () => {
    const record = byId("demo-nothing-known");
    record.parking.distanceToEntranceM = {
      value: 40,
      source: "Test-only value inside a unit test",
      licence: "Not a third-party dataset",
      date: "2026-11-15",
      tier: 1,
      prototypeLabel: "PROTOTYPE-UNVERIFIED",
    };
    const field = projectRecord(record, "en").sections.flatMap((s) => s.fields).find((f) => f.id === "parking.distanceToEntranceM");
    expect(field?.display).toBe("40 m");
    expect(field?.value).toBe(40);
  });

  it("carries date, source, licence and tier for every field, Unknown or not", () => {
    for (const record of DEMONSTRATION_RECORDS) {
      for (const lang of ["en", "fr"] as const) {
        for (const field of projectRecord(record, lang).sections.flatMap((s) => s.fields)) {
          expect(field.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(field.source.length).toBeGreaterThan(0);
          expect(field.licence.length).toBeGreaterThan(0);
          expect([0, 1, 2]).toContain(field.tier);
          expect(field.tierLabel.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("shows captions as not applicable for in-person events, and counts only real fields", () => {
    const projected = projectRecord(byId("demo-nothing-known"), "en");
    const captions = projected.sections.find((s) => s.id === "captions");
    expect(captions?.notApplicable).toBe(true);
    expect(captions?.fields).toHaveLength(0);
    expect(projected.totalFields).toBe(FIELD_DEFS.length - 1);
  });

  it("lists Unknown field ids and never derives a confirmed claim", () => {
    expect(unknownFieldIds(byId("demo-nothing-known"))).toHaveLength(FIELD_DEFS.length - 1);
    expect(mayStateConfirmed(byId("demo-nothing-known"))).toBe(false);
    expect(mayStateConfirmed(byId("demo-venue-note"))).toBe(false);
    expect(mayStateConfirmed(byId("demo-hybrid-confirmed"))).toBe(true);
  });
});

describe("catalogs", () => {
  const keys = Object.keys(messages.en) as MessageKey[];

  it("have the same keys in English and French, all non-empty", () => {
    expect(Object.keys(messages.fr).sort()).toEqual([...keys].sort());
    for (const key of keys) {
      expect(messages.en[key].length, key).toBeGreaterThan(0);
      expect(messages.fr[key].length, key).toBeGreaterThan(0);
    }
  });

  it("use a non-breaking space before : ; ? ! in French", () => {
    const all = [
      ...keys.map((k) => messages.fr[k]),
      ...DEMONSTRATION_RECORDS.flatMap((r) => [r.eventLabel.fr]),
    ];
    for (const text of all) {
      expect(text, text).not.toMatch(/ [:;?!]/);
      expect(text, text).not.toMatch(/[^\s \d][:;?!]/);
    }
  });

  it("say that a door-to-door plan is not available, and mention no AI", () => {
    expect(messages.en.noJourney).toContain("door-to-door plan is not available in this package");
    expect(messages.fr.noJourney).toContain("n'est pas disponible");
    for (const lang of ["en", "fr"] as const) {
      for (const key of keys) expect(messages[lang][key], key).not.toMatch(/\bAI\b|\bIA\b|artificial/i);
    }
  });
});

describe("page", () => {
  it("renders every field with its date, source, licence and tier, in both languages", () => {
    for (const record of DEMONSTRATION_RECORDS) {
      for (const lang of ["en", "fr"] as const) {
        const html = renderToStaticMarkup(<EventAccessPage record={record} lang={lang} />).replace(/&#x27;/g, "'");
        const fieldCount = (html.match(/data-field=/g) ?? []).length;
        expect(fieldCount).toBe(projectRecord(record, lang).totalFields);
        expect((html.match(/<time /g) ?? []).length).toBeGreaterThanOrEqual(fieldCount);
        expect(html).toContain(messages[lang].noJourney);
        expect(html).toContain(messages[lang].noTickets);
        expect(html).toContain(messages[lang].demoBanner);
      }
    }
  });

  it("shows the empty state for Unknown fields and no buy or route button", () => {
    const html = renderToStaticMarkup(<EventAccessPage record={byId("demo-nothing-known")} lang="en" />).replace(/&#x27;/g, "'");
    const unknown = (html.match(/data-unknown="true"/g) ?? []).length;
    expect((html.match(new RegExp(messages.en.empty_unknown.replace(".", "\\."), "g")) ?? []).length).toBe(unknown);
    expect(html).not.toMatch(/<button|<a /i);
  });
});
