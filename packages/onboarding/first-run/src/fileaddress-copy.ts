import type { Locale } from "../../switch-first/src/index";
import { NB, NN, t, type Pair } from "./copy";
import type { ImportError } from "./exchange";
import type { AddressChange, AddressedCopy, AddressIssue, AddressProblem, AddressReport, AddressRow } from "./addressfill";

/**
 * Words for "Add missing addresses", in English and French. French copy uses
 * ’, U+00A0 before ":" and U+202F before ; ! ? and inside « ».
 */
export const FILE_ADDRESS_COPY = {
  title: { en: "Add missing addresses", fr: "Ajouter les adresses manquantes" },
  intro: {
    en: "Find the places in a notes file with no address, or with an address the App cannot read a house number and street from. Such a place cannot be told apart from another with the same name, and goes after every street in walking lists. Add the addresses and download a copy.",
    fr: `Trouvez les lieux d’un fichier de notes sans adresse, ou dont l’App ne peut pas lire un numéro et une rue dans l’adresse. Un tel lieu ne se distingue pas d’un autre du même nom, et passe après toutes les rues dans les listes de parcours. Ajoutez les adresses, puis téléchargez une copie.`,
  },
  rule: {
    en: "The App never makes an address up. It only offers addresses that other places with the same name already have in this file, and only you know whether they are the same place.",
    fr: `L’App n’invente jamais d’adresse. Elle ne propose que les adresses que d’autres lieux du même nom ont déjà dans ce fichier, et vous seul savez s’il s’agit du même lieu.`,
  },
  privacy: {
    en: "Nothing is looked up or saved, and your file does not change: the addresses go in a copy.",
    fr: `Rien n’est recherché ni enregistré, et votre fichier ne change pas${NB}: les adresses vont dans une copie.`,
  },
  pasteLabel: { en: "Text of the notes file", fr: "Texte du fichier de notes" },
  pasteHint: {
    en: "A notes export is made with “Export notes” on the Notes page.",
    fr: `Une exportation de notes se crée avec «${NN}Exporter les notes${NN}» sur la page Notes.`,
  },
  openLabel: { en: "Or open the file from this device", fr: "Ou ouvrez le fichier depuis cet appareil" },
  read: { en: "Read the file", fr: "Lire le fichier" },
  clear: { en: "Remove the file and the copy", fr: "Retirer le fichier et la copie" },
  cleared: { en: "The page is empty. Nothing was saved.", fr: "La page est vide. Rien n’a été enregistré." },
  opened: { en: "The file is in the box. Choose Read the file when ready.", fr: "Le fichier est dans la zone. Choisissez Lire le fichier quand vous êtes prêt." },
  readFailed: { en: "That file could not be opened. Try pasting its text instead.", fr: "Ce fichier n’a pas pu être ouvert. Essayez plutôt de coller son texte." },
  errorsTitle: { en: "Fix this first", fr: "À corriger d’abord" },
  resultsTitle: { en: "Places to add an address to", fr: "Lieux auxquels ajouter une adresse" },
  none: { en: "Every place in this file has an address the App can read a street from.", fr: "Chaque lieu de ce fichier a une adresse dont l’App peut lire la rue." },
  issues: {
    none: { en: "No address", fr: "Aucune adresse" },
    "no-street": { en: "No house number and street the App can read", fr: "Aucun numéro ni rue que l’App peut lire" },
    "no-postal": { en: "No postal code the App can read", fr: "Aucun code postal que l’App peut lire" },
  },
  postalLabel: { en: "Also list places whose address has no postal code", fr: "Lister aussi les lieux dont l’adresse n’a pas de code postal" },
  postalHint: {
    en: "Lists by postal area put them in a group of their own. For each, the App offers the address of another place in the file at the same house number and street, if one has a postal code.",
    fr: "Les listes par secteur postal les placent dans un groupe à part. Pour chacun, l’App propose l’adresse d’un autre lieu du fichier au même numéro et à la même rue, s’il a un code postal.",
  },
  downloadText: { en: "Download the list (text)", fr: "Télécharger la liste (texte)" },
  textIntro: {
    en: "Places from a notes export with no address the App can read a street from. The App never makes an address up; the addresses offered come from the same file.",
    fr: `Lieux d’une exportation de notes sans adresse dont l’App peut lire la rue. L’App n’invente jamais d’adresse${NN}; les adresses proposées viennent du même fichier.`,
  },
  textOffered: { en: "In the file", fr: "Dans le fichier" },
  keep: { en: "Leave it as it is", fr: "Laisser tel quel" },
  typed: { en: "Use the address I type", fr: "Utiliser l’adresse que je tape" },
  typedLabel: { en: "Address for place", fr: "Adresse du lieu" },
  typedHint: {
    en: "Write it like 12 King St W, Toronto. 200 characters or fewer.",
    fr: "Écrivez-la comme 12, rue King Ouest, Toronto. 200 caractères ou moins.",
  },
  noStreetWarning: {
    en: "The App cannot read a house number and street from this address. It can still go in the copy, but the place will still go after the streets.",
    fr: "L’App ne peut pas lire de numéro ni de rue dans cette adresse. Elle peut tout de même aller dans la copie, mais le lieu passera toujours après les rues.",
  },
  noSuggestion: { en: "No other place with this name has an address in this file.", fr: "Aucun autre lieu de ce nom n’a d’adresse dans ce fichier." },
  rowLegend: { en: "Address for place", fr: "Adresse pour le lieu" },
  make: { en: "Make the copy", fr: "Créer la copie" },
  noneChanged: { en: "Choose or type an address for at least one place.", fr: "Choisissez ou tapez une adresse pour au moins un lieu." },
  problems: {
    empty: { en: "Type an address, or choose Leave it as it is.", fr: "Tapez une adresse, ou choisissez Laisser tel quel." },
    "too-long": { en: "Use 200 characters or fewer.", fr: "Utilisez 200 caractères ou moins." },
    control: { en: "Remove the line breaks and tabs from the address.", fr: "Retirez les sauts de ligne et les tabulations de l’adresse." },
  },
  copyTitle: { en: "Copy with the addresses", fr: "Copie avec les adresses" },
  made: { en: "The copy is ready.", fr: "La copie est prête." },
  changesTitle: { en: "What the copy changes", fr: "Ce que la copie change" },
  downloadCopy: { en: "Download the copy", fr: "Télécharger la copie" },
  copyHint: {
    en: "Bring the copy in with “Import notes”, or use it with the other file tools. Your file does not change.",
    fr: `Importez la copie avec «${NN}Importer des notes${NN}», ou utilisez-la avec les autres outils de fichiers. Votre fichier ne change pas.`,
  },
  downloadCsv: { en: "Download the list (CSV)", fr: "Télécharger la liste (CSV)" },
  errors: {
    empty: { en: "The box is empty. Paste the file’s text or open it.", fr: "La zone est vide. Collez le texte du fichier ou ouvrez-le." },
    "too-large": { en: "The file is too large to read here.", fr: "Le fichier est trop volumineux pour être lu ici." },
    "not-json": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-format": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-version": { en: "This export comes from a different version and cannot be read.", fr: "Cette exportation provient d’une autre version et ne peut pas être lue." },
    "no-notes": { en: "This file has no note the App can read.", fr: "Ce fichier ne contient aucune note lisible par l’App." },
  },
} as const;

