import type { Locale } from "../../switch-first/src/index";
import { NB, t, type Pair } from "./copy";
import { FACT_KEYS, type FactKey } from "./facts";
import type { Place } from "./places";
import { placeQuestionKeys } from "./placequestions";
import { QUESTIONS } from "./plan";

/**
 * Asking a place in writing. From a place in the notes, the App drafts a short,
 * polite message about the details chosen (by default the ones that are UNKNOWN
 * or whose reports differ). The message can be written in English or French,
 * whatever language the App is in, because the place may answer in either.
 *
 * The App sends nothing and keeps no address: "Open in your email app" opens
 * the person's own mail program with the subject and text filled in, and the
 * person chooses who it goes to. The message asks only about the place, never
 * about the person, and invites the place to say when it does not know.
 */
export const ASK_COPY = {
  title: { en: "Ask this place in writing", fr: "Écrire à ce lieu" },
  open: { en: "Ask this place in writing", fr: "Écrire à ce lieu pour poser des questions" },
  intro: {
    en: "The App drafts a short message about the details you choose. You send it yourself, by email or any other way.",
    fr: "L’App rédige un court message sur les détails choisis. Vous l’envoyez vous-même, par courriel ou autrement.",
  },
  sendsNothing: {
    en: "The App sends nothing and keeps no address. Your own email app opens and you choose who the message goes to.",
    fr: "L’App n’envoie rien et ne garde aucune adresse. Votre propre application de courriel s’ouvre et vous choisissez le destinataire.",
  },
  whatTitle: { en: "What to ask about", fr: "Sur quoi poser des questions" },
  whatHint: {
    en: "Details with no record or with reports that differ are chosen to start with.",
    fr: "Les détails sans donnée ou dont les rapports divergent sont choisis au départ.",
  },
  languageTitle: { en: "Language of the message", fr: "Langue du message" },
  messageTitle: { en: "The message", fr: "Le message" },
  subjectLabel: { en: "Subject", fr: "Objet" },
  textLabel: { en: "Message to copy", fr: "Message à copier" },
  noneChosen: { en: "Choose at least one detail to ask about.", fr: "Choisissez au moins un détail à demander." },
  email: { en: "Open in your email app", fr: "Ouvrir dans votre application de courriel" },
  download: { en: "Download the message as text", fr: "Télécharger le message en texte" },
  select: { en: "Select the message to copy", fr: "Sélectionner le message pour le copier" },
  replyTitle: { en: "When the place replies", fr: "Quand le lieu répond" },
  replyIntro: {
    en: "Paste the reply into the reader. It lists the sentences about each detail, and you choose the answers.",
    fr: "Collez la réponse dans le lecteur. Il énumère les phrases sur chaque détail, et vous choisissez les réponses.",
  },
  readReply: { en: "Read the place’s reply", fr: "Lire la réponse du lieu" },
  back: { en: "Back to the place", fr: "Retour au lieu" },
  statusUnknown: { en: "UNKNOWN, no record", fr: "UNKNOWN, aucune donnée" },
  statusDiffer: { en: "Reports differ", fr: "Les rapports divergent" },
  statusAgree: { en: "Reports agree", fr: "Les rapports concordent" },
} as const satisfies Record<string, Pair>;

/** The fixed wording of the message itself, per language of the message. */
export const LETTER = {
  en: {
    subject: (place: string) => `Accessibility questions about ${place}`,
    hello: "Hello,",
    visit: (place: string) => `I am planning a visit to ${place} and would like to know about access before I come.`,
    dontKnow: "If you do not know the answer to a question, please say so. That helps too.",
    thanks: "Thank you,",
  },
  fr: {
    subject: (place: string) => `Questions sur l’accessibilité${NB}: ${place}`,
    hello: "Bonjour,",
    visit: (place: string) => `Je prévois une visite à ${place} et j’aimerais en savoir plus sur l’accès avant de venir.`,
    dontKnow: "Si vous ne connaissez pas la réponse à une question, dites-le simplement. Cela m’aide aussi.",
    thanks: "Merci,",
  },
} as const;

/** The details chosen to start with: no record or reports that differ, or every detail when all are agreed. */
export function defaultAskKeys(place: Place): FactKey[] {
  const open = placeQuestionKeys(place);
  return open.length > 0 ? open : [...FACT_KEYS];
}

/** Adds or removes one detail, keeping the App's order. */
export function toggleAskKey(keys: readonly FactKey[], key: FactKey, on: boolean): FactKey[] {
  const set = new Set(keys);
  if (on) set.add(key);
  else set.delete(key);
  return FACT_KEYS.filter((k) => set.has(k));
}

export interface Letter {
  readonly locale: Locale;
  readonly subject: string;
  readonly body: string;
}

/** The name the message uses: the place name, with its address when there is one. */
export function placeLine(place: Pick<Place, "name" | "address">): string {
  return place.address ? `${place.name} (${place.address})` : place.name;
}

/** The message for a place and the chosen details, in the language asked for. Undefined when nothing is chosen. */
export function buildLetter(place: Pick<Place, "name" | "address">, keys: readonly FactKey[], letterLocale: Locale): Letter | undefined {
  const asked = FACT_KEYS.filter((k) => keys.includes(k));
  if (asked.length === 0) return undefined;
  const w = LETTER[letterLocale];
  const lines = [w.hello, "", w.visit(placeLine(place)), "", ...asked.map((k, i) => `${i + 1}. ${QUESTIONS[k][letterLocale]}`), "", w.dontKnow, "", w.thanks];
  return { locale: letterLocale, subject: w.subject(place.name), body: lines.join("\n") };
}

/** The full text for the file: subject line, a blank line, then the message. */
export function letterText(letter: Letter): string {
  const label = letter.locale === "fr" ? `Objet${NB}:` : "Subject:";
  return `${label} ${letter.subject}\n\n${letter.body}\n`;
}

/**
 * A mailto: address with no recipient, so the person's own email app opens with
 * the subject and text filled in. Line breaks are CRLF, as mailto asks.
 */
export function mailtoHref(letter: Letter): string {
  const enc = (s: string): string => encodeURIComponent(s.replace(/\r?\n/g, "\r\n"));
  return `mailto:?subject=${enc(letter.subject)}&body=${enc(letter.body)}`;
}

/** Reads a mailto: address made by `mailtoHref` back into subject and text. Undefined for anything else. */
export function parseMailto(href: string): { subject: string; body: string } | undefined {
  const m = /^mailto:\?subject=([^&]*)&body=(.*)$/.exec(href);
  if (!m) return undefined;
  try {
    return { subject: decodeURIComponent(m[1] ?? ""), body: decodeURIComponent(m[2] ?? "").replace(/\r\n/g, "\n") };
  } catch {
    return undefined;
  }
}

/** "message-<place id>-<letter language>.txt". */
export function letterFilename(place: Pick<Place, "id">, letterLocale: Locale): string {
  return `message-${place.id}-${letterLocale}.txt`;
}

/** How a detail stands in the notes, for the list of choices. */
export function askStatus(place: Place, key: FactKey, l: Locale): string {
  const kind = place.resolutions[key].kind;
  return t(kind === "unknown" ? ASK_COPY.statusUnknown : kind === "differ" ? ASK_COPY.statusDiffer : ASK_COPY.statusAgree, l);
}

export function askStrings(): Array<[string, Pair]> {
  return Object.entries(ASK_COPY).map(([k, p]): [string, Pair] => [`ask.${k}`, p]);
}
