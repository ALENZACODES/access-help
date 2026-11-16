import { fixFrench } from './frTypography';
import type { Lang } from './plainTerms';
import { escapeHtml } from './text';

/**
 * Short messages for a polite live region, so a screen reader says what an action did ("Saved Café Nord").
 * They describe what the person did. They say nothing about any place.
 */
export type AnnounceKind =
  | 'saved'
  | 'unsaved'
  | 'cleared'
  | 'undone'
  | 'recent-cleared'
  | 'group-on'
  | 'group-off'
  | 'visited'
  | 'unvisited'
  | 'shortcuts-on'
  | 'shortcuts-off';

export const ANNOUNCE_UI = {
  en: {
    saved: (name: string): string => `Saved ${name}.`,
    unsaved: (name: string): string => `Removed ${name} from saved places.`,
    cleared: 'Choices cleared.',
    undone: 'Undone.',
    'recent-cleared': 'Recent searches cleared.',
    'group-on': (name: string): string => `Chose features for ${name}.`,
    'group-off': (name: string): string => `Removed features for ${name}.`,
    visited: (name: string): string => `Marked ${name} as visited.`,
    unvisited: (name: string): string => `Removed the visit mark for ${name}.`,
    'shortcuts-on': 'Keyboard shortcuts are on.',
    'shortcuts-off': 'Keyboard shortcuts are off.',
  },
  fr: {
    saved: (name: string): string => `${name} enregistré.`,
    unsaved: (name: string): string => `${name} retiré des lieux enregistrés.`,
    cleared: 'Choix effacés.',
    undone: 'Action annulée.',
    'recent-cleared': 'Recherches récentes effacées.',
    'group-on': (name: string): string => `Caractéristiques choisies pour ${name}.`,
    'group-off': (name: string): string => `Caractéristiques retirées pour ${name}.`,
    visited: (name: string): string => `${name} marqué comme visité.`,
    unvisited: (name: string): string => `Marque de visite retirée pour ${name}.`,
    'shortcuts-on': 'Les raccourcis clavier sont activés.',
    'shortcuts-off': 'Les raccourcis clavier sont désactivés.',
  },
} as const;

/** The message for an action. `subject` is a place or group name for the kinds that have one. */
export function announcement(kind: AnnounceKind, lang: Lang, subject = ''): string {
  const entry = ANNOUNCE_UI[lang][kind];
  const text = typeof entry === 'function' ? entry(subject) : entry;
  return lang === 'fr' ? fixFrench(text) : text;
}

const NBSP = ' ';

/**
 * Screen readers only speak a live region when its text changes. Saying the same thing twice in a row
 * (save, remove, save) would stay silent, so a repeat gets a no-break space at the end.
 */
export function nextAnnouncement(previous: string, text: string): string {
  if (text === '') return '';
  return previous === text ? `${text}${NBSP}` : text;
}

export function renderAnnouncement(text: string): string {
  return escapeHtml(text);
}

/** The live region itself: always in the page, empty until something is said. */
export const ANNOUNCE_REGION = '<p class="gl-sr" role="status" aria-live="polite" aria-atomic="true" data-gl-announce></p>';
