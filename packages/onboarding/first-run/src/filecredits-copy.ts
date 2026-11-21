import type { Locale } from "../../switch-first/src/index";
import { NB, NN, t, type Pair } from "./copy";
import type { Copy, Credits, CreditSource, Excluded } from "./credits";
import type { ImportError } from "./exchange";
import { sourceName } from "./sources";

/**
 * Words for "Credits for sharing a notes file", in English and French. French
 * copy uses ’, U+00A0 before ":" and U+202F before ; ! ? and inside « ».
 */
export const FILE_CREDITS_COPY = {
  title: { en: "Credits for sharing a notes file", fr: "Mentions des sources pour partager un fichier de notes" },
  intro: {
    en: "Before you share a notes file, or something you made from it, see every source in it with its licence, so you can credit them. You can also make a copy without the licences you choose.",
    fr: "Avant de partager un fichier de notes, ou ce que vous en avez tiré, voyez chaque source qu’il contient avec sa licence, pour pouvoir la mentionner. Vous pouvez aussi faire une copie sans les licences de votre choix.",
  },
  privacy: {
    en: "Nothing is looked up, nothing is saved and nothing is sent anywhere.",
    fr: "Rien n’est recherché, enregistré ni envoyé.",
  },
  notAdvice: {
    en: "The lines under each licence are a short summary, not legal advice. The licence text is what counts.",
    fr: "Les lignes sous chaque licence sont un court résumé, pas un avis juridique. C’est le texte de la licence qui compte.",
  },
  pasteLabel: { en: "Text of the notes file", fr: "Texte du fichier de notes" },
  pasteHint: {
    en: "A notes export is made with “Export notes” on the Notes page.",
    fr: `Une exportation de notes se crée avec «${NN}Exporter les notes${NN}» sur la page Notes.`,
  },
  openLabel: { en: "Or open the file from this device", fr: "Ou ouvrez le fichier depuis cet appareil" },
  read: { en: "Show the credits", fr: "Afficher les mentions" },
  clear: { en: "Remove the file and the credits", fr: "Retirer le fichier et les mentions" },
  cleared: { en: "The page is empty. Nothing was saved.", fr: "La page est vide. Rien n’a été enregistré." },
  opened: { en: "The file is in the box. Choose Show the credits when ready.", fr: "Le fichier est dans la zone. Choisissez Afficher les mentions quand vous êtes prêt." },
  readFailed: { en: "That file could not be opened. Try pasting its text instead.", fr: "Ce fichier n’a pas pu être ouvert. Essayez plutôt de coller son texte." },
  errorsTitle: { en: "Fix this first", fr: "À corriger d’abord" },
  licencesTitle: { en: "Licences in this file", fr: "Licences de ce fichier" },
  partTitle: { en: "Credits for part of the file", fr: "Mentions pour une partie du fichier" },
  areaLabel: { en: "Only places whose address holds (optional)", fr: "Seulement les lieux dont l’adresse contient (facultatif)" },
  areaHint: {
    en: "For example King St or M5H, when you share only part of the file. Case and accents do not matter. The copy below holds only these places too.",
    fr: "Par exemple rue Principale ou M5H, si vous ne partagez qu’une partie du fichier. Les majuscules et les accents ne comptent pas. La copie ci-dessous ne contient alors que ces lieux.",
  },
  areaTooLong: { en: "Give at most 60 characters.", fr: "Indiquez au plus 60 caractères." },
  areaNone: { en: "No place’s address holds this text. Change it or leave it empty.", fr: "Aucune adresse de lieu ne contient ce texte. Modifiez-le ou laissez-le vide." },
  updateCredits: { en: "Update the credits", fr: "Mettre les mentions à jour" },
  licenceText: { en: "Licence text", fr: "Texte de la licence" },
  noRecords: { en: "No record carries this licence; only notes do.", fr: "Aucune donnée ne porte cette licence, seules des notes la portent." },
  summaries: {
    "CC0-1.0": {
      en: "No conditions: the rights are given up as far as the law allows. Credit is welcome but not required.",
      fr: `Aucune condition${NB}: les droits sont abandonnés autant que la loi le permet. La mention est bienvenue, mais pas exigée.`,
    },
    "CC-BY-4.0": {
      en: "Give credit to the source, link to the licence and say if you made changes.",
      fr: "Mentionnez la source, donnez un lien vers la licence et indiquez si vous avez fait des changements.",
    },
    "CC-BY-SA-4.0": {
      en: "Give credit, link to the licence, say if you made changes, and share what you adapt under the same licence.",
      fr: "Mentionnez la source, donnez un lien vers la licence, indiquez vos changements et partagez ce que vous adaptez sous la même licence.",
    },
    "ODbL-1.0": {
      en: "Give credit, keep the database open, and share a changed database under the same licence.",
      fr: "Mentionnez la source, gardez la base de données ouverte et partagez une base modifiée sous la même licence.",
    },
    "ODC-By-1.0": {
      en: "Give credit to the source of the database.",
      fr: "Mentionnez la source de la base de données.",
    },
    "OGL-Canada-2.0": {
      en: "Give credit with the attribution statement the provider asks for, and link to the licence.",
      fr: "Mentionnez la source avec la formule d’attribution demandée par le fournisseur et donnez un lien vers la licence.",
    },
  },
  shareTitle: { en: "Make a copy to share", fr: "Faire une copie à partager" },
  leaveOutLegend: { en: "Leave these licences out of a copy", fr: "Laisser ces licences hors d’une copie" },
  variantsLegend: { en: "Sources written more than one way", fr: "Sources écrites de plusieurs façons" },
  variantsHint: {
    en: "These spellings differ only by case, accents, spaces or punctuation. They may be one source. For the copy, you can write each group one way, or leave it as it is. The App does not decide they are one source.",
    fr: "Ces graphies ne diffèrent que par les majuscules, les accents, les espaces ou la ponctuation. Il s’agit peut-être d’une seule source. Pour la copie, vous pouvez écrire chaque groupe d’une seule façon, ou le laisser tel quel. L’App ne décide pas qu’il s’agit d’une seule source.",
  },
  writeAs: { en: "Write as one", fr: "Écrire d’une seule façon" },
  keepAsIs: { en: "Leave as they are", fr: "Laisser tel quel" },
  leaveOutHint: {
    en: "A record under a licence you leave out is not in the copy, so that detail has no record there. A note whose own licence you leave out is not in the copy at all. Your file does not change.",
    fr: `Une donnée sous une licence laissée de côté n’est pas dans la copie${NB}: ce détail n’y a donc aucune donnée. Une note dont la propre licence est laissée de côté n’est pas du tout dans la copie. Votre fichier ne change pas.`,
  },
  makeCopy: { en: "Make the copy", fr: "Faire la copie" },
  noneChosen: {
    en: "Choose at least one licence to leave out, or one way to write a source.",
    fr: "Choisissez au moins une licence à laisser de côté, ou une façon d’écrire une source.",
  },
  nothingLeft: {
    en: "With these licences left out, no note is left. Choose fewer licences.",
    fr: "Sans ces licences, il ne reste aucune note. Choisissez moins de licences.",
  },
  copyTitle: { en: "Copy without some licences", fr: "Copie sans certaines licences" },
  downloadCopy: { en: "Download the copy", fr: "Télécharger la copie" },
  downloadText: { en: "Download the credits as text", fr: "Télécharger les mentions en texte" },
  downloadCsv: { en: "Download the credits as a spreadsheet (CSV)", fr: "Télécharger les mentions en tableur (CSV)" },
  downloadMarkdown: { en: "Download the credits as Markdown, for a README or a post", fr: "Télécharger les mentions en Markdown, pour un fichier README ou une publication" },
  downloadRecords: { en: "Download every record with its source (CSV)", fr: "Télécharger chaque donnée avec sa source (CSV)" },
  recordsHint: {
    en: "One row for each Yes or No, with its place, source, licence and date, for credits that must say what came from where.",
    fr: "Une ligne pour chaque Oui ou Non, avec son lieu, sa source, sa licence et sa date, pour les mentions qui doivent dire d’où vient chaque donnée.",
  },
  textHint: {
    en: "Paste the text where you share the file, for example under a post or in a README.",
    fr: "Collez le texte là où vous partagez le fichier, par exemple sous une publication ou dans un fichier README.",
  },
  made: { en: "The copy is ready.", fr: "La copie est prête." },
  printMade: { en: "Made on", fr: "Créé le" },
  errors: {
    empty: { en: "The box is empty. Paste the file’s text or open it.", fr: "La zone est vide. Collez le texte du fichier ou ouvrez-le." },
    "too-large": { en: "The file is too large to read here.", fr: "Le fichier est trop volumineux pour être lu ici." },
    "not-json": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-format": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-version": { en: "This export comes from a different version and cannot be read.", fr: "Cette exportation provient d’une autre version et ne peut pas être lue." },
    "no-notes": { en: "This file has no note the App can read.", fr: "Ce fichier ne contient aucune note lisible par l’App." },
  },
} as const;

