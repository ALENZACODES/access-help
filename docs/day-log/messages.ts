/** Words for the day log. Every string exists in English and French. */
import { longDay } from './calendar.js';
import { LOG_STATUSES, type DayGroup, type DayStats, type LogNote, type LogTotals } from './days.js';
import { colon, fill, formatMetres, joinList, pick, plural, type PreLang } from '../presubmit/text.js';

export function statusCountsText(byStatus: DayStats['byStatus'], lang: PreLang): string {
  return LOG_STATUSES.map((status) => `${status}${colon(lang)}${byStatus[status]}`).join(pick(lang, '; ', '\u202f; '));
}

export function dayHeading(day: string, lang: PreLang): string {
  const long = longDay(day, lang);
  return long === '' ? day : `${long} (${day})`;
}

export function dayCountText(count: number, lang: PreLang): string {
  const noun = plural(lang, count, pick(lang, 'observation', 'observation'), pick(lang, 'observations', 'observations'));
  return `${count} ${noun}`;
}

export function gapText(daysSincePrevious: number | null, lang: PreLang): string {
  if (daysSincePrevious === null) return pick(lang, 'This is the earliest day in your log.', 'C’est le premier jour de votre journal.');
  const unit = plural(lang, daysSincePrevious, pick(lang, 'day', 'jour'), pick(lang, 'days', 'jours'));
  return fill(pick(lang, '{n} {unit} after the day before it in your log.', '{n} {unit} après le jour précédent de votre journal.'), { n: daysSincePrevious, unit });
}

export function spanText(metres: number, total: number, lang: PreLang): string {
  if (total < 2) return '';
  return fill(pick(lang, 'The places are spread over {distance}, in a straight line.', 'Les lieux s’étendent sur {distance}, en ligne droite.'), { distance: formatMetres(metres, lang) });
}

export function dayStatLines(group: DayGroup, lang: PreLang): string[] {
  const { stats } = group;
  const lines = [
    `${pick(lang, 'Observations', 'Observations')}${colon(lang)}${stats.total}.`,
    `${pick(lang, 'By status', 'Par état')} - ${statusCountsText(stats.byStatus, lang)}.`,
    `${pick(lang, 'Licences', 'Licences')} - ${stats.licences.map((l) => `${l.licence}${colon(lang)}${l.count}`).join(pick(lang, '; ', '\u202f; '))}.`,
  ];
  if (stats.sources.length > 0) lines.push(`${pick(lang, 'Sources', 'Sources')}${colon(lang)}${joinList(stats.sources, lang)}.`);
  if (stats.unnamed > 0) lines.push(`${pick(lang, 'Without a name', 'Sans nom')}${colon(lang)}${stats.unnamed}.`);
  const span = spanText(stats.spanMetres, stats.total, lang);
  if (span !== '') lines.push(span);
  lines.push(gapText(group.daysSincePrevious, lang));
  return lines;
}

/** Status, source, licence, date and tier for one note. A note carries no tier, so the tier is UNKNOWN. */
export function logNoteLine(note: LogNote, lang: PreLang): string {
  return fill(
    pick(
      lang,
      'Status: {status}. Source: {source}. Licence: {licence}. Seen on {date}. Tier: UNKNOWN.',
      'État\u00a0: {status}. Source\u00a0: {source}. Licence\u00a0: {licence}. Vu le {date}. Niveau\u00a0: UNKNOWN.',
    ),
    { status: note.wheelchair, source: note.source, licence: note.licence, date: note.observedOn },
  );
}

export function totalsLines(totals: LogTotals, lang: PreLang): string[] {
  if (totals.notes === 0) return [pick(lang, 'You have no saved observations.', 'Vous n’avez aucune observation enregistrée.')];
  const lines = [
    `${pick(lang, 'Days with observations', 'Jours avec des observations')}${colon(lang)}${totals.days}.`,
    `${pick(lang, 'Observations', 'Observations')}${colon(lang)}${totals.notes}.`,
    `${pick(lang, 'By status', 'Par état')} - ${statusCountsText(totals.byStatus, lang)}.`,
  ];
  if (totals.firstDay !== null && totals.lastDay !== null) {
    lines.push(fill(pick(lang, 'From {first} to {last}.', 'Du {first} au {last}.'), { first: totals.firstDay, last: totals.lastDay }));
  }
  if (totals.busiestDay !== null) lines.push(`${pick(lang, 'Day with the most observations', 'Jour avec le plus d’observations')}${colon(lang)}${totals.busiestDay}.`);
  if (totals.undated > 0) lines.push(`${pick(lang, 'With a date that is not a real day', 'Avec une date qui n’est pas un vrai jour')}${colon(lang)}${totals.undated}.`);
  lines.push(pick(lang, 'These are counts of what you saved. They do not say a day is finished.', 'Ce sont des décomptes de ce que vous avez enregistré. Ils ne disent pas qu’une journée est terminée.'));
  return lines;
}

export function calendarCellText(day: number, count: number, lang: PreLang): string {
  return count === 0 ? String(day) : `${day}, ${dayCountText(count, lang)}`;
}
