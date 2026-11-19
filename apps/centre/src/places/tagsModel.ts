/**
 * Builds what the tag page shows from the person's saved observations, the chosen one and the
 * tags they pasted from the map. Pure: the language comes in as an argument and nothing here
 * reads the clock or storage.
 */
import {
  buildTagSheet,
  osmCautionText,
  osmChangesetNotes,
  osmComparisonSummary,
  osmDiffKindLabel,
  osmHasStatus,
  osmHeldBackText,
  osmNeverUploadsText,
  osmParsedNotes,
  osmProblemText,
  osmRecordLine,
  osmTagText,
  tagSheetFilename,
  tagSheetText,
  type OsmDiffKind,
  type OsmTag,
  type TagSheet,
} from "./docs-bridge.js";
import { tagsText } from "./tagsStrings.js";
import type { Language, PlaceRecord } from "./types.js";

export interface TagOption {
  id: string;
  label: string;
}

export interface CompareRow {
  key: string;
  mine: string | null;
  onMap: string | null;
  kind: OsmDiffKind;
  what: string;
}

export interface TagsDetail {
  sheet: TagSheet;
  name: string;
  recordLine: string;
  tags: OsmTag[];
  copyText: string;
  heldBack: string[];
  problems: string[];
  steps: string[];
  /** Null when nothing readable was pasted. */
  compare: { summary: string; rows: CompareRow[]; cautions: string[] } | null;
  pasteNotes: string[];
  comment: string;
  source: string;
  changesetNotes: string[];
}

export interface TagsView {
  options: TagOption[];
  chosenId: string | null;
  neverUploads: string;
  /** Null when there is no observation to show. */
  detail: TagsDetail | null;
}

function statusOf(record: PlaceRecord): string {
  return osmHasStatus(record) ? record.wheelchair : "UNKNOWN";
}

export function placeName(record: Pick<PlaceRecord, "name">, language: Language): string {
  return record.name === null || record.name.trim() === "" ? tagsText(language, "unnamed") : record.name.trim();
}

/** Opens on the newest observation that has a status, or the newest of all when none has. */
export function startId(records: readonly PlaceRecord[]): string | null {
  const newest = (list: readonly PlaceRecord[]) => [...list].sort((a, b) => b.observedOn.localeCompare(a.observedOn) || a.id.localeCompare(b.id))[0];
  return (newest(records.filter(osmHasStatus)) ?? newest(records))?.id ?? null;
}

/** Newest first, so the observation a person just made is at the top of the list. */
export function tagOptions(records: readonly PlaceRecord[], language: Language): TagOption[] {
  return [...records]
    .sort((a, b) => b.observedOn.localeCompare(a.observedOn) || a.id.localeCompare(b.id))
    .map((record) => ({ id: record.id, label: tagsText(language, "optionLabel", { name: placeName(record, language), day: record.observedOn, status: statusOf(record) }) }));
}

export function buildTagsView(records: readonly PlaceRecord[], chosenId: string | null, pastedText: string, language: Language): TagsView {
  const record = records.find((entry) => entry.id === chosenId) ?? null;
  const base = { options: tagOptions(records, language), neverUploads: osmNeverUploadsText(language) };
  if (record === null) return { ...base, chosenId: null, detail: null };
  const sheet = buildTagSheet(record, pastedText, language);
  return {
    ...base,
    chosenId: record.id,
    detail: {
      sheet,
      name: placeName(record, language),
      recordLine: osmRecordLine(record, language),
      tags: sheet.tags,
      copyText: osmTagText(sheet.tags),
      heldBack: sheet.heldBack.map((kind) => osmHeldBackText(kind, language)),
      problems: sheet.problems.map((problem) => osmProblemText(problem, language)),
      steps: sheet.steps.map((step) => step.text),
      compare:
        sheet.comparison === null
          ? null
          : {
              summary: osmComparisonSummary(sheet.comparison, language),
              rows: sheet.comparison.rows.map((row) => ({ ...row, what: osmDiffKindLabel(row.kind, language) })),
              cautions: sheet.comparison.cautions.map((caution) => osmCautionText(caution, language)),
            },
      pasteNotes: sheet.pasted === null ? [] : osmParsedNotes(sheet.pasted, language),
      comment: sheet.changeset.comment,
      source: sheet.changeset.source,
      changesetNotes: osmChangesetNotes(sheet.changeset, language),
    },
  };
}

export interface TagsFile {
  filename: string;
  mime: string;
  content: string;
}

/** Null when no observation is shown. */
export function tagsFile(view: TagsView, language: Language): TagsFile | null {
  if (view.detail === null) return null;
  return { filename: tagSheetFilename(view.detail.sheet.record), mime: "text/plain", content: tagSheetText(view.detail.sheet, language) };
}
