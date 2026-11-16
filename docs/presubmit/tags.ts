/**
 * What a person would type into the OpenStreetMap editor for one observation, and the words
 * for the changeset. UNKNOWN is never written as a tag: leaving a tag out is how the map
 * says nothing is known.
 */
import { MAX_TAG_VALUE, type CheckRecord } from './rules.js';
import { clip, joinList, pick, plural, type PreLang } from './text.js';

export interface Tag {
  key: 'name' | 'wheelchair';
  value: string;
}

const STATUS_VALUES: readonly string[] = ['yes', 'limited', 'no'];

export function osmTagsFor(record: CheckRecord): Tag[] {
  const tags: Tag[] = [];
  const name = record.name === null ? '' : record.name.trim().replace(/\s+/g, ' ');
  if (name !== '') tags.push({ key: 'name', value: Array.from(name).slice(0, MAX_TAG_VALUE).join('') });
  if (STATUS_VALUES.includes(record.wheelchair)) tags.push({ key: 'wheelchair', value: record.wheelchair });
  return tags;
}

export function tagLines(tags: readonly Tag[]): string[] {
  return tags.map((tag) => `${tag.key}=${tag.value}`);
}

/** One block of text a person can copy into the tag editor's text view. Empty when there is nothing to add. */
export function tagBlock(record: CheckRecord): string {
  return tagLines(osmTagsFor(record)).join('\n');
}

export const MAX_CHANGESET_TEXT = 255;

/** A short changeset comment. The person edits it before saving; the App never sends it. */
export function changesetComment(records: readonly CheckRecord[], lang: PreLang): string {
  const days = records.map((r) => r.observedOn).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  const first = days[0];
  const last = days[days.length - 1];
  const count = records.length;
  if (count === 0 || first === undefined || last === undefined) return '';
  const span = first === last ? first : pick(lang, `${first} to ${last}`, `${first} au ${last}`);
  const noun = plural(lang, count, pick(lang, 'place', 'lieu'), pick(lang, 'places', 'lieux'));
  const text = pick(
    lang,
    `Add wheelchair access and names seen on foot for ${count} ${noun}, observed ${span}`,
    `Ajout de l’accès en fauteuil roulant et de noms vus sur place pour ${count} ${noun}, observés ${span}`,
  );
  return clip(text, MAX_CHANGESET_TEXT);
}

/** The source value for the changeset: the distinct sources the person wrote, joined. */
export function changesetSource(records: readonly CheckRecord[], lang: PreLang): string {
  const seen: string[] = [];
  for (const record of records) {
    const source = record.source.trim().replace(/\s+/g, ' ');
    if (source !== '' && !seen.includes(source)) seen.push(source);
  }
  return clip(joinList(seen, lang), MAX_CHANGESET_TEXT);
}
