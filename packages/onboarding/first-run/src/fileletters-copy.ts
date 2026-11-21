import type { Locale } from "../../switch-first/src/index";
import { NB, NN, t, type Pair } from "./copy";
import type { ImportError } from "./exchange";
import type { FactKey } from "./facts";
import { FOLLOW_UP_DAYS, trackTotal, type TrackFileError, type TrackProblem, type Tracking, type Waiting } from "./lettertrack";
import { MAX_LETTERS, oneLine, type Ask, type AskReason, type Letter, type LetterLanguage, type LetterOptions, type LetterProblem, type LetterSet } from "./letters";

/**
 * Words for "Letters to places", in English and French. French copy uses ’,
 * U+00A0 before ":" and U+202F before ; ! ? and inside « ». The letters are
 * signed by the person; they never say they come from or are backed by
 * anyone else.
 */
export const FILE_LETTERS_COPY = {
  title: { en: "Letters to places", fr: "Lettres aux lieux" },
  intro: {
    en: "Write to the places in a notes export about the details that have no record, or whose reports differ. Each letter asks only about that place, with a reply section to fill in.",
    fr: "Écrivez aux lieux d’une exportation de notes au sujet des détails sans donnée ou aux rapports divergents. Chaque lettre ne porte que sur ce lieu et comprend une partie réponse à remplir.",
  },
  privacy: {
    en: "The letters hold the name and contact you type. Nothing is saved and nothing is sent: you print, mail or email the letters yourself.",
    fr: `Les lettres contiennent le nom et les coordonnées que vous tapez. Rien n’est enregistré ni envoyé${NB}: vous imprimez, postez ou envoyez vous-même les lettres.`,
  },
  recordsNothing: {
    en: "A letter records nothing. When a place replies, add what it says with Record what you found on a round, giving the reply as the source and its date.",
    fr: "Une lettre n’enregistre rien. Quand un lieu répond, ajoutez sa réponse avec Noter ce que vous avez constaté lors d’une tournée, en indiquant la réponse comme source et sa date.",
  },
  pasteLabel: { en: "Text of the notes file", fr: "Texte du fichier de notes" },
  pasteHint: {
    en: "A notes export is made with “Export notes” on the Notes page.",
    fr: `Une exportation de notes se crée avec «${NN}Exporter les notes${NN}» sur la page Notes.`,
  },
  openLabel: { en: "Or open the file from this device", fr: "Ou ouvrez le fichier depuis cet appareil" },
  read: { en: "Read the file", fr: "Lire le fichier" },
  clear: { en: "Remove the file and the letters", fr: "Retirer le fichier et les lettres" },
  cleared: { en: "The page is empty. Nothing was saved.", fr: "La page est vide. Rien n’a été enregistré." },
  opened: { en: "The file is in the box. Choose Read the file when ready.", fr: "Le fichier est dans la zone. Choisissez Lire le fichier quand vous êtes prêt." },
  readFailed: { en: "That file could not be opened. Try pasting its text instead.", fr: "Ce fichier n’a pas pu être ouvert. Essayez plutôt de coller son texte." },
  errorsTitle: { en: "Fix this first", fr: "À corriger d’abord" },
  formTitle: { en: "Who is writing", fr: "Qui écrit" },
  senderLabel: { en: "Your name, or your group’s name", fr: "Votre nom, ou celui de votre groupe" },
  senderHint: { en: "The letters are signed with this name.", fr: "Les lettres sont signées de ce nom." },
  contactLabel: { en: "How a place can reply (optional)", fr: "Comment un lieu peut répondre (facultatif)" },
  contactHint: {
    en: "For example an email address, a phone number or a mailing address. Only what you type here goes in the letters.",
    fr: "Par exemple une adresse courriel, un numéro de téléphone ou une adresse postale. Seul ce que vous tapez ici figure dans les lettres.",
  },
  languageLegend: { en: "Language of the letters", fr: "Langue des lettres" },
  languages: {
    en: { en: "English", fr: "Anglais" },
    fr: { en: "French", fr: "Français" },
    both: { en: "English and French, on one page", fr: "Anglais et français, sur une même page" },
  },
  includeOld: {
    en: "Also ask about records whose newest report is a year old or more",
    fr: "Demander aussi au sujet des données dont le rapport le plus récent date d’un an ou plus",
  },
  make: { en: "Write the letters", fr: "Rédiger les lettres" },
  problems: {
    "sender-empty": { en: "Type the name the letters are signed with.", fr: "Tapez le nom qui signe les lettres." },
    "sender-long": { en: "Give a name of at most 80 characters.", fr: "Indiquez un nom d’au plus 80 caractères." },
    "sender-control": { en: "Give the name on one line.", fr: "Indiquez le nom sur une seule ligne." },
    "contact-long": { en: "Give at most 120 characters.", fr: "Indiquez au plus 120 caractères." },
    "contact-control": { en: "Give the contact on one line.", fr: "Indiquez les coordonnées sur une seule ligne." },
  },
  resultsTitle: { en: "Letters", fr: "Lettres" },
  downloadAll: { en: "Download every letter to print", fr: "Télécharger toutes les lettres à imprimer" },
  downloadCsv: { en: "Download a list to track letters and replies (CSV)", fr: "Télécharger une liste pour suivre les lettres et les réponses (CSV)" },
  downloadNotes: { en: "Download the notes of these places", fr: "Télécharger les notes de ces lieux" },
  downloadOne: { en: "Download the letter", fr: "Télécharger la lettre" },
  showLetter: { en: "Show the letter", fr: "Afficher la lettre" },
  noAddress: { en: "No address", fr: "Aucune adresse" },
  made: { en: "The letters are ready.", fr: "Les lettres sont prêtes." },
  reasons: {
    unknown: { en: "no record", fr: "aucune donnée" },
    differ: { en: "reports differ", fr: "rapports divergents" },
    old: { en: "a year old or more", fr: "datant d’un an ou plus" },
  },
  errors: {
    empty: { en: "The box is empty. Paste the file’s text or open it.", fr: "La zone est vide. Collez le texte du fichier ou ouvrez-le." },
    "too-large": { en: "The file is too large to read here.", fr: "Le fichier est trop volumineux pour être lu ici." },
    "not-json": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-format": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-version": { en: "This export comes from a different version and cannot be read.", fr: "Cette exportation provient d’une autre version et ne peut pas être lue." },
    "no-notes": { en: "This file has no note the App can read.", fr: "Ce fichier ne contient aucune note lisible par l’App." },
  },
  track: {
    title: { en: "Follow up on letters", fr: "Faire le suivi des lettres" },
    intro: {
      en: "Fill in the sent_on and reply_on columns of the tracking list as letters go out and replies come in, with dates written like 2026-11-21. Paste the list here, or open it, to see which letters are waiting for a reply.",
      fr: "Remplissez les colonnes sent_on et reply_on de la liste de suivi à mesure que les lettres partent et que les réponses arrivent, avec des dates écrites comme 2026-11-21. Collez la liste ici, ou ouvrez-la, pour voir quelles lettres attendent une réponse.",
    },
    pasteLabel: { en: "Text of the tracking list (CSV)", fr: "Texte de la liste de suivi (CSV)" },
    openLabel: { en: "Or open the list from this device", fr: "Ou ouvrez la liste depuis cet appareil" },
    read: { en: "Read the list", fr: "Lire la liste" },
    clear: { en: "Remove the list", fr: "Retirer la liste" },
    cleared: { en: "The list is removed. Nothing was saved.", fr: "La liste est retirée. Rien n’a été enregistré." },
    opened: { en: "The list is in the box. Choose Read the list when ready.", fr: "La liste est dans la zone. Choisissez Lire la liste quand vous êtes prêt." },
    notSent: { en: "Not sent yet", fr: "Pas encore envoyées" },
    waiting: { en: "Waiting for a reply", fr: "En attente de réponse" },
    replied: { en: "Replied", fr: "Avec réponse" },
    unusable: { en: "Rows to fix", fr: "Lignes à corriger" },
    followUp: {
      en: `Waiting ${FOLLOW_UP_DAYS} days or more: you may want to write again or call.`,
      fr: `En attente depuis ${FOLLOW_UP_DAYS}${NB}jours ou plus${NB}: vous voudrez peut-être écrire de nouveau ou appeler.`,
    },
    afterReply: {
      en: "A reply is not a record yet. Add what each place said with Record what you found on a round, giving the reply as the source and its date.",
      fr: "Une réponse n’est pas encore une donnée. Ajoutez ce que chaque lieu a dit avec Noter ce que vous avez constaté lors d’une tournée, en indiquant la réponse comme source et sa date.",
    },
    errors: {
      empty: { en: "The box is empty. Paste the list or open it.", fr: "La zone est vide. Collez la liste ou ouvrez-la." },
      "too-large": { en: "The list is too large to read here.", fr: "La liste est trop volumineuse pour être lue ici." },
      "unclosed-quote": { en: "A quotation mark in the list is never closed.", fr: "Un guillemet de la liste n’est jamais fermé." },
      "too-many-rows": { en: "The list has more than 5,000 rows.", fr: `La liste compte plus de 5${NN}000${NB}lignes.` },
      "missing-columns": { en: "The list is missing columns", fr: "Il manque des colonnes à la liste" },
      "no-rows": { en: "The list has a header but no rows.", fr: "La liste a un en-tête mais aucune ligne." },
    },
    problems: {
      "no-name": { en: "no place name", fr: "aucun nom de lieu" },
      "sent-date": { en: "sent_on is not a date written like 2026-11-21", fr: "sent_on n’est pas une date écrite comme 2026-11-21" },
      "reply-date": { en: "reply_on is not a date written like 2026-11-21", fr: "reply_on n’est pas une date écrite comme 2026-11-21" },
      "sent-later": { en: "sent_on is after today", fr: "sent_on est postérieure à aujourd’hui" },
      "reply-later": { en: "reply_on is after today", fr: "reply_on est postérieure à aujourd’hui" },
      "reply-not-sent": { en: "a reply_on date with no sent_on date", fr: "une date reply_on sans date sent_on" },
      "reply-before": { en: "reply_on is before sent_on", fr: "reply_on est antérieure à sent_on" },
    },
  },
} as const;

