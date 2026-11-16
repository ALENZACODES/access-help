import { htmlLang } from './locale';
import type { IndexStore } from './offlineIndex';
import type { Lang } from './terms';
import { escapeHtml } from './text';

/** Display settings: text size, text spacing, contrast and motion. Saved on this device. */

export const TEXT_SCALES = [100, 125, 150, 200] as const;
export type TextScale = (typeof TEXT_SCALES)[number];

export interface Prefs {
  readonly textScale: TextScale;
  readonly wideSpacing: boolean;
  readonly highContrast: boolean;
  readonly reduceMotion: boolean;
}

export const DEFAULT_PREFS: Prefs = { textScale: 100, wideSpacing: false, highContrast: false, reduceMotion: false };
export const PREFS_STORE_KEY = 'glossary-display-prefs';

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** Field by field: anything invalid falls back to the default for that field. */
export function normalisePrefs(input: unknown): Prefs {
  if (!isRecord(input)) return DEFAULT_PREFS;
  return {
    textScale: TEXT_SCALES.find((s) => s === input['textScale']) ?? DEFAULT_PREFS.textScale,
    wideSpacing: input['wideSpacing'] === true,
    highContrast: input['highContrast'] === true,
    reduceMotion: input['reduceMotion'] === true,
  };
}

export function isDefaultPrefs(p: Prefs): boolean {
  return p.textScale === 100 && !p.wideSpacing && !p.highContrast && !p.reduceMotion;
}

export function serialisePrefs(p: Prefs): string {
  return JSON.stringify(p);
}

/** Null when the text is not JSON or not an object. */
export function parsePrefs(json: string): Prefs | null {
  try {
    const raw: unknown = JSON.parse(json);
    return isRecord(raw) ? normalisePrefs(raw) : null;
  } catch {
    return null;
  }
}

/**
 * CSS for the chosen settings, limited to `scope` (a simple selector). Empty for the defaults.
 * Spacing uses the WCAG 2.2 SC 1.4.12 values (line 1.8, letter 0.12em, word 0.16em, paragraph 2em)
 * without !important, so a person's own style sheet can still override it.
 */
