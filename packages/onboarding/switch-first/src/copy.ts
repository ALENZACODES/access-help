/**
 * Copy for the switch/keyboard-first first-run path.
 * Provenance: original text written for the App. Licence: CC0-1.0.
 * Dated: 2026-11-15. No third-party data. Navigation help only; no medical
 * or eligibility advice.
 */
import type { Locale } from "./flow";

export interface Localized {
  readonly en: string;
  readonly fr: string;
}

export const COPY_META = {
  source: "Original copy written for the App",
  licence: "CC0-1.0",
  date: "2026-11-15",
} as const;

export const COPY = {
  hint: {
    en: "Use Tab to move, Enter or Space to choose.",
    fr: "Utilisez Tab pour vous déplacer, Entrée ou Espace pour choisir.",
  },
  mode: {
    title: { en: "How do you move around?", fr: "Comment vous déplacez-vous dans l’App\u202F?" },
    body: {
      en: "Pick the way that suits you.",
      fr: "Choisissez ce qui vous convient.",
    },
  },
  modeOptions: {
    keyboard: { en: "Keyboard", fr: "Clavier" },
    switch: { en: "Single switch", fr: "Contacteur unique" },
    pointer: { en: "Pointer or touch", fr: "Pointeur ou écran tactile" },
  },
  scan: {
    title: { en: "Preferred highlight interval", fr: "Intervalle de surbrillance préféré" },
    body: {
      en: "Choose a preferred highlight interval. This is a preference only. This help centre does not run a scanner.",
      fr: "Choisissez un intervalle de surbrillance préféré. Il s’agit seulement d’une préférence. Ce centre d’aide n’exécute pas de balayage.",
    },
  },
  finish: {
    title: { en: "Setup finished", fr: "Configuration terminée" },
    body: {
      en: "Choices you skipped stay unset. This help centre has no later settings screen for these choices.",
      fr: "Les choix ignorés restent non définis. Ce centre d’aide n’a pas d’écran de réglages plus tard pour ces choix.",
    },
    modeLabel: { en: "Movement", fr: "Déplacement" },
    scanLabel: { en: "Highlight interval", fr: "Intervalle de surbrillance" },
    unknown: { en: "unknown", fr: "inconnu" },
    off: { en: "not set", fr: "non défini" },
  },
  buttons: {
    back: { en: "Back", fr: "Retour" },
    next: { en: "Next", fr: "Suivant" },
    skip: { en: "Skip setup", fr: "Passer la configuration" },
    done: { en: "Done", fr: "Terminer" },
  },
} as const;

export function t(l: Localized, locale: Locale): string {
  return l[locale];
}

/** "1 second" / "2 seconds" (EN), "1 seconde" / "2 secondes" (FR). */
export function secondsLabel(ms: number, locale: Locale): string {
  const n = ms / 1000;
  if (locale === "fr") return `${n} ${n === 1 ? "seconde" : "secondes"}`;
  return `${n} ${n === 1 ? "second" : "seconds"}`;
}
