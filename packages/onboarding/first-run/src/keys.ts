import type { Pair } from "./copy";

/**
 * Keys the App handles itself, as the keyboard article lists them. Each row is
 * backed by a test that drives the real page (keys.test.ts), so the article
 * cannot list a key that does nothing.
 */
export interface KeyHelp {
  readonly id: "tab" | "shift-tab" | "enter-space" | "arrows" | "home-end";
  /** Key names as shown, per language. */
  readonly keys: Pair;
  readonly action: Pair;
}

export const KEY_HELP: readonly KeyHelp[] = [
  {
    id: "tab",
    keys: { en: "Tab", fr: "Tab" },
    action: {
      en: "Go to the next control. The first stop is a link that skips to the main content.",
      fr: "Aller au contrôle suivant. Le premier arrêt est un lien qui mène au contenu principal.",
    },
  },
  {
    id: "shift-tab",
    keys: { en: "Shift + Tab", fr: "Maj + Tab" },
    action: { en: "Go back to the previous control.", fr: "Revenir au contrôle précédent." },
  },
  {
    id: "enter-space",
    keys: { en: "Enter or Space", fr: "Entrée ou Espace" },
    action: {
      en: "Use the control you are on. Moving to a control does not use it.",
      fr: "Utiliser le contrôle où vous êtes. Se déplacer vers un contrôle ne l’utilise pas.",
    },
  },
  {
    id: "arrows",
    keys: { en: "Arrow keys", fr: "Flèches" },
    action: {
      en: "Move between the options in a group. Going past the last option returns to the first.",
      fr: "Passer d’une option à l’autre dans un groupe. Après la dernière option, on revient à la première.",
    },
  },
  {
    id: "home-end",
    keys: { en: "Home or End", fr: "Début ou Fin" },
    action: {
      en: "Go to the first or the last option in a group.",
      fr: "Aller à la première ou à la dernière option d’un groupe.",
    },
  },
];
