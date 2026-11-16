import { fixFrench } from './frTypography';
import type { Place } from './places';
import type { Lang } from './plainTerms';
import { escapeHtml, normalise } from './text';

/**
 * Place names that start like what was typed, shown as buttons under the search box so a long name can be
 * chosen without typing it all. Names only: no claim about a place is shown or implied.
 */
export const NAME_UI = {
  en: { label: 'Place names that match:', pick: (name: string): string => `Search for ${name}` },
  fr: { label: 'Noms de lieux correspondants\u00a0:', pick: (name: string): string => `Chercher ${name}` },
} as const;

export const MAX_NAME_SUGGESTIONS = 5;
export const MIN_NAME_QUERY = 2;

export type NameRank = 0 | 1 | 2;

/** 0: the name starts with the typed words; 1: a word in the name does; 2: they appear inside a word; null: no match. */
export function nameRank(name: string, query: string): NameRank | null {
  const n = normalise(name);
  const q = normalise(query).replace(/\s+/g, ' ');
  if (q.length < MIN_NAME_QUERY) return null;
  if (n.startsWith(q)) return 0;
  if (n.split(/[^a-z0-9]+/).some((_, i, words) => words.slice(i).join(' ').startsWith(q))) return 1;
  return n.includes(q) ? 2 : null;
}

/**
 * Up to MAX_NAME_SUGGESTIONS names, best match first, then in alphabetical order for the language.
 * A name equal to what was typed is not offered (there is nothing left to complete), and a name is offered once.
 */
export function suggestNames(places: readonly Place[], query: string, lang: Lang): readonly string[] {
  const typed = normalise(query).replace(/\s+/g, ' ');
  const seen = new Set<string>();
  const ranked: { name: string; rank: NameRank }[] = [];
  for (const place of places) {
    const key = normalise(place.name);
    const rank = nameRank(place.name, query);
    if (rank === null || key === typed || seen.has(key)) continue;
    seen.add(key);
    ranked.push({ name: place.name, rank });
  }
  return ranked
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, lang))
    .slice(0, MAX_NAME_SUGGESTIONS)
    .map((r) => r.name);
}

export const NAME_ID_PREFIX = 'gl-ns-';

export function nameId(index: number): string {
  return `${NAME_ID_PREFIX}${index}`;
}

export function parseNameId(id: string): number | null {
  const m = /^gl-ns-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}

/** Buttons for the suggested names, or nothing. */
export function renderNameSuggestions(names: readonly string[], lang: Lang): string {
  if (names.length === 0) return '';
  const ui = NAME_UI[lang];
  const buttons = names
    .map((name, i) => {
      const label = lang === 'fr' ? fixFrench(ui.pick(name)) : ui.pick(name);
      return `<button type="button" class="gl-btn" id="${nameId(i)}" aria-label="${escapeHtml(label)}">${escapeHtml(name)}</button>`;
    })
    .join('');
  return `<p class="gl-note" id="gl-ns-label">${escapeHtml(ui.label)}</p><div class="gl-actions" role="group" aria-labelledby="gl-ns-label">${buttons}</div>`;
}
