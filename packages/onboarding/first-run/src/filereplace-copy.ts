import type { Locale } from "../../switch-first/src/index";
import { NB, NN, t, type Pair } from "./copy";
import type { ImportError } from "./exchange";
import type { Hit, HitProblem, OptionProblem, ReplaceChange, ReplacedCopy, ReplaceField, ReplaceOptions, ReplaceReport } from "./textreplace";

/**
 * Words for "Find and replace in notes", in English and French. French copy
 * uses ’, U+00A0 before ":" and U+202F before ; ! ? and inside « ».
 */
export const FILE_REPLACE_COPY = {
  title: { en: "Find and replace in notes", fr: "Rechercher et remplacer dans les notes" },
  intro: {
    en: "Change the same words in many place names, addresses or note texts at once, such as a misspelled street or a word written two ways. See every change before you make it, leave out any you do not want, and download a copy.",
    fr: `Changez les mêmes mots dans plusieurs noms de lieux, adresses ou textes de notes à la fois, comme une rue mal écrite ou un mot écrit de deux façons. Voyez chaque changement avant de le faire, laissez de côté ceux que vous ne voulez pas, puis téléchargez une copie.`,
  },
  rule: {
    en: "Records are never changed: their answer, source, licence and date say what was recorded and by whom.",
    fr: `Les données ne sont jamais changées${NB}: leur réponse, leur source, leur licence et leur date disent ce qui a été noté et par qui.`,
  },
  privacy: {
    en: "Nothing is looked up or saved, and your file does not change: the changes go in a copy.",
    fr: `Rien n’est recherché ni enregistré, et votre fichier ne change pas${NB}: les changements vont dans une copie.`,
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
  readDone: { en: "notes read.", fr: "notes lues." },
  errorsTitle: { en: "Fix this first", fr: "À corriger d’abord" },
  optionsTitle: { en: "What to find", fr: "Quoi chercher" },
  findLabel: { en: "Find", fr: "Chercher" },
  findHint: { en: "The words as they are written, up to 100 characters.", fr: "Les mots tels qu’ils sont écrits, jusqu’à 100 caractères." },
  replaceLabel: { en: "Replace with", fr: "Remplacer par" },
  replaceHint: { en: "Up to 200 characters. Leave it empty to take out the words found.", fr: "Jusqu’à 200 caractères. Laissez vide pour enlever les mots trouvés." },
  fieldsLegend: { en: "Where to look", fr: "Où chercher" },
  fields: {
    name: { en: "Place names", fr: "Noms de lieux" },
    address: { en: "Addresses", fr: "Adresses" },
    note: { en: "Note text", fr: "Texte des notes" },
  },
  field: {
    name: { en: "Place name", fr: "Nom du lieu" },
    address: { en: "Address", fr: "Adresse" },
    note: { en: "Note text", fr: "Texte de la note" },
  },
  matchCase: { en: "Match capitals exactly", fr: "Respecter les majuscules" },
  wholeWords: { en: "Whole words only", fr: "Mots entiers seulement" },
  wholeHint: {
    en: "With whole words, “St” finds “12 King St” but not “Station”. Accents always count: “cafe” does not find “café”.",
    fr: `Avec les mots entiers, «${NN}St${NN}» trouve «${NN}12 King St${NN}» mais pas «${NN}Station${NN}». Les accents comptent toujours${NB}: «${NN}cafe${NN}» ne trouve pas «${NN}café${NN}».`,
  },
  show: { en: "Show the changes", fr: "Afficher les changements" },
  problems: {
    "find-empty": { en: "Type the words to find.", fr: "Tapez les mots à chercher." },
    "find-long": { en: "Use 100 characters or fewer to find.", fr: "Utilisez 100 caractères ou moins pour chercher." },
    "find-control": { en: "Remove the line breaks and tabs from the words to find.", fr: "Retirez les sauts de ligne et les tabulations des mots à chercher." },
    "replace-long": { en: "Use 200 characters or fewer to replace with.", fr: "Utilisez 200 caractères ou moins pour remplacer." },
    "replace-control": { en: "Remove the line breaks and tabs from the replacement.", fr: "Retirez les sauts de ligne et les tabulations du remplacement." },
    "no-fields": { en: "Choose at least one place to look.", fr: "Choisissez au moins un endroit où chercher." },
  },
  resultsTitle: { en: "Changes found", fr: "Changements trouvés" },
  none: { en: "Nothing in the places you chose matches.", fr: "Rien ne correspond dans les endroits choisis." },
  before: { en: "Now", fr: "Maintenant" },
  after: { en: "After", fr: "Après" },
  empty: { en: "(empty)", fr: "(vide)" },
  hitProblems: {
    "name-empty": { en: "Cannot be made: a place needs a name.", fr: `Impossible${NB}: un lieu doit avoir un nom.` },
    "too-long": { en: "Cannot be made: the text would be too long.", fr: `Impossible${NB}: le texte serait trop long.` },
  },
  make: { en: "Make the copy with the changes ticked", fr: "Créer la copie avec les changements cochés" },
  tickAll: { en: "Tick every change", fr: "Cocher tous les changements" },
  untickAll: { en: "Untick every change", fr: "Décocher tous les changements" },
  allTicked: { en: "Every change that can be made is ticked.", fr: "Chaque changement possible est coché." },
  noneTicked: { en: "No change is ticked.", fr: "Aucun changement n’est coché." },
  noneAccepted: { en: "Tick at least one change that can be made.", fr: "Cochez au moins un changement possible." },
  copyTitle: { en: "Copy with the changes", fr: "Copie avec les changements" },
  made: { en: "The copy is ready.", fr: "La copie est prête." },
  changesTitle: { en: "What the copy changes", fr: "Ce que la copie change" },
  downloadCopy: { en: "Download the copy", fr: "Télécharger la copie" },
  copyHint: {
    en: "Bring the copy in with “Import notes”, or use it with the other file tools. Your file does not change.",
    fr: `Importez la copie avec «${NN}Importer des notes${NN}», ou utilisez-la avec les autres outils de fichiers. Votre fichier ne change pas.`,
  },
  downloadCsv: { en: "Download the changes found (CSV)", fr: "Télécharger les changements trouvés (CSV)" },
  errors: {
    empty: { en: "The box is empty. Paste the file’s text or open it.", fr: "La zone est vide. Collez le texte du fichier ou ouvrez-le." },
    "too-large": { en: "The file is too large to read here.", fr: "Le fichier est trop volumineux pour être lu ici." },
    "not-json": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-format": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-version": { en: "This export comes from a different version and cannot be read.", fr: "Cette exportation provient d’une autre version et ne peut pas être lue." },
    "no-notes": { en: "This file has no note the App can read.", fr: "Ce fichier ne contient aucune note lisible par l’App." },
  },
} as const;

export function replaceErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_REPLACE_COPY.errors[e], l);
}

