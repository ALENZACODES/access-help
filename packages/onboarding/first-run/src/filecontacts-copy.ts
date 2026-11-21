import type { Locale } from "../../switch-first/src/index";
import { NB, NN, t, type Pair } from "./copy";
import type { CleanedCopy, ContactChange, ContactField, ContactKind, ContactProblem, ContactsReport, Finding } from "./contactdetails";
import type { ImportError } from "./exchange";

/**
 * Words for "Remove contact details", in English and French. French copy uses
 * ’, U+00A0 before ":" and U+202F before ; ! ? and inside « ».
 */
export const FILE_CONTACTS_COPY = {
  title: { en: "Remove contact details", fr: "Retirer les coordonnées" },
  intro: {
    en: "Before you share a notes file, find the emails and phone numbers in its note text, place names and source names. For each one, keep it, remove just the contact details, or write the text again, and download a copy.",
    fr: `Avant de partager un fichier de notes, trouvez les courriels et numéros de téléphone dans le texte des notes, les noms de lieux et les noms de sources. Pour chacun, gardez-le, retirez seulement les coordonnées, ou récrivez le texte, puis téléchargez une copie.`,
  },
  rule: {
    en: "The App finds them the way its file check does, and never removes anything unless you ask. A shop’s public phone number may be fine to keep; a person’s own details should not travel with the file.",
    fr: `L’App les trouve comme le fait son contrôle de fichier, et ne retire jamais rien sans que vous le demandiez. Le numéro public d’un commerce peut rester${NN}; les coordonnées d’une personne ne devraient pas accompagner le fichier.`,
  },
  privacy: {
    en: "Nothing is looked up or saved, and your file does not change: the changes go in a copy. The list you can download says where the details are, never what they are.",
    fr: `Rien n’est recherché ni enregistré, et votre fichier ne change pas${NB}: les changements vont dans une copie. La liste téléchargeable indique où sont les coordonnées, jamais ce qu’elles sont.`,
  },
  pasteLabel: { en: "Text of the notes file", fr: "Texte du fichier de notes" },
  pasteHint: {
    en: "A notes export is made with “Export notes” on the Notes page.",
    fr: `Une exportation de notes se crée avec «${NN}Exporter les notes${NN}» sur la page Notes.`,
  },
  openLabel: { en: "Or open the file from this device", fr: "Ou ouvrez le fichier depuis cet appareil" },
  read: { en: "Read the file", fr: "Lire le fichier" },
  clear: { en: "Remove the file and the copy from the page", fr: "Retirer le fichier et la copie de la page" },
  cleared: { en: "The page is empty. Nothing was saved.", fr: "La page est vide. Rien n’a été enregistré." },
  opened: { en: "The file is in the box. Choose Read the file when ready.", fr: "Le fichier est dans la zone. Choisissez Lire le fichier quand vous êtes prêt." },
  readFailed: { en: "That file could not be opened. Try pasting its text instead.", fr: "Ce fichier n’a pas pu être ouvert. Essayez plutôt de coller son texte." },
  errorsTitle: { en: "Fix this first", fr: "À corriger d’abord" },
  resultsTitle: { en: "Contact details found", fr: "Coordonnées trouvées" },
  none: { en: "No email or phone number was found in this file’s note text, place names or source names.", fr: "Aucun courriel ni numéro de téléphone n’a été trouvé dans le texte des notes, les noms de lieux ou les noms de sources de ce fichier." },
  fields: {
    name: { en: "Place name", fr: "Nom du lieu" },
    note: { en: "Note text", fr: "Texte de la note" },
    source: { en: "Source name", fr: "Nom de la source" },
  },
  kinds: {
    email: { en: "email", fr: "courriel" },
    phone: { en: "phone number", fr: "numéro de téléphone" },
  },
  keep: { en: "Keep it as it is", fr: "Garder tel quel" },
  remove: { en: "Remove the contact details", fr: "Retirer les coordonnées" },
  removeAll: { en: "Remove the whole note text", fr: "Retirer tout le texte de la note" },
  rewrite: { en: "Use the text I write", fr: "Utiliser le texte que j’écris" },
  textLabel: { en: "Text for item", fr: "Texte de l’élément" },
  textHint: {
    note: { en: "500 characters or fewer. Leave it empty to remove the note text.", fr: "500 caractères ou moins. Laissez vide pour retirer le texte de la note." },
    name: { en: "120 characters or fewer, on one line.", fr: "120 caractères ou moins, sur une ligne." },
    source: { en: "120 characters or fewer, on one line. Every record from this source takes the new name.", fr: "120 caractères ou moins, sur une ligne. Chaque donnée de cette source prend le nouveau nom." },
  },
  stillWarning: {
    en: "This text still holds an email or a phone number. It can go in the copy if you mean to keep it.",
    fr: "Ce texte contient encore un courriel ou un numéro de téléphone. Il peut aller dans la copie si vous voulez le garder.",
  },
  nothingLeft: { en: "Removing the contact details would leave nothing, so write the text again or keep it.", fr: `Retirer les coordonnées ne laisserait rien${NN}; récrivez le texte ou gardez-le.` },
  itemLegend: { en: "What to do with item", fr: "Que faire de l’élément" },
  make: { en: "Make the copy", fr: "Créer la copie" },
  noneChanged: { en: "Choose a change for at least one item.", fr: "Choisissez un changement pour au moins un élément." },
  problems: {
    empty: { en: "Write the text, or choose Keep it as it is.", fr: "Écrivez le texte, ou choisissez Garder tel quel." },
    "too-long": { en: "The text is too long.", fr: "Le texte est trop long." },
    control: { en: "Remove the tabs and other hidden characters from the text.", fr: "Retirez les tabulations et autres caractères cachés du texte." },
    contributor: { en: "Contributor report is the App’s own label. Choose another name.", fr: "Contributor report est l’étiquette de l’App. Choisissez un autre nom." },
  },
  copyTitle: { en: "Copy with the changes", fr: "Copie avec les changements" },
  made: { en: "The copy is ready.", fr: "La copie est prête." },
  changesTitle: { en: "What the copy changes", fr: "Ce que la copie change" },
  removedText: { en: "note text removed", fr: "texte de la note retiré" },
  withoutLabel: { en: "Without the contact details", fr: "Sans les coordonnées" },
  downloadCopy: { en: "Download the copy", fr: "Télécharger la copie" },
  copyHint: {
    en: "Share the copy, or bring it in with “Import notes”. Your file does not change.",
    fr: `Partagez la copie, ou importez-la avec «${NN}Importer des notes${NN}». Votre fichier ne change pas.`,
  },
  downloadCsv: { en: "Download where they are (CSV, without the details)", fr: "Télécharger où elles sont (CSV, sans les coordonnées)" },
  errors: {
    empty: { en: "The box is empty. Paste the file’s text or open it.", fr: "La zone est vide. Collez le texte du fichier ou ouvrez-le." },
    "too-large": { en: "The file is too large to read here.", fr: "Le fichier est trop volumineux pour être lu ici." },
    "not-json": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-format": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-version": { en: "This export comes from a different version and cannot be read.", fr: "Cette exportation provient d’une autre version et ne peut pas être lue." },
    "no-notes": { en: "This file has no note the App can read.", fr: "Ce fichier ne contient aucune note lisible par l’App." },
  },
} as const;

