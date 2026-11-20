import type { Locale } from "../../switch-first/src/index";
import { NB, t, type Pair } from "./copy";
import { FACT_KEYS } from "./facts";
import type { Requirement } from "./filter";
import { esc } from "./html";
import type { Place } from "./places";
import { buildPlan } from "./plan";
import { statusCountsLine } from "./roundup";

/**
 * Beside the compare table: what stands behind each place's column — how many
 * records, from how many sources, over which dates — and, when must-haves or a
 * filter are set, how the details stand against them. Counts only; the App
 * does not add them up into a score and does not pick a place.
 */
export const BEHIND_COPY = {
  title: { en: "Behind each column", fr: "Derrière chaque colonne" },
  intro: {
    en: "How many records each place has, from how many sources, and over which dates.",
    fr: "Le nombre de données de chaque lieu, de combien de sources, et sur quelles dates.",
  },
  noScore: {
    en: "These are counts to read, not a score. The App does not pick a place.",
    fr: "Ce sont des chiffres à lire, pas une note. L’App ne choisit pas de lieu.",
  },
  records: { en: "Records", fr: "Données" },
  sources: { en: "Sources used", fr: "Sources utilisées" },
  dates: { en: "Dates recorded", fr: "Dates de saisie" },
  noRecords: { en: "No records, so every detail is Unknown.", fr: "Aucune donnée, donc chaque détail est UNKNOWN." },
  against: { en: "Against what you chose", fr: "Par rapport à vos choix" },
  none: { en: "No records", fr: "Aucune donnée" },
} as const satisfies Record<string, Pair>;

export interface BehindColumn {
  readonly place: Place;
  readonly records: number;
  readonly sources: number;
  readonly oldest: string | undefined;
  readonly newest: string | undefined;
}

export function behindColumn(place: Place): BehindColumn {
  const obs = FACT_KEYS.flatMap((k) => {
    const r = place.resolutions[k];
    return r.kind === "unknown" ? [] : r.observations;
  });
  const dates = obs.map((o) => o.provenance.recordedOn).sort();
  return {
    place,
    records: obs.length,
    sources: new Set(obs.map((o) => o.provenance.source)).size,
    oldest: dates[0],
    newest: dates[dates.length - 1],
  };
}

export function datesText(c: BehindColumn): string {
  if (!c.oldest || !c.newest) return "";
  return c.oldest === c.newest ? c.oldest : `${c.oldest} – ${c.newest}`;
}

/** "3 records, 2 sources, 2025-01-01 – 2026-05-05"; "No records" when there are none. One line, for small spaces. */
export function behindSummary(c: BehindColumn, locale: Locale): string {
  if (c.records === 0) return t(BEHIND_COPY.none, locale);
  const fr = locale === "fr";
  const records = fr ? `${c.records} ${c.records > 1 ? "données" : "donnée"}` : `${c.records} ${c.records === 1 ? "record" : "records"}`;
  const sources = fr ? `${c.sources} ${c.sources > 1 ? "sources" : "source"}` : `${c.sources} ${c.sources === 1 ? "source" : "sources"}`;
  return `${records}, ${sources}, ${datesText(c)}`;
}

/** The section under the compare table, one item per place in the table's order. */
export function renderBehind(places: readonly Place[], req: Requirement, locale: Locale): string {
  const l = locale;
  const colon = l === "fr" ? `${NB}:` : ":";
  const withReq = Object.keys(req).length > 0;
  const items = places
    .map((p) => {
      const c = behindColumn(p);
      const facts =
        c.records === 0
          ? `<p>${esc(t(BEHIND_COPY.noRecords, l))}</p>`
          : `<ul><li>${esc(t(BEHIND_COPY.records, l))}${colon} <strong data-behind="records">${c.records}</strong></li>` +
            `<li>${esc(t(BEHIND_COPY.sources, l))}${colon} <strong data-behind="sources">${c.sources}</strong></li>` +
            `<li>${esc(t(BEHIND_COPY.dates, l))}${colon} <span data-behind="dates">${esc(datesText(c))}</span></li></ul>`;
      const against = withReq ? statusCountsLine(buildPlan(p, req).counts, l) : "";
      return (
        `<li data-place="${esc(p.id)}"><strong data-user-content>${esc(p.name)}</strong>${facts}` +
        (against !== "" ? `<p data-behind="against">${esc(t(BEHIND_COPY.against, l))}${colon} ${esc(against)}.</p>` : "") +
        `</li>`
      );
    })
    .join("");
  return (
    `<section class="behind" aria-labelledby="behind-title"><h3 id="behind-title">${esc(t(BEHIND_COPY.title, l))}</h3>` +
    `<p>${esc(t(BEHIND_COPY.intro, l))}</p><p class="hint">${esc(t(BEHIND_COPY.noScore, l))}</p>` +
    `<ul class="behind-list">${items}</ul></section>`
  );
}

export function behindStrings(): Array<[string, Pair]> {
  return Object.entries(BEHIND_COPY).map(([k, p]): [string, Pair] => [`BEHIND_COPY.${k}`, p]);
}
