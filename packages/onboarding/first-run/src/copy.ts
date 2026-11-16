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
    notes: { en: "Notes", fr: "Notes" },
    display: { en: "Display", fr: "Affichage" },
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
    openForm: { en: "Open the form", fr: "Ouvrir le formulaire" },
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
  display: {
    title: { en: "Display settings", fr: "Réglages d’affichage" },
    intro: {
      en: "Change how the App looks. Your choices are saved on this device only.",
      fr: "Changez l’apparence de l’App. Vos choix sont enregistrés sur cet appareil seulement.",
    },
    scale: { en: "Text size", fr: "Taille du texte" },
    spacing: { en: "Text spacing", fr: "Espacement du texte" },
    contrast: { en: "Contrast", fr: "Contraste" },
    motion: { en: "Motion", fr: "Animations" },
    normal: { en: "Normal", fr: "Normal" },
    wide: { en: "Wide", fr: "Espacé" },
    auto: { en: "Automatic", fr: "Automatique" },
    more: { en: "More contrast", fr: "Contraste accru" },
    reduce: { en: "Reduce motion", fr: "Réduire les animations" },
    changed: { en: "Display settings updated.", fr: "Réglages d’affichage mis à jour." },
  },
  notes: {
    title: { en: "My notes", fr: "Mes notes" },
    intro: {
      en: "Notes you add are kept on this device only. Nothing is sent anywhere.",
      fr: "Les notes que vous ajoutez restent sur cet appareil seulement. Rien n’est envoyé.",
    },
    add: { en: "Add a note", fr: "Ajouter une note" },
    empty: { en: "No notes yet.", fr: "Aucune note pour le moment." },
    all: { en: "All notes", fr: "Toutes les notes" },
    filterTitle: { en: "Filter by detail", fr: "Filtrer par détail" },
    any: { en: "Any", fr: "Peu importe" },
    searchLabel: { en: "Search by place name", fr: "Chercher par nom de lieu" },
    matches: { en: "Matches", fr: "Correspondances" },
    unknown: { en: "Unknown for this filter", fr: "Inconnu pour ce filtre" },
    excluded: { en: "Does not match", fr: "Ne correspond pas" },
    unknownExplain: {
      en: "These notes have no record for a detail you asked about. They may or may not match.",
      fr: "Ces notes n’ont aucun enregistrement pour un détail demandé. Elles peuvent correspondre ou non.",
    },
    noResults: { en: "No notes in this group.", fr: "Aucune note dans ce groupe." },
    remove: { en: "Remove", fr: "Retirer" },
    confirmRemove: { en: "Confirm removal", fr: "Confirmer le retrait" },
    cancel: { en: "Cancel", fr: "Annuler" },
    removed: { en: "Note removed.", fr: "Note retirée." },
    added: { en: "Note saved on this device.", fr: "Note enregistrée sur cet appareil." },
    dropped: {
      en: "Some saved notes could not be read and were left out.",
      fr: "Certaines notes enregistrées n’ont pas pu être lues et ont été laissées de côté.",
    },
    full: {
      en: "You have reached the limit of 200 notes. Remove one to add another.",
      fr: "Vous avez atteint la limite de 200 notes. Retirez-en une pour en ajouter une autre.",
    },
    export: { en: "Export notes", fr: "Exporter les notes" },
    exportHint: {
      en: "Copy this text or download it as a file. Keep it to move your notes to another device.",
      fr: "Copiez ce texte ou téléchargez-le en fichier. Conservez-le pour déplacer vos notes vers un autre appareil.",
    },
    exportLabel: { en: "Exported notes", fr: "Notes exportées" },
    download: { en: "Download file", fr: "Télécharger le fichier" },
    import: { en: "Import notes", fr: "Importer des notes" },
    importLabel: { en: "Paste exported notes here", fr: "Collez ici les notes exportées" },
    importButton: { en: "Import", fr: "Importer" },
    importErrors: {
      empty: { en: "Paste the exported text first.", fr: "Collez d’abord le texte exporté." },
      tooLarge: { en: "That text is too large to import.", fr: "Ce texte est trop volumineux pour être importé." },
      notJson: { en: "That text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
      wrongFormat: { en: "That text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
      wrongVersion: {
        en: "That export comes from a different version and cannot be imported.",
        fr: "Cette exportation provient d’une autre version et ne peut pas être importée.",
      },
    },
    importFailedSave: {
      en: "The notes could not be saved on this device.",
      fr: "Les notes n’ont pas pu être enregistrées sur cet appareil.",
    },
  },
  form: {
    title: { en: "Add a note", fr: "Ajouter une note" },
    intro: {
      en: "Share what you saw at a place. Leave a detail as Unknown if you did not see it.",
      fr: "Dites ce que vous avez vu dans un lieu. Laissez un détail à Inconnu si vous ne l’avez pas vu.",
    },
    sourceNote: {
      en: "Details you answer are recorded as a contributor report, with your date and licence.",
      fr: "Les détails auxquels vous répondez sont consignés comme rapport d’un contributeur, avec votre date et votre licence.",
    },
    noteHint: {
      en: "Do not include names, phone numbers or email addresses.",
      fr: "N’indiquez ni noms, ni numéros de téléphone, ni adresses courriel.",
    },
    licenceHint: {
      en: "Pick an open licence. Your note carries it when you export it.",
      fr: "Choisissez une licence ouverte. Votre note la conserve lorsque vous l’exportez.",
    },
    choose: { en: "Choose a licence", fr: "Choisissez une licence" },
    submit: { en: "Save note", fr: "Enregistrer la note" },
    cancel: { en: "Cancel", fr: "Annuler" },
    summaryTitle: { en: "Please fix these problems:", fr: `Veuillez corriger ces problèmes${NB}:` },
    restored: { en: "Your unsaved draft was restored.", fr: "Votre brouillon non enregistré a été restauré." },
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

export function groupHeading(label: string, n: number): string {
  return `${label} (${n})`;
}

export function importDone(added: number, skipped: number, rejected: number, locale: Locale): string {
  if (locale === "fr") {
    return `${added} note(s) importée(s), ${skipped} déjà présente(s) ou en trop, ${rejected} non valide(s).`;
  }
  return `${added} note(s) imported, ${skipped} already present or over the limit, ${rejected} not valid.`;
}
