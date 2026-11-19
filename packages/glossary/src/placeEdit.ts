import { fixFrench } from './frTypography';
import type { Place } from './places';
import type { Lang } from './plainTerms';
import { MAX_PLACE_NAME } from './recordForm';
import { recordKey } from './recordsMerge';
import { escapeHtml, normalise } from './text';

/**
 * Tidying the places held: giving a place another name, and joining two entries that are the
 * same place. Joining keeps every record once; nothing a source reported is dropped. These
 * change the person's own copy of the records, never what a source said.
 */
export type RenameOutcome = 'renamed' | 'same' | 'empty' | 'too-long' | 'taken' | 'missing';

export interface RenameResult {
  readonly outcome: RenameOutcome;
  readonly places: readonly Place[];
  /** The cleaned name. */
  readonly name: string;
}

/** Trims and joins runs of spaces. */
export function cleanPlaceName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

/**
 * Gives the place at `index` another name. The name must not be empty or too long, and no
 * other place may already have it (whatever the case or accents): join the two instead.
 */
export function renamePlace(places: readonly Place[], index: number, name: string): RenameResult {
  const clean = cleanPlaceName(name);
  const place = places[index];
  if (place === undefined) return { outcome: 'missing', places, name: clean };
  if (clean === '') return { outcome: 'empty', places, name: clean };
  if (Array.from(clean).length > MAX_PLACE_NAME) return { outcome: 'too-long', places, name: clean };
  if (clean === place.name) return { outcome: 'same', places, name: clean };
  if (places.some((p, i) => i !== index && normalise(p.name) === normalise(clean))) return { outcome: 'taken', places, name: clean };
  return { outcome: 'renamed', places: places.map((p, i) => (i === index ? { ...p, name: clean } : p)), name: clean };
}

export interface DuplicateGroup {
  /** The name as the first entry writes it. */
  readonly name: string;
  /** Indexes of the entries, in list order. Always two or more. */
  readonly indexes: readonly number[];
}

/** Entries that share a name, whatever the case, accents or apostrophes. In the order of their first entry. */
export function duplicateGroups(places: readonly Place[]): readonly DuplicateGroup[] {
  const byName = new Map<string, number[]>();
  places.forEach((p, i) => {
    const key = normalise(p.name);
    if (key === '') return;
    const list = byName.get(key);
    if (list === undefined) byName.set(key, [i]);
    else list.push(i);
  });
  return [...byName.values()].filter((list) => list.length > 1).map((indexes) => ({ name: places[indexes[0] ?? 0]?.name ?? '', indexes }));
}

export interface JoinResult {
  readonly places: readonly Place[];
  /** Entries removed after their records were moved. */
  readonly joined: number;
  /** Records moved to the entry that is kept. */
  readonly moved: number;
  /** Records that the kept entry already had. */
  readonly same: number;
}

/**
 * Joins the entries at `indexes` into the first of them. Every record is kept once, in order.
 * The first entry keeps its id and name. The same list when there is nothing to join.
 */
export function joinPlaces(places: readonly Place[], indexes: readonly number[]): JoinResult {
  const valid = [...new Set(indexes)].filter((i) => Number.isInteger(i) && places[i] !== undefined).sort((a, b) => a - b);
  const keepIndex = valid[0];
  const keep = keepIndex === undefined ? undefined : places[keepIndex];
  if (keep === undefined || valid.length < 2) return { places, joined: 0, moved: 0, same: 0 };
  const claims = [...keep.claims];
  const keys = new Set(claims.map(recordKey));
  let moved = 0;
  let same = 0;
  for (const i of valid.slice(1)) {
    for (const claim of places[i]?.claims ?? []) {
      const key = recordKey(claim);
      if (keys.has(key)) {
        same += 1;
        continue;
      }
      keys.add(key);
      claims.push(claim);
      moved += 1;
    }
  }
  const drop = new Set(valid.slice(1));
  const next = places.filter((_, i) => !drop.has(i)).map((p) => (p === keep ? { ...p, claims } : p));
  return { places: next, joined: drop.size, moved, same };
}

