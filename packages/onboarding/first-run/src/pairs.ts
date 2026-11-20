import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, NN, t, type Pair } from "./copy";
import { FACT_KEYS, type FactKey } from "./facts";
import { esc } from "./html";
import type { Place, Resolution } from "./places";
import { reasonText } from "./views-similar";
import { behindColumn, behindSummary } from "./compare-records";
import type { Suggestion } from "./similar";

/**
 * For a pair of places that may be the same, what the two hold for each
 * detail. Records that agree, or that disagree, are a hint for the person
 * deciding; they are never proof either way. The App does not decide, does not
 * merge, and does not pick an answer for the detail.
 */
export type PairDetailKind = "agree" | "disagree" | "only-a" | "only-b" | "neither";

export const PAIR_DETAIL_KINDS: readonly PairDetailKind[] = ["agree", "disagree", "only-a", "only-b", "neither"];

export interface PairDetail {
  readonly key: FactKey;
  readonly kind: PairDetailKind;
  /** The answers recorded at each place, without repeats, Yes before No. Empty means no record. */
  readonly a: readonly ("yes" | "no")[];
  readonly b: readonly ("yes" | "no")[];
}

export type PairCounts = Readonly<Record<PairDetailKind, number>>;

export const PAIR_COPY = {
  heading: { en: "What the two hold", fr: "Ce que contiennent les deux" },
  hint: {
    en: "Matching records are a hint, not proof. Different records do not prove they are two places.",
    fr: "Des données semblables sont un indice, pas une preuve. Des données différentes ne prouvent pas qu’il s’agit de deux lieux.",
  },
  agree: { en: "Same answer", fr: "Même réponse" },
  disagree: { en: "Different answers", fr: "Réponses différentes" },
  onlyA: { en: "Only the first has a record", fr: "Seul le premier a une donnée" },
  onlyB: { en: "Only the second has a record", fr: "Seul le second a une donnée" },
  neither: { en: "Neither has a record", fr: "Aucun des deux n’a de donnée" },
  textTitle: { en: "Possible matches, detail by detail", fr: "Lieux peut-être identiques, détail par détail" },
  download: { en: "Download these pairs as text", fr: "Télécharger ces paires en texte" },
  first: { en: "First", fr: "Premier" },
  second: { en: "Second", fr: "Deuxième" },
} as const satisfies Record<string, Pair>;

const KIND_COPY: Record<PairDetailKind, Pair> = {
  agree: PAIR_COPY.agree,
  disagree: PAIR_COPY.disagree,
  "only-a": PAIR_COPY.onlyA,
  "only-b": PAIR_COPY.onlyB,
  neither: PAIR_COPY.neither,
};

export function kindLabel(kind: PairDetailKind, locale: Locale): string {
  return t(KIND_COPY[kind], locale);
}

/** The answers a place's notes hold for a detail, without repeats. */
export function answersOf(r: Resolution): ("yes" | "no")[] {
  if (r.kind === "unknown") return [];
  const set = new Set(r.observations.map((o) => o.value));
  return (["yes", "no"] as const).filter((v) => set.has(v));
}

export function pairKind(a: readonly ("yes" | "no")[], b: readonly ("yes" | "no")[]): PairDetailKind {
  if (a.length === 0 && b.length === 0) return "neither";
  if (b.length === 0) return "only-a";
  if (a.length === 0) return "only-b";
  // Agree only when each place holds one answer and it is the same one.
  return a.length === 1 && b.length === 1 && a[0] === b[0] ? "agree" : "disagree";
}

export function pairDetails(a: Place, b: Place): PairDetail[] {
  return FACT_KEYS.map((key) => {
    const [va, vb] = [answersOf(a.resolutions[key]), answersOf(b.resolutions[key])];
    return { key, kind: pairKind(va, vb), a: va, b: vb };
  });
}

export function pairCounts(details: readonly PairDetail[]): PairCounts {
  const out: Record<PairDetailKind, number> = { agree: 0, disagree: 0, "only-a": 0, "only-b": 0, neither: 0 };
  for (const d of details) out[d.kind] += 1;
  return out;
}

