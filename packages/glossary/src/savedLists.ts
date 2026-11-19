import { fixFrench } from './frTypography';
import type { Place } from './places';
import type { Lang } from './plainTerms';
import { escapeHtml } from './text';
import { printListButton } from './listPrint';
import { exportListButton, renderListSummary, summariseList } from './listSummary';

/**
 * A person's own named lists of places ("Dentist visit", "Saturday"). Kept on this device only.
 * A list is the person's grouping. It says nothing about any place, and being on a list does not change
 * what is reported about the place.
 */
export interface PlaceList {
  readonly name: string;
  readonly ids: readonly string[];
}
export type Lists = readonly PlaceList[];

export const MAX_LISTS = 8;
export const MAX_LIST_NAME = 40;
export const MAX_LIST_PLACES = 100;
export const LISTS_STORE_KEY = 'glossary-place-lists';

export type ListError = 'empty' | 'duplicate' | 'full';
export type ListResult = { readonly ok: true; readonly lists: Lists } | { readonly ok: false; readonly error: ListError };

/** Trims, joins runs of spaces, removes control characters and cuts to the limit. */
export function cleanListName(text: string): string {
  // eslint-disable-next-line no-control-regex
  const kept = text.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return Array.from(kept).slice(0, MAX_LIST_NAME).join('').trim();
}

const sameName = (a: string, b: string): boolean => a.localeCompare(b, 'en', { sensitivity: 'base' }) === 0;

/** Adds an empty list at the end. Names are not repeated (case and accents ignored). */
export function createList(lists: Lists, name: string): ListResult {
  const clean = cleanListName(name);
  if (clean === '') return { ok: false, error: 'empty' };
  if (lists.some((l) => sameName(l.name, clean))) return { ok: false, error: 'duplicate' };
  if (lists.length >= MAX_LISTS) return { ok: false, error: 'full' };
  return { ok: true, lists: [...lists, { name: clean, ids: [] }] };
}

/** Removes the list at `index`. An index that is not a list changes nothing. */
export function deleteList(lists: Lists, index: number): Lists {
  return lists.filter((_, i) => i !== index);
}

/** Puts a deleted list back at its old place (or the end), for undo. Refused when it would repeat a name or overflow. */
export function insertList(lists: Lists, index: number, list: PlaceList): Lists {
  if (lists.length >= MAX_LISTS || lists.some((l) => sameName(l.name, list.name))) return lists;
  const at = Math.max(0, Math.min(index, lists.length));
  return [...lists.slice(0, at), list, ...lists.slice(at)];
}

/** Adds the place to the list, once. The list is capped; the oldest places are dropped past the cap. */
export function addToList(lists: Lists, index: number, placeId: string): Lists {
  const list = lists[index];
  if (list === undefined || list.ids.includes(placeId)) return lists;
  const ids = [...list.ids, placeId].slice(-MAX_LIST_PLACES);
  return lists.map((l, i) => (i === index ? { name: l.name, ids } : l));
}

export function removeFromList(lists: Lists, index: number, placeId: string): Lists {
  const list = lists[index];
  if (list === undefined || !list.ids.includes(placeId)) return lists;
  return lists.map((l, i) => (i === index ? { name: l.name, ids: l.ids.filter((id) => id !== placeId) } : l));
}

/** Indexes of the lists that hold the place. */
export function listsHolding(lists: Lists, placeId: string): readonly number[] {
  return lists.flatMap((l, i) => (l.ids.includes(placeId) ? [i] : []));
}

export function serialiseLists(lists: Lists): string {
  return JSON.stringify(lists);
}

/** Null unless the text is a JSON array. Bad lists and places are dropped, names are cleaned, repeats and extras are cut. */
export function parseLists(json: string): Lists | null {
  try {
    const raw: unknown = JSON.parse(json);
    if (!Array.isArray(raw)) return null;
    let out: Lists = [];
    for (const item of raw) {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) continue;
      const { name, ids } = item as { name?: unknown; ids?: unknown };
      if (typeof name !== 'string' || !Array.isArray(ids)) continue;
      const made = createList(out, name);
      if (!made.ok) continue;
      const clean = ids.filter((x): x is string => typeof x === 'string' && x !== '');
      const unique = [...new Set(clean)].slice(-MAX_LIST_PLACES);
      out = made.lists.map((l, i) => (i === made.lists.length - 1 ? { name: l.name, ids: unique } : l));
    }
    return out;
  } catch {
    return null;
  }
}

export const LIST_UI = {
  en: {
    heading: 'Your lists',
    intro: 'Group places your own way. Lists stay on this device.',
    nameLabel: 'New list name',
    create: 'Create list',
    none: 'You have no lists yet.',
    count: (n: number): string => (n === 1 ? '1 place' : `${n} places`),
    emptyList: 'No places on this list yet.',
    removeLabel: (place: string, list: string): string => `Remove ${place} from ${list}`,
    remove: 'Remove',
    deleteLabel: (list: string): string => `Delete list: ${list}`,
    delete: 'Delete list',
    pickLabel: (place: string): string => `Add ${place} to a list`,
    pick: 'Add to a list…',
    errors: {
      empty: 'Type a name for the list.',
      duplicate: 'You already have a list with that name.',
      full: 'You have the most lists allowed. Delete one first.',
    },
  },
  fr: {
    heading: 'Vos listes',
    intro: 'Regroupez les lieux à votre façon. Les listes restent sur cet appareil.',
    nameLabel: 'Nom de la nouvelle liste',
    create: 'Créer la liste',
    none: 'Vous n’avez pas encore de liste.',
    count: (n: number): string => (n === 1 ? '1 lieu' : `${n} lieux`),
    emptyList: 'Aucun lieu dans cette liste pour le moment.',
    removeLabel: (place: string, list: string): string => `Retirer ${place} de ${list}`,
    remove: 'Retirer',
    deleteLabel: (list: string): string => `Supprimer la liste\u00a0: ${list}`,
    delete: 'Supprimer la liste',
    pickLabel: (place: string): string => `Ajouter ${place} à une liste`,
    pick: 'Ajouter à une liste…',
    errors: {
      empty: 'Saisissez un nom pour la liste.',
      duplicate: 'Vous avez déjà une liste portant ce nom.',
      full: 'Vous avez le nombre maximal de listes. Supprimez-en une d’abord.',
    },
  },
} as const;