export const PLACEEDIT_UI = {
  en: {
    renameSummary: 'Change the name',
    renameLabel: (name: string): string => `New name for ${name}`,
    rename: 'Rename place',
    renameButton: (name: string): string => `Rename place: ${name}`,
    renamed: (from: string, to: string): string => `Renamed ${from} to ${to}.`,
    outcomes: {
      same: 'That is already the name.',
      empty: 'Type a name first.',
      'too-long': 'The name is too long.',
      taken: 'Another place has that name. Join the two entries instead.',
      missing: 'That place is no longer in the list.',
    },
    dupHeading: 'Places listed more than once',
    dupIntro: 'These entries share a name. Joining them keeps every record once.',
    dupNone: 'No name is listed more than once.',
    dupLine: (name: string, n: number): string => `${name}: ${n} entries`,
    join: 'Join the entries',
    joinLabel: (name: string): string => `Join the entries for ${name}`,
    joined: (name: string, moved: number): string => `Joined the entries for ${name}. ${moved} records were moved.`,
  },
  fr: {
    renameSummary: 'Changer le nom',
    renameLabel: (name: string): string => `Nouveau nom pour ${name}`,
    rename: 'Renommer le lieu',
    renameButton: (name: string): string => `Renommer le lieu\u00a0: ${name}`,
    renamed: (from: string, to: string): string => `${from} a été renommé ${to}.`,
    outcomes: {
      same: 'C’est déjà le nom.',
      empty: 'Écrivez d’abord un nom.',
      'too-long': 'Le nom est trop long.',
      taken: 'Un autre lieu porte ce nom. Réunissez plutôt les deux entrées.',
      missing: 'Ce lieu n’est plus dans la liste.',
    },
    dupHeading: 'Lieux inscrits plus d’une fois',
    dupIntro: 'Ces entrées portent le même nom. Les réunir garde chaque fiche une seule fois.',
    dupNone: 'Aucun nom n’est inscrit plus d’une fois.',
    dupLine: (name: string, n: number): string => `${name}\u00a0: ${n} entrées`,
    join: 'Réunir les entrées',
    joinLabel: (name: string): string => `Réunir les entrées pour ${name}`,
    joined: (name: string, moved: number): string => `Entrées réunies pour ${name}. ${moved} fiches ont été déplacées.`,
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

/** What to say after trying to rename a place. */
export function renameMessage(result: RenameResult, from: string, lang: Lang): string {
  const ui = PLACEEDIT_UI[lang];
  return result.outcome === 'renamed' ? fr(lang, ui.renamed(from, result.name)) : ui.outcomes[result.outcome];
}

export function renameInputId(index: number): string {
  return `gl-rename-${index}`;
}
export function renameButtonId(index: number): string {
  return `gl-renamebtn-${index}`;
}
export function parseRenameButtonId(id: string): number | null {
  const m = /^gl-renamebtn-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}
export function joinId(firstIndex: number): string {
  return `gl-join-${firstIndex}`;
}
export function parseJoinId(id: string): number | null {
  const m = /^gl-join-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}

/** A closed block with a labelled box holding the name now, and a button. */
export function renderRename(index: number, name: string, lang: Lang): string {
  const ui = PLACEEDIT_UI[lang];
  return (
    `<details class="gl-rename"><summary>${escapeHtml(ui.renameSummary)}</summary><label for="${renameInputId(index)}">${escapeHtml(fr(lang, ui.renameLabel(name)))}</label>` +
    `<input type="text" id="${renameInputId(index)}" class="gl-input" maxlength="${MAX_PLACE_NAME}" autocomplete="off" value="${escapeHtml(name)}">` +
    `<div class="gl-actions"><button type="button" class="gl-btn" id="${renameButtonId(index)}" aria-label="${escapeHtml(fr(lang, ui.renameButton(name)))}">${escapeHtml(ui.rename)}</button></div></details>`
  );
}

/** The names listed more than once, each with a Join button when the host keeps records. */
export function renderDuplicates(places: readonly Place[], lang: Lang, canEdit: boolean): string {
  const ui = PLACEEDIT_UI[lang];
  const groups = duplicateGroups(places);
  if (groups.length === 0) return `<p class="gl-note">${escapeHtml(ui.dupNone)}</p>`;
  const items = groups
    .map((g) => {
      const button = canEdit
        ? ` <button type="button" class="gl-btn" id="${joinId(g.indexes[0] ?? 0)}" aria-label="${escapeHtml(fr(lang, ui.joinLabel(g.name)))}">${escapeHtml(ui.join)}</button>`
        : '';
      return `<li>${escapeHtml(fr(lang, ui.dupLine(g.name, g.indexes.length)))}${button}</li>`;
    })
    .join('');
  return `<p>${escapeHtml(ui.dupIntro)}</p><ul class="gl-dupes">${items}</ul>`;
}
