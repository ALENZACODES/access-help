/** Words for a sitting: outcomes, reasons, counts and what was left out. English and French. */
import type { AddedGroup } from './groups.js';
import { isWide } from './groups.js';
import { LEFT_OUT_REASONS, leftOutCounts, type LeftOut, type LeftOutReason, type QueueOrder } from './queue.js';
import type { Outcome, OutcomeKind, SessionCounts, SkipReason } from './session.js';
import { colon, fill, formatMetres, pick, plural, type PreLang } from '../presubmit/text.js';

export function orderLabel(order: QueueOrder, lang: PreLang): string {
  switch (order) {
    case 'newest':
      return pick(lang, 'Newest first', 'Les plus récentes d’abord');
    case 'oldest':
      return pick(lang, 'Oldest first', 'Les plus anciennes d’abord');
    case 'nearby':
      return pick(lang, 'Place by place, closest next', 'Lieu par lieu, le plus proche ensuite');
  }
}

export function orderHint(order: QueueOrder, lang: PreLang): string {
  switch (order) {
    case 'newest':
      return pick(lang, 'What you saw most recently comes first.', 'Ce que vous avez vu le plus récemment vient en premier.');
    case 'oldest':
      return pick(lang, 'What has waited longest comes first.', 'Ce qui attend depuis le plus longtemps vient en premier.');
    case 'nearby':
      return pick(
        lang,
        'Starts at your newest observation and goes to the closest one left, in a straight line. It is an order for the editor, not a route to travel.',
        'Commence par votre observation la plus récente et passe à la plus proche qui reste, en ligne droite. C’est un ordre pour l’éditeur, pas un trajet à suivre.',
      );
  }
}

export function leftOutReasonText(reason: LeftOutReason, lang: PreLang): string {
  switch (reason) {
    case 'already-marked':
      return pick(lang, 'Already on your list of what you added', 'Déjà sur votre liste de ce que vous avez ajouté');
    case 'status-unknown':
      return pick(lang, 'Status UNKNOWN, so there is nothing to add', 'État UNKNOWN, donc rien à ajouter');
    case 'no-source':
      return pick(lang, 'No source written', 'Aucune source inscrite');
  }
}

/** One line per reason that applies, with its count. Empty when nothing was left out. */
export function leftOutLines(leftOut: readonly LeftOut[], lang: PreLang): string[] {
  const counts = leftOutCounts(leftOut);
  return LEFT_OUT_REASONS.filter((reason) => counts[reason] > 0).map((reason) => `${leftOutReasonText(reason, lang)}${colon(lang)}${counts[reason]}.`);
}

export function readyText(ready: number, overflow: number, lang: PreLang): string {
  const c = colon(lang);
  const head = `${pick(lang, 'Ready to go through', 'Prêtes à parcourir')}${c}${ready}.`;
  if (overflow <= 0) return head;
  return `${head} ${pick(lang, 'Waiting for another sitting', 'En attente d’une autre séance')}${c}${overflow}.`;
}

export function outcomeLabel(kind: OutcomeKind | 'open', lang: PreLang): string {
  switch (kind) {
    case 'added':
      return pick(lang, 'You said you added it', 'Vous avez dit l’avoir ajoutée');
    case 'skipped':
      return pick(lang, 'Skipped', 'Passée');
    case 'later':
      return pick(lang, 'For later', 'Pour plus tard');
    case 'open':
      return pick(lang, 'Not looked at yet', 'Pas encore regardée');
  }
}

export function skipReasonText(reason: SkipReason, lang: PreLang): string {
  switch (reason) {
    case 'already-on-map':
      return pick(lang, 'The map already says the same', 'La carte dit déjà la même chose');
    case 'could-not-find':
      return pick(lang, 'I could not find the place on the map', 'Je n’ai pas trouvé le lieu sur la carte');
    case 'not-sure':
      return pick(lang, 'I am not sure of what I saw', 'Je ne suis pas sûr de ce que j’ai vu');
    case 'map-is-newer':
      return pick(lang, 'The map was checked after my visit', 'La carte a été contrôlée après ma visite');
    case 'other':
      return pick(lang, 'Another reason', 'Une autre raison');
  }
}

