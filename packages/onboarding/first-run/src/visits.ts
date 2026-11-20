import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, t, type Pair } from "./copy";
import { FACT_KEYS, isIsoDate, type FactKey, type Tri } from "./facts";
import { emptyForm, isoDate, type FormValues, type IdMaker } from "./form";
import { hasControlChars } from "./model";
import type { Place } from "./places";
import type { KeyValueStore } from "./store";

/**
 * "My visits": after going to a place, the person writes down what they found,
 * for themselves. A visit names a place from their notes, the day of the visit,
 * for each detail what they found (Yes, No, or that they did not look) and, if
 * they want, a few words of their own.
 *
 * Visits are private: they stay on this device and never change the notes by
 * themselves. Each visit is compared with what the notes say, and the person
 * can start a new note from a visit; the note form then opens with what they
 * found, and they choose the licence there. Their own words are not copied.
 */
export const VISITS_KEY = "app.onboarding.visits.v1";
export const MAX_VISITS = 500;
export const MAX_WORDS = 1000;
/** The earliest day a visit can be on. */
export const EARLIEST_VISIT = "2000-01-01";

export type Found = "yes" | "no";
/** What the form holds for a detail: "" when the person did not look. */
export type FoundChoice = Found | "";

export interface Visit {
  readonly id: string;
  readonly placeId: string;
  /** Kept with the visit, so it still reads well if the place leaves the notes. */
  readonly placeName: string;
  readonly address: string | undefined;
  readonly visitedOn: string;
  /** Only the details the person looked at. */
  readonly found: Readonly<Partial<Record<FactKey, Found>>>;
  readonly words: string;
  /** The day it was written or last changed. */
  readonly writtenOn: string;
}

export interface VisitDraft {
  readonly placeId: string;
  readonly visitedOn: string;
  readonly found: Readonly<Record<FactKey, FoundChoice>>;
  readonly words: string;
}

export type VisitErrorCode = "no-place" | "date-format" | "date-future" | "date-too-old" | "too-long" | "control-chars" | "empty";

export interface VisitError {
  readonly field: "place" | "date" | "words" | "found";
  readonly code: VisitErrorCode;
}

