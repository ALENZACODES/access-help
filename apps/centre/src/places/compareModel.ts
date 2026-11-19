/**
 * Builds what the comparison screen shows from the person's saved observations and the merged
 * places of the loaded packs. Pure: the day, the distance and the language come in as arguments.
 */
import {
  COMPARE_DEFAULT_RADIUS,
  COMPARE_OUTCOMES,
  COMPARE_RADIUS_CHOICES,
  compareFlagTexts,
  compareMatchText,
  compareNotes,
  compareNotesCsv,
  compareNotesFilename,
  compareNotesSummary,
  compareNotesText,
  compareOutcomeAdvice,
  compareOutcomeLabel,
  compareRecordLine,
  type CompareNotesReport,
  type CompareOutcome,
} from "./docs-bridge.js";
import type { Language, PlaceRecord } from "./types.js";

export interface CompareRow {
  id: string;
  name: string | null;
  outcome: CompareOutcome;
  outcomeLabel: string;
  advice: string;
  matchText: string;
  mineLine: string;
  /** Null when there is no suggested pack place. */
  pack: { id: string; name: string | null; line: string } | null;
  flags: string[];
  /** Pack places within the distance other than the suggested one. */
  otherNearby: number;
}

export interface OutcomeChoice {
  value: CompareOutcome | "all";
  label: string;
  count: number;
}

export interface CompareView {
  report: CompareNotesReport;
  summary: string;
  rows: CompareRow[];
  choices: OutcomeChoice[];
}

export function cleanRadius(value: number): number {
  return (COMPARE_RADIUS_CHOICES as readonly number[]).includes(value) ? value : COMPARE_DEFAULT_RADIUS;
}

export function buildCompareView(mine: readonly PlaceRecord[], packPlaces: readonly PlaceRecord[], radius: number, language: Language): CompareView {
  const report = compareNotes(mine, packPlaces, cleanRadius(radius));
  const rows: CompareRow[] = report.items.map((item) => {
    const best = item.match.best;
    return {
      id: item.mine.id,
      name: item.mine.name,
      outcome: item.outcome,
      outcomeLabel: compareOutcomeLabel(item.outcome, language),
      advice: compareOutcomeAdvice(item.outcome, language),
      matchText: compareMatchText(item.match.kind, language),
      mineLine: compareRecordLine(item.mine, language),
      pack: best === null ? null : { id: best.record.id, name: best.record.name, line: compareRecordLine(best.record, language) },
      flags: compareFlagTexts(item, language),
      otherNearby: item.match.candidates.length - (best === null ? 0 : 1),
    };
  });
  const choices: OutcomeChoice[] = COMPARE_OUTCOMES.filter((outcome) => report.counts[outcome] > 0).map((outcome) => ({
    value: outcome,
    label: compareOutcomeLabel(outcome, language),
    count: report.counts[outcome],
  }));
  return { report, summary: compareNotesSummary(report, language), rows, choices };
}

export function rowsFor(view: CompareView, shown: CompareOutcome | "all"): CompareRow[] {
  return shown === "all" ? [...view.rows] : view.rows.filter((row) => row.outcome === shown);
}

export type CompareFileKind = "txt" | "csv";

export interface CompareFile {
  filename: string;
  mime: string;
  content: string;
}

export function compareFile(kind: CompareFileKind, report: CompareNotesReport, today: string, language: Language): CompareFile {
  return kind === "csv"
    ? { filename: compareNotesFilename("csv", today), mime: "text/csv", content: compareNotesCsv(report, language) }
    : { filename: compareNotesFilename("txt", today), mime: "text/plain", content: compareNotesText(report, today, language) };
}

export { COMPARE_DEFAULT_RADIUS, COMPARE_RADIUS_CHOICES };
