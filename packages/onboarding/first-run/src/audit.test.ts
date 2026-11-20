// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  auditCopy,
  auditCss,
  auditDom,
  buildCss,
  collectAllCopy,
  type AuditRule,
  type Locale,
  type PairList,
  type Violation,
} from "./index";

const BTN = 'style="min-width:44px;min-height:44px"';
const FIELD = 'style="min-height:44px"';

function audit(inner: string, locale: Locale = "en", wrapInMain = true): Violation[] {
  document.documentElement.lang = locale;
  document.body.innerHTML =
    `<div id="r"><a class="skip-link" href="#main">Skip</a>` +
    (wrapInMain ? `<main id="main"><h1>Title</h1>${inner}</main>` : inner) +
    `</div>`;
  return auditDom(document.getElementById("r") as HTMLElement, { locale });
}

const rules = (v: Violation[]): AuditRule[] => v.map((x) => x.rule);

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("auditDom passes a clean page", () => {
  it("accepts a minimal accessible page", () => {
    expect(audit(`<button type="button" ${BTN}>Go</button>`)).toEqual([]);
  });

  it("accepts a labelled field, a grouped radio and a recorded detail", () => {
    const html =
      `<label for="a">Name</label><input id="a" type="text" ${FIELD}>` +
      `<fieldset><legend>Door</legend><label class="choice" style="min-height:44px;min-width:44px"><input type="radio" name="d">Yes</label></fieldset>` +
      `<dl class="facts"><dt>Door</dt><dd><strong>Yes</strong>. Source: S. Licence: CC0-1.0. Recorded on 2026-01-01 (1 month ago).</dd>` +
      `<dt>Lift</dt><dd><strong>Unknown</strong>. No record.</dd></dl>`;
    expect(audit(html)).toEqual([]);
  });
});

