import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, NN, t, type Pair } from "./copy";
import type { AddedCopy, AddProblem, Outcome, PlannedAdd } from "./bulkadd";
import type { ImportError } from "./exchange";
import type { FactKey } from "./facts";
import { sourceName } from "./sources";
import type { Place, Resolution } from "./places";

/**
 * Words for "Add one record to many places", in English and French. French
 * copy uses ’, U+00A0 before ":" and U+202F before ; ! ? and inside « ».
 */
export const FILE_ADD_COPY = {
  title: { en: "Add one record to many places", fr: "Ajouter une donnée à plusieurs lieux" },
  intro: {
    en: "When one source gives the same answer about one detail for many places, such as a list of stations with elevators, add it to each place you tick, in a copy of a notes file.",
    fr: `Quand une source donne la même réponse sur un détail pour plusieurs lieux, comme une liste de stations avec ascenseur, ajoutez-la à chaque lieu coché, dans une copie d’un fichier de notes.`,
  },
  rule: {
    en: "Only tick a place your source covers. Nothing is filled in for you: say who recorded it, the licence and the date. Each record goes in a new note, so earlier records stay and you can see where reports differ.",
    fr: `Ne cochez qu’un lieu couvert par votre source. Rien n’est rempli à votre place${NB}: indiquez qui l’a noté, la licence et la date. Chaque donnée va dans une nouvelle note, si bien que les données plus anciennes restent et que vous voyez où les rapports divergent.`,
  },
  privacy: {
    en: "Nothing is looked up or saved, and your file does not change: the records go in a copy.",
    fr: `Rien n’est recherché ni enregistré, et votre fichier ne change pas${NB}: les données vont dans une copie.`,
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
  recordTitle: { en: "The record", fr: "La donnée" },
  keyLegend: { en: "Detail", fr: "Détail" },
  valueLegend: { en: "Answer", fr: "Réponse" },
  whoLegend: { en: "Who recorded it", fr: "Qui l’a noté" },
  whoMe: { en: "I checked it myself", fr: "Je l’ai constaté moi-même" },
  whoSource: { en: "It comes from a source", fr: "Elle provient d’une source" },
  whoMeHint: {
    en: "Saved as Contributor report, the App’s label for what people check themselves, as in the App’s own note form. The source name is then not used.",
    fr: "Enregistrée comme Rapport d’un contributeur, l’étiquette de l’App pour ce que les gens constatent eux-mêmes, comme dans le formulaire de note de l’App. Le nom de la source n’est alors pas utilisé.",
  },
  sourceLabel: { en: "Name of the source", fr: "Nom de la source" },
  sourceHint: { en: "As you would credit it, such as the agency and its list. 120 characters or fewer.", fr: "Comme vous la citeriez, par exemple l’organisme et sa liste. 120 caractères ou moins." },
  licenceLabel: { en: "Open licence", fr: "Licence ouverte" },
  licenceHint: { en: "There is no default: choose the licence the record can be shared under.", fr: `Il n’y a pas de choix par défaut${NB}: choisissez la licence sous laquelle la donnée peut être partagée.` },
  licenceNone: { en: "Choose a licence", fr: "Choisissez une licence" },
  dateLabel: { en: "Date recorded", fr: "Date de saisie" },
  dateHint: { en: "Written like 2026-03-31, today or before.", fr: "Écrite comme 2026-03-31, aujourd’hui ou avant." },
  placesTitle: { en: "Places to show", fr: "Lieux à afficher" },
  searchLabel: { en: "Only places whose name or address holds (optional)", fr: "Seulement les lieux dont le nom ou l’adresse contient (facultatif)" },
  onlyUnknown: { en: "Only places with no record for this detail", fr: "Seulement les lieux sans donnée pour ce détail" },
  show: { en: "Show the places", fr: "Afficher les lieux" },
  problems: {
    "no-key": { en: "Choose the detail.", fr: "Choisissez le détail." },
    "no-value": { en: "Choose the answer.", fr: "Choisissez la réponse." },
    "no-who": { en: "Say who recorded it.", fr: "Indiquez qui l’a noté." },
    "source-empty": { en: "Type the name of the source.", fr: "Tapez le nom de la source." },
    "source-long": { en: "Use 120 characters or fewer for the source.", fr: "Utilisez 120 caractères ou moins pour la source." },
    "source-control": { en: "Remove the line breaks and tabs from the source.", fr: "Retirez les sauts de ligne et les tabulations de la source." },
    "source-contributor": {
      en: "Contributor report is the App’s own label. If you checked it yourself, choose I checked it myself.",
      fr: "Contributor report est l’étiquette de l’App. Si vous l’avez constaté vous-même, choisissez Je l’ai constaté moi-même.",
    },
    "no-licence": { en: "Choose an open licence.", fr: "Choisissez une licence ouverte." },
    "date-empty": { en: "Type the date it was recorded.", fr: "Tapez la date de saisie." },
    "date-bad": { en: "Write the date like 2026-03-31.", fr: "Écrivez la date comme 2026-03-31." },
    "date-future": { en: "Choose today or a day before it.", fr: "Choisissez aujourd’hui ou une date antérieure." },
    "no-places": { en: "Tick at least one place.", fr: "Cochez au moins un lieu." },
  },
  outcomes: {
    new: { en: "first record for this detail", fr: "première donnée pour ce détail" },
    same: { en: "agrees with what is there", fr: "concorde avec ce qui s’y trouve" },
    differs: { en: "reports would differ", fr: "les rapports divergeraient" },
    "already-differ": { en: "reports already differ here", fr: "les rapports divergent déjà ici" },
    repeat: { en: "already holds this exact record, so it is not added again", fr: "contient déjà exactement cette donnée, qui n’est donc pas ajoutée à nouveau" },
  },
  listTitle: { en: "Places shown", fr: "Lieux affichés" },
  none: { en: "No place matches.", fr: "Aucun lieu ne correspond." },
  allRepeat: { en: "Every place shown already holds this exact record. Nothing would be added.", fr: "Chaque lieu affiché contient déjà exactement cette donnée. Rien ne serait ajouté." },
  tickAll: { en: "Tick every place shown", fr: "Cocher tous les lieux affichés" },
  untickAll: { en: "Untick every place", fr: "Décocher tous les lieux" },
  allTicked: { en: "Every place shown is ticked.", fr: "Chaque lieu affiché est coché." },
  noneTicked: { en: "No place is ticked.", fr: "Aucun lieu n’est coché." },
  make: { en: "Add the record to the places ticked, in a copy", fr: "Ajouter la donnée aux lieux cochés, dans une copie" },
  copyTitle: { en: "Copy with the record added", fr: "Copie avec la donnée ajoutée" },
  made: { en: "The copy is ready.", fr: "La copie est prête." },
  downloadCopy: { en: "Download the copy", fr: "Télécharger la copie" },
  copyHint: {
    en: "Bring the copy in with “Import notes”, or use it with the other file tools. Your file does not change.",
    fr: `Importez la copie avec «${NN}Importer des notes${NN}», ou utilisez-la avec les autres outils de fichiers. Votre fichier ne change pas.`,
  },
  downloadCsv: { en: "Download the records added (CSV)", fr: "Télécharger les données ajoutées (CSV)" },
  noAddress: { en: "no address", fr: "sans adresse" },
  errors: {
    empty: { en: "The box is empty. Paste the file’s text or open it.", fr: "La zone est vide. Collez le texte du fichier ou ouvrez-le." },
    "too-large": { en: "The file is too large to read here.", fr: "Le fichier est trop volumineux pour être lu ici." },
    "not-json": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-format": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-version": { en: "This export comes from a different version and cannot be read.", fr: "Cette exportation provient d’une autre version et ne peut pas être lue." },
    "no-notes": { en: "This file has no note the App can read.", fr: "Ce fichier ne contient aucune note lisible par l’App." },
  },
} as const;

export function addErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_ADD_COPY.errors[e], l);
}

