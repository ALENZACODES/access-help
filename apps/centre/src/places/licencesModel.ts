/**
 * Builds what the licence screen shows from the person's saved observations, the records in the
 * packs on this device, the chosen scope, the notice length and the person's ticks. Pure: the
 * language comes in as an argument and nothing here reads the clock or storage.
 */
import {
  buildLicenceGuide,
  buildSharePlan,
  keepShareTicks,
  licenceGuideFilename,
  licenceGuideText,
  serializePack,
  buildPackManifest,
  shareChecklistProgress,
  shareCreditAskedText,
  shareLeftOutLines,
  shareNoticeFilename,
  shareNoticeHint,
  sharePartDutyLines,
  sharePartFileStem,
  sharePartFor,
  sharePartHeading,
  sharePartRecords,
  sharePartSourcesText,
  sharePlanFilename,
  sharePlanText,
  shareScopeCountText,
  shareSourceName,
  shareSourceRowText,
  shareSourcesCsv,
  shareSourcesCsvFilename,
  shareSpanText,
  shareSplitAdvice,
  shareSplitKindLabel,
  shareStatusCountsText,
  type LicenceGuide,
  type ShareCheckId,
  type ShareNoticeForm,
  type SharePlan,
} from "./docs-bridge.js";
import type { Language, PlaceRecord } from "./types.js";

export const LICENCE_SCOPES = ["mine", "packs", "both"] as const;
export type LicenceScope = (typeof LICENCE_SCOPES)[number];

export function isLicenceScope(value: string): value is LicenceScope {
  return (LICENCE_SCOPES as readonly string[]).includes(value);
}

/**
 * The records for a scope. With both, a person's own observation comes first and a pack record
 * with the same id is left out, so no record is counted twice.
 */
export function recordsFor(scope: LicenceScope, mine: readonly PlaceRecord[], packs: readonly PlaceRecord[]): PlaceRecord[] {
  if (scope === "mine") return [...mine];
  if (scope === "packs") return [...packs];
  const seen = new Set(mine.map((record) => record.id));
  return [...mine, ...packs.filter((record) => !seen.has(record.id))];
}

/** Opens on a person's own observations when there are any, otherwise on the packs. */
export function startScope(mine: readonly PlaceRecord[], packs: readonly PlaceRecord[]): LicenceScope {
  return mine.length === 0 && packs.length > 0 ? "packs" : "mine";
}

export interface SourceRowView {
  key: string;
  source: string;
  licence: string;
  accepted: boolean;
  count: number;
  seen: string;
  statuses: string;
  credit: string;
  sentence: string;
}

export interface PartView {
  licence: string;
  heading: string;
  sources: string;
  duties: string[];
}

export interface LicencesView {
  scope: LicenceScope;
  records: PlaceRecord[];
  scopeCounts: Record<LicenceScope, string>;
  guide: LicenceGuide;
  plan: SharePlan;
  rows: SourceRowView[];
  splitLabel: string;
  splitAdvice: string;
  parts: PartView[];
  leftOut: string[];
  noticeHint: string;
  ticks: ShareCheckId[];
  progress: string;
}

export function buildLicencesView(
  mine: readonly PlaceRecord[],
  packs: readonly PlaceRecord[],
  scope: LicenceScope,
  form: ShareNoticeForm,
  done: readonly ShareCheckId[],
  language: Language,
): LicencesView {
  const records = recordsFor(scope, mine, packs);
  const guide = buildLicenceGuide(records, language);
  const plan = buildSharePlan(records, language, form);
  const ticks = keepShareTicks(done, plan.checklist);
  const count = (which: LicenceScope) => shareScopeCountText(recordsFor(which, mine, packs).length, language);
  return {
    scope,
    records,
    scopeCounts: { mine: count("mine"), packs: count("packs"), both: count("both") },
    guide,
    plan,
    rows: plan.rows.map((row) => ({
      key: `${row.licence}\n${row.source.toLowerCase()}`,
      source: shareSourceName(row, language),
      licence: row.licence,
      accepted: row.accepted,
      count: row.count,
      seen: shareSpanText(row.from, row.to, language),
      statuses: shareStatusCountsText(row.statuses, language),
      credit: shareCreditAskedText(row, language),
      sentence: shareSourceRowText(row, language),
    })),
    splitLabel: shareSplitKindLabel(plan.split.kind, language),
    splitAdvice: shareSplitAdvice(plan.split.kind, language),
    parts: plan.split.parts.map((part) => ({
      licence: part.licence,
      heading: sharePartHeading(part, language),
      sources: sharePartSourcesText(part, language),
      duties: sharePartDutyLines(part, language),
    })),
    leftOut: shareLeftOutLines(plan.split, language),
    noticeHint: shareNoticeHint(plan.notice, language),
    ticks,
    progress: shareChecklistProgress(ticks, plan.checklist, language),
  };
}

export type LicencesFileKind = "guide" | "plan" | "sources" | "notice";

export interface LicencesFile {
  filename: string;
  mime: string;
  content: string;
}

/** Null when there is nothing to put in the file. */
export function licencesFile(kind: LicencesFileKind, view: LicencesView, today: string, language: Language): LicencesFile | null {
  if (view.records.length === 0) return null;
  if (kind === "guide") return { filename: licenceGuideFilename(today), mime: "text/plain", content: licenceGuideText(view.guide, today, language) };
  if (kind === "plan") return { filename: sharePlanFilename(today), mime: "text/plain", content: sharePlanText(view.plan, view.ticks, today, language) };
  if (kind === "sources") return { filename: shareSourcesCsvFilename(today), mime: "text/csv", content: shareSourcesCsv(view.plan.rows) };
  if (view.plan.notice.text === "") return null;
  return { filename: shareNoticeFilename(view.plan.notice.form, today), mime: "text/plain", content: `${view.plan.notice.text}\n` };
}

/**
 * A pack file with the records of one licence. Null when the plan has no part for that licence.
 * Records with no source or under a licence the App does not take are never in it.
 */
export function partFile(licence: string, view: LicencesView, today: string): LicencesFile | null {
  const part = sharePartFor(view.plan.split, licence);
  if (part === null) return null;
  const records = sharePartRecords(view.records, part);
  if (records.length === 0) return null;
  const stem = sharePartFileStem(part, today);
  return { filename: `${stem}.json`, mime: "application/json", content: serializePack(records, buildPackManifest(stem, records, today)) };
}
