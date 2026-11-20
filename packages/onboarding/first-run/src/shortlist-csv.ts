import { type Pair } from "./copy";
import { FACT_KEYS, type FactKey } from "./facts";
import type { Requirement } from "./filter";
import { standOf, type StandGroup } from "./musthaves";
import { csvField, guardCell } from "./notes-csv";
import type { Place, Resolution } from "./places";
import { statusOf, type PlanStatus } from "./plan";
import { shortlistRows } from "./shortlist-order";

/**
 * The shortlist as a spreadsheet (CSV), to weigh places side by side: one row
 * per place in the person's order. For each detail, what the notes say
 * (yes, no, differ, or UNKNOWN when they have no record), how many records
 * say it, and the newest day recorded; with must-haves saved, the must-have
 * and whether this place meets it. Nothing in it is a judgement of the
 * place: it repeats the notes and the person's own must-haves.
 */
export const SHORTLIST_CSV_COPY = {
  download: { en: "Download my shortlist as a spreadsheet (CSV)", fr: "Télécharger ma liste restreinte en tableur (CSV)" },
  hint: {
    en: "One row per place, in your order: what your notes say about each detail, how many records, the newest day, and your must-haves.",
    fr: "Une ligne par lieu, dans votre ordre\u00A0: ce que disent vos notes sur chaque détail, le nombre de données, le jour le plus récent et vos indispensables.",
  },
} as const satisfies Record<string, Pair>;

const STANDING: Readonly<Record<StandGroup, string>> = { allMatch: "all_met", open: "open", notMet: "not_met" };
const STATUS: Readonly<Record<PlanStatus, string>> = { matches: "met", "not-met": "not_met", unknown: "UNKNOWN", differ: "differ" };

export function shortlistCsvColumns(withNeeds: boolean): string[] {
  return [
    "position",
    "place_name",
    "address",
    ...(withNeeds ? ["must_haves"] : []),
    ...FACT_KEYS.flatMap((k) => [k, `${k}_records`, `${k}_newest`, ...(withNeeds ? [`${k}_must_have`, `${k}_met`] : [])]),
  ];
}

/** What the notes say, how many records say it, and the newest day among them. */
export function resolutionCells(r: Resolution | undefined): [string, string, string] {
  if (!r || r.kind === "unknown") return ["UNKNOWN", "0", ""];
  const newest = r.observations.map((o) => o.provenance.recordedOn).reduce((a, b) => (b > a ? b : a), "");
  return [r.kind === "differ" ? "differ" : r.value, String(r.observations.length), newest];
}

export function shortlistToRows(list: readonly string[], places: readonly Place[], needs: Requirement): string[][] {
  const withNeeds = FACT_KEYS.some((k) => needs[k] !== undefined);
  const rows: string[][] = [shortlistCsvColumns(withNeeds)];
  for (const r of shortlistRows(list, places)) {
    const stand = standOf(r.place, needs);
    const cells = [String(r.position), guardCell(r.place.name), guardCell(r.place.address ?? "")];
    if (withNeeds) cells.push(stand ? STANDING[stand] : "");
    for (const key of FACT_KEYS) {
      const res = r.place.resolutions[key];
      cells.push(...resolutionCells(res));
      if (withNeeds) {
        const wanted = needs[key as FactKey];
        cells.push(wanted ?? "", wanted ? STATUS[statusOf(res ?? { kind: "unknown" }, wanted)] : "");
      }
    }
    rows.push(cells);
  }
  return rows;
}

export function shortlistToCsv(list: readonly string[], places: readonly Place[], needs: Requirement): string {
  return `\uFEFF${shortlistToRows(list, places, needs)
    .map((r) => r.map(csvField).join(","))
    .join("\r\n")}\r\n`;
}

export function shortlistCsvFilename(today: Date): string {
  return `shortlist-${today.toISOString().slice(0, 10)}.csv`;
}

export function shortlistCsvStrings(): Array<[string, Pair]> {
  return Object.entries(SHORTLIST_CSV_COPY).map(([k, p]): [string, Pair] => [`shortlistcsv.${k}`, p]);
}