export function prefsCss(p: Prefs, scope = '.gl-finder'): string {
  if (!/^[\w.#\s>-]+$/.test(scope)) throw new RangeError(`Unsupported scope: ${scope}`);
  const out: string[] = [];
  if (p.textScale !== 100) {
    out.push(`${scope} { font-size: ${p.textScale}%; }`);
    out.push(`${scope} .gl-note, ${scope} .gl-source { font-size: 0.875em; }`);
  }
  if (p.wideSpacing) {
    out.push(`${scope} { line-height: 1.8; letter-spacing: 0.12em; word-spacing: 0.16em; }`);
    out.push(`${scope} p { margin-block-end: 2em; }`);
  }
  if (p.highContrast) {
    out.push(`${scope} { color: #000; background: #fff; }`);
    out.push(`${scope} a { text-decoration: underline; }`);
    out.push(`${scope} :focus-visible { outline: 4px solid #000; outline-offset: 2px; box-shadow: 0 0 0 2px #fff; }`);
    out.push(`${scope} .gl-item, ${scope} .gl-place, ${scope} .gl-btn, ${scope} .gl-input, ${scope} .gl-fieldset { border-width: 3px; }`);
  }
  if (p.reduceMotion) {
    out.push(`${scope} *, ${scope} *::before, ${scope} *::after { transition: none !important; animation: none !important; scroll-behavior: auto !important; }`);
  }
  return out.length === 0 ? '' : out.join('\n') + '\n';
}

export const PREFS_UI = {
  en: {
    summary: 'Display settings',
    legend: 'Display',
    size: 'Text size',
    spacing: 'Wider text spacing',
    contrast: 'Higher contrast',
    motion: 'Reduce motion',
    reset: 'Reset display settings',
  },
  fr: {
    summary: 'Paramètres d’affichage',
    legend: 'Affichage',
    size: 'Taille du texte',
    spacing: 'Espacement du texte plus large',
    contrast: 'Contraste plus élevé',
    motion: 'Réduire les animations',
    reset: 'Réinitialiser l’affichage',
  },
} as const;

/** A collapsed panel with the four settings and a reset button. */
export function renderPrefsPanel(prefs: Prefs, lang: Lang): string {
  const ui = PREFS_UI[lang];
  const options = TEXT_SCALES.map(
    (s) => `<option value="${s}"${s === prefs.textScale ? ' selected' : ''}>${s}%</option>`,
  ).join('');
  const box = (id: string, on: boolean, label: string): string =>
    `<label class="gl-check" for="${id}"><input class="gl-box" type="checkbox" id="${id}"${on ? ' checked' : ''}>` +
    `<span>${escapeHtml(label)}</span></label>`;
  return (
    `<details class="gl-prefs" lang="${htmlLang(lang)}"><summary>${escapeHtml(ui.summary)}</summary>` +
    `<fieldset class="gl-fieldset"><legend>${escapeHtml(ui.legend)}</legend>` +
    `<label for="gl-pref-size">${escapeHtml(ui.size)}</label>` +
    `<select id="gl-pref-size" class="gl-select">${options}</select>` +
    box('gl-pref-spacing', prefs.wideSpacing, ui.spacing) +
    box('gl-pref-contrast', prefs.highContrast, ui.contrast) +
    box('gl-pref-motion', prefs.reduceMotion, ui.motion) +
    `<button type="button" class="gl-btn" id="gl-pref-reset">${escapeHtml(ui.reset)}</button>` +
    `</fieldset></details>`
  );
}

export interface PrefsOptions {
  readonly store?: IndexStore;
  /** Called with the CSS whenever settings change, and once at the start. */
  readonly apply?: (css: string) => void;
  /** For example () => matchMedia('(prefers-reduced-motion: reduce)').matches. Used when nothing is saved yet. */
  readonly systemReducedMotion?: () => boolean;
  readonly scope?: string;
}

export interface PrefsTarget {
  readonly id: string;
  readonly checked?: boolean | undefined;
  readonly value?: string | undefined;
}

export interface PrefsController {
  get(): Prefs;
  /** Returns true when the event belonged to the display settings (even if nothing changed). */
  handle(target: PrefsTarget): boolean;
  reset(): void;
}

/** Holds the settings, saves them, and hands the CSS to `apply`. No DOM needed. */
export function createPrefs(options: PrefsOptions = {}): PrefsController {
  const scope = options.scope ?? '.gl-finder';
  let current: Prefs = DEFAULT_PREFS;
  let saved: Prefs | null = null;
  try {
    const raw = options.store?.getItem(PREFS_STORE_KEY);
    saved = typeof raw === 'string' ? parsePrefs(raw) : null;
  } catch {
    saved = null;
  }
  current = saved ?? { ...DEFAULT_PREFS, reduceMotion: options.systemReducedMotion?.() === true };

  const commit = (next: Prefs, persist: boolean): void => {
    current = next;
    if (persist) {
      try {
        options.store?.setItem(PREFS_STORE_KEY, serialisePrefs(current));
      } catch {
        // Storage blocked or full: settings still apply for this visit.
      }
    }
    options.apply?.(prefsCss(current, scope));
  };
  options.apply?.(prefsCss(current, scope));

  return {
    get: () => current,
    reset: () => commit(DEFAULT_PREFS, true),
    handle(t: PrefsTarget): boolean {
      switch (t.id) {
        case 'gl-pref-size': {
          const scale = TEXT_SCALES.find((s) => String(s) === t.value);
          if (scale !== undefined && scale !== current.textScale) commit({ ...current, textScale: scale }, true);
          return true;
        }
        case 'gl-pref-spacing':
        case 'gl-pref-contrast':
        case 'gl-pref-motion': {
          if (t.checked === undefined) return true;
          const key = t.id === 'gl-pref-spacing' ? 'wideSpacing' : t.id === 'gl-pref-contrast' ? 'highContrast' : 'reduceMotion';
          if (current[key] !== t.checked) commit({ ...current, [key]: t.checked }, true);
          return true;
        }
        case 'gl-pref-reset':
          commit(DEFAULT_PREFS, true);
          return true;
        default:
          return false;
      }
    },
  };
}
