/**
 * Text the person copies or downloads to take to an editor. Pure.
 * The tag text lists, for each place, the position and the tag lines. A status
 * that is UNKNOWN has no tag line. Nothing here is sent anywhere.
 */
import { changesetLines, changesetTags } from './changeset.js';
import { formatCoordinate } from './coords.js';
import { ACCEPTED_LICENCES, licenceNote, isAcceptedLicence } from './licence.js';
import type { BatchReview, ReviewRecord } from './review.js';
import { SEVERITY_LABEL, issueText, summaryText } from './review.js';
import { tagLines, tagsFor } from './tags.js';
import type { ReviewLang } from './text.js';
import { colon, fill, pick } from './text.js';

/** Places in the order given, with a heading, the position, and the tag lines. */
export function tagText(records: readonly ReviewRecord[], lang: ReviewLang): string {
  const lines: string[] = [];
  records.forEach((record, index) => {
    const label = (record.name ?? '').trim() === '' ? pick(lang, 'Place without a name', 'Lieu sans nom') : (record.name ?? '').trim();
    lines.push(`## ${index + 1}. ${label}`);
    lines.push(
      `${pick(lang, 'Position', 'Position')}${colon(lang)}${formatCoordinate(record.lat, 6, lang)}, ${formatCoordinate(record.lon, 6, lang)}`,
    );
    lines.push(`${pick(lang, 'Licence', 'Licence')}${colon(lang)}${record.licence}`);
    const tags = tagLines(tagsFor(record));
    if (tags.length === 0) lines.push(pick(lang, '(no tags to write)', '(aucune balise à écrire)'));
    else lines.push(...tags);
    if (record.wheelchair === 'UNKNOWN') {
      lines.push(pick(lang, 'Access status: UNKNOWN, so no access tag is written.', 'Statut d’accès\u00a0: UNKNOWN, donc aucune balise d’accès n’est écrite.'));
    }
    lines.push('');
  });
  return lines.join('\n');
}

/** The licence notes for the licences the given records use, in a fixed order. */
export function licenceSection(records: readonly ReviewRecord[], lang: ReviewLang): string[] {
  const used = ACCEPTED_LICENCES.filter((id) => records.some((r) => r.licence === id));
  const lines: string[] = [];
  for (const id of used) {
    const note = licenceNote(id, lang);
    lines.push(`${note.name}`, `  ${note.summary}`, `  ${note.whatItMeans}`);
  }
  if (records.some((r) => !isAcceptedLicence(r.licence))) {
    lines.push(pick(lang, 'Some records use a licence the App does not accept.', 'Certains enregistrements utilisent une licence que l’application n’accepte pas.'));
  }
  return lines;
}

/** Full text for a download: the review, then the changeset, then the tags. */
export function handoffText(
  records: readonly ReviewRecord[],
  batch: BatchReview,
  today: string,
  lang: ReviewLang,
): string {
  const lines: string[] = [];
  lines.push(pick(lang, 'Draft for my own OpenStreetMap submission', 'Brouillon pour ma propre soumission à OpenStreetMap'));
  lines.push(`${pick(lang, 'Prepared on', 'Préparé le')} ${today}`);
  lines.push(pick(lang, 'This file was made on this device. Nothing was sent. I submit it myself.', 'Ce fichier a été fait sur cet appareil. Rien n’a été envoyé. Je le soumets moi-même.'));
  lines.push('', summaryText(batch, lang), '');

  const byId = new Map(records.map((r) => [r.id, r] as const));
  for (const review of batch.records) {
    if (review.issues.length === 0) continue;
    const record = byId.get(review.id);
    const name = (record?.name ?? '').trim();
    lines.push(`${review.id}${name === '' ? '' : ` (${name})`}`);
    for (const entry of review.issues) lines.push(`  - ${SEVERITY_LABEL[lang][entry.severity]}${colon(lang)}${issueText(entry, lang)}`);
  }
  if (batch.records.some((r) => r.issues.length > 0)) lines.push('');

  const submittable = records.filter((r) => batch.records.find((b) => b.id === r.id)?.canSubmit === true);
  const tags = changesetTags(submittable, lang);
  if (tags !== null) {
    lines.push(pick(lang, '# Changeset', '# Lot de modifications'), ...changesetLines(tags), '');
  }
  lines.push(pick(lang, '# Licence', '# Licence'), ...licenceSection(submittable, lang), '');
  lines.push(pick(lang, '# Places', '# Lieux'));
  lines.push(
    submittable.length === 0
      ? pick(lang, 'No observation is ready yet.', 'Aucune observation n’est prête pour l’instant.')
      : fill(pick(lang, '{count} with nothing to fix first.', '{count} sans rien à corriger d’abord.'), { count: submittable.length }),
  );
  lines.push('', tagText(submittable, lang));
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

/** A spreadsheet cell that starts with = + - @ tab or CR is read as a formula, so it gets a leading quote. */
export function csvCell(value: string): string {
  const safe = /^[=+@\t\r]/.test(value) || /^-(?!\d)/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** One row per issue. Numbers are not touched, so a negative number stays a number. */
export function issuesCsv(batch: BatchReview, lang: ReviewLang): string {
  const head = pick(lang, ['id', 'severity', 'note'], ['id', 'gravité', 'note']);
  const rows: string[] = [head.join(',')];
  for (const review of batch.records) {
    for (const entry of review.issues) {
      rows.push([csvCell(review.id), csvCell(entry.severity), csvCell(issueText(entry, lang))].join(','));
    }
  }
  return `${rows.join('\r\n')}\r\n`;
}