/**
 * The words of the letters themselves. They ask, they do not tell: no detail
 * is said to be missing or wrong, only not recorded yet, recorded in ways
 * that do not agree, or recorded a while ago.
 */
export const LETTER_TEXT = {
  hello: { en: "Hello,", fr: "Bonjour," },
  intro: {
    en: "I am gathering accessibility details about places in our area, so people can plan their visits. I would like to ask you about a few details of your place.",
    fr: "Je rassemble des renseignements sur l’accessibilité des lieux de notre secteur, pour aider les gens à planifier leurs visites. J’aimerais vous poser quelques questions sur votre établissement.",
  },
  only: {
    en: "Please answer only what you know. “Not sure” is a fine answer.",
    fr: `Merci de ne répondre qu’à ce que vous savez. «${NN}Pas sûr${NN}» est une bonne réponse.`,
  },
  questions: {
    "step-free-entry": { en: "Is there an entrance with no steps?", fr: `Y a-t-il une entrée sans marche${NN}?` },
    "accessible-washroom": { en: "Is there an accessible washroom?", fr: `Y a-t-il des toilettes accessibles${NN}?` },
    "automatic-door": { en: "Does the entrance have an automatic door?", fr: `L’entrée a-t-elle une porte automatique${NN}?` },
    elevator: { en: "Is there an elevator?", fr: `Y a-t-il un ascenseur${NN}?` },
  },
  why: {
    unknown: { en: "We have no record of this yet.", fr: "Nous n’avons pas encore de donnée à ce sujet." },
    differ: { en: "We have reports that do not agree.", fr: "Nous avons des rapports qui ne concordent pas." },
    old: { en: "Our newest report is more than a year old.", fr: "Notre rapport le plus récent date de plus d’un an." },
  },
  replyTitle: { en: "Reply", fr: "Réponse" },
  boxes: { en: "[ ] Yes   [ ] No   [ ] Not sure", fr: "[ ] Oui   [ ] Non   [ ] Pas sûr" },
  answeredBy: { en: "Answered by: ________________", fr: `Réponse de${NB}: ________________` },
  date: { en: "Date: ________________", fr: `Date${NB}: ________________` },
  thanks: { en: "Thank you,", fr: "Merci," },
  replyTo: { en: "You can reply to", fr: "Vous pouvez répondre à" },
} as const;

