import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, NN, t, type Pair } from "./copy";
import type { ImportError } from "./exchange";
import { differingDetails, unknownDetails } from "./filestreets";
import { FILE_STREETS_COPY, leftOutDoneText, placeLines } from "./filestreets-copy";
import { icsCalendar, type IcsEvent } from "./ics";
import { parseIsoDate, planVisitList, type Plan, type PlanDay, type PlanField, type PlanProblemCode, type Visit, type Weekday } from "./visitplan";

/**
 * Words for "Plan visits by day", in English and French. French copy uses ’,
 * U+00A0 before ":" and U+202F before ; ! ? and inside « ». A detail with no
 * record is the token UNKNOWN in French.
 */
export const FILE_VISITS_COPY = {
  title: { en: "Plan visits by day", fr: "Planifier les visites par jour" },
  intro: {
    en: "Spread the places in a notes export over the days you choose, street by street in house-number order, with a time for each visit. Add the plan to your calendar or print it.",
    fr: "Répartissez les lieux d’une exportation de notes sur les jours de votre choix, rue par rue dans l’ordre des numéros, avec une heure pour chaque visite. Ajoutez le plan à votre agenda ou imprimez-le.",
  },
  privacy: {
    en: "The plan only puts the places in order and gives them times. Nothing is looked up, nothing is saved and nothing is sent anywhere.",
    fr: "Le plan ne fait que mettre les lieux en ordre et leur donner une heure. Rien n’est recherché, enregistré ni envoyé.",
  },
  pasteLabel: { en: "Text of the notes file", fr: "Texte du fichier de notes" },
  pasteHint: {
    en: "A notes export is made with “Export notes” on the Notes page.",
    fr: `Une exportation de notes se crée avec «${NN}Exporter les notes${NN}» sur la page Notes.`,
  },
  openLabel: { en: "Or open the file from this device", fr: "Ou ouvrez le fichier depuis cet appareil" },
  read: { en: "Plan the visits", fr: "Planifier les visites" },
  clear: { en: "Remove the file and the plan", fr: "Retirer le fichier et le plan" },
  cleared: { en: "The page is empty. Nothing was saved.", fr: "La page est vide. Rien n’a été enregistré." },
  opened: { en: "The file is in the box. Choose Plan the visits when ready.", fr: "Le fichier est dans la zone. Choisissez Planifier les visites quand vous êtes prêt." },
  readFailed: { en: "That file could not be opened. Try pasting its text instead.", fr: "Ce fichier n’a pas pu être ouvert. Essayez plutôt de coller son texte." },
  errorsTitle: { en: "Fix this first", fr: "À corriger d’abord" },
  optionsTitle: { en: "Days and times", fr: "Jours et heures" },
  startLabel: { en: "First day", fr: "Premier jour" },
  weekdaysLegend: { en: "Days of the week for visits", fr: "Jours de la semaine pour les visites" },
  weekdays: {
    1: { en: "Monday", fr: "lundi" },
    2: { en: "Tuesday", fr: "mardi" },
    3: { en: "Wednesday", fr: "mercredi" },
    4: { en: "Thursday", fr: "jeudi" },
    5: { en: "Friday", fr: "vendredi" },
    6: { en: "Saturday", fr: "samedi" },
    0: { en: "Sunday", fr: "dimanche" },
  },
  startTimeLabel: { en: "First visit of the day starts at", fr: "La première visite de la journée commence à" },
  startTimeHint: { en: "For example 9:30.", fr: "Par exemple 9 h 30." },
  perDayLabel: { en: "Visits a day (1 to 30)", fr: "Visites par jour (1 à 30)" },
  minutesLabel: { en: "Minutes for each visit (5 to 240)", fr: "Minutes pour chaque visite (5 à 240)" },
  gapLabel: { en: "Minutes between visits, to get from one to the next (0 to 120)", fr: "Minutes entre les visites, pour aller de l’une à l’autre (0 à 120)" },
  bothSides: { en: "Walk one side of each street, then come back on the other (odd numbers, then even)", fr: "Parcourir un côté de chaque rue, puis revenir par l’autre (numéros impairs, puis pairs)" },
  onlyOpen: {
    en: "Only places with something to look at (a detail with no record, or reports that differ)",
    fr: "Seulement les lieux où il y a quelque chose à regarder (un détail sans donnée ou des rapports divergents)",
  },
  keepStreets: {
    en: "Keep each street on one day when it fits, even if a day ends with fewer visits",
    fr: "Garder chaque rue sur une seule journée quand elle y tient, même si une journée finit avec moins de visites",
  },
  update: { en: "Update the plan", fr: "Mettre le plan à jour" },
  problems: {
    date: { en: "Give a date as year-month-day, for example 2026-11-23.", fr: "Indiquez une date sous la forme année-mois-jour, par exemple 2026-11-23." },
    weekdays: { en: "Choose at least one day of the week.", fr: "Choisissez au moins un jour de la semaine." },
    time: { en: "Give a time from 0:00 to 23:59, for example 9:30.", fr: "Indiquez une heure de 0 h 00 à 23 h 59, par exemple 9 h 30." },
    perDay: { en: "Give a whole number of visits from 1 to 30.", fr: "Indiquez un nombre entier de visites de 1 à 30." },
    minutes: { en: "Give a whole number of minutes from 5 to 240.", fr: "Indiquez un nombre entier de minutes de 5 à 240." },
    gap: { en: "Give a whole number of minutes from 0 to 120.", fr: "Indiquez un nombre entier de minutes de 0 à 120." },
    pastMidnight: {
      en: "With these times, the last visit would end after midnight. Start earlier, or plan fewer or shorter visits a day.",
      fr: "Avec ces heures, la dernière visite finirait après minuit. Commencez plus tôt, ou prévoyez moins de visites par jour ou des visites plus courtes.",
    },
  },
  daysTitle: { en: "Days", fr: "Jours" },
  noAddress: { en: "No address", fr: "Aucune adresse" },
  noStreet: { en: "No street in the address", fr: "Aucune rue dans l’adresse" },
  splitTitle: { en: "Streets on more than one day", fr: "Rues sur plus d’une journée" },
  downloadCalendar: { en: "Add to a calendar (.ics file)", fr: "Ajouter à un agenda (fichier .ics)" },
  downloadText: { en: "Download the plan to print", fr: "Télécharger le plan à imprimer" },
  downloadCsv: { en: "Download the plan as a spreadsheet (CSV)", fr: "Télécharger le plan en tableur (CSV)" },
  calendarHint: {
    en: "The times in the calendar file have no time zone: 9:00 stays 9:00 in your calendar app.",
    fr: `Les heures du fichier d’agenda n’ont pas de fuseau horaire${NB}: 9 h 00 reste 9 h 00 dans votre application d’agenda.`,
  },
  planHeading: { en: "Plan of visits", fr: "Plan des visites" },
  planMade: { en: "Made on", fr: "Créé le" },
  calendarName: { en: "Visits", fr: "Visites" },
  updated: { en: "The plan is updated.", fr: "Le plan est mis à jour." },
  errors: {
    empty: { en: "The box is empty. Paste the file’s text or open it.", fr: "La zone est vide. Collez le texte du fichier ou ouvrez-le." },
    "too-large": { en: "The file is too large to read here.", fr: "Le fichier est trop volumineux pour être lu ici." },
    "not-json": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-format": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-version": { en: "This export comes from a different version and cannot be read.", fr: "Cette exportation provient d’une autre version et ne peut pas être lue." },
    "no-notes": { en: "This file has no note the App can read.", fr: "Ce fichier ne contient aucune note lisible par l’App." },
  },
} as const;

