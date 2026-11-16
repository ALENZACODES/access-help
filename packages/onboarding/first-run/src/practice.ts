import type { Locale } from "../../switch-first/src/index";

/**
 * Keyboard practice. A few buttons that do nothing, and a short log that says
 * in plain words what the App received: which key, and what that key does
 * here. It teaches Tab, the arrow keys, Home, End, Enter and Space without any
 * risk of changing a note or a setting. Nothing is saved or sent.
 *
 * The App only sees keys and presses. It cannot tell which device sent them,
 * so the page never says it detected a switch, a voice or any other device.
 */
export const PRACTICE_BUTTONS = 4;
export const MAX_LOG = 6;

export interface PracticeState {
  /** Oldest first, so the newest line is last, which suits a log region. */
  readonly log: readonly string[];
  /** Presses per practice button, by button number (1-based). */
  readonly presses: Readonly<Record<number, number>>;
}

export const EMPTY_PRACTICE: PracticeState = { log: [], presses: {} };

const colon = (l: Locale): string => (l === "fr" ? "\u00A0: " : ": ");

export function buttonName(n: number, locale: Locale): string {
  return locale === "fr" ? `Bouton d’essai ${n}` : `Practice button ${n}`;
}

/** A practice button number from a value in the page, or undefined if it is not one of the buttons. */
export function parseButton(value: string | undefined): number | undefined {
  if (value === undefined || !/^[1-9]$/.test(value)) return undefined;
  const n = Number(value);
  return n <= PRACTICE_BUTTONS ? n : undefined;
}

/**
 * What a key press does on this page, in a sentence. Keys that are not part of
 * moving around (letters, numbers, shortcuts) return undefined, so typing in
 * the search box or elsewhere is never logged.
 */
export function describeKey(key: string, shift: boolean, focusName: string | undefined, locale: Locale): string | undefined {
  const c = colon(locale);
  const fr = locale === "fr";
  const moved = (): string => {
    const where = focusName ? (fr ? `le focus est sur ${focusName}` : `focus is on ${focusName}`) : fr ? "le focus a bougé" : "focus moved";
    return where;
  };
  switch (key) {
    case "Tab":
      return shift
        ? `Shift+Tab${c}${fr ? "le focus revient au contrôle précédent." : "focus goes back to the previous control."}`
        : `Tab${c}${fr ? "le focus passe au contrôle suivant." : "focus moves to the next control."}`;
    case "ArrowRight":
    case "ArrowDown":
    case "ArrowLeft":
    case "ArrowUp":
      return `${fr ? { ArrowRight: "Flèche droite", ArrowDown: "Flèche bas", ArrowLeft: "Flèche gauche", ArrowUp: "Flèche haut" }[key] : key.replace("Arrow", "Arrow ")}${c}${moved()}.`;
    case "Home":
      return `Home${c}${fr ? "au premier bouton" : "to the first button"}, ${moved()}.`;
    case "End":
      return `End${c}${fr ? "au dernier bouton" : "to the last button"}, ${moved()}.`;
    case "Enter":
      return `Enter${c}${fr ? "active le bouton qui a le focus." : "presses the button that has focus."}`;
    case " ":
    case "Spacebar":
      return `${fr ? "Espace" : "Space"}${c}${fr ? "active le bouton qui a le focus." : "presses the button that has focus."}`;
    case "Escape":
      return `Escape${c}${fr ? "rien ne se passe sur cette page." : "nothing happens on this page."}`;
    default:
      return undefined;
  }
}

export function describePress(n: number, count: number, locale: Locale): string {
  return locale === "fr" ? `${buttonName(n, locale)} activé. C’est l’activation numéro ${count}.` : `${buttonName(n, locale)} pressed. This is press ${count}.`;
}

export function pushLog(state: PracticeState, line: string): PracticeState {
  return { ...state, log: [...state.log, line].slice(-MAX_LOG) };
}

export function recordPress(state: PracticeState, n: number, locale: Locale): PracticeState {
  const count = (state.presses[n] ?? 0) + 1;
  return pushLog({ ...state, presses: { ...state.presses, [n]: count } }, describePress(n, count, locale));
}

export function clearLog(state: PracticeState): PracticeState {
  return { ...state, log: [] };
}

export function totalPresses(state: PracticeState): number {
  return Object.values(state.presses).reduce((a, b) => a + b, 0);
}
