import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, NN, t, type Pair } from "./copy";
import type { ImportError } from "./exchange";
import { FACT_KEYS } from "./facts";
import type { LicenceRow } from "./licences";
import { FIRST_LIMITS } from "./lookfirst";
import { TITLE_MAX, placeColumns, datasetColumns, sourceCounts, type DatasetRow, type DictLanguage, type Layout, type PublishChecks, type PublishOptions, type PublishProblem } from "./publishpack";

/**
 * Words for "Prepare a file to publish", in English and French, and the text
 * that goes with the dataset. French copy uses ’, U+00A0 before ":" and
 * U+202F before ; ! ? and inside « ».
 */
export const FILE_PUBLISH_COPY = {
  title: { en: "Prepare a file to publish", fr: "Préparer un fichier à publier" },
  intro: {
    en: "Lay out a notes export for someone outside the App, such as an open-data portal or a partner: one CSV with a row for each record, and a text that explains every column, the details, the sources and licences to credit, and the dates.",
    fr: `Préparez une exportation de notes pour quelqu’un hors de l’App, comme un portail de données ouvertes ou un partenaire${NB}: un CSV avec une ligne par donnée, et un texte qui explique chaque colonne, les détails, les sources et licences à mentionner, et les dates.`,
  },
  privacy: {
    en: "Nothing is sent or saved, and your file does not change. You decide where the files go.",
    fr: "Rien n’est envoyé ni enregistré, et votre fichier ne change pas. Vous décidez où vont les fichiers.",
  },
  pasteLabel: { en: "Text of the notes file", fr: "Texte du fichier de notes" },
  pasteHint: {
    en: "A notes export is made with “Export notes” on the Notes page.",
    fr: `Une exportation de notes se crée avec «${NN}Exporter les notes${NN}» sur la page Notes.`,
  },
  openLabel: { en: "Or open the file from this device", fr: "Ou ouvrez le fichier depuis cet appareil" },
  read: { en: "Read the file", fr: "Lire le fichier" },
  clear: { en: "Remove the file and the dataset", fr: "Retirer le fichier et le jeu de données" },
  cleared: { en: "The page is empty. Nothing was saved.", fr: "La page est vide. Rien n’a été enregistré." },
  opened: { en: "The file is in the box. Choose Read the file when ready.", fr: "Le fichier est dans la zone. Choisissez Lire le fichier quand vous êtes prêt." },
  readFailed: { en: "That file could not be opened. Try pasting its text instead.", fr: "Ce fichier n’a pas pu être ouvert. Essayez plutôt de coller son texte." },
  errorsTitle: { en: "Fix this first", fr: "À corriger d’abord" },
  checksTitle: { en: "Before you publish", fr: "Avant de publier" },
  formTitle: { en: "The dataset", fr: "Le jeu de données" },
  titleLabel: { en: "Title of the dataset (optional)", fr: "Titre du jeu de données (facultatif)" },
  titleHint: { en: "For example the area and the season. It goes at the top of the text.", fr: "Par exemple le secteur et la saison. Il figure en haut du texte." },
  languageLegend: { en: "Language of the text", fr: "Langue du texte" },
  languages: {
    en: { en: "English", fr: "Anglais" },
    fr: { en: "French", fr: "Français" },
    both: { en: "English and French", fr: "Anglais et français" },
  },
  layoutLegend: { en: "Rows", fr: "Lignes" },
  layouts: {
    records: { en: "One row for each record", fr: "Une ligne par donnée" },
    places: { en: "One row for each place, with columns for each detail", fr: "Une ligne par lieu, avec des colonnes pour chaque détail" },
  },
  areaLabel: { en: "Only places whose address holds (optional)", fr: "Seulement les lieux dont l’adresse contient (facultatif)" },
  areaHint: {
    en: "For example a street, a town or the first three characters of a postal code. Leave empty for the whole file.",
    fr: "Par exemple une rue, une ville ou les trois premiers caractères d’un code postal. Laissez vide pour tout le fichier.",
  },
  licencesLegend: { en: "Licences to publish", fr: "Licences à publier" },
  licencesHint: {
    en: "Records under a licence you untick are left out, and the text says how many.",
    fr: "Les données sous une licence que vous décochez sont laissées de côté, et le texte en indique le nombre.",
  },
  withUnknown: {
    en: "Add a row, valued unknown, for each detail with no record",
    fr: "Ajouter une ligne, de valeur unknown, pour chaque détail sans donnée",
  },
  withNoteText: { en: "Add each note’s own text", fr: "Ajouter le texte propre à chaque note" },
  noteTextHint: {
    en: "A note’s own text can be personal. It is left out unless you tick this, and cannot be added while any of it looks like an email address or phone number. Rows for each place never hold it.",
    fr: "Le texte propre à une note peut être personnel. Il est laissé de côté sauf si vous cochez ceci, et ne peut pas être ajouté tant qu’une partie ressemble à une adresse courriel ou à un numéro de téléphone. Les lignes par lieu ne le contiennent jamais.",
  },
  prepare: { en: "Prepare the dataset", fr: "Préparer le jeu de données" },
  prepared: { en: "The dataset is ready.", fr: "Le jeu de données est prêt." },
  problems: {
    "title-long": { en: `Give a title of at most ${TITLE_MAX} characters.`, fr: `Indiquez un titre d’au plus ${TITLE_MAX}${NB}caractères.` },
    "title-control": { en: "Give the title on one line.", fr: "Indiquez le titre sur une seule ligne." },
    "area-long": { en: `Give at most ${FIRST_LIMITS.area} characters.`, fr: `Indiquez au plus ${FIRST_LIMITS.area}${NB}caractères.` },
    "no-licence": { en: "Tick at least one licence.", fr: "Cochez au moins une licence." },
    "personal-text": {
      en: "Some notes’ own text looks like it holds an email address or a phone number. Untick “Add each note’s own text”, or take those details out of the notes first.",
      fr: `Le texte propre de certaines notes semble contenir une adresse courriel ou un numéro de téléphone. Décochez «${NN}Ajouter le texte propre à chaque note${NN}», ou retirez d’abord ces renseignements des notes.`,
    },
  },
  resultsTitle: { en: "Dataset", fr: "Jeu de données" },
  downloadCsv: { en: "Download the dataset (CSV)", fr: "Télécharger le jeu de données (CSV)" },
  downloadText: { en: "Download the text that explains it", fr: "Télécharger le texte explicatif" },
  showText: { en: "Show the text", fr: "Afficher le texte" },
  keepTogether: {
    en: "Publish the two files together: the text says what the columns mean, which records are left out and which licences to credit.",
    fr: `Publiez les deux fichiers ensemble${NB}: le texte dit ce que veulent dire les colonnes, quelles données sont laissées de côté et quelles licences mentionner.`,
  },
  errors: {
    empty: { en: "The box is empty. Paste the file’s text or open it.", fr: "La zone est vide. Collez le texte du fichier ou ouvrez-le." },
    "too-large": { en: "The file is too large to read here.", fr: "Le fichier est trop volumineux pour être lu ici." },
    "not-json": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-format": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-version": { en: "This export comes from a different version and cannot be read.", fr: "Cette exportation provient d’une autre version et ne peut pas être lue." },
    "no-notes": { en: "This file has no note the App can read.", fr: "Ce fichier ne contient aucune note lisible par l’App." },
  },
} as const;

