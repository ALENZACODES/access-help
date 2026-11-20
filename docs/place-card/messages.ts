/** Words for place cards: the card as text, what went wrong reading one, and how it sits beside the reader's own facts. */
import type { BuildFailure, CardFailure, CardNote, PlaceCard } from './card.js';
import { MAX_CARD_CHARACTERS } from './card.js';
import type { NearOwn } from './near.js';
import type { ReceiveIssue } from './received.js';
import { MAX_RECEIVED } from './received.js';
import { compareFacts, type FactCompare } from '../ask-place/index.js';
import { FACT_KEYS, factLabel, factValue, formatCm, methodText, type FactKey, type Measures } from '../place-measures/index.js';
import { colon, fill, formatMetres, pick, type PreLang } from '../presubmit/text.js';

export function cardTitle(card: PlaceCard, lang: PreLang): string {
  return card.place.name === null ? pick(lang, 'Place without a name', 'Lieu sans nom') : card.place.name;
}

/** Status, source, licence, date and tier of the observation in the card. */
export function cardPlaceLine(card: PlaceCard, lang: PreLang): string {
  const c = colon(lang);
  return [
    `${pick(lang, 'Status', 'État')}${c}${card.place.wheelchair}.`,
    `${pick(lang, 'Source', 'Source')}${c}${card.place.source}.`,
    `${pick(lang, 'Licence', 'Licence')}${c}${card.place.licence}.`,
    `${pick(lang, 'Seen', 'Vu')}${c}${card.place.observedOn}.`,
    `${pick(lang, 'Tier', 'Niveau')}${c}UNKNOWN.`,
  ].join(' ');
}

export function cardFromLine(card: PlaceCard, lang: PreLang): string {
  const c = colon(lang);
  return `${pick(lang, 'From', 'De')}${c}${card.from === '' ? 'UNKNOWN' : card.from}. ${fill(pick(lang, 'Card made on {day}.', 'Fiche faite le {day}.'), { day: card.madeOn })}`;
}

export function cardPointLine(card: PlaceCard, lang: PreLang): string {
  const c = colon(lang);
  if (card.place.lat === null || card.place.lon === null) return `${pick(lang, 'Map point', 'Point sur la carte')}${c}${pick(lang, 'left out by the sender', 'laissé de côté par la personne qui envoie')}.`;
  return `${pick(lang, 'Map point', 'Point sur la carte')}${c}${card.place.lat.toFixed(5)}, ${card.place.lon.toFixed(5)}.`;
}

/** One line per fact, with UNKNOWN for what was not measured. */
export function factLines(measures: Measures, lang: PreLang): string[] {
  return FACT_KEYS.map((key) => `${factLabel(key, lang)}${colon(lang)}${factValue(measures, key, lang)}`);
}

function whenHow(measures: Measures, told: boolean, lang: PreLang): string {
  if (told) return fill(pick(lang, 'Answered on {day}.', 'Réponse du {day}.'), { day: measures.measuredOn });
  return `${fill(pick(lang, 'Measured on {day}.', 'Mesuré le {day}.'), { day: measures.measuredOn })} ${pick(lang, 'How', 'Comment')}${colon(lang)}${methodText(measures, lang)}.`;
}

export function otherPersonText(lang: PreLang): string {
  return pick(
    lang,
    'These are facts another person saw and measured, on the days shown. They are not yours and not something you saw. Things change, so look for yourself before you rely on them or add anything to OpenStreetMap.',
    'Ce sont des faits qu’une autre personne a vus et mesurés, aux jours indiqués. Ils ne sont pas les vôtres et vous ne les avez pas vus. Les choses changent\u00a0: allez voir vous-même avant de vous y fier ou d’ajouter quoi que ce soit à OpenStreetMap.',
  );
}

