/** Words for the list of a person's own observations. Every string exists in English and French. */
import type { FieldChange, NoteField } from './change.js';
import type { Step, UndoResult } from './history.js';
import type { MyNote, NotesSummary, Sort } from './organise.js';
import { colon, fill, pick, type PreLang } from '../presubmit/text.js';

export function noteFieldLabel(field: NoteField, lang: PreLang): string {
  switch (field) {
    case 'name':
      return pick(lang, 'Name', 'Nom');
    case 'wheelchair':
      return pick(lang, 'Status', 'État');
    case 'lat':
      return 'Latitude';
    case 'lon':
      return 'Longitude';
    case 'source':
      return 'Source';
    case 'licence':
      return 'Licence';
    case 'observedOn':
      return pick(lang, 'Date seen', 'Date d’observation');
  }
}

export function changeText(change: FieldChange, lang: PreLang): string {
  const none = pick(lang, 'none', 'aucun');
  return fill(pick(lang, '{field}: {before} becomes {after}', '{field}\u00a0: {before} devient {after}'), {
    field: noteFieldLabel(change.field, lang),
    before: change.before === '' ? none : change.before,
    after: change.after === '' ? none : change.after,
  });
}

export function observationWarning(lang: PreLang): string {
  return pick(
    lang,
    'This changes what was seen, where or when. Save it only if it is what you saw yourself.',
    'Ceci change ce qui a été vu, où ou quand. Enregistrez seulement si c’est ce que vous avez vu vous-même.',
  );
}

export function sortLabel(sort: Sort, lang: PreLang): string {
  switch (sort) {
    case 'newest':
      return pick(lang, 'Newest first', 'Les plus récentes d’abord');
    case 'oldest':
      return pick(lang, 'Oldest first', 'Les plus anciennes d’abord');
    case 'name':
      return pick(lang, 'By name', 'Par nom');
    case 'status':
      return pick(lang, 'By status, UNKNOWN first', 'Par état, UNKNOWN d’abord');
  }
}

/** Status, source, licence, date and tier for one note. A note carries no tier, so the tier is UNKNOWN. */
export function noteLine(note: MyNote, lang: PreLang): string {
  return fill(
    pick(
      lang,
      'Status: {status}. Source: {source}. Licence: {licence}. Seen on {date}. Tier: UNKNOWN.',
      'État\u00a0: {status}. Source\u00a0: {source}. Licence\u00a0: {licence}. Vu le {date}. Niveau\u00a0: UNKNOWN.',
    ),
    { status: note.wheelchair, source: note.source, licence: note.licence, date: note.observedOn },
  );
}

function countList(items: readonly { key: string; count: number }[], lang: PreLang): string {
  return items.map((item) => `${item.key}${colon(lang)}${item.count}`).join(pick(lang, '; ', '\u202f; '));
}

export function notesSummaryLines(summary: NotesSummary, lang: PreLang): string[] {
  if (summary.total === 0) return [pick(lang, 'You have no saved observations.', 'Vous n’avez aucune observation enregistrée.')];
  const lines = [
    `${pick(lang, 'Saved observations', 'Observations enregistrées')}${colon(lang)}${summary.total}.`,
    `${pick(lang, 'By status', 'Par état')} - ${countList(summary.byStatus, lang)}.`,
    `${pick(lang, 'By licence', 'Par licence')} - ${countList(summary.byLicence, lang)}.`,
    `${pick(lang, 'By month seen', 'Par mois d’observation')} - ${countList(summary.byMonth.slice(0, 6), lang)}.`,
  ];
  if (summary.oldest !== null && summary.newest !== null) {
    lines.push(fill(pick(lang, 'Seen from {oldest} to {newest}.', 'Vues du {oldest} au {newest}.'), { oldest: summary.oldest, newest: summary.newest }));
  }
  if (summary.unnamed > 0) lines.push(`${pick(lang, 'Without a name', 'Sans nom')}${colon(lang)}${summary.unnamed}.`);
  return lines;
}

export function shownText(shown: number, total: number, lang: PreLang): string {
  return fill(pick(lang, 'Showing {shown} of {total}.', 'Affichées\u00a0: {shown} sur {total}.'), { shown, total });
}

export function stepText(step: Step, lang: PreLang): string {
  if (step.kind === 'edit') {
    return fill(pick(lang, 'your edit of {name}', 'votre modification ({name})'), { name: step.before.name ?? pick(lang, 'a place without a name', 'lieu sans nom') });
  }
  return fill(pick(lang, 'your removal of {n}', 'votre retrait de {n}'), { n: step.removed.length });
}

export function undoResultText(result: UndoResult, lang: PreLang): string {
  if (result.undone === null) return pick(lang, 'There is nothing to take back.', 'Il n’y a rien à annuler.');
  const what = stepText(result.undone, lang);
  const head = fill(pick(lang, 'Took back {what}.', 'Annulé\u00a0: {what}.'), { what });
  if (result.notRestored === 0) return head;
  return `${head} ${pick(lang, 'Could not come back because the device list is full', 'Non revenues parce que la liste de l’appareil est pleine')}${colon(lang)}${result.notRestored}.`;
}