export const LIST_IDS = { name: 'gl-list-name', create: 'gl-list-create' } as const;

export function listErrorText(error: ListError, lang: Lang): string {
  return LIST_UI[lang].errors[error];
}

export function removeListId(list: number, place: number): string {
  return `gl-lrm-${list}-${place}`;
}
export function deleteListId(list: number): string {
  return `gl-ldel-${list}`;
}
export function pickListId(place: number): string {
  return `gl-lst-${place}`;
}

export function parseRemoveListId(id: string): { list: number; place: number } | null {
  const m = /^gl-lrm-(\d+)-(\d+)$/.exec(id);
  return m === null ? null : { list: Number(m[1]), place: Number(m[2]) };
}
export function parseDeleteListId(id: string): number | null {
  const m = /^gl-ldel-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}
export function parsePickListId(id: string): number | null {
  const m = /^gl-lst-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

/**
 * A choice box on each place: "Add to a list…" then one entry per list. Nothing when there are no lists.
 * Lists that already hold the place are left out of the box.
 */
export function renderListPicker(lists: Lists, place: Place, index: number, lang: Lang): string {
  const ui = LIST_UI[lang];
  const options = lists
    .map((l, i) => (l.ids.includes(place.id) ? '' : `<option value="${i}">${escapeHtml(l.name)}</option>`))
    .join('');
  if (options === '') return '';
  const id = pickListId(index);
  return (
    `<label class="gl-sr" for="${id}">${escapeHtml(fr(lang, ui.pickLabel(place.name)))}</label>` +
    `<select id="${id}" class="gl-select"><option value="">${escapeHtml(ui.pick)}</option>${options}</select>`
  );
}

export interface ListsPanelOptions {
  readonly lang: Lang;
  readonly lists: Lists;
  readonly places: readonly Place[];
  /** A short message after the last action, or empty. */
  readonly message: string;
  /** The chosen features, for the summary under each list. Without it no summary is shown. */
  readonly termIds?: readonly string[];
  /** true adds a "Copy list as text" button to each list that has places. */
  readonly canExport?: boolean;
}

/** The panel: a form to make a list, then each list with its places and buttons to take a place off or delete the list. */
export function renderListsPanel(o: ListsPanelOptions): string {
  const ui = LIST_UI[o.lang];
  const message = o.message === '' ? '' : `<p class="gl-note" role="status">${escapeHtml(o.message)}</p>`;
  const form =
    `<label for="${LIST_IDS.name}">${escapeHtml(ui.nameLabel)}</label>` +
    `<input id="${LIST_IDS.name}" class="gl-input" type="text" maxlength="${MAX_LIST_NAME}" autocomplete="off">` +
    `<div class="gl-actions"><button type="button" class="gl-btn" id="${LIST_IDS.create}">${escapeHtml(ui.create)}</button></div>`;
  const body =
    o.lists.length === 0
      ? `<p class="gl-note">${escapeHtml(ui.none)}</p>`
      : o.lists
          .map((list, li) => {
            const items = list.ids.flatMap((id) => {
              const pi = o.places.findIndex((p) => p.id === id);
              const place = o.places[pi];
              if (place === undefined) return [];
              return [
                `<li>${escapeHtml(place.name)} <button type="button" class="gl-btn" id="${removeListId(li, pi)}" aria-label="${escapeHtml(fr(o.lang, ui.removeLabel(place.name, list.name)))}">${escapeHtml(ui.remove)}</button></li>`,
              ];
            });
            const inner = items.length === 0 ? `<p class="gl-note">${escapeHtml(ui.emptyList)}</p>` : `<ul>${items.join('')}</ul>`;
            const summary = o.termIds === undefined || items.length === 0 ? '' : renderListSummary(summariseList(list, o.places, o.termIds), o.lang);
            const exportButton = o.canExport === true && items.length > 0 ? exportListButton(li, list.name, o.lang) + printListButton(li, list.name, o.lang) : '';
            return (
              `<section aria-labelledby="gl-list-h-${li}"><h4 id="gl-list-h-${li}">${escapeHtml(list.name)} <span class="gl-note">(${escapeHtml(ui.count(items.length))})</span></h4>${inner}${summary}` +
              `${exportButton}<button type="button" class="gl-btn" id="${deleteListId(li)}" aria-label="${escapeHtml(fr(o.lang, ui.deleteLabel(list.name)))}">${escapeHtml(ui.delete)}</button></section>`
            );
          })
          .join('');
  return `<p class="gl-note">${escapeHtml(ui.intro)}</p>${message}${form}${body}`;
}
