import type { Locale } from "../../switch-first/src/index";
import { COPY, NB, NN, t, type Pair } from "./copy";
import { FACT_KEYS, isIsoDate, type FactKey } from "./facts";
import { isoDate } from "./form";
import { LIMITS, hasControlChars } from "./model";
import type { Place } from "./places";
import type { KeyValueStore } from "./store";

/**
 * "Questions you sent": a list, kept on this device only, of places the person
 * asked about access, how they asked, when, and whether the place answered.
 * It holds no email address, phone number or message text: only the place, the
 * details asked about, the way and the dates. An answer the person reads from
 * a reply becomes a note through the page reader; this list only keeps track.
 */
export const ASKED_KEY = "app.onboarding.asked.v1";
export const MAX_ASKED = 100;

export type AskWay = "email" | "phone" | "in-person" | "other";
export const ASK_WAYS: readonly AskWay[] = ["email", "phone", "in-person", "other"];

export type AskState = "waiting" | "replied" | "no-reply";

export interface AskRecord {
  /** The place's id, as the places list makes it. One record per place. */
  readonly id: string;
  readonly placeName: string;
  readonly address: string;
  readonly keys: readonly FactKey[];
  readonly way: AskWay;
  readonly askedOn: string;
  readonly state: AskState;
  /** When it was marked replied or no reply. */
  readonly closedOn: string | undefined;
}

export const ASKED_COPY = {
  title: { en: "Questions you sent", fr: "Questions envoyées" },
  open: { en: "Questions you sent", fr: "Questions envoyées" },
  intro: {
    en: "Places you asked about access, and whether they answered. Kept on this device only. No address or message text is kept.",
    fr: "Les lieux à qui vous avez posé des questions sur l’accès, et s’ils ont répondu. Gardé sur cet appareil seulement. Aucune adresse ni aucun texte de message n’est gardé.",
  },
  waitingTitle: { en: "Waiting for an answer", fr: "En attente de réponse" },
  closedTitle: { en: "Done", fr: "Terminé" },
  none: { en: "You have not noted any questions yet. After you ask a place, add it from its “Ask this place in writing” page.", fr: `Vous n’avez encore noté aucune question. Après avoir écrit à un lieu, ajoutez-le depuis sa page «${NN}Écrire à ce lieu${NN}».` },
  noneWaiting: { en: "No place is waiting for an answer.", fr: "Aucun lieu n’est en attente de réponse." },
  about: { en: "About", fr: "Sujet" },
  replied: { en: "They replied", fr: "Le lieu a répondu" },
  noReply: { en: "No reply", fr: "Pas de réponse" },
  readReply: { en: "Read their reply", fr: "Lire sa réponse" },
  askAgain: { en: "Ask again", fr: "Redemander" },
  waitAgain: { en: "Wait again", fr: "Attendre de nouveau" },
  sentTitle: { en: "Did you send it?", fr: `L’avez-vous envoyé${NN}?` },
  sentHint: {
    en: "Add this place to your list of questions sent, so you remember to look for the answer.",
    fr: "Ajoutez ce lieu à votre liste de questions envoyées, pour penser à chercher la réponse.",
  },
  wayLegend: { en: "How did you ask?", fr: `Comment avez-vous demandé${NN}?` },
  add: { en: "Add to my questions sent", fr: "Ajouter à mes questions envoyées" },
  added: { en: "Added to your questions sent", fr: "Ajouté à vos questions envoyées" },
  chooseWay: { en: "Choose how you asked.", fr: "Choisissez comment vous avez demandé." },
  markedReplied: { en: "Marked as replied", fr: "Marqué comme répondu" },
  markedNoReply: { en: "Marked as no reply", fr: "Marqué sans réponse" },
  markedWaiting: { en: "Waiting for an answer again", fr: "De nouveau en attente de réponse" },
  removed: { en: "Removed from your questions sent", fr: "Retiré de vos questions envoyées" },
  full: { en: "Your list holds 100 places. Remove some first.", fr: "Votre liste contient 100 lieux. Retirez-en d’abord." },
  waitingCount: { en: "waiting for an answer", fr: "en attente de réponse" },
  back: { en: "Back to my notes", fr: "Retour à mes notes" },
  download: { en: "Download this list as text", fr: "Télécharger cette liste en texte" },
  deviceTitle: { en: "Questions sent", fr: "Questions envoyées" },
  deviceWhat: {
    en: "The places you asked about access, how and when, and whether they answered.",
    fr: "Les lieux à qui vous avez posé des questions sur l’accès, comment et quand, et s’ils ont répondu.",
  },
} as const satisfies Record<string, Pair>;

