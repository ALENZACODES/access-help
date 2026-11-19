/** Puts the sharing plan together and writes it out as a plain text file. */
import { buildChecklist, checklistLines, keepTicks, type CheckId, type CheckItem } from './checklist.js';
import { checklistProgress, leftOutLines, partDutyLines, partHeading, partSourcesText, sourceRowText, splitAdvice, splitKindLabel } from './messages.js';
import { buildNotice, type Notice, type NoticeForm } from './notice.js';
import { sourceRows, statusCountsOf, type PlanRecord, type SourceRow, type StatusCounts } from './sources.js';
import { splitPlan, type SplitPlan } from './split.js';
import { mixOf, mixSummaryText, notAdviceText, type Mix } from '../licence-guide/index.js';
import { pick, type PreLang } from '../presubmit/text.js';

export interface SharePlan {
  mix: Mix;
  rows: SourceRow[];
  statuses: StatusCounts;
  split: SplitPlan;
  notice: Notice;
  checklist: CheckItem[];
}

export function buildSharePlan(records: readonly PlanRecord[], lang: PreLang, form: NoticeForm = 'short'): SharePlan {
  const mix = mixOf(records);
  const split = splitPlan(records);
  return { mix, rows: sourceRows(records), statuses: statusCountsOf(records), split, notice: buildNotice(records, lang, form), checklist: buildChecklist(mix, split, lang) };
}

export function sharePlanText(plan: SharePlan, done: readonly CheckId[], today: string, lang: PreLang): string {
  const lines: string[] = [pick(lang, `Sharing plan, ${today}`, `Plan de partage, ${today}`), notAdviceText(lang), '', mixSummaryText(plan.mix, lang)];
  if (plan.rows.length > 0) {
    lines.push('', pick(lang, 'Sources', 'Sources'));
    for (const row of plan.rows) lines.push(`- ${sourceRowText(row, lang)}`);
  }
  lines.push('', splitKindLabel(plan.split.kind, lang), splitAdvice(plan.split.kind, lang));
  for (const part of plan.split.parts) {
    lines.push('', partHeading(part, lang), partSourcesText(part, lang));
    for (const duty of partDutyLines(part, lang)) lines.push(`- ${duty}`);
  }
  const leftOut = leftOutLines(plan.split, lang);
  if (leftOut.length > 0) lines.push('', ...leftOut);
  if (plan.notice.text !== '') lines.push('', pick(lang, 'Notice', 'Avis'), plan.notice.text);
  if (plan.checklist.length > 0) {
    const ticks = keepTicks(done, plan.checklist);
    lines.push('', pick(lang, 'Before sharing', 'Avant de partager'), ...checklistLines(plan.checklist, ticks), checklistProgress(ticks, plan.checklist, lang));
  }
  return `${lines.join('\n')}\n`;
}

export function sharePlanFilename(today: string): string {
  return `sharing-plan-${today}.txt`;
}