/** The text that goes with the dataset. Column names and values are the same in both languages, as in the CSV. */
export const README_TEXT = {
  made: { en: "Made on", fr: "Créé le" },
  untitled: { en: "Accessibility notes", fr: "Notes sur l’accessibilité" },
  what: {
    en: "Notes about the accessibility of places, recorded by people and from named sources, and exported from the App. Each row is one record: what one source said about one detail of one place, on one day.",
    fr: `Notes sur l’accessibilité de lieux, recueillies par des personnes et auprès de sources nommées, puis exportées de l’App. Chaque ligne est une donnée${NB}: ce qu’une source a dit d’un détail d’un lieu, un jour donné.`,
  },
  tier: {
    en: "No record has been reviewed. Every record is tier 0. A record says what its source reported on its date; it may be out of date or wrong.",
    fr: `Aucune donnée n’a été examinée. Chaque donnée est de niveau 0. Une donnée dit ce que sa source a rapporté à sa date${NN}; elle peut être dépassée ou fausse.`,
  },
  differ: {
    en: "Records about the same detail of the same place can disagree. They are all kept; none is chosen over another.",
    fr: `Des données sur le même détail du même lieu peuvent se contredire. Elles sont toutes gardées${NN}; aucune n’est préférée à une autre.`,
  },
  columnsTitle: { en: "Columns", fr: "Colonnes" },
  columns: {
    place_id: { en: "an id for the place, made from its name and address; the same name and address always give the same id", fr: `un identifiant du lieu, tiré de son nom et de son adresse${NN}; le même nom et la même adresse donnent toujours le même identifiant` },
    place_name: { en: "the place’s name, as recorded", fr: "le nom du lieu, tel que noté" },
    address: { en: "the place’s address, as recorded; empty when there is none", fr: `l’adresse du lieu, telle que notée${NN}; vide s’il n’y en a pas` },
    detail: { en: "the detail the record is about (see Details)", fr: "le détail visé par la donnée (voir Détails)" },
    value: { en: "yes or no, as the source reported; unknown means there is no record of this detail, not that it is missing", fr: `yes ou no, selon la source${NN}; unknown signifie qu’il n’y a aucune donnée sur ce détail, et non qu’il est absent` },
    source: { en: "who or what the record comes from, as recorded", fr: "la provenance de la donnée, telle que notée" },
    licence: { en: "the open licence the record is shared under", fr: "la licence ouverte sous laquelle la donnée est partagée" },
    recorded_on: { en: "the day the record was made, written like 2026-03-31", fr: "le jour où la donnée a été recueillie, écrit comme 2026-03-31" },
    tier: { en: "0 for every record: not reviewed; empty on unknown rows", fr: `0 pour chaque donnée${NB}: non examinée${NN}; vide sur les lignes unknown` },
    record_kind: { en: "person for a report by a person using the App (source “Contributor report”), named-source for any other source", fr: `person pour le rapport d’une personne utilisant l’App (source «${NN}Contributor report${NN}»), named-source pour toute autre source` },
    note_id: { en: "the note the record was saved in", fr: "la note où la donnée a été enregistrée" },
    note_text: { en: "the note’s own text, as written; only when chosen", fr: `le texte propre de la note, tel qu’écrit${NN}; seulement s’il a été choisi` },
  },
  placeColumns: {
    state: {
      en: "for each detail: yes or no when its records agree, differ when they do not, unknown when there is no record",
      fr: `pour chaque détail${NB}: yes ou no quand ses données concordent, differ quand elles divergent, unknown quand il n’y a aucune donnée`,
    },
    records: { en: "how many records the detail has", fr: "le nombre de données du détail" },
    newest: { en: "the day of the detail’s newest record; empty when there is none", fr: `le jour de la donnée la plus récente du détail${NN}; vide s’il n’y en a pas` },
  },
  placesNote: {
    en: "One row for each place. The records behind each detail are not listed one by one; their sources and licences are below.",
    fr: `Une ligne par lieu. Les données derrière chaque détail ne sont pas listées une à une${NN}; leurs sources et licences figurent ci-dessous.`,
  },
  areaLine: { en: "Only places whose address holds", fr: "Seulement les lieux dont l’adresse contient" },
  licenceLeft: { en: "under a licence not chosen", fr: "sous une licence non choisie" },
  detailsTitle: { en: "Details", fr: "Détails" },
  licencesTitle: { en: "Licences and sources to credit", fr: "Licences et sources à mentionner" },
  record: { en: "record", fr: "donnée" },
  records: { en: "records", fr: "données" },
  countsTitle: { en: "What is in the file", fr: "Contenu du fichier" },
  leftOutTitle: { en: "Left out", fr: "Laissé de côté" },
  futureLeft: {
    one: { en: "dated after the day the file was made", fr: "datée d’après le jour de création du fichier" },
    many: { en: "dated after the day the file was made", fr: "datées d’après le jour de création du fichier" },
  },
  noteTextLeft: { en: "the notes’ own text", fr: "le texte propre des notes" },
  nothingLeft: { en: "nothing", fr: "rien" },
} as const;