export function contactsErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_CONTACTS_COPY.errors[e], l);
}

export function contactProblemText(p: ContactProblem, l: Locale): string {
  return t(FILE_CONTACTS_COPY.problems[p], l);
}

export function fieldText(f: ContactField, l: Locale): string {
  return t(FILE_CONTACTS_COPY.fields[f], l);
}

const count = (n: number, one: string, many: string, l: Locale): string => `${n} ${(l === "fr" ? n > 1 : n !== 1) ? many : one}`;

/** "1 email, 2 phone numbers". */
export function kindsText(f: Finding, l: Locale): string {
  const n = (k: ContactKind): number => f.contacts.filter((c) => c.kind === k).length;
  const parts: string[] = [];
  if (n("email") > 0) parts.push(count(n("email"), t(FILE_CONTACTS_COPY.kinds.email, l), l === "fr" ? "courriels" : "emails", l));
  if (n("phone") > 0) parts.push(count(n("phone"), t(FILE_CONTACTS_COPY.kinds.phone, l), l === "fr" ? "numéros de téléphone" : "phone numbers", l));
  return parts.join(", ");
}

/** "Place name — Café — 1 phone number", or for a source, "Source name — used by 3 records in 2 notes — 1 email". */
export function findingHeading(f: Finding, l: Locale): string {
  const where =
    f.field === "source"
      ? l === "fr"
        ? `utilisée par ${count(f.records, "donnée", "données", l)} dans ${count(f.notes.length, "note", "notes", l)}`
        : `used by ${count(f.records, "record", "records", l)} in ${count(f.notes.length, "note", "notes", l)}`
      : f.place;
  return `${fieldText(f.field, l)} — ${where} — ${kindsText(f, l)}`;
}

