// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { auditCopy, auditDom, collectAllCopy, scanSource, type AuditRule, type Locale, type PairList, type Violation } from "./index";

const BTN = 'style="min-width:44px;min-height:44px"';

function audit(inner: string, locale: Locale = "en"): Violation[] {
  document.documentElement.lang = locale;
  document.body.innerHTML = `<div id="r"><a class="skip-link" href="#main">Skip</a><main id="main"><h1>Title</h1>${inner}</main></div>`;
  return auditDom(document.getElementById("r") as HTMLElement, { locale });
}

const rules = (v: Violation[]): AuditRule[] => v.map((x) => x.rule);

describe("scanner-claim rule", () => {
  it("flags rendered text that says the App starts a scanner, and allows the honest statement", () => {
    expect(rules(audit("<p>The App starts scanning when you press Next.</p>"))).toContain("scanner-claim");
    expect(rules(audit("<p>The App does not run a scanner.</p>"))).not.toContain("scanner-claim");
  });

  it("flags French wording too", () => {
    expect(rules(audit("<p>L’App lance le balayage.</p>", "fr"))).toContain("scanner-claim");
    expect(rules(audit("<p>L’App n’exécute pas de balayage.</p>", "fr"))).not.toContain("scanner-claim");
  });

  it("flags a scanner claim inside any copy pair", () => {
    const pairs: PairList = [["x.claim", { en: "Scanning stays off until you start it.", fr: "Le balayage reste désactivé tant que vous ne le lancez pas." }]];
    expect(rules(auditCopy(pairs))).toContain("scanner-claim");
  });
});

describe("plain-language rule", () => {
  const long = Array.from({ length: 40 }, (_, i) => `word${i}`).join(" ") + ".";

  it("flags a very long sentence in an article or path string, but not elsewhere", () => {
    expect(rules(auditCopy([["articles.test.body", { en: long, fr: "Une phrase courte." }]]))).toContain("plain-language");
    expect(rules(auditCopy([["paths.test.body", { en: "Short.", fr: long }]]))).toContain("plain-language");
    expect(rules(auditCopy([["COPY.something.else", { en: long, fr: long }]]))).not.toContain("plain-language");
  });

  it("accepts short sentences", () => {
    expect(rules(auditCopy([["articles.test.body", { en: "Press Tab. Then press Enter.", fr: "Appuyez sur Tab. Puis sur Entrée." }]]))).not.toContain("plain-language");
  });
});

describe("duplicate-control-name rule", () => {
  it("flags two buttons or links with the same visible name inside a names-unique zone", () => {
    const html = `<section data-names-unique><button ${BTN}>Open</button><a href="#/x" style="display:inline-block;min-height:44px;min-width:44px">open</a></section>`;
    expect(rules(audit(html))).toContain("duplicate-control-name");
  });

  it("allows distinct names, and repeats outside a zone", () => {
    expect(rules(audit(`<section data-names-unique><button ${BTN}>One</button><button ${BTN}>Two</button></section>`))).not.toContain("duplicate-control-name");
    expect(rules(audit(`<div><button ${BTN}>Same</button><button ${BTN}>Same</button></div>`))).not.toContain("duplicate-control-name");
  });
});

describe("table-structure rule", () => {
  const ok = '<table><caption>Keys</caption><thead><tr><th scope="col">A</th><th scope="col">B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>';

  it("accepts a captioned table with scoped headers and even rows", () => {
    expect(rules(audit(ok))).not.toContain("table-structure");
  });

  it("flags a missing caption, an unscoped header and uneven rows", () => {
    expect(rules(audit(ok.replace("<caption>Keys</caption>", "")))).toContain("table-structure");
    expect(rules(audit(ok.replace(' scope="col">A', ">A")))).toContain("table-structure");
    expect(rules(audit(ok.replace("<td>2</td>", "")))).toContain("table-structure");
  });
});

describe("broken-anchor rule", () => {
  it("flags an in-page link with no target and allows one that exists", () => {
    const link = 'style="display:inline-block;min-height:44px;min-width:44px"';
    expect(rules(audit(`<a href="#nowhere" ${link}>Jump</a>`))).toContain("broken-anchor");
    expect(rules(audit(`<h2 id="here" tabindex="-1">Here</h2><a href="#here" ${link}>Jump</a>`))).not.toContain("broken-anchor");
  });

  it("leaves routes, the skip link and a bare hash alone", () => {
    const link = 'style="display:inline-block;min-height:44px;min-width:44px"';
    expect(rules(audit(`<a href="#/help" ${link}>Route</a><a href="#" ${link}>Top</a>`))).not.toContain("broken-anchor");
  });
});

describe("vague-link-text rule", () => {
  const link = 'style="display:inline-block;min-height:44px;min-width:44px"';

  it("flags links and buttons whose name says nothing, in both languages", () => {
    for (const name of ["Click here", "here", "Read more", "More", "More…", "Learn more.", "Link", "Details"]) {
      expect(rules(audit(`<a href="#/help" ${link}>${name}</a>`)), name).toContain("vague-link-text");
    }
    for (const name of ["Cliquez ici", "Ici", "En savoir plus", "Plus", "Lire la suite", "Lien"]) {
      expect(rules(audit(`<button ${BTN}>${name}</button>`, "fr")), name).toContain("vague-link-text");
    }
  });

  it("looks at the accessible name when there is one", () => {
    expect(rules(audit(`<button ${BTN} aria-label="more">Plus de détails</button>`))).toContain("vague-link-text");
  });

  it("allows a name that says where it goes, even if it contains a vague word", () => {
    for (const name of ["Read more about switches", "Details of this place", "Open the keyboard article", "Plus de détails sur ce lieu"]) {
      expect(rules(audit(`<a href="#/help" ${link}>${name}</a>`)), name).not.toContain("vague-link-text");
    }
  });
});

describe("the real copy", () => {
  it("includes the article and key strings, so a regression there is caught", () => {
    const labels = collectAllCopy().map(([label]) => label);
    expect(labels.some((l) => l.startsWith("articles.keyboard."))).toBe(true);
    expect(labels.some((l) => l.startsWith("articles.keys."))).toBe(true);
    expect(rules(auditCopy(collectAllCopy()))).toEqual([]);
  });
});

describe("source guard additions", () => {
  it("flags accesskey and a scanner claim in source, and lets term lists carry both", () => {
    expect(scanSource("a.ts", 'const h = `<button accesskey="s">Go</button>`;').map((i) => i.rule).join(" ")).toContain("accesskey");
    expect(scanSource("a.ts", 'const s = "The App starts scanning now.";').map((i) => i.rule).join(" ")).toContain("scanner-claim");
    expect(scanSource("a.ts", 'const s = "The App does not run a scanner.";')).toEqual([]);
    expect(scanSource("t.ts", '// guard:allow-terms\nconst s = "The App starts scanning now.";')).toEqual([]);
  });
});
