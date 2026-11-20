/** Words for looking through measured places with the person's own numbers. English and French. */
import { setCriteria, type Criteria, type CriteriaIssue, type CriterionKey } from './criteria.js';
import type { Check, MatchCounts, MatchResult, Overall } from './match.js';
import { unknownChecks } from './match.js';
import type { SetIssue } from './sets.js';
import { MAX_SETS } from './sets.js';
import { formatCm } from '../place-measures/index.js';
import { colon, fill, joinList, pick, plural, type PreLang } from '../presubmit/text.js';

function stepsWord(lang: PreLang, n: number): string {
  return plural(lang, n, pick(lang, 'step', 'marche'), pick(lang, 'steps', 'marches'));
}

/** One criterion in words, with the number the person set. */
export function criterionText(key: CriterionKey, criteria: Criteria, lang: PreLang): string {
  const ramp = criteria.rampInstead ? pick(lang, ', or a ramp', ', ou une rampe') : '';
  switch (key) {
    case 'steps': {
      const n = criteria.maxSteps ?? 0;
      const head = n === 0 ? pick(lang, 'No step at the entrance', 'Aucune marche à l’entrée') : fill(pick(lang, 'At most {n} {steps} at the entrance', 'Au plus {n} {steps} à l’entrée'), { n, steps: stepsWord(lang, n) });
      return `${head}${ramp}`;
    }
    case 'stepHeight':
      return `${fill(pick(lang, 'Highest step at most {size}', 'Marche la plus haute d’au plus {size}'), { size: formatCm(criteria.maxStepHeightCm ?? 0, lang) })}${ramp}`;
    case 'doorWidth':
      return fill(pick(lang, 'Entrance door at least {size} wide', 'Porte d’entrée large d’au moins {size}'), { size: formatCm(criteria.minDoorWidthCm ?? 0, lang) });
    case 'door':
      return criteria.door === 'by-itself' ? pick(lang, 'Door that opens by itself', 'Porte qui s’ouvre toute seule') : pick(lang, 'Door that opens by itself or with a button', 'Porte qui s’ouvre toute seule ou avec un bouton');
    case 'toilet':
      return pick(lang, 'A wheelchair toilet', 'Une toilette pour fauteuil roulant');
    case 'toiletDoor':
      return fill(pick(lang, 'Toilet door at least {size} wide', 'Porte de la toilette large d’au moins {size}'), { size: formatCm(criteria.minToiletDoorCm ?? 0, lang) });
  }
}

/** Every criterion the person set, one per line. Empty when none is set. */
export function criteriaLines(criteria: Criteria, lang: PreLang): string[] {
  return setCriteria(criteria).map((key) => criterionText(key, criteria, lang));
}

export function criterionShort(key: CriterionKey, lang: PreLang): string {
  switch (key) {
    case 'steps':
      return pick(lang, 'number of steps', 'nombre de marches');
    case 'stepHeight':
      return pick(lang, 'height of the highest step', 'hauteur de la plus haute marche');
    case 'doorWidth':
      return pick(lang, 'width of the entrance door', 'largeur de la porte d’entrée');
    case 'door':
      return pick(lang, 'how the door opens', 'ouverture de la porte');
    case 'toilet':
      return pick(lang, 'wheelchair toilet', 'toilette pour fauteuil roulant');
    case 'toiletDoor':
      return pick(lang, 'width of the toilet door', 'largeur de la porte de la toilette');
  }
}

function sourceTail(check: Check, lang: PreLang): string {
  return check.source === 'told' ? pick(lang, ' This comes from what the place said, not from your own measure.', ' Cela vient de ce que le lieu a dit, pas de votre propre mesure.') : '';
}

/** What one check found, as a sentence. A fact nobody has reads UNKNOWN. */
export function checkText(check: Check, criteria: Criteria, lang: PreLang): string {
  const head = `${criterionText(check.key, criteria, lang)}${colon(lang)}`;
  if (check.outcome === 'unknown') return `${head}UNKNOWN.`;
  if (check.byRamp) return `${head}${pick(lang, 'there is a ramp.', 'il y a une rampe.')}${sourceTail(check, lang)}`;
  let found = '';
  switch (check.key) {
    case 'steps': {
      const n = (criteria.maxSteps ?? 0) + (check.margin ?? 0);
      found = n === 0 ? pick(lang, 'no step.', 'aucune marche.') : `${n} ${stepsWord(lang, n)}.`;
      break;
    }
    case 'stepHeight':
      found = check.margin === null ? pick(lang, 'no step.', 'aucune marche.') : lengthFound((criteria.maxStepHeightCm ?? 0) + check.margin, check.margin, lang);
      break;
    case 'doorWidth':
      found = lengthFound((criteria.minDoorWidthCm ?? 0) + (check.margin ?? 0), check.margin ?? 0, lang);
      break;
    case 'toiletDoor':
      found = check.margin === null ? pick(lang, 'there is no wheelchair toilet.', 'il n’y a pas de toilette pour fauteuil roulant.') : lengthFound((criteria.minToiletDoorCm ?? 0) + check.margin, check.margin, lang);
      break;
    case 'door':
    case 'toilet':
      found = check.outcome === 'fits' ? pick(lang, 'yes.', 'oui.') : pick(lang, 'no.', 'non.');
      break;
  }
  return `${head}${found}${sourceTail(check, lang)}`;
}

