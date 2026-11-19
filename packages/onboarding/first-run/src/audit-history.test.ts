// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { OPEN_LICENCES, auditDom, groupPlaces, renderHistory, renderReview, type AuditRule, type Locale, type Violation } from "./index";
import { testNote } from "./testnotes";

const TODAY = new Date(Date.UTC(2026, 10, 15));

function audit(inner: string, locale: Locale = "en"): Violation[] {
  document.documentElement.lang = locale;
  document.body.innerHTML = `<div id="r"><a class="skip-link" href="#main">Skip</a><main id="main"><h1>Title</h1>${inner}</main></div>`;
  return auditDom(document.getElementById("r") as HTMLElement, { locale });
}

const rules = (v: Violation[]): AuditRule[] => v.map((x) => x.rule);
const details = (v: Violation[]): string[] => v.filter((x) => x.rule === "data-table").map((x) => x.detail);

interface Row {
  readonly date?: string;
  readonly answer?: string;
  readonly source?: string;
  readonly licence?: string;
  readonly tier?: string;
}

const WRAP = '<div class="table-wrap" role="region" aria-labelledby="cap" tabindex="0">';

function history(rows: readonly Row[], wrap = WRAP): string {
  const body = rows
    .map(
      (r) =>
        `<tr><th scope="row">${r.date ?? "2026-01-01"}</th><td data-col="answer">${r.answer ?? "Yes"}</td><td data-col="source">${r.source ?? "City survey"}</td>` +
        `<td data-col="licence">${r.licence ?? "CC0-1.0"}</td><td data-col="tier">${r.tier ?? "Tier 0, not reviewed"}</td><td data-col="kind">Named source</td><td data-col="change">First record</td></tr>`,
    )
    .join("");
  return (
    `${wrap}<table class="data" data-kind="history"><caption id="cap">Elevator</caption>` +
    `<thead><tr><th scope="col">Date</th><th scope="col">Answer</th><th scope="col">Source</th><th scope="col">Licence</th><th scope="col">Tier</th><th scope="col">Kind</th><th scope="col">Change</th></tr></thead>` +
    `<tbody>${body}</tbody></table></div>`
  );
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("history tables in the page audit", () => {
  it("accepts a well formed table in English and French", () => {
    expect(rules(audit(history([{ date: "2026-02-02" }, { date: "2026-01-01", answer: "No" }])))).toEqual([]);
    expect(rules(audit(history([{ answer: "Oui", tier: "Niveau 0, non examiné" }, { answer: "Non", tier: "Niveau 0, non examiné" }]), "fr"))).toEqual([]);
  });

  it("accepts every open licence the App accepts", () => {
    for (const licence of OPEN_LICENCES) expect(details(audit(history([{ licence }]))), licence).toEqual([]);
  });

  it("flags an answer that is not Yes or No", () => {
    for (const answer of ["Unknown", "", "Maybe", "yes", "Inconnu"]) {
      expect(details(audit(history([{ answer }]))).some((d) => d.includes("answer is not Yes or No")), `"${answer}"`).toBe(true);
    }
  });

  it("flags a row without a source", () => {
    expect(details(audit(history([{ source: "" }])))).toEqual(["history row without a source"]);
    expect(details(audit(history([{ source: "   " }])))).toEqual(["history row without a source"]);
  });

  it("flags a licence that is missing or not open", () => {
    for (const licence of ["", "All rights reserved", "cc0-1.0", "CC-BY-NC-4.0"]) {
      expect(details(audit(history([{ licence }]))), `"${licence}"`).toEqual([`history row without an open licence: "${licence}"`]);
    }
  });

  it("flags a date that is missing or not a real day", () => {
    for (const date of ["", "2026-13-01", "2026-02-30", "01/02/2026", "yesterday"]) {
      expect(details(audit(history([{ date }]))).some((d) => d.startsWith("history row without a date")), `"${date}"`).toBe(true);
    }
  });

  it("flags a row without a tier", () => {
    for (const tier of ["", "Not reviewed", "Tier", "Tier x"]) {
      expect(details(audit(history([{ tier }]))), `"${tier}"`).toEqual([`history row without a tier: "${tier}"`]);
    }
    expect(details(audit(history([{ tier: "Tier 0" }])))).toEqual([]);
  });

  it("flags rows that are not newest first, and accepts records from the same day", () => {
    expect(details(audit(history([{ date: "2025-01-01" }, { date: "2026-01-01" }])))).toEqual(["history rows are not newest first: 2026-01-01 after 2025-01-01"]);
    expect(details(audit(history([{ date: "2026-01-01" }, { date: "2026-01-01" }, { date: "2025-12-31" }])))).toEqual([]);
  });

  it("flags a table with no rows, or outside a focusable labelled region", () => {
    expect(details(audit(history([])))).toContain("count table without rows");
    expect(details(audit(history([{}], "<div>")))).toContain("count table must sit in a focusable, labelled scroll region");
    expect(details(audit(history([{}], '<div class="table-wrap" role="region" aria-labelledby="cap">')))).toContain(
      "count table must sit in a focusable, labelled scroll region",
    );
  });

  it("flags wording that vouches for a source or ranks", () => {
    expect(details(audit(history([{ source: "The most reliable survey" }])))).toContain("count table must not rank, score or vouch for a source");
    expect(details(audit(history([{ source: "Source la plus fiable" }]), "fr"))).toContain("count table must not rank, score or vouch for a source");
  });

  it("reports each problem in a row, not only the first", () => {
    const found = details(audit(history([{ answer: "Maybe", source: "", licence: "", date: "", tier: "" }])));
    expect(found).toHaveLength(5);
  });
});

describe("the real pages pass the audit", () => {
  const notes = [
    testNote("n1", "Library", [{ key: "elevator", value: "yes", on: "2024-01-10" }]),
    testNote("n2", "Library", [{ key: "elevator", value: "no", on: "2026-06-01" }, { key: "automatic-door", value: "yes" }]),
    testNote("d1", "Dojo", [], "4 Main St"),
  ];

  it.each(["en", "fr"] as const)("record history, with and without records (%s)", (locale) => {
    for (const place of groupPlaces(notes, locale)) {
      expect(audit(renderHistory(place, locale, TODAY), locale).map((v) => `${v.rule}: ${v.detail}`), place.name).toEqual([]);
    }
    expect(audit(renderHistory(undefined, locale, TODAY), locale).map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
  });

  it.each(["en", "fr"] as const)("details to ask about again, with every filter (%s)", (locale) => {
    const places = groupPlaces(notes, locale);
    for (const only of [undefined, "differ", "old", "unknown"] as const) {
      const html = renderReview({ places, only, shown: 10, locale, today: TODAY });
      expect(audit(html, locale).map((v) => `${v.rule}: ${v.detail}`), String(only)).toEqual([]);
    }
    expect(audit(renderReview({ places: [], only: undefined, shown: 10, locale, today: TODAY }), locale).map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
  });
});
