/**
 * Builds what the sitting screen shows from the person's saved observations, their list of
 * what they said they added, and the sitting under way. Pure: the language and the day come in
 * as arguments and nothing here reads the clock or storage.
 */
import {
  SIT_ORDERS,
  buildSitQueue,
  osmChangesetText,
  osmHeldBack,
  osmHeldBackText,
  osmRecordLine,
  osmTagText,
  osmTagsFor,
  sitAddedGroups,
  sitAtSummary,
  sitCannotSeeText,
  sitCountsText,
  sitCurrentId,
  sitFirstOpen,
  sitGroupHeading,
  sitGroupNotes,
  sitLeftOutLines,
  sitMetresToNext,
  sitNextStopText,
  sitOrderHint,
  sitOrderLabel,
  sitOutcomeText,
  sitPositionText,
  sitReadyText,
  sitRestText,
  sittingCounts,
  sittingCsv,
  sittingFilename,
  sittingText,
  type Ledger,
  type SitOrder,
  type SitOutcome,
  type SitQueue,
  type Sitting,
} from "./docs-bridge.js";
import { sittingStringText } from "./sittingStrings.js";
import type { Language, PlaceRecord } from "./types.js";

export function sittingName(record: Pick<PlaceRecord, "name">, language: Language): string {
  return record.name === null || record.name.trim() === "" ? sittingStringText(language, "unnamed") : record.name.trim();
}

export interface StartView {
  queue: SitQueue;
  ready: string;
  leftOut: string[];
  orders: { id: SitOrder; label: string; hint: string }[];
  canStart: boolean;
}

/** What a person sees before a sitting: how many observations are ready and why the others are not. */
export function buildStartView(records: readonly PlaceRecord[], ledger: Ledger, order: SitOrder, language: Language): StartView {
  const marked = new Set(ledger.entries.map((entry) => entry.recordId));
  const queue = buildSitQueue(records, marked, order);
  return {
    queue,
    ready: sitReadyText(queue.ids.length, queue.overflow, language),
    leftOut: sitLeftOutLines(queue.leftOut, language),
    orders: SIT_ORDERS.map((id) => ({ id, label: sitOrderLabel(id, language), hint: sitOrderHint(id, language) })),
    canStart: queue.ids.length > 0,
  };
}

export interface ItemView {
  record: PlaceRecord;
  name: string;
  position: string;
  recordLine: string;
  tags: string;
  heldBack: string[];
  nextStop: string;
  outcome: SitOutcome | null;
  outcomeText: string;
}

export interface SummaryRow {
  id: string;
  index: number;
  name: string;
  outcome: string;
  record: string;
  hasOutcome: boolean;
}

export interface GroupView {
  key: string;
  heading: string;
  draft: string;
  notes: string[];
}

export interface SittingView {
  cannotSee: string;
  rest: string;
  counts: string;
  atSummary: boolean;
  /** Null at the summary, or when the observation on screen is no longer saved. */
  item: ItemView | null;
  rows: SummaryRow[];
  groups: GroupView[];
  firstOpen: number | null;
  isFirst: boolean;
}

export function buildSittingView(sitting: Sitting, records: readonly PlaceRecord[], language: Language): SittingView {
  const byId = new Map(records.map((record) => [record.id, record]));
  const id = sitCurrentId(sitting);
  const record = id === null ? undefined : byId.get(id);
  const outcome = id === null ? undefined : sitting.outcomes[id];
  const item: ItemView | null =
    record === undefined
      ? null
      : {
          record,
          name: sittingName(record, language),
          position: sitPositionText(sitting.at, sitting.ids.length, language),
          recordLine: osmRecordLine(record, language),
          tags: osmTagText(osmTagsFor(record)),
          heldBack: osmHeldBack(record).map((kind) => osmHeldBackText(kind, language)),
          nextStop: sitNextStopText(sitMetresToNext(sitting.ids, sitting.at, records), language),
          outcome: outcome ?? null,
          outcomeText: sitOutcomeText(outcome, language),
        };
  const rows: SummaryRow[] = [];
  sitting.ids.forEach((rowId, index) => {
    const saved = byId.get(rowId);
    if (saved === undefined) return;
    rows.push({
      id: rowId,
      index,
      name: sittingName(saved, language),
      outcome: sitOutcomeText(sitting.outcomes[rowId], language),
      record: osmRecordLine(saved, language),
      hasOutcome: sitting.outcomes[rowId] !== undefined,
    });
  });
  return {
    cannotSee: sitCannotSeeText(language),
    rest: sitRestText(language),
    counts: sitCountsText(sittingCounts(sitting), language),
    atSummary: sitAtSummary(sitting),
    item,
    rows,
    groups: sitAddedGroups(sitting, records, language).map((group) => ({
      key: group.changeset ?? "none",
      heading: sitGroupHeading(group, language),
      draft: osmChangesetText(group.draft),
      notes: sitGroupNotes(group, language),
    })),
    firstOpen: sitFirstOpen(sitting),
    isFirst: sitting.at === 0,
  };
}

export interface SittingFile {
  filename: string;
  mime: string;
  content: string;
}

export function sittingFile(kind: "txt" | "csv", sitting: Sitting, records: readonly PlaceRecord[], language: Language): SittingFile {
  return kind === "txt"
    ? { filename: sittingFilename(sitting, "txt"), mime: "text/plain", content: sittingText(sitting, records, language) }
    : { filename: sittingFilename(sitting, "csv"), mime: "text/csv", content: sittingCsv(sitting, records) };
}