/** The licences' own names and the pages of their texts. These are the licences the App accepts. */
export const LICENCE_INFO: Readonly<Record<string, { readonly name: string; readonly url: string }>> = {
  "CC0-1.0": { name: "Creative Commons CC0 1.0", url: "https://creativecommons.org/publicdomain/zero/1.0/" },
  "CC-BY-4.0": { name: "Creative Commons Attribution 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
  "CC-BY-SA-4.0": { name: "Creative Commons Attribution-ShareAlike 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" },
  "ODbL-1.0": { name: "Open Database License 1.0", url: "https://opendatacommons.org/licenses/odbl/1-0/" },
  "ODC-By-1.0": { name: "Open Data Commons Attribution License 1.0", url: "https://opendatacommons.org/licenses/by/1-0/" },
  "OGL-Canada-2.0": { name: "Open Government Licence – Canada 2.0", url: "https://open.canada.ca/en/open-government-licence-canada" },
};

export function creditsErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_CREDITS_COPY.errors[e], l);
}

/** The short summary of a licence, or nothing for a licence the App does not know. */
export function licenceSummary(licence: string, l: Locale): string | undefined {
  const s = (FILE_CREDITS_COPY.summaries as Readonly<Record<string, Pair>>)[licence];
  return s ? t(s, l) : undefined;
}

