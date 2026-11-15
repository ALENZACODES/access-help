import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { HELP_ARTICLES } from "@access/help";
import { containsForbiddenTerm, decodedForbiddenTerms, findForbiddenTerms } from "./forbidden-terms.js";

const SOURCE = fileURLToPath(new URL("./forbidden-terms.ts", import.meta.url));

describe("forbidden-term guard", () => {
  it("stores terms as character codes, not decoded literals", () => {
    const source = readFileSync(SOURCE, "utf8");
    for (const { term } of decodedForbiddenTerms()) {
      expect(source).not.toContain(term);
      expect(source).not.toContain(term.toLowerCase());
      expect(source).not.toContain(term.toUpperCase());
    }
  });

  it("rejects the short name and the long English and French organisation names, case-insensitively", () => {
    const terms = decodedForbiddenTerms();
    expect(terms.map((item) => item.id).sort()).toEqual(["en-long", "fr-long", "short"]);
    for (const { id, term } of terms) {
      expect(findForbiddenTerms(term), id).toContain(id);
      expect(findForbiddenTerms(term.toLowerCase()), `${id} lower`).toContain(id);
      expect(findForbiddenTerms(term.toUpperCase()), `${id} upper`).toContain(id);
      expect(findForbiddenTerms(`Prefix ${term} suffix`), `${id} embedded`).toContain(id);
    }
    expect(containsForbiddenTerm("the App is an unbranded prototype")).toBe(false);
    expect(findForbiddenTerms("No organisation is named in this sentence.")).toEqual([]);
  });

  it("keeps bundled help articles free of the guarded names", () => {
    expect(findForbiddenTerms(JSON.stringify(HELP_ARTICLES))).toEqual([]);
  });
});
