import type { Locale } from "../../switch-first/src/index";
import { NB, NN, t, type Pair } from "./copy";
import type { Cue, StatementError } from "./statement";

/** English and French copy for reading a place's accessibility page. Checked by the copy audit through `statementStrings()`. */
export const STATEMENT_COPY = {
  title: { en: "Read a place’s accessibility page", fr: "Lire la page d’accessibilité d’un lieu" },
  replyTitle: { en: "Read a place’s written reply", fr: "Lire la réponse écrite d’un lieu" },
  replyIntro: {
    en: "Paste the reply the place sent you. The App lists the sentences about each detail so you can turn them into a note.",
    fr: "Collez la réponse que le lieu vous a envoyée. L’App énumère les phrases sur chaque détail pour vous aider à en faire une note.",
  },
  replyTextLabel: { en: "Text of the reply", fr: "Texte de la réponse" },
  open: { en: "Read a place’s accessibility page", fr: "Lire la page d’accessibilité d’un lieu" },
  openForPlace: { en: "Read this place’s accessibility page", fr: "Lire la page d’accessibilité de ce lieu" },
  formHint: {
    en: "Does the place describe its access on its website? The App can list what that page says.",
    fr: `Le lieu décrit-il son accès sur son site${NN}? L’App peut énumérer ce que dit cette page.`,
  },
  intro: {
    en: "Many places describe their access on their own website. Paste that text here. The App lists the sentences about each detail so you can turn them into a note.",
    fr: "Beaucoup de lieux décrivent leur accès sur leur propre site. Collez ce texte ici. L’App énumère les phrases sur chaque détail pour vous aider à en faire une note.",
  },
  honest: {
    en: "The App only looks for words. It can miss things or read them wrong. Every detail stays Unknown until you choose Yes or No.",
    fr: "L’App ne fait que chercher des mots. Elle peut en manquer ou mal les lire. Chaque détail reste UNKNOWN tant que vous ne choisissez pas Oui ou Non.",
  },
  privacy: {
    en: "The pasted text is not kept. Only the note you save stays on this device.",
    fr: "Le texte collé n’est pas gardé. Seule la note que vous enregistrez reste sur cet appareil.",
  },
  textLabel: { en: "Text from the place’s page", fr: "Texte de la page du lieu" },
  textHint: {
    en: "Copy the access part of the page and paste it. Up to 20,000 characters are read.",
    fr: `Copiez la partie sur l’accès et collez-la. Jusqu’à 20${NN}000 caractères sont lus.`,
  },
  read: { en: "Find the sentences", fr: "Trouver les phrases" },
  urlLabel: { en: "Web address of the page (optional)", fr: "Adresse Web de la page (facultatif)" },
  urlHint: {
    en: "It goes in the note so you can find the page again.",
    fr: "Elle figure dans la note pour retrouver la page.",
  },
  findingsTitle: { en: "What the text says about each detail", fr: "Ce que dit le texte sur chaque détail" },
  noneFound: {
    en: "No sentence names this detail. Leave it Unknown unless you know otherwise.",
    fr: "Aucune phrase ne nomme ce détail. Laissez-le à UNKNOWN sauf si vous savez autre chose.",
  },
  mixed: {
    en: "These sentences point both ways. Read them closely before you choose.",
    fr: "Ces phrases vont dans les deux sens. Lisez-les attentivement avant de choisir.",
  },
  yourAnswer: { en: "Your answer for this detail", fr: "Votre réponse pour ce détail" },
  unknownChoice: { en: "Unknown", fr: "UNKNOWN" },
  detailsTitle: { en: "Date and licence", fr: "Date et licence" },
  dateLabel: { en: "Date you read the page (year-month-day)", fr: "Date de lecture de la page (année-mois-jour)" },
  licenceLabel: { en: "Licence for your note", fr: "Licence de votre note" },
  licenceHint: {
    en: "This is the licence for your note, not for the place’s page. There is no default: please choose one.",
    fr: `C’est la licence de votre note, pas celle de la page du lieu. Il n’y a pas de choix par défaut${NB}: choisissez-en une.`,
  },
  choose: { en: "Choose a licence", fr: "Choisissez une licence" },
  save: { en: "Save this as a note", fr: "Enregistrer comme note" },
  startOver: { en: "Clear and start over", fr: "Tout effacer et recommencer" },
  errorsTitle: { en: "Fix this to save the note", fr: "Corrigez ceci pour enregistrer la note" },
  saved: { en: "Saved a note for", fr: "Note enregistrée pour" },
  full: {
    en: "Your notes are full. Remove some notes before adding more.",
    fr: "Vos notes sont pleines. Retirez des notes avant d’en ajouter.",
  },
  unavailable: {
    en: "This browser did not keep the note. It is not saved.",
    fr: "Ce navigateur n’a pas gardé la note. Elle n’est pas enregistrée.",
  },
  cleared: { en: "Cleared. Nothing was saved.", fr: "Effacé. Rien n’a été enregistré." },
} as const satisfies Record<string, Pair>;

