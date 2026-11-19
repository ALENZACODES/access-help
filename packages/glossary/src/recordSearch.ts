import { fixFrench } from './frTypography';
import type { Place } from './places';
import type { Lang } from './plainTerms';
import { placeRecords, recordText, type RecordRow } from './recordSources';
import { tierName } from './sourceTier';
import { statusLabel } from './status';
import { escapeHtml, normalise, tokenise } from './text';

/**
 * Search of the records held on the device. It finds the records that hold every typed word in
 * the place's name, the feature, what is reported, the source, the licence, the date or the tier.
 * A match shows the record as it is held; it says nothing more about the place.
 */
export interface RecordMatch {
  readonly placeId: string;
  readonly name: string;
  /** Index of the place in the list that was given. Used in control ids. */
  readonly index: number;
  readonly row: RecordRow;
}

export interface RecordSearchResult {
  /** The first matches, at most the limit. */
  readonly matches: readonly RecordMatch[];
  /** How many records match in all. */
  readonly total: number;
}

export const MAX_RECORD_MATCHES = 30;
export const MAX_RECORD_QUERY = 100;
export const RECSEARCH_INPUT_ID = 'gl-rsq';

/** The words a record can be found by, folded for matching. */
export function recordHaystack(name: string, row: RecordRow, lang: Lang): string {
  return normalise([name, row.feature, statusLabel(row.status, lang), row.source, row.licence, row.date, tierName(row.tier, lang)].join(' '));
}

/** Records that hold every typed word, in the order of the places and of each place's records. */
export function searchRecords(places: readonly Place[], query: string, lang: Lang, limit = MAX_RECORD_MATCHES): RecordSearchResult {
  const words = tokenise(query.slice(0, MAX_RECORD_QUERY));
  if (words.length === 0) return { matches: [], total: 0 };
  const matches: RecordMatch[] = [];
  let total = 0;
  places.forEach((place, index) => {
    for (const row of placeRecords(place, lang)) {
      const text = recordHaystack(place.name, row, lang);
      if (!words.every((w) => text.includes(w))) continue;
      total += 1;
      if (matches.length < Math.max(0, limit)) matches.push({ placeId: place.id, name: place.name, index, row });
    }
  });
  return { matches, total };
}

export const RECSEARCH_UI = {
  en: {
    heading: 'Find a record',
    label: 'Words to find in the records',
    hint: 'Finds records with all the words you type. Try a place, a feature, a source, a licence or a date.',
    prompt: 'Type a word to search the records.',
    none: 'No records have those words.',
    count: (n: number): string => (n === 1 ? '1 record has those words.' : `${n} records have those words.`),
    more: (n: number): string => (n === 1 ? 'And 1 more. Type another word to narrow the search.' : `And ${n} more. Type another word to narrow the search.`),
    line: (place: string, record: string): string => `${place}. ${record}`,
    show: 'Show',
    showLabel: (name: string): string => `Show ${name} in the list`,
  },
  fr: {
    heading: 'Trouver une fiche',
    label: 'Mots à trouver dans les fiches',
    hint: 'Trouve les fiches qui contiennent tous les mots saisis. Essayez un lieu, une caractéristique, une provenance, une licence ou une date.',
    prompt: 'Saisissez un mot pour chercher dans les fiches.',
    none: 'Aucune fiche ne contient ces mots.',
    count: (n: number): string => (n === 1 ? '1 fiche contient ces mots.' : `${n} fiches contiennent ces mots.`),
    more: (n: number): string => (n === 1 ? 'Et 1 de plus. Saisissez un autre mot pour préciser la recherche.' : `Et ${n} de plus. Saisissez un autre mot pour préciser la recherche.`),
    line: (place: string, record: string): string => `${place}. ${record}`,
    show: 'Afficher',
    showLabel: (name: string): string => `Afficher ${name} dans la liste`,
  },
} as const;

const fr = (lang: Lang, text: string): string => (lang === 'fr' ? fixFrench(text) : text);

export function recordShowId(index: number): string {
  return `gl-rshow-${index}`;
}

export function parseRecordShowId(id: string): number | null {
  const m = /^gl-rshow-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}

/** The results: a count, then each record as one line with a button that shows its place in the list. */
export function renderRecordMatches(result: RecordSearchResult, query: string, lang: Lang): string {
  const ui = RECSEARCH_UI[lang];
  if (tokenise(query).length === 0) return `<p class="gl-note">${escapeHtml(ui.prompt)}</p>`;
  if (result.total === 0) return `<p class="gl-note" role="status">${escapeHtml(ui.none)}</p>`;
  const seen = new Set<number>();
  const items = result.matches
    .map((m) => {
      // One Show button for each place, on its first record, so no id is used twice.
      const first = !seen.has(m.index);
      seen.add(m.index);
      const button = first
        ? ` <button type="button" class="gl-btn" id="${recordShowId(m.index)}" aria-label="${escapeHtml(fr(lang, ui.showLabel(m.name)))}">${escapeHtml(ui.show)}</button>`
        : '';
      return `<li data-status="${m.row.status}">${escapeHtml(ui.line(m.name, recordText(m.row, lang)))}${button}</li>`;
    })
    .join('');
  const more = result.total > result.matches.length ? `<p class="gl-note">${escapeHtml(ui.more(result.total - result.matches.length))}</p>` : '';
  return `<p class="gl-note" role="status">${escapeHtml(ui.count(result.total))}</p><ul class="gl-recmatches">${items}</ul>${more}`;
}

/** The labelled box, the hint, and a region the finder fills with matches. */
export function renderRecordSearch(query: string, matchesHtml: string, lang: Lang): string {
  const ui = RECSEARCH_UI[lang];
  return (
    `<label for="${RECSEARCH_INPUT_ID}">${escapeHtml(ui.label)}</label>` +
    `<input id="${RECSEARCH_INPUT_ID}" class="gl-input" type="search" autocomplete="off" spellcheck="false" aria-describedby="gl-rsq-hint" value="${escapeHtml(query)}">` +
    `<p class="gl-note" id="gl-rsq-hint">${escapeHtml(ui.hint)}</p><div data-gl-rsr>${matchesHtml}</div>`
  );
}