export function publishErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_PUBLISH_COPY.errors[e], l);
}

export function publishProblemText(p: PublishProblem, l: Locale): string {
  return t(FILE_PUBLISH_COPY.problems[p], l);
}

export function layoutText(x: Layout, l: Locale): string {
  return t(FILE_PUBLISH_COPY.layouts[x], l);
}

export function languageText(x: DictLanguage, l: Locale): string {
  return t(FILE_PUBLISH_COPY.languages[x], l);
}

const count = (n: number, one: string, many: string, l: Locale): string => `${n} ${(l === "fr" ? n > 1 : n !== 1) ? many : one}`;

/** What the checks found, one sentence each, for the page. */
export function checkLines(c: PublishChecks, l: Locale): string[] {
  const fr = l === "fr";
  const out = [
    fr
      ? `${count(c.places, "lieu", "lieux", l)}, ${count(c.notes, "note", "notes", l)}, ${count(c.records, "donnée Oui ou Non", "données Oui ou Non", l)}${c.oldest && c.newest ? ` du ${c.oldest} au ${c.newest}` : ""}.`
      : `${count(c.places, "place", "places", l)}, ${count(c.notes, "note", "notes", l)}, ${count(c.records, "Yes or No record", "Yes or No records", l)}${c.oldest && c.newest ? ` from ${c.oldest} to ${c.newest}` : ""}.`,
    fr ? `${count(c.unknown, "détail n’a", "détails n’ont", l)} aucune donnée.` : `${count(c.unknown, "detail has", "details have", l)} no record.`,
  ];
  if (c.future > 0)
    out.push(
      fr
        ? `${count(c.future, "donnée est datée", "données sont datées", l)} d’après aujourd’hui et ${c.future > 1 ? "seront laissées" : "sera laissée"} de côté.`
        : `${count(c.future, "record is", "records are", l)} dated after today and will be left out.`,
    );
  if (c.notesWithText > 0)
    out.push(fr ? `${count(c.notesWithText, "note a", "notes ont", l)} un texte propre.` : `${count(c.notesWithText, "note has its", "notes have their", l)} own text.`);
  if (c.personalNotes > 0)
    out.push(
      fr
        ? `Dans ${count(c.personalNotes, "note", "notes", l)}, ce texte semble contenir une adresse courriel ou un numéro de téléphone.`
        : `In ${count(c.personalNotes, "note", "notes", l)}, that text looks like it holds an email address or a phone number.`,
    );
  if (c.placesNoAddress > 0)
    out.push(fr ? `${count(c.placesNoAddress, "lieu n’a", "lieux n’ont", l)} pas d’adresse.` : `${count(c.placesNoAddress, "place has", "places have", l)} no address.`);
  return out;
}

