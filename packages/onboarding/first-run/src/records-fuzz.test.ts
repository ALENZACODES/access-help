// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  AGE_BANDS,
  FACT_KEYS,
  REVIEW_REASONS,
  agesConsistent,
  agesReport,
  agesToText,
  auditDom,
  buildReview,
  distinctRecords,
  extraCopies,
  findBanned,
  findRepeats,
  frenchTypographyIssues,
  groupByMonth,
  groupPlaces,
  hasAllParts,
  historyToText,
  kindCounts,
  latestLine,
  latestRecords,
  latestToText,
  placeHistory,
  reasonFor,
  renderAges,
  renderHistory,
  renderLatest,
  renderRepeats,
  renderReview,
  repeatsToText,
  reportCount,
  reviewCounts,
  reviewToText,
  timeline,
  totalItems,
  type Locale,
  type Note,
  type Place,
} from "./index";
import { makeRng, randomNotes } from "./testkit";

const TODAY = new Date(Date.UTC(2026, 10, 15));
const LOCALES: Locale[] = ["en", "fr"];
const SEEDS = Array.from({ length: 25 }, (_, i) => i + 101);

const notesFor = (seed: number): Note[] => {
  const base = randomNotes(makeRng(seed), 10);
  // Every third seed also holds the first notes a second time under new ids, so repeats are covered.
  if (seed % 3 !== 0) return base;
  return [...base, ...base.slice(0, 3).map((n, i) => ({ ...n, id: `copy-${seed}-${i}` }))];
};
const placesFor = (seed: number): Place[] => groupPlaces(notesFor(seed), "en");
const held = (notes: readonly Note[]): number => notes.reduce((n, note) => n + note.facts.filter((f) => f.value !== "unknown").length, 0);

describe("records of random notes", () => {
  it("are all accounted for: history, latest and ages hold the same number as the notes", () => {
    for (const seed of SEEDS) {
      const places = placesFor(seed);
      const want = held(notesFor(seed));
      expect(places.reduce((n, p) => n + placeHistory(p).records, 0), `history ${seed}`).toBe(want);
      expect(latestRecords(places), `latest ${seed}`).toHaveLength(want);
      expect(agesReport(places, TODAY).records, `ages ${seed}`).toBe(want);
      const counts = kindCounts(places);
      expect(counts.person + counts["named-source"], `kinds ${seed}`).toBe(want);
    }
  });

  it("keep a single first record for each detail that has any, and the timeline holds each record once", () => {
    for (const seed of SEEDS) {
      for (const p of placesFor(seed)) {
        const h = placeHistory(p);
        for (const d of h.details) {
          expect(d.entries.filter((e) => e.change === "first").length, `${seed} ${p.name} ${d.key}`).toBe(d.entries.length === 0 ? 0 : 1);
          const dates = d.entries.map((e) => e.provenance.recordedOn);
          expect([...dates].sort().reverse(), `${seed} newest first`).toEqual(dates);
        }
        expect(timeline(h)).toHaveLength(h.records);
      }
    }
  });

  it("are in date order in the latest list, and the months keep that order", () => {
    for (const seed of SEEDS) {
      const list = latestRecords(placesFor(seed));
      const dates = list.map((e) => e.entry.provenance.recordedOn);
      expect([...dates].sort().reverse()).toEqual(dates);
      const months = groupByMonth(list);
      expect(months.reduce((n, m) => n + m.entries.length, 0)).toBe(list.length);
      expect(new Set(months.map((m) => m.month)).size).toBe(months.length);
    }
  });

  it("add up in the ages report", () => {
    for (const seed of SEEDS) {
      const places = placesFor(seed);
      const r = agesReport(places, TODAY);
      expect(agesConsistent(r), String(seed)).toBe(true);
      for (const row of r.rows) {
        expect(row.unknownPlaces).toBe(places.filter((p) => p.resolutions[row.key].kind === "unknown").length);
        expect(AGE_BANDS.reduce((n, b) => n + row.bands[b], 0)).toBe(row.records);
      }
    }
  });

  it("explain the gap between reports and different records with the repeats, exactly", () => {
    for (const seed of SEEDS) {
      const places = placesFor(seed);
      let reports = 0;
      let distinct = 0;
      for (const p of places) {
        for (const k of FACT_KEYS) {
          reports += reportCount(p.resolutions[k]);
          distinct += distinctRecords(p, k);
        }
      }
      expect(reports - distinct, String(seed)).toBe(extraCopies(findRepeats(places)));
    }
  });

  it("put every detail of every place either on the ask-again list or among the recent agreed ones", () => {
    for (const seed of SEEDS) {
      const places = placesFor(seed);
      const listed = totalItems(buildReview(places, TODAY));
      const settled = places.reduce((n, p) => n + FACT_KEYS.filter((k) => reasonFor(p, k, TODAY) === undefined).length, 0);
      expect(listed + settled).toBe(places.length * FACT_KEYS.length);
      const counts = reviewCounts(places, TODAY);
      for (const r of REVIEW_REASONS) expect(totalItems(buildReview(places, TODAY, r))).toBe(counts[r]);
    }
  });
});

