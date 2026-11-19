/** Words for notes that may be the same place saved twice. Every string exists in English and French. */
import type { Advice, DuplicateReport, GroupKind } from './advise.js';
import type { Link, OwnNote } from './groups.js';
import { colon, fill, formatMetres, joinList, pick, type PreLang } from '../presubmit/text.js';

export function kindLabel(kind: GroupKind, lang: PreLang): string {
  switch (kind) {
    case 'same':
      return pick(lang, 'The same note saved more than once', 'La même note enregistrée plus d’une fois');
    case 'status-differs':
      return pick(lang, 'Your notes give different statuses', 'Vos notes donnent des états différents');
    case 'only-unknown-differs':
      return pick(lang, 'One note has a status, another is UNKNOWN', 'Une note a un état, une autre est UNKNOWN');
    case 'details-differ':
      return pick(lang, 'Same status, different details', 'Même état, détails différents');
  }
}

export function kindAdvice(kind: GroupKind, lang: PreLang): string {
  switch (kind) {
    case 'same':
      return pick(lang, 'These notes say the same thing. Keeping one loses nothing.', 'Ces notes disent la même chose. En garder une ne fait rien perdre.');
    case 'status-differs':
      return pick(
        lang,
        'The App does not choose between them. Keep the one that matches what you saw last, or keep both if they are different places.',
        'L’application ne choisit pas entre elles. Gardez celle qui correspond à ce que vous avez vu en dernier, ou gardez les deux si ce sont des lieux différents.',
      );
    case 'only-unknown-differs':
      return pick(
        lang,
        'UNKNOWN never replaces a recorded status, so the suggestion is the note that has one.',
        'UNKNOWN ne remplace jamais un état noté, donc la suggestion est la note qui en a un.',
      );
    case 'details-differ':
      return pick(
        lang,
        'The status is the same but the name, source, licence, date or position differs. The suggestion is the newest note.',
        'L’état est le même, mais le nom, la source, la licence, la date ou la position diffère. La suggestion est la note la plus récente.',
      );
  }
}

export function linkText(link: Link, lang: PreLang): string {
  const distance = formatMetres(link.metres, lang);
  return link.reason === 'same-name-close'
    ? fill(pick(lang, 'Similar names, {distance} apart.', 'Noms semblables, à {distance} l’un de l’autre.'), { distance })
    : fill(pick(lang, 'A name is missing, {distance} apart.', 'Un nom manque, à {distance} l’un de l’autre.'), { distance });
}

/** Status, source, licence, date and tier for one note. A note carries no tier, so the tier is UNKNOWN. */
export function ownNoteLine(note: OwnNote, lang: PreLang): string {
  return fill(
    pick(
      lang,
      'Status: {status}. Source: {source}. Licence: {licence}. Seen on {date}. Tier: UNKNOWN.',
      'État\u00a0: {status}. Source\u00a0: {source}. Licence\u00a0: {licence}. Vu le {date}. Niveau\u00a0: UNKNOWN.',
    ),
    { status: note.wheelchair, source: note.source, licence: note.licence, date: note.observedOn },
  );
}

export function cautionTexts(advice: Advice, lang: PreLang): string[] {
  const out: string[] = [];
  if (advice.licences.length > 1) {
    out.push(
      fill(pick(lang, 'The notes have different licences ({list}). The note you keep keeps its own.', 'Les notes ont des licences différentes ({list}). La note gardée garde la sienne.'), {
        list: joinList(advice.licences, lang),
      }),
    );
  }
  if (advice.nameOnlyOnAnother) {
    out.push(pick(lang, 'The suggested note has no name, and another one does. Correct the name first if you want to keep it.', 'La note suggérée n’a pas de nom, et une autre en a un. Corrigez d’abord le nom si vous voulez le garder.'));
  }
  return out;
}

export function reportSummaryText(report: DuplicateReport, lang: PreLang): string {
  if (report.total === 0) return pick(lang, 'You have no saved observations.', 'Vous n’avez aucune observation enregistrée.');
  const part = (en: string, fr: string, n: number | string) => `${pick(lang, en, fr)}${colon(lang)}${n}.`;
  const parts = [part('Saved observations', 'Observations enregistrées', report.total)];
  if (report.groups.length === 0) {
    parts.push(pick(lang, 'None of them look like the same place saved twice.', 'Aucune ne ressemble à un lieu enregistré deux fois.'));
  } else {
    parts.push(part('Groups that may be one place', 'Groupes qui sont peut-être un seul lieu', report.groups.length), part('Observations in those groups', 'Observations dans ces groupes', report.notesInGroups));
  }
  parts.push(fill(pick(lang, 'Distance used: {m} m.', 'Distance utilisée\u00a0: {m}\u00a0m.'), { m: report.distance }));
  parts.push(pick(lang, 'A group is a suggestion. Two notes close together can be two different places.', 'Un groupe est une suggestion. Deux notes proches peuvent être deux lieux différents.'));
  return parts.join(' ');
}
