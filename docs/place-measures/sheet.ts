/** Writes the measures for one place as a plain text sheet, and all of them as CSV. */
import { describeMeasures, measureTagText, measureTags } from './describe.js';
import { descriptionNote, factLabel, factValue, methodText, noJudgmentText, stillUnknownText, tagsNoteText } from './messages.js';
import { FACT_KEYS, type Measures } from './measures.js';
import { colon, pick, type PreLang } from '../presubmit/text.js';

export interface MeasuredPlace {
  id: string;
  name: string | null;
  wheelchair: string;
  source: string;
  licence: string;
  observedOn: string;
}

function nameOf(place: MeasuredPlace, lang: PreLang): string {
  return place.name === null || place.name.trim() === '' ? pick(lang, 'Place without a name', 'Lieu sans nom') : place.name.trim();
}

function statusOf(place: MeasuredPlace): string {
  return ['yes', 'limited', 'no'].includes(place.wheelchair) ? place.wheelchair : 'UNKNOWN';
}

/** Status, source, licence, date and tier of the observation the measures belong to. */
export function placeLine(place: MeasuredPlace, lang: PreLang): string {
  const c = colon(lang);
  return [
    `${pick(lang, 'Status', 'État')}${c}${statusOf(place)}.`,
    `${pick(lang, 'Source', 'Source')}${c}${place.source.trim() === '' ? 'UNKNOWN' : place.source.trim()}.`,
    `${pick(lang, 'Licence', 'Licence')}${c}${place.licence}.`,
    `${pick(lang, 'Seen', 'Vu')}${c}${place.observedOn}.`,
    `${pick(lang, 'Tier', 'Niveau')}${c}UNKNOWN.`,
  ].join(' ');
}

export function measureSheetText(place: MeasuredPlace, measures: Measures, lang: PreLang): string {
  const c = colon(lang);
  const lines: string[] = [pick(lang, `Measures: ${nameOf(place, lang)}`, `Mesures\u00a0: ${nameOf(place, lang)}`), placeLine(place, lang), noJudgmentText(lang), ''];
  lines.push(`${pick(lang, 'Measured on', 'Mesuré le')}${c}${measures.measuredOn}.`, `${pick(lang, 'How', 'Comment')}${c}${methodText(measures, lang)}.`);
  for (const key of FACT_KEYS) lines.push(`${factLabel(key, lang)}${c}${factValue(measures, key, lang)}`);
  const unknown = stillUnknownText(measures, lang);
  if (unknown !== '') lines.push(unknown);
  const description = describeMeasures(measures, lang);
  lines.push('', pick(lang, 'Description for the map', 'Description pour la carte'));
  if (description.text !== '') lines.push(description.text);
  lines.push(descriptionNote(description, lang));
  const tags = measureTags(measures, lang);
  lines.push('', pick(lang, 'Tags to type', 'Balises à taper'));
  lines.push(tags.length === 0 ? pick(lang, '(none)', '(aucune)') : measureTagText(tags), tagsNoteText(lang));
  return `${lines.join('\n')}\n`;
}

export function measureSheetFilename(place: Pick<MeasuredPlace, 'id'>): string {
  const safe = place.id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return `measures-${safe === '' ? 'observation' : safe}.txt`;
}

export const MEASURE_COLUMNS = [
  'id', 'name', 'status', 'source', 'licence', 'observed_on', 'tier', 'measured_on', 'method', 'steps', 'highest_step_cm', 'door_width_cm', 'door_opening', 'ramp', 'wheelchair_toilet', 'toilet_door_cm',
] as const;

function csvCell(value: string | number | null): string {
  let text = value === null ? 'UNKNOWN' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * One line per measured observation. A fact nobody measured is written UNKNOWN, never left
 * blank, so a spreadsheet cannot read it as zero. A length that does not apply, such as a step
 * height where there is no step, is written none. Places with no measures are left out.
 */
export function measuresCsv(places: readonly MeasuredPlace[], entries: readonly Measures[]): string {
  const byId = new Map(entries.map((entry) => [entry.recordId, entry]));
  const lines = [MEASURE_COLUMNS.join(',')];
  for (const place of places) {
    const m = byId.get(place.id);
    if (m === undefined) continue;
    lines.push(
      [
        place.id, place.name === null ? '' : place.name.trim(), statusOf(place), place.source.trim() === '' ? null : place.source.trim(), place.licence, place.observedOn, null,
        m.measuredOn, m.method, m.steps, m.steps === 0 ? 'none' : m.stepHeightCm, m.doorWidthCm, m.doorOpening, m.ramp, m.toilet, m.toilet === 'no' ? 'none' : m.toiletDoorCm,
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return `${lines.join('\r\n')}\r\n`;
}

export function measuresCsvFilename(today: string): string {
  return `measures-${today}.csv`;
}