export const WAY_COPY: Record<AskWay, Pair> = {
  email: { en: "By email", fr: "Par courriel" },
  phone: { en: "By phone", fr: "Par téléphone" },
  "in-person": { en: "In person", fr: "En personne" },
  other: { en: "Another way", fr: "Autrement" },
};

export function isAskWay(v: unknown): v is AskWay {
  return typeof v === "string" && (ASK_WAYS as readonly string[]).includes(v);
}

/**
 * Notes that a place was asked. A place still waiting is updated (new date,
 * way and details) rather than listed twice; a closed one starts waiting again.
 */
export function recordAsk(list: readonly AskRecord[], place: Pick<Place, "id" | "name" | "address">, keys: readonly FactKey[], way: AskWay, today: Date): AskRecord[] | "full" {
  const rest = list.filter((r) => r.id !== place.id);
  if (rest.length >= MAX_ASKED) return "full";
  const record: AskRecord = {
    id: place.id,
    placeName: place.name.slice(0, LIMITS.placeName),
    address: (place.address ?? "").slice(0, LIMITS.address),
    keys: FACT_KEYS.filter((k) => keys.includes(k)),
    way,
    askedOn: isoDate(today),
    state: "waiting",
    closedOn: undefined,
  };
  return [record, ...rest];
}

function setState(list: readonly AskRecord[], id: string, state: AskState, today: Date): AskRecord[] {
  return list.map((r) => (r.id === id ? { ...r, state, closedOn: state === "waiting" ? undefined : isoDate(today) } : r));
}

export const markReplied = (list: readonly AskRecord[], id: string, today: Date): AskRecord[] => setState(list, id, "replied", today);
export const markNoReply = (list: readonly AskRecord[], id: string, today: Date): AskRecord[] => setState(list, id, "no-reply", today);
export const markWaiting = (list: readonly AskRecord[], id: string, today: Date): AskRecord[] => setState(list, id, "waiting", today);

export function removeAsk(list: readonly AskRecord[], id: string): AskRecord[] {
  return list.filter((r) => r.id !== id);
}

export function findAsk(list: readonly AskRecord[], id: string): AskRecord | undefined {
  return list.find((r) => r.id === id);
}

/** Whole days from one date to another, never below zero. */
export function daysSince(iso: string, today: Date): number {
  if (!isIsoDate(iso)) return 0;
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const then = Date.UTC(y, m - 1, d);
  const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.max(0, Math.round((now - then) / 86_400_000));
}

/** Waiting places, longest wait first; then the rest, most recently closed first. */
export function splitAsked(list: readonly AskRecord[]): { waiting: AskRecord[]; closed: AskRecord[] } {
  const by = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
  const waiting = list.filter((r) => r.state === "waiting").sort((a, b) => by(a.askedOn, b.askedOn) || by(a.placeName, b.placeName));
  const closed = list.filter((r) => r.state !== "waiting").sort((a, b) => by(b.closedOn ?? "", a.closedOn ?? "") || by(a.placeName, b.placeName));
  return { waiting, closed };
}

export function waitingCount(list: readonly AskRecord[]): number {
  return list.filter((r) => r.state === "waiting").length;
}

/** "Asked by email on 2026-11-10, 9 days ago." */
export function askedLine(r: AskRecord, l: Locale, today: Date): string {
  const days = daysSince(r.askedOn, today);
  const way = t(WAY_COPY[r.way], l).toLowerCase();
  if (l === "fr") {
    const ago = days === 0 ? "aujourd’hui" : days === 1 ? "il y a 1 jour" : `il y a ${days} jours`;
    return `Demandé ${way} le ${r.askedOn}, ${ago}.`;
  }
  const ago = days === 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;
  return `Asked ${way} on ${r.askedOn}, ${ago}.`;
}

/** "They replied on 2026-11-18." / "No reply, noted on 2026-11-18." */
export function closedLine(r: AskRecord, l: Locale): string {
  if (r.state === "replied") return l === "fr" ? `Le lieu a répondu, noté le ${r.closedOn ?? ""}.` : `They replied, noted on ${r.closedOn ?? ""}.`;
  if (r.state === "no-reply") return l === "fr" ? `Pas de réponse, noté le ${r.closedOn ?? ""}.` : `No reply, noted on ${r.closedOn ?? ""}.`;
  return "";
}