export const VISIT_COPY = {
  open: { en: "My visits", fr: "Mes visites" },
  title: { en: "My visits", fr: "Mes visites" },
  intro: {
    en: "After a visit, write down what you found, for yourself. Your notes do not change unless you start a note from a visit.",
    fr: "Après une visite, notez ce que vous avez constaté, pour vous. Vos notes ne changent pas, sauf si vous commencez une note à partir d’une visite.",
  },
  privacy: { en: "Kept on this device only.", fr: "Gardé sur cet appareil seulement." },
  deviceWhat: {
    en: "The visits you wrote down: the place, the day, what you found and your own words.",
    fr: "Les visites que vous avez notées\u00A0: le lieu, le jour, ce que vous avez constaté et vos propres mots.",
  },
  add: { en: "Write about a visit", fr: "Écrire sur une visite" },
  addHere: { en: "Write about a visit here", fr: "Écrire sur une visite ici" },
  newTitle: { en: "Write about a visit", fr: "Écrire sur une visite" },
  editTitle: { en: "Change a visit", fr: "Modifier une visite" },
  placeLabel: { en: "Place", fr: "Lieu" },
  placeHint: { en: "Places come from your notes.", fr: "Les lieux viennent de vos notes." },
  placeChoose: { en: "Choose a place", fr: "Choisissez un lieu" },
  dateLabel: { en: "Day of the visit", fr: "Jour de la visite" },
  dateHint: { en: "Year-month-day, for example 2026-11-20.", fr: "Année-mois-jour, par exemple 2026-11-20." },
  foundLegend: { en: "What I found", fr: "Ce que j’ai constaté" },
  foundHint: {
    en: "Leave a detail at “Did not look” if you did not look at it.",
    fr: "Laissez un détail à «\u202FPas regardé\u202F» si vous ne l’avez pas regardé.",
  },
  wordsLabel: { en: "In my own words (optional)", fr: "Dans mes mots (facultatif)" },
  wordsHint: { en: "Up to 1000 characters.", fr: "Jusqu’à 1000 caractères." },
  save: { en: "Save this visit", fr: "Enregistrer cette visite" },
  saved: { en: "The visit was saved.", fr: "La visite a été enregistrée." },
  changed: { en: "The visit was changed.", fr: "La visite a été modifiée." },
  removed: { en: "The visit was removed.", fr: "La visite a été retirée." },
  unavailable: { en: "This browser did not keep the visit.", fr: "Ce navigateur n’a pas gardé la visite." },
  full: {
    en: "This device keeps up to 500 visits. Remove one to write another.",
    fr: "Cet appareil garde jusqu’à 500 visites. Retirez-en une pour en écrire une autre.",
  },
  cancel: { en: "Back to my visits, without saving", fr: "Retour à mes visites, sans enregistrer" },
  errorsTitle: { en: "Fix this to save the visit", fr: "Corrigez ceci pour enregistrer la visite" },
  none: { en: "No visits written down yet.", fr: "Aucune visite notée pour l’instant." },
  noPlaces: {
    en: "Visits are about places in your notes. Add a note about a place first.",
    fr: "Les visites portent sur des lieux de vos notes. Ajoutez d’abord une note sur un lieu.",
  },
  gone: { en: "This place is no longer in your notes.", fr: "Ce lieu n’est plus dans vos notes." },
  compareTitle: { en: "Compared with your notes", fr: "Comparé à vos notes" },
  notLooked: { en: "Nothing looked at on this visit.", fr: "Rien de regardé lors de cette visite." },
  ownWords: { en: "In my own words", fr: "Dans mes mots" },
  startNoteHint: {
    en: "The note form opens with the place, the day and what you found. Your own words stay here. You choose the licence.",
    fr: "Le formulaire de note s’ouvre avec le lieu, le jour et ce que vous avez constaté. Vos propres mots restent ici. Vous choisissez la licence.",
  },
  confirmRemove: { en: "Yes, remove it", fr: "Oui, la retirer" },
  keep: { en: "No, keep it", fr: "Non, la garder" },
  download: { en: "Download my visits as text", fr: "Télécharger mes visites en texte" },
  back: { en: "Back to my notes", fr: "Retour à mes notes" },
  placeVisits: { en: "Your visits here", fr: "Vos visites ici" },
  allTitle: { en: "Every visit", fr: "Toutes les visites" },
  filterLegend: { en: "Which visits to show", fr: "Quelles visites afficher" },
  filterPlace: { en: "Place", fr: "Lieu" },
  filterAll: { en: "Every place", fr: "Tous les lieux" },
  filterFollow: {
    en: "Only visits that found something the notes do not show",
    fr: "Seulement les visites qui ont constaté ce que les notes ne montrent pas",
  },
  noneShown: { en: "No visit matches these choices.", fr: "Aucune visite ne correspond à ces choix." },
  csv: { en: "Download my visits as a spreadsheet (CSV)", fr: "Télécharger mes visites en tableur (CSV)" },
  followTitle: { en: "What your visits found that your notes do not show", fr: "Ce que vos visites ont constaté et que vos notes ne montrent pas" },
  followIntro: {
    en: "From your newest visit to each place in your notes. Start a note to record it, or ask the place about these details.",
    fr: "D’après votre visite la plus récente à chaque lieu de vos notes. Commencez une note pour le consigner, ou posez la question au lieu sur ces détails.",
  },
} as const satisfies Record<string, Pair>;

export const FOUND_COPY: Readonly<Record<FoundChoice, Pair>> = {
  yes: { en: "Yes", fr: "Oui" },
  no: { en: "No", fr: "Non" },
  "": { en: "Did not look", fr: "Pas regardé" },
};

export type VisitVerdict = "same" | "differs" | "unknown" | "differ-already";

