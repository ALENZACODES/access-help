/**
 * The end-of-day summary. It says what was recorded and what was not, and what the numbers
 * cannot say. It never rates an area and never calls an empty cell inaccessible.
 */
import { cellsWithRecordsText, revisitList, stateText, type Coverage } from './day-coverage';
import type { MappingDay } from './day-session';
import { focusLabels } from './day-session';
import { colon, daysBetween, fill, formatShare, plural, type DayLang } from './day-text';

export interface DebriefSection {
  id: 'recorded' | 'unknown' | 'cells' | 'outside' | 'dates' | 'next' | 'limits';
  title: string;
  lines: string[];
}

const STATUS_LINE: Record<'yes' | 'limited' | 'no', Record<DayLang, string>> = {
  yes: { en: 'recorded as step-free entrance', fr: 'consignées comme entrée sans marche' },
  limited: { en: 'recorded as partial access', fr: 'consignées comme accès partiel' },
  no: { en: 'recorded as no step-free access', fr: 'consignées comme sans accès de plain-pied' },
};

const TITLE: Record<DebriefSection['id'], Record<DayLang, string>> = {
  recorded: { en: 'What you recorded', fr: 'Ce que vous avez consigné' },
  unknown: { en: 'UNKNOWN', fr: 'UNKNOWN' },
  cells: { en: 'Cells', fr: 'Cellules' },
  outside: { en: 'Outside the area', fr: 'Hors de la zone' },
  dates: { en: 'Dates', fr: 'Dates' },
  next: { en: 'Where you might look next', fr: 'Où regarder ensuite' },
  limits: { en: 'What this does not say', fr: 'Ce que cela ne dit pas' },
};

export interface DebriefOptions {
  /** How many cells to list under "next". */
  nextLimit?: number;
  /** Today, YYYY-MM-DD. Needed only to say how old the newest record is. */
  today?: string;
}