/** The field labels, by field, for the error summary. */
export const FIELD_LABELS: Readonly<Record<PlanField, Pair>> = {
  start: FILE_VISITS_COPY.startLabel,
  weekdays: FILE_VISITS_COPY.weekdaysLegend,
  startTime: FILE_VISITS_COPY.startTimeLabel,
  perDay: FILE_VISITS_COPY.perDayLabel,
  minutes: FILE_VISITS_COPY.minutesLabel,
  gap: FILE_VISITS_COPY.gapLabel,
};

export function visitsErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_VISITS_COPY.errors[e], l);
}

export function problemText(code: PlanProblemCode, l: Locale): string {
  return t(FILE_VISITS_COPY.problems[code], l);
}

export function weekdayName(d: Weekday, l: Locale): string {
  return t(FILE_VISITS_COPY.weekdays[d], l);
}

const MONTHS: Readonly<Record<Locale, readonly string[]>> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  fr: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
};

/**
 * "Monday, November 23, 2026" / "lundi 23 novembre 2026". Written out here
 * rather than with Intl so every device shows the same words.
 */
export function longDate(iso: string, l: Locale): string {
  const d = parseIsoDate(iso);
  if (!d) return iso;
  const day = weekdayName(d.getUTCDay() as Weekday, l);
  const month = MONTHS[l][d.getUTCMonth()] ?? "";
  if (l === "fr") return `${day} ${d.getUTCDate() === 1 ? "1er" : d.getUTCDate()} ${month} ${d.getUTCFullYear()}`;
  return `${day}, ${month} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** "9:05" / "9 h 05". */
export function clockText(minutes: number, l: Locale): string {
  const h = Math.floor(minutes / 60);
  const m = String(minutes % 60).padStart(2, "0");
  return l === "fr" ? `${h} h ${m}` : `${h}:${m}`;
}

/** "9:00 to 9:30" / "9 h 00 à 9 h 30". */
export function timeRange(v: Pick<Visit, "start" | "end">, l: Locale): string {
  return `${clockText(v.start, l)} ${l === "fr" ? "à" : "to"} ${clockText(v.end, l)}`;
}

const visitsCount = (n: number, l: Locale): string => (l === "fr" ? `${n} ${n > 1 ? "visites" : "visite"}` : `${n} ${n === 1 ? "visit" : "visits"}`);
const daysCount = (n: number, l: Locale): string => (l === "fr" ? `${n} ${n > 1 ? "jours" : "jour"}` : `${n} ${n === 1 ? "day" : "days"}`);

/** "12 visits over 3 days, from Monday, November 23, 2026 to Wednesday, November 25, 2026." */
export function planSummary(plan: Plan, l: Locale): string {
  const n = planVisitList(plan).length;
  const first = plan.days[0];
  const last = plan.days[plan.days.length - 1];
  let text: string;
  if (!first || !last) text = l === "fr" ? "Aucune visite à planifier." : "No visits to plan.";
  else if (first === last) text = l === "fr" ? `${visitsCount(n, l)} le ${longDate(first.date, l)}.` : `${visitsCount(n, l)} on ${longDate(first.date, l)}.`;
  else
    text =
      l === "fr"
        ? `${visitsCount(n, l)} sur ${daysCount(plan.days.length, l)}, du ${longDate(first.date, l)} au ${longDate(last.date, l)}.`
        : `${visitsCount(n, l)} over ${daysCount(plan.days.length, l)}, from ${longDate(first.date, l)} to ${longDate(last.date, l)}.`;
  return plan.leftOutDone > 0 ? `${text} ${leftOutDoneText(plan.leftOutDone, l)}` : text;
}

/** "Monday, November 23, 2026 (4 visits)". */
export function dayHeading(d: PlanDay, l: Locale): string {
  return `${longDate(d.date, l)} (${visitsCount(d.visits.length, l)})`;
}

/** What to look at at a place, in one line, for a calendar entry. */
export function lookAtLine(v: Visit, l: Locale): string {
  const unknown = unknownDetails(v.place).map((k) => t(COPY.facts[k], l));
  const differ = differingDetails(v.place).map((k) => t(COPY.facts[k], l));
  const k = l === "fr" ? `${NB}:` : ":";
  const parts = [
    ...(unknown.length > 0 ? [`${unknown.join(", ")} (${t(COPY.values.unknown, l)})`] : []),
    ...(differ.length > 0 ? [`${differ.join(", ")} (${t(FILE_STREETS_COPY.reportsDiffer, l)})`] : []),
  ];
  return `${t(FILE_STREETS_COPY.toLookAt, l)}${k} ${parts.length > 0 ? parts.join(l === "fr" ? `${NN}; ` : "; ") : t(FILE_STREETS_COPY.nothingOpen, l)}`;
}

/** One calendar entry per visit; the uid is the place and the day, so importing the same plan twice updates it. */
export function planEvents(plan: Plan, l: Locale): IcsEvent[] {
  return planVisitList(plan).map((v) => ({
    uid: `${v.place.id}-${v.date.replace(/-/g, "")}@plan-visits`,
    start: { date: v.date, minutes: v.start },
    end: { date: v.date, minutes: v.end },
    summary: v.place.name,
    location: v.place.address,
    description: `${lookAtLine(v, l)}\n${t(FILE_STREETS_COPY.sheetNote, l)}`,
  }));
}

export function planCalendar(plan: Plan, l: Locale, today: Date): string {
  return icsCalendar({ prodId: `-//the App//${t(FILE_VISITS_COPY.title, "en")}//${l.toUpperCase()}`, name: t(FILE_VISITS_COPY.calendarName, l), stamp: today, events: planEvents(plan, l) });
}

/** The whole plan as text to print: each day, then each visit with its time and what to look at. */
export function planText(plan: Plan, l: Locale, today: Date): string {
  const lines: string[] = [
    `${t(FILE_VISITS_COPY.planHeading, l)}`,
    `${t(FILE_VISITS_COPY.planMade, l)} ${today.toISOString().slice(0, 10)}`,
    planSummary(plan, l),
    t(FILE_STREETS_COPY.sheetNote, l),
    "",
  ];
  for (const d of plan.days) {
    const heading = dayHeading(d, l);
    lines.push(heading, "=".repeat(Math.min(heading.length, 72)));
    for (const v of d.visits) {
      lines.push(`${timeRange(v, l)}${v.street ? ` (${v.street})` : ""}`);
      lines.push(...placeLines(v.place, l));
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

export function visitsFilename(kind: "ics" | "text" | "csv", today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  const base = l === "fr" ? `plan-des-visites-${day}` : `visit-plan-${day}`;
  return `${base}.${kind === "ics" ? "ics" : kind === "csv" ? "csv" : "txt"}`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileVisitsStrings(): Array<[string, Pair]> {
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
  walk("fileVisits", FILE_VISITS_COPY);
  return out;
}