export function addProblemText(p: AddProblem, l: Locale): string {
  return t(FILE_ADD_COPY.problems[p], l);
}

export function outcomeText(o: Outcome, l: Locale): string {
  return t(FILE_ADD_COPY.outcomes[o], l);
}

const count = (n: number, one: string, many: string, l: Locale): string => `${n} ${(l === "fr" ? n > 1 : n !== 1) ? many : one}`;

/** "Yes", "No", "Unknown" (UNKNOWN in French) or "reports differ", for a place's reading. */
export function readingText(r: Resolution, l: Locale): string {
  if (r.kind === "unknown") return t(COPY.values.unknown, l);
  if (r.kind === "agree") return t(COPY.values[r.value], l);
  return l === "fr" ? "rapports divergents" : "reports differ";
}

/** "Library, 1 King St W". */
export function placeName(p: Place, l: Locale): string {
  return `${p.name}, ${p.address ?? t(FILE_ADD_COPY.noAddress, l)}`;
}

/** "Library, 1 King St W — now Unknown; first record for this detail". */
export function plannedText(a: PlannedAdd, l: Locale): string {
  const now = l === "fr" ? `maintenant${NB}: ${readingText(a.before, l)}` : `now ${readingText(a.before, l)}`;
  return `${placeName(a.place, l)} — ${now}${l === "fr" ? NN : ""}; ${outcomeText(a.outcome, l)}`;
}

