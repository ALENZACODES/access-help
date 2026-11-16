import { fixFrench } from './frTypography';
import type { Notes } from './notes';
import type { Place } from './places';
import type { Lang } from './plainTerms';
import { escapeHtml, normalise, tokenise } from './text';

/**
 * Search of the person's own notes. It finds the places whose notes hold every typed word, and shows a short
 * piece of the note around the first match. The notes are the person's own words; a match says nothing about
 * the place.
 */
export interface NoteMatch {
  readonly placeId: string;
  readonly name: string;
  /** A piece of the note around the first matching word. */
  readonly snippet: string;
}

export const MAX_NOTE_MATCHES = 20;
export const SNIPPET_RADIUS = 40;

export const NOTESEARCH_UI = {
  en: {
    heading: 'Search your notes',
    label: 'Words to find in your notes',
    hint: 'Finds places whose notes have all the words you type.',
    none: 'No notes have those words.',
    prompt: 'Type a word to search your notes.',
    count: (n: number): string => (n === 1 ? '1 place has a note with those words.' : `${n} places have notes with those words.`),
    show: 'Show',
    showLabel: (name: string): string => `Show ${name} in the list`,
  },
  fr: {
    heading: 'Chercher dans vos notes',
    label: 'Mots à trouver dans vos notes',
    hint: 'Trouve les lieux dont les notes contiennent tous les mots saisis.',
    none: 'Aucune note ne contient ces mots.',
    prompt: 'Saisissez un mot pour chercher dans vos notes.',
    count: (n: number): string => (n === 1 ? '1 lieu a une note avec ces mots.' : `${n} lieux ont des notes avec ces mots.`),
    show: 'Afficher',
    showLabel: (name: string): string => `Afficher ${name} dans la liste`,
  },
} as const;

export const NOTESEARCH_INPUT_ID = 'gl-nsq';

/** True when the note holds every typed word, ignoring case and accents. */
export function noteHasWords(note: string, query: string): boolean {
  const words = tokenise(query);
  if (words.length === 0) return false;
  const text = normalise(note);
  return words.every((w) => text.includes(w));
}

/** A piece of the note around the first word that matches, cut at spaces and marked with an ellipsis where text was left out. */
export function snippetOf(note: string, query: string): string {
  const flat = note.replace(/\s+/g, ' ').trim();
  const chars = Array.from(flat);
  if (chars.length <= SNIPPET_RADIUS * 2) return flat;
  const words = tokenise(query);
  let at = 0;
  for (let i = 0; i < chars.length; i++) {
    const rest = normalise(chars.slice(i, i + 40).join(''));
    if (words.some((w) => rest.startsWith(w))) {
      at = i;
      break;
    }
  }
  let from = Math.max(0, at - SNIPPET_RADIUS);
  let to = Math.min(chars.length, at + SNIPPET_RADIUS);
  while (from > 0 && from < at && chars[from - 1] !== ' ') from += 1;
  while (to < chars.length && to > at && chars[to] !== ' ') to -= 1;
  const body = chars.slice(from, to).join('').trim();
  return `${from > 0 ? '\u2026' : ''}${body}${to < chars.length ? '\u2026' : ''}`;
}

/** Places whose notes hold every word, in the order of `places`, at most MAX_NOTE_MATCHES. */
export function searchNotes(notes: Notes, places: readonly Place[], query: string): readonly NoteMatch[] {
  const out: NoteMatch[] = [];
  for (const place of places) {
    const note = Object.prototype.hasOwnProperty.call(notes, place.id) ? notes[place.id] : undefined;
    if (note === undefined || !noteHasWords(note, query)) continue;
    out.push({ placeId: place.id, name: place.name, snippet: snippetOf(note, query) });
    if (out.length >= MAX_NOTE_MATCHES) break;
  }
  return out;
}

export function showId(index: number): string {
  return `gl-nshow-${index}`;
}

export function parseShowId(id: string): number | null {
  const m = /^gl-nshow-(\d+)$/.exec(id);
  return m === null ? null : Number(m[1]);
}

/** The results: a count, then each place with its snippet and a button that puts the place's name in the name search. */
export function renderNoteMatches(matches: readonly NoteMatch[], places: readonly Place[], query: string, lang: Lang): string {
  const ui = NOTESEARCH_UI[lang];
  if (tokenise(query).length === 0) return `<p class="gl-note">${escapeHtml(ui.prompt)}</p>`;
  if (matches.length === 0) return `<p class="gl-note">${escapeHtml(ui.none)}</p>`;
  const items = matches
    .map((m) => {
      const index = places.findIndex((p) => p.id === m.placeId);
      const label = lang === 'fr' ? fixFrench(ui.showLabel(m.name)) : ui.showLabel(m.name);
      return `<li><strong>${escapeHtml(m.name)}</strong> <span class="gl-note">${escapeHtml(m.snippet)}</span> <button type="button" class="gl-btn" id="${showId(index)}" aria-label="${escapeHtml(label)}">${escapeHtml(ui.show)}</button></li>`;
    })
    .join('');
  return `<p class="gl-note" role="status">${escapeHtml(ui.count(matches.length))}</p><ul>${items}</ul>`;
}

/** The labelled box, the hint, and a region the finder fills with matches. */
export function renderNotesSearch(query: string, matchesHtml: string, lang: Lang): string {
  const ui = NOTESEARCH_UI[lang];
  return (
    `<label for="${NOTESEARCH_INPUT_ID}">${escapeHtml(ui.label)}</label>` +
    `<input id="${NOTESEARCH_INPUT_ID}" class="gl-input" type="search" autocomplete="off" spellcheck="false" aria-describedby="gl-nsq-hint" value="${escapeHtml(query)}">` +
    `<p class="gl-note" id="gl-nsq-hint">${escapeHtml(ui.hint)}</p><div data-gl-nsr>${matchesHtml}</div>`
  );
}
