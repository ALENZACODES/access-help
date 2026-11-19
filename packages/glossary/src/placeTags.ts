import { fixFrench } from './frTypography';
import type { Place } from './places';
import type { Lang } from './plainTerms';
import { escapeHtml } from './text';

/**
 * A person's own labels for places ("with Sam", "try in spring"). Kept on this device.
 * A tag is never a source: it does not change what is reported about a place.
 */
export const MAX_TAG_LENGTH = 20;
export const MAX_TAGS_PER_PLACE = 5;
export const MAX_TAGGED_PLACES = 200;
export const TAGS_STORE_KEY = 'glossary-place-tags';

export type Tags = Readonly<Record<string, readonly string[]>>;

export type TagResult = 'added' | 'duplicate' | 'full' | 'empty';

export interface TagChange {
  readonly tags: Tags;
  readonly result: TagResult;
}

/** Removes control characters, joins runs of spaces, trims and cuts to the limit. */
export function cleanTag(text: string): string {
  // eslint-disable-next-line no-control-regex
  const flat = text.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return Array.from(flat).slice(0, MAX_TAG_LENGTH).join('').trim();
}

/** The form used to compare tags: no case, no accents. "Café" and "cafe" are the same tag. */
export function tagKey(tag: string): string {
  return cleanTag(tag)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function tagsOf(tags: Tags, placeId: string): readonly string[] {
  return Object.prototype.hasOwnProperty.call(tags, placeId) ? (tags[placeId] ?? []) : [];
}

function withTags(tags: Tags, placeId: string, list: readonly string[]): Tags {
  const entries = Object.entries(tags).filter(([id]) => id !== placeId);
  if (list.length > 0) entries.push([placeId, list]);
  // fromEntries makes own properties, so an id such as "__proto__" is kept as data.
  return Object.fromEntries(entries.slice(Math.max(0, entries.length - MAX_TAGGED_PLACES)));
}

/** Adds one tag. Nothing changes for an empty tag, one the place already has, or a sixth tag. */
export function addTag(tags: Tags, placeId: string, text: string): TagChange {
  const tag = cleanTag(text);
  if (tag === '') return { tags, result: 'empty' };
  const current = tagsOf(tags, placeId);
  if (current.some((t) => tagKey(t) === tagKey(tag))) return { tags, result: 'duplicate' };
  if (current.length >= MAX_TAGS_PER_PLACE) return { tags, result: 'full' };
  return { tags: withTags(tags, placeId, [...current, tag]), result: 'added' };
}

/** Puts a removed tag back where it was, or at the end when the list is shorter now. The limits and duplicates are respected. */
export function insertTag(tags: Tags, placeId: string, tag: string, position: number): Tags {
  const clean = cleanTag(tag);
  const current = tagsOf(tags, placeId);
  if (clean === '' || current.length >= MAX_TAGS_PER_PLACE || current.some((t) => tagKey(t) === tagKey(clean))) return tags;
  const at = Math.max(0, Math.min(position, current.length));
  return withTags(tags, placeId, [...current.slice(0, at), clean, ...current.slice(at)]);
}

export function removeTag(tags: Tags, placeId: string, tag: string): Tags {
  const current = tagsOf(tags, placeId);
  const next = current.filter((t) => tagKey(t) !== tagKey(tag));
  return next.length === current.length ? tags : withTags(tags, placeId, next);
}

/** Keeps only tags for places that exist. */
export function pruneTags(tags: Tags, ids: readonly string[]): Tags {
  const known = new Set(ids);
  const entries = Object.entries(tags);
  return entries.every(([id]) => known.has(id)) ? tags : Object.fromEntries(entries.filter(([id]) => known.has(id)));
}

export interface TagCount {
  /** The comparison form, used as the value of the filter. */
  readonly key: string;
  /** The tag as first written. */
  readonly tag: string;
  readonly count: number;
}

/** Every tag in use on a loaded place, most used first, then in name order. */
export function allTags(tags: Tags, places: readonly Place[]): readonly TagCount[] {
  const found = new Map<string, { tag: string; count: number }>();
  for (const place of places) {
    for (const tag of tagsOf(tags, place.id)) {
      const key = tagKey(tag);
      const seen = found.get(key);
      if (seen === undefined) found.set(key, { tag, count: 1 });
      else seen.count += 1;
    }
  }
  return [...found.entries()]
    .map(([key, v]) => ({ key, tag: v.tag, count: v.count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

export interface TaggedPlace {
  readonly placeId: string;
  readonly name: string;
  /** Index in the list that was given. Used in control ids. */
  readonly index: number;
}

export function placesWithTag(tags: Tags, places: readonly Place[], key: string): readonly TaggedPlace[] {
  if (key === '') return [];
  const out: TaggedPlace[] = [];
  places.forEach((place, index) => {
    if (tagsOf(tags, place.id).some((t) => tagKey(t) === key)) out.push({ placeId: place.id, name: place.name, index });
  });
  return out;
}

export function serialiseTags(tags: Tags): string {
  return JSON.stringify(tags);
}

/** Null unless the text is a JSON object of string lists. Bad tags are dropped; the limits are applied. */
export function parseTags(json: string): Tags | null {
  try {
    const raw: unknown = JSON.parse(json);
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
    let out: Tags = {};
    for (const [id, list] of Object.entries(raw)) {
      if (!Array.isArray(list)) continue;
      for (const item of list) if (typeof item === 'string') out = addTag(out, id, item).tags;
    }
    return out;
  } catch {
    return null;
  }
}

export const TAG_UI = {
  en: {
    heading: 'Your tags',
    intro: 'Tags are your own labels. They stay on this device and do not change what is reported.',
    none: 'No tags yet. Add one under a place.',
    label: (name: string): string => `Add a tag for ${name}`,
    short: 'New tag',
    add: 'Add tag',
    addLabel: (name: string): string => `Add tag to ${name}`,
    remove: (tag: string): string => `Remove ${tag}`,
    removeLabel: (tag: string, name: string): string => `Remove ${tag} from ${name}`,
    tagsOf: (name: string): string => `Tags for ${name}`,
    filter: 'Show places with the tag',
    all: 'Choose a tag',
    option: (tag: string, count: number): string => `${tag} (${count})`,
    found: (count: number, tag: string): string => (count === 1 ? `1 place has the tag ${tag}.` : `${count} places have the tag ${tag}.`),
    show: 'Show',
    showLabel: (name: string): string => `Show ${name} in the list`,
    added: (tag: string, name: string): string => `Added the tag ${tag} to ${name}.`,
    removed: (tag: string, name: string): string => `Removed the tag ${tag} from ${name}.`,
    duplicate: (name: string): string => `${name} already has that tag.`,
    full: (name: string): string => `${name} has the most tags allowed. Remove one first.`,
    empty: 'Type a tag first.',
  },
  fr: {
    heading: 'Vos étiquettes',
    intro: 'Les étiquettes sont les vôtres. Elles restent sur cet appareil et ne changent pas ce qui est signalé.',
    none: 'Aucune étiquette pour le moment. Ajoutez-en une sous un lieu.',
    label: (name: string): string => `Ajouter une étiquette pour ${name}`,
    short: 'Nouvelle étiquette',
    add: 'Ajouter',
    addLabel: (name: string): string => `Ajouter l’étiquette à ${name}`,
    remove: (tag: string): string => `Retirer ${tag}`,
    removeLabel: (tag: string, name: string): string => `Retirer ${tag} de ${name}`,
    tagsOf: (name: string): string => `Étiquettes de ${name}`,
    filter: 'Afficher les lieux avec l’étiquette',
    all: 'Choisir une étiquette',
    option: (tag: string, count: number): string => `${tag} (${count})`,
    found: (count: number, tag: string): string => (count === 1 ? `1 lieu a l’étiquette ${tag}.` : `${count} lieux ont l’étiquette ${tag}.`),
    show: 'Afficher',
    showLabel: (name: string): string => `Afficher ${name} dans la liste`,
    added: (tag: string, name: string): string => `Étiquette ${tag} ajoutée à ${name}.`,
    removed: (tag: string, name: string): string => `Étiquette ${tag} retirée de ${name}.`,
    duplicate: (name: string): string => `${name} a déjà cette étiquette.`,
    full: (name: string): string => `${name} a le maximum d’étiquettes. Retirez-en une d’abord.`,
    empty: 'Écrivez d’abord une étiquette.',
  },
} as const;

/** The text for the result of adding a tag (shown and announced). */
export function tagResultText(result: TagResult, tag: string, name: string, lang: Lang): string {
  const ui = TAG_UI[lang];
  const text = result === 'added' ? ui.added(tag, name) : result === 'duplicate' ? ui.duplicate(name) : result === 'full' ? ui.full(name) : ui.empty;
  return lang === 'fr' ? fixFrench(text) : text;
}

export const TAG_ADD_PREFIX = 'gl-tagadd-';
export const TAG_INPUT_PREFIX = 'gl-tag-';
export const TAG_FILTER_ID = 'gl-tagfilter';

export function tagAddId(index: number): string {
  return `${TAG_ADD_PREFIX}${index}`;
}
export function tagInputId(index: number): string {
  return `${TAG_INPUT_PREFIX}${index}`;
}
export function parseTagAddId(id: string): number | null {
  const m = /^gl-tagadd-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}
export function untagId(index: number, tagIndex: number): string {
  return `gl-untag-${index}-${tagIndex}`;
}
export function parseUntagId(id: string): { readonly index: number; readonly tagIndex: number } | null {
  const m = /^gl-untag-(\d+)-(\d+)$/.exec(id);
  return m === null ? null : { index: Number(m[1]), tagIndex: Number(m[2]) };
}
export function parseTagShowId(id: string): number | null {
  const m = /^gl-tshow-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

/** The tag chips and the box to add a tag, for one place. */
export function renderTagEditor(index: number, name: string, tags: readonly string[], lang: Lang): string {
  const ui = TAG_UI[lang];
  const chips =
    tags.length === 0
      ? ''
      : `<ul class="gl-tags" aria-label="${escapeHtml(fr(lang, ui.tagsOf(name)))}">` +
        tags
          .map(
            (tag, i) =>
              `<li>${escapeHtml(tag)} <button type="button" class="gl-btn" id="${untagId(index, i)}" aria-label="${escapeHtml(fr(lang, ui.removeLabel(tag, name)))}">${escapeHtml(fr(lang, ui.remove(tag)))}</button></li>`,
          )
          .join('') +
        '</ul>';
  return (
    `<div class="gl-tageditor">${chips}<label for="${tagInputId(index)}">${escapeHtml(fr(lang, ui.label(name)))}</label>` +
    `<input type="text" id="${tagInputId(index)}" class="gl-input" maxlength="${MAX_TAG_LENGTH}" autocomplete="off" placeholder="${escapeHtml(ui.short)}">` +
    `<button type="button" class="gl-btn" id="${tagAddId(index)}" aria-label="${escapeHtml(fr(lang, ui.addLabel(name)))}">${escapeHtml(ui.add)}</button></div>`
  );
}

/** The places with the chosen tag, each with a Show button. */
export function renderTaggedPlaces(found: readonly TaggedPlace[], tag: string, lang: Lang): string {
  if (found.length === 0) return '';
  const ui = TAG_UI[lang];
  return (
    `<p role="status">${escapeHtml(fr(lang, ui.found(found.length, tag)))}</p><ul>` +
    found
      .map(
        (f) =>
          `<li>${escapeHtml(f.name)} <button type="button" class="gl-btn" id="gl-tshow-${f.index}" aria-label="${escapeHtml(fr(lang, ui.showLabel(f.name)))}">${escapeHtml(ui.show)}</button></li>`,
      )
      .join('') +
    '</ul>'
  );
}

/** The panel: a list of tags in use to choose from, and the places with the chosen tag. */
export function renderTagsPanel(counts: readonly TagCount[], selectedKey: string, found: readonly TaggedPlace[], lang: Lang): string {
  const ui = TAG_UI[lang];
  const intro = `<p>${escapeHtml(ui.intro)}</p>`;
  if (counts.length === 0) return `${intro}<p class="gl-note">${escapeHtml(ui.none)}</p>`;
  const chosen = counts.find((c) => c.key === selectedKey);
  const options =
    `<option value="">${escapeHtml(ui.all)}</option>` +
    counts.map((c) => `<option value="${escapeHtml(c.key)}"${c.key === selectedKey ? ' selected' : ''}>${escapeHtml(fr(lang, ui.option(c.tag, c.count)))}</option>`).join('');
  return (
    `${intro}<label for="${TAG_FILTER_ID}">${escapeHtml(ui.filter)}</label><select id="${TAG_FILTER_ID}" class="gl-select">${options}</select>` +
    `<div data-gl-tagplaces>${chosen === undefined ? '' : renderTaggedPlaces(found, chosen.tag, lang)}</div>`
  );
}