export function addressErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_ADDRESS_COPY.errors[e], l);
}

export function addressProblemText(p: AddressProblem, l: Locale): string {
  return t(FILE_ADDRESS_COPY.problems[p], l);
}

export function issueText(i: AddressIssue, l: Locale): string {
  return t(FILE_ADDRESS_COPY.issues[i], l);
}

const count = (n: number, one: string, many: string, l: Locale): string => `${n} ${(l === "fr" ? n > 1 : n !== 1) ? many : one}`;

/** "Café — No address — 2 notes" or "Café, Main St — No house number … — 1 note". */
export function rowText(r: AddressRow, l: Locale): string {
  const where = r.place.address ? `${r.place.name}, ${r.place.address}` : r.place.name;
  return `${where} — ${issueText(r.issue, l)} — ${count(r.place.notes.length, "note", "notes", l)}`;
}

/** "Use 12 King St W (another place named Café has it)", or for a missing postal code, "(another place at this street address has it)". */
export function suggestionLabel(address: string, row: AddressRow, l: Locale): string {
  if (row.issue === "no-postal")
    return l === "fr" ? `Utiliser ${address} (un autre lieu à ce numéro de rue l’a)` : `Use ${address} (another place at this street address has it)`;
  return l === "fr" ? `Utiliser ${address} (un autre lieu nommé ${row.place.name} l’a)` : `Use ${address} (another place named ${row.place.name} has it)`;
}