function lengthFound(value: number, margin: number, lang: PreLang): string {
  const size = formatCm(Math.round(value * 10) / 10, lang);
  if (margin === 0) return fill(pick(lang, '{size}, the same as the number you set.', '{size}, identique au chiffre que vous avez fixé.'), { size });
  const gap = formatCm(Math.abs(margin), lang);
  return margin > 0
    ? fill(pick(lang, '{size}, {gap} more than the number you set.', '{size}, {gap} de plus que le chiffre que vous avez fixé.'), { size, gap })
    : fill(pick(lang, '{size}, {gap} less than the number you set.', '{size}, {gap} de moins que le chiffre que vous avez fixé.'), { size, gap });
}

export function overallLabel(overall: Overall, lang: PreLang): string {
  switch (overall) {
    case 'fits':
      return pick(lang, 'Within every number you set', 'Dans tous les chiffres que vous avez fixés');
    case 'does-not-fit':
      return pick(lang, 'Outside a number you set', 'Hors d’un chiffre que vous avez fixé');
    case 'cannot-say':
      return pick(lang, 'Cannot be said: a fact is UNKNOWN', 'Impossible à dire\u00a0: un fait est UNKNOWN');
    case 'no-criteria':
      return pick(lang, 'No number is set', 'Aucun chiffre n’est fixé');
  }
}

/** Counts only. The three groups always add up to the total. */
export function matchCountsText(counts: MatchCounts, lang: PreLang): string {
  const c = colon(lang);
  return [
    `${pick(lang, 'Places looked through', 'Lieux examinés')}${c}${counts.total}.`,
    `${pick(lang, 'Within every number', 'Dans tous les chiffres')}${c}${counts.fits}.`,
    `${pick(lang, 'Outside a number', 'Hors d’un chiffre')}${c}${counts.doesNotFit}.`,
    `${pick(lang, 'Cannot be said', 'Impossible à dire')}${c}${counts.cannotSay}.`,
  ].join(' ');
}

/** Names what is UNKNOWN for a place, so the person knows what to measure or ask about. */
export function unknownText(result: MatchResult, lang: PreLang): string {
  const keys = unknownChecks(result);
  if (keys.length === 0) return '';
  return `UNKNOWN${colon(lang)}${joinList(keys.map((key) => criterionShort(key, lang)), lang)}.`;
}

export function tallyLine(entry: { key: CriterionKey; places: number }, lang: PreLang): string {
  const places = plural(lang, entry.places, pick(lang, 'place', 'lieu'), pick(lang, 'places', 'lieux'));
  return fill(pick(lang, 'UNKNOWN at {n} {places}: {fact}.', 'UNKNOWN pour {n} {places}\u00a0: {fact}.'), { n: entry.places, places, fact: criterionShort(entry.key, lang) });
}

export function yoursText(lang: PreLang): string {
  return pick(
    lang,
    'The numbers are yours. The App suggests none, holds no standard and does not say who can use a place. A place within your numbers was so on the day it was measured; things change.',
    'Les chiffres sont les vôtres. L’application n’en suggère aucun, ne tient aucune norme et ne dit pas qui peut utiliser un lieu. Un lieu dans vos chiffres l’était le jour de la mesure\u202f; les choses changent.',
  );
}

export function toldCountedText(lang: PreLang): string {
  return pick(
    lang,
    'Where you have no measure of your own, what the place told you is used and marked. Your own measure always comes first.',
    'Là où vous n’avez pas de mesure à vous, ce que le lieu vous a dit est utilisé et signalé. Votre propre mesure passe toujours en premier.',
  );
}

export function criteriaIssueText(issue: CriteriaIssue, lang: PreLang): string {
  switch (issue.code) {
    case 'not-a-whole-number':
      return pick(lang, 'Write a whole number, such as 0 or 1, or leave it empty.', 'Écrivez un nombre entier, par exemple 0 ou 1, ou laissez vide.');
    case 'not-a-length':
      return pick(lang, 'Write a length, such as 80, 80.5 cm or 32 in, or leave it empty.', 'Écrivez une longueur, par exemple 80, 80,5 cm ou 32 po, ou laissez vide.');
    case 'too-small':
      return pick(lang, 'This is smaller than the App keeps. Look at the number and the unit again.', 'C’est plus petit que ce que l’application garde. Regardez de nouveau le nombre et l’unité.');
    case 'too-large':
      return pick(lang, 'This is larger than the App keeps. Look at the number and the unit again.', 'C’est plus grand que ce que l’application garde. Regardez de nouveau le nombre et l’unité.');
  }
}

export function setIssueText(issue: SetIssue, lang: PreLang): string {
  switch (issue) {
    case 'name-empty':
      return pick(lang, 'Give the set a name first.', 'Donnez d’abord un nom à l’ensemble.');
    case 'nothing-set':
      return pick(lang, 'Set at least one number first.', 'Fixez d’abord au moins un chiffre.');
    case 'too-many':
      return fill(pick(lang, 'The App keeps {max} sets. Remove one before you add another.', 'L’application garde {max} ensembles. Retirez-en un avant d’en ajouter un autre.'), { max: MAX_SETS });
  }
}

export function noCriteriaText(lang: PreLang): string {
  return pick(lang, 'Set at least one number to look through your places.', 'Fixez au moins un chiffre pour examiner vos lieux.');
}
