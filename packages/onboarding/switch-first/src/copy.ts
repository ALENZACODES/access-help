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
      en: "Pick the way that suits you. You can change it later.",
      fr: "Choisissez ce qui vous convient. Vous pourrez le modifier plus tard.",
    },
  },
  modeOptions: {
    keyboard: { en: "Keyboard", fr: "Clavier" },
    switch: { en: "Single switch", fr: "Contacteur unique" },
    pointer: { en: "Pointer or touch", fr: "Pointeur ou écran tactile" },
  },
  scan: {
    title: { en: "Scanning speed", fr: "Vitesse de balayage" },
    body: {
      en: "Choose how long each item stays highlighted. Scanning stays off until you start it.",
      fr: "Choisissez la durée de surbrillance de chaque élément. Le balayage reste désactivé tant que vous ne le lancez pas.",
    },
  },
  finish: {
    title: { en: "Setup finished", fr: "Configuration terminée" },
    body: {
      en: "Choices you skipped stay unset. You can change any of them later.",
      fr: "Les choix ignorés restent non définis. Vous pouvez les modifier plus tard.",
    },
    modeLabel: { en: "Movement", fr: "Déplacement" },
    scanLabel: { en: "Scanning speed", fr: "Vitesse de balayage" },
    unknown: { en: "unknown", fr: "inconnu" },
    off: { en: "off", fr: "désactivé" },
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
