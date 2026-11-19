/** Words for the comparison. Every string exists in English and French. */
import type { CompareReport, Comparison, Newer, Outcome } from './compare.js';
import type { MatchKind, NoteRecord } from './match.js';
import { colon, fill, formatMetres, pick, plural, type PreLang } from '../presubmit/text.js';

export function outcomeLabel(outcome: Outcome, lang: PreLang): string {
  switch (outcome) {
    case 'differs':
      return pick(lang, 'Your note and the pack differ', 'Votre note et le paquet diffèrent');
    case 'unsure':
      return pick(lang, 'Not clear which pack place this is', 'Lieu du paquet incertain');
    case 'fills-unknown':
      return pick(lang, 'The pack has UNKNOWN, you have a status', 'Le paquet indique UNKNOWN, vous avez un état');
    case 'new':
      return pick(lang, 'No pack place nearby', 'Aucun lieu du paquet à proximité');
    case 'mine-unknown':
      return pick(lang, 'The pack has a status, yours is UNKNOWN', 'Le paquet a un état, le vôtre est UNKNOWN');
    case 'both-unknown':
      return pick(lang, 'UNKNOWN in both', 'UNKNOWN des deux côtés');
    case 'agrees':
      return pick(lang, 'Your note and the pack agree', 'Votre note et le paquet concordent');
  }
}

export function outcomeAdvice(outcome: Outcome, lang: PreLang): string {
  switch (outcome) {
    case 'differs':
      return pick(
        lang,
        'The App does not say which is right. Look at your notes and both dates before you change anything on the map.',
        'L’application ne dit pas lequel est juste. Relisez vos notes et les deux dates avant de changer quoi que ce soit sur la carte.',
      );
    case 'unsure':
      return pick(
        lang,
        'More than one pack place is close, or the nearest has a different name. Find the place on the map yourself before you add anything.',
        'Plus d’un lieu du paquet est proche, ou le plus proche porte un autre nom. Trouvez vous-même le lieu sur la carte avant d’ajouter quoi que ce soit.',
      );
    case 'fills-unknown':
      return pick(
        lang,
        'Your observation may add something the pack does not have. UNKNOWN in the pack means nobody recorded it there.',
        'Votre observation peut ajouter quelque chose que le paquet n’a pas. UNKNOWN dans le paquet veut dire que personne ne l’a noté.',
      );
    case 'new':
      return pick(
        lang,
        'The packs on this device have no place within the distance you chose. The place may still be on the map, so look there first.',
        'Les paquets de cet appareil n’ont aucun lieu dans la distance choisie. Le lieu peut quand même être sur la carte, alors regardez-y d’abord.',
      );
    case 'mine-unknown':
      return pick(
        lang,
        'Your note records no status, so it changes nothing about access. UNKNOWN never replaces a recorded status.',
        'Votre note ne donne aucun état, donc elle ne change rien pour l’accès. UNKNOWN ne remplace jamais un état noté.',
      );
    case 'both-unknown':
      return pick(lang, 'Neither record has a status. A visit could fill this in.', 'Aucune des deux fiches n’a d’état. Une visite pourrait le préciser.');
    case 'agrees':
      return pick(lang, 'Both records give the same status. There may be nothing to add.', 'Les deux fiches donnent le même état. Il n’y a peut-être rien à ajouter.');
  }
}

export function matchKindText(kind: MatchKind, lang: PreLang): string {
  switch (kind) {
    case 'none':
      return pick(lang, 'No place within the distance.', 'Aucun lieu dans la distance.');
    case 'same-id':
      return pick(lang, 'Same id as a pack place.', 'Même identifiant qu’un lieu du paquet.');
    case 'name-and-place':
      return pick(lang, 'A pack place close by has a similar name.', 'Un lieu du paquet tout près porte un nom semblable.');
    case 'place-only':
      return pick(lang, 'One pack place is close by. A name is missing, so only the position was compared.', 'Un lieu du paquet est tout près. Un nom manque, donc seule la position a été comparée.');
    case 'unsure':
      return pick(lang, 'The App could not tell which pack place this is.', 'L’application n’a pas pu dire de quel lieu du paquet il s’agit.');
  }
}

