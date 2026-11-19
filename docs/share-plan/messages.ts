/** Words for the source table, the split into files and the checklist. English and French. */
import type { CheckId, CheckItem } from './checklist.js';
import { leftToDo } from './checklist.js';
import type { SourceRow, StatusCounts } from './sources.js';
import type { SplitKind, SplitPart, SplitPlan } from './split.js';
import { dutyText } from '../licence-guide/index.js';
import { colon, fill, joinList, pick, plural, type PreLang } from '../presubmit/text.js';

const SEMI: Record<PreLang, string> = { en: '; ', fr: '\u202f; ' };

function recordsWord(lang: PreLang, n: number): string {
  return plural(lang, n, pick(lang, 'record', 'fiche'), pick(lang, 'records', 'fiches'));
}

/** "yes: 1; limited: 0; no: 2; UNKNOWN: 3". The status words are the stored values and are not translated. */
export function statusCountsText(counts: StatusCounts, lang: PreLang): string {
  const c = colon(lang);
  return [`yes${c}${counts.yes}`, `limited${c}${counts.limited}`, `no${c}${counts.no}`, `UNKNOWN${c}${counts.unknown}`].join(SEMI[lang]);
}

export function sourceName(row: Pick<SourceRow, 'source'>, lang: PreLang): string {
  return row.source === '' ? pick(lang, 'No source written', 'Aucune source inscrite') : row.source;
}

export function spanText(from: string, to: string, lang: PreLang): string {
  return from === to ? from : fill(pick(lang, '{from} to {to}', 'du {from} au {to}'), { from, to });
}

export function creditAskedText(row: Pick<SourceRow, 'accepted' | 'creditAsked'>, lang: PreLang): string {
  if (!row.accepted) return pick(lang, 'Cannot be said', 'Impossible à dire');
  return row.creditAsked ? pick(lang, 'Asked', 'Demandée') : pick(lang, 'Not required', 'Non exigée');
}

/** One row as a sentence, for a text file or a screen reader. */
export function sourceRowText(row: SourceRow, lang: PreLang): string {
  const c = colon(lang);
  const licence = row.accepted ? row.licence : `${row.licence}${pick(lang, ' (the App does not take this licence)', ' (l’application ne prend pas cette licence)')}`;
  return [
    `${sourceName(row, lang)}.`,
    `${pick(lang, 'Licence', 'Licence')}${c}${licence}.`,
    `${pick(lang, 'Records', 'Fiches')}${c}${row.count}.`,
    `${pick(lang, 'Seen', 'Vu')}${c}${spanText(row.from, row.to, lang)}.`,
    `${pick(lang, 'Status', 'État')} - ${statusCountsText(row.statuses, lang)}.`,
    `${pick(lang, 'Credit', 'Mention')}${c}${creditAskedText(row, lang).toLowerCase()}.`,
    `${pick(lang, 'Tier', 'Niveau')}${c}UNKNOWN.`,
  ].join(' ');
}

export function splitKindLabel(kind: SplitKind, lang: PreLang): string {
  switch (kind) {
    case 'nothing':
      return pick(lang, 'No record can go into a file yet', 'Aucune fiche ne peut encore aller dans un fichier');
    case 'one-file':
      return pick(lang, 'One file is enough', 'Un seul fichier suffit');
    case 'two-files':
      return pick(lang, 'Two files keep the duties apart', 'Deux fichiers gardent les obligations séparées');
  }
}

export function splitAdvice(kind: SplitKind, lang: PreLang): string {
  switch (kind) {
    case 'nothing':
      return pick(
        lang,
        'A record needs a source and a licence the App takes before it can go into a file.',
        'Une fiche a besoin d’une source et d’une licence que l’application prend avant d’aller dans un fichier.',
      );
    case 'one-file':
      return pick(lang, 'Every record that can be shared has the same licence, so there is nothing to split.', 'Toutes les fiches qui peuvent être partagées ont la même licence, donc il n’y a rien à séparer.');
    case 'two-files':
      return pick(
        lang,
        'In one file, everything is shared the way ODbL-1.0 asks. In two files, the CC0-1.0 records ask for nothing and only the ODbL-1.0 file carries duties. Both ways are open to you. The App does not pick for you.',
        'Dans un seul fichier, tout se partage comme le demande ODbL-1.0. Dans deux fichiers, les fiches CC0-1.0 ne demandent rien et seul le fichier ODbL-1.0 porte des obligations. Les deux façons vous sont ouvertes. L’application ne choisit pas pour vous.',
      );
  }
}

export function partHeading(part: SplitPart, lang: PreLang): string {
  return fill(pick(lang, '{licence} file: {n} {records}', 'Fichier {licence}\u00a0: {n} {records}'), { licence: part.licence, n: part.count, records: recordsWord(lang, part.count) });
}

export function partSourcesText(part: SplitPart, lang: PreLang): string {
  return `${pick(lang, 'Sources', 'Sources')}${colon(lang)}${joinList(part.sources, lang)}.`;
}

export function partDutyLines(part: SplitPart, lang: PreLang): string[] {
  if (part.duties.length === 0) return [pick(lang, 'Sharing this file asks for nothing.', 'Le partage de ce fichier ne demande rien.')];
  return part.duties.map((duty) => dutyText(duty, lang));
}

export function leftOutLines(plan: SplitPlan, lang: PreLang): string[] {
  const out: string[] = [];
  const c = colon(lang);
  if (plan.leftOutOther.length > 0) {
    out.push(`${pick(lang, 'Left out, licence the App does not take', 'Laissées de côté, licence que l’application ne prend pas')}${c}${plan.leftOutOther.length}.`);
  }
  if (plan.leftOutNoSource.length > 0) {
    out.push(`${pick(lang, 'Left out, no source written', 'Laissées de côté, aucune source inscrite')}${c}${plan.leftOutNoSource.length}.`);
  }
  return out;
}

export function checklistProgress(done: readonly CheckId[], items: readonly CheckItem[], lang: PreLang): string {
  if (items.length === 0) return pick(lang, 'There is nothing to share, so there is nothing on the list.', 'Il n’y a rien à partager, donc rien sur la liste.');
  const left = leftToDo(done, items);
  const head = `${pick(lang, 'Ticked', 'Cochés')}${colon(lang)}${items.length - left}. ${pick(lang, 'Not ticked', 'Non cochés')}${colon(lang)}${left}.`;
  return `${head} ${pick(lang, 'The ticks are yours. The App does not know what was done.', 'Les coches sont les vôtres. L’application ne sait pas ce qui a été fait.')}`;
}

export function scopeCountText(n: number, lang: PreLang): string {
  return `${n} ${recordsWord(lang, n)}`;
}
