/**
 * Changeset comment and tags a person may paste when they submit their own edit
 * in an OpenStreetMap editor. The App only drafts the text. OpenStreetMap limits
 * a changeset comment to 255 characters, so the draft is kept under that.
 */
import type { ReviewLang } from './text.js';
import { clip, fill, isIsoDay, pick, plural } from './text.js';

export const MAX_COMMENT = 255;

export interface ChangesetRecord {
  observedOn: string;
  wheelchair: 'yes' | 'limited' | 'no' | 'UNKNOWN';
}

export interface ObservedRange {
  from: string;
  to: string;
}

/** Earliest and latest real observation date. Null when no record has a real date. */
export function observedRange(records: readonly ChangesetRecord[]): ObservedRange | null {
  const days = records.map((r) => r.observedOn).filter(isIsoDay).sort();
  const first = days[0];
  const last = days[days.length - 1];
  return first === undefined || last === undefined ? null : { from: first, to: last };
}

/** How many records carry an access value the person recorded. UNKNOWN is not counted. */
export function withAccessTag(records: readonly ChangesetRecord[]): number {
  return records.filter((r) => r.wheelchair !== 'UNKNOWN').length;
}

/**
 * One-line comment. It says what was added and that it comes from the person's own visits.
 * It does not say the data was checked by anyone else.
 */
export function changesetComment(records: readonly ChangesetRecord[], lang: ReviewLang): string {
  const count = records.length;
  if (count === 0) return '';
  const range = observedRange(records);
  const places = plural(lang, count, pick(lang, 'place', 'lieu'), pick(lang, 'places', 'lieux'));
  const base = fill(
    pick(
      lang,
      'Add wheelchair access notes for {count} {places} from my own visits',
      'Ajout de notes d’accessibilité en fauteuil roulant pour {count} {places}, d’après mes propres visites',
    ),
    { count, places },
  );
  if (range === null) return clip(base, MAX_COMMENT);
  const when =
    range.from === range.to
      ? fill(pick(lang, ' on {date}', ' le {date}'), { date: range.from })
      : fill(pick(lang, ' between {from} and {to}', ' entre le {from} et le {to}'), { from: range.from, to: range.to });
  return clip(`${base}${when}`, MAX_COMMENT);
}

export interface ChangesetTags {
  comment: string;
  source: string;
}

/** The tags OpenStreetMap asks for on a changeset. The source is "survey" because the person visited. */
export function changesetTags(records: readonly ChangesetRecord[], lang: ReviewLang): ChangesetTags | null {
  const comment = changesetComment(records, lang);
  return comment === '' ? null : { comment, source: 'survey' };
}

export function changesetLines(tags: ChangesetTags): string[] {
  return [`comment=${tags.comment}`, `source=${tags.source}`];
}