describe("text files for random notes", () => {
  it("never print a missing value and use no banned wording, in any file or language", () => {
    for (const seed of SEEDS) {
      const places = placesFor(seed);
      for (const l of LOCALES) {
        const texts = [
          ...places.map((p) => historyToText(p, placeHistory(p), l, TODAY)),
          reviewToText(buildReview(places, TODAY), l, TODAY),
          agesToText(agesReport(places, TODAY), l, TODAY),
          repeatsToText(findRepeats(places), l, TODAY),
          latestToText(latestRecords(places), l, TODAY),
        ];
        for (const text of texts) {
          expect(text, `${seed} ${l}`).not.toMatch(/undefined|NaN|\[object|null/);
          expect(text.endsWith("\n"), `${seed} ${l}`).toBe(true);
        }
        // Notes and names are typed by people, so only the App's own files with no names are checked for wording.
        expect(findBanned(agesToText(agesReport(places, TODAY), l, TODAY))).toBeUndefined();
        if (l === "fr") expect(frenchTypographyIssues(agesToText(agesReport(places, TODAY), "fr", TODAY))).toEqual([]);
      }
    }
  });

  it("name the source, licence, date and tier of every record in the latest list", () => {
    for (const seed of SEEDS) {
      for (const l of LOCALES) {
        for (const e of latestRecords(placesFor(seed))) expect(hasAllParts(latestLine(e, l), e.entry.provenance, l), `${seed} ${l}`).toBe(true);
      }
    }
  });
});

describe("pages for random notes", () => {
  function audit(inner: string, locale: Locale): string[] {
    document.documentElement.lang = locale;
    document.body.innerHTML = `<div id="r"><a class="skip-link" href="#main">Skip</a><main id="main"><h1>Title</h1>${inner}</main></div>`;
    return auditDom(document.getElementById("r") as HTMLElement, { locale }).map((v) => `${v.rule}: ${v.detail}`);
  }

  it("pass the App's own page audit in both languages", () => {
    for (const seed of SEEDS.slice(0, 10)) {
      for (const l of LOCALES) {
        const places = groupPlaces(notesFor(seed), l);
        const pages: Array<[string, string]> = [
          ["ages", renderAges(places, l, TODAY)],
          ["repeats", renderRepeats(places, l, TODAY)],
          ["latest", renderLatest({ places, only: undefined, shown: 20, locale: l, today: TODAY })],
          ["review", renderReview({ places, only: undefined, shown: 10, locale: l, today: TODAY })],
          ...places.slice(0, 3).map((p): [string, string] => [`history ${p.id}`, renderHistory(p, l, TODAY)]),
        ];
        for (const [name, html] of pages) expect(audit(html, l), `${name} ${seed} ${l}`).toEqual([]);
      }
    }
  });
});
