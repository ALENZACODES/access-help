import type { Locale } from "../../switch-first/src/index";
import { accessibleName } from "./audit";

/**
 * "Names on this screen". A person who controls a device by voice, or who
 * points at a list of names, needs every control to have a name that is
 * unique and that matches what is written on it. This module reads a rendered
 * screen and lists those names, and says which ones are repeated, which do
 * not contain their visible text and which are long.
 *
 * The App does not listen. Voice control belongs to the person's device; this
 * page only shows the names the page gives to its controls.
 */
export type NameSection = "setup" | "notes" | "help" | "display";
export const NAME_SECTIONS: readonly NameSection[] = ["setup", "notes", "help", "display"];
export const DEFAULT_NAME_SECTION: NameSection = "notes";

export type ControlKind = "button" | "link" | "field" | "choice";

export interface ControlInfo {
  /** What the control is called to assistive technology. */
  readonly name: string;
  readonly kind: ControlKind;
  /** The words written on or next to the control, which may be empty. */
  readonly visible: string;
  /** Another control on the same screen has the same name. */
  readonly duplicate: boolean;
  /** The name does not contain the visible words (WCAG 2.5.3). */
  readonly mismatch: boolean;
  /** More words than a person can be expected to say. */
  readonly long: boolean;
}

export const LONG_NAME_WORDS = 8;
const CONTROLS = 'button, a[href], input:not([type="hidden"]), select, textarea, summary';

export function isNameSection(value: string | undefined): value is NameSection {
  return value !== undefined && (NAME_SECTIONS as readonly string[]).includes(value);
}

const squash = (s: string | null | undefined): string => (s ?? "").replace(/[\s\u00A0\u202F]+/g, " ").trim();

/** Lower case, no accents-as-punctuation noise, no punctuation: the form two names are compared in. */
export function matchForm(s: string): string {
  return squash(s)
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N} ]+/gu, " ")
    .replace(/ +/g, " ")
    .trim();
}

/** True when everything written on a control is also in its name, as voice control expects. */
export function labelInName(visible: string, name: string): boolean {
  const v = matchForm(visible);
  if (v === "") return true;
  return matchForm(name).includes(v);
}

export function controlKind(el: Element): ControlKind {
  if (el.matches("a[href]")) return "link";
  if (el.matches('input[type="checkbox"], input[type="radio"]')) return "choice";
  if (el.matches("input, select, textarea")) return "field";
  return "button";
}

/** The words a sighted person reads for this control. */
export function visibleLabel(el: Element): string {
  if (el.matches("input, select, textarea")) {
    const id = el.getAttribute("id");
    const scope = el.getRootNode() as Document | DocumentFragment | Element;
    const forLabel = id ? scope.querySelector?.(`label[for="${id.replace(/["\\]/g, "")}"]`) ?? null : null;
    return squash((forLabel ?? el.closest("label"))?.textContent);
  }
  return squash(el.textContent);
}

export function wordCount(s: string): number {
  const t = squash(s);
  return t === "" ? 0 : t.split(" ").length;
}

/** Lists the named controls in reading order. Controls with no name at all are left out; the audit reports those. */
export function listControls(root: ParentNode): ControlInfo[] {
  const raw = Array.from(root.querySelectorAll(CONTROLS))
    .filter((el) => !el.closest("[hidden], [data-audit-skip]"))
    .map((el) => ({ el, name: squash(accessibleName(el)) }))
    .filter((x) => x.name !== "");
  const counts = new Map<string, number>();
  for (const { name, el } of raw) {
    const key = `${controlKind(el) === "link" || controlKind(el) === "button" ? "act" : "inp"}:${matchForm(name)}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return raw.map(({ el, name }) => {
    const kind = controlKind(el);
    const visible = visibleLabel(el);
    const key = `${kind === "link" || kind === "button" ? "act" : "inp"}:${matchForm(name)}`;
    return {
      name,
      kind,
      visible,
      duplicate: (counts.get(key) ?? 0) > 1,
      mismatch: !labelInName(visible, name),
      long: wordCount(name) > LONG_NAME_WORDS,
    };
  });
}

export interface NameSummary {
  readonly total: number;
  readonly duplicates: number;
  readonly mismatches: number;
  readonly long: number;
  /** True when nothing needs a second look. */
  readonly clean: boolean;
}

export function summarise(list: readonly ControlInfo[]): NameSummary {
  const duplicates = list.filter((c) => c.duplicate).length;
  const mismatches = list.filter((c) => c.mismatch).length;
  const long = list.filter((c) => c.long).length;
  return { total: list.length, duplicates, mismatches, long, clean: duplicates + mismatches + long === 0 };
}

/** Distinct names, in first-seen order, for the text card. */
export function distinctNames(list: readonly ControlInfo[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of list) {
    const k = matchForm(c.name);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(c.name);
    }
  }
  return out;
}

const KIND_WORD: Record<Locale, Record<ControlKind, string>> = {
  en: { button: "button", link: "link", field: "field", choice: "choice" },
  fr: { button: "bouton", link: "lien", field: "champ", choice: "choix" },
};

export function kindWord(kind: ControlKind, locale: Locale): string {
  return KIND_WORD[locale][kind];
}

/**
 * A plain text card of the names on one screen. French keeps a no-break space
 * before the colon. Lines are short so the text prints and reads aloud well.
 */
export function namesToText(title: string, list: readonly ControlInfo[], locale: Locale, intro: string): string {
  const colon = locale === "fr" ? "\u00A0:" : ":";
  const lines = [title, "=".repeat(Math.min(title.length, 60)), "", intro, ""];
  list.forEach((c, i) => {
    const flags = [c.duplicate ? (locale === "fr" ? "nom répété" : "name repeated") : "", c.mismatch ? (locale === "fr" ? "nom différent du texte" : "name differs from text") : ""].filter(Boolean);
    lines.push(`${i + 1}. ${c.name} (${kindWord(c.kind, locale)})${flags.length ? `${colon} ${flags.join(", ")}` : ""}`);
  });
  return lines.join("\n") + "\n";
}

export function namesFilename(section: NameSection, locale: Locale): string {
  return `names-${section}-${locale}.txt`;
}
