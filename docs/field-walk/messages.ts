/** Words for the on-site walk-through: each question, its tip, the choices, progress and the review. English and French. */
import type { ChangeKind, FactChange } from './finish.js';
import { changeCounts } from './finish.js';
import type { Unit } from './stepper.js';
import { STEP_KIND, type WalkStep } from './steps.js';
import type { AnswerIssue, Walk, WalkProgress } from './walk.js';
import { LIMITS, factLabel, formatCm, formatInches, parseLength } from '../place-measures/index.js';
import { colon, fill, pick, type PreLang } from '../presubmit/text.js';

export function stepQuestion(step: WalkStep, lang: PreLang): string {
  switch (step) {
    case 'steps':
      return pick(lang, 'How many steps are there at the entrance you used?', 'Combien de marches y a-t-il à l’entrée que vous avez utilisée\u202f?');
    case 'stepHeight':
      return pick(lang, 'How high is the highest step?', 'Quelle est la hauteur de la marche la plus haute\u202f?');
    case 'ramp':
      return pick(lang, 'Is there a ramp to the entrance?', 'Y a-t-il une rampe vers l’entrée\u202f?');
    case 'doorWidth':
      return pick(lang, 'How wide is the clear opening of the entrance door?', 'Quelle est la largeur libre de la porte d’entrée\u202f?');
    case 'doorOpening':
      return pick(lang, 'How does the entrance door open?', 'Comment la porte d’entrée s’ouvre-t-elle\u202f?');
    case 'toilet':
      return pick(lang, 'Is there a toilet meant for wheelchair users?', 'Y a-t-il une toilette prévue pour les personnes en fauteuil roulant\u202f?');
    case 'toiletDoor':
      return pick(lang, 'How wide is the clear opening of that toilet’s door?', 'Quelle est la largeur libre de la porte de cette toilette\u202f?');
    case 'method':
      return pick(lang, 'How did you take the lengths?', 'Comment avez-vous pris les longueurs\u202f?');
  }
}

/** How to take the number or make the choice, in a sentence or two. */
export function stepTip(step: WalkStep, lang: PreLang): string {
  switch (step) {
    case 'steps':
      return pick(
        lang,
        'Count every step from the sidewalk to the inside, including a raised doorsill. Choose 0 if you counted none.',
        'Comptez chaque marche du trottoir jusqu’à l’intérieur, y compris un seuil surélevé. Choisissez 0 si vous n’en avez compté aucune.',
      );
    case 'stepHeight':
      return pick(lang, 'Measure straight up from the ground to the top of the step.', 'Mesurez à la verticale du sol jusqu’au dessus de la marche.');
    case 'ramp':
      return pick(lang, 'Answer for the entrance you used, or one right beside it.', 'Répondez pour l’entrée que vous avez utilisée, ou une entrée juste à côté.');
    case 'doorWidth':
    case 'toiletDoor':
      return pick(
        lang,
        'Open the door fully and measure the narrowest gap a person passes through, not the door itself.',
        'Ouvrez la porte complètement et mesurez le passage le plus étroit, pas la porte elle-même.',
      );
    case 'doorOpening':
      return pick(lang, 'If there is a button that opens it, choose the button even if the door can also be pulled.', 'S’il y a un bouton qui l’ouvre, choisissez le bouton même si la porte peut aussi être tirée.');
    case 'toilet':
      return pick(lang, 'Answer yes only if you saw it yourself. If you could not look, skip this question.', 'Répondez oui seulement si vous l’avez vue vous-même. Si vous n’avez pas pu regarder, passez cette question.');
    case 'method':
      return pick(lang, 'An estimate is still useful. It is written as "about" beside each length.', 'Une estimation reste utile. Elle est écrite avec «\u202fenviron\u202f» à côté de chaque longueur.');
  }
}

export function choiceLabel(step: WalkStep, value: string, lang: PreLang): string {
  const labels: Record<string, [string, string]> = {
    'ramp:yes': ['Yes, there is a ramp', 'Oui, il y a une rampe'],
    'ramp:no': ['No ramp', 'Aucune rampe'],
    'doorOpening:automatic': ['By itself', 'Toute seule'],
    'doorOpening:button': ['With a button', 'Avec un bouton'],
    'doorOpening:manual': ['By hand', 'À la main'],
    'toilet:yes': ['Yes, I saw one', 'Oui, j’en ai vu une'],
    'toilet:no': ['No, there is none', 'Non, il n’y en a pas'],
    'method:tape': ['With a tape', 'Au ruban'],
    'method:estimate': ['Estimated by eye', 'Estimé à l’œil'],
  };
  const found = labels[`${step}:${value}`];
  return found === undefined ? 'UNKNOWN' : pick(lang, found[0], found[1]);
}

export function unitLabel(unit: Unit, lang: PreLang): string {
  return unit === 'cm' ? pick(lang, 'Centimetres', 'Centimètres') : pick(lang, 'Inches', 'Pouces');
}

/** The range the App keeps for a length question, in the unit the person is typing in. */
export function lengthRange(step: 'stepHeight' | 'doorWidth' | 'toiletDoor', unit: Unit, lang: PreLang): string {
  const limits = { stepHeight: LIMITS.stepHeightCm, doorWidth: LIMITS.doorWidthCm, toiletDoor: LIMITS.toiletDoorCm }[step];
  const show = unit === 'cm' ? formatCm : formatInches;
  return fill(pick(lang, 'From {min} to {max}.', 'De {min} à {max}.'), { min: show(limits.min, lang), max: show(limits.max, lang) });
}

