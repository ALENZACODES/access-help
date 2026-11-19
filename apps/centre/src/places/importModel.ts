/**
 * Builds what the sheet screen shows, and saves the confirmed lines. The reading and the
 * plan are pure; saving goes through the same draft store the contribution form uses, so the
 * export rules run again on every read. Nothing leaves the device.
 */
import {
  planSheetImport,
  readSheet,
  recordsSheet,
  sheetActionLabel,
  sheetFailureText,
  sheetMissingColumnsText,
  sheetPlanSummaryText,
  sheetProvenanceLine,
  sheetRepeatedColumnsText,
  sheetRowIssueText,
  sheetRowNoteText,
  sheetTemplateFilename,
  sheetTierNoteText,
  sheetUnkeptColumnsText,
  templateSheet,
  type SheetImportPlan,
  type SheetPlanAction,
} from "./docs-bridge.js";
import { importText, type ImportKey } from "./importStrings.js";
import { MAX_DRAFTS, type DraftStore } from "./store.js";
import type { Language, PlaceRecord } from "./types.js";

export interface ImportLine {
  line: number;
  name: string | null;
  action: SheetPlanAction | "rejected";
  actionLabel: string;
  /** Problems that keep the line out. Empty for a line that can be saved. */
  problems: string[];
  /** Things the person should know about a line that is kept. */
  notes: string[];
  /** Source, licence, date and tier. Null for a rejected line. */
  provenance: string | null;
  status: string | null;
  /** Names of the fields that differ from the saved observation, for a replace. */
  changed: string[];
}

export type ImportView =
  | { kind: "problem"; messages: string[] }
  | {
      kind: "ready";
      summary: string;
      sheetNotes: string[];
      lines: ImportLine[];
      plan: SheetImportPlan;
      saveCount: number;
    };

const CHANGED_KEYS: Record<string, ImportKey> = {
  lat: "field.lat",
  lon: "field.lon",
  name: "field.name",
  wheelchair: "field.wheelchair",
  source: "field.source",
  licence: "field.licence",
  observedOn: "field.observedOn",
  id: "field.id",
};

export function buildImportView(text: string, saved: readonly PlaceRecord[], today: string, language: Language): ImportView {
  const read = readSheet(text, today);
  if (!read.ok) {
    if (read.reason === "file") return { kind: "problem", messages: [sheetFailureText(read.code, language)] };
    return {
      kind: "problem",
      messages: [sheetMissingColumnsText(read.headers.missing, language), sheetUnkeptColumnsText(read.headers.unkept, language)].filter((m) => m !== ""),
    };
  }
  const plan = planSheetImport(read.rows, saved, MAX_DRAFTS);
  const planned = new Map(plan.items.map((item) => [item.line, item] as const));
  const lines: ImportLine[] = read.rows.map((row) => {
    if (!row.ok) {
      return {
        line: row.line,
        name: row.name === "" ? null : row.name,
        action: "rejected",
        actionLabel: sheetActionLabel("rejected", language),
        problems: row.issues.map((issue) => sheetRowIssueText(issue, language)),
        notes: [],
        provenance: null,
        status: null,
        changed: [],
      };
    }
    const item = planned.get(row.line);
    const action = item?.action ?? "same";
    return {
      line: row.line,
      name: row.record.name,
      action,
      actionLabel: sheetActionLabel(action, language),
      problems: [],
      notes: row.notes.map((note) => sheetRowNoteText(note, language)),
      provenance: sheetProvenanceLine(row.record, language),
      status: row.record.wheelchair,
      changed: (item?.changed ?? []).map((field) => importText(language, CHANGED_KEYS[field] ?? "field.id")),
    };
  });
  const sheetNotes = [
    sheetTierNoteText(read.headers.hasTier, language),
    sheetUnkeptColumnsText(read.headers.unkept, language),
    sheetRepeatedColumnsText(read.headers.repeated, language),
  ].filter((m) => m !== "");
  return { kind: "ready", summary: sheetPlanSummaryText(plan.counts, language), sheetNotes, lines, plan, saveCount: plan.toSave.length };
}

/** Lines to show: all, or only those that will not be saved. */
export function visibleLines(lines: readonly ImportLine[], onlyProblems: boolean): ImportLine[] {
  return onlyProblems ? lines.filter((line) => line.action === "rejected" || line.action === "over-limit") : [...lines];
}

export type SaveOutcome = { kind: "saved"; count: number } | { kind: "partly"; count: number } | { kind: "failed" };

/** Saves the planned lines one by one and stops at the first one the device refuses. */
export function saveImport(store: Pick<DraftStore, "add">, plan: SheetImportPlan): SaveOutcome {
  let count = 0;
  for (const record of plan.toSave) {
    const result = store.add(record as PlaceRecord);
    if (!result.ok) return count === 0 ? { kind: "failed" } : { kind: "partly", count };
    count += 1;
  }
  return { kind: "saved", count };
}

export interface ImportFile {
  filename: string;
  mime: string;
  content: string;
}

export function templateFile(today: string, language: Language): ImportFile {
  return { filename: sheetTemplateFilename(language), mime: "text/csv", content: templateSheet(language, today) };
}

export function savedSheetFile(saved: readonly PlaceRecord[], today: string, language: Language): ImportFile {
  return { filename: `my-observations-${today}.csv`, mime: "text/csv", content: recordsSheet(saved, language) };
}