export function addressSummary(r: AddressReport, l: Locale, postal = false): string {
  const n = (i: AddressIssue): number => r.rows.filter((x) => x.issue === i).length;
  const offered = r.rows.filter((x) => x.suggestions.length > 0).length;
  if (l === "fr") {
    const extra = postal ? `, ${n("no-postal")} sans code postal lisible` : "";
    return `${count(r.places, "lieu", "lieux", l)}${NB}: ${n("none")} sans adresse, ${n("no-street")} sans rue lisible${extra}, dont ${offered} avec une adresse proposée.`;
  }
  const extra = postal ? `, ${n("no-postal")} with no postal code the App can read` : "";
  return `${count(r.places, "place", "places", l)}: ${n("none")} with no address, ${n("no-street")} with no street the App can read${extra}, ${offered} with an address offered.`;
}

export function copySummary(c: AddressedCopy, l: Locale): string {
  if (l === "fr")
    return `${count(c.places, "lieu a reçu", "lieux ont reçu", l)} une adresse, sur ${count(c.changed, "note", "notes", l)}${NN}; l’App peut lire la rue de ${c.readable}.`;
  return `${count(c.places, "place was", "places were", l)} given an address, on ${count(c.changed, "note", "notes", l)}; the App can read the street of ${c.readable}.`;
}

/** "Café: 12 King St W" with a note when the App still cannot read a street from it. */
export function changeText(c: AddressChange, l: Locale): string {
  const k = l === "fr" ? `${NB}:` : ":";
  const base = `${c.row.place.name}${k} ${c.to}`;
  if (!c.readable) return l === "fr" ? `${base} (aucune rue lisible par l’App)` : `${base} (no street the App can read)`;
  if (c.row.issue === "no-postal" && !c.postal) return l === "fr" ? `${base} (aucun code postal lisible par l’App)` : `${base} (no postal code the App can read)`;
  if (c.joins) return l === "fr" ? `${base} (rejoint le lieu du même nom déjà à cette adresse${NN}; leurs données sont réunies)` : `${base} (joins the place with this name already at this address; their records go together)`;
  return base;
}

/** "The file had 6 places; the copy has 5, as 1 joined another." */
export function placesLine(before: number, after: number, l: Locale): string {
  const joined = before - after;
  if (l === "fr") {
    const tail = joined > 0 ? `, car ${count(joined, "lieu en a rejoint", "lieux en ont rejoint", l)} un autre` : "";
    return `Le fichier comptait ${count(before, "lieu", "lieux", l)}${NN}; la copie en compte ${after}${tail}.`;
  }
  const tail = joined > 0 ? `, as ${joined} joined another` : "";
  return `The file had ${count(before, "place", "places", l)}; the copy has ${after}${tail}.`;
}

/** The list as plain text, to print or keep: each place with what is missing and the addresses in the file. */
export function addressesText(r: AddressReport, today: Date, l: Locale, postal = false): string {
  const k = l === "fr" ? `${NB}:` : ":";
  const lines = [t(FILE_ADDRESS_COPY.resultsTitle, l), today.toISOString().slice(0, 10), "", t(FILE_ADDRESS_COPY.textIntro, l), addressSummary(r, l, postal), ""];
  r.rows.forEach((row, i) => {
    lines.push(`${i + 1}. ${rowText(row, l)}`);
    for (const a of row.suggestions) lines.push(`    ${t(FILE_ADDRESS_COPY.textOffered, l)}${k} ${a}`);
    lines.push("");
  });
  return `${lines.join("\n").trimEnd()}\n`;
}

export function addressFilename(kind: "copy" | "csv" | "text", today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  if (kind === "text") return l === "fr" ? `lieux-sans-adresse-${day}.txt` : `places-without-address-${day}.txt`;
  if (kind === "csv") return l === "fr" ? `lieux-sans-adresse-${day}.csv` : `places-without-address-${day}.csv`;
  return l === "fr" ? `notes-adresses-ajoutees-${day}.json` : `notes-addresses-added-${day}.json`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileAddressStrings(): Array<[string, Pair]> {
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
  walk("fileAddress", FILE_ADDRESS_COPY);
  return out;
}
