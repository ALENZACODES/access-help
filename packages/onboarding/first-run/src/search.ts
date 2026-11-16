import { ONBOARDING_PATHS, localizePath } from "../../src/paths";
import type { Locale } from "../../switch-first/src/index";
import { ARTICLES } from "./articles";
import { GLOSSARY } from "./glossary";
import { COPY, t } from "./copy";
import { foldText } from "./filter";

/**
 * Search over help articles, short paths and the place-card guide, in the
 * language on screen. It runs on this device, so it works offline. Words are
 * matched without case or accents, every word must be found, and results are
 * ordered by where the words were found (title first), then by title.
 */
export interface HelpHit {
  readonly kind: "article" | "path" | "card" | "practice" | "names" | "word" | "device" | "steps";
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly score: number;
}

/** On equal scores, articles come before short paths, and paths before the card guide. */
const KIND_ORDER: Record<HelpHit["kind"], number> = { article: 0, path: 1, card: 2, practice: 3, names: 4, word: 5, device: 6, steps: 7 };

export const MIN_QUERY = 2;
export const MAX_QUERY = 80;

export function queryWords(query: string): string[] {
  const q = foldText(query.slice(0, MAX_QUERY)).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return q === "" ? [] : q.split(" ").filter((w) => w.length > 0);
}

interface Doc {
  readonly kind: HelpHit["kind"];
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  /** Text with a weight: titles count most, then summaries and headings, then body text. */
  readonly parts: ReadonlyArray<readonly [string, number]>;
}

function docs(locale: Locale): Doc[] {
  const out: Doc[] = [];
  for (const a of ARTICLES) {
    const parts: Array<readonly [string, number]> = [[a.title[locale], 4], [a.summary[locale], 2]];
    for (const s of a.sections) {
      parts.push([s.heading[locale], 2]);
      for (const p of s.paragraphs ?? []) parts.push([p[locale], 1]);
      for (const p of s.steps ?? []) parts.push([p[locale], 1]);
    }
    out.push({ kind: "article", id: a.id, title: a.title[locale], summary: a.summary[locale], parts });
  }
  for (const p of ONBOARDING_PATHS) {
    const lp = localizePath(p, locale);
    const parts: Array<readonly [string, number]> = [[lp.title, 4], [lp.summary, 2]];
    for (const s of lp.steps) parts.push([s.title, 2], [s.body, 1]);
    out.push({ kind: "path", id: p.id, title: lp.title, summary: lp.summary, parts });
  }
  const card = [t(COPY.card.title, locale), t(COPY.card.summary, locale)] as const;
  out.push({
    kind: "card",
    id: "card",
    title: card[0],
    summary: card[1],
    parts: [[card[0], 4], [card[1], 2], [t(COPY.card.explain, locale), 1]],
  });
  const practice = [t(COPY.practice.title, locale), t(COPY.practice.summary, locale)] as const;
  out.push({
    kind: "practice",
    id: "practice",
    title: practice[0],
    summary: practice[1],
    parts: [[practice[0], 4], [practice[1], 2], [t(COPY.practice.intro, locale), 1], [t(COPY.practice.note, locale), 1]],
  });
  for (const w of GLOSSARY) {
    out.push({
      kind: "word",
      id: w.id,
      title: w.term[locale],
      summary: w.meaning[locale],
      parts: [[w.term[locale], 4], [w.also[locale], 3], [w.meaning[locale], 1]],
    });
  }
  const words = [t(COPY.words.title, locale), t(COPY.words.summary, locale)] as const;
  out.push({ kind: "word", id: "all", title: words[0], summary: words[1], parts: [[words[0], 4], [words[1], 2], [t(COPY.words.intro, locale), 1]] });
  const names = [t(COPY.names.title, locale), t(COPY.names.summary, locale)] as const;
  out.push({
    kind: "names",
    id: "names",
    title: names[0],
    summary: names[1],
    parts: [[names[0], 4], [names[1], 2], [t(COPY.names.intro, locale), 1]],
  });
  const device = [t(COPY.device.title, locale), t(COPY.device.summary, locale)] as const;
  out.push({
    kind: "device",
    id: "device",
    title: device[0],
    summary: device[1],
    parts: [[device[0], 4], [device[1], 2], [t(COPY.device.intro, locale), 1]],
  });
  const steps = [t(COPY.steps.title, locale), t(COPY.steps.summary, locale)] as const;
  out.push({
    kind: "steps",
    id: "steps",
    title: steps[0],
    summary: steps[1],
    parts: [[steps[0], 4], [steps[1], 2], [t(COPY.steps.intro, locale), 1]],
  });
  return out;
}

/** Returns hits for a query. A query shorter than MIN_QUERY characters finds nothing. */
export function searchHelp(query: string, locale: Locale): HelpHit[] {
  const words = queryWords(query);
  if (words.length === 0 || words.join("").length < MIN_QUERY) return [];
  const collator = new Intl.Collator(locale, { sensitivity: "base" });
  const hits: HelpHit[] = [];
  for (const d of docs(locale)) {
    const folded = d.parts.map(([text, weight]) => [foldText(text), weight] as const);
    let score = 0;
    let all = true;
    for (const w of words) {
      let best = 0;
      for (const [text, weight] of folded) if (text.includes(w)) best = Math.max(best, weight);
      if (best === 0) {
        all = false;
        break;
      }
      score += best;
    }
    if (all) hits.push({ kind: d.kind, id: d.id, title: d.title, summary: d.summary, score });
  }
  return hits.sort((a, b) => b.score - a.score || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || collator.compare(a.title, b.title) || a.id.localeCompare(b.id));
}
