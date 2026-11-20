/** Writes a sitting out as a plain text summary and as CSV. */
import { addedGroups } from './groups.js';
import { cannotSeeText, countsText, groupHeading, groupNotes, orderLabel, outcomeText } from './messages.js';
import { sessionCounts, type Outcome, type Session } from './session.js';
import { changesetText, coordText, type TagRecord } from '../osm-tags/index.js';
import { colon, pick, type PreLang } from '../presubmit/text.js';

function nameOf(record: TagRecord, lang: PreLang): string {
  return record.name === null || record.name.trim() === '' ? pick(lang, 'Place without a name', 'Lieu sans nom') : record.name.trim();
}

function statusOf(record: TagRecord): string {
  return ['yes', 'limited', 'no'].includes(record.wheelchair) ? record.wheelchair : 'UNKNOWN';
}

/** One line for an observation in the summary: name, outcome, then status, source, licence, date and tier. */
export function itemLine(record: TagRecord, outcome: Outcome | undefined, lang: PreLang): string {
  const c = colon(lang);
  return [
    `${nameOf(record, lang)}. ${outcomeText(outcome, lang)}.`,
    `${pick(lang, 'Status', 'État')}${c}${statusOf(record)}.`,
    `${pick(lang, 'Source', 'Source')}${c}${record.source.trim() === '' ? 'UNKNOWN' : record.source.trim()}.`,
    `${pick(lang, 'Licence', 'Licence')}${c}${record.licence}.`,
    `${pick(lang, 'Seen', 'Vu')}${c}${record.observedOn}.`,
    `${pick(lang, 'Tier', 'Niveau')}${c}UNKNOWN.`,
  ].join(' ');
}

export function sessionText(session: Session, records: readonly TagRecord[], lang: PreLang): string {
  const byId = new Map(records.map((record) => [record.id, record]));
  const lines: string[] = [
    pick(lang, `Adding by hand, sitting begun ${session.startedOn}`, `Ajout à la main, séance commencée le ${session.startedOn}`),
    cannotSeeText(lang),
    `${pick(lang, 'Order', 'Ordre')}${colon(lang)}${orderLabel(session.order, lang).toLowerCase()}.`,
    countsText(sessionCounts(session), lang),
    '',
  ];
  session.ids.forEach((id, index) => {
    const record = byId.get(id);
    if (record !== undefined) lines.push(`${index + 1}. ${itemLine(record, session.outcomes[id], lang)}`);
  });
  const groups = addedGroups(session, records, lang);
  for (const group of groups) {
    lines.push('', groupHeading(group, lang));
    const draft = changesetText(group.draft);
    if (draft !== '') lines.push(draft);
    for (const note of groupNotes(group, lang)) lines.push(`- ${note}`);
  }
  return `${lines.join('\n')}\n`;
}

export const SESSION_COLUMNS = ['position', 'id', 'name', 'outcome', 'skip_reason', 'changeset', 'status', 'source', 'licence', 'observed_on', 'tier', 'spot'] as const;

function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** The sitting as CSV. Column names and outcome words are plain ASCII so any spreadsheet can read them. */
export function sessionCsv(session: Session, records: readonly TagRecord[]): string {
  const byId = new Map(records.map((record) => [record.id, record]));
  const lines = [SESSION_COLUMNS.join(',')];
  session.ids.forEach((id, index) => {
    const record = byId.get(id);
    if (record === undefined) return;
    const outcome = session.outcomes[id];
    lines.push(
      [
        index + 1,
        record.id,
        record.name === null ? '' : record.name.trim(),
        outcome === undefined ? 'open' : outcome.kind === 'added' ? 'said-added' : outcome.kind,
        outcome?.kind === 'skipped' ? outcome.reason : '',
        outcome?.kind === 'added' && outcome.changeset !== null ? outcome.changeset : '',
        statusOf(record),
        record.source.trim(),
        record.licence,
        record.observedOn,
        'UNKNOWN',
        coordText(record),
      ]
        .map(csvCell)
        .join(','),
    );
  });
  return `${lines.join('\r\n')}\r\n`;
}

export function sessionFilename(session: Pick<Session, 'startedOn'>, extension: 'txt' | 'csv'): string {
  return `adding-by-hand-${session.startedOn}.${extension}`;
}
