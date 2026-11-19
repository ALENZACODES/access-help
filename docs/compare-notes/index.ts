export { compareAll, compareOne, emptyCounts, isKnownStatus, newerOf, outcomeFor, withOutcome, OUTCOME_ORDER } from './compare.js';
export type { CompareReport, Comparison, Newer, Outcome, OutcomeCounts } from './compare.js';
export { candidatesFor, matchFor, nameSimilarity, nameTokens, DEFAULT_RADIUS, MAX_COMPARED, NAME_MATCH, RADIUS_CHOICES, TIE_METRES } from './match.js';
export type { Candidate, Match, MatchKind, NoteRecord, Radius } from './match.js';
export { compareSummaryText, distanceText, flagTexts, matchKindText, newerText, outcomeAdvice, outcomeLabel, recordLine } from './messages.js';
export { compareCell, compareCsv, compareFilename, compareText, COMPARE_COLUMNS } from './report.js';
