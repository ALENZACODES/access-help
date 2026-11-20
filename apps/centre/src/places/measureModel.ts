/**
 * Builds what the measuring page shows from the person's saved observations, their measures
 * and the chosen observation. Pure: the language and the day come in as arguments and nothing
 * here reads the clock or storage.
 */
import {
  MEASURE_FACT_KEYS,
  describeMeasures,
  emptyMeasureForm,
  measureDescriptionNote,
  measureFactLabel,
  measureFactValue,
  measureFormFrom,
  measureMethodText,
  measureNoJudgmentText,
  measurePlaceLine,
  measureSheetFilename,
  measureSheetText,
  measureStillUnknownText,
  measureTagText,
  measureTags,
  measureTagsNoteText,
  measuredCountText,
  measuresCsv,
  measuresCsvFilename,
  measuresFor,
  type MeasureBook,
  type MeasureForm,
  type Measures,
} from "./docs-bridge.js";
import { measureText } from "./measureStrings.js";
import type { Language, PlaceRecord } from "./types.js";

export function measureName(record: Pick<PlaceRecord, "name">, language: Language): string {
  return record.name === null || record.name.trim() === "" ? measureText(language, "unnamed") : record.name.trim();
}

const newestFirst = (a: PlaceRecord, b: PlaceRecord) => b.observedOn.localeCompare(a.observedOn) || a.id.localeCompare(b.id);

/** Opens on the newest observation with no measures yet, or the newest of all when every one has some. */
export function startMeasureId(records: readonly PlaceRecord[], book: MeasureBook): string | null {
  const sorted = [...records].sort(newestFirst);
  return (sorted.find((record) => measuresFor(book, record.id) === null) ?? sorted[0])?.id ?? null;
}

export interface MeasureOption {
  id: string;
  label: string;
}

export function measureOptions(records: readonly PlaceRecord[], book: MeasureBook, language: Language): MeasureOption[] {
  return [...records].sort(newestFirst).map((record) => ({
    id: record.id,
    label: measureText(language, measuresFor(book, record.id) === null ? "optionLabel" : "optionMeasured", { name: measureName(record, language), day: record.observedOn }),
  }));
}

/** The form for an observation: its saved measures, or an empty form dated today. */
export function formFor(record: Pick<PlaceRecord, "id">, book: MeasureBook, today: string, language: Language): MeasureForm {
  const saved = measuresFor(book, record.id);
  return saved === null ? emptyMeasureForm(today) : measureFormFrom(saved, language === "fr" ? "," : ".");
}

export interface SavedView {
  measures: Measures;
  measuredLine: string;
  facts: { key: string; label: string; value: string }[];
  stillUnknown: string;
  description: string;
  descriptionNote: string;
  tags: string;
}

export interface MeasureDetail {
  record: PlaceRecord;
  name: string;
  placeLine: string;
  /** Null when no measures are saved for this observation. */
  saved: SavedView | null;
}

export interface MeasureView {
  options: MeasureOption[];
  chosenId: string | null;
  counts: string;
  noJudgment: string;
  tagsNote: string;
  /** Null when there is no observation to show. */
  detail: MeasureDetail | null;
}

export function buildMeasureView(records: readonly PlaceRecord[], book: MeasureBook, chosenId: string | null, language: Language): MeasureView {
  const ids = new Set(records.map((record) => record.id));
  const record = records.find((entry) => entry.id === chosenId) ?? null;
  const base = {
    options: measureOptions(records, book, language),
    counts: measuredCountText(book.entries.filter((entry) => ids.has(entry.recordId)).length, records.length, language),
    noJudgment: measureNoJudgmentText(language),
    tagsNote: measureTagsNoteText(language),
  };
  if (record === null) return { ...base, chosenId: null, detail: null };
  const measures = measuresFor(book, record.id);
  let saved: SavedView | null = null;
  if (measures !== null) {
    const description = describeMeasures(measures, language);
    saved = {
      measures,
      measuredLine: measures.method === null ? measureText(language, "measuredLineNoMethod", { day: measures.measuredOn }) : measureText(language, "measuredLine", { day: measures.measuredOn, method: measureMethodText(measures, language) }),
      facts: MEASURE_FACT_KEYS.map((key) => ({ key, label: measureFactLabel(key, language), value: measureFactValue(measures, key, language) })),
      stillUnknown: measureStillUnknownText(measures, language),
      description: description.text,
      descriptionNote: measureDescriptionNote(description, language),
      tags: measureTagText(measureTags(measures, language)),
    };
  }
  return { ...base, chosenId: record.id, detail: { record, name: measureName(record, language), placeLine: measurePlaceLine(record, language), saved } };
}

export interface MeasureFile {
  filename: string;
  mime: string;
  content: string;
}

/** The sheet for the observation on screen. Null when it has no saved measures. */
export function measureSheetFile(view: MeasureView, language: Language): MeasureFile | null {
  const detail = view.detail;
  if (detail === null || detail.saved === null) return null;
  return { filename: measureSheetFilename(detail.record), mime: "text/plain", content: measureSheetText(detail.record, detail.saved.measures, language) };
}

/** Every measured observation as CSV. Null when nothing is measured. */
export function measuresCsvFile(records: readonly PlaceRecord[], book: MeasureBook, today: string): MeasureFile | null {
  const ids = new Set(records.map((record) => record.id));
  const entries = book.entries.filter((entry) => ids.has(entry.recordId));
  if (entries.length === 0) return null;
  return { filename: measuresCsvFilename(today), mime: "text/csv", content: measuresCsv(records, entries) };
}
