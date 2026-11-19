/** Words for the revisit list. Every string exists in English and French. */
import type { RevisitList } from './list.js';
import type { Stop, VisitOrder } from './order.js';
import { OLD_DAYS, VERY_OLD_DAYS, type Reason, type RevisitRecord } from './reasons.js';
import { colon, fill, formatDecimal, formatMetres, pick, type PreLang } from '../presubmit/text.js';

export function reasonLabel(reason: Reason, lang: PreLang): string {
  switch (reason) {
    case 'packs-disagree':
      return pick(lang, 'Packs disagree', 'Les paquets se contredisent');
    case 'status-unknown':
      return pick(lang, 'Status is UNKNOWN', 'L’état est UNKNOWN');
    case 'very-old':
      return pick(lang, 'Seen two years ago or more', 'Vu il y a deux ans ou plus');
    case 'old':
      return pick(lang, 'Seen one to two years ago', 'Vu il y a un à deux ans');
    case 'date-unclear':
      return pick(lang, 'Date is not clear', 'La date n’est pas claire');
    case 'no-name':
      return pick(lang, 'No name recorded', 'Aucun nom noté');
  }
}

export function reasonText(reason: Reason, lang: PreLang): string {
  switch (reason) {
    case 'packs-disagree':
      return pick(
        lang,
        'Two loaded packs say different things about this place, so the App shows UNKNOWN. A visit could settle what is there now.',
        'Deux paquets chargés disent des choses différentes sur ce lieu, donc l’application affiche UNKNOWN. Une visite pourrait dire ce qu’il en est maintenant.',
      );
    case 'status-unknown':
      return pick(lang, 'Nobody recorded a status here. UNKNOWN is not a no.', 'Personne n’a noté d’état ici. UNKNOWN n’est pas un non.');
    case 'very-old':
      return fill(pick(lang, 'The record is {days} days old or more. Places change.', 'La fiche a {days} jours ou plus. Les lieux changent.'), { days: VERY_OLD_DAYS });
    case 'old':
      return fill(pick(lang, 'The record is {days} days old or more.', 'La fiche a {days} jours ou plus.'), { days: OLD_DAYS });
    case 'date-unclear':
      return pick(lang, 'The date on the record is not a real day, or is after today.', 'La date de la fiche n’est pas un vrai jour, ou est après aujourd’hui.');
    case 'no-name':
      return pick(lang, 'The record has no name. Note the name on the sign if there is one.', 'La fiche n’a pas de nom. Notez le nom sur l’enseigne s’il y en a une.');
  }
}

/** Status, source, licence, date and tier for one record. A record carries no tier, so the tier is UNKNOWN. */
export function recordLine(record: RevisitRecord, lang: PreLang): string {
  return fill(
    pick(
      lang,
      'Status now: {status}. Source: {source}. Licence: {licence}. Seen on {date}. Tier: UNKNOWN.',
      'État actuel\u00a0: {status}. Source\u00a0: {source}. Licence\u00a0: {licence}. Vu le {date}. Niveau\u00a0: UNKNOWN.',
    ),
    { status: record.wheelchair, source: record.source, licence: record.licence, date: record.observedOn },
  );
}

export function coordinatesText(record: RevisitRecord, lang: PreLang): string {
  return `${formatDecimal(record.lat, 5, lang)}${pick(lang, ', ', '\u202f; ')}${formatDecimal(record.lon, 5, lang)}`;
}

export function kmText(km: number, lang: PreLang): string {
  return fill(pick(lang, '{distance} from your start, in a straight line.', 'À {distance} de votre départ, en ligne droite.'), { distance: formatMetres(km * 1000, lang) });
}

export function legText(stop: Stop, lang: PreLang): string {
  if (stop.metresFromPrevious === null) return '';
  return fill(
    stop.order === 1
      ? pick(lang, '{distance} from your start, in a straight line.', 'À {distance} de votre départ, en ligne droite.')
      : pick(lang, '{distance} from the stop before, in a straight line.', 'À {distance} de l’arrêt précédent, en ligne droite.'),
    { distance: formatMetres(stop.metresFromPrevious, lang) },
  );
}

export function orderNoteText(order: VisitOrder, lang: PreLang): string {
  if (order.stops.length === 0) return '';
  const total = fill(pick(lang, 'Straight-line total: {distance}.', 'Total en ligne droite\u00a0: {distance}.'), { distance: formatMetres(order.totalMetres, lang) });
  const caveat = pick(
    lang,
    'The order goes to the nearest place each time. It knows nothing about kerbs, slopes, stairs or closures, so plan your own way.',
    'L’ordre va chaque fois au lieu le plus proche. Il ne sait rien des bordures, des pentes, des escaliers ou des fermetures, alors prévoyez votre propre trajet.',
  );
  return order.stops.length > 1 ? `${total} ${caveat}` : caveat;
}

export function listSummaryText(list: RevisitList, lang: PreLang): string {
  if (list.considered === 0) return pick(lang, 'No pack is loaded on this device, so there is no place to list.', 'Aucun paquet n’est chargé sur cet appareil, donc il n’y a aucun lieu à lister.');
  const part = (en: string, fr: string, n: number) => `${pick(lang, en, fr)}${colon(lang)}${n}.`;
  const parts = [part('Places looked at', 'Lieux examinés', list.considered), part('With a reason to revisit', 'Avec une raison de revoir', list.matched), part('Shown', 'Affichés', list.items.length)];
  parts.push(pick(lang, 'A reason is a prompt to go and look. It does not say what you will find.', 'Une raison est une invitation à aller voir. Elle ne dit pas ce que vous trouverez.'));
  return parts.join(' ');
}
