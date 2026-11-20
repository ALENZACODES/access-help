/** Words for the measuring page: fact labels, values, form problems and notes. English and French. */
import { MAX_DESCRIPTION, type Description } from './describe.js';
import type { FormIssue, FormIssueCode } from './form.js';
import { LIMITS, unknownFacts, type FactKey, type Measures } from './measures.js';
import { formatCm, formatInches } from './units.js';
import { colon, fill, joinList, pick, type PreLang } from '../presubmit/text.js';

export function factLabel(key: FactKey, lang: PreLang): string {
  switch (key) {
    case 'steps':
      return pick(lang, 'Steps at the entrance', 'Marches à l’entrée');
    case 'stepHeightCm':
      return pick(lang, 'Highest step', 'Marche la plus haute');
    case 'doorWidthCm':
      return pick(lang, 'Entrance door width', 'Largeur de la porte d’entrée');
    case 'doorOpening':
      return pick(lang, 'How the door opens', 'Ouverture de la porte');
    case 'ramp':
      return pick(lang, 'Ramp', 'Rampe');
    case 'toilet':
      return pick(lang, 'Wheelchair toilet', 'Toilette pour fauteuil roulant');
    case 'toiletDoorCm':
      return pick(lang, 'Toilet door width', 'Largeur de la porte de la toilette');
  }
}

function length(cm: number, lang: PreLang): string {
  return `${formatCm(cm, lang)} (${formatInches(cm, lang)})`;
}

/** The value of one fact as text. A fact nobody measured reads UNKNOWN, in capitals, in both languages. */
export function factValue(measures: Measures, key: FactKey, lang: PreLang): string {
  const yesNo = (value: 'yes' | 'no') => (value === 'yes' ? pick(lang, 'Yes', 'Oui') : pick(lang, 'No', 'Non'));
  switch (key) {
    case 'steps':
      return measures.steps === null ? 'UNKNOWN' : String(measures.steps);
    case 'stepHeightCm':
      if (measures.stepHeightCm !== null) return length(measures.stepHeightCm, lang);
      return measures.steps === 0 ? pick(lang, 'No step to measure', 'Aucune marche à mesurer') : 'UNKNOWN';
    case 'doorWidthCm':
      return measures.doorWidthCm === null ? 'UNKNOWN' : length(measures.doorWidthCm, lang);
    case 'doorOpening':
      if (measures.doorOpening === null) return 'UNKNOWN';
      return { automatic: pick(lang, 'By itself', 'Toute seule'), button: pick(lang, 'With a button', 'Avec un bouton'), manual: pick(lang, 'By hand', 'À la main') }[measures.doorOpening];
    case 'ramp':
      return measures.ramp === null ? 'UNKNOWN' : yesNo(measures.ramp);
    case 'toilet':
      return measures.toilet === null ? 'UNKNOWN' : yesNo(measures.toilet);
    case 'toiletDoorCm':
      if (measures.toiletDoorCm !== null) return length(measures.toiletDoorCm, lang);
      return measures.toilet === 'no' ? pick(lang, 'No toilet door to measure', 'Aucune porte de toilette à mesurer') : 'UNKNOWN';
  }
}

export function methodText(measures: Pick<Measures, 'method'>, lang: PreLang): string {
  if (measures.method === 'tape') return pick(lang, 'With a tape', 'Au ruban');
  if (measures.method === 'estimate') return pick(lang, 'Estimated by eye', 'Estimé à l’œil');
  return 'UNKNOWN';
}

/** Names the facts still UNKNOWN that could be measured on another visit. Empty when there are none. */
export function stillUnknownText(measures: Measures, lang: PreLang): string {
  const missing = unknownFacts(measures);
  if (missing.length === 0) return '';
  const names = missing.map((key) => factLabel(key, lang).toLowerCase());
  return `${pick(lang, 'Still UNKNOWN', 'Encore UNKNOWN')}${colon(lang)}${joinList(names, lang)}.`;
}

