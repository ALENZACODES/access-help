/** Puts the tag page together for one observation and writes it out as a plain text sheet. */
import { changesetDraft, changesetText, type ChangesetDraft } from './changeset.js';
import { compareTags, type TagComparison } from './diff.js';
import { cautionText, changesetNotes, comparisonSummary, diffKindLabel, heldBackText, neverUploadsText, parsedNotes, problemText, recordLine } from './messages.js';
import { parseTagText, type ParsedTags } from './parse.js';
import { handSteps, type HandStep } from './steps.js';
import { heldBack, tagLine, tagProblems, tagsFor, type HeldBack, type OsmTag, type TagProblem, type TagRecord } from './tags.js';
import { pick, type PreLang } from '../presubmit/text.js';

export interface TagSheet {
  record: TagRecord;
  tags: OsmTag[];
  heldBack: HeldBack[];
  problems: TagProblem[];
  steps: HandStep[];
  changeset: ChangesetDraft;
  /** Null when nothing was pasted. */
  pasted: ParsedTags | null;
  /** Null when nothing readable was pasted. */
  comparison: TagComparison | null;
}

export function buildTagSheet(record: TagRecord, pastedText: string, lang: PreLang): TagSheet {
  const tags = tagsFor(record);
  const pasted = pastedText.trim() === '' ? null : parseTagText(pastedText);
  return {
    record,
    tags,
    heldBack: heldBack(record),
    problems: tagProblems(tags),
    steps: handSteps(record, lang),
    changeset: changesetDraft([record], lang),
    pasted,
    comparison: pasted === null || pasted.tags.length === 0 ? null : compareTags(tags, pasted.tags),
  };
}

export function tagSheetText(sheet: TagSheet, lang: PreLang): string {
  const title = sheet.record.name === null || sheet.record.name.trim() === '' ? pick(lang, 'Place without a name', 'Lieu sans nom') : sheet.record.name.trim();
  const lines: string[] = [pick(lang, `Tags to type by hand: ${title}`, `Balises à taper à la main\u00a0: ${title}`), recordLine(sheet.record, lang), neverUploadsText(lang), ''];
  lines.push(pick(lang, 'Tags', 'Balises'));
  if (sheet.tags.length === 0) lines.push(pick(lang, '(none)', '(aucune)'));
  for (const tag of sheet.tags) lines.push(tagLine(tag));
  for (const kind of sheet.heldBack) lines.push(`- ${heldBackText(kind, lang)}`);
  for (const problem of sheet.problems) lines.push(`! ${problemText(problem, lang)}`);
  lines.push('', pick(lang, 'Steps', 'Étapes'));
  sheet.steps.forEach((step, index) => lines.push(`${index + 1}. ${step.text}`));
  if (sheet.comparison !== null) {
    lines.push('', pick(lang, 'Beside the tags on the map', 'À côté des balises de la carte'), comparisonSummary(sheet.comparison, lang));
    for (const row of sheet.comparison.rows) lines.push(`- ${row.key} | ${row.mine ?? '-'} | ${row.onMap ?? '-'} | ${diffKindLabel(row.kind, lang)}`);
    for (const caution of sheet.comparison.cautions) lines.push(`! ${cautionText(caution, lang)}`);
  }
  if (sheet.pasted !== null) for (const note of parsedNotes(sheet.pasted, lang)) lines.push(`- ${note}`);
  const draft = changesetText(sheet.changeset);
  lines.push('', pick(lang, 'Changeset draft', 'Brouillon du lot de modifications'));
  if (draft !== '') lines.push(draft);
  for (const note of changesetNotes(sheet.changeset, lang)) lines.push(`- ${note}`);
  return `${lines.join('\n')}\n`;
}

/** A file name from the observation id, kept to letters, digits and dashes. */
export function tagSheetFilename(record: Pick<TagRecord, 'id'>): string {
  const safe = record.id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return `tags-${safe === '' ? 'observation' : safe}.txt`;
}
