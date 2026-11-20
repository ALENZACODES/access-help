import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t, type Pair } from "./copy";
import { FACT_KEYS, type FactKey } from "./facts";
import { esc } from "./html";
import type { Note } from "./model";
import { sourceName } from "./sources";

/**
 * Which details each source recorded, across all notes: for every source, how
 * many Yes or No it gave for each detail. It shows where the App's records come
 * from; it never says a source is more right, and it adds nothing to a record.
 */
export const SOURCE_COVERAGE_COPY = {
  title: { en: "What each source recorded", fr: "Ce que chaque source a noté" },
  intro: {
    en: "For each source, how many records it gave for each detail. A detail it never recorded is left out.",
    fr: "Pour chaque source, le nombre de données fournies pour chaque détail. Un détail jamais noté est laissé de côté.",
  },
} as const satisfies Record<string, Pair>;

export interface SourceCoverage {
  readonly source: string;
  /** Records per detail, only for details with at least one record, in the App's detail order. */
  readonly perDetail: ReadonlyArray<readonly [FactKey, number]>;
  readonly total: number;
}

/** Sources by total records, most first, then by name. */
export function sourceCoverage(notes: readonly Note[]): SourceCoverage[] {
  const by = new Map<string, Map<FactKey, number>>();
  for (const n of notes) {
    for (const f of n.facts) {
      if (f.value === "unknown" || !f.provenance) continue;
      const m = by.get(f.provenance.source) ?? new Map<FactKey, number>();
      m.set(f.key, (m.get(f.key) ?? 0) + 1);
      by.set(f.provenance.source, m);
    }
  }
  return Array.from(by, ([source, m]) => {
    const perDetail = FACT_KEYS.filter((k) => (m.get(k) ?? 0) > 0).map((k) => [k, m.get(k) ?? 0] as const);
    return { source, perDetail, total: perDetail.reduce((s, [, c]) => s + c, 0) };
  }).sort((a, b) => b.total - a.total || a.source.localeCompare(b.source));
}

/** "Step-free entrance 3, Elevator 1". */
export function perDetailText(c: SourceCoverage, locale: Locale): string {
  return c.perDetail.map(([k, n]) => `${t(COPY.facts[k], locale)} ${n}`).join(", ");
}

/** The section on the sources page. Nothing when no record exists. */
export function renderSourceCoverage(notes: readonly Note[], locale: Locale): string {
  const l = locale;
  const list = sourceCoverage(notes);
  if (list.length === 0) return "";
  const colon = l === "fr" ? `${NB}:` : ":";
  return (
    `<section class="source-coverage" aria-labelledby="source-coverage-title"><h3 id="source-coverage-title">${esc(t(SOURCE_COVERAGE_COPY.title, l))}</h3>` +
    `<p>${esc(t(SOURCE_COVERAGE_COPY.intro, l))}</p><ul>${list
      .map((c) => `<li data-source-total="${c.total}"><strong data-user-content>${esc(sourceName(c.source, l))}</strong>${colon} ${esc(perDetailText(c, l))}</li>`)
      .join("")}</ul></section>`
  );
}

export function sourceCoverageStrings(): Array<[string, Pair]> {
  return Object.entries(SOURCE_COVERAGE_COPY).map(([k, p]): [string, Pair] => [`SOURCE_COVERAGE_COPY.${k}`, p]);
}