const ISSUE: Record<FormIssueCode, [string, string]> = {
  'date-invalid': ['Write the day as year-month-day, such as 2026-11-19.', 'Écrivez le jour sous la forme année-mois-jour, par exemple 2026-11-19.'],
  'date-future': ['The day is after today.', 'Le jour est après aujourd’hui.'],
  'date-before-seen': ['The day is before the day you saw the place.', 'Le jour est avant celui où vous avez vu le lieu.'],
  'not-a-whole-number': ['Write a whole number, such as 0 or 3.', 'Écrivez un nombre entier, par exemple 0 ou 3.'],
  'not-a-length': ['Write a length, such as 82, 82.5 cm or 32 in.', 'Écrivez une longueur, par exemple 82, 82,5 cm ou 32 po.'],
  'too-small': ['This is smaller than the App keeps. Look at the number and the unit again.', 'C’est plus petit que ce que l’application garde. Regardez de nouveau le nombre et l’unité.'],
  'too-large': ['This is larger than the App keeps. Look at the number and the unit again.', 'C’est plus grand que ce que l’application garde. Regardez de nouveau le nombre et l’unité.'],
  'height-without-steps': ['You wrote 0 steps, so there is no step height. Clear one of the two.', 'Vous avez écrit 0 marche, donc il n’y a pas de hauteur de marche. Effacez l’un des deux.'],
  'toilet-door-without-toilet': [
    'You chose no wheelchair toilet, so there is no toilet door width. Clear one of the two.',
    'Vous avez choisi aucune toilette pour fauteuil roulant, donc il n’y a pas de largeur de porte. Effacez l’un des deux.',
  ],
  'nothing-measured': ['Nothing is filled in. Fill in at least one fact, or leave the page.', 'Rien n’est rempli. Remplissez au moins un élément, ou quittez la page.'],
};

export function formIssueText(issue: FormIssue, lang: PreLang): string {
  const [en, fr] = ISSUE[issue.code];
  return pick(lang, en, fr);
}

/** The range the App keeps for a length field, for the hint under it. */
export function rangeHint(field: 'stepHeightCm' | 'doorWidthCm' | 'toiletDoorCm', lang: PreLang): string {
  const { min, max } = LIMITS[field];
  return fill(pick(lang, 'In centimetres, or with "in" for inches. From {min} to {max}.', 'En centimètres, ou avec «\u202fpo\u202f» pour des pouces. De {min} à {max}.'), { min: formatCm(min, lang), max: formatCm(max, lang) });
}

export function descriptionNote(description: Description, lang: PreLang): string {
  if (description.text === '') return pick(lang, 'Nothing was measured, so there is no description.', 'Rien n’a été mesuré, donc il n’y a pas de description.');
  const head = `${pick(lang, 'Length', 'Longueur')}${colon(lang)}${description.length} / ${MAX_DESCRIPTION}.`;
  if (!description.tooLong) return head;
  return `${head} ${pick(lang, 'This is longer than OpenStreetMap keeps, so it is not among the tags.', 'C’est plus long que ce qu’OpenStreetMap conserve, donc ce n’est pas parmi les balises.')}`;
}

export function noJudgmentText(lang: PreLang): string {
  return pick(
    lang,
    'These are facts you measured. The App does not turn them into yes, limited or no, and does not say who can use the place. People differ, and so do chairs.',
    'Ce sont des faits que vous avez mesurés. L’application ne les change pas en yes, limited ou no, et ne dit pas qui peut utiliser le lieu. Les personnes diffèrent, et les fauteuils aussi.',
  );
}

export function tagsNoteText(lang: PreLang): string {
  return pick(
    lang,
    'OpenStreetMap has a free-text key for wheelchair details and a yes or no key for a wheelchair toilet. It has no settled key for step counts or door widths at an entrance, so those are written in the description. You type the tags yourself; the App adds nothing to the map.',
    'OpenStreetMap a une clé de texte libre pour les détails en fauteuil roulant et une clé oui ou non pour une toilette pour fauteuil roulant. Elle n’a pas de clé établie pour le nombre de marches ni la largeur des portes à une entrée, donc ces éléments sont écrits dans la description. Vous tapez les balises vous-même\u202f; l’application n’ajoute rien à la carte.',
  );
}

export function measuredCountText(measured: number, total: number, lang: PreLang): string {
  const c = colon(lang);
  return `${pick(lang, 'Observations with measures', 'Observations avec des mesures')}${c}${measured}. ${pick(lang, 'Without', 'Sans')}${c}${Math.max(0, total - measured)}.`;
}