/** What else goes in the text: records left out because of their licence, by licence. */
export interface ReadmeExtra {
  readonly licenceLeft: ReadonlyArray<{ readonly licence: string; readonly records: number }>;
}

/** The columns of the chosen layout, each with what it holds. */
function columnLines(o: PublishOptions, l: Locale): string[] {
  const R = README_TEXT;
  const k = l === "fr" ? `${NB}:` : ":";
  if (o.layout === "records") return datasetColumns(o).map((c) => `${c}${k} ${t(R.columns[c as keyof typeof R.columns], l)}`);
  return placeColumns().map((c) => {
    if (c === "place_id" || c === "place_name" || c === "address") return `${c}${k} ${t(R.columns[c], l)}`;
    if (c.endsWith("_records")) return `${c}${k} ${t(R.placeColumns.records, l)}`;
    if (c.endsWith("_newest")) return `${c}${k} ${t(R.placeColumns.newest, l)}`;
    return `${c}${k} ${t(R.placeColumns.state, l)}`;
  });
}

/** The text that explains the dataset, in one language. */
function readmeIn(rows: readonly DatasetRow[], checks: PublishChecks, licences: readonly LicenceRow[], o: PublishOptions, today: Date, l: Locale, extra: ReadmeExtra): string[] {
  const R = README_TEXT;
  const k = l === "fr" ? `${NB}:` : ":";
  const heading = (s: string): string[] => ["", s, "-".repeat(Math.min(s.length, 72))];
  const title = o.title.trim() === "" ? t(R.untitled, l) : o.title.trim();
  const lines = [title, "=".repeat(Math.min(title.length, 72)), `${t(R.made, l)} ${today.toISOString().slice(0, 10)}`];
  if (o.area.trim() !== "") lines.push(`${t(R.areaLine, l)}${k} ${o.area.trim()}`);
  lines.push("", t(R.what, l), "", t(R.tier, l), t(R.differ, l));
  if (o.layout === "places") lines.push("", t(R.placesNote, l));
  lines.push(...heading(t(R.columnsTitle, l)), ...columnLines(o, l));
  lines.push(...heading(t(R.detailsTitle, l)));
  for (const key of FACT_KEYS) lines.push(`${key}${k} ${COPY.facts[key].en} / ${COPY.facts[key].fr}`);
  lines.push(...heading(t(R.licencesTitle, l)));
  const records = (n: number): string => `${n} ${t(n === 1 || (l === "fr" && n === 0) ? R.record : R.records, l)}`;
  for (const row of licences) lines.push(`${row.licence}${k} ${records(row.records)} (${row.oldest} – ${row.newest})`, ...row.sources.map((s) => `  - ${s}`));
  lines.push(...heading(t(R.countsTitle, l)));
  lines.push(...checkLines({ ...checks, personalNotes: 0, notesWithText: 0, future: 0 }, l));
  const bySource = sourceCounts(rows);
  if (bySource.length > 0) lines.push(...bySource.map((s) => `  - ${s.source}${k} ${s.records}`));
  lines.push(...heading(t(R.leftOutTitle, l)));
  const left = [
    ...(checks.future > 0 ? [`${records(checks.future)} ${t(checks.future === 1 ? R.futureLeft.one : R.futureLeft.many, l)}`] : []),
    ...extra.licenceLeft.map((x) => `${records(x.records)} ${t(R.licenceLeft, l)} (${x.licence})`),
    ...((!o.withNoteText || o.layout === "places") && checks.notesWithText > 0 ? [t(R.noteTextLeft, l)] : []),
  ];
  lines.push(...(left.length > 0 ? left.map((x) => `  - ${x}`) : [t(R.nothingLeft, l)]));
  return lines;
}

/** The text in the chosen language, or both one after the other. */
export function readmeText(rows: readonly DatasetRow[], checks: PublishChecks, licences: readonly LicenceRow[], o: PublishOptions, today: Date, extra: ReadmeExtra = { licenceLeft: [] }): string {
  const parts = o.language === "both" ? (["en", "fr"] as const) : ([o.language] as const);
  return `${parts.map((l) => readmeIn(rows, checks, licences, o, today, l, extra).join("\n")).join(`\n\n${"=".repeat(60)}\n\n`)}\n`;
}

export function publishFilename(kind: "csv" | "text", today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  if (kind === "csv") return l === "fr" ? `jeu-de-donnees-accessibilite-${day}.csv` : `accessibility-dataset-${day}.csv`;
  return l === "fr" ? `jeu-de-donnees-accessibilite-${day}-lisez-moi.txt` : `accessibility-dataset-${day}-readme.txt`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function filePublishStrings(): Array<[string, Pair]> {
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
  walk("filePublish", FILE_PUBLISH_COPY);
  walk("readme", README_TEXT);
  return out;
}