describe("auditDom fails on each violation", () => {
  it("accessible-name: a button with no text", () => {
    expect(rules(audit(`<button type="button" ${BTN}></button>`))).toContain("accessible-name");
  });

  it("accessible-name: an input with no label", () => {
    expect(rules(audit(`<input type="text" ${FIELD}>`))).toContain("accessible-name");
  });

  it("label-in-name: aria-label that drops the visible text", () => {
    expect(rules(audit(`<button type="button" aria-label="Close" ${BTN}>Remove</button>`))).toContain("label-in-name");
    expect(audit(`<button type="button" aria-label="Remove note" ${BTN}>Remove</button>`)).toEqual([]);
  });

  it("target-size: buttons, fields and radios under 44px", () => {
    expect(rules(audit(`<button type="button">Go</button>`))).toContain("target-size");
    expect(rules(audit(`<button type="button" style="min-width:44px;min-height:40px">Go</button>`))).toContain("target-size");
    expect(rules(audit(`<label for="a">A</label><input id="a" type="text">`))).toContain("target-size");
    expect(rules(audit(`<fieldset><legend>L</legend><label><input type="radio" name="x">Yes</label></fieldset>`))).toContain("target-size");
  });

  it("duplicate-id", () => {
    expect(rules(audit(`<p id="x">a</p><p id="x">b</p>`))).toContain("duplicate-id");
  });

  it("heading-order and single-h1", () => {
    expect(rules(audit(`<h3>Skipped</h3>`))).toContain("heading-order");
    expect(rules(audit(`<h1>Second</h1>`))).toContain("single-h1");
    expect(audit(`<h2>Fine</h2><h3>Fine</h3><h2>Fine</h2>`)).toEqual([]);
  });

  it("landmarks: missing main and unlabelled navs", () => {
    expect(rules(audit(`<h1>T</h1><p id="main">x</p>`, "en", false))).toContain("landmarks");
    expect(rules(audit(`<nav><a href="#a">A</a></nav><nav><a href="#b">B</a></nav>`))).toContain("landmarks");
  });

  it("positive-tabindex", () => {
    expect(rules(audit(`<div tabindex="3">x</div>`))).toContain("positive-tabindex");
    expect(audit(`<h2 tabindex="-1">x</h2>`)).toEqual([]);
  });

  it("skip-link: absent, or not the first control", () => {
    document.documentElement.lang = "en";
    document.body.innerHTML = `<div id="r"><main id="main"><h1>T</h1></main></div>`;
    expect(rules(auditDom(document.getElementById("r") as HTMLElement, { locale: "en" }))).toContain("skip-link");
    document.body.innerHTML = `<div id="r"><button type="button" ${BTN}>First</button><a class="skip-link" href="#main">Skip</a><main id="main"><h1>T</h1></main></div>`;
    expect(rules(auditDom(document.getElementById("r") as HTMLElement, { locale: "en" }))).toContain("skip-link");
  });

  it("lang-switch: the language button must be in the other language", () => {
    expect(rules(audit(`<button type="button" data-action="set-locale" ${BTN}>Français</button>`))).toContain("lang-switch");
    expect(audit(`<button type="button" data-action="set-locale" lang="fr" ${BTN}>Français</button>`)).toEqual([]);
    expect(rules(audit(`<button type="button" data-action="set-locale" lang="en" ${BTN}>English</button>`, "en"))).toContain("lang-switch");
  });

  it("page-lang: html lang must match the interface language", () => {
    document.documentElement.lang = "fr";
    document.body.innerHTML = `<div id="r"><a class="skip-link" href="#main">S</a><main id="main"><h1>T</h1></main></div>`;
    expect(rules(auditDom(document.getElementById("r") as HTMLElement, { locale: "en" }))).toContain("page-lang");
  });

  it("radio-group: radios need a fieldset legend", () => {
    expect(rules(audit(`<label class="choice" style="min-height:44px;min-width:44px"><input type="radio" name="x">Yes</label>`))).toContain("radio-group");
  });

  it("invalid-description: an invalid field must point at error text", () => {
    expect(rules(audit(`<label for="a">A</label><input id="a" type="text" aria-invalid="true" ${FIELD}>`))).toContain("invalid-description");
    expect(rules(audit(`<label for="a">A</label><input id="a" type="text" aria-invalid="true" aria-describedby="nope" ${FIELD}>`))).toContain("invalid-description");
    expect(audit(`<label for="a">A</label><p id="e">Enter a name.</p><input id="a" type="text" aria-invalid="true" aria-describedby="e" ${FIELD}>`)).toEqual([]);
  });

  it("fact-provenance: yes or no without source, licence and date", () => {
    const dd = (inner: string): string => `<dl class="facts"><dt>Door</dt><dd>${inner}</dd></dl>`;
    expect(rules(audit(dd("<strong>Yes</strong>. Looks fine.")))).toContain("fact-provenance");
    expect(rules(audit(dd("<strong>No</strong>. Source: S. Licence: CC0-1.0.")))).toContain("fact-provenance");
    expect(audit(dd("<strong>Non</strong>. Source\u00A0: S. Licence\u00A0: CC0-1.0. Saisi le 2026-01-01 (il y a 10 mois)."), "fr")).toEqual([]);
  });

  it("fact-provenance: unknown must not show a source, and a value must be Yes, No or Unknown", () => {
    const dd = (inner: string): string => `<dl class="facts"><dt>Door</dt><dd>${inner}</dd></dl>`;
    expect(rules(audit(dd("<strong>Unknown</strong>. No record. Source: S.")))).toContain("fact-provenance");
    expect(rules(audit(dd("<strong>Unknown</strong>. Maybe.")))).toContain("fact-provenance");
    expect(rules(audit(dd("<strong>Probably</strong>. No record.")))).toContain("fact-provenance");
  });

  it("fact-provenance: differing reports must list two or more, each with source, licence and date", () => {
    const dd = (inner: string): string => `<dl class="facts"><dt>Door</dt><dd>${inner}</dd></dl>`;
    const li = (v: string): string => `<li>${v}. Source: S. Licence: CC0-1.0. Recorded on 2026-01-01 (10 months ago).</li>`;
    expect(audit(dd(`<strong>Reports differ</strong>. 2 reports disagree.<ul>${li("Yes")}${li("No")}</ul>`))).toEqual([]);
    expect(rules(audit(dd(`<strong>Reports differ</strong>. 2 reports disagree.<ul>${li("Yes")}</ul>`)))).toContain("fact-provenance");
    expect(rules(audit(dd(`<strong>Reports differ</strong>. 2 reports disagree.<ul>${li("Yes")}<li>No. Source: S.</li></ul>`)))).toContain("fact-provenance");
    expect(rules(audit(dd("<strong>Reports differ</strong>. No list.")))).toContain("fact-provenance");
  });

  it("plan-status: statuses are known, matches show a source, unknown shows none", () => {
    const dd = (inner: string): string => `<dl class="plan"><dt>Door</dt><dd>${inner}</dd></dl>`;
    expect(audit(dd("<strong>Unknown</strong>. No record."))).toEqual([]);
    expect(audit(dd("<strong>Matches</strong>. Answer: Yes. Source: S. Licence: CC0-1.0. Recorded on 2026-01-01 (1 month ago)."))).toEqual([]);
    expect(rules(audit(dd("<strong>Probably fine</strong>. No record.")))).toContain("plan-status");
    expect(rules(audit(dd("<strong>Matches</strong>. Looks good.")))).toContain("plan-status");
    expect(rules(audit(dd("<strong>Unknown</strong>. No record. Source: S.")))).toContain("plan-status");
  });

  describe("compare-table", () => {
    const cell = '<td><strong>Unknown</strong>. No record.</td>';
    const table = (o: { caption?: boolean; colScope?: string; rowScope?: string; cells?: number; extra?: string; wrap?: string } = {}): string =>
      (o.wrap ?? '<div class="table-wrap" role="region" aria-labelledby="c" tabindex="0">') +
      `<table class="compare">${o.caption === false ? "" : '<caption id="c">Each cell shows what the notes say.</caption>'}` +
      `<thead><tr><th scope="${o.colScope ?? "col"}">Detail</th><th scope="${o.colScope ?? "col"}">A</th><th scope="${o.colScope ?? "col"}">B</th></tr></thead>` +
      `<tbody><tr><th scope="${o.rowScope ?? "row"}">Elevator${o.extra ?? ""}</th>${cell.repeat(o.cells ?? 2)}</tr></tbody></table></div>`;

    it("accepts a complete table", () => {
      expect(audit(table())).toEqual([]);
    });

    it("rejects a table with no caption", () => {
      expect(rules(audit(table({ caption: false })))).toContain("compare-table");
    });

    it("rejects headers without scope", () => {
      expect(rules(audit(table({ colScope: "row" })))).toContain("compare-table");
      expect(rules(audit(table({ rowScope: "col" })))).toContain("compare-table");
    });

    it("rejects a row with the wrong number of cells", () => {
      expect(rules(audit(table({ cells: 1 })))).toContain("compare-table");
    });

    it("rejects a scroll region that cannot be focused or has no label", () => {
      expect(rules(audit(table({ wrap: '<div class="table-wrap" role="region" aria-labelledby="c">' })))).toContain("compare-table");
      expect(rules(audit(table({ wrap: '<div class="table-wrap" role="region" tabindex="0">' })))).toContain("compare-table");
    });

    it("rejects ranking or scoring words in the table body", () => {
      expect(rules(audit(table({ extra: " (best choice)" })))).toContain("compare-table");
      expect(rules(audit(table({ extra: " score" })))).toContain("compare-table");
      expect(rules(audit(table({ extra: " (meilleur choix)" }), "fr"))).toContain("compare-table");
    });

    it("applies the source rule to table cells too", () => {
      const bad = table().replace(cell, "<td><strong>Yes</strong>. Looks fine.</td>");
      expect(rules(audit(bad))).toContain("fact-provenance");
    });
  });

  it("french-typography: checks text and attributes, skips user content", () => {
    expect(rules(audit(`<p>Bonjour: vous</p>`, "fr"))).toContain("french-typography");
    expect(rules(audit(`<p>L'aide</p>`, "fr"))).toContain("french-typography");
    expect(rules(audit(`<button type="button" aria-label="Quoi?" ${BTN}>Quoi?</button>`, "fr"))).toContain("french-typography");
    expect(audit(`<p>Bonjour\u00A0: vous</p>`, "fr")).toEqual([]);
    expect(audit(`<p><span data-user-content>L'aide: oui</span></p>`, "fr")).toEqual([]);
    expect(audit(`<p>Bonjour: vous</p>`, "en")).toEqual([]);
  });

  it("french-typography: follows the nearest lang attribute, so a two-language block is checked by each language's rules", () => {
    expect(audit(`<section lang="en"><p>Could you tell me: is it open?</p></section>`, "fr")).toEqual([]);
    expect(rules(audit(`<section lang="fr"><p>Pourriez-vous me dire: oui</p></section>`, "en"))).toContain("french-typography");
    expect(rules(audit(`<section lang="en"><p lang="fr-CA">Quoi?</p></section>`, "en"))).toContain("french-typography");
    expect(audit(`<section lang="fr"><p><span data-user-content lang="en">Help: please</span></p></section>`, "fr")).toEqual([]);
  });

  it("banned-wording: text and attributes, in both languages, skips user content", () => {
    expect(rules(audit(`<p>This place is verified.</p>`))).toContain("banned-wording");
    expect(rules(audit(`<p>Mis à jour en temps réel</p>`, "fr"))).toContain("banned-wording");
    expect(rules(audit(`<button type="button" aria-label="Guarantee" ${BTN}>Guarantee</button>`))).toContain("banned-wording");
    expect(rules(audit(`<p>Our partnership</p>`))).toContain("banned-wording");
    expect(audit(`<p><span data-user-content>The owner says it is verified</span></p>`)).toEqual([]);
    expect(audit(`<textarea data-audit-skip aria-label="Notes" ${FIELD}>verified</textarea>`)).toEqual([]);
  });
});