/** The heading before the French half of a letter in both languages, for the reader of that half. */
export const FRENCH_VERSION = "Version française";

export function lettersErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_LETTERS_COPY.errors[e], l);
}

export function problemText(p: LetterProblem, l: Locale): string {
  return t(FILE_LETTERS_COPY.problems[p], l);
}

export function reasonText(r: AskReason, l: Locale): string {
  return t(FILE_LETTERS_COPY.reasons[r], l);
}

export function questionText(k: FactKey, l: Locale): string {
  return t(LETTER_TEXT.questions[k], l);
}

/** "Elevator (no record), Automatic door (reports differ)" — what a letter asks, for the page. */
export function asksText(asks: readonly Ask[], names: (k: FactKey) => string, l: Locale): string {
  return asks.map((a) => `${names(a.key)} (${reasonText(a.reason, l)})`).join(", ");
}

/** One letter in one language. */
function letterIn(letter: Letter, o: Pick<LetterOptions, "sender" | "contact">, l: Locale): string[] {
  const T = LETTER_TEXT;
  const p = letter.place;
  const k = l === "fr" ? `${NB}:` : ":";
  const lines = [p.name, ...(p.address ? [p.address] : []), "", t(T.hello, l), "", t(T.intro, l), ""];
  letter.asks.forEach((a, i) => lines.push(`${i + 1}. ${questionText(a.key, l)} ${t(T.why[a.reason], l)}`));
  lines.push("", t(T.only, l), "", t(T.replyTitle, l), "-".repeat(t(T.replyTitle, l).length));
  letter.asks.forEach((a, i) => lines.push(`${i + 1}. ${questionText(a.key, l)}`, `   ${t(T.boxes, l)}`));
  lines.push("", t(T.answeredBy, l), t(T.date, l), "", t(T.thanks, l), oneLine(o.sender));
  const contact = oneLine(o.contact);
  if (contact !== "") lines.push(`${t(T.replyTo, l)}${k} ${contact}`);
  return lines;
}