export const VERDICT_COPY: Readonly<Record<VisitVerdict, Pair>> = {
  same: { en: "same as your notes", fr: "comme dans vos notes" },
  differs: { en: "not what your notes say", fr: "pas ce que disent vos notes" },
  unknown: { en: "your notes have nothing on this (UNKNOWN)", fr: "vos notes n’en disent rien (UNKNOWN)" },
  "differ-already": { en: "your notes already differ on this", fr: "vos notes divergent déjà sur ce point" },
};

export const VISIT_ERRORS: Readonly<Record<VisitErrorCode, Pair>> = {
  "no-place": { en: "Choose the place you visited.", fr: "Choisissez le lieu visité." },
  "date-format": { en: "Write the day as year-month-day, for example 2026-11-20.", fr: "Écrivez le jour sous la forme année-mois-jour, par exemple 2026-11-20." },
  "date-future": { en: "The day of the visit cannot be after today.", fr: "Le jour de la visite ne peut pas être après aujourd’hui." },
  "date-too-old": { en: "The day of the visit must be in 2000 or later.", fr: "Le jour de la visite doit être en 2000 ou plus tard." },
  "too-long": { en: "Your own words can be up to 1000 characters.", fr: "Vos propres mots peuvent compter jusqu’à 1000 caractères." },
  "control-chars": { en: "Your own words contain a character that cannot be kept.", fr: "Vos propres mots contiennent un caractère qui ne peut pas être gardé." },
  empty: { en: "Say what you found, or write a few words.", fr: "Indiquez ce que vous avez constaté, ou écrivez quelques mots." },
};

// ---- Drafts and checks ----

export function emptyFound(): Record<FactKey, FoundChoice> {
  return Object.fromEntries(FACT_KEYS.map((k) => [k, ""])) as Record<FactKey, FoundChoice>;
}

export function emptyVisitDraft(today: Date, placeId = ""): VisitDraft {
  return { placeId, visitedOn: isoDate(today), found: emptyFound(), words: "" };
}

export function draftFromVisit(v: Visit): VisitDraft {
  const found = emptyFound();
  for (const k of FACT_KEYS) found[k] = v.found[k] ?? "";
  return { placeId: v.placeId, visitedOn: v.visitedOn, found, words: v.words };
}

export function isFoundChoice(v: unknown): v is FoundChoice {
  return v === "yes" || v === "no" || v === "";
}

/**
 * Problems with a draft, in the order of the form. The place must be one of the
 * places in the notes, except when changing a visit to a place that has since
 * left them.
 */
export function validateVisit(d: VisitDraft, places: readonly Pick<Place, "id">[], today: Date, keepPlaceId?: string): VisitError[] {
  const errors: VisitError[] = [];
  if (d.placeId === "" || (!places.some((p) => p.id === d.placeId) && d.placeId !== keepPlaceId)) errors.push({ field: "place", code: "no-place" });
  const day = d.visitedOn.trim();
  if (!isIsoDate(day)) errors.push({ field: "date", code: "date-format" });
  else if (day > isoDate(today)) errors.push({ field: "date", code: "date-future" });
  else if (day < EARLIEST_VISIT) errors.push({ field: "date", code: "date-too-old" });
  const words = d.words.trim();
  if (words.length > MAX_WORDS) errors.push({ field: "words", code: "too-long" });
  else if (hasControlChars(words, true)) errors.push({ field: "words", code: "control-chars" });
  if (words === "" && FACT_KEYS.every((k) => d.found[k] === "")) errors.push({ field: "found", code: "empty" });
  return errors;
}

export const defaultVisitId: IdMaker = () => `v-${Math.random().toString(36).slice(2, 10).padEnd(8, "0")}`;

/** A visit from a draft that passed the checks. */
export function makeVisit(d: VisitDraft, place: Pick<Place, "id" | "name" | "address">, today: Date, id: string): Visit {
  const found: Partial<Record<FactKey, Found>> = {};
  for (const k of FACT_KEYS) {
    const f = d.found[k];
    if (f !== "") found[k] = f;
  }
  return { id, placeId: place.id, placeName: place.name, address: place.address, visitedOn: d.visitedOn.trim(), found, words: d.words.trim(), writtenOn: isoDate(today) };
}