/** "About: Elevator, Automatic door". */
export function aboutLine(r: AskRecord, l: Locale): string {
  return `${t(ASKED_COPY.about, l)}${l === "fr" ? NB : ""}: ${r.keys.map((k) => t(COPY.facts[k], l)).join(", ")}`;
}

/** The list as a text file the person can keep: waiting places first, then the rest, as on screen. */
export function askedToText(list: readonly AskRecord[], l: Locale, today: Date): string {
  const title = t(ASKED_COPY.title, l);
  const lines = [title, "=".repeat(Math.min(title.length, 72)), ""];
  const { waiting, closed } = splitAsked(list);
  const block = (heading: string, rs: readonly AskRecord[]): void => {
    lines.push(`${heading} (${rs.length})`, "-".repeat(Math.min(heading.length, 72)));
    if (rs.length === 0) lines.push(t(ASKED_COPY.noneWaiting, l));
    for (const r of rs) {
      lines.push(`* ${r.placeName}${r.address === "" ? "" : ` (${r.address})`}`, `  ${askedLine(r, l, today)}`, `  ${aboutLine(r, l)}`);
      if (r.state !== "waiting") lines.push(`  ${closedLine(r, l)}`);
    }
    lines.push("");
  };
  block(t(ASKED_COPY.waitingTitle, l), waiting);
  if (closed.length > 0) block(t(ASKED_COPY.closedTitle, l), closed);
  lines.push(`${t(COPY.textExport.madeOn, l)} ${isoDate(today)}.`);
  return `${lines.join("\n")}\n`;
}

/** "questions-sent-<date>-en.txt", "questions-envoyees-<date>-fr.txt". */
export function askedFilename(today: Date, l: Locale): string {
  return `${l === "fr" ? "questions-envoyees" : "questions-sent"}-${isoDate(today)}-${l}.txt`;
}

// ---- Kept on this device, read back defensively ----

const ID = /^[a-z0-9-]{1,80}$/;

function parseRecord(raw: unknown): AskRecord | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const id = o["id"];
  const name = o["placeName"];
  const address = typeof o["address"] === "string" ? o["address"] : "";
  if (typeof id !== "string" || !ID.test(id)) return undefined;
  if (typeof name !== "string" || name.trim() === "" || name.length > LIMITS.placeName || hasControlChars(name)) return undefined;
  if (address.length > LIMITS.address || hasControlChars(address)) return undefined;
  const keys = Array.isArray(o["keys"]) ? FACT_KEYS.filter((k) => (o["keys"] as unknown[]).includes(k)) : [];
  if (keys.length === 0 || !isAskWay(o["way"])) return undefined;
  const askedOn = o["askedOn"];
  if (typeof askedOn !== "string" || !isIsoDate(askedOn)) return undefined;
  const state = o["state"] === "replied" || o["state"] === "no-reply" ? o["state"] : "waiting";
  const closed = o["closedOn"];
  const closedOn = state !== "waiting" && typeof closed === "string" && isIsoDate(closed) ? closed : undefined;
  // A closed record with no date it was closed cannot be shown honestly: it goes back to waiting.
  return { id, placeName: name, address, keys, way: o["way"], askedOn, state: closedOn ? state : "waiting", closedOn };
}

export function parseAsked(raw: string | null): AskRecord[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: AskRecord[] = [];
  for (const r of data) {
    const rec = parseRecord(r);
    if (rec && out.length < MAX_ASKED && !out.some((x) => x.id === rec.id)) out.push(rec);
  }
  return out;
}

export function loadAsked(store: KeyValueStore | undefined): AskRecord[] {
  try {
    return parseAsked(store?.getItem(ASKED_KEY) ?? null);
  } catch {
    return [];
  }
}

export type AskedSave = "saved" | "unavailable";

export function saveAsked(store: KeyValueStore | undefined, list: readonly AskRecord[]): AskedSave {
  if (!store) return "unavailable";
  try {
    if (list.length === 0) store.removeItem(ASKED_KEY);
    else store.setItem(ASKED_KEY, JSON.stringify(list));
    return "saved";
  } catch {
    return "unavailable";
  }
}

export function askedStrings(): Array<[string, Pair]> {
  return [
    ...Object.entries(ASKED_COPY).map(([k, p]): [string, Pair] => [`asked.${k}`, p]),
    ...Object.entries(WAY_COPY).map(([k, p]): [string, Pair] => [`asked.way.${k}`, p]),
  ];
}
