/**
 * Builds what the asking page shows from the person's saved observations, their measures,
 * their list of asks and what places said. Pure: the language and the day come in as
 * arguments and nothing here reads the clock or storage.
 */
import {
  ASK_QUESTION_KEYS,
  askCompareLabel,
  askCompareSummary,
  askCountsText,
  askCounts,
  askDifferenceText,
  askHowToMeasure,
  askLetterFileText,
  askLetterFilename,
  askLetterNote,
  askLine,
  askPrivacyNoteText,
  askQuestionShort,
  askQuestionText,
  askSheetFilename,
  askSheetText,
  askToldNoteText,
  asksCsv,
  asksCsvFilename,
  asksFor,
  buildAskLetter,
  compareAskFacts,
  emptyMeasureForm,
  measureFactValue,
  measureFormFrom,
  measurePlaceLine,
  measuresFor,
  openAskQuestions,
  type AskChannel,
  type AskEntry,
  type AskLetter,
  type AskLetterLanguage,
  type AskLog,
  type MeasureBook,
  type MeasureFactKey,
  type MeasureForm,
} from "./docs-bridge.js";
import { askText } from "./askStrings.js";
import type { Language, PlaceRecord } from "./types.js";

export function askName(record: Pick<PlaceRecord, "name">, language: Language): string {
  return record.name === null || record.name.trim() === "" ? askText(language, "unnamed") : record.name.trim();
}

const newestFirst = (a: PlaceRecord, b: PlaceRecord) => b.observedOn.localeCompare(a.observedOn) || a.id.localeCompare(b.id);

/** Opens on the newest observation. */
export function startAskId(records: readonly PlaceRecord[]): string | null {
  return [...records].sort(newestFirst)[0]?.id ?? null;
}

export function askOptions(records: readonly PlaceRecord[], language: Language): { id: string; label: string }[] {
  return [...records].sort(newestFirst).map((record) => ({ id: record.id, label: askText(language, "optionLabel", { name: askName(record, language), day: record.observedOn }) }));
}

/** The questions ticked to start with: every fact the person has not measured at this observation. */
export function startQuestions(recordId: string, measures: MeasureBook): MeasureFactKey[] {
  return openAskQuestions(measuresFor(measures, recordId));
}

/** The form for what a place said: what is saved, or an empty form dated today. */
export function toldFormFor(recordId: string, told: MeasureBook, today: string, language: Language): MeasureForm {
  const saved = measuresFor(told, recordId);
  return saved === null ? emptyMeasureForm(today) : measureFormFrom(saved, language === "fr" ? "," : ".");
}

export interface QuestionOption {
  key: MeasureFactKey;
  text: string;
  hint: string;
  /** True when the person already measured this fact. */
  measured: boolean;
}

export interface AskRow {
  entry: AskEntry;
  /** Position in this place's list, counting from one. */
  position: number;
  line: string;
}

export interface CompareRow {
  key: MeasureFactKey;
  fact: string;
  measured: string;
  told: string;
  note: string;
}

export interface AskDetail {
  record: PlaceRecord;
  name: string;
  placeLine: string;
  questions: QuestionOption[];
  letter: AskLetter;
  letterNote: string;
  asks: AskRow[];
  askCounts: string;
  hasTold: boolean;
  compare: CompareRow[];
  compareSummary: string;
}

export interface AskView {
  options: { id: string; label: string }[];
  chosenId: string | null;
  privacy: string;
  toldNote: string;
  /** Null when there is no observation to show. */
  detail: AskDetail | null;
}

export interface AskChoices {
  questions: readonly MeasureFactKey[];
  channel: AskChannel;
  letterLanguage: AskLetterLanguage;
  withHints: boolean;
}

export interface AskData {
  records: readonly PlaceRecord[];
  measures: MeasureBook;
  told: MeasureBook;
  log: AskLog;
}

export function buildAskView(data: AskData, chosenId: string | null, choices: AskChoices, today: string, language: Language): AskView {
  const record = data.records.find((entry) => entry.id === chosenId) ?? null;
  const base = { options: askOptions(data.records, language), privacy: askPrivacyNoteText(language), toldNote: askToldNoteText(language) };
  if (record === null) return { ...base, chosenId: null, detail: null };
  const measured = measuresFor(data.measures, record.id);
  const told = measuresFor(data.told, record.id);
  const chosen = ASK_QUESTION_KEYS.filter((key) => choices.questions.includes(key));
  const letter = buildAskLetter(choices.channel, choices.letterLanguage, { placeName: record.name, questions: chosen, withHints: choices.withHints }, language);
  const asks = asksFor(data.log, record.id);
  const rows = compareAskFacts(measured, told);
  return {
    ...base,
    chosenId: record.id,
    detail: {
      record,
      name: askName(record, language),
      placeLine: measurePlaceLine(record, language),
      questions: ASK_QUESTION_KEYS.map((key) => ({ key, text: askQuestionText(key, language), hint: askHowToMeasure(key, language), measured: measured !== null && measured[key] !== null })),
      letter,
      letterNote: askLetterNote(letter, language),
      asks: asks.map((entry, index) => ({ entry, position: index + 1, line: askLine(entry, today, language) })),
      askCounts: askCountsText(askCounts(asks), language),
      hasTold: told !== null,
      compare: rows.map((row) => {
        const difference = askDifferenceText(row, language);
        return {
          key: row.key,
          fact: askQuestionShort(row.key, language),
          measured: measured === null ? "UNKNOWN" : measureFactValue(measured, row.key, language),
          told: told === null ? "UNKNOWN" : measureFactValue(told, row.key, language),
          note: difference === "" ? askCompareLabel(row.kind, language) : `${askCompareLabel(row.kind, language)}. ${difference}`,
        };
      }),
      compareSummary: askCompareSummary(rows, language),
    },
  };
}

export interface AskFile {
  filename: string;
  mime: string;
  content: string;
}

/** The draft as a text file. Null when no question is chosen. */
export function draftFile(view: AskView, today: string, language: Language): AskFile | null {
  const letter = view.detail?.letter;
  if (letter === undefined || letter.text === "") return null;
  return { filename: askLetterFilename(letter.channel, today), mime: "text/plain", content: askLetterFileText(letter, language) };
}

/** The asks, the measures and what the place said for the observation on screen. Null when there is nothing to write. */
export function askSheetFile(data: AskData, view: AskView, today: string, language: Language): AskFile | null {
  const detail = view.detail;
  if (detail === null || (detail.asks.length === 0 && !detail.hasTold)) return null;
  const content = askSheetText({ place: detail.record, measured: measuresFor(data.measures, detail.record.id), told: measuresFor(data.told, detail.record.id), asks: detail.asks.map((row) => row.entry) }, today, language);
  return { filename: askSheetFilename(detail.record), mime: "text/plain", content };
}

/** Every ask for a saved observation as CSV. Null when there is none. */
export function asksCsvFile(data: AskData, today: string): AskFile | null {
  const ids = new Set(data.records.map((record) => record.id));
  const entries = data.log.entries.filter((entry) => ids.has(entry.recordId));
  if (entries.length === 0) return null;
  return { filename: asksCsvFilename(today), mime: "text/csv", content: asksCsv(data.records, entries, today) };
}
