import type { Locale } from "../../switch-first/src/index";
import { NB, NN, t, type Pair } from "./copy";
import type { StartErrorCode, StopErrorCode } from "./survey";

/** English and French copy for the survey walk. Checked by the copy audit through `surveyStrings()`. */
export const SURVEY_COPY = {
  title: { en: "Survey several places, one question at a time", fr: "Relevé de plusieurs lieux, une question à la fois" },
  open: { en: "Survey several places, one question at a time", fr: "Faire un relevé de plusieurs lieux, une question à la fois" },
  formHint: {
    en: "Visiting several places in a row? You can answer one question per screen instead.",
    fr: `Vous visitez plusieurs lieux à la suite${NN}? Vous pouvez plutôt répondre à une question par écran.`,
  },
  intro: {
    en: "Add the places you will visit in a row, such as the shops in a plaza. Then the App asks one question per screen, with three large answers.",
    fr: "Ajoutez les lieux que vous visiterez à la suite, comme les commerces d’une place. Ensuite, l’App pose une question par écran, avec trois grandes réponses.",
  },
  unknownNote: {
    en: "If you are not sure, choose “Not sure”. The detail stays Unknown. Nothing is filled in for you.",
    fr: `Si vous n’êtes pas certain, choisissez «${NN}Je ne sais pas${NN}». Le détail reste UNKNOWN. Rien n’est rempli à votre place.`,
  },
  deviceNote: {
    en: "The survey is kept on this device only, so you can finish it later.",
    fr: "Le relevé est gardé sur cet appareil seulement, pour que vous puissiez le terminer plus tard.",
  },
  stopsTitle: { en: "Places in this survey", fr: "Lieux de ce relevé" },
  noStops: { en: "No places yet.", fr: "Aucun lieu pour l’instant." },
  addTitle: { en: "Add a place", fr: "Ajouter un lieu" },
  addButton: { en: "Add this place to the survey", fr: "Ajouter ce lieu au relevé" },
  fromNotesTitle: { en: "Places in your notes with open questions", fr: "Lieux de vos notes avec des questions ouvertes" },
  fromNotesHint: {
    en: "Only the details with no record, or with reports that differ, are asked.",
    fr: "Seuls les détails sans donnée, ou dont les rapports divergent, sont demandés.",
  },
  detailsLabel: { en: "Visit date and licence", fr: "Date de visite et licence" },
  dateLabel: { en: "Date of your visit", fr: "Date de votre visite" },
  dateHint: {
    en: "Year-month-day, for example 2026-11-15. It goes with every answer.",
    fr: "Année-mois-jour, par exemple 2026-11-15. Elle accompagne chaque réponse.",
  },
  licenceLabel: { en: "Licence for your answers", fr: "Licence de vos réponses" },
  licenceHint: {
    en: "An open licence lets your notes be shared and reused. There is no default: please choose one.",
    fr: `Une licence ouverte permet de partager et de réutiliser vos notes. Il n’y a pas de choix par défaut${NB}: choisissez-en une.`,
  },
  choose: { en: "Choose a licence", fr: "Choisissez une licence" },
  start: { en: "Start asking", fr: "Commencer les questions" },
  resume: { en: "Continue where you left off", fr: "Reprendre là où vous en étiez" },
  discard: { en: "Discard this survey", fr: "Abandonner ce relevé" },
  confirmDiscard: {
    en: "Discard every place and answer in this survey? Notes you already saved do not change.",
    fr: `Abandonner tous les lieux et toutes les réponses de ce relevé${NN}? Les notes déjà enregistrées ne changent pas.`,
  },
  yesDiscard: { en: "Yes, discard the survey", fr: "Oui, abandonner le relevé" },
  noDiscard: { en: "No, keep the survey", fr: "Non, garder le relevé" },
  discarded: { en: "The survey was discarded.", fr: "Le relevé a été abandonné." },
  added: { en: "Added to the survey", fr: "Ajouté au relevé" },
  removed: { en: "Removed from the survey", fr: "Retiré du relevé" },
  kept: { en: "The survey was kept.", fr: "Le relevé a été gardé." },
  errorsTitle: { en: "Fix this to go on", fr: "Corrigez ceci pour continuer" },
  notSure: { en: "Not sure (stays Unknown)", fr: "Je ne sais pas (reste UNKNOWN)" },
  answerSoFar: { en: "Your answer so far", fr: "Votre réponse jusqu’ici" },
  previous: { en: "Previous question", fr: "Question précédente" },
  leave: { en: "Skip the rest of this place", fr: "Passer le reste de ce lieu" },
  leaveHint: {
    en: "The questions you skip stay Unknown.",
    fr: "Les questions passées restent UNKNOWN.",
  },
  toReview: { en: "Back to the review", fr: "Retour à la relecture" },
  toPlaces: { en: "Change the list of places", fr: "Modifier la liste des lieux" },
  toNotes: { en: "Back to my notes", fr: "Retour à mes notes" },
  reviewTitle: { en: "Look over your answers before saving", fr: "Relisez vos réponses avant d’enregistrer" },
  reviewIntro: {
    en: "Each place with at least one Yes or No becomes one note. You can change any answer first.",
    fr: "Chaque lieu avec au moins un Oui ou un Non devient une note. Vous pouvez d’abord modifier n’importe quelle réponse.",
  },
  willSave: { en: "This place will be saved as a note.", fr: "Ce lieu sera enregistré comme note." },
  wontSave: {
    en: "No Yes or No answer, so this place will not be saved.",
    fr: "Aucune réponse Oui ou Non, donc ce lieu ne sera pas enregistré.",
  },
  nothingToSave: {
    en: "No place has a Yes or No answer yet, so there is nothing to save.",
    fr: "Aucun lieu n’a encore de réponse Oui ou Non, donc il n’y a rien à enregistrer.",
  },
  lastQuestion: { en: "Back to the last question", fr: "Retour à la dernière question" },
  notesFull: {
    en: "There is not enough room left in your notes for every place. Remove some notes first.",
    fr: "Il ne reste pas assez de place dans vos notes pour chaque lieu. Retirez d’abord quelques notes.",
  },
  stepTitle: { en: "Survey several places in a row", fr: "Faire le relevé de plusieurs lieux à la suite" },
  stepWhy: {
    en: "Answer one question at a time for each place you visit. Questions you skip stay Unknown.",
    fr: "Répondez à une question à la fois pour chaque lieu visité. Les questions passées restent UNKNOWN.",
  },
  deviceTitle: { en: "Unfinished survey", fr: "Relevé inachevé" },
  deviceWhat: {
    en: "The places and answers of a survey you have not saved yet.",
    fr: "Les lieux et les réponses d’un relevé pas encore enregistré.",
  },
} as const satisfies Record<string, Pair>;

