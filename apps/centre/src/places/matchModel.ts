/**
 * Builds what the numbers page shows from the person's saved observations, their measures,
 * what places said and the numbers in use. Pure: the language and the day come in as
 * arguments and nothing here reads the clock or storage.
 */
import {
  hasMatchCriteria,
  matchCheckText,
  matchCountsText,
  matchCriteriaLines,
  matchCsv,
  matchFilename,
  matchOverallLabel,
  matchRowsWith,
  matchTallyLine,
  matchText,
  matchToldCountedText,
  matchUnknownText,
  matchYoursText,
  measurePlaceLine,
  runMatch,
  type MatchCriteria,
  type MatchOverall,
  type MatchRun,
  type MeasureBook,
} from "./docs-bridge.js";
import { matchPageText } from "./matchStrings.js";
import type { Language, PlaceRecord } from "./types.js";

export interface MatchPlaceView {
  id: string;
  name: string;
  placeLine: string;
  checks: string[];
  /** Names the facts that are UNKNOWN. Empty when none is. */
  unknown: string;
}

export interface MatchGroup {
  overall: MatchOverall;
  heading: string;
  places: MatchPlaceView[];
}

export interface MatchView {
  yours: string;
  hasCriteria: boolean;
  /** The numbers in use, one per line. */
  numbers: string[];
  /** Set when what places said is being counted. */
  toldNote: string;
  counts: string;
  tally: string[];
  groups: MatchGroup[];
  run: MatchRun;
}

export interface MatchData {
  records: readonly PlaceRecord[];
  measures: MeasureBook;
  told: MeasureBook;
}

const GROUPS: readonly MatchOverall[] = ["fits", "cannot-say", "does-not-fit"];

export function buildMatchView(data: MatchData, criteria: MatchCriteria, language: Language): MatchView {
  const ids = new Set(data.records.map((record) => record.id));
  const run = runMatch({ places: data.records, measured: data.measures.entries.filter((entry) => ids.has(entry.recordId)), told: data.told.entries.filter((entry) => ids.has(entry.recordId)) }, criteria);
  const has = hasMatchCriteria(criteria);
  return {
    yours: matchYoursText(language),
    hasCriteria: has,
    numbers: matchCriteriaLines(criteria, language),
    toldNote: has && criteria.countTold ? matchToldCountedText(language) : "",
    counts: matchCountsText(run.counts, language),
    tally: run.tally.map((entry) => matchTallyLine(entry, language)),
    groups: !has
      ? []
      : GROUPS.map((overall) => {
          const rows = matchRowsWith(run, overall);
          return {
            overall,
            heading: `${matchOverallLabel(overall, language)} (${rows.length})`,
            places: rows.map((row) => ({
              id: row.place.id,
              name: row.place.name === null || row.place.name.trim() === "" ? matchPageText(language, "unnamed") : row.place.name.trim(),
              placeLine: measurePlaceLine(row.place, language),
              checks: row.result.checks.map((check) => matchCheckText(check, criteria, language)),
              unknown: matchUnknownText(row.result, language),
            })),
          };
        }).filter((group) => group.places.length > 0),
    run,
  };
}

export interface MatchFile {
  filename: string;
  mime: string;
  content: string;
}

/** Null when no number is set or there is no place to look through. */
export function matchFile(kind: "txt" | "csv", view: MatchView, criteria: MatchCriteria, today: string, language: Language): MatchFile | null {
  if (!view.hasCriteria || view.run.rows.length === 0) return null;
  return kind === "txt"
    ? { filename: matchFilename(today, "txt"), mime: "text/plain", content: matchText(view.run, criteria, today, language) }
    : { filename: matchFilename(today, "csv"), mime: "text/csv", content: matchCsv(view.run) };
}
