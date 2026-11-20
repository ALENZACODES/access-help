/**
 * The questions a person can put to a place about its way in. Each one asks for a fact that
 * can be counted or measured, never for an opinion about who can use the place. Pure: no
 * network, no storage, no clock.
 */
import { FACT_KEYS, unknownFacts, type FactKey, type Measures } from '../place-measures/index.js';
import { pick, type PreLang } from '../presubmit/text.js';

export const QUESTION_KEYS: readonly FactKey[] = FACT_KEYS;

export function isQuestionKey(value: unknown): value is FactKey {
  return typeof value === 'string' && (FACT_KEYS as readonly string[]).includes(value);
}

/** Known keys only, each once, in the fixed order of the facts. */
export function cleanQuestions(value: unknown): FactKey[] {
  if (!Array.isArray(value)) return [];
  const asked = new Set(value.filter(isQuestionKey));
  return FACT_KEYS.filter((key) => asked.has(key));
}

/**
 * The questions worth asking: every fact the person has not measured. With no measures at all,
 * that is every fact. A step height is not asked about when the person counted no step.
 */
export function openQuestions(measures: Measures | null): FactKey[] {
  return measures === null ? [...FACT_KEYS] : unknownFacts(measures);
}

export function questionText(key: FactKey, lang: PreLang): string {
  switch (key) {
    case 'steps':
      return pick(lang, 'How many steps are there at the entrance most people use?', 'Combien de marches y a-t-il à l’entrée que la plupart des gens utilisent\u202f?');
    case 'stepHeightCm':
      return pick(lang, 'How high is the highest of those steps, in centimetres?', 'Quelle est la hauteur de la plus haute de ces marches, en centimètres\u202f?');
    case 'doorWidthCm':
      return pick(lang, 'How wide is the clear opening of the entrance door, in centimetres?', 'Quelle est la largeur libre de la porte d’entrée, en centimètres\u202f?');
    case 'doorOpening':
      return pick(lang, 'Does the entrance door open by itself, with a button, or by hand?', 'La porte d’entrée s’ouvre-t-elle toute seule, avec un bouton ou à la main\u202f?');
    case 'ramp':
      return pick(lang, 'Is there a ramp to the entrance?', 'Y a-t-il une rampe vers l’entrée\u202f?');
    case 'toilet':
      return pick(lang, 'Is there a toilet meant for wheelchair users?', 'Y a-t-il une toilette prévue pour les personnes en fauteuil roulant\u202f?');
    case 'toiletDoorCm':
      return pick(lang, 'How wide is the clear opening of that toilet’s door, in centimetres?', 'Quelle est la largeur libre de la porte de cette toilette, en centimètres\u202f?');
  }
}

/** A short hint on how to take the number, for the questions that ask for one. Empty for the others. */
export function howToMeasure(key: FactKey, lang: PreLang): string {
  switch (key) {
    case 'stepHeightCm':
      return pick(lang, 'Measure straight up from the ground to the top of the step.', 'Mesurez à la verticale du sol jusqu’au dessus de la marche.');
    case 'doorWidthCm':
    case 'toiletDoorCm':
      return pick(
        lang,
        'Open the door fully and measure the narrowest gap a person passes through, not the door itself.',
        'Ouvrez la porte complètement et mesurez le passage le plus étroit, pas la porte elle-même.',
      );
    case 'steps':
      return pick(lang, 'Count every step from the sidewalk to the inside, including a raised doorsill.', 'Comptez chaque marche du trottoir jusqu’à l’intérieur, y compris un seuil surélevé.');
    default:
      return '';
  }
}

/** A few words for the question, for a list or a table. */
export function questionShort(key: FactKey, lang: PreLang): string {
  switch (key) {
    case 'steps':
      return pick(lang, 'Number of steps', 'Nombre de marches');
    case 'stepHeightCm':
      return pick(lang, 'Height of the highest step', 'Hauteur de la plus haute marche');
    case 'doorWidthCm':
      return pick(lang, 'Width of the entrance door', 'Largeur de la porte d’entrée');
    case 'doorOpening':
      return pick(lang, 'How the door opens', 'Ouverture de la porte');
    case 'ramp':
      return pick(lang, 'Ramp', 'Rampe');
    case 'toilet':
      return pick(lang, 'Wheelchair toilet', 'Toilette pour fauteuil roulant');
    case 'toiletDoorCm':
      return pick(lang, 'Width of the toilet door', 'Largeur de la porte de la toilette');
  }
}
