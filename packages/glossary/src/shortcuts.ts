import type { Lang } from './plainTerms';
import { escapeHtml } from './text';

/**
 * Single-key shortcuts for the place finder. They are off until a person turns them on (single keys can be
 * pressed by mistake, and speech-input users can trigger them by accident), they never act while typing in a
 * field, and they never act when Ctrl, Alt or Meta is held, so they do not clash with the browser or screen reader.
 */
export type ShortcutAction = 'focus-search' | 'only-saved' | 'only-recent';

export interface Shortcut {
  readonly key: string;
  readonly action: ShortcutAction;
}

export const SHORTCUTS: readonly Shortcut[] = [
  { key: '/', action: 'focus-search' },
  { key: 's', action: 'only-saved' },
  { key: 'r', action: 'only-recent' },
];

export const SHORTCUT_UI = {
  en: {
    toggle: 'Turn on keyboard shortcuts',
    heading: 'Keyboard shortcuts',
    actions: {
      'focus-search': 'Go to the search box',
      'only-saved': 'Show only saved places, or show all',
      'only-recent': 'Show only places with recent information, or show all',
    },
    keyLabel: (key: string): string => `Key ${key}`,
  },
  fr: {
    toggle: 'Activer les raccourcis clavier',
    heading: 'Raccourcis clavier',
    actions: {
      'focus-search': 'Aller à la zone de recherche',
      'only-saved': 'Afficher seulement les lieux enregistrés, ou tout afficher',
      'only-recent': 'Afficher seulement les lieux avec une information récente, ou tout afficher',
    },
    keyLabel: (key: string): string => `Touche ${key}`,
  },
} as const;

export const SHORTCUTS_STORE_KEY = 'glossary-shortcuts';
export const SHORTCUTS_TOGGLE_ID = 'gl-shortcuts';

export interface KeyInfo {
  readonly key: string;
  readonly ctrlKey?: boolean;
  readonly altKey?: boolean;
  readonly metaKey?: boolean;
  /** Tag of the element that has focus, any case. */
  readonly targetTag?: string;
  /** True when the focused element can be typed into (contenteditable, for example). */
  readonly editable?: boolean;
}

const TYPING_TAGS: ReadonlySet<string> = new Set(['input', 'textarea', 'select']);

/** The action for a key press, or null when the press is not ours. Matches the key without regard to case. */
export function interpretKey(info: KeyInfo, enabled: boolean): ShortcutAction | null {
  if (!enabled) return null;
  if (info.ctrlKey === true || info.altKey === true || info.metaKey === true) return null;
  if (info.editable === true || TYPING_TAGS.has((info.targetTag ?? '').toLowerCase())) return null;
  const key = info.key.length === 1 ? info.key.toLowerCase() : info.key;
  return SHORTCUTS.find((s) => s.key === key)?.action ?? null;
}

export function serialiseShortcuts(on: boolean): string {
  return on ? 'on' : 'off';
}

/** Only the exact word "on" turns shortcuts on, so a damaged value leaves them off. */
export function parseShortcuts(raw: string): boolean {
  return raw === 'on';
}

/** The switch and, when shortcuts are on, the list of keys. */
export function renderShortcuts(enabled: boolean, lang: Lang): string {
  const ui = SHORTCUT_UI[lang];
  const toggle =
    `<label class="gl-check" for="${SHORTCUTS_TOGGLE_ID}"><input class="gl-box" type="checkbox" id="${SHORTCUTS_TOGGLE_ID}"${enabled ? ' checked' : ''}>` +
    `<span>${escapeHtml(ui.toggle)}</span></label>`;
  if (!enabled) return toggle;
  const items = SHORTCUTS.map((s) => `<li><kbd aria-label="${escapeHtml(ui.keyLabel(s.key))}">${escapeHtml(s.key)}</kbd> ${escapeHtml(ui.actions[s.action])}</li>`).join('');
  return `${toggle}<p class="gl-note" id="gl-shortcuts-label">${escapeHtml(ui.heading)}</p><ul aria-labelledby="gl-shortcuts-label">${items}</ul>`;
}