/** "Yes", "No", "Yes and No", or the App's word for no record. */
export function answersText(values: readonly ("yes" | "no")[], locale: Locale): string {
  if (values.length === 0) return t(COPY.values.unknown, locale);
  const words = values.map((v) => t(COPY.values[v], locale));
  return words.join(locale === "fr" ? " et " : " and ");
}

/** One line per detail: "Elevator: Yes / No. Different answers." */
export function pairDetailLine(d: PairDetail, locale: Locale): string {
  const colon = locale === "fr" ? `${NB}:` : ":";
  return `${t(COPY.facts[d.key], locale)}${colon} ${answersText(d.a, locale)} / ${answersText(d.b, locale)}. ${kindLabel(d.kind, locale)}.`;
}

/** "Same answer 2, Different answers 1" — only kinds that occur, in a fixed order. */
export function countsLine(c: PairCounts, locale: Locale): string {
  return PAIR_DETAIL_KINDS.filter((k) => c[k] > 0)
    .map((k) => `${kindLabel(k, locale)} ${c[k]}`)
    .join(locale === "fr" ? `${NN}; ` : "; ");
}

/** The block added to a pair card on the possible matches page. */
export function renderPairDetails(s: Suggestion, index: number, locale: Locale): string {
  const l = locale;
  const details = pairDetails(s.a, s.b);
  const id = `pair-${index}-details`;
  const items = details
    .map(
      (d) =>
        `<li data-key="${d.key}" data-kind="${d.kind}"><strong>${esc(t(COPY.facts[d.key], l))}</strong>${l === "fr" ? NB : ""}: ` +
        `${esc(answersText(d.a, l))} / ${esc(answersText(d.b, l))}. ${esc(kindLabel(d.kind, l))}.</li>`,
    )
    .join("");
  return (
    `<h4 id="${id}">${esc(t(PAIR_COPY.heading, l))}</h4>` +
    `<p data-pair-counts>${esc(countsLine(pairCounts(details), l))}.</p>` +
    `<ul class="pair-details" aria-labelledby="${id}">${items}</ul>`
  );
}

const rule = (title: string, ch = "="): string => ch.repeat(Math.min(Math.max(title.length, 3), 72));

/** Every suggested pair with its details, for keeping or printing. */
export function pairsToText(suggestions: readonly Suggestion[], locale: Locale): string {
  const l = locale;
  const colon = l === "fr" ? `${NB}:` : ":";
  const title = t(PAIR_COPY.textTitle, l);
  const lines = [title, rule(title), "", t(COPY.similar.intro, l), t(PAIR_COPY.hint, l), ""];
  if (suggestions.length === 0) lines.push(t(COPY.similar.none, l), "");
  suggestions.forEach((s, i) => {
    const head = `${t(COPY.similar.pair, l)} ${i + 1}`;
    lines.push(head, rule(head, "-"), reasonText(s.reason, l));
    for (const [label, p] of [[PAIR_COPY.first, s.a], [PAIR_COPY.second, s.b]] as const) {
      lines.push(`${t(label, l)}${colon} ${p.name}${p.address ? `, ${p.address}` : ""}`);
      lines.push(`  ${behindSummary(behindColumn(p), l)}`);
    }
    const details = pairDetails(s.a, s.b);
    lines.push(`${countsLine(pairCounts(details), l)}.`);
    for (const d of details) lines.push(`- ${pairDetailLine(d, l)}`);
    lines.push("");
  });
  return lines.join("\n");
}

/** The page has no date of its own, so the file name carries only the language. */
export function pairsFilename(locale: Locale): string {
  return `${locale === "fr" ? "lieux-peut-etre-identiques" : "possible-matches"}-${locale}.txt`;
}

/** Every string pair in this module, for the copy audit. */
export function pairStrings(): Array<[string, Pair]> {
  return Object.entries(PAIR_COPY).map(([k, p]): [string, Pair] => [`PAIR_COPY.${k}`, p]);
}
