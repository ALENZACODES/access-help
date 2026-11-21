import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, NN, t, type Pair } from "./copy";
import type { ImportError } from "./exchange";
import type { DropReason, EntryProblem, Notice } from "./filecheck";

/**
 * Words for "Check a notes file", in English and French. French copy uses ’,
 * U+00A0 before ":" and U+202F before ; ! ? and inside « ». A Yes or No the
 * App cannot keep is shown as the token UNKNOWN in French.
 */
export const FILE_CHECK_COPY = {
  title: { en: "Check a notes file", fr: "Revoir un fichier de notes" },
  intro: {
    en: "Paste or open a notes export to see what the App would do with each entry before you share it or bring it in: which notes it reads, which it leaves out and why, and which Yes or No answers it reads as Unknown because a source, an open licence or a date is missing.",
    fr: `Collez ou ouvrez une exportation de notes pour voir ce que l’App ferait de chaque entrée avant de la partager ou de l’importer${NB}: les notes qu’elle lit, celles qu’elle écarte et pourquoi, et les réponses Oui ou Non qu’elle lit comme UNKNOWN faute de source, de licence ouverte ou de date.`,
  },
  privacy: {
    en: "Nothing changes on this device: the file is read here, it is not saved and it is not sent anywhere.",
    fr: `Rien ne change sur cet appareil${NB}: le fichier est lu ici, il n’est pas enregistré et n’est envoyé nulle part.`,
  },
  pasteLabel: { en: "Text of the notes file", fr: "Texte du fichier de notes" },
  pasteHint: {
    en: "A notes export is made with “Export notes” on the Notes page.",
    fr: `Une exportation de notes se crée avec «${NN}Exporter les notes${NN}» sur la page Notes.`,
  },
  openLabel: { en: "Or open the file from this device", fr: "Ou ouvrez le fichier depuis cet appareil" },
  check: { en: "Check this file", fr: "Revoir ce fichier" },
  clear: { en: "Remove the file from the box", fr: "Retirer le fichier de la zone" },
  cleared: { en: "The box is empty. Nothing was saved.", fr: "La zone est vide. Rien n’a été enregistré." },
  opened: { en: "The file is in the box. Choose Check this file when ready.", fr: "Le fichier est dans la zone. Choisissez Revoir ce fichier quand vous êtes prêt." },
  readFailed: { en: "That file could not be opened. Try pasting its text instead.", fr: "Ce fichier n’a pas pu être ouvert. Essayez plutôt de coller son texte." },
  errorsTitle: { en: "Fix this before checking", fr: "À corriger avant de revoir" },
  resultsTitle: { en: "What the App would do with this file", fr: "Ce que l’App ferait de ce fichier" },
  totalsCaption: { en: "The file in numbers", fr: "Le fichier en chiffres" },
  totalsWhat: { en: "In the file", fr: "Dans le fichier" },
  totalsCount: { en: "Count", fr: "Nombre" },
  rows: {
    entries: { en: "Entries", fr: "Entrées" },
    readable: { en: "Notes the App reads", fr: "Notes que l’App lit" },
    leftOut: { en: "Entries the App leaves out", fr: "Entrées que l’App écarte" },
    dropped: { en: "Yes or No answers read as Unknown", fr: "Réponses Oui ou Non lues comme UNKNOWN" },
    personal: { en: "Notes whose own words hold an email address or phone number", fr: "Notes dont le texte contient une adresse courriel ou un numéro de téléphone" },
  },
  clean: {
    en: "The App reads every entry in this file, and every Yes or No has a source, an open licence and a date.",
    fr: "L’App lit chaque entrée de ce fichier, et chaque Oui ou Non a une source, une licence ouverte et une date.",
  },
  exported: { en: "The file says it was exported on", fr: "Le fichier indique une exportation le" },
  leftOutTitle: { en: "Entries the App leaves out", fr: "Entrées que l’App écarte" },
  droppedTitle: { en: "Answers read as Unknown", fr: "Réponses lues comme UNKNOWN" },
  droppedIntro: {
    en: "The note is read, but these answers are read as Unknown. Unknown does not mean No.",
    fr: "La note est lue, mais ces réponses sont lues comme UNKNOWN. UNKNOWN ne veut pas dire Non.",
  },
  noticesTitle: { en: "Things to look at", fr: "Points à regarder" },
  noticesIntro: {
    en: "These do not change how the App reads a note. They are worth a look before you share the file.",
    fr: "Ils ne changent pas la façon dont l’App lit une note. Ils valent un coup d’œil avant de partager le fichier.",
  },
  none: { en: "None.", fr: "Aucune." },
  moreEntries: {
    en: "Only the first entries are listed one by one. The numbers above count every entry.",
    fr: "Seules les premières entrées sont listées une à une. Les chiffres ci-dessus comptent toutes les entrées.",
  },
  downloadsTitle: { en: "Copies to download", fr: "Copies à télécharger" },
  downloadsIntro: {
    en: "A cleaned copy holds only the notes the App reads, with the answers above already read as Unknown. Your file is not changed.",
    fr: "Une copie nettoyée ne contient que les notes que l’App lit, avec les réponses ci-dessus déjà lues comme UNKNOWN. Votre fichier n’est pas modifié.",
  },
  downloadClean: { en: "Download a cleaned copy", fr: "Télécharger une copie nettoyée" },
  downloadNoWords: { en: "Download a cleaned copy without the notes’ own words", fr: "Télécharger une copie nettoyée sans le texte des notes" },
  downloadReport: { en: "Download this check as text", fr: "Télécharger ce contrôle en texte" },
  noReadable: { en: "No note in this file can be read, so there is no cleaned copy.", fr: "Aucune note de ce fichier ne peut être lue, il n’y a donc pas de copie nettoyée." },
  problems: {
    "not-object": { en: "it is not a note", fr: "ce n’est pas une note" },
    "bad-id": { en: "its id is missing or uses other characters than letters, digits, - and _", fr: "son identifiant manque ou contient d’autres caractères que des lettres, des chiffres, - et _" },
    "no-name": { en: "it has no place name", fr: "il n’a pas de nom de lieu" },
    "name-too-long": { en: "its place name is longer than 120 characters", fr: "son nom de lieu dépasse 120 caractères" },
    "name-control": { en: "its place name holds hidden control characters", fr: "son nom de lieu contient des caractères de contrôle cachés" },
    "bad-address": { en: "its address is too long or holds hidden control characters", fr: "son adresse est trop longue ou contient des caractères de contrôle cachés" },
    "bad-note-text": { en: "its own words are longer than 500 characters or hold hidden control characters", fr: "son texte dépasse 500 caractères ou contient des caractères de contrôle cachés" },
    "bad-created-date": { en: "its date is missing or is not a real date", fr: "sa date manque ou n’est pas une vraie date" },
    "licence-not-open": { en: "its licence is missing or is not one of the open licences the App accepts", fr: "sa licence manque ou ne fait pas partie des licences ouvertes acceptées par l’App" },
    "duplicate-id": { en: "an earlier entry has the same id", fr: "une entrée précédente a le même identifiant" },
    "over-limit": { en: "the App reads at most 400 entries of a file", fr: "l’App lit au plus 400 entrées par fichier" },
  },
  drops: {
    "no-provenance": { en: "no source, licence or date at all", fr: "aucune source, licence ni date" },
    "no-source": { en: "no source", fr: "pas de source" },
    "record-licence-not-open": { en: "no open licence", fr: "pas de licence ouverte" },
    "bad-record-date": { en: "no real date", fr: "pas de vraie date" },
  },
  notices: {
    "email-in-text": { en: "The note’s own words hold what looks like an email address", fr: "Le texte de la note contient ce qui ressemble à une adresse courriel" },
    "phone-in-text": { en: "The note’s own words hold what looks like a phone number", fr: "Le texte de la note contient ce qui ressemble à un numéro de téléphone" },
    "future-date": { en: "A record is dated after today", fr: "Une donnée est datée d’après aujourd’hui" },
    "repeated-detail": { en: "A detail is given twice; the App uses the first", fr: "Un détail est donné deux fois. L’App utilise le premier" },
    "other-detail": { en: "It names a detail the App does not show; the App leaves it out", fr: "Elle nomme un détail que l’App n’affiche pas. L’App l’écarte" },
    "odd-value": { en: "A detail has an answer other than Yes, No or Unknown; the App reads it as Unknown", fr: "Un détail a une réponse autre que Oui, Non ou UNKNOWN. L’App la lit comme UNKNOWN" },
    empty: { en: "No Yes or No recorded", fr: "Aucun Oui ni Non enregistré" },
    old: { en: "Every record is two years old or more", fr: "Toutes les données ont deux ans ou plus" },
    noAddress: { en: "No address", fr: "Aucune adresse" },
  },
  errors: {
    empty: { en: "The box is empty. Paste the file’s text or open it.", fr: "La zone est vide. Collez le texte du fichier ou ouvrez-le." },
    "too-large": { en: "The file is too large to read here.", fr: "Le fichier est trop volumineux pour être lu ici." },
    "not-json": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-format": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-version": {
      en: "This export comes from a different version and cannot be read.",
      fr: "Cette exportation provient d’une autre version et ne peut pas être lue.",
    },
  },
  text: {
    heading: { en: "Check of a notes file", fr: "Contrôle d’un fichier de notes" },
    made: { en: "Made on", fr: "Créé le" },
    nothingReviewed: {
      en: "This text was made on a device. It says how the App reads the file. Nothing in it was reviewed.",
      fr: "Ce texte a été créé sur un appareil. Il indique comment l’App lit le fichier. Rien n’y a été examiné.",
    },
  },
} as const;

