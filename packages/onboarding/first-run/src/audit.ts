import {
  COPY as SWITCH_COPY,
  FORBIDDEN_TERMS,
  frenchTypographyIssues,
  type Locale,
} from "../../switch-first/src/index";
import { ONBOARDING_PATHS, allStrings } from "../../src/paths";
import { allPairs, type Pair } from "./copy";
import { glossaryStrings } from "./glossary";
import { ARTICLES, articleStrings } from "./articles";
import { chooserStrings } from "./chooser";
import { KEY_HELP } from "./keys";
import { plainIssues } from "./plain";
import { findBanned, findScannerClaim } from "./wording";

/**
 * Audits that fail when something is wrong. They run in three places: in the
 * tests over every rendered view in both languages (npm run ci), in the
 * browser when the page is opened with ?audit (shell option onAudit), and the
 * copy and CSS audits over the strings and stylesheet themselves.
 */
export type AuditRule =
  | "accessible-name"
  | "label-in-name"
  | "vague-link-text"
  | "target-size"
  | "duplicate-id"
  | "heading-order"
  | "single-h1"
  | "landmarks"
  | "lang-switch"
  | "page-lang"
  | "positive-tabindex"
  | "radio-group"
  | "invalid-description"
  | "french-typography"
  | "banned-wording"
  | "fact-provenance"
  | "plan-status"
  | "compare-table"
  | "scanner-claim"
  | "plain-language"
  | "duplicate-control-name"
  | "table-structure"
  | "broken-anchor"
  | "skip-link"
  | "css-target-size"
  | "css-focus"
  | "css-outline"
  | "css-fixed-height"
  | "css-clipping"
  | "css-font-px"
  | "css-motion"
  | "css-forced-colors"
  | "copy-missing"
  | "copy-same"
  | "copy-forbidden";

export interface Violation {
  readonly rule: AuditRule;
  readonly detail: string;
}

/** Names that tell a person nothing on their own. Compared in lower case, without final punctuation. */
export const VAGUE_NAMES: ReadonlySet<string> = new Set([
  "click here", "tap here", "press here", "here", "more", "read more", "learn more", "link", "this", "details",
  "cliquez ici", "touchez ici", "appuyez ici", "ici", "plus", "en savoir plus", "lire la suite", "lien", "ceci", "détails",
]);

const norm = (s: string | null | undefined): string => (s ?? "").replace(/[ \t\r\n\f]+/g, " ").replace(/^ | $/g, "");
const describe = (el: Element): string =>
  `<${el.tagName.toLowerCase()}${el.id ? ` id="${el.id}"` : ""}> "${norm(el.textContent).slice(0, 40)}"`;

const INTERACTIVE = 'button, a[href], input:not([type="hidden"]), select, textarea, summary';

/** Finds an element by id in the tree that holds `el`, which also works for a tree that is not attached to the page. */
function byId(el: Element, id: string): Element | null {
  const root = el.getRootNode() as Document | DocumentFragment | Element;
  const sel = `[id="${id.replace(/["\\]/g, "")}"]`;
  return root.querySelector?.(sel) ?? (root instanceof Element && root.matches(sel) ? root : null);
}

export function accessibleName(el: Element): string {
  const label = el.getAttribute("aria-label");
  if (label && norm(label)) return norm(label);
  const by = el.getAttribute("aria-labelledby");
  if (by) {
    const text = by
      .split(/\s+/)
      .map((id) => norm(byId(el, id)?.textContent))
      .join(" ")
      .trim();
    if (text) return text;
  }
  if (el.matches("input, select, textarea")) {
    const id = el.getAttribute("id");
    const scope = el.getRootNode() as Document | DocumentFragment | Element;
    const forLabel = id ? scope.querySelector?.(`label[for="${id.replace(/["\\]/g, "")}"]`) ?? null : null;
    const wrap = el.closest("label");
    const text = norm((forLabel ?? wrap)?.textContent);
    if (text) return text;
    return "";
  }
  return norm(el.textContent);
}

function minPx(style: string | null, prop: "min-width" | "min-height"): number {
  const m = new RegExp(`${prop}\\s*:\\s*(\\d+(?:\\.\\d+)?)px`).exec(style ?? "");
  return m?.[1] ? Number(m[1]) : 0;
}

const MIN = 44;