export const STOP_ERRORS: Record<StopErrorCode | StartErrorCode, Pair> = {
  required: { en: "Enter the place name.", fr: "Saisissez le nom du lieu." },
  "too-long": { en: "This is too long.", fr: "C’est trop long." },
  "control-chars": { en: "This contains characters that are not allowed.", fr: "Ceci contient des caractères non permis." },
  "personal-email": { en: "Remove the email address.", fr: "Retirez l’adresse courriel." },
  "personal-phone": { en: "Remove the phone number.", fr: "Retirez le numéro de téléphone." },
  duplicate: { en: "This place is already in the survey.", fr: "Ce lieu est déjà dans le relevé." },
  full: { en: "A survey holds up to 12 places. Save it or remove a place first.", fr: "Un relevé contient au plus 12 lieux. Enregistrez-le ou retirez d’abord un lieu." },
  "no-keys": { en: "This place has no open questions.", fr: "Ce lieu n’a aucune question ouverte." },
  "no-stops": { en: "Add at least one place.", fr: "Ajoutez au moins un lieu." },
  "bad-date": { en: "Enter the date as year-month-day, for example 2026-11-15.", fr: "Saisissez la date sous la forme année-mois-jour, par exemple 2026-11-15." },
  "future-date": { en: "The date cannot be in the future.", fr: "La date ne peut pas être dans le futur." },
  "licence-required": { en: "Choose a licence for your answers.", fr: "Choisissez une licence pour vos réponses." },
  "licence-invalid": { en: "Choose one of the licences in the list.", fr: "Choisissez l’une des licences de la liste." },
  "needs-one-detail": { en: "Answer Yes or No for at least one detail.", fr: "Répondez Oui ou Non pour au moins un détail." },
};