/** A letter in the chosen language; with both, the English letter then the French one on the same page. */
export function letterText(letter: Letter, o: LetterOptions): string {
  if (o.language !== "both") return `${letterIn(letter, o, o.language).join("\n")}\n`;
  return `${[...letterIn(letter, o, "en"), "", FRENCH_VERSION, "=".repeat(FRENCH_VERSION.length), "", ...letterIn(letter, o, "fr")].join("\n")}\n`;
}

/** Every letter one after another, with a line of "=" between letters. */
export function allLetters(set: LetterSet, o: LetterOptions): string {
  return set.letters.map((x) => letterText(x, o)).join(`\n${"=".repeat(60)}\n\n`);
}

const placesCount = (n: number, l: Locale): string => (l === "fr" ? `${n} ${n > 1 ? "lieux" : "lieu"}` : `${n} ${n === 1 ? "place" : "places"}`);

/** "12 letters, one for each place with something to ask. 3 places have nothing to ask and get no letter." */
export function setSummary(set: LetterSet, l: Locale): string {
  const n = set.letters.length;
  const parts = [
    l === "fr"
      ? n === 0
        ? "Aucun lieu n’a de question à recevoir."
        : `${n} ${n > 1 ? "lettres" : "lettre"}, une pour chaque lieu à qui poser une question.`
      : n === 0
        ? "No place has anything to ask about."
        : `${n} ${n === 1 ? "letter" : "letters"}, one for each place with something to ask.`,
  ];
  if (set.nothingOpen > 0)
    parts.push(
      l === "fr"
        ? `${placesCount(set.nothingOpen, l)} sans question ${set.nothingOpen > 1 ? "ne reçoivent" : "ne reçoit"} pas de lettre.`
        : `${placesCount(set.nothingOpen, l)} with nothing to ask ${set.nothingOpen === 1 ? "gets" : "get"} no letter.`,
    );
  if (set.over > 0)
    parts.push(
      l === "fr"
        ? `${placesCount(set.over, l)} de plus ${set.over > 1 ? "dépassent" : "dépasse"} la limite de ${MAX_LETTERS} lettres${NN}; divisez le fichier pour leur écrire.`
        : `${set.over} more ${set.over === 1 ? "place is" : "places are"} past the limit of ${MAX_LETTERS} letters; split the file to write to them.`,
    );
  return parts.join(" ");
}

