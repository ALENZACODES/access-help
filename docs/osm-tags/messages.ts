/** Words for the tag page: what was held back, problems, differences and cautions. English and French. */
import type { ChangesetDraft } from './changeset.js';
import type { DiffCaution, DiffKind, TagComparison } from './diff.js';
import { nothingToType } from './diff.js';
import type { ParsedTags } from './parse.js';
import { MAX_PASTED_LINES } from './parse.js';
import { MAX_TAG_LENGTH, coordText, type HeldBack, type TagProblem, type TagRecord } from './tags.js';
import { colon, fill, joinList, pick, type PreLang } from '../presubmit/text.js';

export function heldBackText(kind: HeldBack, lang: PreLang): string {
  switch (kind) {
    case 'status-unknown':
      return pick(
        lang,
        'The status is UNKNOWN, so no wheelchair tag and no check date are written. UNKNOWN is never turned into yes, limited or no.',
        'L’état est UNKNOWN, donc aucune balise wheelchair ni date de contrôle n’est écrite. UNKNOWN n’est jamais changé en yes, limited ou no.',
      );
    case 'no-name':
      return pick(lang, 'The observation has no name, so no name tag is written.', 'L’observation n’a pas de nom, donc aucune balise name n’est écrite.');
    case 'no-source':
      return pick(lang, 'The observation has no source, so no source tag is written.', 'L’observation n’a pas de source, donc aucune balise source n’est écrite.');
  }
}

export function problemText(problem: TagProblem, lang: PreLang): string {
  const values = { key: problem.key, max: MAX_TAG_LENGTH };
  switch (problem.kind) {
    case 'too-long':
      return fill(pick(lang, '{key}: longer than the {max} characters OpenStreetMap keeps.', '{key}\u00a0: dépasse les {max} caractères qu’OpenStreetMap conserve.'), values);
    case 'empty-value':
      return fill(pick(lang, '{key}: the value is empty.', '{key}\u00a0: la valeur est vide.'), values);
    case 'control-character':
      return fill(pick(lang, '{key}: holds a character that cannot be typed, such as a line break.', '{key}\u00a0: contient un caractère qui ne peut pas être tapé, comme un saut de ligne.'), values);
    case 'repeated-key':
      return fill(pick(lang, '{key}: appears more than once.', '{key}\u00a0: apparaît plus d’une fois.'), values);
    case 'bad-date':
      return fill(pick(lang, '{key}: the date is not a real day written as year-month-day.', '{key}\u00a0: la date n’est pas un vrai jour écrit année-mois-jour.'), values);
  }
}

export function diffKindLabel(kind: DiffKind, lang: PreLang): string {
  switch (kind) {
    case 'add':
      return pick(lang, 'Would be added', 'Serait ajoutée');
    case 'same':
      return pick(lang, 'Already the same', 'Déjà identique');
    case 'differs':
      return pick(lang, 'Differs from the map', 'Diffère de la carte');
    case 'only-on-map':
      return pick(lang, 'On the map only: leave it', 'Sur la carte seulement\u00a0: à laisser');
  }
}

export function cautionText(caution: DiffCaution, lang: PreLang): string {
  switch (caution) {
    case 'map-date-newer':
      return pick(
        lang,
        'The check date on the map is newer than your observation. Someone looked after you did. Think twice before you change the status.',
        'La date de contrôle sur la carte est plus récente que votre observation. Quelqu’un a regardé après vous. Réfléchissez avant de changer l’état.',
      );
    case 'map-date-same':
      return pick(lang, 'The check date on the map is the same day as your observation.', 'La date de contrôle sur la carte est le même jour que votre observation.');
    case 'status-differs':
      return pick(
        lang,
        'The status on the map differs from yours. Neither is marked as wrong here. Change it only if you are sure of what you saw.',
        'L’état sur la carte diffère du vôtre. Aucun des deux n’est marqué comme faux ici. Changez-le seulement si vous êtes sûr de ce que vous avez vu.',
      );
    case 'name-differs':
      return pick(lang, 'The name on the map differs from yours. A sign may have changed, or it may be another place.', 'Le nom sur la carte diffère du vôtre. Une enseigne a pu changer, ou c’est peut-être un autre lieu.');
    case 'map-has-detail':
      return pick(lang, 'The map already holds more detail about wheelchair access than the App records. Leave it in place.', 'La carte contient déjà plus de détails sur l’accès en fauteuil roulant que l’application n’en note. Laissez-les en place.');
  }
}

