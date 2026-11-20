import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t, type Pair } from "./copy";
import { FACT_KEYS, OPEN_LICENCES, type FactKey } from "./facts";
import { esc } from "./html";
import type { Place } from "./places";
import { rangeText, sourceName } from "./sources";

/**
 * Who recorded what about one place: for each source, how many records, which
 * details, under which licences, and over which dates. It shows where each
 * answer came from; it does not say any source is more right than another.
 */
export const WHO_COPY = {
  title: { en: "Who recorded this place", fr: "Qui a noté ce lieu" },
  intro: {
    en: "Each source with the details it recorded here. No source is ranked above another.",
    fr: "Chaque source avec les détails qu’elle a notés ici. Aucune source n’est placée au-dessus d’une autre.",
  },
  records: { en: "records", fr: "données" },
  record: { en: "record", fr: "donnée" },
  details: { en: "Details", fr: "Détails" },
  licences: { en: "Licences used", fr: "Licences utilisées" },
  dates: { en: "Dates recorded", fr: "Dates de saisie" },
} as const satisfies Record<string, Pair>;

export interface PlaceSource {
  readonly source: string;
  readonly records: number;
  /** Details this source recorded, in the App's detail order. */
  readonly keys: readonly FactKey[];
  /** Licences in the App's licence order. */
  readonly licences: readonly string[];
  readonly oldest: string;
  readonly newest: string;
}

const licenceOrder = (x: string): number => {
  const i = OPEN_LICENCES.indexOf(x);
  return i === -1 ? OPEN_LICENCES.length : i;
};

/** Sources by number of records, most first, then by name, so the order never changes for the same notes. */
export function placeSources(place: Place): PlaceSource[] {
  const by = new Map<string, { records: number; keys: Set<FactKey>; licences: Set<string>; dates: string[] }>();
  for (const key of FACT_KEYS) {
    const r = place.resolutions[key];
    if (r.kind === "unknown") continue;
    for (const o of r.observations) {
      const s = by.get(o.provenance.source) ?? { records: 0, keys: new Set<FactKey>(), licences: new Set<string>(), dates: [] };
      s.records += 1;
      s.keys.add(key);
      s.licences.add(o.provenance.licence);
      s.dates.push(o.provenance.recordedOn);
      by.set(o.provenance.source, s);
    }
  }
  return Array.from(by, ([source, s]) => {
    const dates = [...s.dates].sort();
    return {
      source,
      records: s.records,
      keys: FACT_KEYS.filter((k) => s.keys.has(k)),
      licences: [...s.licences].sort((a, b) => licenceOrder(a) - licenceOrder(b) || a.localeCompare(b)),
      oldest: dates[0] ?? "",
      newest: dates[dates.length - 1] ?? "",
    };
  }).sort((a, b) => b.records - a.records || a.source.localeCompare(b.source));
}

export function recordsWord(n: number, locale: Locale): string {
  const one = locale === "fr" ? n <= 1 : n === 1;
  return `${n} ${t(one ? WHO_COPY.record : WHO_COPY.records, locale)}`;
}

/** The section on the record history page. Nothing when the place has no record. */
export function renderWhoRecorded(place: Place, locale: Locale): string {
  const l = locale;
  const list = placeSources(place);
  if (list.length === 0) return "";
  const colon = l === "fr" ? `${NB}:` : ":";
  const items = list
    .map(
      (s) =>
        `<li data-source-records="${s.records}"><strong data-user-content>${esc(sourceName(s.source, l))}</strong> · ${esc(recordsWord(s.records, l))}` +
        `<ul><li>${esc(t(WHO_COPY.details, l))}${colon} ${esc(s.keys.map((k) => t(COPY.facts[k], l)).join(", "))}</li>` +
        `<li>${esc(t(WHO_COPY.licences, l))}${colon} ${esc(s.licences.join(", "))}</li>` +
        `<li>${esc(t(WHO_COPY.dates, l))}${colon} ${esc(rangeText(s.oldest, s.newest))}</li></ul></li>`,
    )
    .join("");
  return (
    `<section class="who-recorded" aria-labelledby="who-title"><h3 id="who-title">${esc(t(WHO_COPY.title, l))}</h3>` +
    `<p>${esc(t(WHO_COPY.intro, l))}</p><ul class="who-list">${items}</ul></section>`
  );
}

/**
 * The same section as text lines for the record history file. Lines start
 * with "* " so they are never read as record lines. Empty with no record.
 */
export function whoRecordedLines(place: Place, locale: Locale): string[] {
  const l = locale;
  const list = placeSources(place);
  if (list.length === 0) return [];
  const colon = l === "fr" ? `${NB}:` : ":";
  const title = t(WHO_COPY.title, l);
  const lines = [title, "-".repeat(Math.min(title.length, 72))];
  for (const s of list) {
    lines.push(`* ${sourceName(s.source, l)} · ${recordsWord(s.records, l)}`);
    lines.push(`  ${t(WHO_COPY.details, l)}${colon} ${s.keys.map((k) => t(COPY.facts[k], l)).join(", ")}`);
    lines.push(`  ${t(WHO_COPY.licences, l)}${colon} ${s.licences.join(", ")}`);
    lines.push(`  ${t(WHO_COPY.dates, l)}${colon} ${rangeText(s.oldest, s.newest)}`);
  }
  lines.push("");
  return lines;
}

export function whoStrings(): Array<[string, Pair]> {
  return Object.entries(WHO_COPY).map(([k, p]): [string, Pair] => [`WHO_COPY.${k}`, p]);
}