/** The whole card as plain text, to paste into a message or print. */
export function cardText(card: PlaceCard, lang: PreLang): string {
  const lines: string[] = [pick(lang, `Place card: ${cardTitle(card, lang)}`, `Fiche de lieu\u00a0: ${cardTitle(card, lang)}`), cardFromLine(card, lang), cardPlaceLine(card, lang), cardPointLine(card, lang), ''];
  lines.push(pick(lang, 'What the sender measured', 'Ce que la personne qui envoie a mesuré'));
  if (card.measures === null) lines.push(pick(lang, 'Nothing was measured. Every fact is UNKNOWN.', 'Rien n’a été mesuré. Chaque fait est UNKNOWN.'));
  else lines.push(whenHow(card.measures, false, lang), ...factLines(card.measures, lang));
  if (card.told !== null) {
    lines.push('', pick(lang, 'What the place told the sender', 'Ce que le lieu a dit à la personne qui envoie'), whenHow(card.told, true, lang), ...factLines(card.told, lang));
  }
  lines.push('', otherPersonText(lang));
  return `${lines.join('\n')}\n`;
}

export function buildFailureText(code: BuildFailure, lang: PreLang): string {
  switch (code) {
    case 'licence-not-open':
      return pick(lang, 'This observation has a licence the App does not take, so no card is made for it.', 'Cette observation a une licence que l’application ne prend pas, donc aucune fiche n’est faite.');
    case 'date-invalid':
      return pick(lang, 'The day on this observation is not a real day, so no card is made for it.', 'Le jour de cette observation n’est pas un vrai jour, donc aucune fiche n’est faite.');
  }
}

export function cardFailureText(code: CardFailure, lang: PreLang): string {
  switch (code) {
    case 'too-large':
      return fill(pick(lang, 'This file is larger than a place card ({max} characters at most).', 'Ce fichier est plus gros qu’une fiche de lieu ({max} caractères au plus).'), { max: MAX_CARD_CHARACTERS });
    case 'not-json':
      return pick(lang, 'This file could not be read. It may be damaged, or it is not a place card.', 'Ce fichier n’a pas pu être lu. Il est peut-être endommagé, ou ce n’est pas une fiche de lieu.');
    case 'not-a-card':
      return pick(lang, 'This is not a place card made by the App.', 'Ce n’est pas une fiche de lieu faite par l’application.');
    case 'unsupported-version':
      return pick(lang, 'This card was made by a different version of the App and cannot be read here.', 'Cette fiche a été faite par une autre version de l’application et ne peut pas être lue ici.');
    case 'bad-place':
      return pick(lang, 'The card has no usable place: a day or the source is missing or is not as it has to be.', 'La fiche n’a pas de lieu utilisable\u00a0: un jour ou la source manque ou n’est pas comme il le faut.');
    case 'licence-not-open':
      return pick(lang, 'The card has a licence the App does not take, so it was not kept.', 'La fiche a une licence que l’application ne prend pas, donc elle n’a pas été gardée.');
  }
}

export function cardNoteText(note: CardNote, lang: PreLang): string {
  switch (note) {
    case 'status-set-unknown':
      return pick(lang, 'The status in the card was not yes, limited or no, so it reads UNKNOWN.', 'L’état dans la fiche n’était pas yes, limited ou no, donc il indique UNKNOWN.');
    case 'point-left-out':
      return pick(lang, 'The map point in the card could not be used and was left out.', 'Le point sur la carte de la fiche n’a pas pu être utilisé et a été laissé de côté.');
    case 'point-outside-ontario':
      return pick(lang, 'The map point in the card is outside Ontario. Look at it again before you go by it.', 'Le point sur la carte de la fiche est hors de l’Ontario. Regardez-le de nouveau avant de vous y fier.');
    case 'measures-left-out':
      return pick(lang, 'The measures in the card could not be used and were left out.', 'Les mesures de la fiche n’ont pas pu être utilisées et ont été laissées de côté.');
    case 'told-left-out':
      return pick(lang, 'What the place said in the card could not be used and was left out.', 'Ce que le lieu a dit dans la fiche n’a pas pu être utilisé et a été laissé de côté.');
  }
}