export function problemText(p: EntryProblem, l: Locale): string {
  return t(FILE_CHECK_COPY.problems[p], l);
}

export function dropText(r: DropReason, l: Locale): string {
  return t(FILE_CHECK_COPY.drops[r], l);
}

export function noticeText(n: Notice, l: Locale): string {
  return t(FILE_CHECK_COPY.notices[n], l);
}

export function checkErrorText(e: ImportError, l: Locale): string {
  return t(FILE_CHECK_COPY.errors[e], l);
}

/** "Entry 3", or "Entry 3, Library (id n-3)". The name and id are the file's own text. */
export function entryLabel(position: number, name: string | undefined, id: string | undefined, l: Locale): string {
  const head = l === "fr" ? `Entrée ${position}` : `Entry ${position}`;
  const named = name === undefined ? head : `${head}, ${name}`;
  return id === undefined ? named : `${named} (${l === "fr" ? "identifiant" : "id"} ${id})`;
}

/** "Left out: it has no place name; its date is missing or is not a real date." */
export function leftOutText(problems: readonly EntryProblem[], l: Locale): string {
  const list = problems.map((p) => problemText(p, l));
  return l === "fr" ? `Écartée${NB}: ${list.join(`${NN}; `)}.` : `Left out: ${list.join("; ")}.`;
}