function textNodes(root: Element): Array<{ text: string; parent: Element }> {
  const out: Array<{ text: string; parent: Element }> = [];
  const walker = root.ownerDocument.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const parent = n.parentElement;
    const text = norm(n.nodeValue);
    if (!parent || text === "") continue;
    if (parent.closest("script, style, textarea, [data-audit-skip], [data-user-content]")) continue;
    out.push({ text, parent });
  }
  return out;
}

function attributeTexts(root: Element): Array<{ text: string; el: Element }> {
  const out: Array<{ text: string; el: Element }> = [];
  for (const el of Array.from(root.querySelectorAll("[aria-label], [title], [placeholder], [alt]"))) {
    if (el.closest("[data-audit-skip], [data-user-content]")) continue;
    for (const a of ["aria-label", "title", "placeholder", "alt"]) {
      const v = el.getAttribute(a);
      if (v && norm(v)) out.push({ text: norm(v), el });
    }
  }
  return out;
}

export function auditDom(root: HTMLElement, opts: { locale: Locale }): Violation[] {
  const v: Violation[] = [];
  const add = (rule: AuditRule, detail: string): void => void v.push({ rule, detail });
  const doc = root.ownerDocument;

  // Page language (WCAG 3.1.1).
  if (doc.documentElement.lang !== opts.locale) {
    add("page-lang", `html lang is "${doc.documentElement.lang}", expected "${opts.locale}"`);
  }

  // Names (4.1.2) and label in name (2.5.3).
  for (const el of Array.from(root.querySelectorAll(INTERACTIVE))) {
    const name = accessibleName(el);
    if (name === "") add("accessible-name", `no accessible name: ${describe(el)}`);
    const aria = el.getAttribute("aria-label");
    const visible = norm(el.textContent);
    if (aria && visible && el.matches("button, a[href], summary") && !norm(aria).toLowerCase().includes(visible.toLowerCase())) {
      add("label-in-name", `aria-label does not contain visible text: ${describe(el)}`);
    }
  }

  // Target size (2.5.8 and the 44px rule). Inline styles are what jsdom can read.
  for (const el of Array.from(root.querySelectorAll("button, label.choice, a.linkbtn"))) {
    const style = el.getAttribute("style");
    if (minPx(style, "min-width") < MIN || minPx(style, "min-height") < MIN) {
      add("target-size", `under 44px: ${describe(el)}`);
    }
  }
  for (const el of Array.from(root.querySelectorAll('input[type="text"], input[type="search"], select, textarea'))) {
    if (minPx(el.getAttribute("style"), "min-height") < MIN) add("target-size", `field under 44px: ${describe(el)}`);
  }
  for (const el of Array.from(root.querySelectorAll('input[type="radio"]'))) {
    const label = el.closest("label.choice");
    if (!label || minPx(label.getAttribute("style"), "min-height") < MIN) {
      add("target-size", `radio without a 44px label: ${describe(el)}`);
    }
  }

  // Structure.
  const seen = new Set<string>();
  for (const el of Array.from(root.querySelectorAll("[id]"))) {
    if (seen.has(el.id)) add("duplicate-id", `duplicate id "${el.id}"`);
    seen.add(el.id);
  }
  let prev = 0;
  for (const h of Array.from(root.querySelectorAll("h1, h2, h3, h4, h5, h6"))) {
    const level = Number(h.tagName.slice(1));
    if (prev !== 0 && level > prev + 1) add("heading-order", `h${prev} followed by h${level}: ${describe(h)}`);
    prev = level;
  }
  if (root.querySelectorAll("h1").length > 1) add("single-h1", "more than one h1");
  if (root.querySelectorAll("main").length !== 1) add("landmarks", "expected exactly one main");
  const navs = Array.from(root.querySelectorAll("nav"));
  if (navs.length > 1) {
    for (const n of navs) {
      if (!n.getAttribute("aria-label") && !n.getAttribute("aria-labelledby")) add("landmarks", "nav without a label");
    }
  }
  for (const el of Array.from(root.querySelectorAll("[tabindex]"))) {
    if (Number(el.getAttribute("tabindex")) > 0) add("positive-tabindex", describe(el));
  }

  // Skip link (2.4.1).
  const skip = root.querySelector('a.skip-link[href^="#"]');
  const target = skip ? doc.getElementById((skip.getAttribute("href") ?? "").slice(1)) : null;
  if (!skip || !target) add("skip-link", "missing skip link or its target");
  else if (root.querySelector(INTERACTIVE) !== skip) add("skip-link", "skip link is not the first control");

  // Language of parts (3.1.2): the language switch is written in its own language.
  for (const b of Array.from(root.querySelectorAll('[data-action="set-locale"]'))) {
    const lang = b.getAttribute("lang");
    if (!lang || lang === opts.locale) add("lang-switch", `language switch needs lang of the other language: ${describe(b)}`);
  }

  // Forms (1.3.1, 3.3.1).
  for (const r of Array.from(root.querySelectorAll('input[type="radio"]'))) {
    const fs = r.closest("fieldset");
    if (!fs || norm(fs.querySelector("legend")?.textContent) === "") add("radio-group", `radio without a fieldset legend: ${describe(r)}`);
  }
  for (const el of Array.from(root.querySelectorAll('[aria-invalid="true"]'))) {
    const ids = (el.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
    const ok = ids.some((id) => norm(doc.getElementById(id)?.textContent) !== "");
    if (!ok) add("invalid-description", `invalid field has no error text: ${describe(el)}`);
  }

  // Place details always show where they came from, and unknown shows no source.
  // The same rule applies in the list of details and in the comparison table.
  for (const dd of Array.from(root.querySelectorAll("dl.facts dd, table.compare td"))) {
    const value = norm(dd.querySelector("strong")?.textContent);
    const text = norm(dd.textContent);
    if (["Yes", "No", "Oui", "Non"].includes(value)) {
      const ok = /Source/.test(text) && /Licen[cs]e/.test(text) && /(Recorded on|Saisi le) \d{4}-\d{2}-\d{2}/.test(text);
      if (!ok) add("fact-provenance", `${value} without source, licence and date: ${text.slice(0, 60)}`);
    } else if (["Unknown", "Inconnu"].includes(value)) {
      if (/Source|Licen[cs]e/.test(text)) add("fact-provenance", `unknown shows a source: ${text.slice(0, 60)}`);
      if (!/(No record|Aucune donnée)/.test(text)) add("fact-provenance", `unknown without "no record": ${text.slice(0, 60)}`);
    } else if (["Reports differ", "Rapports divergents"].includes(value)) {
      // Differing reports are listed side by side. Each one carries its own source, licence and date.
      const items = Array.from(dd.querySelectorAll("li"));
      if (items.length < 2) add("fact-provenance", `differing reports list fewer than two reports: ${text.slice(0, 60)}`);
      for (const li of items) {
        const lt = norm(li.textContent);
        if (!(/Source/.test(lt) && /Licen[cs]e/.test(lt) && /(Recorded on|Saisi le) \d{4}-\d{2}-\d{2}/.test(lt))) {
          add("fact-provenance", `a differing report lacks source, licence or date: ${lt.slice(0, 60)}`);
        }
      }
    } else {
      add("fact-provenance", `detail value is not Yes, No, Unknown or Reports differ: "${value}"`);
    }
  }

  // Comparison tables: a caption, labelled columns and rows, and no ranking words or scores.
  for (const table of Array.from(root.querySelectorAll("table.compare"))) {
    if (norm(table.querySelector("caption")?.textContent) === "") add("compare-table", "comparison table without a caption");
    const heads = Array.from(table.querySelectorAll("thead th"));
    if (heads.length < 3 || heads.some((h) => h.getAttribute("scope") !== "col")) add("compare-table", "column headers need scope=col and two or more places");
    for (const row of Array.from(table.querySelectorAll("tbody tr"))) {
      const th = row.querySelector("th");
      if (!th || th.getAttribute("scope") !== "row") add("compare-table", "row without a row header");
      if (row.querySelectorAll("td").length !== heads.length - 1) add("compare-table", "row has a different number of cells than the header");
    }
    const wrap = table.closest(".table-wrap");
    if (wrap && (wrap.getAttribute("tabindex") !== "0" || norm(wrap.getAttribute("aria-labelledby")) === "")) {
      add("compare-table", "scrollable table region must be focusable and labelled");
    }
    if (/\b(best|worst|rank(?:ed|ing)?|score[ds]?|winner|top pick|meilleur|pire|classement|gagnant)\b/i.test(norm(Array.from(table.querySelectorAll("thead th, tbody th, tbody td")).map((x) => x.textContent).join(" ")))) {
      add("compare-table", "comparison table must not rank or score places");
    }
  }

  // Visit plan items: a status, and only recorded answers show a source.
  const PLAN_OK = ["Matches", "Does not match", "Unknown", "Reports differ", "Correspond", "Ne correspond pas", "Inconnu", "Rapports divergents"];
  for (const dd of Array.from(root.querySelectorAll("dl.plan dd"))) {
    const value = norm(dd.querySelector("strong")?.textContent);
    const text = norm(dd.textContent);
    if (!PLAN_OK.includes(value)) add("plan-status", `unexpected plan status: "${value}"`);
    else if (["Unknown", "Inconnu"].includes(value) && /Source|Licen[cs]e/.test(text)) add("plan-status", `unknown plan item shows a source: ${text.slice(0, 60)}`);
    else if (["Matches", "Does not match", "Correspond", "Ne correspond pas"].includes(value) && !/Source/.test(text)) {
      add("plan-status", `plan item without a source: ${text.slice(0, 60)}`);
    }
  }

  // Copy as rendered: French typography and wording.
  const texts: string[] = [
    ...textNodes(root).map((t) => t.text),
    ...attributeTexts(root).map((t) => t.text),
  ];
  for (const text of texts) {
    if (opts.locale === "fr") {
      for (const issue of frenchTypographyIssues(text)) add("french-typography", `${issue}: "${text.slice(0, 50)}"`);
    }
    const bad = findBanned(text);
    if (bad) add("banned-wording", `"${bad}" in "${text.slice(0, 50)}"`);
    const claim = findScannerClaim(text);
    if (claim) add("scanner-claim", `"${claim}" in "${text.slice(0, 50)}"`);
  }

  // Help screens: no two buttons or links share a visible name, so a spoken or pointed name picks one control.
  for (const zone of Array.from(root.querySelectorAll("[data-names-unique]"))) {
    const seen = new Map<string, number>();
    for (const el of Array.from(zone.querySelectorAll("button, a[href]"))) {
      const name = norm(el.textContent).toLowerCase();
      if (name !== "") seen.set(name, (seen.get(name) ?? 0) + 1);
    }
    for (const [name, n] of seen) if (n > 1) add("duplicate-control-name", `${n} controls are named "${name}"`);
  }

  // A link or button must say what it does. "Click here" and "More" mean nothing out of context,
  // for example in a list of links read aloud by a screen reader or spoken to voice control.
  for (const el of Array.from(root.querySelectorAll("a[href], button"))) {
    const name = norm(el.getAttribute("aria-label") ?? el.textContent).toLowerCase().replace(/[\s.…:!?\u202F\u00A0]+$/g, "");
    if (VAGUE_NAMES.has(name)) add("vague-link-text", `"${name}" says nothing about where it goes: ${describe(el)}`);
  }

  // Tables: a caption, scoped headers and the same number of cells in every row.
  for (const table of Array.from(root.querySelectorAll("table"))) {
    if (norm(table.querySelector("caption")?.textContent) === "") add("table-structure", "table without a caption");
    for (const th of Array.from(table.querySelectorAll("th"))) {
      const scope = th.getAttribute("scope");
      if (scope !== "col" && scope !== "row") add("table-structure", `header without scope: "${norm(th.textContent).slice(0, 30)}"`);
    }
    const counts = Array.from(table.querySelectorAll("tr")).map((r) => r.querySelectorAll("th, td").length);
    if (new Set(counts).size > 1) add("table-structure", `rows have different numbers of cells: ${counts.join(", ")}`);
  }

  // In-page links must point at something on the page.
  for (const a of Array.from(root.querySelectorAll('a[href^="#"]'))) {
    const href = a.getAttribute("href") ?? "";
    if (href === "#" || href.startsWith("#/")) continue;
    if (!doc.getElementById(href.slice(1))) add("broken-anchor", `${href} has no target`);
  }
  return v;
}

// ---------------------------------------------------------------- CSS

function rules(css: string): Array<{ selector: string; body: string }> {
  const out: Array<{ selector: string; body: string }> = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  for (let m = re.exec(css); m; m = re.exec(css)) {
    out.push({ selector: (m[1] ?? "").trim(), body: m[2] ?? "" });
  }
  return out;
}

export function auditCss(css: string): Violation[] {
  const v: Violation[] = [];
  const add = (rule: AuditRule, detail: string): void => void v.push({ rule, detail });
  const rs = rules(css);

  const buttonRule = rs.find((r) => /(^|,)\s*button\s*(,|$)/.test(r.selector) && /min-height:\s*44px/.test(r.body) && /min-width:\s*44px/.test(r.body));
  if (!buttonRule) add("css-target-size", "no rule gives buttons min-width and min-height of 44px");

  const focus = rs.find((r) => r.selector.includes(":focus-visible") && /outline:\s*([3-9]|\d{2,})px\s+solid/.test(r.body));
  if (!focus) add("css-focus", "no :focus-visible rule with an outline of at least 3px");

  for (const r of rs) {
    if (/outline:\s*(none|0)\b/.test(r.body) && !/h2:focus|:focus:not\(:focus-visible\)/.test(r.selector)) {
      add("css-outline", `outline removed in "${r.selector.slice(0, 50)}"`);
    }
    if (/(^|[;\s])height:\s*\d/.test(r.body) && !r.selector.includes(".sr-only")) {
      add("css-fixed-height", `fixed height in "${r.selector.slice(0, 50)}"`);
    }
    if (/overflow:\s*hidden/.test(r.body) && !r.selector.includes(".sr-only")) {
      add("css-clipping", `clipped overflow in "${r.selector.slice(0, 50)}"`);
    }
    if (/font-size:\s*\d+(\.\d+)?px/.test(r.body)) add("css-font-px", `font size in px in "${r.selector.slice(0, 50)}"`);
  }
  if (!css.includes("prefers-reduced-motion: reduce")) add("css-motion", "no reduced-motion rule");
  if (!css.includes("forced-colors: active")) add("css-forced-colors", "no forced-colors rule");
  return v;
}

// ---------------------------------------------------------------- copy

export type PairList = Array<[string, Pair]>;

function pairsFrom(prefix: string, value: unknown, out: PairList): void {
  if (!value || typeof value !== "object") return;
  const o = value as Record<string, unknown>;
  if (typeof o["en"] === "string" && typeof o["fr"] === "string") {
    out.push([prefix, { en: o["en"], fr: o["fr"] }]);
    return;
  }
  for (const [k, c] of Object.entries(o)) pairsFrom(`${prefix}.${k}`, c, out);
}

/** Every EN/FR string from the three lanes: shell, first-run flow, help paths. */
export function collectAllCopy(): PairList {
  const out: PairList = [...allPairs()];
  pairsFrom("SWITCH_COPY", SWITCH_COPY, out);
  for (const p of ONBOARDING_PATHS) {
    for (const [label, l] of allStrings(p)) out.push([`paths.${label}`, l]);
  }
  for (const a of ARTICLES) out.push(...articleStrings(a));
  out.push(...chooserStrings());
  out.push(...glossaryStrings());
  for (const k of KEY_HELP) out.push([`articles.keys.${k.id}.keys`, k.keys], [`articles.keys.${k.id}.action`, k.action]);
  return out;
}

export function auditCopy(pairs: PairList): Violation[] {
  const v: Violation[] = [];
  const add = (rule: AuditRule, detail: string): void => void v.push({ rule, detail });
  for (const [path, p] of pairs) {
    if (p.en.trim() === "" || p.fr.trim() === "") add("copy-missing", path);
    // A pair that is identical in both languages is only fine for names and numbers.
    if (p.en === p.fr && /[a-z]{4,}/i.test(p.en) && !/^(Notes|Normal|Articles|Source|Licence|Focus)$/.test(p.en)) add("copy-same", `${path}: "${p.en}"`);
    for (const issue of frenchTypographyIssues(p.fr)) add("french-typography", `${path}: ${issue}`);
    for (const lang of ["en", "fr"] as const) {
      const bad = findBanned(p[lang]);
      if (bad) add("banned-wording", `${path} (${lang}): "${bad}"`);
      const claim = findScannerClaim(p[lang]);
      if (claim) add("scanner-claim", `${path} (${lang}): "${claim}"`);
      if (/^(articles|paths|chooser|glossary)\./.test(path)) {
        for (const issue of plainIssues(p[lang], lang)) add("plain-language", `${path} (${lang}): ${issue.rule} ${issue.detail}`);
      }
      for (const re of FORBIDDEN_TERMS) if (re.test(p[lang])) add("copy-forbidden", `${path} (${lang}): ${re}`);
    }
  }
  return v;
}