export function newerText(newer: Newer, daysApart: number | null, lang: PreLang): string {
  const days = daysApart ?? 0;
  const unit = plural(lang, days, pick(lang, 'day', 'jour'), pick(lang, 'days', 'jours'));
  switch (newer) {
    case 'mine':
      return fill(pick(lang, 'Your note is {days} {unit} newer than the pack record.', 'Votre note est plus récente de {days} {unit} que la fiche du paquet.'), { days, unit });
    case 'theirs':
      return fill(pick(lang, 'The pack record is {days} {unit} newer than your note.', 'La fiche du paquet est plus récente de {days} {unit} que votre note.'), { days, unit });
    case 'same-day':
      return pick(lang, 'Both were seen on the same day.', 'Les deux ont été vus le même jour.');
    case 'unknown':
      return '';
  }
}

export function distanceText(metres: number, lang: PreLang): string {
  return fill(pick(lang, '{distance} apart.', 'À {distance} l’un de l’autre.'), { distance: formatMetres(metres, lang) });
}

/** Source, licence, date and tier for one record. A record carries no tier, so the tier is UNKNOWN. */
export function recordLine(record: NoteRecord, lang: PreLang): string {
  return fill(
    pick(
      lang,
      'Status: {status}. Source: {source}. Licence: {licence}. Seen on {date}. Tier: UNKNOWN.',
      'État\u00a0: {status}. Source\u00a0: {source}. Licence\u00a0: {licence}. Vu le {date}. Niveau\u00a0: UNKNOWN.',
    ),
    { status: record.wheelchair, source: record.source, licence: record.licence, date: record.observedOn },
  );
}

export function flagTexts(item: Comparison, lang: PreLang): string[] {
  const out: string[] = [];
  if (item.match.best !== null) out.push(distanceText(item.match.best.metres, lang));
  const newer = newerText(item.newer, item.daysApart, lang);
  if (newer !== '') out.push(newer);
  if (item.nameDiffers) out.push(pick(lang, 'The names are different.', 'Les noms sont différents.'));
  if (item.licenceDiffers) out.push(pick(lang, 'The two records have different licences. Each keeps its own.', 'Les deux fiches ont des licences différentes. Chacune garde la sienne.'));
  return out;
}

export function compareSummaryText(report: CompareReport, lang: PreLang): string {
  const c = report.counts;
  if (c.total === 0) return pick(lang, 'You have no saved observations to compare.', 'Vous n’avez aucune observation enregistrée à comparer.');
  if (report.packPlaces === 0) return pick(lang, 'No pack is loaded on this device, so there is nothing to compare with.', 'Aucun paquet n’est chargé sur cet appareil, donc il n’y a rien avec quoi comparer.');
  const part = (en: string, fr: string, n: number) => `${pick(lang, en, fr)}${colon(lang)}${n}.`;
  return [
    part('Observations compared', 'Observations comparées', c.total),
    part('Differ from the pack', 'Diffèrent du paquet', c.differs),
    part('Not clear', 'Incertaines', c.unsure),
    part('Fill an UNKNOWN', 'Précisent un UNKNOWN', c['fills-unknown']),
    part('No pack place nearby', 'Sans lieu du paquet à proximité', c.new),
    part('Agree', 'Concordent', c.agrees),
    part('UNKNOWN on your side or both', 'UNKNOWN de votre côté ou des deux', c['mine-unknown'] + c['both-unknown']),
    fill(pick(lang, 'Distance used: {m} m.', 'Distance utilisée\u00a0: {m}\u00a0m.'), { m: report.radius }),
    pick(lang, 'A match is a suggestion. The App does not say two records are the same place.', 'Un rapprochement est une suggestion. L’application ne dit pas que deux fiches sont le même lieu.'),
  ].join(' ');
}