describe("auditCss", () => {
  it("passes the shipped stylesheet", () => {
    expect(auditCss(buildCss())).toEqual([]);
  });

  const good = buildCss();
  const without = (needle: string): string => good.split(needle).join("");

  it("fails when buttons lose their 44px size", () => {
    expect(rules(auditCss("button{padding:1rem}"))).toContain("css-target-size");
  });

  it("fails when the focus ring is removed or thinned", () => {
    expect(rules(auditCss(good.replace(/outline:3px/g, "outline:1px")))).toContain("css-focus");
  });

  it("fails on removed outlines, fixed heights, clipping and px font sizes", () => {
    expect(rules(auditCss(`${good}\na:focus{outline:none}`))).toContain("css-outline");
    expect(rules(auditCss(`${good}\n.box{height:40px}`))).toContain("css-fixed-height");
    expect(rules(auditCss(`${good}\n.box{overflow:hidden}`))).toContain("css-clipping");
    expect(rules(auditCss(`${good}\nbody{font-size:12px}`))).toContain("css-font-px");
  });

  it("fails without reduced-motion or forced-colours support", () => {
    expect(rules(auditCss(without("prefers-reduced-motion: reduce")))).toContain("css-motion");
    expect(rules(auditCss(without("forced-colors: active")))).toContain("css-forced-colors");
  });
});

