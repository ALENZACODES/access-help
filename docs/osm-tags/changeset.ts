/**
 * Drafts the words for a changeset: a comment saying what was done and a source line. A person
 * reads it, changes it and saves under their own account. The App writes the draft and nothing
 * more. OpenStreetMap keeps at most 255 characters in each.
 */
import { MAX_TAG_LENGTH, hasStatus, tagLength, type TagRecord } from './tags.js';
import { fill, joinList, pick, plural, type PreLang } from '../presubmit/text.js';

export interface ChangesetDraft {
  comment: string;
  source: string;
  commentLength: number;
  sourceLength: number;
  /** True when the comment or the source is longer than OpenStreetMap keeps. */
  tooLong: boolean;
  /** Observations with a status, which is what the comment counts. */
  withStatus: number;
  /** Observations with UNKNOWN status. They add no wheelchair tag, and the comment does not count them. */
  withoutStatus: number;
}

function distinctSources(records: readonly TagRecord[]): string[] {
  const seen = new Map<string, string>();
  for (const record of records) {
    const source = record.source.replace(/\s+/g, ' ').trim();
    if (source !== '' && !seen.has(source.toLowerCase())) seen.set(source.toLowerCase(), source);
  }
  return [...seen.values()];
}

function daySpan(records: readonly TagRecord[]): { from: string; to: string } | null {
  const days = records.map((record) => record.observedOn).filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day)).sort();
  const from = days[0];
  const to = days[days.length - 1];
  return from === undefined || to === undefined ? null : { from, to };
}

export function changesetDraft(records: readonly TagRecord[], lang: PreLang): ChangesetDraft {
  const counted = records.filter(hasStatus);
  const withoutStatus = records.length - counted.length;
  let comment = '';
  if (counted.length > 0) {
    const places = plural(lang, counted.length, pick(lang, 'place', 'lieu'), pick(lang, 'places', 'lieux'));
    const span = daySpan(counted);
    const when =
      span === null
        ? ''
        : span.from === span.to
          ? fill(pick(lang, ', seen in person on {from}', ', vu sur place le {from}'), span)
          : fill(pick(lang, ', seen in person from {from} to {to}', ', vu sur place du {from} au {to}'), span);
    comment = fill(pick(lang, 'Wheelchair access for {n} {places}{when}.', 'Accès en fauteuil roulant pour {n} {places}{when}.'), { n: counted.length, places, when });
  }
  const source = joinList(distinctSources(counted), lang);
  const commentLength = tagLength(comment);
  const sourceLength = tagLength(source);
  return { comment, source, commentLength, sourceLength, tooLong: commentLength > MAX_TAG_LENGTH || sourceLength > MAX_TAG_LENGTH, withStatus: counted.length, withoutStatus };
}

/** The draft as the two lines an editor asks for. Empty when there is nothing to add to the map. */
export function changesetText(draft: ChangesetDraft): string {
  if (draft.comment === '') return '';
  return draft.source === '' ? `comment=${draft.comment}` : `comment=${draft.comment}\nsource=${draft.source}`;
}