/** "Elevator, Yes: no source; no real date." */
export function droppedText(detail: string, value: "yes" | "no", reasons: readonly DropReason[], l: Locale): string {
  const answer = t(COPY.values[value], l);
  const list = reasons.map((r) => dropText(r, l));
  return l === "fr" ? `${detail}, ${answer}${NB}: ${list.join(`${NN}; `)}.` : `${detail}, ${answer}: ${list.join("; ")}.`;
}

/** Announced after a check. */
export function checkedText(readable: number, leftOut: number, dropped: number, l: Locale): string {
  if (l === "fr") return `Contrôle fait. Notes lues${NB}: ${readable}. Entrées écartées${NB}: ${leftOut}. Réponses lues comme UNKNOWN${NB}: ${dropped}.`;
  return `Checked. Notes read: ${readable}. Entries left out: ${leftOut}. Answers read as Unknown: ${dropped}.`;
}

/** ASCII file names with the date. */
export function checkFilename(kind: "report" | "clean" | "no-words", today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  if (kind === "report") return l === "fr" ? `controle-fichier-${day}.txt` : `file-check-${day}.txt`;
  if (kind === "clean") return l === "fr" ? `notes-nettoyees-${day}.json` : `notes-cleaned-${day}.json`;
  return l === "fr" ? `notes-nettoyees-sans-texte-${day}.json` : `notes-cleaned-no-words-${day}.json`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileCheckStrings(): Array<[string, Pair]> {
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
  walk("fileCheck", FILE_CHECK_COPY);
  return out;
}