export const CUE_COPY: Record<Cue, Pair> = {
  has: { en: "Words that usually mean it has one", fr: "Des mots qui veulent souvent dire qu’il y en a" },
  lacks: { en: "Words that usually mean it does not", fr: "Des mots qui veulent souvent dire qu’il n’y en a pas" },
  changes: { en: "Words about something that comes and goes", fr: "Des mots sur quelque chose de passager" },
  mentions: { en: "Named, with no clear cue", fr: "Nommé, sans indice clair" },
};

export const STATEMENT_ERRORS: Record<StatementError["code"], Pair> = {
  "text-required": { en: "Paste the text from the place’s page.", fr: "Collez le texte de la page du lieu." },
  "bad-url": {
    en: "Enter the full web address, as copied from the address bar.",
    fr: "Saisissez l’adresse Web complète, telle que copiée dans la barre d’adresse.",
  },
  required: { en: "Enter the place name.", fr: "Saisissez le nom du lieu." },
  "too-long": { en: "This is too long.", fr: "C’est trop long." },
  "control-chars": { en: "This contains characters that are not allowed.", fr: "Ceci contient des caractères non permis." },
  "bad-date": { en: "Enter the date as year-month-day, for example 2026-11-15.", fr: "Saisissez la date sous la forme année-mois-jour, par exemple 2026-11-15." },
  "future-date": { en: "The date cannot be in the future.", fr: "La date ne peut pas être dans le futur." },
  "licence-required": { en: "Choose a licence for your note.", fr: "Choisissez une licence pour votre note." },
  "licence-invalid": { en: "Choose one of the licences in the list.", fr: "Choisissez l’une des licences de la liste." },
  "personal-email": { en: "Remove the email address.", fr: "Retirez l’adresse courriel." },
  "personal-phone": { en: "Remove the phone number.", fr: "Retirez le numéro de téléphone." },
  "needs-one-detail": {
    en: "Choose Yes or No for at least one detail. Leave the others Unknown.",
    fr: "Choisissez Oui ou Non pour au moins un détail. Laissez les autres à UNKNOWN.",
  },
};

export function statementError(code: StatementError["code"], l: Locale): string {
  return t(STATEMENT_ERRORS[code], l);
}

/** "3 sentences", "1 phrase". */
export function sentencesCount(n: number, l: Locale): string {
  if (l === "fr") return `${n} ${n > 1 ? "phrases" : "phrase"}`;
  return `${n} ${n === 1 ? "sentence" : "sentences"}`;
}

/** "2 more sentences are not listed." */
export function moreSentencesText(n: number, l: Locale): string {
  if (l === "fr") return n > 1 ? `${n} autres phrases ne sont pas affichées.` : "1 autre phrase n’est pas affichée.";
  return n === 1 ? "1 more sentence is not listed." : `${n} more sentences are not listed.`;
}

/** The heading line for a detail: "Elevator: 2 sentences". */
export function findingHeading(detail: string, n: number, l: Locale): string {
  return `${detail}${l === "fr" ? NB : ""}: ${sentencesCount(n, l)}`;
}

/** The announcement after reading: "Found sentences for 3 of 4 details." */
export function foundText(withMentions: number, total: number, l: Locale): string {
  if (l === "fr") return `Phrases trouvées pour ${withMentions} ${withMentions > 1 ? "détails" : "détail"} sur ${total}.`;
  return `Found sentences for ${withMentions} of ${total} details.`;
}

/** "Saved a note for Library." */
export function savedText(place: string, l: Locale): string {
  return `${t(STATEMENT_COPY.saved, l)} ${place}.`;
}

/** French quotation marks with narrow no-break spaces, English curly quotes. For quoting one sentence. */
export function quote(s: string, l: Locale): string {
  return l === "fr" ? `«${NN}${s}${NN}»` : `“${s}”`;
}

export function statementStrings(): Array<[string, Pair]> {
  return [
    ...Object.entries(STATEMENT_COPY).map(([k, p]): [string, Pair] => [`statement.${k}`, p]),
    ...Object.entries(CUE_COPY).map(([k, p]): [string, Pair] => [`statement.cues.${k}`, p]),
    ...Object.entries(STATEMENT_ERRORS).map(([k, p]): [string, Pair] => [`statement.errors.${k}`, p]),
  ];
}
