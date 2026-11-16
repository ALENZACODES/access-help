// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { auditDom, type AuditRule, type Locale, type Violation } from "./index";

function audit(inner: string, locale: Locale = "en"): Violation[] {
  document.documentElement.lang = locale;
  document.body.innerHTML = `<div id="r"><a class="skip-link" href="#main">Skip</a><main id="main"><h1>Title</h1>${inner}</main></div>`;
  return auditDom(document.getElementById("r") as HTMLElement, { locale });
}

const rules = (v: Violation[]): AuditRule[] => v.map((x) => x.rule);

beforeEach(() => {
  document.body.innerHTML = "";
});

const WRAP = '<div class="table-wrap" role="region" aria-labelledby="cap" tabindex="0">';

interface SourcesRow {
  readonly name?: string;
  readonly details?: string;
  readonly yes?: string;
  readonly no?: string;
  readonly licences?: string;
  readonly range?: string;
}

function sources(rows: readonly SourcesRow[], wrap = WRAP, extra = ""): string {
  const body = rows
    .map(
      (r) =>
        `<tr><th scope="row">${r.name ?? "City survey"}</th><td data-col="details">${r.details ?? "3"}</td><td data-col="yes">${r.yes ?? "2"}</td>` +
        `<td data-col="no">${r.no ?? "1"}</td><td data-col="licences">${r.licences ?? "CC0-1.0"}</td><td data-col="range">${r.range ?? "2026-01-01"}</td><td data-col="old">0</td></tr>`,
    )
    .join("");
  return (
    `${wrap}<table class="data" data-kind="sources"><caption id="cap">Sources</caption>` +
    `<thead><tr><th scope="col">Source</th><th scope="col">Details</th><th scope="col">Yes</th><th scope="col">No</th><th scope="col">Licences</th><th scope="col">Dates</th><th scope="col">Old</th></tr></thead>` +
    `<tbody>${body}</tbody></table></div>${extra}`
  );
}

function summary(cells: readonly string[][], places = 4, wrap = WRAP): string {
  const body = cells
    .map((c, i) => `<tr><th scope="row">Detail ${i + 1}</th>${["yes", "no", "differ", "unknown"].map((k, j) => `<td data-col="${k}">${c[j] ?? "0"}</td>`).join("")}</tr>`)
    .join("");
  return (
    `${wrap}<table class="data" data-kind="summary" data-places="${places}"><caption id="cap">Summary</caption>` +
    `<thead><tr><th scope="col">Detail</th><th scope="col">Yes</th><th scope="col">No</th><th scope="col">Differ</th><th scope="col">Unknown</th></tr></thead>` +
    `<tbody>${body}</tbody></table></div>`
  );
}

describe("data-table: sources", () => {
  it("accepts rows where Yes and No add up to the details", () => {
    expect(audit(sources([{}, { name: "Town data", details: "5", yes: "5", no: "0" }]))).toEqual([]);
  });

  it("rejects a row whose Yes and No do not add up", () => {
    const v = audit(sources([{ details: "4" }]));
    expect(rules(v)).toContain("data-table");
    expect(v.map((x) => x.detail).join(" ")).toContain("4 details but 2 Yes and 1 No");
  });

  it("rejects a count that is not a whole number", () => {
    for (const bad of ["many", "-1", "1.5", ""]) expect(rules(audit(sources([{ yes: bad }]))), bad).toContain("data-table");
  });

  it("rejects a row with no licence or no date", () => {
    expect(rules(audit(sources([{ licences: "" }])))).toContain("data-table");
    expect(rules(audit(sources([{ range: "last spring" }])))).toContain("data-table");
  });

  it("rejects a table with no rows", () => {
    expect(rules(audit(sources([])))).toContain("data-table");
  });
});

describe("data-table: summary", () => {
  it("accepts rows that add up to the number of places", () => {
    expect(audit(summary([["1", "1", "1", "1"], ["0", "0", "0", "4"]]))).toEqual([]);
  });

  it("rejects a row that adds up to something else", () => {
    const v = audit(summary([["1", "1", "1", "2"]]));
    expect(rules(v)).toContain("data-table");
    expect(v.map((x) => x.detail).join(" ")).toContain("adds up to 5, not 4 places");
    expect(rules(audit(summary([["1", "1", "1", "0"]])))).toContain("data-table");
  });

  it("rejects a count that is not a whole number", () => {
    expect(rules(audit(summary([["1", "1", "x", "2"]])))).toContain("data-table");
  });

  it("accepts a table for zero places only when every count is zero", () => {
    expect(audit(summary([["0", "0", "0", "0"]], 0))).toEqual([]);
    expect(rules(audit(summary([["0", "0", "0", "1"]], 0)))).toContain("data-table");
  });
});

describe("data-table: any count table", () => {
  it("needs a focusable, labelled scroll region", () => {
    expect(rules(audit(sources([{}], '<div class="table-wrap" role="region" aria-labelledby="cap">')))).toContain("data-table");
    expect(rules(audit(sources([{}], '<div class="table-wrap" role="region" tabindex="0">')))).toContain("data-table");
    expect(rules(audit(sources([{}], "<div>")))).toContain("data-table");
  });

  it("rejects ranking, scoring or vouching words, in either language", () => {
    for (const word of ["best", "worst", "score", "ranked", "winner", "reliable", "trusted"]) {
      expect(rules(audit(sources([{ name: `City survey ${word}` }]))), word).toContain("data-table");
    }
    for (const word of ["meilleur", "classement", "fiable"]) {
      expect(rules(audit(sources([{ name: `Source ${word}` }]), "fr")), word).toContain("data-table");
    }
  });

  it("rejects a count table of a kind it does not know", () => {
    const odd = sources([{}]).replace('data-kind="sources"', 'data-kind="other"');
    expect(rules(audit(odd))).toContain("data-table");
  });

  it("leaves other tables to their own rules", () => {
    const plain = '<table><caption>Keys</caption><thead><tr><th scope="col">A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>';
    expect(rules(audit(plain))).not.toContain("data-table");
  });
});