/** "CC-BY-4.0 (Creative Commons Attribution 4.0)". */
export function licenceTitle(licence: string): string {
  const info = LICENCE_INFO[licence];
  return info ? `${licence} (${info.name})` : licence;
}

const count = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;
const countFr = (n: number, one: string, many: string): string => `${n} ${n > 1 ? many : one}`;

/** "12 records, 2025-03-01 to 2026-10-01": what a source gave under one licence. */
export function sourceCountText(s: CreditSource, l: Locale): string {
  const range = s.oldest === s.newest ? s.oldest : l === "fr" ? `du ${s.oldest} au ${s.newest}` : `${s.oldest} to ${s.newest}`;
  return l === "fr" ? `${countFr(s.records, "donnée", "données")}, ${range}` : `${count(s.records, "record", "records")}, ${range}`;
}

/** "City open data: 12 records, 2025-03-01 to 2026-10-01". */
export function sourceLine(s: CreditSource, l: Locale): string {
  return `${sourceName(s.source, l)}${l === "fr" ? NB : ""}: ${sourceCountText(s, l)}`;
}

/** "2 notes the App cannot read are not in the credits." */
export function leftOutText(n: number, l: Locale): string {
  if (l === "fr") return n === 1 ? "1 note que l’App ne peut pas lire n’est pas dans les mentions." : `${n} notes que l’App ne peut pas lire ne sont pas dans les mentions.`;
  return n === 1 ? "1 note the App cannot read is not in the credits." : `${n} notes the App cannot read are not in the credits.`;
}

/** "5 places whose address does not hold “King” are not in the credits." */
export function outsideAreaText(n: number, area: string, l: Locale): string {
  if (l === "fr")
    return n === 1
      ? `1 lieu dont l’adresse ne contient pas «${NN}${area}${NN}» n’est pas dans les mentions.`
      : `${n} lieux dont l’adresse ne contient pas «${NN}${area}${NN}» ne sont pas dans les mentions.`;
  return n === 1 ? `1 place whose address does not hold “${area}” is not in the credits.` : `${n} places whose address does not hold “${area}” are not in the credits.`;
}

/** "42 records from 5 sources under 3 licences, in 20 notes." */
export function creditsSummary(c: Credits, l: Locale): string {
  const n = c.licences.length;
  if (l === "fr")
    return `${countFr(c.records, "donnée", "données")} de ${countFr(c.sources, "source", "sources")} sous ${countFr(n, "licence", "licences")}, dans ${countFr(c.notes, "note", "notes")}.`;
  return `${count(c.records, "record", "records")} from ${count(c.sources, "source", "sources")} under ${count(n, "licence", "licences")}, in ${count(c.notes, "note", "notes")}.`;
}