export function contactsSummary(r: ContactsReport, l: Locale): string {
  const emails = r.findings.reduce((s, f) => s + f.contacts.filter((c) => c.kind === "email").length, 0);
  const phones = r.findings.reduce((s, f) => s + f.contacts.filter((c) => c.kind === "phone").length, 0);
  const items = r.findings.length;
  if (l === "fr")
    return `${count(r.notes, "note", "notes", l)}${NB}: ${count(emails, "courriel", "courriels", l)} et ${count(phones, "numéro de téléphone", "numéros de téléphone", l)} dans ${count(items, "élément", "éléments", l)}.`;
  return `${count(r.notes, "note", "notes", l)}: ${count(emails, "email", "emails", l)} and ${count(phones, "phone number", "phone numbers", l)} in ${count(items, "item", "items", l)}.`;
}

export function copySummary(c: CleanedCopy, l: Locale): string {
  if (l === "fr") {
    const still = c.stillHas > 0 ? `${NN}; ${c.stillHas} en contiennent encore, comme vous l’avez choisi` : "";
    return `${count(c.changed, "élément changé", "éléments changés", l)} dans ${count(c.notesChanged, "note", "notes", l)}${still}.`;
  }
  const still = c.stillHas > 0 ? `; ${c.stillHas} still ${c.stillHas === 1 ? "holds" : "hold"} contact details, as you chose` : "";
  return `${count(c.changed, "item", "items", l)} changed in ${count(c.notesChanged, "note", "notes", l)}${still}.`;
}

/** "Place name, Café: Café", or "Note text, Café: note text removed". */
export function changeText(c: ContactChange, l: Locale): string {
  const k = l === "fr" ? `${NB}:` : ":";
  const to = c.to === "" ? t(FILE_CONTACTS_COPY.removedText, l) : c.to;
  const where = c.finding.field === "source" ? fieldText("source", l) : `${fieldText(c.finding.field, l)}, ${c.finding.place}`;
  return `${where}${k} ${to}`;
}

export function contactsFilename(kind: "copy" | "csv", today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  if (kind === "csv") return l === "fr" ? `ou-sont-les-coordonnees-${day}.csv` : `where-contact-details-are-${day}.csv`;
  return l === "fr" ? `notes-sans-coordonnees-${day}.json` : `notes-without-contact-details-${day}.json`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileContactsStrings(): Array<[string, Pair]> {
  const out: Array<[string, Pair]> = [];
  const walk = (path: string, v: unknown): void => {
    if (!v || typeof v !== "object") return;
    const o = v as Record<string, unknown>;
    if (typeof o["en"] === "string" && typeof o["fr"] === "string") {
      out.push([path, { en: o["en"], fr: o["fr"] }]);
      return;
    }
    for (const [key, c] of Object.entries(o)) walk(`${path}.${key}`, c);
  };
  walk("fileContacts", FILE_CONTACTS_COPY);
  return out;
}