export function answerIssueText(issue: AnswerIssue, lang: PreLang): string {
  switch (issue) {
    case 'empty':
      return pick(lang, 'Nothing is filled in. Answer, or skip this question to leave it UNKNOWN.', 'Rien n’est rempli. Répondez, ou passez cette question pour la laisser UNKNOWN.');
    case 'not-a-whole-number':
      return pick(lang, 'Write a whole number, such as 0 or 3.', 'Écrivez un nombre entier, par exemple 0 ou 3.');
    case 'not-a-length':
      return pick(lang, 'Write a number, such as 82 or 82.5.', 'Écrivez un nombre, par exemple 82 ou 82,5.');
    case 'too-small':
      return pick(lang, 'This is smaller than the App keeps. Look at the number and the unit again.', 'C’est plus petit que ce que l’application garde. Regardez de nouveau le nombre et l’unité.');
    case 'too-large':
      return pick(lang, 'This is larger than the App keeps. Look at the number and the unit again.', 'C’est plus grand que ce que l’application garde. Regardez de nouveau le nombre et l’unité.');
    case 'not-a-choice':
      return pick(lang, 'Choose one of the answers, or skip this question.', 'Choisissez une des réponses, ou passez cette question.');
  }
}

export function positionText(progress: WalkProgress, lang: PreLang): string {
  if (progress.position === null) return pick(lang, 'Look over your answers', 'Relisez vos réponses');
  return fill(pick(lang, 'Question {at} of {total}', 'Question {at} sur {total}'), { at: progress.position, total: progress.total });
}

/** Counts only. Nothing here is a score. */
export function progressText(progress: WalkProgress, lang: PreLang): string {
  const c = colon(lang);
  return [
    `${pick(lang, 'Answered', 'Répondues')}${c}${progress.answered}.`,
    `${pick(lang, 'Skipped, so UNKNOWN', 'Passées, donc UNKNOWN')}${c}${progress.skipped}.`,
    `${pick(lang, 'Still to come', 'À venir')}${c}${progress.left}.`,
  ].join(' ');
}

/** One answer as the review shows it. An unanswered question reads UNKNOWN. */
export function answerText(walk: Walk, step: WalkStep, lang: PreLang): string {
  const value = walk.answers[step];
  if (value === '') return 'UNKNOWN';
  const kind = STEP_KIND[step];
  if (kind === 'count') return value;
  if (kind === 'choice') return choiceLabel(step, value, lang);
  const parsed = parseLength(value);
  return parsed.ok ? `${formatCm(parsed.cm, lang)} (${formatInches(parsed.cm, lang)})` : 'UNKNOWN';
}

export function stepShort(step: WalkStep, lang: PreLang): string {
  switch (step) {
    case 'steps':
      return factLabel('steps', lang);
    case 'stepHeight':
      return factLabel('stepHeightCm', lang);
    case 'ramp':
      return factLabel('ramp', lang);
    case 'doorWidth':
      return factLabel('doorWidthCm', lang);
    case 'doorOpening':
      return factLabel('doorOpening', lang);
    case 'toilet':
      return factLabel('toilet', lang);
    case 'toiletDoor':
      return factLabel('toiletDoorCm', lang);
    case 'method':
      return pick(lang, 'How the lengths were taken', 'Façon de prendre les longueurs');
  }
}

export function changeLabel(kind: ChangeKind, lang: PreLang): string {
  switch (kind) {
    case 'new':
      return pick(lang, 'New', 'Nouveau');
    case 'changed':
      return pick(lang, 'Changes what is saved', 'Change ce qui est enregistré');
    case 'same':
      return pick(lang, 'Same as saved', 'Identique à ce qui est enregistré');
    case 'cleared':
      return pick(lang, 'Goes back to UNKNOWN', 'Redevient UNKNOWN');
  }
}

export function changeLine(change: FactChange, lang: PreLang): string {
  return `${factLabel(change.key, lang)}${colon(lang)}${changeLabel(change.kind, lang).toLowerCase()}.`;
}

export function changesSummary(changes: readonly FactChange[], lang: PreLang): string {
  const counts = changeCounts(changes);
  const c = colon(lang);
  const head = [`${pick(lang, 'New', 'Nouveaux')}${c}${counts.new}.`, `${pick(lang, 'Changed', 'Changés')}${c}${counts.changed}.`, `${pick(lang, 'The same', 'Identiques')}${c}${counts.same}.`].join(' ');
  if (counts.cleared === 0) return head;
  return `${head} ${pick(lang, 'Going back to UNKNOWN', 'Redevenant UNKNOWN')}${c}${counts.cleared}. ${pick(
    lang,
    'Go back and answer those questions if they are still as you saved them.',
    'Revenez répondre à ces questions si elles sont toujours comme vous les avez enregistrées.',
  )}`;
}

/** Said beside an answer that was filled in from an earlier visit. */
export function filledInText(day: string, lang: PreLang): string {
  return fill(
    pick(lang, 'Filled in from what you saved on {day}. Keep it only if it is still so today.', 'Rempli à partir de ce que vous avez enregistré le {day}. Gardez-le seulement si c’est encore le cas aujourd’hui.'),
    { day },
  );
}

export function onSiteNoteText(lang: PreLang): string {
  return pick(
    lang,
    'Answer what you can see and measure yourself. Skip anything you cannot reach or are not sure of: it stays UNKNOWN. Stop where you are not in anyone’s way.',
    'Répondez à ce que vous pouvez voir et mesurer vous-même. Passez ce que vous ne pouvez pas atteindre ou dont vous n’êtes pas sûr\u00a0: cela reste UNKNOWN. Arrêtez-vous là où vous ne gênez personne.',
  );
}

export function nothingAnsweredText(lang: PreLang): string {
  return pick(lang, 'Nothing is answered yet, so there is nothing to save. Go back and answer at least one question.', 'Rien n’est encore répondu, donc il n’y a rien à enregistrer. Revenez répondre à au moins une question.');
}