export function comparisonSummary(comparison: TagComparison, lang: PreLang): string {
  const c = colon(lang);
  const semi = lang === 'fr' ? '\u202f; ' : '; ';
  const counts = [
    `${pick(lang, 'to add', 'à ajouter')}${c}${comparison.counts.add}`,
    `${pick(lang, 'the same', 'identiques')}${c}${comparison.counts.same}`,
    `${pick(lang, 'different', 'différentes')}${c}${comparison.counts.differs}`,
    `${pick(lang, 'on the map only', 'sur la carte seulement')}${c}${comparison.counts['only-on-map']}`,
  ].join(semi);
  const tail = nothingToType(comparison) ? pick(lang, ' Typing your tags would change nothing.', ' Taper vos balises ne changerait rien.') : '';
  return `${pick(lang, 'Tags', 'Balises')} - ${counts}.${tail}`;
}

export function parsedNotes(parsed: ParsedTags, lang: PreLang): string[] {
  const out: string[] = [];
  const c = colon(lang);
  if (parsed.unread.length > 0) out.push(`${pick(lang, 'Lines the App could not read as key=value', 'Lignes que l’application n’a pas pu lire comme clé=valeur')}${c}${parsed.unread.length}.`);
  if (parsed.repeated.length > 0) out.push(`${pick(lang, 'Keys pasted more than once, last value kept', 'Clés collées plus d’une fois, dernière valeur gardée')}${c}${joinList(parsed.repeated, lang)}.`);
  if (parsed.cutOff) out.push(fill(pick(lang, 'Only the first {max} lines were read.', 'Seules les {max} premières lignes ont été lues.'), { max: MAX_PASTED_LINES }));
  return out;
}

export function changesetNotes(draft: ChangesetDraft, lang: PreLang): string[] {
  const out: string[] = [];
  const c = colon(lang);
  if (draft.comment === '') {
    out.push(pick(lang, 'There is no observation with a status, so there is nothing to add to the map and no comment to write.', 'Il n’y a aucune observation avec un état, donc rien à ajouter à la carte et aucun commentaire à rédiger.'));
  } else {
    out.push(`${pick(lang, 'Comment length', 'Longueur du commentaire')}${c}${draft.commentLength} / ${MAX_TAG_LENGTH}.`);
    out.push(pick(lang, 'This is a draft. Change it to say what you did in your own words.', 'Ceci est un brouillon. Changez-le pour dire ce que vous avez fait dans vos propres mots.'));
  }
  if (draft.withoutStatus > 0) out.push(`${pick(lang, 'Observations left out because their status is UNKNOWN', 'Observations laissées de côté parce que leur état est UNKNOWN')}${c}${draft.withoutStatus}.`);
  if (draft.tooLong) out.push(fill(pick(lang, 'The draft is longer than the {max} characters OpenStreetMap keeps. Shorten it.', 'Le brouillon dépasse les {max} caractères qu’OpenStreetMap conserve. Raccourcissez-le.'), { max: MAX_TAG_LENGTH }));
  return out;
}

/** One line about the observation itself: status, source, licence, date and tier. */
export function recordLine(record: TagRecord, lang: PreLang): string {
  const c = colon(lang);
  return [
    `${pick(lang, 'Status', 'État')}${c}${['yes', 'limited', 'no'].includes(record.wheelchair) ? record.wheelchair : 'UNKNOWN'}.`,
    `${pick(lang, 'Source', 'Source')}${c}${record.source.trim() === '' ? 'UNKNOWN' : record.source.trim()}.`,
    `${pick(lang, 'Licence', 'Licence')}${c}${record.licence}.`,
    fill(pick(lang, 'Seen on {day}.', 'Vu le {day}.'), { day: record.observedOn }),
    `${pick(lang, 'Tier', 'Niveau')}${c}UNKNOWN.`,
    `${pick(lang, 'Spot', 'Point')}${c}${coordText(record)}.`,
  ].join(' ');
}

export function neverUploadsText(lang: PreLang): string {
  return pick(
    lang,
    'The App adds nothing to OpenStreetMap. You type the tags yourself, under your own account, and the map’s own community decides what stays.',
    'L’application n’ajoute rien à OpenStreetMap. Vous tapez les balises vous-même, avec votre propre compte, et la communauté de la carte décide de ce qui reste.',
  );
}