/** Newest visit first; on the same day, the one written last first. */
export function sortVisits(list: readonly Visit[]): Visit[] {
  const by = (a: string, b: string): number => (a < b ? 1 : a > b ? -1 : 0);
  return [...list].sort((a, b) => by(a.visitedOn, b.visitedOn) || by(a.writtenOn, b.writtenOn) || a.id.localeCompare(b.id));
}

export type UpsertResult = { readonly ok: true; readonly visits: Visit[] } | { readonly ok: false; readonly reason: "full" };

/** Adds a visit or replaces the one with its id. A new one is refused when the list is full. */
export function upsertVisit(list: readonly Visit[], v: Visit): UpsertResult {
  const i = list.findIndex((x) => x.id === v.id);
  if (i < 0 && list.length >= MAX_VISITS) return { ok: false, reason: "full" };
  const next = i < 0 ? [...list, v] : list.map((x) => (x.id === v.id ? v : x));
  return { ok: true, visits: sortVisits(next) };
}

export function removeVisit(list: readonly Visit[], id: string): Visit[] {
  return list.filter((v) => v.id !== id);
}

export function visitsFor(list: readonly Visit[], placeId: string): Visit[] {
  return sortVisits(list.filter((v) => v.placeId === placeId));
}

// ---- Compared with the notes ----

export interface Comparison {
  readonly key: FactKey;
  readonly found: Found;
  readonly verdict: VisitVerdict;
}

/**
 * For each detail looked at: whether the notes say the same, something else,
 * already differ, or nothing at all. With no place (it left the notes), every
 * detail is UNKNOWN to the notes.
 */
export function compareVisit(v: Visit, place: Place | undefined): Comparison[] {
  const out: Comparison[] = [];
  for (const key of FACT_KEYS) {
    const found = v.found[key];
    if (found === undefined) continue;
    const r = place?.resolutions[key];
    const verdict: VisitVerdict = !r || r.kind === "unknown" ? "unknown" : r.kind === "differ" ? "differ-already" : r.value === found ? "same" : "differs";
    out.push({ key, found, verdict });
  }
  return out;
}

const colon = (l: Locale): string => (l === "fr" ? `${NB}:` : ":");

/** "Elevator: Yes, same as your notes." */
export function comparisonLine(c: Comparison, l: Locale): string {
  return `${t(COPY.facts[c.key], l)}${colon(l)} ${t(FOUND_COPY[c.found], l)}, ${t(VERDICT_COPY[c.verdict], l)}.`;
}

/** "Elevator: Yes." for each detail looked at. */
export function foundLines(v: Visit, l: Locale): string[] {
  return FACT_KEYS.filter((k) => v.found[k] !== undefined).map((k) => `${t(COPY.facts[k], l)}${colon(l)} ${t(FOUND_COPY[v.found[k] as Found], l)}.`);
}

/** "Remove the visit to Library on 2026-11-19": names what the button removes. */
export function visitRemoveLabel(v: Visit, l: Locale): string {
  return l === "fr" ? `Retirer la visite à ${v.placeName} du ${v.visitedOn}` : `Remove the visit to ${v.placeName} on ${v.visitedOn}`;
}

export function visitNoteLabel(v: Visit, l: Locale): string {
  return l === "fr" ? `Commencer une note à partir de la visite à ${v.placeName} du ${v.visitedOn}` : `Start a note from the visit to ${v.placeName} on ${v.visitedOn}`;
}

export function visitAskLabel(v: Visit, l: Locale): string {
  return l === "fr" ? `Poser la question à ${v.placeName} sur ces détails` : `Ask ${v.placeName} about these details`;
}

export function visitEditLabel(v: Visit, l: Locale): string {
  return l === "fr" ? `Modifier la visite à ${v.placeName} du ${v.visitedOn}` : `Change the visit to ${v.placeName} on ${v.visitedOn}`;
}

