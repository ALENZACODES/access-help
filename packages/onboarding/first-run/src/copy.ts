/**
 * Shell copy. Provenance: original text written for the App. Licence:
 * CC0-1.0. Dated 2026-11-15. Navigation help only; no medical or
 * eligibility advice. French uses ’, U+00A0 before ":" and U+202F before
 * ; ! ? and inside « ».
 */
import type { Locale } from "../../switch-first/src/index";

export interface Pair {
  readonly en: string;
  readonly fr: string;
}

export const NB = "\u00A0";
export const NN = "\u202F";

export const COPY_META = {
  source: "Original copy written for the App",
  licence: "CC0-1.0",
  date: "2026-11-15",
} as const;

export const COPY = {
  appName: { en: "The App", fr: "L’App" },
  skipLink: { en: "Skip to main content", fr: "Passer au contenu principal" },
  nav: {
    label: { en: "Main sections", fr: "Sections principales" },
    setup: { en: "Setup", fr: "Configuration" },
    help: { en: "Help", fr: "Aide" },
  },
  language: {
    label: { en: "Language", fr: "Langue" },
    changed: { en: "Language changed to English.", fr: "La langue est maintenant le français." },
  },
  help: {
    title: { en: "Help centre", fr: "Centre d’aide" },
    intro: {
      en: "Short guides. Pick one to start.",
      fr: "Courts guides. Choisissez-en un pour commencer.",
    },
    backToList: { en: "All guides", fr: "Tous les guides" },
    prev: { en: "Previous step", fr: "Étape précédente" },
    next: { en: "Next step", fr: "Étape suivante" },
  },
  card: {
    title: { en: "Reading a place card", fr: "Lire une fiche de lieu" },
    summary: {
      en: "See how sources and unknown details are shown.",
      fr: "Voyez comment les sources et les détails inconnus sont présentés.",
    },
    notice: {
      en: "Example only. This is not a real place.",
      fr: "Exemple seulement. Ce n’est pas un lieu réel.",
    },
    explain: {
      en: "Each detail shows its source, licence and date. A detail with no record says “Unknown”, and unknown does not mean no.",
      fr: `Chaque détail indique sa source, sa licence et sa date. Un détail sans enregistrement indique «${NN}inconnu${NN}», et inconnu ne veut pas dire non.`,
    },
  },
  facts: {
    "step-free-entry": { en: "Step-free entrance", fr: "Entrée sans marche" },
    "accessible-washroom": { en: "Accessible washroom", fr: "Toilettes accessibles" },
    "automatic-door": { en: "Automatic door", fr: "Porte automatique" },
    elevator: { en: "Elevator", fr: "Ascenseur" },
  },
  values: {
    yes: { en: "Yes", fr: "Oui" },
    no: { en: "No", fr: "Non" },
    unknown: { en: "Unknown", fr: "Inconnu" },
  },
  offline: {
    registered: {
      en: "Offline use is set up on this device. Some pages may still need a connection.",
      fr: "L’utilisation hors ligne est configurée sur cet appareil. Certaines pages peuvent tout de même demander une connexion.",
    },
    unsupported: {
      en: "Offline use is not available in this browser.",
      fr: "L’utilisation hors ligne n’est pas offerte dans ce navigateur.",
    },
    failed: {
      en: "Offline use could not be set up.",
      fr: "L’utilisation hors ligne n’a pas pu être configurée.",
    },
    pending: {
      en: "Preparing offline use.",
      fr: "Préparation de l’utilisation hors ligne.",
    },
  },
  save: {
    saved: {
      en: "Your choices are saved on this device only.",
      fr: "Vos choix sont enregistrés sur cet appareil seulement.",
    },
    unavailable: {
      en: "Your choices could not be saved. They will be lost when you close this page.",
      fr: "Vos choix n’ont pas pu être enregistrés. Ils seront perdus à la fermeture de cette page.",
    },
  },
} as const;

export function t(p: Pair, locale: Locale): string {
  return p[locale];
}

export function stepOf(n: number, total: number, locale: Locale): string {
  return locale === "fr" ? `Étape ${n} sur ${total}` : `Step ${n} of ${total}`;
}

/** Walks COPY and returns every EN/FR pair with its path, for tests and tooling. */
export function allPairs(): Array<[string, Pair]> {
  const out: Array<[string, Pair]> = [];
  const walk = (path: string, v: unknown): void => {
    if (!v || typeof v !== "object") return;
    const o = v as Record<string, unknown>;
    if (typeof o["en"] === "string" && typeof o["fr"] === "string") {
      out.push([path, { en: o["en"], fr: o["fr"] }]);
      return;
    }
    for (const [k, c] of Object.entries(o)) walk(`${path}.${k}`, c);
  };
  walk("COPY", COPY);
  return out;
}