export function optionProblemText(p: OptionProblem, l: Locale): string {
  return t(FILE_REPLACE_COPY.problems[p], l);
}

export function hitProblemText(p: HitProblem, l: Locale): string {
  return t(FILE_REPLACE_COPY.hitProblems[p], l);
}

export function fieldName(f: ReplaceField, l: Locale): string {
  return t(FILE_REPLACE_COPY.field[f], l);
}

const count = (n: number, one: string, many: string, l: Locale): string => `${n} ${(l === "fr" ? n > 1 : n !== 1) ? many : one}`;

/** "Place name of Kng St Café — 2 matches". */
export function hitHeading(h: Hit, l: Locale): string {
  const n = count(h.matches.length, l === "fr" ? "correspondance" : "match", l === "fr" ? "correspondances" : "matches", l);
  return l === "fr" ? `${fieldName(h.field, l)} de ${h.note.placeName} — ${n}` : `${fieldName(h.field, l)} of ${h.note.placeName} — ${n}`;
}

/** The label of a change's tick box, naming it so it can be told apart from the others when read alone. */
export function acceptLabel(h: Hit, i: number, l: Locale): string {
  return l === "fr" ? `Faire le changement ${i + 1} (${fieldName(h.field, l).toLowerCase()} de ${h.note.placeName})` : `Make change ${i + 1} (${fieldName(h.field, l).toLowerCase()} of ${h.note.placeName})`;
}

/** “Steet” → “Street”, in quotes; an empty replacement says so. */
export function searchText(o: Pick<ReplaceOptions, "find" | "replace">, l: Locale): string {
  const to = o.replace === "" ? t(FILE_REPLACE_COPY.empty, l) : l === "fr" ? `«${NN}${o.replace}${NN}»` : `“${o.replace}”`;
  return l === "fr" ? `«${NN}${o.find}${NN}» → ${to}` : `“${o.find}” → ${to}`;
}

export function replaceSummary(r: ReplaceReport, o: ReplaceOptions, l: Locale): string {
  const blocked = r.hits.filter((h) => h.problem !== undefined).length;
  const what = searchText(o, l);
  if (l === "fr") {
    const tail = blocked > 0 ? `, dont ${blocked} impossible${blocked > 1 ? "s" : ""}` : "";
    return `${what}${NB}: ${count(r.matches, "correspondance", "correspondances", l)} dans ${count(r.hits.length, "champ", "champs", l)} sur ${count(r.notes, "note", "notes", l)}${tail}.`;
  }
  const tail = blocked > 0 ? `, ${blocked} of which cannot be made` : "";
  return `${what}: ${count(r.matches, "match", "matches", l)} in ${count(r.hits.length, "field", "fields", l)} across ${count(r.notes, "note", "notes", l)}${tail}.`;
}

export function copySummary(c: ReplacedCopy, l: Locale): string {
  if (l === "fr") return `${count(c.replaced, "remplacement", "remplacements", l)} dans ${count(c.fields, "champ", "champs", l)} sur ${count(c.notesChanged, "note", "notes", l)}.`;
  return `${count(c.replaced, "replacement", "replacements", l)} in ${count(c.fields, "field", "fields", l)} across ${count(c.notesChanged, "note", "notes", l)}.`;
}

/** "Address of Café: 12 Kng St → 12 King St". */
export function changeText(c: ReplaceChange, l: Locale): string {
  const k = l === "fr" ? `${NB}:` : ":";
  const to = c.to === "" ? t(FILE_REPLACE_COPY.empty, l) : c.to;
  const where = l === "fr" ? `${fieldName(c.hit.field, l)} de ${c.hit.note.placeName}` : `${fieldName(c.hit.field, l)} of ${c.hit.note.placeName}`;
  return `${where}${k} ${c.hit.before} → ${to}${c.joins ? ` (${joinsText(l)})` : ""}`;
}

/** The note's place now joins another, said after the change. */
export function joinsText(l: Locale): string {
  return l === "fr"
    ? `rejoint un autre lieu du même nom et de la même adresse${NN}; leurs données sont réunies`
    : "joins another place with this name and address; their records go together";
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

export function replaceFilename(kind: "copy" | "csv", today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  if (kind === "csv") return l === "fr" ? `changements-trouves-${day}.csv` : `changes-found-${day}.csv`;
  return l === "fr" ? `notes-remplacees-${day}.json` : `notes-replaced-${day}.json`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileReplaceStrings(): Array<[string, Pair]> {
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
  walk("fileReplace", FILE_REPLACE_COPY);
  return out;
}