export function buildDebrief(session: MappingDay, coverage: Coverage, lang: DayLang, options: DebriefOptions = {}): DebriefSection[] {
  const s = coverage.summary;
  const records = plural(lang, s.records, lang === 'fr' ? 'fiche' : 'record', lang === 'fr' ? 'fiches' : 'records');
  const sections: DebriefSection[] = [];

  const recorded: string[] = [];
  recorded.push(fill(lang === 'fr' ? '{count} {records} dans la zone « {name} ».' : '{count} {records} inside “{name}”.', { count: s.records, records, name: session.name }));
  for (const status of ['yes', 'limited', 'no'] as const) {
    if (s.byStatus[status] > 0) recorded.push(`${s.byStatus[status]} ${STATUS_LINE[status][lang]}.`);
  }
  const focus = focusLabels(session, lang);
  if (focus.length > 0) recorded.push(`${lang === 'fr' ? 'Prévu' : 'Planned focus'}${colon(lang)}${focus.join(', ')}.`);
  sections.push({ id: 'recorded', title: TITLE.recorded[lang], lines: recorded });

  const unknown: string[] = [];
  if (s.records === 0) {
    unknown.push(lang === 'fr' ? 'Aucune fiche, donc rien à dire de UNKNOWN.' : 'No records, so there is nothing to say about UNKNOWN.');
  } else {
    unknown.push(fill(lang === 'fr' ? 'Fiches UNKNOWN\u00a0: {count} ({share} des fiches de la zone).' : 'UNKNOWN records: {count} ({share} of the records in the area).', { count: s.byStatus.UNKNOWN, share: formatShare(s.unknownShare, lang) }));
    unknown.push(lang === 'fr' ? 'UNKNOWN veut dire que vous n’avez pas observé ce point, ou ne l’avez pas noté. Ce n’est pas « non », et aucune balise wheelchair n’est écrite pour une fiche UNKNOWN.' : 'UNKNOWN means you did not observe it, or did not write it down. It is not “no”, and no wheelchair tag is written for an UNKNOWN record.');
  }
  sections.push({ id: 'unknown', title: TITLE.unknown[lang], lines: unknown });

  const cells: string[] = [cellsWithRecordsText(s, lang)];
  cells.push(
    fill(lang === 'fr' ? '{a} cellules contiennent des statuts consignés, {b} seulement des fiches UNKNOWN et {c} aucune fiche pour l’instant.' : '{a} cells hold recorded statuses, {b} hold only UNKNOWN records and {c} have no record yet.', { a: s.cellsWithRecordedStatus, b: s.cellsOnlyUnknown, c: s.cellsNoRecord }),
  );
  sections.push({ id: 'cells', title: TITLE.cells[lang], lines: cells });

  if (s.outside > 0 || coverage.skippedIds.length > 0) {
    const outside: string[] = [];
    if (s.outside > 0) outside.push(fill(lang === 'fr' ? 'Fiches hors de la zone, non comptées dans une cellule\u00a0: {count}.' : 'Records outside the area, not counted in any cell: {count}.', { count: s.outside }));
    if (coverage.skippedIds.length > 0) outside.push(fill(lang === 'fr' ? 'Fiches laissées de côté parce que leur statut n’est pas reconnu (non comptées comme UNKNOWN)\u00a0: {count}.' : 'Records left out because their status is not recognised (not counted as UNKNOWN): {count}.', { count: coverage.skippedIds.length }));
    sections.push({ id: 'outside', title: TITLE.outside[lang], lines: outside });
  }

  const dated = coverage.cells.filter((c) => c.newest !== null);
  if (dated.length > 0) {
    const oldest = dated.map((c) => c.oldest as string).sort()[0] as string;
    const newest = dated.map((c) => c.newest as string).sort().reverse()[0] as string;
    const lines = [fill(lang === 'fr' ? 'Observations datées du {oldest} au {newest}.' : 'Observations dated {oldest} to {newest}.', { oldest, newest })];
    if (options.today) {
      const age = daysBetween(newest, options.today);
      if (age !== null && age > 0) lines.push(fill(lang === 'fr' ? 'La plus récente a {days} jours.' : 'The newest is {days} days old.', { days: age }));
    }
    if (oldest !== session.date && session.date > oldest) lines.push(lang === 'fr' ? 'Certaines fiches sont antérieures à cette journée.' : 'Some records are older than this mapping day.');
    sections.push({ id: 'dates', title: TITLE.dates[lang], lines });
  }

  const next = revisitList(coverage, options.nextLimit ?? 8);
  const nextLines =
    next.length === 0
      ? [lang === 'fr' ? 'Toutes les cellules contiennent un statut consigné. Cela ne veut pas dire que la zone est connue en entier.' : 'Every cell holds a recorded status. That does not mean the area is fully known.']
      : next.map((c) => `${c.label}${lang === 'fr' ? ' ' : ''}: ${stateText(c.state, lang)}`);
  sections.push({ id: 'next', title: TITLE.next[lang], lines: nextLines });

  sections.push({
    id: 'limits',
    title: TITLE.limits[lang],
    lines:
      lang === 'fr'
        ? [
            'Ce sont vos propres observations, faites un jour donné. Personne d’autre ne les a contrôlées.',
            'Ce bilan n’est pas une note et ne classe pas la zone.',
            'Une cellule sans fiche n’est pas inaccessible : personne n’y a rien noté pour l’instant.',
            'Ceci n’est pas un avis médical ni d’admissibilité.',
          ]
        : [
            'These are your own observations, made on one day. Nobody else has checked them.',
            'This debrief is not a score and does not rank the area.',
            'A cell with no record is not inaccessible: nothing has been written down there yet.',
            'This is not medical or eligibility advice.',
          ],
  });
  return sections;
}

export function renderDebrief(session: MappingDay, sections: readonly DebriefSection[], lang: DayLang, format: 'text' | 'markdown' = 'text'): string {
  const head = fill(lang === 'fr' ? 'Bilan de la journée de cartographie « {name} » ({date})' : 'Mapping day debrief: “{name}” ({date})', { name: session.name, date: session.date });
  const out: string[] = [format === 'markdown' ? `# ${head}` : head, ''];
  for (const section of sections) {
    out.push(format === 'markdown' ? `## ${section.title}` : section.title);
    for (const line of section.lines) out.push(format === 'markdown' ? `- ${line}` : `  ${line}`);
    out.push('');
  }
  return `${out.join('\n').trimEnd()}\n`;
}
