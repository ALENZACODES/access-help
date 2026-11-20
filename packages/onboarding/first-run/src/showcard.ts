import type { Locale } from "../../switch-first/src/index";
import { t, type Pair } from "./copy";
import type { FactKey } from "./facts";
import { esc } from "./html";
import { otherLocale } from "./locale";
import { PASSPORT_COPY, passportLines, type Passport } from "./passport";
import { QUESTIONS } from "./plan";

/**
 * Showing the access card to staff on a phone: the saved card in large type,
 * in the person's language and, if they choose, the other official language
 * too, so staff who read either can follow. The person's own words are shown
 * as typed in both, never translated, and marked with the language they were
 * written in. Under the card, the questions the App already uses for each
 * detail the person needs, so staff can answer them on the spot.
 *
 * Nothing here is sent anywhere; it is the same card, laid out to be read
 * across a counter.
 */
export type ShowSize = "large" | "larger" | "largest";
export const SHOW_SIZES: readonly ShowSize[] = ["large", "larger", "largest"];
/** Font size of each step, as a percentage of the page's text size. */
export const SHOW_SCALE: Readonly<Record<ShowSize, number>> = { large: 150, larger: 200, largest: 275 };

export interface ShowOptions {
  readonly size: ShowSize;
  /** Also show the card in the other language. */
  readonly both: boolean;
  /** Also show the questions for each need. */
  readonly questions: boolean;
}

export const DEFAULT_SHOW: ShowOptions = { size: "larger", both: false, questions: true };

export const SHOW_COPY = {
  open: { en: "Show my card to staff", fr: "Montrer ma fiche au personnel" },
  title: { en: "Show to staff", fr: "Montrer au personnel" },
  intro: {
    en: "Hold your phone up so staff can read the card. Nothing is sent.",
    fr: "Tenez votre téléphone pour que le personnel puisse lire la fiche. Rien n’est envoyé.",
  },
  sizeLegend: { en: "Text size", fr: "Taille du texte" },
  both: { en: "Also show it in French", fr: "La montrer aussi en anglais" },
  questions: { en: "Show the questions for what I need", fr: "Montrer les questions sur ce dont j’ai besoin" },
  questionsTitle: { en: "Could you tell me:", fr: "Pourriez-vous me dire\u00A0:" },
  ownWords: { en: "In my own words", fr: "Dans mes mots" },
  nothing: {
    en: "There is no saved access card yet. Make one first.",
    fr: "Aucune fiche d’accès n’est encore enregistrée. Créez-en une d’abord.",
  },
  done: { en: "Done showing", fr: "Fin de l’affichage" },
  bilingualDownload: { en: "Download in English and French", fr: "Télécharger en anglais et en français" },
} as const satisfies Record<string, Pair>;

export const SIZE_LABEL: Readonly<Record<ShowSize, Pair>> = {
  large: { en: "Large", fr: "Grande" },
  larger: { en: "Larger", fr: "Plus grande" },
  largest: { en: "Largest", fr: "La plus grande" },
};

export function isShowSize(v: string | undefined): v is ShowSize {
  return v !== undefined && (SHOW_SIZES as readonly string[]).includes(v);
}

/** The questions for each need, in the App's order, in one language. */
export function needQuestions(needs: readonly FactKey[], l: Locale): string[] {
  return needs.map((k) => QUESTIONS[k][l]);
}

/**
 * One language's block. In the other language, the person's own words keep the
 * language they wrote them in, so a screen reader reads them correctly.
 */
export function showBlockHtml(p: Passport, l: Locale, ownLocale: Locale, withQuestions: boolean): string {
  const lines = passportLines({ ...p, helps: "" }, l);
  const helps = p.helps.trim();
  const items = lines.map((x) => `<li>${esc(x)}</li>`).join("");
  const own =
    helps === ""
      ? ""
      : `<li>${esc(t(SHOW_COPY.ownWords, l))}${l === "fr" ? "\u00A0:" : ":"} <span data-user-content lang="${ownLocale}">${esc(helps)}</span></li>`;
  const qs = withQuestions ? needQuestions(p.needs, l) : [];
  const questions =
    qs.length === 0
      ? ""
      : `<h4 id="show-q-${l}">${esc(t(SHOW_COPY.questionsTitle, l))}</h4><ul aria-labelledby="show-q-${l}">${qs.map((q) => `<li>${esc(q)}</li>`).join("")}</ul>`;
  return (
    `<section class="show-block" lang="${l}" aria-labelledby="show-title-${l}">` +
    `<h3 id="show-title-${l}">${esc(t(PASSPORT_COPY.cardTitle, l))}</h3>` +
    `<ul>${items}${own}</ul>` +
    questions +
    `</section>`
  );
}

/** The card in the person's language first, then the other if asked. */
export function showHtml(p: Passport, l: Locale, o: ShowOptions): string {
  const blocks = [showBlockHtml(p, l, l, o.questions)];
  if (o.both) blocks.push(showBlockHtml(p, otherLocale(l), l, o.questions));
  return `<div class="show-card show-${o.size}" style="font-size:${SHOW_SCALE[o.size]}%">${blocks.join("")}</div>`;
}

function textBlock(p: Passport, l: Locale): string[] {
  const title = t(PASSPORT_COPY.cardTitle, l);
  const helps = p.helps.trim();
  return [
    title,
    "=".repeat(title.length),
    "",
    ...passportLines({ ...p, helps: "" }, l),
    ...(helps === "" ? [] : [`${t(SHOW_COPY.ownWords, l)}${l === "fr" ? "\u00A0:" : ":"} ${helps}`]),
    ...(p.needs.length === 0 ? [] : ["", t(SHOW_COPY.questionsTitle, l), ...needQuestions(p.needs, l).map((q) => `- ${q}`)]),
  ];
}

/** Both languages in one text file: the person's language first. */
export function bilingualText(p: Passport, l: Locale): string {
  return `${[...textBlock(p, l), "", "", ...textBlock(p, otherLocale(l)), "", `${t(PASSPORT_COPY.updated, l)} ${p.updatedOn}.`].join("\n")}\n`;
}

export function bilingualFilename(l: Locale): string {
  return l === "fr" ? "fiche-acces-fr-en.txt" : "access-card-en-fr.txt";
}

export function showStrings(): Array<[string, Pair]> {
  return [
    ...Object.entries(SHOW_COPY).map(([k, p]) => [`show.${k}`, p] as [string, Pair]),
    ...SHOW_SIZES.map((s) => [`show.size.${s}`, SIZE_LABEL[s]] as [string, Pair]),
  ];
}