export function languageText(x: LetterLanguage, l: Locale): string {
  return t(FILE_LETTERS_COPY.languages[x], l);
}

export function trackErrorText(e: TrackFileError, missing: readonly string[] | undefined, l: Locale): string {
  const base = t(FILE_LETTERS_COPY.track.errors[e], l);
  if (e !== "missing-columns") return base;
  return `${base}${l === "fr" ? NB : ""}: ${(missing ?? []).join(", ")}.`;
}

export function trackProblemText(p: TrackProblem, l: Locale): string {
  return t(FILE_LETTERS_COPY.track.problems[p], l);
}

/** "Line 4" / "Ligne 4". */
export function lineText(line: number, l: Locale): string {
  return l === "fr" ? `Ligne ${line}` : `Line ${line}`;
}

/** "12 days" / "12 jours", with a no-break space in French. */
export function daysText(days: number, l: Locale): string {
  if (l === "fr") return `${days}${NB}${days > 1 ? "jours" : "jour"}`;
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/** "Sent 2026-10-01, waiting 51 days" for one waiting letter. */
export function waitingText(w: Waiting, l: Locale): string {
  return l === "fr" ? `Envoyée le ${w.sentOn}, en attente depuis ${daysText(w.days, l)}` : `Sent ${w.sentOn}, waiting ${daysText(w.days, l)}`;
}

const lettersCount = (n: number, l: Locale): string => (l === "fr" ? `${n} ${n > 1 ? "lettres" : "lettre"}` : `${n} ${n === 1 ? "letter" : "letters"}`);

/** "8 letters: 2 not sent yet, 4 waiting for a reply (1 for 30 days or more), 1 replied, 1 row to fix." */
export function trackSummary(tr: Tracking, due: number, l: Locale): string {
  const total = trackTotal(tr);
  if (l === "fr") {
    const rows = tr.unusable.length;
    return (
      `${lettersCount(total, l)}${NB}: ${tr.notSent.length} pas encore ${tr.notSent.length > 1 ? "envoyées" : "envoyée"}, ` +
      `${tr.waiting.length} en attente de réponse (${due} depuis ${FOLLOW_UP_DAYS}${NB}jours ou plus), ` +
      `${tr.replied.length} avec réponse, ${rows} ${rows > 1 ? "lignes" : "ligne"} à corriger.`
    );
  }
  const rows = tr.unusable.length;
  return (
    `${lettersCount(total, l)}: ${tr.notSent.length} not sent yet, ${tr.waiting.length} waiting for a reply (${due} for ${FOLLOW_UP_DAYS} days or more), ` +
    `${tr.replied.length} replied, ${rows} ${rows === 1 ? "row" : "rows"} to fix.`
  );
}

export function lettersFilename(kind: "all" | "csv" | "notes" | "one", index: number, today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  if (kind === "csv") return l === "fr" ? `suivi-des-lettres-${day}.csv` : `letters-tracking-${day}.csv`;
  if (kind === "notes") return l === "fr" ? `notes-des-lieux-ecrits-${day}.json` : `notes-of-places-written-to-${day}.json`;
  if (kind === "all") return l === "fr" ? `lettres-${day}.txt` : `letters-${day}.txt`;
  const n = String(index + 1).padStart(3, "0");
  return l === "fr" ? `lettre-${n}-${day}.txt` : `letter-${n}-${day}.txt`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileLettersStrings(): Array<[string, Pair]> {
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
  walk("fileLetters", FILE_LETTERS_COPY);
  walk("letterText", LETTER_TEXT);
  return out;
}