export function receiveIssueText(issue: ReceiveIssue, lang: PreLang): string {
  switch (issue) {
    case 'already-here':
      return pick(lang, 'You already have this card.', 'Vous avez déjà cette fiche.');
    case 'too-many':
      return fill(pick(lang, 'The App keeps {max} received cards. Remove one before you add another.', 'L’application garde {max} fiches reçues. Retirez-en une avant d’en ajouter une autre.'), { max: MAX_RECEIVED });
    case 'date-invalid':
      return pick(lang, 'The card could not be dated, so it was not kept.', 'La fiche n’a pas pu être datée, donc elle n’a pas été gardée.');
  }
}

export function nearText(near: NearOwn, lang: PreLang): string {
  const name = near.name === null || near.name.trim() === '' ? pick(lang, 'an observation of yours without a name', 'une de vos observations sans nom') : near.name.trim();
  const head = fill(pick(lang, 'Close to {name}, in a straight line: {distance}.', 'Près de {name}, en ligne droite\u00a0: {distance}.'), { name, distance: formatMetres(near.metres, lang) });
  const tail = near.sameName ? pick(lang, ' The names are the same.', ' Les noms sont les mêmes.') : pick(lang, ' It may be another place.', ' C’est peut-être un autre lieu.');
  return `${head}${tail}`;
}

export function notNearText(card: PlaceCard, lang: PreLang): string {
  return card.place.lat === null
    ? pick(lang, 'The card has no map point, so it is not set beside any of your observations.', 'La fiche n’a pas de point sur la carte, donc elle n’est placée à côté d’aucune de vos observations.')
    : pick(lang, 'None of your observations is close to this card’s map point.', 'Aucune de vos observations n’est près du point de cette fiche.');
}

export interface BesideRow {
  key: FactKey;
  fact: string;
  yours: string;
  theirs: string;
  note: string;
}

function besideLabel(kind: FactCompare, lang: PreLang): string {
  switch (kind) {
    case 'neither':
      return pick(lang, 'UNKNOWN from both', 'UNKNOWN des deux côtés');
    case 'does-not-apply':
      return pick(lang, 'Does not apply here', 'Ne s’applique pas ici');
    case 'only-measured':
      return pick(lang, 'Only you measured it', 'Vous seul l’avez mesuré');
    case 'only-told':
      return pick(lang, 'Only the card has it', 'Seule la fiche l’indique');
    case 'same':
      return pick(lang, 'The same', 'Identique');
    case 'differs':
      return pick(lang, 'Differs', 'Diffère');
  }
}

/** The card's measures beside the reader's own, fact by fact. Neither side is called wrong. */
export function besideRows(yours: Measures | null, card: PlaceCard, lang: PreLang): BesideRow[] {
  return compareFacts(yours, card.measures).map((row) => {
    let note = besideLabel(row.kind, lang);
    if (row.kind === 'differs' && row.differenceCm !== null) {
      const size = formatCm(Math.abs(row.differenceCm), lang);
      note += `. ${row.differenceCm > 0 ? fill(pick(lang, 'The card says {size} more than you measured.', 'La fiche indique {size} de plus que votre mesure.'), { size }) : fill(pick(lang, 'The card says {size} less than you measured.', 'La fiche indique {size} de moins que votre mesure.'), { size })}`;
    }
    return {
      key: row.key,
      fact: factLabel(row.key, lang),
      yours: yours === null ? 'UNKNOWN' : factValue(yours, row.key, lang),
      theirs: card.measures === null ? 'UNKNOWN' : factValue(card.measures, row.key, lang),
      note,
    };
  });
}

export function receivedCountText(count: number, lang: PreLang): string {
  return `${pick(lang, 'Cards you received', 'Fiches reçues')}${colon(lang)}${count}.`;
}

export function shareNoteText(lang: PreLang): string {
  return pick(
    lang,
    'A card holds the place, its status, source, licence and dates, and what you measured. It holds nothing about you unless you type a label. The App sends nothing: you pass the file or the text on yourself.',
    'Une fiche contient le lieu, son état, sa source, sa licence et ses dates, et ce que vous avez mesuré. Elle ne contient rien sur vous, sauf si vous tapez une étiquette. L’application n’envoie rien\u00a0: vous transmettez vous-même le fichier ou le texte.',
  );
}