/** "Elevator: Yes — City transit list, CC-BY-4.0, dated 2026-10-01". */
export function recordText(key: FactKey, value: "yes" | "no", source: string, licence: string, on: string, l: Locale): string {
  const k = l === "fr" ? `${NB}:` : ":";
  return `${t(COPY.facts[key], l)}${k} ${t(COPY.values[value], l)} — ${sourceName(source, l)}, ${licence}, ${l === "fr" ? `datée du ${on}` : `dated ${on}`}`;
}

export function listSummary(plan: readonly PlannedAdd[], l: Locale): string {
  const n = (o: Outcome): number => plan.filter((a) => a.outcome === o).length;
  const repeat = n("repeat");
  if (l === "fr") {
    const tail = repeat > 0 ? `${NN}; ${repeat} ${repeat > 1 ? "contiennent" : "contient"} déjà cette donnée` : "";
    return `${count(plan.length, "lieu affiché", "lieux affichés", l)}${NB}: ${n("new")} sans donnée, ${n("same")} en accord, ${n("differs")} où les rapports divergeraient, ${n("already-differ")} où ils divergent déjà${tail}.`;
  }
  const tail = repeat > 0 ? `; ${repeat} already ${repeat === 1 ? "holds" : "hold"} this record` : "";
  return `${count(plan.length, "place", "places", l)} shown: ${n("new")} with no record, ${n("same")} that agree, ${n("differs")} where reports would differ, ${n("already-differ")} where they already differ${tail}.`;
}

export function copySummary(c: AddedCopy, differ: number, l: Locale): string {
  const places = c.added.length;
  if (l === "fr") {
    const tail = differ > 0 ? `${NN}; les rapports divergent maintenant à ${count(differ, "lieu", "lieux", l)}` : "";
    return `Donnée ajoutée à ${count(places, "lieu", "lieux", l)}, dans ${count(places, "nouvelle note", "nouvelles notes", l)}${tail}.`;
  }
  const tail = differ > 0 ? `; reports now differ at ${count(differ, "place", "places", l)}` : "";
  return `Record added to ${count(places, "place", "places", l)}, in ${count(places, "new note", "new notes", l)}${tail}.`;
}

export function addFilename(kind: "copy" | "csv", today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  if (kind === "csv") return l === "fr" ? `donnees-ajoutees-${day}.csv` : `records-added-${day}.csv`;
  return l === "fr" ? `notes-donnee-ajoutee-${day}.json` : `notes-record-added-${day}.json`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileAddStrings(): Array<[string, Pair]> {
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
  walk("fileAdd", FILE_ADD_COPY);
  return out;
}