const colon = (l: Locale): string => (l === "fr" ? `${NB}:` : ":");

/** "Place 2 of 3: Library", "Lieu 2 sur 3 : Library". The name is the person's own text. */
export function stopHeading(i: number, n: number, name: string, l: Locale): string {
  return l === "fr" ? `Lieu ${i + 1} sur ${n}${colon(l)} ${name}` : `Place ${i + 1} of ${n}${colon(l)} ${name}`;
}

/** "Question 1 of 4 at this place". */
export function questionOf(q: number, n: number, l: Locale): string {
  return l === "fr" ? `Question ${q + 1} sur ${n} pour ce lieu` : `Question ${q + 1} of ${n} at this place`;
}

/** "5 of 12 questions answered in all". */
export function overallText(done: number, total: number, l: Locale): string {
  if (l === "fr") return `${done} ${done > 1 ? "questions répondues" : "question répondue"} sur ${total} en tout`;
  return `${done} of ${total} ${total === 1 ? "question" : "questions"} answered in all`;
}

/** "4 questions", "1 question" — the same word in both languages, with French plural rules. */
export function questionsCount(n: number, l: Locale): string {
  return l === "fr" ? `${n} ${n > 1 ? "questions" : "question"}` : `${n} ${n === 1 ? "question" : "questions"}`;
}

/** A place name with its address, for button names that must be unique. */
export function placeLabel(name: string, address: string): string {
  return address === "" ? name : `${name}, ${address}`;
}

export const addPlaceLabel = (place: string, n: number, l: Locale): string =>
  l === "fr" ? `Ajouter ${place} (${questionsCount(n, l)})` : `Add ${place} (${questionsCount(n, l)})`;
export const removeLabel = (place: string, l: Locale): string => (l === "fr" ? `Retirer ${place} du relevé` : `Remove ${place} from the survey`);
export const upLabel = (place: string, l: Locale): string => (l === "fr" ? `Monter ${place}` : `Move ${place} up`);
export const downLabel = (place: string, l: Locale): string => (l === "fr" ? `Descendre ${place}` : `Move ${place} down`);
export const surveyChangeLabel = (detail: string, place: string, l: Locale): string =>
  l === "fr" ? `Modifier ${detail} pour ${place}` : `Change ${detail} at ${place}`;

/** "Save 2 notes", "Enregistrer 1 note". */
export function saveLabel(n: number, l: Locale): string {
  return l === "fr" ? `Enregistrer ${n} ${n > 1 ? "notes" : "note"}` : `Save ${n} ${n === 1 ? "note" : "notes"}`;
}

/** The message after saving, with the places left out. */
export function savedMessage(saved: number, skipped: number, l: Locale): string {
  const first = l === "fr" ? `${n(saved, "note enregistrée", "notes enregistrées")}.` : `Saved ${saved} ${saved === 1 ? "note" : "notes"}.`;
  if (skipped === 0) return first;
  const second =
    l === "fr"
      ? `${n(skipped, "lieu n’avait", "lieux n’avaient")} aucune réponse Oui ou Non et n’${skipped > 1 ? "ont" : "a"} pas été ${skipped > 1 ? "enregistrés" : "enregistré"}.`
      : `${skipped} ${skipped === 1 ? "place had" : "places had"} no Yes or No answer and ${skipped === 1 ? "was" : "were"} not saved.`;
  return `${first} ${second}`;
}

function n(count: number, one: string, many: string): string {
  return `${count} ${count > 1 ? many : one}`;
}

/** "Next: Elevator", announced after each answer. */
export function nextAnnouncement(question: string, l: Locale): string {
  return l === "fr" ? `Question suivante${colon(l)} ${question}` : `Next question${colon(l)} ${question}`;
}

export function stopError(code: StopErrorCode | StartErrorCode, l: Locale): string {
  return t(STOP_ERRORS[code], l);
}

export function surveyStrings(): Array<[string, Pair]> {
  return [
    ...Object.entries(SURVEY_COPY).map(([k, p]): [string, Pair] => [`survey.${k}`, p]),
    ...Object.entries(STOP_ERRORS).map(([k, p]): [string, Pair] => [`survey.errors.${k}`, p]),
  ];
}