export function visitHeading(v: Visit): string {
  return `${v.placeName}, ${v.visitedOn}`;
}

/** "3 visits" / "1 visite". */
export function visitCountText(n: number, l: Locale): string {
  return l === "fr" ? `${n} visite${n > 1 ? "s" : ""}` : `${n} visit${n === 1 ? "" : "s"}`;
}

/**
 * The note form's values from a visit: the place, the day as the day observed,
 * and what was found. The licence stays empty for the person to choose, and
 * their own words are not copied.
 */
export function formFromVisit(v: Visit, today: Date): FormValues {
  const base = emptyForm(today);
  const details = { ...base.details } as Record<FactKey, Tri>;
  for (const k of FACT_KEYS) details[k] = v.found[k] ?? "unknown";
  return { ...base, placeName: v.placeName, address: v.address ?? "", details, observedOn: v.visitedOn };
}

/** True when a visit looked at something, so a note can start from it. */
export function canStartNote(v: Visit): boolean {
  return FACT_KEYS.some((k) => v.found[k] !== undefined);
}

export interface FollowUp {
  readonly visit: Visit;
  /** The details where the visit found something the notes do not show: never "same". */
  readonly items: readonly Comparison[];
}

/**
 * For each place still in the notes, the newest visit, and the details where
 * it found something other than what the notes say, something the notes say
 * nothing about (UNKNOWN), or something the notes already differ on. Places
 * whose newest visit matches the notes are left out. Newest visit first.
 */
export function followUps(list: readonly Visit[], places: readonly Place[]): FollowUp[] {
  const out: FollowUp[] = [];
  const seen = new Set<string>();
  for (const v of sortVisits(list)) {
    if (seen.has(v.placeId)) continue;
    seen.add(v.placeId);
    const place = places.find((p) => p.id === v.placeId);
    if (!place) continue;
    const items = compareVisit(v, place).filter((c) => c.verdict !== "same");
    if (items.length > 0) out.push({ visit: v, items });
  }
  return out;
}

export interface VisitFilter {
  /** "" for every place. */
  readonly placeId: string;
  readonly onlyFollow: boolean;
}

export const NO_FILTER: VisitFilter = { placeId: "", onlyFollow: false };

/** True when a visit found something the notes do not show (compared with the notes as they are now). */
export function hasFollowUp(v: Visit, places: readonly Place[]): boolean {
  return compareVisit(v, places.find((p) => p.id === v.placeId)).some((c) => c.verdict !== "same");
}

/** The visits to show, in the list's order. */
export function filterVisits(list: readonly Visit[], places: readonly Place[], f: VisitFilter): Visit[] {
  return sortVisits(list).filter((v) => (f.placeId === "" || v.placeId === f.placeId) && (!f.onlyFollow || hasFollowUp(v, places)));
}