describe("auditCopy", () => {
  it("passes every string from the shell, the first-run flow and the help paths", () => {
    const all = collectAllCopy();
    expect(all.length).toBeGreaterThan(100);
    expect(auditCopy(all).map((v) => `${v.rule}: ${v.detail}`)).toEqual([]);
  });

  it("includes strings from all three lanes", () => {
    const names = collectAllCopy().map(([p]) => p);
    expect(names.some((n) => n.startsWith("COPY."))).toBe(true);
    expect(names.some((n) => n.startsWith("SWITCH_COPY."))).toBe(true);
    expect(names.some((n) => n.startsWith("paths."))).toBe(true);
  });

  const bad = (en: string, fr: string): PairList => [["x", { en, fr }]];

  it("fails on missing text, identical text, banned wording and forbidden names", () => {
    expect(rules(auditCopy(bad("", "Texte")))).toContain("copy-missing");
    expect(rules(auditCopy(bad("Same words here", "Same words here")))).toContain("copy-same");
    expect(rules(auditCopy(bad("Data is verified", "Données à jour")))).toContain("banned-wording");
    expect(rules(auditCopy(bad("Up to date", "Données vérifiées")))).toContain("banned-wording");
    expect(rules(auditCopy(bad("We guarantee it", "Texte")))).toContain("banned-wording");
    expect(rules(auditCopy(bad("Powered by AI", "Texte")))).toContain("copy-forbidden");
  });

  it("fails on French typography", () => {
    expect(rules(auditCopy(bad("Hello", "Salut: ami")))).toContain("french-typography");
    expect(rules(auditCopy(bad("Hello", "L'ami")))).toContain("french-typography");
  });
});
