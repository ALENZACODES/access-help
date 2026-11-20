/** Runs the person's numbers over their places and writes the result as text and as CSV. */
import { CRITERION_KEYS, hasCriteria, type Criteria } from './criteria.js';
import { checkText, criteriaLines, matchCountsText, noCriteriaText, overallLabel, tallyLine, toldCountedText, unknownText, yoursText } from './messages.js';
import { matchCounts, matchPlace, unknownTally, type MatchCounts, type MatchResult, type Overall } from './match.js';
import { placeLine, type MeasuredPlace, type Measures } from '../place-measures/index.js';
import { colon, pick, type PreLang } from '../presubmit/text.js';

export interface MatchInput {
  places: readonly MeasuredPlace[];
  measured: readonly Measures[];
  told: readonly Measures[];
}

export interface MatchRow {
  place: MeasuredPlace;
  result: MatchResult;
  /** True when the person has measures of their own for this place. */
  hasMeasures: boolean;
}

export interface MatchRun {
  rows: MatchRow[];
  counts: MatchCounts;
  tally: { key: (typeof CRITERION_KEYS)[number]; places: number }[];
}

const ORDER: Record<Overall, number> = { fits: 0, 'cannot-say': 1, 'does-not-fit': 2, 'no-criteria': 3 };

function nameOf(place: MeasuredPlace): string {
  return place.name === null ? '' : place.name.trim();
}

/** Every saved place against the criteria: places within the numbers first, then the ones nothing can be said about. */
export function runMatch(input: MatchInput, criteria: Criteria): MatchRun {
  const measured = new Map(input.measured.map((entry) => [entry.recordId, entry]));
  const told = new Map(input.told.map((entry) => [entry.recordId, entry]));
  const rows = input.places.map((place) => ({
    place,
    result: matchPlace(place.id, criteria, measured.get(place.id) ?? null, told.get(place.id) ?? null),
    hasMeasures: measured.has(place.id),
  }));
  rows.sort((a, b) => ORDER[a.result.overall] - ORDER[b.result.overall] || nameOf(a.place).localeCompare(nameOf(b.place), 'en') || a.place.id.localeCompare(b.place.id));
  const results = rows.map((row) => row.result);
  return { rows, counts: matchCounts(results), tally: unknownTally(results) };
}

export function rowsWith(run: MatchRun, overall: Overall): MatchRow[] {
  return run.rows.filter((row) => row.result.overall === overall);
}

function title(place: MeasuredPlace, lang: PreLang): string {
  return nameOf(place) === '' ? pick(lang, 'Place without a name', 'Lieu sans nom') : nameOf(place);
}

export function matchText(run: MatchRun, criteria: Criteria, today: string, lang: PreLang): string {
  const lines: string[] = [pick(lang, `My places against my numbers, ${today}`, `Mes lieux face à mes chiffres, ${today}`), yoursText(lang), ''];
  lines.push(pick(lang, 'The numbers you set', 'Les chiffres que vous avez fixés'));
  if (!hasCriteria(criteria)) {
    lines.push(noCriteriaText(lang));
    return `${lines.join('\n')}\n`;
  }
  for (const line of criteriaLines(criteria, lang)) lines.push(`- ${line}`);
  if (criteria.countTold) lines.push(toldCountedText(lang));
  lines.push('', matchCountsText(run.counts, lang));
  for (const entry of run.tally) lines.push(tallyLine(entry, lang));
  for (const overall of ['fits', 'cannot-say', 'does-not-fit'] as const) {
    const rows = rowsWith(run, overall);
    if (rows.length === 0) continue;
    lines.push('', `${overallLabel(overall, lang)}${colon(lang)}${rows.length}`);
    for (const row of rows) {
      lines.push(`* ${title(row.place, lang)}. ${placeLine(row.place, lang)}`);
      for (const check of row.result.checks) lines.push(`  - ${checkText(check, criteria, lang)}`);
      const unknown = unknownText(row.result, lang);
      if (unknown !== '') lines.push(`  ${unknown}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

export const MATCH_COLUMNS = ['id', 'name', 'result', 'steps', 'step_height', 'door_width', 'door', 'toilet', 'toilet_door', 'used_what_place_said', 'status', 'source', 'licence', 'observed_on', 'tier'] as const;

function csvCell(value: string): string {
  let text = value;
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** One line per place. Each criterion column reads fits, does-not-fit, UNKNOWN, or not-set. */
export function matchCsv(run: MatchRun): string {
  const lines = [MATCH_COLUMNS.join(',')];
  for (const row of run.rows) {
    const byKey = new Map(row.result.checks.map((check) => [check.key, check.outcome]));
    const cells = CRITERION_KEYS.map((key) => {
      const outcome = byKey.get(key);
      return outcome === undefined ? 'not-set' : outcome === 'unknown' ? 'UNKNOWN' : outcome;
    });
    const status = ['yes', 'limited', 'no'].includes(row.place.wheelchair) ? row.place.wheelchair : 'UNKNOWN';
    lines.push(
      [row.place.id, nameOf(row.place), row.result.overall, ...cells, row.result.usedTold ? 'yes' : 'no', status, row.place.source.trim() === '' ? 'UNKNOWN' : row.place.source.trim(), row.place.licence, row.place.observedOn, 'UNKNOWN']
        .map(csvCell)
        .join(','),
    );
  }
  return `${lines.join('\r\n')}\r\n`;
}

export function matchFilename(today: string, extension: 'txt' | 'csv'): string {
  return `places-against-my-numbers-${today}.${extension}`;
}