/** The places that have visits, by name, for the filter: each once, with the name of its newest visit. */
export function visitedPlaces(list: readonly Visit[]): Array<{ readonly id: string; readonly name: string }> {
  const out: Array<{ id: string; name: string }> = [];
  for (const v of sortVisits(list)) if (!out.some((p) => p.id === v.placeId)) out.push({ id: v.placeId, name: v.placeName });
  return out.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

/** "Showing 2 of 5 visits." */
export function visitsShownText(shown: number, total: number, l: Locale): string {
  return l === "fr" ? `${shown} visite${shown > 1 ? "s" : ""} affichée${shown > 1 ? "s" : ""} sur ${total}.` : `Showing ${shown} of ${total} visit${total === 1 ? "" : "s"}.`;
}

// ---- As text ----

export function visitsText(list: readonly Visit[], l: Locale): string {
  const title = t(VISIT_COPY.title, l);
  const blocks = sortVisits(list).map((v) => {
    const lines = [visitHeading(v)];
    if (v.address) lines.push(v.address);
    lines.push(...foundLines(v, l));
    if (v.words) lines.push(`${t(VISIT_COPY.ownWords, l)}${colon(l)} ${v.words}`);
    return lines.join("\n");
  });
  return `${[title, "=".repeat(title.length), "", ...(blocks.length === 0 ? [t(VISIT_COPY.none, l)] : blocks.flatMap((b) => [b, ""]))].join("\n").trimEnd()}\n`;
}

export function visitsFilename(l: Locale): string {
  return l === "fr" ? "mes-visites.txt" : "my-visits.txt";
}

// ---- Kept on this device ----

const ID_RE = /^v-[a-z0-9]{1,24}$/;

/** One visit from stored or imported data; undefined when anything is off. */
export function parseVisit(raw: unknown, today: Date): Visit | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const str = (k: string, max: number): string | undefined => {
    const v = o[k];
    return typeof v === "string" && v.length <= max && !hasControlChars(v, k === "words") ? v : undefined;
  };
  const id = str("id", 30);
  const placeId = str("placeId", 120);
  const placeName = str("placeName", 200);
  const visitedOn = str("visitedOn", 10);
  const writtenOn = str("writtenOn", 10);
  const words = o["words"] === undefined ? "" : str("words", MAX_WORDS);
  const address = o["address"] === undefined || o["address"] === null ? undefined : str("address", 300);
  if (!id || !ID_RE.test(id) || !placeId || !placeName?.trim() || words === undefined) return undefined;
  if (o["address"] !== undefined && o["address"] !== null && address === undefined) return undefined;
  const day = isoDate(today);
  if (!visitedOn || !isIsoDate(visitedOn) || visitedOn > day || visitedOn < EARLIEST_VISIT) return undefined;
  const found: Partial<Record<FactKey, Found>> = {};
  const f = o["found"] && typeof o["found"] === "object" && !Array.isArray(o["found"]) ? (o["found"] as Record<string, unknown>) : {};
  for (const k of FACT_KEYS) if (f[k] === "yes" || f[k] === "no") found[k] = f[k];
  if (words.trim() === "" && Object.keys(found).length === 0) return undefined;
  return {
    id,
    placeId,
    placeName: placeName.trim(),
    address: address?.trim() || undefined,
    visitedOn,
    found,
    words: words.trim(),
    writtenOn: writtenOn && isIsoDate(writtenOn) && writtenOn <= day ? writtenOn : visitedOn,
  };
}

/** Saved visits, read defensively: broken entries and repeated ids are dropped, and the list is capped. */
export function parseVisits(raw: string | null, today: Date): Visit[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: Visit[] = [];
  for (const item of data) {
    const v = parseVisit(item, today);
    if (v && !out.some((x) => x.id === v.id) && out.length < MAX_VISITS) out.push(v);
  }
  return sortVisits(out);
}

export function loadVisits(store: KeyValueStore | undefined, today: Date): Visit[] {
  try {
    return parseVisits(store?.getItem(VISITS_KEY) ?? null, today);
  } catch {
    return [];
  }
}

export function saveVisits(store: KeyValueStore | undefined, list: readonly Visit[]): "saved" | "unavailable" {
  if (!store) return "unavailable";
  try {
    if (list.length === 0) store.removeItem(VISITS_KEY);
    else store.setItem(VISITS_KEY, JSON.stringify(list));
    return "saved";
  } catch {
    return "unavailable";
  }
}

export function visitStrings(): Array<[string, Pair]> {
  return [
    ...Object.entries(VISIT_COPY).map(([k, p]): [string, Pair] => [`visits.${k}`, p]),
    ...Object.entries(FOUND_COPY).map(([k, p]): [string, Pair] => [`visits.found.${k || "none"}`, p]),
    ...Object.entries(VERDICT_COPY).map(([k, p]): [string, Pair] => [`visits.verdict.${k}`, p]),
    ...Object.entries(VISIT_ERRORS).map(([k, p]): [string, Pair] => [`visits.error.${k}`, p]),
  ];
}