/** "The copy has 30 records in 18 notes. 12 records and 2 notes are left out." plus sources written the chosen way. */
export function excludedSummary(e: Excluded | Copy, l: Locale): string {
  const renamed = "renamed" in e ? e.renamed : 0;
  const base = excludedBase(e, l);
  if (renamed === 0) return base;
  if (l === "fr")
    return renamed === 1 ? `${base} 1 donnée a sa source écrite de la façon choisie.` : `${base} ${renamed} données ont leur source écrite de la façon choisie.`;
  return renamed === 1 ? `${base} 1 record has its source written the way you chose.` : `${base} ${renamed} records have their source written the way you chose.`;
}

function excludedBase(e: Excluded, l: Locale): string {
  if (l === "fr")
    return `La copie compte ${countFr(e.keptRecords, "donnée", "données")} dans ${countFr(e.notes.length, "note", "notes")}. ${countFr(e.droppedRecords, "donnée", "données")} et ${countFr(e.droppedNotes, "note", "notes")} sont laissées de côté.`;
  return `The copy has ${count(e.keptRecords, "record", "records")} in ${count(e.notes.length, "note", "notes")}. ${count(e.droppedRecords, "record", "records")} and ${count(e.droppedNotes, "note", "notes")} are left out.`;
}

/**
 * The credits as text to paste where the file is shared: each licence with
 * its name, the page of its text and its sources.
 */
export function creditsText(c: Credits, l: Locale, today: Date): string {
  const lines: string[] = [t(FILE_CREDITS_COPY.title, l), `${t(FILE_CREDITS_COPY.printMade, l)} ${today.toISOString().slice(0, 10)}`, creditsSummary(c, l), ""];
  for (const lic of c.licences) {
    lines.push(licenceTitle(lic.licence));
    const url = LICENCE_INFO[lic.licence]?.url;
    if (url) lines.push(`  ${url}`);
    if (lic.sources.length === 0) lines.push(`  ${t(FILE_CREDITS_COPY.noRecords, l)}`);
    for (const s of lic.sources) lines.push(`  - ${sourceLine(s, l)}`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

/**
 * Escapes text for Markdown so a source's name is shown as written, never read
 * as emphasis, code, a link, an image, a table cell or HTML. Characters that
 * only matter at the start of a line (- + . digits) are left alone: every line
 * the App writes starts with its own marker.
 */
export function mdEscape(s: string): string {
  return s.replace(/[\\`*_{}[\]<>#|~!]/g, (c) => `\\${c}`);
}

/**
 * The credits as Markdown: a heading, the summary, and for each licence a
 * linked name and a list of its sources. Sources' names are escaped.
 */
export function creditsMarkdown(c: Credits, l: Locale, today: Date): string {
  const lines: string[] = [`## ${mdEscape(t(FILE_CREDITS_COPY.title, l))}`, "", mdEscape(creditsSummary(c, l)), ""];
  for (const lic of c.licences) {
    const info = LICENCE_INFO[lic.licence];
    lines.push(info ? `### [${mdEscape(licenceTitle(lic.licence))}](${info.url})` : `### ${mdEscape(lic.licence)}`, "");
    if (lic.sources.length === 0) lines.push(mdEscape(t(FILE_CREDITS_COPY.noRecords, l)));
    for (const s of lic.sources) lines.push(`- ${mdEscape(sourceName(s.source, l))}${l === "fr" ? NB : ""}: ${mdEscape(sourceCountText(s, l))}`);
    lines.push("");
  }
  lines.push(`_${mdEscape(`${t(FILE_CREDITS_COPY.printMade, l)} ${today.toISOString().slice(0, 10)}`)}_`);
  return `${lines.join("\n")}\n`;
}

export function creditsFilename(kind: "text" | "csv" | "copy" | "markdown" | "records", today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  if (kind === "markdown") return l === "fr" ? `mentions-${day}.md` : `credits-${day}.md`;
  if (kind === "records") return l === "fr" ? `donnees-et-sources-${day}.csv` : `records-and-sources-${day}.csv`;
  if (kind === "csv") return l === "fr" ? `mentions-${day}.csv` : `credits-${day}.csv`;
  if (kind === "text") return l === "fr" ? `mentions-${day}.txt` : `credits-${day}.txt`;
  return l === "fr" ? `notes-copie-${day}.json` : `notes-copy-${day}.json`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileCreditsStrings(): Array<[string, Pair]> {
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
  walk("fileCredits", FILE_CREDITS_COPY);
  return out;
}