/** The outcome as one phrase, with the reason or changeset number when there is one. */
export function outcomeText(outcome: Outcome | undefined, lang: PreLang): string {
  if (outcome === undefined) return outcomeLabel('open', lang);
  if (outcome.kind === 'skipped') return `${outcomeLabel('skipped', lang)}${colon(lang)}${skipReasonText(outcome.reason, lang).toLowerCase()}`;
  if (outcome.kind === 'added' && outcome.changeset !== null) {
    return fill(pick(lang, '{label}, changeset {n}', '{label}, lot de modifications {n}'), { label: outcomeLabel('added', lang), n: outcome.changeset });
  }
  return outcomeLabel(outcome.kind, lang);
}

/** Counts only. No score, no praise and no target. */
export function countsText(counts: SessionCounts, lang: PreLang): string {
  const c = colon(lang);
  return [
    `${pick(lang, 'In this sitting', 'Dans cette séance')}${c}${counts.total}.`,
    `${pick(lang, 'Said added', 'Dites ajoutées')}${c}${counts.added}.`,
    `${pick(lang, 'Skipped', 'Passées')}${c}${counts.skipped}.`,
    `${pick(lang, 'For later', 'Pour plus tard')}${c}${counts.later}.`,
    `${pick(lang, 'Not looked at yet', 'Pas encore regardées')}${c}${counts.open}.`,
  ].join(' ');
}

export function positionText(at: number, total: number, lang: PreLang): string {
  return fill(pick(lang, 'Observation {at} of {total}', 'Observation {at} sur {total}'), { at: at + 1, total });
}

export function nextStopText(metres: number | null, lang: PreLang): string {
  if (metres === null) return '';
  return `${pick(lang, 'Next one, in a straight line', 'La suivante, en ligne droite')}${colon(lang)}${formatMetres(metres, lang)}.`;
}

export function groupHeading(group: AddedGroup, lang: PreLang): string {
  const places = plural(lang, group.ids.length, pick(lang, 'place', 'lieu'), pick(lang, 'places', 'lieux'));
  if (group.changeset === null) return fill(pick(lang, 'No changeset number: {n} {places}', 'Sans numéro de lot de modifications\u00a0: {n} {places}'), { n: group.ids.length, places });
  return fill(pick(lang, 'Changeset {id}: {n} {places}', 'Lot de modifications {id}\u00a0: {n} {places}'), { id: group.changeset, n: group.ids.length, places });
}

export function groupNotes(group: AddedGroup, lang: PreLang): string[] {
  const out: string[] = [];
  if (group.ids.length > 1) out.push(`${pick(lang, 'Widest gap between two of them, in a straight line', 'Plus grand écart entre deux d’entre eux, en ligne droite')}${colon(lang)}${formatMetres(group.spanMetres, lang)}.`);
  if (isWide(group)) {
    out.push(
      pick(
        lang,
        'These places are far apart for one changeset. Look at the number again in case two were mixed up.',
        'Ces lieux sont éloignés pour un seul lot de modifications. Regardez le numéro de nouveau au cas où deux auraient été confondus.',
      ),
    );
  }
  if (group.changeset === null) out.push(pick(lang, 'You can write the number in later on your list of what you added.', 'Vous pourrez inscrire le numéro plus tard sur votre liste de ce que vous avez ajouté.'));
  return out;
}

export function cannotSeeText(lang: PreLang): string {
  return pick(
    lang,
    'The App adds nothing to OpenStreetMap and cannot see it. "Added" here means you said so. Whether an edit stays is up to the map’s own community.',
    'L’application n’ajoute rien à OpenStreetMap et ne peut pas la voir. «\u202fAjoutée\u202f» veut dire ici que vous l’avez dit. Le maintien d’une modification dépend de la communauté de la carte.',
  );
}

export function restText(lang: PreLang): string {
  return pick(lang, 'Stop whenever you like. The sitting is kept on this device and you can pick it up again.', 'Arrêtez quand vous voulez. La séance est gardée sur cet appareil et vous pourrez la reprendre.');
}
